interface BolasProps {
  numeros: number[];
  acertos?: number[]; // numeros que bateram com o resultado real
  tamanho?: "sm" | "md";
}

// Renderiza as dezenas de um jogo como bolinhas; destaca acertos em verde.
export function Bolas({ numeros, acertos = [], tamanho = "md" }: BolasProps) {
  const setAcertos = new Set(acertos);
  return (
    <div className="flex flex-wrap gap-1.5">
      {numeros.map((n) => {
        const acertou = setAcertos.has(n);
        return (
          <span
            key={n}
            className={`bola ${tamanho === "sm" ? "h-7 w-7 text-xs" : ""} ${
              acertou
                ? "bg-brand text-white ring-2 ring-brand-light"
                : "bg-white/10 text-slate-200"
            }`}
          >
            {String(n).padStart(2, "0")}
          </span>
        );
      })}
    </div>
  );
}
