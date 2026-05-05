import { Store, TrendingUp, Users, CheckCircle2 } from 'lucide-react';

export default function Mundial() {
  return (
    <section id="mundial" className="py-12 bg-gradient-to-b from-amber-50/50 via-white to-amber-50/50 dark:from-black dark:via-gray-900 dark:to-black relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-200/20 dark:from-amber-900/10 via-transparent to-transparent"></div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-8">
          <div className="mb-3 flex justify-center">
            <div className="bg-white p-6 rounded-2xl shadow-2xl shadow-amber-500/20 inline-block">
              <img src="/albumCaja.webp" alt="Álbum y caja Panini Mundial 2026" className="w-56 h-auto" />
            </div>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-700 dark:from-amber-400 dark:to-amber-600">
              Mundial 2026
            </span>
          </h2>
          <p className="text-xl text-slate-600 dark:text-gray-400 max-w-3xl mx-auto mb-4">
            Comercialización Temporal Multicanal B2B
          </p>
          <p className="text-lg text-slate-500 dark:text-gray-500 max-w-4xl mx-auto leading-relaxed">
            Desarrollamos una operación comercial especializada para la temporada del Mundial, enfocada en el desplazamiento masivo de producto a través de una red de socios comerciales con punto de venta
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-white to-amber-50 dark:from-gray-900 dark:to-black border border-amber-200 dark:border-amber-900/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mb-3 flex items-center">
              <TrendingUp className="mr-3" size={28} />
              Nuestra Labor Comercial
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-1" size={20} />
                <p className="text-slate-600 dark:text-gray-400">Prospección y alta de socios comerciales con punto de venta</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-1" size={20} />
                <p className="text-slate-600 dark:text-gray-400">Colocación temporal del producto con enfoque en volumen y rotación rápida</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-1" size={20} />
                <p className="text-slate-600 dark:text-gray-400">Gestión de catálogo estacional de alta demanda</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-1" size={20} />
                <p className="text-slate-600 dark:text-gray-400">Estrategia de cobertura por zonas y densidad comercial</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-1" size={20} />
                <p className="text-slate-600 dark:text-gray-400">Coordinación logística y abastecimiento continuo</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-1" size={20} />
                <p className="text-slate-600 dark:text-gray-400">Seguimiento comercial y reposición constante</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-amber-50 dark:from-gray-900 dark:to-black border border-amber-200 dark:border-amber-900/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mb-3 flex items-center">
              <Store className="mr-3" size={28} />
              Socios Comerciales
            </h3>
            <p className="text-slate-600 dark:text-gray-400 mb-3">
              Buscamos aliados con punto de venta físico y capacidad de atención al público:
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm text-slate-600 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-amber-600 dark:bg-amber-500 rounded-full"></div>
                <span>Tiendas de conveniencia</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-amber-600 dark:bg-amber-500 rounded-full"></div>
                <span>Papelerías</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-amber-600 dark:bg-amber-500 rounded-full"></div>
                <span>Misceláneas</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-amber-600 dark:bg-amber-500 rounded-full"></div>
                <span>Jugueterías</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-amber-600 dark:bg-amber-500 rounded-full"></div>
                <span>Librerías</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-amber-600 dark:bg-amber-500 rounded-full"></div>
                <span>Tiendas de regalos</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-amber-600 dark:bg-amber-500 rounded-full"></div>
                <span>Plazas comerciales</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-amber-600 dark:bg-amber-500 rounded-full"></div>
                <span>Cadenas regionales</span>
              </div>
            </div>
            <div className="bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4 mt-6">
              <p className="text-amber-700 dark:text-amber-400 font-semibold mb-2">Factor Clave:</p>
              <p className="text-sm text-slate-600 dark:text-gray-400">Punto de venta activo + Visibilidad + Intención de rotación por temporada</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/20 dark:to-black border border-amber-300 dark:border-amber-500/30 rounded-2xl p-10 mb-6">
          <h3 className="text-2xl font-bold text-amber-700 dark:text-amber-400 mb-3 text-center">
            Un Modelo de Temporada, Diseñado para Vender
          </h3>
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div className="text-center">
              <div className="bg-gradient-to-br from-amber-400 to-amber-600 w-12 h-12 rounded-lg flex items-center justify-center mb-3 mx-auto">
                <CheckCircle2 className="text-black" size={24} />
              </div>
              <p className="text-slate-600 dark:text-gray-400 text-sm">Integración rápida al punto de venta</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-br from-amber-400 to-amber-600 w-12 h-12 rounded-lg flex items-center justify-center mb-3 mx-auto">
                <CheckCircle2 className="text-black" size={24} />
              </div>
              <p className="text-slate-600 dark:text-gray-400 text-sm">Alta rotación en semanas clave</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-br from-amber-400 to-amber-600 w-12 h-12 rounded-lg flex items-center justify-center mb-3 mx-auto">
                <CheckCircle2 className="text-black" size={24} />
              </div>
              <p className="text-slate-600 dark:text-gray-400 text-sm">Complemento perfecto para compras</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-br from-amber-400 to-amber-600 w-12 h-12 rounded-lg flex items-center justify-center mb-3 mx-auto">
                <CheckCircle2 className="text-black" size={24} />
              </div>
              <p className="text-slate-600 dark:text-gray-400 text-sm">Incremento de ticket promedio</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-br from-amber-400 to-amber-600 w-12 h-12 rounded-lg flex items-center justify-center mb-3 mx-auto">
                <CheckCircle2 className="text-black" size={24} />
              </div>
              <p className="text-slate-600 dark:text-gray-400 text-sm">Alta demanda natural</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-white via-amber-50 to-white dark:from-gray-900 dark:via-black dark:to-gray-900 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-10 text-center">
          <Users className="text-amber-600 dark:text-amber-400 mx-auto mb-3" size={48} />
          <h3 className="text-2xl md:text-3xl font-bold text-amber-700 dark:text-amber-400 mb-4">
            ¿Quieres ser Socio Comercial?
          </h3>
          <p className="text-lg text-slate-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Si cuentas con punto de venta y quieres integrar producto del Mundial por temporada, contáctanos
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:pedidos@avantimexico.com" className="bg-gradient-to-r from-amber-400 to-amber-600 text-black px-8 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-amber-600/50 transition-all">
              pedidos@avantimexico.com
            </a>
            <a href="tel:+525562687285" className="border border-amber-600 dark:border-amber-500 text-amber-700 dark:text-amber-400 px-8 py-3 rounded-lg font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-all">
              +52 55 6268 7285
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
