-- =====================================================================
-- Proximo concurso (um por loteria). Rode no SQL Editor do Supabase.
-- =====================================================================

create table if not exists public.proximos_concursos (
  id               uuid primary key default gen_random_uuid(),
  loteria_id       text not null references public.loterias(id) on delete cascade,
  numero_concurso  integer not null,
  data_sorteio     date,
  premio_estimado  numeric(14,2),
  criado_em        timestamptz not null default now(),
  unique (loteria_id)
);

alter table public.proximos_concursos enable row level security;

-- Leitura publica (pode ser exibido no app); escrita so via service role (admin).
drop policy if exists "proximos_read" on public.proximos_concursos;
create policy "proximos_read" on public.proximos_concursos
  for select using (true);

grant select on public.proximos_concursos to anon, authenticated;
