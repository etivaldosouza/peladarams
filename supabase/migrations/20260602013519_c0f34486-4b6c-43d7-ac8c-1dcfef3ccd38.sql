ALTER TABLE public.jogadores REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.jogadores;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DELETE FROM public.jogadores
WHERE id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (PARTITION BY dispositivo_id ORDER BY criado_em ASC) AS rn
    FROM public.jogadores WHERE dispositivo_id IS NOT NULL
  ) t WHERE rn > 1
);

DELETE FROM public.jogadores
WHERE id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (
      PARTITION BY regexp_replace(telefone, '\D', '', 'g') ORDER BY criado_em ASC
    ) AS rn
    FROM public.jogadores
    WHERE telefone IS NOT NULL AND length(regexp_replace(telefone, '\D', '', 'g')) > 0
  ) t WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS jogadores_dispositivo_id_unique
  ON public.jogadores (dispositivo_id) WHERE dispositivo_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS jogadores_telefone_digits_unique
  ON public.jogadores ((regexp_replace(telefone, '\D', '', 'g')))
  WHERE telefone IS NOT NULL AND length(regexp_replace(telefone, '\D', '', 'g')) > 0;

ALTER PUBLICATION supabase_realtime ADD TABLE public.jogadores;
