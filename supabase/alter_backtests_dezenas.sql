-- Adiciona a coluna dezenas_apostadas na tabela de backtests.
-- Rode uma vez no SQL Editor do Supabase (idempotente).
alter table public.backtests
  add column if not exists dezenas_apostadas int not null default 0;
