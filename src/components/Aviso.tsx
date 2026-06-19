// Aviso obrigatorio: deixa claro que loteria e aleatoria. Presente em todo o app.
export function Aviso({ compacto = false }: { compacto?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 ${
        compacto ? "px-3 py-2 text-xs" : "p-3 text-sm"
      }`}
    >
      ⚠️ Loteria e <strong>100% aleatoria</strong>. O SorteIA usa estatistica e
      aprendizado para montar estrategias — <strong>nao ha garantia de premio</strong>.
      Jogue com responsabilidade.
    </div>
  );
}
