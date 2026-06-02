ALTER VIEW public.jogadores_public SET (security_invoker = off);
GRANT SELECT ON public.jogadores_public TO anon, authenticated;