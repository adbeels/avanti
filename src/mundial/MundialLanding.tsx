import { useEffect, useState } from 'react';
import MundialHero from './MundialHero';
import { Shield, Package, BookOpen, Star, TrendingUp } from 'lucide-react';
import ZohoForm from './ZohoForm';

export default function MundialLanding() {
  const [prefillName, setPrefillName] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const n = params.get('nombre') ?? params.get('name') ?? '';
    setPrefillName(decodeURIComponent(n));

    document.title = 'Conviértete en distribuidor autorizado | Álbum Copa del Mundo FIFA 2026 - AVANTI';

    const setMeta = (property: string, content: string, isName = false) => {
      const attr = isName ? 'name' : 'property';
      let el = document.querySelector(`meta[${attr}="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('description', 'Conviértete en distribuidor autorizado del Álbum Copa del Mundo FIFA 2026 de Panini en México. Vende el producto más esperado del año con márgenes competitivos. Regístrate con AVANTI hoy.', true);
    setMeta('keywords', 'distribuidor autorizado álbum Copa del Mundo FIFA 2026, álbum Panini Mundial 2026 México, ser distribuidor Panini México, vender álbum Copa del Mundo, AVANTI distribuidor Panini', true);
    setMeta('og:title', 'Conviértete en distribuidor autorizado | Álbum Copa del Mundo FIFA 2026');
    setMeta('og:description', 'Conviértete en distribuidor autorizado del Álbum Copa del Mundo FIFA 2026 de Panini. Mayoreo, retail y canal moderno en México. Regístrate con AVANTI y recibe información de pedidos.');
    setMeta('og:image', 'https://avantimexico.com/mundial_2026.png');
    setMeta('og:url', 'https://avantimexico.com/?distribuidor-album-mundial-2026');
    setMeta('twitter:title', 'Conviértete en distribuidor autorizado | Álbum Copa del Mundo FIFA 2026', true);
    setMeta('twitter:description', 'Distribuidor autorizado del Álbum Copa del Mundo FIFA 2026 de Panini en México. Mayoreo, retail y canal moderno con AVANTI.', true);
    setMeta('twitter:image', 'https://avantimexico.com/mundial_2026.png', true);

    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.id = 'mundial-schema';
    schemaScript.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Álbum Oficial Panini Copa del Mundo FIFA 2026',
      description: 'Álbum coleccionable oficial Panini del Mundial FIFA 2026. Incluye estampas, sobres y ediciones especiales. Disponible para distribuidores, mayoristas y retail en México.',
      brand: { '@type': 'Brand', name: 'Panini' },
      offers: {
        '@type': 'Offer',
        availability: 'https://schema.org/InStock',
        priceCurrency: 'MXN',
        seller: {
          '@type': 'Organization',
          name: 'AVANTI Sales & Operations',
          url: 'https://avantimexico.com',
        },
      },
    });
    const existing = document.getElementById('mundial-schema');
    if (existing) existing.remove();
    document.head.appendChild(schemaScript);

    return () => {
      document.title = 'AVANTI Sales & Operations | Operación Comercial de Marcas Premium en México';
      const mundialSchema = document.getElementById('mundial-schema');
      if (mundialSchema) mundialSchema.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <MundialHero name={prefillName} />

      <section aria-label="Productos Panini Mundial 2026" className="relative bg-black py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(245,158,11,0.05),transparent)]" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />

        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-amber-500 text-xs font-semibold tracking-widest uppercase mb-5">
              <Star size={11} fill="currentColor" />
              Producto oficial Panini
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">
              El álbum del Mundial 2026<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
                ahora disponible con Avanti
              </span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Somos distribuidores del producto Panini más esperado del año. Álbumes y estampas del Mundial FIFA 2026 para que completes tu colección o la uses como herramienta de negocio.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
            <article className="group bg-gray-950 border border-gray-800 hover:border-amber-500/40 rounded-2xl p-8 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5 group-hover:bg-amber-500/20 transition-colors">
                <BookOpen size={22} className="text-amber-400" />
              </div>
              <h3 className="text-white font-bold text-xl mb-3">Álbum oficial Panini</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                El álbum coleccionable oficial del Mundial FIFA 2026. Diseño premium con espacios para todas las selecciones participantes. El infaltable de cada Mundial.
              </p>
            </article>

            <article className="group bg-gray-950 border border-gray-800 hover:border-amber-500/40 rounded-2xl p-8 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5 group-hover:bg-amber-500/20 transition-colors">
                <Star size={22} className="text-amber-400" />
              </div>
              <h3 className="text-white font-bold text-xl mb-3">Estampas y sobres</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Paquetes de sobres con estampas oficiales. Incluye ediciones especiales con estampas doradas y metálicas de los jugadores más destacados del torneo.
              </p>
            </article>

            <article className="group bg-gray-950 border border-gray-800 hover:border-amber-500/40 rounded-2xl p-8 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5 group-hover:bg-amber-500/20 transition-colors">
                <Package size={22} className="text-amber-400" />
              </div>
              <h3 className="text-white font-bold text-xl mb-3">Paquetes para negocio</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Volúmenes para distribuidores, tiendas y puntos de venta. Aprovecha el mayor evento deportivo del planeta para impulsar tus ventas.
              </p>
            </article>

            <article className="group bg-gray-950 border border-gray-800 hover:border-amber-500/40 rounded-2xl p-8 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5 group-hover:bg-amber-500/20 transition-colors">
                <TrendingUp size={22} className="text-amber-400" />
              </div>
              <h3 className="text-white font-bold text-xl mb-3">Oportunidad de temporada</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                El Mundial 2026 se juega en México, EUA y Canadá. Una oportunidad única para conectar con millones de aficionados y hacer crecer tu marca.
              </p>
            </article>
          </div>

          <div className="max-w-3xl mx-auto bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 border border-amber-500/20 rounded-2xl p-8 text-center">
            <img src="/panini_logo.png" alt="Panini - Distribuidor oficial México" className="h-10 mx-auto mb-4 opacity-80" />
            <p className="text-white font-semibold text-lg mb-1">Distribuidor autorizado Panini en México</p>
            <p className="text-gray-400 text-sm">Avanti México Sales &amp; Operations es tu aliado para llevar el producto oficial del Mundial 2026 a tu canal de distribución.</p>
          </div>
        </div>
      </section>

      <section id="fichar" aria-label="Registro de distribuidores Panini Mundial 2026" className="relative bg-black py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(245,158,11,0.06),transparent)]" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-amber-500 text-xs font-semibold tracking-widest uppercase mb-5">
                <Shield size={11} />
                Consigue tu estampa dorada
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
                Regístrate y recibe{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
                  información de pedidos
                </span>
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Déjanos tus datos y un asesor Avanti te contactará para explicarte precios, volúmenes y condiciones de distribución.
              </p>
            </div>

            <div className="bg-gray-950 border border-gray-800 rounded-2xl p-7 md:p-9 shadow-[0_0_80px_rgba(0,0,0,0.8)]">
              <ZohoForm />
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-black border-t border-gray-900 py-8">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <img src="/logo_Fwhite.png" alt="Avanti Sales & Operations" className="h-7 opacity-60" />
          <p className="text-gray-700 text-xs text-center">
            &copy; 2026 Avanti Sales &amp; Operations. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-2 text-gray-700 text-xs">
            <Shield size={11} className="text-amber-500/40" />
            Líderes en operación comercial en México
          </div>
        </div>
      </footer>
    </div>
  );
}
