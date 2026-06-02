import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

const CONFIG_KEYS = new Set([
  "data_pelada",
  "horario_pelada",
  "valor_campo",
  "valor_jogador",
  "cadastro_aberto",
]);

type Action =
  | { action: "login" }
  | { action: "list_jogadores" }
  | { action: "set_status"; id: string; status: "pago" | "pendente" }
  | { action: "remove_player"; id: string }
  | { action: "clear_all" }
  | { action: "set_config"; chave: string; valor: string };

function bad(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function checkPassword(req: Request): boolean {
  if (!ADMIN_PASSWORD) return false;
  const pw = req.headers.get("x-admin-password") ?? "";
  if (pw.length !== ADMIN_PASSWORD.length) return false;
  // constant-time comparison
  let diff = 0;
  for (let i = 0; i < pw.length; i++) diff |= pw.charCodeAt(i) ^ ADMIN_PASSWORD.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return bad(405, "Method not allowed");

  if (!checkPassword(req)) return bad(401, "Unauthorized");

  let body: Action;
  try {
    body = (await req.json()) as Action;
  } catch {
    return bad(400, "Invalid JSON");
  }

  try {
    switch (body.action) {
      case "login":
        return ok({ ok: true });

      case "list_jogadores": {
        const { data, error } = await admin
          .from("jogadores")
          .select("id, nome, status, criado_em, telefone, dispositivo_id")
          .order("criado_em", { ascending: true });
        if (error) throw error;
        return ok({ jogadores: data });
      }

      case "set_status": {
        if (!body.id || (body.status !== "pago" && body.status !== "pendente"))
          return bad(400, "Invalid params");
        const { error } = await admin
          .from("jogadores")
          .update({ status: body.status })
          .eq("id", body.id);
        if (error) throw error;
        return ok({ ok: true });
      }

      case "remove_player": {
        if (!body.id) return bad(400, "Invalid params");
        const { error } = await admin.from("jogadores").delete().eq("id", body.id);
        if (error) throw error;
        return ok({ ok: true });
      }

      case "clear_all": {
        const { error } = await admin
          .from("jogadores")
          .delete()
          .not("id", "is", null);
        if (error) throw error;
        return ok({ ok: true });
      }

      case "set_config": {
        if (!CONFIG_KEYS.has(body.chave)) return bad(400, "Invalid config key");
        if (typeof body.valor !== "string" || body.valor.length > 200)
          return bad(400, "Invalid value");
        const { error } = await admin
          .from("pelada_config")
          .upsert({ chave: body.chave, valor: body.valor }, { onConflict: "chave" });
        if (error) throw error;
        return ok({ ok: true });
      }

      default:
        return bad(400, "Unknown action");
    }
  } catch (e) {
    console.error("admin-api error", e);
    return bad(500, (e as Error).message ?? "Server error");
  }
});
