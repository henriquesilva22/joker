import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { carregarPesos, salvarPesos } from "@/lib/data";
import { PESOS_PADRAO } from "@/lib/lotteries";
import type { LoteriaId } from "@/lib/types";

export const runtime = "nodejs";

// Le os pesos atuais da IA (do usuario ou globais).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const loteria = (searchParams.get("loteria") ?? "megasena") as LoteriaId;
  const sb = createClient();
  const { data: auth } = await sb.auth.getUser();
  const pesos = await carregarPesos(sb, loteria, auth.user?.id ?? null);
  return NextResponse.json({ loteria, pesos });
}

// Reseta os pesos do usuario para o padrao.
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const loteria = (searchParams.get("loteria") ?? "megasena") as LoteriaId;
  const sb = createClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  await salvarPesos(sb, loteria, auth.user.id, { ...PESOS_PADRAO });
  return NextResponse.json({ loteria, pesos: PESOS_PADRAO });
}
