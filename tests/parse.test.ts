import { describe, it, expect } from "vitest";
import { parseNumeros, validarColagem } from "../src/lib/parseNumbers";

describe("parseNumeros", () => {
  const esperado = [3, 5, 6, 9, 11];
  const exemplos = [
    "03, 05, 06, 09, 11",
    "03 05 06 09 11",
    "03-05-06-09-11",
    "03 -> 05 -> 06 -> 09 -> 11",
    "03 → 05 → 06 → 09 → 11",
    "03\n05\n06\n09\n11",
    "03.05.06\t09 / 11",
  ];

  for (const ex of exemplos) {
    it(`ignora separadores: ${JSON.stringify(ex)}`, () => {
      expect(parseNumeros(ex)).toEqual(esperado);
    });
  }

  it("remove duplicados e ordena", () => {
    expect(parseNumeros("11, 05, 03, 05, 09, 06, 11")).toEqual(esperado);
  });

  it("converte zero a esquerda", () => {
    expect(parseNumeros("03, 09")).toEqual([3, 9]);
  });
});

describe("validarColagem", () => {
  it("aceita quantidade exata dentro da faixa", () => {
    const r = validarColagem("3,5,6,9,11", { min: 1, max: 25, esperado: 5 });
    expect(r.erro).toBeUndefined();
    expect(r.numeros).toEqual([3, 5, 6, 9, 11]);
  });
  it("erro fora do intervalo", () => {
    const r = validarColagem("3,5,99", { min: 1, max: 25, esperado: 3 });
    expect(r.erro).toMatch(/fora do intervalo/i);
  });
  it("erro faltando numeros", () => {
    const r = validarColagem("3,5", { min: 1, max: 25, esperado: 5 });
    expect(r.erro).toMatch(/Selecione mais 3/);
  });
  it("erro passando do limite", () => {
    const r = validarColagem("1,2,3,4,5,6", { min: 1, max: 25, esperado: 5 });
    expect(r.erro).toMatch(/limite para esta aposta e 5/);
  });
});
