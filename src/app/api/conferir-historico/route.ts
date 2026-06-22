import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Conferidor Historico (Lotofacil): compara um jogo de 15 dezenas com TODOS
// os concursos salvos e retorna onde teria feito 11+ acertos. Logica 100% local.
const LOTERIA = "lotofacil";
const QTD_DEZENAS = 15;
const MIN_PREMIO = 11; // Lotofacil paga a partir de 11 acertos

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const numeros: number[] = Array.isArray(body.numeros)
      ? body.numeros.map((n: unknown) => Number(n))
      : [];

    // ----- Validacao -----
    if (numeros.length !== QTD_DEZENAS) {
      return NextResponse.json(
        { error: `Informe exatamente ${QTD_DEZENAS} numeros.` },
        { status: 400 },
      );
    }
    if (numeros.some((n) => !Number.isInteger(n) || n < 1 || n > 25)) {
      return NextResponse.json(
        { error: "Todos os numeros devem estar entre 1 e 25." },
        { status: 400 },
      );
    }
    if (new Set(numeros).size !== QTD_DEZENAS) {
      return NextResponse.json(
        { error: "Nao repita numeros." },
        { status: 400 },
      );
    }

    const jogo = new Set(numeros);

    const sb = createClient();
    const { data, error } = await sb
      .from("concursos")
      .select("numero_concurso, data_sorteio, numeros_sorteados")
      .eq("loteria_id", LOTERIA)
      .order("numero_concurso", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const concursos = data ?? [];
    const premiacoes = [];

    for (const c of concursos) {
      const sorteados = c.numeros_sorteados as number[];
      const acertados = sorteados.filter((n) => jogo.has(n));
      const acertos = acertados.length;
      if (acertos >= MIN_PREMIO) {
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

    // resumo por faixa de acertos (11,12,13,14,15)
    const resumo: Record<number, number> = {};
    for (const p of premiacoes) resumo[p.acertos] = (resumo[p.acertos] ?? 0) + 1;

    return NextResponse.json({
      jogo: numeros.slice().sort((a, b) => a - b),
      total_concursos: concursos.length,
      total_premiacoes: premiacoes.length,
      melhor_acerto: premiacoes.length ? premiacoes[0].acertos : 0,
      resumo,
      premiacoes,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Erro" }, { status: 500 });
  }
}
