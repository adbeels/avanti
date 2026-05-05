import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, MailX } from 'lucide-react';

type Status = 'loading' | 'success' | 'already' | 'error';

export default function UnsubscribePage() {
  const [status, setStatus] = useState<Status>('loading');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    fetch(`${supabaseUrl}/functions/v1/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setEmail(data.email || '');
          setStatus(data.already ? 'already' : 'success');
        } else {
          setStatus('error');
        }
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <img src="/logo_Fwhite.png" alt="AVANTI" className="h-8 mx-auto mb-12 opacity-50" />

        {status === 'loading' && (
          <div className="space-y-4">
            <Loader2 size={48} className="mx-auto text-amber-500 animate-spin" />
            <p className="text-gray-400">Procesando tu solicitud...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-5">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-green-400" />
            </div>
            <h1 className="text-white text-2xl font-bold">Desuscripción confirmada</h1>
            {email && (
              <p className="text-gray-400 text-sm">
                <span className="text-white font-medium">{email}</span> ha sido removido de nuestra lista de correos.
              </p>
            )}
            <p className="text-gray-600 text-sm">Ya no recibirás comunicaciones de AVANTI México Sales &amp; Operations en esta dirección.</p>
            <a
              href="https://avantimexico.com"
              className="inline-block mt-4 text-amber-500 text-sm hover:text-amber-400 transition-colors"
            >
              Volver al sitio
            </a>
          </div>
        )}

        {status === 'already' && (
          <div className="space-y-5">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
              <MailX size={32} className="text-amber-400" />
            </div>
            <h1 className="text-white text-2xl font-bold">Ya estás desuscrito</h1>
            {email && (
              <p className="text-gray-400 text-sm">
                <span className="text-white font-medium">{email}</span> ya no recibe comunicaciones de AVANTI.
              </p>
            )}
            <a
              href="https://avantimexico.com"
              className="inline-block mt-4 text-amber-500 text-sm hover:text-amber-400 transition-colors"
            >
              Volver al sitio
            </a>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-5">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <XCircle size={32} className="text-red-400" />
            </div>
            <h1 className="text-white text-2xl font-bold">Enlace inválido</h1>
            <p className="text-gray-400 text-sm">El enlace de desuscripción no es válido o ya expiró. Si tienes problemas, contáctanos en <a href="mailto:contacto@avantimexico.com" className="text-amber-500 hover:text-amber-400">contacto@avantimexico.com</a>.</p>
            <a
              href="https://avantimexico.com"
              className="inline-block mt-4 text-amber-500 text-sm hover:text-amber-400 transition-colors"
            >
              Volver al sitio
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
