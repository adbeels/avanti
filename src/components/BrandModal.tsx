import { X, CheckCircle2, Store } from 'lucide-react';

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

interface BrandModalProps {
  brand: Brand | null;
  isOpen: boolean;
  onClose: () => void;
  onDistributorClick: (brandName: string) => void;
}

export default function BrandModal({ brand, isOpen, onClose, onDistributorClick }: BrandModalProps) {
  if (!isOpen || !brand) return null;

  const defaultImage = 'https://images.pexels.com/photos/264547/pexels-photo-264547.jpeg?auto=compress&cs=tinysrgb&w=1920';
  const backgroundImage = brand.image || defaultImage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl overflow-hidden ${!brand.cardImage ? 'bg-gradient-to-br from-white to-amber-50 dark:from-gray-900 dark:to-black' : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={brand.cardImage ? {
          backgroundImage: `url('${brand.cardImage}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : {}}
      >
        <div className="relative h-64 rounded-t-2xl overflow-hidden">
          {!brand.cardImage && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('${backgroundImage}')`
              }}
            ></div>
          )}
          <div className="relative h-full">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-800 text-slate-800 dark:text-white rounded-full p-2 transition-all"
            aria-label="Cerrar"
          >
            <X size={24} />
          </button>

          <div className="absolute bottom-0 left-0 right-0 p-8">
            {brand.icon && !brand.cardImage && (
              <div className="mb-4">
                <img src={brand.icon} alt={brand.name} className="h-16 w-auto" />
              </div>
            )}
            <h2
              className={`text-4xl font-bold mb-2 ${brand.cardImage ? 'text-white' : 'text-white'}`}
              style={brand.cardImage ? {
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.8), 1px -1px 2px rgba(0, 0, 0, 0.8), -1px 1px 2px rgba(0, 0, 0, 0.8)'
              } : {}}
            >
              {brand.name}
            </h2>
            <p
              className={`text-xl font-semibold ${brand.cardImage ? 'text-amber-300' : 'text-amber-300'}`}
              style={brand.cardImage ? {
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.8), 1px -1px 2px rgba(0, 0, 0, 0.8), -1px 1px 2px rgba(0, 0, 0, 0.8)'
              } : {}}
            >
              {brand.channel}
            </p>
          </div>
          </div>
        </div>

        <div className="relative">
          {brand.cardImage && (
            <div className="absolute inset-0 bg-gradient-to-br from-white/95 to-amber-50/95 dark:from-gray-900/95 dark:to-black/95"></div>
          )}
          <div className="relative p-8">
          <p className="text-lg text-slate-700 dark:text-gray-300 mb-8 leading-relaxed">
            {brand.description}
          </p>

          <div className="mb-8">
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mb-4 flex items-center">
              <Store className="mr-3" size={28} />
              Beneficios para Distribuidores
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {brand.benefits.map((benefit, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <CheckCircle2 className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-1" size={20} />
                  <p className="text-slate-600 dark:text-gray-400">{benefit}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-xl p-6 mb-8">
            <h4 className="text-lg font-bold text-amber-700 dark:text-amber-400 mb-3">Detalles de la Operación</h4>
            <p className="text-slate-600 dark:text-gray-400">{brand.details}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => {
                onDistributorClick(brand.name);
                onClose();
              }}
              className="flex-1 bg-gradient-to-r from-amber-400 to-amber-600 text-black px-8 py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-amber-600/50 transition-all"
            >
              Quiero ser Distribuidor
            </button>
            <button
              onClick={onClose}
              className="flex-1 border-2 border-amber-600 dark:border-amber-500 text-amber-700 dark:text-amber-400 px-8 py-4 rounded-xl font-bold text-lg hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-all"
            >
              Cerrar
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
