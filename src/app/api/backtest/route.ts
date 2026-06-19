import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { carregarConcursos, carregarPesos } from "@/lib/data";
import { getLoteria } from "@/lib/lotteries";
import { rodarBacktest } from "@/lib/stats/backtest";
import type { Estrategia, LoteriaId } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const ESTRATEGIAS: Estrategia[] = [
  "conservador",
  "equilibrado",
  "agressivo",
  "adaptativo",
];

// Roda backtest de uma ou de todas as estrategias e salva no ranking.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const loteriaId = body.loteria as LoteriaId;
    const loteria = getLoteria(loteriaId);
    const todas = Boolean(body.todas);

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

    const lista = todas
      ? ESTRATEGIAS
      : [(body.estrategia ?? "equilibrado") as Estrategia];

    const resultados = lista.map((est) =>
      rodarBacktest({
        loteria,
        concursos,
        pesos,
        estrategia: est,
        qtdJogos: Number(body.qtdJogos ?? 5),
        passo: Number(body.passo ?? 3), // acelera: testa 1 a cada 3 concursos
      }),
    );

    // persiste no ranking (se logado)
    if (userId) {
      await sb.from("backtests").insert(
        resultados.map((r) => ({
          user_id: userId,
          loteria_id: loteriaId,
          estrategia: r.estrategia,
          concursos_testados: r.concursos_testados,
          media_acertos: r.media_acertos,
          melhor_resultado: r.melhor_resultado,
          pior_resultado: r.pior_resultado,
          lucro_simulado: r.lucro_simulado,
          detalhes: r.acertos_por_faixa,
        })),
      );
    }

    resultados.sort((a, b) => b.score - a.score);
    return NextResponse.json({ loteria: loteriaId, ranking: resultados });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Erro" }, { status: 500 });
  }
}
