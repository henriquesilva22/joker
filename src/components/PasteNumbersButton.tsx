"use client";

import { useState } from "react";
import { validarColagem } from "@/lib/parseNumbers";

interface Props {
  min: number;
  max: number;
  esperado: number; // quantidade esperada na tela atual
  onApply: (numeros: number[]) => void;
  label?: string;
}

const PLACEHOLDER = `Cole os numeros aqui. Ex:
03, 05, 06, 09, 11, 12, 14, 16, 18, 20, 21, 22, 23, 24, 25
03 05 06 09 11
03-05-06-09-11
03 -> 05 -> 06 -> 09 -> 11`;

// Botao discreto "Colar" + modal com textarea. Reutilizavel em qualquer
// selecao manual de dezenas (Conferidor, Admin, etc.).
export function PasteNumbersButton({ min, max, esperado, onApply, label = "Colar" }: Props) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");

  function fechar() {
    setAberto(false);
    setTexto("");
    setErro("");
  }

  function aplicar() {
    const { numeros, erro } = validarColagem(texto, { min, max, esperado });
    if (erro) {
      setErro(erro);
      return;
    }
    onApply(numeros);
    fechar();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-md bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-white/10"
      >
        📋 {label}
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={fechar}
        >
          <div
            className="w-full max-w-sm space-y-3 rounded-2xl bg-ink-soft p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold">Colar numeros</p>
            <textarea
              autoFocus
              rows={5}
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setErro("");
              }}
              placeholder={PLACEHOLDER}
              className="w-full resize-none rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-brand"
            />
            {erro && <p className="text-xs text-red-400">{erro}</p>}
            <div className="flex gap-2">
              <button onClick={fechar} className="btn-ghost flex-1 text-sm">
                Cancelar
              </button>
              <button onClick={aplicar} className="btn-primary flex-1 text-sm">
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
