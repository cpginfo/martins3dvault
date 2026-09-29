import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-surface-container-lowest p-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-surface-container/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/10 text-center flex flex-col items-center gap-4 z-10">
        <div className="w-16 h-16 rounded-2xl bg-primary-container/20 border border-primary-container/40 text-primary flex items-center justify-center shadow-lg shadow-primary-container/20">
          <span className="material-symbols-outlined text-[36px]">view_in_ar_off</span>
        </div>

        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary-container bg-primary-container/15 px-2.5 py-1 rounded-full border border-primary-container/25">
            Erro 404 • Modelo Não Encontrado
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface mt-2.5">
            Caminho Inexistente no Cofre
          </h1>
          <p className="text-xs text-on-surface-variant mt-1.5 max-w-xs mx-auto">
            O arquivo, coleção ou rota que você tentou acessar não foi localizada no repositório do Martins3DVault.
          </p>
        </div>

        <Link
          href="/"
          className="mt-2 inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] rounded-xl bg-primary-container text-on-primary font-bold text-xs hover:bg-primary transition-all shadow-[0_0_16px_rgba(249,115,22,0.35)] active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">home</span>
          <span>Retornar ao Cofre 3D</span>
        </Link>
      </div>
    </div>
  );
}
