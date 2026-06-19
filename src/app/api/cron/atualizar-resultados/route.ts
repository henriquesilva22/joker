import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buscarResultadoCaixa } from "@/lib/caixa";
import { LISTA_LOTERIAS } from "@/lib/lotteries";

export const runtime = "nodejs";
export const maxDuration = 60;

// Cron da Vercel: busca o ultimo resultado de cada loteria e salva novos concursos.
export async function GET(req: Request) {
  // protege o endpoint com CRON_SECRET (Vercel envia em Authorization)
  const auth = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const sb = createAdminClient();
  const resumo: Record<string, string> = {};

  for (const loteria of LISTA_LOTERIAS) {
    try {
      const r = await buscarResultadoCaixa(loteria.id);
      if (!r) {
        resumo[loteria.id] = "sem dados";
        continue;
      }
      const { error } = await sb.from("concursos").upsert(
        {
          loteria_id: loteria.id,
          numero_concurso: r.numero_concurso,
          data_sorteio: r.data_sorteio,
          numeros_sorteados: r.numeros_sorteados,
          acumulado: r.acumulado,
        },
        { onConflict: "loteria_id,numero_concurso" },
      );
      resumo[loteria.id] = error ? `erro: ${error.message}` : `concurso ${r.numero_concurso}`;
    } catch (e: any) {
      resumo[loteria.id] = `falha: ${e.message}`;
    }
  }

  return NextResponse.json({ ok: true, resumo });
}
