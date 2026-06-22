# Filosofia do SorteIA

A maioria dos sistemas de loteria comete um erro fundamental: assume que números
que saíram muito no passado possuem maior chance de sair novamente no futuro.

Estatisticamente isso não é verdade.

Cada sorteio é independente. O fato de um número ter aparecido muitas vezes não
garante que ele aparecerá novamente, assim como um número atrasado não é obrigado
a sair.

Por isso o SorteIA **não** tenta descobrir "os números que vão sair".

O objetivo do sistema é diferente:

> Maximizar a qualidade estatística dos jogos gerados e aumentar a cobertura dos
> cenários possíveis.

## Como o SorteIA funciona

O sistema utiliza múltiplos fatores para avaliar cada número:

- Frequência histórica
- Frequência recente
- Atraso
- Tendência
- Pares fortes
- Trios fortes
- Distribuição do volante
- Soma dos números
- Relação entre pares e ímpares
- Repetição de concursos anteriores

Cada fator recebe um peso e participa da composição de um **Score Final**.

Esse Score **não** representa a chance real de um número ser sorteado. Ele
representa apenas o quanto aquele número se encaixa nos padrões históricos
observados.

## O problema dos padrões

Um erro comum seria selecionar apenas os números mais fortes.

Exemplo: `01, 04, 06, 09, 10, 12, 14, 15, 17, 20, 21, 22, 23, 24, 25`

Apesar de parecer um excelente jogo, ele está extremamente concentrado em um único
cenário estatístico. Se o próximo concurso fugir desse padrão, o jogo terá baixo
desempenho.

## Estratégia de Cenários

Para resolver isso, o SorteIA trabalha com múltiplos cenários.

### Perfil Conservador
Prioriza: Frequência, Tendência, Pares fortes.
Objetivo: apostar nos padrões mais recorrentes.

### Perfil Equilibrado
Mistura: números fortes, médios e atrasados.
Objetivo: equilibrar risco e retorno.

### Perfil Agressivo
Prioriza: números atrasados, combinações raras, baixa popularidade histórica.
Objetivo: capturar eventos improváveis.

## Validação Histórica

Todo jogo gerado é comparado com os concursos já existentes. O sistema mede:

- Média de acertos
- Melhor resultado histórico
- Quantidade de concursos premiados
- Frequência de 11, 12, 13, 14 e 15 pontos

Assim é possível avaliar se o jogo possui qualidade estatística superior à média.

## Diversidade

Não basta gerar vários jogos — eles precisam ser diferentes entre si.

Exemplo ruim:

- Jogo A: `01 02 03 04 05 ...`
- Jogo B: `01 02 03 04 06 ...`

Os dois estão praticamente apostando no mesmo cenário. O SorteIA mede a
**sobreposição** entre jogos e busca maximizar a cobertura do espaço de
possibilidades.

## Aprendizado

O sistema registra: estratégia utilizada, pesos aplicados, quantidade de acertos e
resultado do backtest. Com o tempo, as estratégias com melhor desempenho histórico
recebem maior prioridade.

## Objetivo Final

O SorteIA não promete prever sorteios. O objetivo é usar estatística, validação
histórica, diversidade e aprendizado para gerar jogos mais consistentes do que
escolhas aleatórias ou baseadas apenas em frequência.

A meta não é encontrar números mágicos. A meta é construir a melhor estratégia
possível dentro das informações disponíveis.

---

## Mapa filosofia → código

| Conceito | Onde está | Status |
|---|---|---|
| Score multifator com pesos | [src/lib/stats/generate.ts](../src/lib/stats/generate.ts), [features.ts](../src/lib/stats/features.ts) | ✅ |
| Frequência, atraso, tendência, pares, trios | [features.ts](../src/lib/stats/features.ts) | ✅ |
| Distribuição do volante / soma / pares-ímpares | `cotasPorFaixa`, `ajustarSoma` em [generate.ts](../src/lib/stats/generate.ts) | ✅ |
| Perfis Conservador / Equilibrado / Agressivo | `PERFIL_ESTRATEGIA` em [lotteries.ts](../src/lib/lotteries.ts) | ✅ |
| Validação histórica (média, melhor, premiados, faixas 11-15) | [backtest.ts](../src/lib/stats/backtest.ts) | ✅ |
| Aprendizado por desempenho | [learn.ts](../src/lib/stats/learn.ts) (`pesosAdaptativos`) | ✅ |
| Cobertura entre jogos (penaliza repetição) | `fatorCobertura` em [generate.ts](../src/lib/stats/generate.ts) | ⚠️ parcial |
| **Diversidade**: medir sobreposição e maximizar cobertura | — | ❌ falta métrica explícita |
| Frequência recente como fator separado da histórica | hoje unificadas | ❌ |
| Repetição de concurso anterior como fator | — | ❌ |
