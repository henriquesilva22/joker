import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLoteria } from "@/lib/lotteries";
import type { LoteriaId } from "@/lib/types";

export const runtime = "nodejs";

async function checarAdmin() {
  const sb = createClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return { user: null, admin: false };
  const { data } = await sb
    .from("admin_users")
    .select("id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  return { user: auth.user, admin: Boolean(data) };
}

// GET: lista os proximos concursos cadastrados (um por loteria).
export async function GET() {
  const { user, admin } = await checarAdmin();
  if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  if (!admin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const sb = createAdminClient();
  const { data, error } = await sb.from("proximos_concursos").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ proximos: data ?? [] });
}

// POST: cadastra/atualiza o proximo concurso de uma loteria (somente admin).
export async function POST(req: Request) {
  const { user, admin } = await checarAdmin();
  if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  if (!admin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  try {
    const body = await req.json();
    const loteriaId = body.loteria as LoteriaId;
    try {
      getLoteria(loteriaId);
    } catch {
      return NextResponse.json({ error: "Loteria invalida." }, { status: 400 });
    }

    const numero = Number(body.numero_concurso);
    if (!Number.isInteger(numero) || numero <= 0) {
      return NextResponse.json({ error: "Numero do concurso invalido." }, { status: 400 });
    }
    const data = body.data_sorteio && /^\d{4}-\d{2}-\d{2}$/.test(body.data_sorteio)
      ? body.data_sorteio
      : null;
    const premio =
      body.premio_estimado === "" || body.premio_estimado == null
        ? null
        : Number(body.premio_estimado);
    if (premio !== null && (!Number.isFinite(premio) || premio < 0)) {
      return NextResponse.json({ error: "Premio estimado invalido." }, { status: 400 });
    }

    const sb = createAdminClient();
    const { data: row, error } = await sb
      .from("proximos_concursos")
      .upsert(
        {
          loteria_id: loteriaId,
          numero_concurso: numero,
          data_sorteio: data,
          premio_estimado: premio,
          criado_em: new Date().toISOString(),
        },
        { onConflict: "loteria_id" },
      )
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, proximo: row });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Erro" }, { status: 500 });
  }
}
