import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { carregarConcursos, carregarPesos } from "@/lib/data";
import { getLoteria, clampDezenas, faixaDezenas } from "@/lib/lotteries";
import { rodarBacktest, melhorDezenasAdaptativa } from "@/lib/stats/backtest";
import type { Estrategia, LoteriaId } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// Estrategias fixas mostradas no ranking (a Adaptativa vira recomendacao).
const FIXAS: Estrategia[] = ["conservador", "equilibrado", "agressivo"];

// Roda backtest das estrategias na quantidade de dezenas escolhida e
// recomenda automaticamente a melhor quantidade para a IA Adaptativa.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const loteriaId = body.loteria as LoteriaId;
    const loteria = getLoteria(loteriaId);
    const faixa = faixaDezenas(loteriaId);
    const dezenas = clampDezenas(loteriaId, Number(body.dezenas ?? faixa.min));

    const sb = createClient();
    const { data: auth } = await sb.auth.getUser();
    const userId = auth.user?.id ?? null;

    const concursos = await carregarConcursos(sb, loteriaId, 600);
    if (concursos.length < 150) {
      return NextResponse.json(
        { error: "Historico insuficiente para backtest (minimo ~150)." },
        { status: 400 },
      );
    }
    const pesos = await carregarPesos(sb, loteriaId, userId);
    const qtdJogos = Number(body.qtdJogos ?? 5);
    const passo = Number(body.passo ?? 3);

    const ranking = FIXAS.map((est) =>
      rodarBacktest({ loteria, concursos, pesos, estrategia: est, qtdJogos, dezenas, passo }),
    );

    // IA Adaptativa: melhor quantidade de dezenas no historico
    const recomendacao = melhorDezenasAdaptativa({
      loteria,
      concursos,
      pesos,
      qtdJogos,
      passo,
      min: faixa.min,
      max: faixa.max,
    });

    // persiste no ranking (se logado)
    if (userId) {
      await sb.from("backtests").insert(
        ranking.map((r) => ({
          user_id: userId,
          loteria_id: loteriaId,
          estrategia: r.estrategia,
          dezenas_apostadas: r.dezenas_apostadas,
          concursos_testados: r.concursos_testados,
          media_acertos: r.media_acertos,
          melhor_resultado: r.melhor_resultado,
          pior_resultado: r.pior_resultado,
          lucro_simulado: r.lucro_simulado,
          detalhes: r.acertos_por_faixa,
        })),
      );
    }

    ranking.sort((a, b) => b.media_acertos - a.media_acertos);
    return NextResponse.json({
      loteria: loteriaId,
      dezenas,
      ranking,
      recomendacao_adaptativa: recomendacao,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Erro" }, { status: 500 });
  }
}
