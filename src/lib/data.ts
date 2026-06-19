import type { SupabaseClient } from "@supabase/supabase-js";
import type { Concurso, LoteriaId, Pesos } from "./types";
import { PESOS_PADRAO } from "./lotteries";

// Camada de acesso a dados compartilhada entre rotas (recebe o client ja criado).

export async function carregarConcursos(
  sb: SupabaseClient,
  loteria: LoteriaId,
  limite = 600,
): Promise<Concurso[]> {
  const { data, error } = await sb
    .from("concursos")
    .select("numero_concurso, data_sorteio, numeros_sorteados")
    .eq("loteria_id", loteria)
    .order("numero_concurso", { ascending: false })
    .limit(limite);
  if (error) throw error;
  return (data ?? []).reverse() as Concurso[];
}

// Pesos do usuario; cai para os globais (user_id null) e depois para o padrao.
export async function carregarPesos(
  sb: SupabaseClient,
  loteria: LoteriaId,
  userId: string | null,
): Promise<Pesos> {
  const { data } = await sb
    .from("pesos_ia")
    .select("*")
    .eq("loteria_id", loteria)
    .or(userId ? `user_id.eq.${userId},user_id.is.null` : "user_id.is.null");

  if (data && data.length) {
    // prioriza o do usuario
    const doUser = data.find((r: any) => r.user_id === userId);
    const escolhido = doUser ?? data[0];
    return extrairPesos(escolhido);
  }
  return { ...PESOS_PADRAO };
}

export async function salvarPesos(
  sb: SupabaseClient,
  loteria: LoteriaId,
  userId: string,
  pesos: Pesos,
): Promise<void> {
  const { error } = await sb.from("pesos_ia").upsert(
    {
      loteria_id: loteria,
      user_id: userId,
      ...pesos,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "loteria_id,user_id" },
  );
  if (error) throw error;
}

export function extrairPesos(row: any): Pesos {
  return {
    peso_frequencia: row.peso_frequencia ?? 1,
    peso_atraso: row.peso_atraso ?? 1,
    peso_tendencia: row.peso_tendencia ?? 1,
    peso_pares: row.peso_pares ?? 1,
    peso_trios: row.peso_trios ?? 1,
    peso_soma: row.peso_soma ?? 1,
    peso_distribuicao: row.peso_distribuicao ?? 1,
    peso_cobertura: row.peso_cobertura ?? 1,
  };
}
