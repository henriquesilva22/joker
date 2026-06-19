-- =====================================================================
-- SorteIA - Schema do Supabase (Postgres)
-- Rode este arquivo no SQL Editor do Supabase (ou via `supabase db push`).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- LOTERIAS (catalogo - dados publicos)
-- ---------------------------------------------------------------------
create table if not exists public.loterias (
  id              text primary key,            -- ex: 'megasena'
  nome            text not null,
  numero_min      int  not null,               -- menor numero possivel
  numero_max      int  not null,               -- maior numero possivel
  qtd_sorteada    int  not null,               -- quantos sao sorteados
  qtd_aposta_min  int  not null,               -- minimo de dezenas na aposta
  qtd_aposta_max  int  not null,               -- maximo de dezenas na aposta
  preco_base      numeric(10,2) not null default 0,
  criado_em       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- CONCURSOS (historico oficial - dados publicos)
-- ---------------------------------------------------------------------
create table if not exists public.concursos (
  id                bigint generated always as identity primary key,
  loteria_id        text not null references public.loterias(id) on delete cascade,
  numero_concurso   int  not null,
  data_sorteio      date not null,
  numeros_sorteados int[] not null,
  acumulado         boolean default false,
  premio_principal  numeric(14,2),
  criado_em         timestamptz not null default now(),
  unique (loteria_id, numero_concurso)
);
create index if not exists idx_concursos_loteria_num
  on public.concursos (loteria_id, numero_concurso desc);

-- ---------------------------------------------------------------------
-- PESOS DA IA (por loteria + por usuario; user_id null = global/padrao)
-- ---------------------------------------------------------------------
create table if not exists public.pesos_ia (
  id                 bigint generated always as identity primary key,
  loteria_id         text not null references public.loterias(id) on delete cascade,
  user_id            uuid references auth.users(id) on delete cascade,
  peso_frequencia    real not null default 1.0,
  peso_atraso        real not null default 1.0,
  peso_tendencia     real not null default 1.0,
  peso_pares         real not null default 1.0,
  peso_trios         real not null default 1.0,
  peso_soma          real not null default 1.0,
  peso_distribuicao  real not null default 1.0,
  peso_cobertura     real not null default 1.0,
  atualizado_em      timestamptz not null default now(),
  unique (loteria_id, user_id)
);

-- ---------------------------------------------------------------------
-- PREVISOES (jogos gerados e salvos pelo usuario)
-- ---------------------------------------------------------------------
create table if not exists public.previsoes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  loteria_id         text not null references public.loterias(id) on delete cascade,
  concurso_previsto  int  not null,
  jogos_gerados      jsonb not null,            -- int[][] : lista de jogos
  estrategia         text not null,             -- conservador|equilibrado|agressivo|adaptativo
  objetivo           text not null default 'principal', -- principal|parciais
  pesos_usados       jsonb not null,
  criado_em          timestamptz not null default now()
);
create index if not exists idx_previsoes_user on public.previsoes (user_id, criado_em desc);

-- ---------------------------------------------------------------------
-- RESULTADOS DAS PREVISOES (conferencia + analise pos-sorteio)
-- ---------------------------------------------------------------------
create table if not exists public.resultados_previsoes (
  id               uuid primary key default gen_random_uuid(),
  previsao_id      uuid not null references public.previsoes(id) on delete cascade,
  resultado_real   int[] not null,
  acertos_por_jogo int[] not null,
  melhor_acerto    int  not null,
  ganhou           boolean not null default false,
  analise_erro     jsonb,                       -- diagnostico estruturado
  ajuste_sugerido  jsonb,                       -- delta de pesos aplicado
  explicacao_ia    text,                        -- explicacao gerada localmente
  conferido_em     timestamptz not null default now(),
  unique (previsao_id)
);

-- ---------------------------------------------------------------------
-- BACKTESTS (avaliacao historica de estrategias)
-- ---------------------------------------------------------------------
create table if not exists public.backtests (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade,
  loteria_id          text not null references public.loterias(id) on delete cascade,
  estrategia          text not null,
  concursos_testados  int not null,
  media_acertos       real not null,
  melhor_resultado    int not null,
  pior_resultado      int not null,
  lucro_simulado      numeric(14,2) not null default 0,
  detalhes            jsonb,
  criado_em           timestamptz not null default now()
);
create index if not exists idx_backtests_user on public.backtests (user_id, criado_em desc);

-- =====================================================================
-- SEED das loterias brasileiras
-- =====================================================================
insert into public.loterias (id, nome, numero_min, numero_max, qtd_sorteada, qtd_aposta_min, qtd_aposta_max, preco_base) values
  ('megasena',  'Mega-Sena',  1,  60,  6, 6, 20, 5.00),
  ('lotofacil', 'Lotofacil',  1,  25, 15, 15, 20, 3.00),
  ('lotomania', 'Lotomania',  0,  99, 20, 50, 50, 3.00),
  ('quina',     'Quina',      1,  80,  5, 5, 15, 2.50),
  ('duplasena', 'Dupla Sena', 1,  50,  6, 6, 15, 2.50),
  ('timemania', 'Timemania',  1,  80,  7, 10, 10, 3.50)
on conflict (id) do nothing;

-- pesos globais padrao por loteria (user_id null)
insert into public.pesos_ia (loteria_id, user_id)
select id, null from public.loterias
on conflict (loteria_id, user_id) do nothing;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.loterias            enable row level security;
alter table public.concursos           enable row level security;
alter table public.pesos_ia            enable row level security;
alter table public.previsoes           enable row level security;
alter table public.resultados_previsoes enable row level security;
alter table public.backtests           enable row level security;

-- Catalogo e historico: leitura publica
drop policy if exists "loterias_read" on public.loterias;
create policy "loterias_read" on public.loterias for select using (true);

drop policy if exists "concursos_read" on public.concursos;
create policy "concursos_read" on public.concursos for select using (true);

-- Pesos: le os globais (user_id null) ou os proprios; escreve so os proprios
drop policy if exists "pesos_read" on public.pesos_ia;
create policy "pesos_read" on public.pesos_ia
  for select using (user_id is null or user_id = auth.uid());
drop policy if exists "pesos_write" on public.pesos_ia;
create policy "pesos_write" on public.pesos_ia
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Previsoes: cada usuario so enxerga as suas
drop policy if exists "previsoes_owner" on public.previsoes;
create policy "previsoes_owner" on public.previsoes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Resultados: dono via join na previsao
drop policy if exists "resultados_owner" on public.resultados_previsoes;
create policy "resultados_owner" on public.resultados_previsoes
  for all using (
    exists (select 1 from public.previsoes p
            where p.id = previsao_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.previsoes p
            where p.id = previsao_id and p.user_id = auth.uid())
  );

-- Backtests: dono (ou globais com user_id null para leitura)
drop policy if exists "backtests_read" on public.backtests;
create policy "backtests_read" on public.backtests
  for select using (user_id is null or user_id = auth.uid());
drop policy if exists "backtests_write" on public.backtests;
create policy "backtests_write" on public.backtests
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
