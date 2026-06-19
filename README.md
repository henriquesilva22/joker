# SorteIA 🎲

PWA (mobile + web) de **previsão estatística** de loterias brasileiras com IA que
gera jogos, confere com o resultado real e **aprende com os erros** ajustando seus
próprios pesos.

> ⚠️ **Loteria é 100% aleatória.** O SorteIA usa estatística e aprendizado para
> montar estratégias — **não há garantia de prêmio**. Jogue com responsabilidade.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + PWA instalável (`next-pwa`)
- **Supabase** (Postgres + Auth + RLS)
- **Recharts** (gráficos de pesos)
- Explicações da IA geradas **localmente** a partir do diagnóstico estatístico (sem API externa)
- **Vercel** + Cron Job (atualização automática de resultados)

## Loterias suportadas

Mega-Sena, Lotofácil, Lotomania, Quina, Dupla Sena e Timemania
(configuração em [`src/lib/lotteries.ts`](src/lib/lotteries.ts)).

## Arquitetura

```
src/
├─ app/
│  ├─ page.tsx                  # Dashboard
│  ├─ gerar/                    # Gerar previsões
│  ├─ jogos/                    # Meus jogos + conferir + análise pós-sorteio
│  ├─ backtesting/              # Backtesting + ranking de estratégias
│  ├─ config/                   # Configurações da IA (pesos aprendidos)
│  ├─ login/                    # Auth (magic link)
│  └─ api/
│     ├─ gerar/                 # POST  gera jogos
│     ├─ previsoes/             # GET/POST  lista/salva previsões
│     ├─ conferir/              # POST  confere + aprende + ajusta pesos + explica
│     ├─ backtest/              # POST  backtest walk-forward
│     ├─ pesos/                 # GET/DELETE  lê/reseta pesos da IA
│     ├─ importar/              # POST  backfill de histórico (Caixa)
│     └─ cron/atualizar-resultados/  # GET  cron diário
├─ components/                  # BottomNav, Bolas, Aviso, LoteriaSelect, PesosRadar
└─ lib/
   ├─ lotteries.ts              # config das loterias + perfis de estratégia
   ├─ types.ts                  # tipos centrais
   ├─ caixa.ts                  # fetch da API pública da Caixa
   ├─ claude.ts                 # explicação da IA
   ├─ data.ts                   # acesso a dados (concursos/pesos)
   ├─ supabase/                 # clients (browser/server/admin)
   └─ stats/                    # 🧠 MOTOR ESTATÍSTICO
      ├─ features.ts            # frequência, atraso, tendência, pares, trios, soma, distribuição
      ├─ generate.ts            # scoring + geração (cotas por faixa, soma, cobertura)
      ├─ check.ts               # conferência + diagnóstico do erro
      ├─ learn.ts               # ajuste adaptativo de pesos (clamp + learning rate)
      ├─ backtest.ts            # walk-forward + lucro simulado + ranking
      ├─ probability.ts         # chance matemática (binomial/hipergeométrica)
      └─ rng.ts                 # PRNG determinístico (backtests reproduzíveis)
```

## Como a IA gera os jogos

Cada número recebe um `score` combinando 8 sinais normalizados em [0,1], cada um
com seu peso:

```
score(n) = pf·frequência + pa·atraso + pt·tendência + pp·força_em_pares + ptr·força_em_trios
```

A montagem do jogo aplica ainda **distribuição por faixa** (baixos/médios/altos),
**soma próxima da média histórica** e **cobertura** (evita repetir números entre
os jogos). Modos: `conservador`, `equilibrado`, `agressivo` e `IA adaptativa`.

## Aprendizado pós-sorteio

Ao conferir (`/api/conferir`): conta acertos → diagnostica o erro (faixas
faltantes, soma, pares, atrasados vs frequentes) → gera um **delta de pesos** →
aplica com taxa de aprendizado e clamp `[0.1, 3.0]` → salva → um gerador local
([`src/lib/explicacao.ts`](src/lib/explicacao.ts)) escreve a explicação em
linguagem natural. A próxima geração já usa os pesos calibrados.

## Setup

### 1. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` e `CRON_SECRET`.

### 2. Banco

No SQL Editor do Supabase, rode [`supabase/schema.sql`](supabase/schema.sql)
(cria tabelas, RLS, faz o seed das loterias e dos pesos padrão).

### 3. Instalar e rodar

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # checagem de tipos
npm test           # testes do motor (Vitest)
npm run build      # build de produção
```

### 4. Importar histórico (≥ 600 concursos)

Com o servidor no ar, dispare o backfill (protegido por `CRON_SECRET`):

```bash
curl -X POST http://localhost:3000/api/importar \
  -H "Authorization: Bearer SEU_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"loteria":"megasena","quantidade":600}'
```

## Deploy (Vercel)

1. Importe o repositório na Vercel e configure as mesmas variáveis de ambiente.
2. O [`vercel.json`](vercel.json) já registra o cron diário
   (`/api/cron/atualizar-resultados`) que busca os últimos resultados na Caixa.
3. No Supabase Auth, adicione a URL de produção em **Redirect URLs**.

## PWA

`manifest.json` e o service worker (gerado pelo `next-pwa` no build de produção)
deixam o app instalável. Adicione seus ícones em `public/icons/icon-192.png` e
`public/icons/icon-512.png`.

## Testes

[`tests/engine.test.ts`](tests/engine.test.ts) cobre probabilidade (valida a
Mega-Sena em **1 em 50.063.860**), geração (quantidade/dezenas/determinismo),
conferência e clamp do aprendizado.
