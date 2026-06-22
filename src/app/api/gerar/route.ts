import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { carregarConcursos, carregarPesos } from "@/lib/data";
import { getLoteria, clampDezenas } from "@/lib/lotteries";
import { gerarJogos, pesosEfetivos } from "@/lib/stats/generate";
import { chanceComJogos, chancePrincipal, formatarUmEm } from "@/lib/stats/probability";
import { qualidadeConjunto } from "@/lib/stats/quality";
import { concursosSimilares } from "@/lib/stats/similarity";
import type { Estrategia, LoteriaId, Objetivo } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const loteriaId = body.loteria as LoteriaId;
    const qtdJogos = Math.max(1, Math.min(50, Number(body.qtdJogos ?? 5)));
    const estrategia = (body.estrategia ?? "equilibrado") as Estrategia;
    const objetivo = (body.objetivo ?? "principal") as Objetivo;

    const loteria = getLoteria(loteriaId);
    const qtdDezenas = clampDezenas(loteriaId, Number(body.dezenas ?? loteria.qtd_aposta_min));

    const sb = createClient();
    const { data: auth } = await sb.auth.getUser();
    const userId = auth.user?.id ?? null;

    const concursos = await carregarConcursos(sb, loteriaId);
    if (concursos.length < 50) {
      return NextResponse.json(
        { error: "Historico insuficiente. Importe concursos primeiro." },
        { status: 400 },
      );
    }
    const pesos = await carregarPesos(sb, loteriaId, userId);

    const jogos = gerarJogos({
      loteria,
      concursos,
      pesos,
      estrategia,
      qtdJogos,
      qtdDezenas,
      objetivo,
    });

    const probUnit = chancePrincipal(loteria, qtdDezenas);
    const probTotal = chanceComJogos(loteria, qtdDezenas, qtdJogos);
    const ultimoConcurso = concursos[concursos.length - 1]?.numero_concurso ?? 0;

    // Indice de qualidade (0-100) do conjunto + por jogo
    const numerosPorJogo = jogos.map((j) => j.numeros);
    const qualidade = qualidadeConjunto(loteria, numerosPorJogo, concursos);

    // Similaridade historica: top 2 concursos parecidos com cada jogo
    const similares = numerosPorJogo.map((j) => concursosSimilares(j, concursos, 2));

    return NextResponse.json({
      loteria: loteria.id,
      concurso_previsto: ultimoConcurso + 1,
      estrategia,
      objetivo,
      pesos_usados: pesosEfetivos(pesos, estrategia),
      jogos,
      qualidade,
      similares,
      chance: {
        por_jogo: formatarUmEm(probUnit),
        combinada: formatarUmEm(probTotal),
        aviso:
          "Loteria e aleatoria. Esta e uma estrategia estatistica, sem garantia de premio.",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Erro ao gerar" }, { status: 500 });
  }
}
