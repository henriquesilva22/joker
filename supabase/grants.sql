-- =====================================================================
-- GRANTS - rode UMA vez no SQL Editor do Supabase.
-- Corrige "permission denied for table ..." ao ler dados como anon.
-- A RLS continua valendo: os GRANTs liberam o acesso a tabela,
-- e as policies controlam QUAIS linhas cada papel enxerga.
-- =====================================================================

grant usage on schema public to anon, authenticated;

-- Catalogo e historico: leitura publica (anon + logado)
grant select on public.loterias  to anon, authenticated;
grant select on public.concursos to anon, authenticated;

-- Pesos: leitura por todos (anon usa os globais user_id null); escrita so logado
grant select on public.pesos_ia to anon, authenticated;
grant insert, update, delete on public.pesos_ia to authenticated;

-- Dados do usuario: apenas logado (RLS restringe as proprias linhas)
grant select, insert, update, delete on public.previsoes            to authenticated;
grant select, insert, update, delete on public.resultados_previsoes to authenticated;
grant select, insert, update, delete on public.backtests            to authenticated;

-- Sequencias (ids) usadas pelos inserts
grant usage, select on all sequences in schema public to authenticated;
