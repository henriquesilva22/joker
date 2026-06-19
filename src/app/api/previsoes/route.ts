import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Salva uma previsao gerada (apos o usuario decidir guardar os jogos).
export async function POST(req: Request) {
  const sb = createClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const body = await req.json();
  const { error, data } = await sb
    .from("previsoes")
    .insert({
      user_id: auth.user.id,
      loteria_id: body.loteria,
      concurso_previsto: body.concurso_previsto,
      jogos_gerados: body.jogos, // int[][]
      estrategia: body.estrategia,
      objetivo: body.objetivo ?? "principal",
      pesos_usados: body.pesos_usados,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

// Lista as previsoes do usuario (com resultado, se ja conferido).
export async function GET() {
  const sb = createClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const { data, error } = await sb
    .from("previsoes")
    .select("*, resultados_previsoes(*)")
    .order("criado_em", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ previsoes: data });
}
