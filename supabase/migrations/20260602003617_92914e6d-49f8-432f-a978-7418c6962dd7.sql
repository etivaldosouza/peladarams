
-- 1) Lock down jogadores writes: remove blanket UPDATE/DELETE; keep INSERT public (signup) and SELECT public (list)
DROP POLICY IF EXISTS "Anyone can delete jogadores" ON public.jogadores;
DROP POLICY IF EXISTS "Anyone can update jogadores" ON public.jogadores;

-- 2) Hide telefone column from public Data API access via column-level grants
REVOKE SELECT ON public.jogadores FROM anon, authenticated;
GRANT SELECT (id, nome, status, criado_em, dispositivo_id) ON public.jogadores TO anon, authenticated;
-- Allow INSERT including telefone so signup keeps working
GRANT INSERT (nome, status, dispositivo_id, telefone) ON public.jogadores TO anon, authenticated;
GRANT ALL ON public.jogadores TO service_role;

-- 3) Security-definer RPC so a device can cancel only its own registration
CREATE OR REPLACE FUNCTION public.delete_my_registration(p_device_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_device_id IS NULL OR length(p_device_id) < 8 THEN
    RAISE EXCEPTION 'invalid device id';
  END IF;
  DELETE FROM public.jogadores WHERE dispositivo_id = p_device_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_registration(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_registration(text) TO anon, authenticated;

-- 4) Lock down pelada_config writes (admin only via edge function using service role)
DROP POLICY IF EXISTS "Anyone can insert config" ON public.pelada_config;
DROP POLICY IF EXISTS "Anyone can update config" ON public.pelada_config;
-- SELECT stays public (read-only config)

-- 5) Limit realtime to non-sensitive columns of jogadores; keep pelada_config as is (no PII)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'jogadores'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.jogadores';
  END IF;
END$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.jogadores (id, nome, status, criado_em, dispositivo_id);
