import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function usePlatformAdmin(userId?: string) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setIsAdmin(false);
    setLoading(true);
    if (!userId) { setLoading(false); return; }
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }).then(({ data, error }) => {
      if (!active) return;
      setIsAdmin(!error && data === true);
      setLoading(false);
    });
    return () => { active = false; };
  }, [userId]);
  return { isAdmin, loading };
}