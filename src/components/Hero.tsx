interface HeroProps {
  theme: 'light' | 'dark';
}

export default function Hero({ theme }: HeroProps) {
  return (
    <section id="inicio" aria-label="Inicio" className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 via-white to-amber-50/50 dark:from-black dark:via-gray-900 dark:to-black overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-200/30 dark:from-amber-900/20 via-transparent to-transparent"></div>

      <div className="container mx-auto px-6 py-16 relative z-10">
        <div className="text-center max-w-5xl mx-auto">
          <div className="mb-4 animate-fade-in">
            <img
              key={theme}
              src={theme === 'dark' ? '/logo_Fwhite.png' : '/avanti_conjunto.png'}
              alt="Avanti México, Sales & Operation - Operación comercial multicanal en México"
              className="w-full max-w-xl mx-auto mb-4"
              width="576"
              height="160"
              fetchPriority="high"
            />
            <div className="h-1 w-32 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto mt-3"></div>
          </div>

          <div className="max-w-4xl mx-auto mt-8 bg-gradient-to-br from-white to-amber-50 dark:from-gray-900 dark:to-black border border-amber-200 dark:border-amber-900/30 p-10 md:p-12 rounded-2xl hover:border-amber-400 dark:hover:border-amber-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/20 dark:hover:shadow-amber-900/20">
            <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-700 dark:from-amber-400 dark:to-amber-600 mb-4">
              Operación Comercial de Marcas Premium en México
            </h1>
            <p className="text-lg md:text-xl text-slate-700 dark:text-gray-300 leading-relaxed mb-3">
              Operamos el crecimiento comercial de marcas premium en México a través de una estructura integral enfocada en <strong className="text-amber-600 dark:text-amber-400">ventas, ejecución por canal y operación diaria</strong>.
            </p>
            <p className="text-lg md:text-xl text-slate-600 dark:text-gray-400 leading-relaxed">
              No solo distribuimos: gestionamos desempeño comercial, asegurando presencia, rotación, consistencia operativa y <strong className="text-amber-600 dark:text-amber-400">resultados medibles</strong>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
