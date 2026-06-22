import type { AnaliseErro, Pesos } from "../types";

// Memoria de Erros da IA Adaptativa.
// Em vez de reagir so ao ultimo sorteio, a IA olha as ultimas N falhas e
// detecta vieses sistematicos. Ex.: "nas ultimas 50 falhas o peso de tendencia
// estava exagerado" -> reduz tendencia. Isso suaviza o aprendizado e evita
// que um unico concurso atipico desregule os pesos.

export interface ResumoMemoria {
  amostras: number;
  faltaram_altos: number;       // % de falhas em que faltaram altos
  faltaram_baixos: number;
  faltaram_medios: number;
  soma_baixa: number;           // % em que a soma do jogo ficou abaixo
  soma_alta: number;
  excesso_pares: number;
  falta_pares: number;
  atrasados_improdutivos: number; // % em que nenhum atrasado acertou
}

const PASSO = 0.12; // ajuste maximo por dimensao vindo da memoria

// Agrega as analises de erro das ultimas N conferencias.
export function resumirMemoria(analises: AnaliseErro[]): ResumoMemoria {
  const n = analises.length || 1;
  let altos = 0, baixos = 0, medios = 0;
  let somaBaixa = 0, somaAlta = 0, excessoPares = 0, faltaPares = 0, atrasImprod = 0;

  for (const a of analises) {
    if (a.faixa_faltante.includes("altos")) altos++;
    if (a.faixa_faltante.includes("baixos")) baixos++;
    if (a.faixa_faltante.includes("medios")) medios++;
    const dif = a.soma_resultado - a.soma_jogo_media;
    if (dif > 10) somaBaixa++;
    else if (dif < -10) somaAlta++;
    if (a.pares_jogo - a.pares_resultado >= 2) excessoPares++;
    else if (a.pares_resultado - a.pares_jogo >= 2) faltaPares++;
    if (a.atrasados_acertados === 0) atrasImprod++;
  }

  return {
    amostras: analises.length,
    faltaram_altos: altos / n,
    faltaram_baixos: baixos / n,
    faltaram_medios: medios / n,
    soma_baixa: somaBaixa / n,
    soma_alta: somaAlta / n,
    excesso_pares: excessoPares / n,
    falta_pares: faltaPares / n,
    atrasados_improdutivos: atrasImprod / n,
  };
}

// Converte o resumo da memoria num delta de pesos. So age quando o vies e
// consistente (ocorre na maioria das falhas), proporcional a frequencia.
export function ajusteDaMemoria(resumo: ResumoMemoria): Partial<Pesos> {
  if (resumo.amostras < 5) return {}; // memoria curta demais: nao mexe
  const d: Partial<Pesos> = {};
  const forte = (p: number) => (p >= 0.5 ? (p - 0.5) * 2 : 0); // 0.5..1 -> 0..1

  // Faixas faltando de forma recorrente -> reforca distribuicao/cobertura
  const faixa = Math.max(resumo.faltaram_altos, resumo.faltaram_baixos, resumo.faltaram_medios);
  if (forte(faixa) > 0) {
    d.peso_distribuicao = PASSO * forte(faixa);
    d.peso_cobertura = PASSO * forte(faixa) * 0.5;
  }
  // Soma sistematicamente desalinhada -> reforca controle de soma
  const soma = Math.max(resumo.soma_baixa, resumo.soma_alta);
  if (forte(soma) > 0) d.peso_soma = (d.peso_soma ?? 0) + PASSO * forte(soma);

  // Atrasados que quase nunca acertam -> reduz peso de atraso, sobe tendencia
  if (forte(resumo.atrasados_improdutivos) > 0) {
    const f = forte(resumo.atrasados_improdutivos);
    d.peso_atraso = -PASSO * f;
    d.peso_tendencia = (d.peso_tendencia ?? 0) + PASSO * f * 0.7;
  }
  // Desequilibrio par/impar recorrente -> ajusta peso de pares
  if (forte(resumo.excesso_pares) > 0) d.peso_pares = -PASSO * forte(resumo.excesso_pares);
  else if (forte(resumo.falta_pares) > 0) d.peso_pares = PASSO * forte(resumo.falta_pares);

  return d;
}
