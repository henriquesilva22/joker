import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLoteria, faixaDezenas } from "@/lib/lotteries";
import { PREMIA_A_PARTIR_DE } from "@/lib/stats/check";
import type { LoteriaId } from "@/lib/types";

export const runtime = "nodejs";

// Conferidor Historico (todas as loterias): compara um jogo com TODOS os
// concursos salvos da loteria escolhida e mostra onde teria sido premiado.
// Logica 100% local, sem API externa.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const loteriaId = body.loteria as LoteriaId;

    let loteria;
    try {
      loteria = getLoteria(loteriaId);
    } catch {
      return NextResponse.json({ error: "Loteria invalida." }, { status: 400 });
    }

    const numeros: number[] = Array.isArray(body.numeros)
      ? body.numeros.map((n: unknown) => Number(n))
      : [];
    const faixa = faixaDezenas(loteriaId);
    const minPremio = PREMIA_A_PARTIR_DE[loteriaId] ?? loteria.qtd_sorteada;

    // ----- Validacao adaptada a loteria -----
    if (numeros.length < faixa.min || numeros.length > faixa.max) {
      return NextResponse.json(
        {
          error: faixa.fixo
            ? `Informe exatamente ${faixa.min} numeros.`
            : `Informe entre ${faixa.min} e ${faixa.max} numeros.`,
        },
        { status: 400 },
      );
    }
    if (
      numeros.some(
        (n) => !Number.isInteger(n) || n < loteria.numero_min || n > loteria.numero_max,
      )
    ) {
      return NextResponse.json(
        { error: `Numeros devem estar entre ${loteria.numero_min} e ${loteria.numero_max}.` },
        { status: 400 },
      );
    }
    if (new Set(numeros).size !== numeros.length) {
      return NextResponse.json({ error: "Nao repita numeros." }, { status: 400 });
    }

    const jogo = new Set(numeros);

    const sb = createClient();
    const { data, error } = await sb
      .from("concursos")
      .select("numero_concurso, data_sorteio, numeros_sorteados")
      .eq("loteria_id", loteriaId)
      .order("numero_concurso", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const concursos = data ?? [];
    const premiacoes = [];
    let maiorAcerto = 0;

    for (const c of concursos) {
      const sorteados = c.numeros_sorteados as number[];
      const acertados = sorteados.filter((n) => jogo.has(n));
      const acertos = acertados.length;
      if (acertos > maiorAcerto) maiorAcerto = acertos;
      if (acertos >= minPremio) {
        premiacoes.push({
          numero_concurso: c.numero_concurso,
          data_sorteio: c.data_sorteio,
          numeros_sorteados: sorteados,
          acertados: acertados.sort((a, b) => a - b),
          acertos,
          premiado: true,
        });
      }
    }

    premiacoes.sort(
      (a, b) => b.acertos - a.acertos || b.numero_concurso - a.numero_concurso,
    );

    return NextResponse.json({
      loteria: loteriaId,
      jogo: numeros.slice().sort((a, b) => a - b),
      concursos_analisados: concursos.length,
      maior_acerto: maiorAcerto,
      concursos_premiados: premiacoes.length,
      premiacoes,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Erro" }, { status: 500 });
  }
}
