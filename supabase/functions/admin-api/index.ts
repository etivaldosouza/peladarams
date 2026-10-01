import { createClient } from "npm:@supabase/supabase-js@2";

// Used only to link the legacy "Pelada da Semana" to the signed-in organizer
// account, validated with the old ADMIN_PASSWORD.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-password",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") ?? "";
const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function checkPassword(req: Request): boolean {
  if (!ADMIN_PASSWORD) return false;
  const pw = req.headers.get("x-admin-password") ?? "";
  if (pw.length !== ADMIN_PASSWORD.length) return false;
  let diff = 0;
  for (let i = 0; i < pw.length; i++) diff |= pw.charCodeAt(i) ^ ADMIN_PASSWORD.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  if (!checkPassword(req)) return json(401, { error: "Unauthorized" });

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return json(401, { error: "Login required" });

  let body: { action?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }
  if (body.action !== "claim") return json(400, { error: "Unknown action" });

  const { error } = await admin.rpc("claim_legacy_pelada", { _user: userData.user.id });
  if (error) return json(500, { error: error.message });
  return json(200, { ok: true });
});
