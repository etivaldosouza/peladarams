import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const LEGACY_SLUG = "pelada-da-semana";

export interface Pelada {
  id: string;
  nome: string;
  slug: string;
  owner_id: string | null;
}

export function usePelada() {
  const { slug } = useParams();
  const s = slug || LEGACY_SLUG;
  const [pelada, setPelada] = useState<Pelada | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    setLoading(true);
    supabase
      .from("peladas")
      .select("id, nome, slug, owner_id")
      .eq("slug", s)
      .maybeSingle()
      .then(({ data }) => {
        setPelada((data as Pelada) ?? null);
        setLoading(false);
      });
  }, [s, reload]);
  return { pelada, loading, slug: s, refresh: () => setReload((r) => r + 1) };
}
