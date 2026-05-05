import { useState } from 'react';
import { ChevronDown, Target, Eye, Award } from 'lucide-react';

export default function MissionVision() {
  const [openMission, setOpenMission] = useState(false);
  const [openVision, setOpenVision] = useState(false);
  const [openValues, setOpenValues] = useState(false);

  const values = ['Ejecución', 'Resultados', 'Partnership', 'Control', 'Agilidad', 'Integridad'];

  return (
    <section className="py-12 bg-gradient-to-b from-white to-amber-50/30 dark:from-black dark:to-amber-950/10">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="space-y-2">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg overflow-hidden border border-amber-100 dark:border-amber-900/30">
            <button
              onClick={() => setOpenMission(!openMission)}
              className="w-full px-8 py-6 flex items-center justify-between hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-600/30">
                  <Target className="text-black" size={24} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Misión</h3>
              </div>
              <ChevronDown
                className={`text-amber-600 dark:text-amber-400 transition-transform duration-300 ${
                  openMission ? 'rotate-180' : ''
                }`}
                size={28}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ${
                openMission ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="px-8 pb-6">
                <p className="text-slate-600 dark:text-gray-300 text-lg leading-relaxed">
                  Operar y acelerar el crecimiento de marcas premium en México con músculo comercial multicanal.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg overflow-hidden border border-amber-100 dark:border-amber-900/30">
            <button
              onClick={() => setOpenVision(!openVision)}
              className="w-full px-8 py-6 flex items-center justify-between hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-600/30">
                  <Eye className="text-black" size={24} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Visión</h3>
              </div>
              <ChevronDown
                className={`text-amber-600 dark:text-amber-400 transition-transform duration-300 ${
                  openVision ? 'rotate-180' : ''
                }`}
                size={28}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ${
                openVision ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="px-8 pb-6">
                <p className="text-slate-600 dark:text-gray-300 text-lg leading-relaxed">
                  Ser el socio operador #1 en México para marcas que buscan expansión y ventas sostenidas.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg overflow-hidden border border-amber-100 dark:border-amber-900/30">
            <button
              onClick={() => setOpenValues(!openValues)}
              className="w-full px-8 py-6 flex items-center justify-between hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-600/30">
                  <Award className="text-black" size={24} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Valores</h3>
              </div>
              <ChevronDown
                className={`text-amber-600 dark:text-amber-400 transition-transform duration-300 ${
                  openValues ? 'rotate-180' : ''
                }`}
                size={28}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ${
                openValues ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="px-8 pb-6">
                <div className="flex flex-wrap gap-3">
                  {values.map((value, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-600 text-black font-semibold rounded-lg shadow-md"
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
