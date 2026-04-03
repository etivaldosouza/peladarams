
-- Tabela de jogadores
CREATE TABLE public.jogadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.jogadores ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode ver os jogadores
CREATE POLICY "Anyone can view jogadores" ON public.jogadores FOR SELECT USING (true);
-- Qualquer pessoa pode adicionar jogadores
CREATE POLICY "Anyone can insert jogadores" ON public.jogadores FOR INSERT WITH CHECK (true);
-- Qualquer pessoa pode atualizar jogadores (admin usa isso)
CREATE POLICY "Anyone can update jogadores" ON public.jogadores FOR UPDATE USING (true);
-- Qualquer pessoa pode deletar jogadores
CREATE POLICY "Anyone can delete jogadores" ON public.jogadores FOR DELETE USING (true);

-- Tabela de configurações da pelada
CREATE TABLE public.pelada_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chave TEXT NOT NULL UNIQUE,
  valor TEXT NOT NULL
);

ALTER TABLE public.pelada_config ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode ler as configurações
CREATE POLICY "Anyone can view config" ON public.pelada_config FOR SELECT USING (true);
-- Qualquer pessoa pode inserir configurações
CREATE POLICY "Anyone can insert config" ON public.pelada_config FOR INSERT WITH CHECK (true);
-- Qualquer pessoa pode atualizar configurações
CREATE POLICY "Anyone can update config" ON public.pelada_config FOR UPDATE USING (true);

-- Inserir valores padrão
INSERT INTO public.pelada_config (chave, valor) VALUES
  ('data_pelada', 'A definir'),
  ('valor_campo', '110'),
  ('valor_jogador', '10');
