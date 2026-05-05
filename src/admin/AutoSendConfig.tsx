import { useEffect, useState } from 'react';
import { Zap, ZapOff, Clock, Save, Loader2, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AutoSendSettings {
  enabled: boolean;
  delay_minutes: number;
  bank_info: string;
  subject: string;
}

const DELAY_OPTIONS = [
  { label: 'Inmediato (0 min)', value: 0 },
  { label: '5 minutos', value: 5 },
  { label: '15 minutos', value: 15 },
  { label: '30 minutos', value: 30 },
  { label: '1 hora', value: 60 },
  { label: '2 horas', value: 120 },
  { label: '6 horas', value: 360 },
  { label: '12 horas', value: 720 },
  { label: '24 horas', value: 1440 },
];

export default function AutoSendConfig() {
  const [settings, setSettings] = useState<AutoSendSettings>({
    enabled: false,
    delay_minutes: 0,
    bank_info: '',
    subject: 'Confirmación de pedido y solicitud de pago - Avanti México',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [toggling, setToggling] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('auto_send_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (data) {
      setSettings({
        enabled: data.enabled,
        delay_minutes: data.delay_minutes,
        bank_info: data.bank_info,
        subject: data.subject,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggle = async () => {
    setToggling(true);
    const newEnabled = !settings.enabled;
    const { error } = await supabase
      .from('auto_send_settings')
      .update({ enabled: newEnabled, updated_at: new Date().toISOString() })
      .eq('id', 1);
    if (!error) {
      setSettings(prev => ({ ...prev, enabled: newEnabled }));
    }
    setToggling(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('idle');
    const { error } = await supabase
      .from('auto_send_settings')
      .update({
        delay_minutes: settings.delay_minutes,
        bank_info: settings.bank_info,
        subject: settings.subject,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);
    setSaving(false);
    if (error) {
      setSaveStatus('error');
    } else {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-amber-400" />
      </div>
    );
  }

  const selectedDelayLabel = DELAY_OPTIONS.find(o => o.value === settings.delay_minutes)?.label
    ?? `${settings.delay_minutes} minutos`;

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg border transition-colors ${settings.enabled ? 'bg-green-500/10 border-green-500/30' : 'bg-gray-800 border-gray-700'}`}>
            {settings.enabled
              ? <Zap size={16} className="text-green-400" />
              : <ZapOff size={16} className="text-gray-500" />
            }
          </div>
          <div>
            <span className="text-white font-semibold text-sm">Envío automático</span>
            <p className="text-gray-600 text-xs">Para pedidos nuevos</p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none disabled:opacity-50 ${settings.enabled ? 'bg-green-500' : 'bg-gray-700'}`}
          title={settings.enabled ? 'Desactivar envío automático' : 'Activar envío automático'}
        >
          {toggling
            ? <Loader2 size={12} className="absolute left-1/2 -translate-x-1/2 animate-spin text-white" />
            : <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${settings.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          }
        </button>
      </div>

      <div className={`transition-all duration-300 ${settings.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        <div className="px-6 py-5 space-y-5">
          {settings.enabled && (
            <div className="flex items-start gap-3 p-3 bg-green-950/30 border border-green-800/40 rounded-lg">
              <Zap size={14} className="text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-green-400 text-xs leading-relaxed">
                Los nuevos prepedidos recibirán automáticamente el correo de solicitud de pago
                {settings.delay_minutes === 0
                  ? ' de forma inmediata.'
                  : ` después de ${selectedDelayLabel.toLowerCase()}.`
                }
              </p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              <Clock size={14} className="text-amber-400" />
              Tiempo de espera antes de enviar
            </label>
            <div className="relative">
              <select
                value={settings.delay_minutes}
                onChange={e => setSettings(prev => ({ ...prev, delay_minutes: Number(e.target.value) }))}
                className="w-full appearance-none px-4 py-3 bg-black border border-gray-800 rounded-lg text-white focus:outline-none focus:border-amber-500 transition-colors text-sm pr-10"
              >
                {DELAY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
            <p className="text-gray-700 text-xs mt-1.5">
              Desde que el cliente envía el pedido hasta que se dispara el correo automático.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 block">Asunto del correo</label>
            <input
              type="text"
              value={settings.subject}
              onChange={e => setSettings(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full px-4 py-3 bg-black border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 block">Datos bancarios por defecto</label>
            <textarea
              value={settings.bank_info}
              onChange={e => setSettings(prev => ({ ...prev, bank_info: e.target.value }))}
              rows={5}
              className="w-full px-4 py-3 bg-black border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors text-sm resize-none font-mono leading-relaxed"
              placeholder="Banco: ...&#10;CLABE: ...&#10;Titular: ..."
            />
          </div>

          {saveStatus !== 'idle' && (
            <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${
              saveStatus === 'success'
                ? 'bg-green-950/30 border-green-800/40 text-green-400'
                : 'bg-red-950/30 border-red-800/40 text-red-400'
            }`}>
              {saveStatus === 'success'
                ? <><CheckCircle2 size={15} /> Configuración guardada</>
                : <><AlertCircle size={15} /> Error al guardar</>
              }
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-black py-3 rounded-lg font-bold text-sm hover:shadow-lg hover:shadow-amber-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> Guardando...</>
              : <><Save size={14} /> Guardar configuración</>
            }
          </button>
        </div>
      </div>

      {!settings.enabled && (
        <div className="px-6 pb-5">
          <p className="text-gray-700 text-xs text-center">
            Activa el interruptor para configurar el envío automático de solicitudes de pago.
          </p>
        </div>
      )}
    </div>
  );
}
