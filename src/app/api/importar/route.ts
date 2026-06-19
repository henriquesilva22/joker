import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buscarResultadoCaixa } from "@/lib/caixa";
import { getLoteria } from "@/lib/lotteries";
import type { LoteriaId } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

// Backfill: importa os ultimos N concursos de uma loteria da API da Caixa.
// Protegido por CRON_SECRET para evitar abuso (rode manualmente uma vez).
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const loteriaId = body.loteria as LoteriaId;
  getLoteria(loteriaId); // valida
  const quantidade = Math.max(1, Math.min(1000, Number(body.quantidade ?? 600)));

  const sb = createAdminClient();

  // descobre o ultimo concurso
  const ultimo = await buscarResultadoCaixa(loteriaId);
  if (!ultimo) {
    return NextResponse.json({ error: "Nao foi possivel obter o ultimo concurso." }, { status: 502 });
  }

  const inicio = Math.max(1, ultimo.numero_concurso - quantidade + 1);
  let importados = 0;
  const erros: number[] = [];

  // importa do mais antigo ao mais novo; gravacao em lotes
  const lote: any[] = [];
  for (let n = inicio; n <= ultimo.numero_concurso; n++) {
    const r = n === ultimo.numero_concurso ? ultimo : await buscarResultadoCaixa(loteriaId, n);
    if (!r) {
      erros.push(n);
      continue;
    }
    lote.push({
      loteria_id: loteriaId,
      numero_concurso: r.numero_concurso,
      data_sorteio: r.data_sorteio,
      numeros_sorteados: r.numeros_sorteados,
      acumulado: r.acumulado,
    });
    if (lote.length >= 50) {
      const { error } = await sb.from("concursos").upsert(lote, {
        onConflict: "loteria_id,numero_concurso",
      });
      if (!error) importados += lote.length;
      lote.length = 0;
    }
  }
  if (lote.length) {
    const { error } = await sb.from("concursos").upsert(lote, {
      onConflict: "loteria_id,numero_concurso",
    });
    if (!error) importados += lote.length;
  }

  return NextResponse.json({ ok: true, loteria: loteriaId, importados, erros });
}
