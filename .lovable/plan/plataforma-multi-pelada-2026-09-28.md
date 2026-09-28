# Plataforma multi-pelada

## O que muda para você
- Organizadores entram com Google ou e-mail/senha e criam quantas peladas quiserem.
- Cada pelada tem link próprio: `site.com/p/<nome-da-pelada>`.
- Jogadores criam conta para se inscrever e podem participar de várias peladas.
- A sua pelada atual vira a primeira pelada da plataforma (link `/p/pelada-da-semana`), com todos os jogadores, configurações e sorteio preservados. A página inicial `/` continua mostrando essa pelada.
- O acesso por senha de admin é substituído: você passa a administrar entrando com sua conta (vinculada como dona da pelada atual no primeiro login com o seu e-mail).

## Páginas
- `/entrar` – login/cadastro (Google + e-mail), com recuperação de senha (`/reset-password`).
- `/minhas-peladas` – lista das peladas que organizo e das que participo; botão "Criar pelada".
- `/p/:slug` – página pública atual (mesmo visual), agora da pelada escolhida. Inscrição exige login.
- `/p/:slug/admin` – painel admin atual (mesmo visual), liberado só ao dono.
- `/admin` – redireciona para o admin da pelada atual.

## Detalhes técnicos

Tabelas novas:
- `profiles` (id = usuário, nome, telefone, avatar) – criada automaticamente no cadastro.
- `peladas` (nome, slug único, owner_id, criado_em).
- `pelada_members` (pelada_id, user_id, papel owner/admin/player) – único por pelada+usuário.
- `matches` (pelada_id, data, local, status, sorteio jsonb).
- `match_players` (match_id, jogador_id, time, gols) – base para rankings/estatísticas.
- `attendance` (match_id, jogador_id, presente).
- `payments` (pelada_id, jogador_id, match_id opcional, valor, status, pago_em).

Tabelas existentes adaptadas (sem apagar dados):
- `jogadores`: + `pelada_id` (FK peladas, preenchido com a pelada atual) e + `user_id` opcional (inscrições antigas continuam sem usuário). Unicidade de dispositivo/telefone passa a ser por pelada.
- `pelada_config`: + `pelada_id` (preenchido com a pelada atual); `chave` única por pelada.
- View `jogadores_public`: incluir `pelada_id`, sem telefone.

Segurança (RLS), com funções `is_pelada_owner` / `is_pelada_member` (security definer):
- profiles: cada um vê e edita só o próprio.
- peladas: leitura pública (nome/slug); criar = usuário logado como dono; editar/excluir = dono.
- pelada_members: dono gerencia; membro vê os membros da própria pelada; usuário pode entrar/sair como player.
- jogadores: telefone continua oculto (leitura só pela view pública); usuário logado insere/cancela a própria inscrição; dono lê tudo e altera status.
- pelada_config: leitura pública; escrita só do dono.
- matches/match_players/attendance: leitura por membros; escrita pelo dono.
- payments: jogador vê os próprios; dono vê e gerencia todos.
- Trigger para criar `profiles` e para adicionar o criador como owner em `pelada_members`.

Código:
- Configurar login Google + e-mail; hook de sessão.
- Index/Admin passam a receber `pelada_id` pelo slug e filtrar todas as consultas/realtime por ele.
- Admin passa a escrever direto no banco (RLS do dono) em vez da senha; a função `admin-api` é removida após a migração.
- Pagamentos continuam no `status` do jogador (compatível) e também registram em `payments`.

Ao final entrego o resumo pedido: tabelas criadas, alteradas, relacionamentos, políticas e funcionalidades preservadas.
