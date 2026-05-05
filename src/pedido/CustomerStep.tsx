import { useState } from 'react';
import { ArrowRight, Building2, Mail, MapPin, Phone, User, FileText } from 'lucide-react';
import type { CustomerData } from './types';

const mexicanStates = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
  'Chiapas', 'Chihuahua', 'Ciudad de Mexico', 'Coahuila', 'Colima',
  'Durango', 'Estado de Mexico', 'Guanajuato', 'Guerrero', 'Hidalgo',
  'Jalisco', 'Michoacan', 'Morelos', 'Nayarit', 'Nuevo Leon', 'Oaxaca',
  'Puebla', 'Queretaro', 'Quintana Roo', 'San Luis Potosi', 'Sinaloa',
  'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatan', 'Zacatecas',
];

interface CustomerStepProps {
  data: CustomerData;
  onChange: (data: CustomerData) => void;
  onNext: () => void;
}

export default function CustomerStep({ data, onChange, onNext }: CustomerStepProps) {
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerData, string>>>({});

  function update(field: keyof CustomerData, value: string) {
    onChange({ ...data, [field]: value });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!data.name.trim()) next.name = 'Nombre requerido';
    if (!data.email.trim()) next.email = 'Correo requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) next.email = 'Correo invalido';
    if (!data.phone.trim()) next.phone = 'Telefono requerido';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) onNext();
  }

  const inputBase =
    'w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 pl-11 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all duration-200 text-sm';
  const errorClass = 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/30';

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-1">Datos del cliente</h2>
      <p className="text-gray-500 text-sm mb-6">Completa tus datos para continuar con el pedido.</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">
            Nombre completo *
          </label>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={data.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Tu nombre"
              className={`${inputBase} ${errors.name ? errorClass : ''}`}
            />
          </div>
          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">
            Correo electronico *
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="email"
              value={data.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="correo@ejemplo.com"
              className={`${inputBase} ${errors.email ? errorClass : ''}`}
            />
          </div>
          {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">
            Telefono *
          </label>
          <div className="relative">
            <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="55 1234 5678"
              className={`${inputBase} ${errors.phone ? errorClass : ''}`}
            />
          </div>
          {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
        </div>

        <div>
          <label className="block text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">
            Empresa / Negocio
          </label>
          <div className="relative">
            <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={data.company}
              onChange={(e) => update('company', e.target.value)}
              placeholder="Nombre del negocio (opcional)"
              className={inputBase}
            />
          </div>
        </div>

        {/* Ciudad y Estado ocultos temporalmente
        <div>
          <label className="block text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">
            Ciudad
          </label>
          <div className="relative">
            <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={data.city}
              onChange={(e) => update('city', e.target.value)}
              placeholder="Tu ciudad (opcional)"
              className={inputBase}
            />
          </div>
          {errors.city && <p className="text-red-400 text-xs mt-1">{errors.city}</p>}
        </div>

        <div>
          <label className="block text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">
            Estado
          </label>
          <div className="relative">
            <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
            <select
              value={data.state}
              onChange={(e) => update('state', e.target.value)}
              className={`${inputBase} appearance-none ${!data.state ? 'text-gray-600' : ''}`}
            >
              <option value="">Selecciona un estado</option>
              {mexicanStates.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {errors.state && <p className="text-red-400 text-xs mt-1">{errors.state}</p>}
        </div>
        */}
      </div>

      <div>
        <label className="block text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">
          Notas adicionales
        </label>
        <div className="relative">
          <FileText size={16} className="absolute left-3.5 top-3.5 text-gray-600" />
          <textarea
            value={data.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="Comentarios. (opcional)"
            rows={3}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 pl-11 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all duration-200 text-sm resize-none"
          />
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          className="group inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-600 text-black font-bold px-8 py-3 rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-300"
        >
          Continuar
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </form>
  );
}
