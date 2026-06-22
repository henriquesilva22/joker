import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { carregarConcursos, carregarPesos, salvarPesos } from "@/lib/data";
import { getLoteria } from "@/lib/lotteries";
import { conferir } from "@/lib/stats/check";
import { aplicarAjuste, combinarDeltas, diffPesos } from "@/lib/stats/learn";
import { ajusteDaMemoria, resumirMemoria } from "@/lib/stats/memoria";
import { explicarAnalise } from "@/lib/explicacao";
import type { LoteriaId } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

// Confere uma previsao salva contra o resultado real, aprende e ajusta pesos.
export async function POST(req: Request) {
  try {
    const sb = createClient();
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const { previsaoId } = await req.json();

    const { data: prev, error: e1 } = await sb
      .from("previsoes")
      .select("*")
      .eq("id", previsaoId)
      .single();
    if (e1 || !prev) {
      return NextResponse.json({ error: "Previsao nao encontrada" }, { status: 404 });
    }

    const loteria = getLoteria(prev.loteria_id as LoteriaId);

    // Busca o resultado real do concurso previsto (deve ja estar importado).
    const { data: concurso } = await sb
      .from("concursos")
      .select("numeros_sorteados")
      .eq("loteria_id", loteria.id)
      .eq("numero_concurso", prev.concurso_previsto)
      .single();

    if (!concurso) {
      return NextResponse.json(
        { error: "Resultado do concurso ainda nao disponivel." },
        { status: 409 },
      );
    }

    const historico = await carregarConcursos(sb, loteria.id);
    const anteriores = historico.filter(
      (c) => c.numero_concurso < prev.concurso_previsto,
    );

    const conf = conferir(
      loteria,
      prev.jogos_gerados as number[][],
      concurso.numeros_sorteados as number[],
      anteriores,
      prev.pesos_usados,
    );

    // ----- Memoria de erros: olha as ultimas falhas para corrigir vieses -----
    const { data: historicoErros } = await sb
      .from("resultados_previsoes")
      .select("analise_erro, previsoes!inner(loteria_id, user_id)")
      .eq("previsoes.loteria_id", loteria.id)
      .eq("previsoes.user_id", auth.user.id)
      .order("conferido_em", { ascending: false })
      .limit(50);

    const analises = [
      conf.analise_erro,
      ...((historicoErros ?? [])
        .map((r: any) => r.analise_erro)
        .filter(Boolean) as typeof conf.analise_erro[]),
    ];
    const memoria = resumirMemoria(analises);
    const ajusteMemoria = ajusteDaMemoria(memoria);

    // ----- Aprendizado: combina ajuste do sorteio atual + memoria -----
    const pesosAtuais = await carregarPesos(sb, loteria.id, auth.user.id);
    const deltaCombinado = combinarDeltas(conf.ajuste_sugerido, ajusteMemoria);
    const pesosNovos = aplicarAjuste(pesosAtuais, deltaCombinado);
    await salvarPesos(sb, loteria.id, auth.user.id, pesosNovos);
    const delta = diffPesos(pesosAtuais, pesosNovos);

    // ----- Explicacao da IA (gerada localmente a partir do diagnostico) -----
    const idxMelhor = conf.acertos_por_jogo.indexOf(conf.melhor_acerto);
    const explicacao = explicarAnalise({
      loteria,
      resultadoReal: conf.resultado_real,
      melhorJogo: (prev.jogos_gerados as number[][])[idxMelhor] ?? [],
      melhorAcerto: conf.melhor_acerto,
      ganhou: conf.ganhou,
      analise: conf.analise_erro,
      ajuste: conf.ajuste_sugerido,
    });

    // ----- Persiste o resultado da conferencia -----
    const { error: e2 } = await sb.from("resultados_previsoes").upsert(
      {
        previsao_id: previsaoId,
        resultado_real: conf.resultado_real,
        acertos_por_jogo: conf.acertos_por_jogo,
        melhor_acerto: conf.melhor_acerto,
        ganhou: conf.ganhou,
        analise_erro: conf.analise_erro,
        ajuste_sugerido: delta,
        explicacao_ia: explicacao || null,
      },
      { onConflict: "previsao_id" },
    );
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

    return NextResponse.json({
      ...conf,
      ajuste_aplicado: delta,
      pesos_novos: pesosNovos,
      explicacao_ia: explicacao,
      memoria: { amostras: memoria.amostras, ajuste: ajusteMemoria },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Erro" }, { status: 500 });
  }
}
