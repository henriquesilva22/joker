import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLoteria } from "@/lib/lotteries";
import { contarAcertos, PREMIA_A_PARTIR_DE } from "@/lib/stats/check";
import type { LoteriaId } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

// Verifica se o usuario logado e admin (consulta admin_users com a sessao dele).
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

// Premiacao: Lotomania paga em 0 ou 15-20; demais a partir do limite da tabela.
function ganhouPremio(loteriaId: LoteriaId, acertos: number): boolean {
  if (loteriaId === "lotomania") return acertos === 0 || acertos >= 15;
  const min = PREMIA_A_PARTIR_DE[loteriaId] ?? 999;
  return acertos >= min;
}

// GET: a tela usa para saber se mostra o formulario ou "Acesso negado".
export async function GET() {
  const { user, admin } = await checarAdmin();
  if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  if (!admin) return NextResponse.json({ admin: false }, { status: 403 });
  return NextResponse.json({ admin: true });
}

// POST: cadastra o resultado (somente admin) e confere as previsoes salvas.
export async function POST(req: Request) {
  const { user, admin } = await checarAdmin();
  if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  if (!admin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  try {
    const body = await req.json();
    const loteriaId = body.loteria as LoteriaId;

    let loteria;
    try {
      loteria = getLoteria(loteriaId);
    } catch {
      return NextResponse.json({ error: "Loteria invalida." }, { status: 400 });
    }

    const numeroConcurso = Number(body.numero_concurso);
    const dataSorteio = String(body.data_sorteio ?? "");
    const numeros: number[] = Array.isArray(body.numeros_sorteados)
      ? body.numeros_sorteados.map((n: unknown) => Number(n))
      : [];

    // ----- Validacao -----
    if (!Number.isInteger(numeroConcurso) || numeroConcurso <= 0) {
      return NextResponse.json({ error: "Numero do concurso invalido." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataSorteio)) {
      return NextResponse.json({ error: "Data do sorteio invalida." }, { status: 400 });
    }
    if (numeros.length !== loteria.qtd_sorteada) {
      return NextResponse.json(
        { error: `${loteria.nome} exige ${loteria.qtd_sorteada} numeros sorteados.` },
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

    const sorteados = [...numeros].sort((a, b) => a - b);

    // service role: escreve concursos e resultados (ignora RLS, ja validado admin)
    const adminSb = createAdminClient();

    // ----- Salva o concurso (upsert para permitir correcao) -----
    const { error: e1 } = await adminSb.from("concursos").upsert(
      {
        loteria_id: loteriaId,
        numero_concurso: numeroConcurso,
        data_sorteio: dataSorteio,
        numeros_sorteados: sorteados,
      },
      { onConflict: "loteria_id,numero_concurso" },
    );
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

    // ----- Busca previsoes salvas da mesma loteria e concurso -----
    const { data: previsoes, error: e2 } = await adminSb
      .from("previsoes")
      .select("id, user_id, jogos_gerados")
      .eq("loteria_id", loteriaId)
      .eq("concurso_previsto", numeroConcurso);
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

    let jogosPremiados = 0;
    let melhorAcertoGeral = 0;
    const ganhadores: {
      user_id: string;
      email?: string;
      jogo: number[];
      acertos: number;
      numeros_acertados: number[];
    }[] = [];

    for (const prev of previsoes ?? []) {
      const jogos = prev.jogos_gerados as number[][];
      const acertosPorJogo: number[] = [];
      const detalhesJogos = jogos.map((jogo) => {
        const numerosAcertados = jogo
          .filter((n) => sorteados.includes(n))
          .sort((a, b) => a - b);
        const acertos = numerosAcertados.length;
        const ganhou = ganhouPremio(loteriaId, acertos);
        acertosPorJogo.push(acertos);
        melhorAcertoGeral = Math.max(melhorAcertoGeral, acertos);
        if (ganhou) {
          jogosPremiados++;
          ganhadores.push({
            user_id: prev.user_id,
            jogo,
            acertos,
            numeros_acertados: numerosAcertados,
          });
        }
        return { jogo, acertos, numeros_acertados: numerosAcertados, ganhou };
      });

      const melhorAcerto = acertosPorJogo.length ? Math.max(...acertosPorJogo) : 0;
      const ganhou = detalhesJogos.some((d) => d.ganhou);

      await adminSb.from("resultados_previsoes").upsert(
        {
          previsao_id: prev.id,
          resultado_real: sorteados,
          acertos_por_jogo: acertosPorJogo,
          melhor_acerto: melhorAcerto,
          ganhou,
          detalhes_jogos: detalhesJogos,
        },
        { onConflict: "previsao_id" },
      );
    }

    // ----- Best-effort: emails dos ganhadores (so para exibir) -----
    const idsUnicos = [...new Set(ganhadores.map((g) => g.user_id))];
    const emails = new Map<string, string>();
    for (const id of idsUnicos) {
      try {
        const { data } = await adminSb.auth.admin.getUserById(id);
        if (data.user?.email) emails.set(id, data.user.email);
      } catch {
        /* ignora */
      }
    }
    for (const g of ganhadores) g.email = emails.get(g.user_id);

    return NextResponse.json({
      ok: true,
      concurso: numeroConcurso,
      loteria: loteriaId,
      loteria_nome: loteria.nome,
      numeros_sorteados: sorteados,
      previsoes_conferidas: previsoes?.length ?? 0,
      jogos_premiados: jogosPremiados,
      melhor_acerto: melhorAcertoGeral,
      ganhadores,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Erro" }, { status: 500 });
  }
}
