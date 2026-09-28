
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text, telefone text, avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.profiles(id, nome, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- peladas
CREATE TABLE public.peladas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{3,60}$'),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.peladas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.peladas TO authenticated;
GRANT ALL ON public.peladas TO service_role;
ALTER TABLE public.peladas ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER peladas_updated BEFORE UPDATE ON public.peladas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- members
CREATE TABLE public.pelada_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pelada_id uuid NOT NULL REFERENCES public.peladas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  papel text NOT NULL DEFAULT 'player' CHECK (papel IN ('owner','admin','player')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pelada_id, user_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pelada_members TO authenticated;
GRANT ALL ON public.pelada_members TO service_role;
ALTER TABLE public.pelada_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_pelada_owner(_pelada uuid, _user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM peladas WHERE id=_pelada AND owner_id=_user)
      OR EXISTS (SELECT 1 FROM pelada_members WHERE pelada_id=_pelada AND user_id=_user AND papel IN ('owner','admin')) $$;
CREATE OR REPLACE FUNCTION public.is_pelada_member(_pelada uuid, _user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.is_pelada_owner(_pelada,_user) OR EXISTS (SELECT 1 FROM pelada_members WHERE pelada_id=_pelada AND user_id=_user) $$;

CREATE POLICY "peladas public read" ON public.peladas FOR SELECT USING (true);
CREATE POLICY "peladas create own" ON public.peladas FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "peladas owner update" ON public.peladas FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "peladas owner delete" ON public.peladas FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "members read" ON public.pelada_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_pelada_member(pelada_id, auth.uid()));
CREATE POLICY "members join self" ON public.pelada_members FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid() AND papel='player') OR public.is_pelada_owner(pelada_id, auth.uid()));
CREATE POLICY "members owner update" ON public.pelada_members FOR UPDATE TO authenticated USING (public.is_pelada_owner(pelada_id, auth.uid())) WITH CHECK (public.is_pelada_owner(pelada_id, auth.uid()));
CREATE POLICY "members leave or owner" ON public.pelada_members FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_pelada_owner(pelada_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_pelada() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO pelada_members(pelada_id,user_id,papel) VALUES (NEW.id,NEW.owner_id,'owner')
    ON CONFLICT (pelada_id,user_id) DO UPDATE SET papel='owner';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_pelada_owner AFTER INSERT OR UPDATE OF owner_id ON public.peladas FOR EACH ROW EXECUTE FUNCTION public.handle_new_pelada();

-- legacy pelada
INSERT INTO public.peladas(id,nome,slug) VALUES ('00000000-0000-0000-0000-000000000001','Pelada da Semana','pelada-da-semana');

-- jogadores
ALTER TABLE public.jogadores ADD COLUMN pelada_id uuid REFERENCES public.peladas(id) ON DELETE CASCADE,
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
UPDATE public.jogadores SET pelada_id='00000000-0000-0000-0000-000000000001' WHERE pelada_id IS NULL;
ALTER TABLE public.jogadores ALTER COLUMN pelada_id SET DEFAULT '00000000-0000-0000-0000-000000000001', ALTER COLUMN pelada_id SET NOT NULL;
DROP INDEX public.jogadores_dispositivo_id_unique;
DROP INDEX public.jogadores_telefone_digits_unique;
CREATE UNIQUE INDEX jogadores_pelada_dispositivo_unique ON public.jogadores(pelada_id, dispositivo_id) WHERE dispositivo_id IS NOT NULL;
CREATE UNIQUE INDEX jogadores_pelada_telefone_unique ON public.jogadores(pelada_id, regexp_replace(telefone,'\D','','g')) WHERE telefone IS NOT NULL AND length(regexp_replace(telefone,'\D','','g'))>0;
CREATE UNIQUE INDEX jogadores_pelada_user_unique ON public.jogadores(pelada_id, user_id) WHERE user_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jogadores TO authenticated;

DROP POLICY IF EXISTS "Anyone can insert jogadores" ON public.jogadores;
DROP POLICY IF EXISTS "Deny direct SELECT on jogadores" ON public.jogadores;
CREATE POLICY "jogadores read own or owner" ON public.jogadores FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_pelada_owner(pelada_id, auth.uid()));
CREATE POLICY "jogadores self signup" ON public.jogadores FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status='pendente');
CREATE POLICY "jogadores owner insert" ON public.jogadores FOR INSERT TO authenticated WITH CHECK (public.is_pelada_owner(pelada_id, auth.uid()));
CREATE POLICY "jogadores owner update" ON public.jogadores FOR UPDATE TO authenticated USING (public.is_pelada_owner(pelada_id, auth.uid())) WITH CHECK (public.is_pelada_owner(pelada_id, auth.uid()));
CREATE POLICY "jogadores delete own or owner" ON public.jogadores FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_pelada_owner(pelada_id, auth.uid()));

CREATE OR REPLACE VIEW public.jogadores_public AS SELECT id, nome, status, criado_em, dispositivo_id, pelada_id, user_id FROM public.jogadores;
GRANT SELECT ON public.jogadores_public TO anon, authenticated;

-- pelada_config
ALTER TABLE public.pelada_config ADD COLUMN pelada_id uuid REFERENCES public.peladas(id) ON DELETE CASCADE;
UPDATE public.pelada_config SET pelada_id='00000000-0000-0000-0000-000000000001' WHERE pelada_id IS NULL;
ALTER TABLE public.pelada_config ALTER COLUMN pelada_id SET DEFAULT '00000000-0000-0000-0000-000000000001', ALTER COLUMN pelada_id SET NOT NULL;
ALTER TABLE public.pelada_config DROP CONSTRAINT pelada_config_chave_key;
ALTER TABLE public.pelada_config ADD CONSTRAINT pelada_config_pelada_chave_key UNIQUE (pelada_id, chave);
GRANT INSERT, UPDATE, DELETE ON public.pelada_config TO authenticated;
CREATE POLICY "config owner insert" ON public.pelada_config FOR INSERT TO authenticated WITH CHECK (public.is_pelada_owner(pelada_id, auth.uid()));
CREATE POLICY "config owner update" ON public.pelada_config FOR UPDATE TO authenticated USING (public.is_pelada_owner(pelada_id, auth.uid())) WITH CHECK (public.is_pelada_owner(pelada_id, auth.uid()));
CREATE POLICY "config owner delete" ON public.pelada_config FOR DELETE TO authenticated USING (public.is_pelada_owner(pelada_id, auth.uid()));

-- matches
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pelada_id uuid NOT NULL REFERENCES public.peladas(id) ON DELETE CASCADE,
  data date, local text, status text NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada','em_andamento','encerrada','cancelada')),
  sorteio jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TRIGGER matches_updated BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches member read" ON public.matches FOR SELECT TO authenticated USING (public.is_pelada_member(pelada_id, auth.uid()));
CREATE POLICY "matches owner write" ON public.matches FOR ALL TO authenticated USING (public.is_pelada_owner(pelada_id, auth.uid())) WITH CHECK (public.is_pelada_owner(pelada_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.match_pelada(_match uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT pelada_id FROM matches WHERE id=_match $$;

CREATE TABLE public.match_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  jogador_id uuid NOT NULL REFERENCES public.jogadores(id) ON DELETE CASCADE,
  time text, gols int NOT NULL DEFAULT 0, assistencias int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(match_id, jogador_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_players TO authenticated;
GRANT ALL ON public.match_players TO service_role;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mp member read" ON public.match_players FOR SELECT TO authenticated USING (public.is_pelada_member(public.match_pelada(match_id), auth.uid()));
CREATE POLICY "mp owner write" ON public.match_players FOR ALL TO authenticated USING (public.is_pelada_owner(public.match_pelada(match_id), auth.uid())) WITH CHECK (public.is_pelada_owner(public.match_pelada(match_id), auth.uid()));

CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  jogador_id uuid NOT NULL REFERENCES public.jogadores(id) ON DELETE CASCADE,
  presente boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(match_id, jogador_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "att member read" ON public.attendance FOR SELECT TO authenticated USING (public.is_pelada_member(public.match_pelada(match_id), auth.uid()));
CREATE POLICY "att owner write" ON public.attendance FOR ALL TO authenticated USING (public.is_pelada_owner(public.match_pelada(match_id), auth.uid())) WITH CHECK (public.is_pelada_owner(public.match_pelada(match_id), auth.uid()));

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pelada_id uuid NOT NULL REFERENCES public.peladas(id) ON DELETE CASCADE,
  jogador_id uuid NOT NULL REFERENCES public.jogadores(id) ON DELETE CASCADE,
  match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  valor numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pago' CHECK (status IN ('pago','pendente','estornado')),
  pago_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.is_my_jogador(_jogador uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM jogadores WHERE id=_jogador AND user_id=auth.uid()) $$;
CREATE POLICY "pay own or owner read" ON public.payments FOR SELECT TO authenticated USING (public.is_my_jogador(jogador_id) OR public.is_pelada_owner(pelada_id, auth.uid()));
CREATE POLICY "pay owner write" ON public.payments FOR ALL TO authenticated USING (public.is_pelada_owner(pelada_id, auth.uid())) WITH CHECK (public.is_pelada_owner(pelada_id, auth.uid()));

-- claim legacy pelada (called by edge function only)
CREATE OR REPLACE FUNCTION public.claim_legacy_pelada(_user uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE peladas SET owner_id=_user WHERE id='00000000-0000-0000-0000-000000000001' AND owner_id IS NULL $$;
REVOKE EXECUTE ON FUNCTION public.claim_legacy_pelada(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_legacy_pelada(uuid) TO service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.peladas;
