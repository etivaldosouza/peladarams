REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_pelada() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_pelada_owner(uuid,uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_pelada_member(uuid,uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.match_pelada(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_my_jogador(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_pelada_owner(uuid,uuid), public.is_pelada_member(uuid,uuid), public.match_pelada(uuid), public.is_my_jogador(uuid) TO authenticated;