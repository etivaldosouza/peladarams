ALTER TABLE public.jogadores REPLICA IDENTITY FULL;
ALTER TABLE public.pelada_config REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pelada_config'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.pelada_config';
  END IF;
END $$;