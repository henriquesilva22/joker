-- =====================================================================
-- Modulo Admin - rode no SQL Editor do Supabase.
-- =====================================================================

-- Quem e administrador. Apenas user_ids aqui podem cadastrar resultados.
create table if not exists public.admin_users (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  criado_em   timestamptz not null default now(),
  unique (user_id)
);

alter table public.admin_users enable row level security;

-- Cada usuario so consegue verificar se ELE mesmo e admin (nao lista os outros).
drop policy if exists "admin_self_read" on public.admin_users;
create policy "admin_self_read" on public.admin_users
  for select using (user_id = auth.uid());

grant select on public.admin_users to authenticated;

-- Detalhes por jogo na conferencia (jogo, acertos, numeros_acertados, ganhou).
alter table public.resultados_previsoes
  add column if not exists detalhes_jogos jsonb;

-- Indices para acelerar a conferencia pos-cadastro de resultado.
create index if not exists idx_previsoes_loteria_concurso
  on public.previsoes (loteria_id, concurso_previsto);
create index if not exists idx_resultados_previsao
  on public.resultados_previsoes (previsao_id);

-- ---------------------------------------------------------------------
-- Como promover um usuario a admin (rode manualmente com o uuid dele):
--   insert into public.admin_users (user_id)
--   values ('00000000-0000-0000-0000-000000000000')
--   on conflict (user_id) do nothing;
-- Descubra o uuid em Authentication > Users no painel do Supabase.
-- ---------------------------------------------------------------------
