import { useState } from 'react';
import { Send, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const brands = [
  { id: 'lindt', name: 'Lindt & Sprüngli' },
  { id: 'panini', name: 'Panini' },
  { id: 'palinal', name: 'Palinal' },
];

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
    interestedBrands: [] as string[],
  });

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleBrandToggle = (brandName: string) => {
    setFormData(prev => ({
      ...prev,
      interestedBrands: prev.interestedBrands.includes(brandName)
        ? prev.interestedBrands.filter(b => b !== brandName)
        : [...prev.interestedBrands, brandName]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const { error } = await supabase
        .from('contact_leads')
        .insert([
          {
            name: formData.name,
            email: formData.email,
            phone: formData.phone || null,
            company: formData.company || null,
            message: formData.message || null,
            interested_brands: formData.interestedBrands,
          }
        ]);

      if (error) throw error;

      setStatus('success');
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        message: '',
        interestedBrands: [],
      });

      setTimeout(() => {
        setStatus('idle');
      }, 5000);

    } catch (error) {
      console.error('Error submitting form:', error);
      setStatus('error');
      setErrorMessage('Hubo un error al enviar el formulario. Por favor intenta de nuevo.');
    }
  };

  return (
    <div className="bg-gradient-to-br from-white to-amber-50 dark:from-gray-900 dark:to-black border border-amber-200 dark:border-amber-900/30 rounded-2xl p-8 shadow-xl">
      <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">
        Formulario de Contacto
      </h3>

      {status === 'success' && (
        <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700/30 rounded-lg flex items-start space-x-3">
          <Check className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-green-700 dark:text-green-400">
            ¡Gracias por tu interés! Hemos recibido tu mensaje y nos pondremos en contacto contigo pronto.
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700/30 rounded-lg flex items-start space-x-3">
          <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-red-700 dark:text-red-400">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
              Nombre Completo *
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-amber-200 dark:border-amber-900/30 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-600"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
              Email *
            </label>
            <input
              type="email"
              id="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-amber-200 dark:border-amber-900/30 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-600"
              placeholder="tu@email.com"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-amber-200 dark:border-amber-900/30 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-600"
              placeholder="+52 55 1234 5678"
            />
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
              Empresa
            </label>
            <input
              type="text"
              id="company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-amber-200 dark:border-amber-900/30 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-600"
              placeholder="Nombre de tu empresa"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-3">
            Marcas de Interés *
          </label>
          <div className="flex flex-wrap gap-3">
            {brands.map((brand) => (
              <button
                key={brand.id}
                type="button"
                onClick={() => handleBrandToggle(brand.name)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  formData.interestedBrands.includes(brand.name)
                    ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-black shadow-md'
                    : 'bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/30 text-slate-700 dark:text-gray-300 hover:border-amber-400 dark:hover:border-amber-500'
                }`}
              >
                {brand.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
            Mensaje
          </label>
          <textarea
            id="message"
            rows={4}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border border-amber-200 dark:border-amber-900/30 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-600"
            placeholder="Cuéntanos sobre tus objetivos comerciales..."
          />
        </div>

        <button
          type="submit"
          disabled={status === 'loading' || formData.interestedBrands.length === 0}
          className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-black px-8 py-4 rounded-lg font-bold text-lg hover:shadow-lg hover:shadow-amber-600/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {status === 'loading' ? (
            <>
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <span>Enviando...</span>
            </>
          ) : (
            <>
              <Send size={20} />
              <span>Enviar Mensaje</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
