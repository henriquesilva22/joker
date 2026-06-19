"use client";

import { LISTA_LOTERIAS } from "@/lib/lotteries";
import type { LoteriaId } from "@/lib/types";

interface Props {
  valor: LoteriaId;
  onChange: (id: LoteriaId) => void;
}

export function LoteriaSelect({ valor, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {LISTA_LOTERIAS.map((l) => (
        <button
          key={l.id}
          onClick={() => onChange(l.id)}
          className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
            valor === l.id
              ? "bg-brand text-white"
              : "bg-white/5 text-slate-300 hover:bg-white/10"
          }`}
        >
          {l.nome}
        </button>
      ))}
    </div>
  );
}
