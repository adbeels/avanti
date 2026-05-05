import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import BrandModal from './BrandModal';

interface Brand {
  name: string;
  channel: string;
  description: string;
  benefits: string[];
  details: string;
  icon?: string;
  image?: string;
  cardImage?: string;
}

const brandDetails: { [key: string]: Brand } = {
  'Lindt & Sprüngli': {
    name: 'Lindt & Sprüngli',
    channel: 'Canal HORECA',
    description: 'En AVANTI operamos el canal HORECA para Lindt & Sprüngli, desarrollando y gestionando la presencia de la marca en hoteles, restaurantes y cafeterías de alto nivel en México.',
    benefits: [
      'Marca premium reconocida mundialmente',
      'Alta rotación en establecimientos de calidad',
      'Soporte completo en prospección y ventas',
      'Capacitación y material de apoyo comercial',
      'Producto de alta calidad y presentación',
      'Márgenes competitivos en el segmento premium'
    ],
    details: 'Trabajamos de cerca con cada punto de venta HORECA, brindando seguimiento comercial constante, planeación de surtido personalizada y coordinación logística eficiente. Nuestro objetivo es posicionar Lindt como la opción premium en chocolates finos para el canal profesional.',
    icon: '/logo_lindt.png',
    image: '/lindt-pick-and-mix-2.jpg'
  },
  'Panini': {
    name: 'Panini',
    channel: 'Retail Propio',
    description: 'Somos parte del modelo de negocio Panini Point con tiendas físicas que desplazan mensualmente cientos de productos de todo el catálogo de Editorial Panini, contamos con autorización para ventas B2B en canales naturales de venta, fortaleciendo así el músculo comercial de la marca por medio de atención operativa y multicanal.',
    benefits: [
      'Líder mundial en coleccionables deportivos',
      'Demanda constante en temporadas clave',
      'Producto con alta rotación y ticket promedio',
      'Soporte integral en operación de punto de venta',
      'Campañas promocionales y material POP',
      'Oportunidades en eventos deportivos globales'
    ],
    details: 'Gestión integral: desde la selección de producto, integración al punto de venta, estrategias de merchandising, hasta la ejecución diaria de ventas. Manejamos campañas especiales vinculadas a eventos deportivos como el Mundial de Fútbol.',
    icon: '/panini_logo.png',
    cardImage: '/imagen_panini.jpeg'
  },
  'Palinal': {
    name: 'Palinal',
    channel: 'Canal Especializado',
    description: 'AVANTI importa y comercializa la marca Palinal especializada en el segmento de re pintado automotriz o “refinished”. Contamos con un amplio catálogo de productos, todo un sistema de manufactura y calidad italiana al servicio de los talleres especializados en México, contamos con homologación por parte de CESVI lo que nos avala como un buen socio comercial para nuestros clientes.',
    benefits: [
      'Acceso a un canal especializado en crecimiento',
      'Productos técnicos de alta calidad',
      'Red establecida de talleres especializados',
      'Soporte en gestión comercial y seguimiento',
      'Logística coordinada y entregas eficientes',
      'Oportunidad en mercado de reposición automotriz'
    ],
    details: 'Buscamos Macro Distribuidores a lo largo de la República Mexicana, contamos con la calidad y especificaciones para competir con las marcas líderes actuales, brindamos soporte y capacitación a nuestros distribuidores, así como apoyo para competir ampliamente en el mercado.',
    icon: '/logo_palinal.png',
    image: '/a2j5zv_multicryl-900.png',
    cardImage: '/a2j5zv_multicryl-900.png'
  }
};

export default function Brands() {
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleBrandClick = (brandName: string) => {
    setSelectedBrand(brandDetails[brandName]);
    setIsModalOpen(true);
  };

  const handleDistributorClick = (brandName: string) => {
    const contactSection = document.getElementById('contacto');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="marcas" aria-label="Marcas que operamos" className="py-12 bg-gradient-to-b from-white via-amber-50/30 to-white dark:from-black dark:via-gray-950 dark:to-black">
      <div className="container mx-auto px-6">
        <div className="text-center mb-8">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-700 dark:from-amber-400 dark:to-amber-600">
              Nuestras Marcas
            </span>
          </h2>
          <p className="text-xl text-slate-600 dark:text-gray-400 max-w-4xl mx-auto leading-relaxed">
            En Avanti México, Sales & Operation operamos el crecimiento comercial de marcas premium en México — Lindt &amp; Sprüngli, Panini y Palinal — a través de una estructura integral enfocada en ventas, ejecución por canal y operación diaria
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          <article
            onClick={() => handleBrandClick('Lindt & Sprüngli')}
            aria-label="Lindt & Sprüngli - Canal HORECA"
            className="bg-gradient-to-br from-white to-amber-50 dark:from-gray-900 dark:to-black border border-amber-200 dark:border-amber-900/30 rounded-2xl p-8 hover:border-amber-400 dark:hover:border-amber-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/20 dark:hover:shadow-amber-900/20 cursor-pointer transform hover:scale-105"
          >
            <div className="mb-6">
              <img src="/logo_lindt.png" alt="Lindt & Sprüngli - Distribuidor HORECA en México" className="h-20 w-auto" />
            </div>
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mb-2">Lindt & Sprüngli</h3>
            <p className="text-slate-500 dark:text-gray-500 mb-6 font-semibold">Canal HORECA</p>

            <div className="space-y-4 mb-6">
              <div className="flex items-start space-x-3">
                <CheckCircle className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-1" size={20} />
                <p className="text-slate-600 dark:text-gray-400">Desarrollo y gestión del canal HORECA</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-1" size={20} />
                <p className="text-slate-600 dark:text-gray-400">Prospección y generación de nuevos puntos de venta</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-1" size={20} />
                <p className="text-slate-600 dark:text-gray-400">Gestión comercial y seguimiento de clientes activos</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-1" size={20} />
                <p className="text-slate-600 dark:text-gray-400">Planeación de surtido por cliente</p>
              </div>
            </div>

            <div className="bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">Objetivo:</p>
              <p className="text-sm text-slate-600 dark:text-gray-400">Aumentar el desplazamiento del producto en el canal profesional con control comercial y crecimiento sostenido</p>
            </div>
          </article>

          <article
            onClick={() => handleBrandClick('Panini')}
            aria-label="Panini - Retail Propio"
            className="bg-gradient-to-br from-white to-amber-50 dark:from-gray-900 dark:to-black border border-amber-200 dark:border-amber-900/30 rounded-2xl p-8 hover:border-amber-400 dark:hover:border-amber-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/20 dark:hover:shadow-amber-900/20 cursor-pointer transform hover:scale-105"
          >
            <div className="mb-6">
              <img src="/panini_logo.png" alt="Panini - Álbumes y estampas Mundial 2026" className="h-20 w-auto" />
            </div>
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mb-2">Panini</h3>
            <p className="text-slate-500 dark:text-gray-500 mb-6 font-semibold">Retail Propio</p>

            <div className="space-y-4 mb-6">
              <div className="flex items-start space-x-3">
                <CheckCircle className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-1" size={20} />
                <p className="text-slate-600 dark:text-gray-400">Operación total de tiendas físicas</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-1" size={20} />
                <p className="text-slate-600 dark:text-gray-400">Gestión integral del punto de venta</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-1" size={20} />
                <p className="text-slate-600 dark:text-gray-400">Estrategias de activación comercial</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-1" size={20} />
                <p className="text-slate-600 dark:text-gray-400">Campañas de alto volumen</p>
              </div>
            </div>

            <div className="bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">Objetivo:</p>
              <p className="text-sm text-slate-600 dark:text-gray-400">Ejecutar ventas diarias con operación completa y alto desempeño comercial en retail</p>
            </div>
          </article>

          <article
            onClick={() => handleBrandClick('Palinal')}
            aria-label="Palinal - Canal Especializado Automotriz"
            className="bg-gradient-to-br from-white to-amber-50 dark:from-gray-900 dark:to-black border border-amber-200 dark:border-amber-900/30 rounded-2xl p-8 hover:border-amber-400 dark:hover:border-amber-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/20 dark:hover:shadow-amber-900/20 cursor-pointer transform hover:scale-105"
          >
            <div className="mb-6">
              <img src="/logo_palinal.png" alt="Palinal - Pinturas automotrices para talleres en México" className="h-20 w-auto" />
            </div>
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mb-2">Palinal</h3>
            <p className="text-slate-500 dark:text-gray-500 mb-6 font-semibold">Canal Especializado</p>

            <div className="space-y-4 mb-6">
              <div className="flex items-start space-x-3">
                <CheckCircle className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-1" size={20} />
                <p className="text-slate-600 dark:text-gray-400">Comercialización en talleres especializados</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-1" size={20} />
                <p className="text-slate-600 dark:text-gray-400">Prospección de nuevos talleres</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-1" size={20} />
                <p className="text-slate-600 dark:text-gray-400">Gestión de relaciones comerciales</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-1" size={20} />
                <p className="text-slate-600 dark:text-gray-400">Coordinación logística y entregas</p>
              </div>
            </div>

            <div className="bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">Objetivo:</p>
              <p className="text-sm text-slate-600 dark:text-gray-400">Expandir el desplazamiento del producto en un canal técnico mediante operación comercial constante</p>
            </div>
          </article>
        </div>

        <div className="bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 dark:from-amber-900/20 dark:via-amber-800/10 dark:to-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-12 text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-amber-700 dark:text-amber-400 mb-4">
            Lo que nos Distingue como Socio Comercial
          </h3>
          <p className="text-xl text-slate-700 dark:text-gray-300 mb-6">
            Ejecución Real + Operación + Resultados Medibles
          </p>
          <p className="text-lg text-slate-600 dark:text-gray-400">
            No solo movemos producto: operamos crecimiento comercial en México
          </p>
        </div>
      </div>

      <BrandModal
        brand={selectedBrand}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDistributorClick={handleDistributorClick}
      />
    </section>
  );
}
