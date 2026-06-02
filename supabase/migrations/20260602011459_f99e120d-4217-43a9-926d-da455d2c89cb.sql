-- Create a public view that only exposes safe fields (no phone numbers)
CREATE OR REPLACE VIEW public.jogadores_public
WITH (security_invoker=on) AS
  SELECT id, nome, status, criado_em, dispositivo_id
  FROM public.jogadores;

-- Grant public read access to the view
GRANT SELECT ON public.jogadores_public TO anon;
GRANT SELECT ON public.jogadores_public TO authenticated;

-- Remove the overly permissive SELECT policy on the base table
DROP POLICY IF EXISTS "Anyone can view jogadores" ON public.jogadores;

-- Deny direct SELECT on the base table so the view becomes the only public path
CREATE POLICY "Deny direct SELECT on jogadores"
  ON public.jogadores
  FOR SELECT
  TO public
  USING (false);