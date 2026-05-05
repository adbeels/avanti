import { Mail, Phone, Linkedin } from 'lucide-react';
import ContactForm from './ContactForm';

export default function Contact() {
  return (
    <section id="contacto" aria-label="Contacto AVANTI Sales & Operations" className="py-12 bg-gradient-to-b from-white via-amber-50/30 to-white dark:from-black dark:via-gray-950 dark:to-black">
      <div className="container mx-auto px-6">
        <div className="text-center mb-8">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-700 dark:from-amber-400 dark:to-amber-600">
              Contáctanos
            </span>
          </h2>
          <p className="text-xl text-slate-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
            En AVANTI México | Sales & Operations estamos listos para operar el crecimiento comercial de tu marca en México
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/20 dark:to-black border border-amber-300 dark:border-amber-500/30 rounded-2xl p-10 text-center mb-6">
            <Mail className="text-amber-600 dark:text-amber-400 mx-auto mb-6" size={48} />
            <h3 className="text-2xl font-bold text-amber-700 dark:text-amber-400 mb-4">
              Pedidos
            </h3>
            <p className="text-slate-600 dark:text-gray-400 mb-6">
              Para realizar pedidos directos, contáctanos a través de:
            </p>
            <a
              href="mailto:pedidos@avantimexico.com"
              className="inline-block bg-gradient-to-r from-amber-400 to-amber-600 text-black px-8 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-amber-600/50 transition-all"
            >
              pedidos@avantimexico.com
            </a>
          </div>

          <div className="mt-6 mb-6 text-center">
            <h3 className="text-2xl font-bold text-slate-700 dark:text-gray-300 mb-4">
              Hablemos de tu Operación Comercial
            </h3>
            <p className="text-slate-600 dark:text-gray-400 max-w-2xl mx-auto">
              Compártenos tus objetivos (canal, cobertura y tipo de producto) y nuestro equipo te propondrá un esquema de operación a la medida
            </p>
          </div>

          <ContactForm />

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <a
              href="https://www.linkedin.com/company/avanti-so"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-br from-white to-amber-50 dark:from-gray-900 dark:to-black border border-amber-200 dark:border-amber-900/30 rounded-xl p-6 hover:border-amber-400 dark:hover:border-amber-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/20 dark:hover:shadow-amber-900/20 flex items-start space-x-4"
            >
              <div className="bg-gradient-to-br from-amber-400 to-amber-600 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                <Linkedin className="text-black" size={24} />
              </div>
              <div>
                <h3 className="text-amber-600 dark:text-amber-400 font-semibold mb-1">LinkedIn</h3>
                <p className="text-slate-600 dark:text-gray-400">avanti-so</p>
              </div>
            </a>

            <a
              href="tel:+525562687285"
              className="bg-gradient-to-br from-white to-amber-50 dark:from-gray-900 dark:to-black border border-amber-200 dark:border-amber-900/30 rounded-xl p-6 hover:border-amber-400 dark:hover:border-amber-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/20 dark:hover:shadow-amber-900/20 flex items-start space-x-4"
            >
              <div className="bg-gradient-to-br from-amber-400 to-amber-600 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                <Phone className="text-black" size={24} />
              </div>
              <div>
                <h3 className="text-amber-600 dark:text-amber-400 font-semibold mb-1">Teléfono</h3>
                <p className="text-slate-600 dark:text-gray-400">+52 55 6268 7285</p>
              </div>
            </a>

            <a
              href="mailto:contacto@avantimexico.com"
              className="bg-gradient-to-br from-white to-amber-50 dark:from-gray-900 dark:to-black border border-amber-200 dark:border-amber-900/30 rounded-xl p-6 hover:border-amber-400 dark:hover:border-amber-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/20 dark:hover:shadow-amber-900/20 flex items-start space-x-4"
            >
              <div className="bg-gradient-to-br from-amber-400 to-amber-600 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="text-black" size={24} />
              </div>
              <div>
                <h3 className="text-amber-600 dark:text-amber-400 font-semibold mb-1">Email General</h3>
                <p className="text-slate-600 dark:text-gray-400">contacto@avantimexico.com</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
