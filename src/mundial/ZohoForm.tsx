import { useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const ZOHO_FORM_ACTION = 'https://crm.zoho.com/crm/WebToLeadForm';
const ZOHO_XNQSJSDP = '1352e71394ef5cad089e5461a80f40791e49db54e774d57862cbc25ab6f2b6b8';
const ZOHO_XMIWTLD = 'e1b2ca5c34010765dab6018c66f8e674c7bc1adaf9c8f065c0b4cf7b30d771accd17ec27305835462b9aafcbb1dfb68a';

function submitToZoho(lastName: string, company: string, email: string, mobile: string) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = ZOHO_FORM_ACTION;
  form.target = 'zoho-hidden-frame';
  form.style.display = 'none';

  const fields: Record<string, string> = {
    xnQsjsdp: ZOHO_XNQSJSDP,
    xmIwtLD: ZOHO_XMIWTLD,
    actionType: 'TGVhZHM=',
    returnURL: 'https://avantimexico.com/?distribuidor-album-mundial-2026',
    'Last Name': lastName,
    Company: company,
    Email: email,
    Mobile: mobile,
    Phone: mobile,
  };

  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
  setTimeout(() => document.body.removeChild(form), 3000);
}

export default function ZohoForm() {
  const params = new URLSearchParams(window.location.search);
  const initialName = decodeURIComponent(params.get('nombre') ?? params.get('name') ?? '');
  const initialEmail = decodeURIComponent(params.get('email') ?? '');

  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;

    const lastName = (form.elements.namedItem('Last Name') as HTMLInputElement).value.trim();
    const company = (form.elements.namedItem('Company') as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem('Email') as HTMLInputElement).value.trim();
    const mobile = (form.elements.namedItem('Mobile') as HTMLInputElement).value.trim();

    if (!lastName) {
      alert('Nombre no puede estar vacío.');
      (form.elements.namedItem('Last Name') as HTMLInputElement).focus();
      return;
    }
    if (!company) {
      alert('Empresa no puede estar vacío.');
      (form.elements.namedItem('Company') as HTMLInputElement).focus();
      return;
    }

    setSubmitting(true);

    console.log('[Zoho] Guardando lead en Supabase...', { lastName, company, email, mobile });

    const { error: dbError } = await supabase.from('mundial_leads').insert({
      last_name: lastName,
      company,
      email,
      mobile,
      zoho_payload: { lastName, company, email, mobile },
    });

    if (dbError) {
      console.error('[Zoho] Error guardando en Supabase:', dbError);
    } else {
      console.log('[Zoho] Lead guardado en Supabase correctamente.');
    }

    console.log('[Zoho] Enviando a Zoho CRM...', { lastName, company, email, mobile });
    submitToZoho(lastName, company, email, mobile);

    form.reset();
    setSubmitting(false);
    alert('¡Registro exitoso! Un asesor Avanti te contactará pronto.');
  }

  return (
    <>
      <iframe name="zoho-hidden-frame" style={{ display: 'none' }} title="zoho-hidden" />

    <form
      ref={formRef}
      id="webform7197973000000809005"
      name="WebToLeads7197973000000809005"
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <div>
        <label htmlFor="Last_Name" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Nombre <span className="text-amber-500">*</span>
        </label>
        <input
          type="text"
          id="Last_Name"
          name="Last Name"
          aria-required="true"
          maxLength={80}
          defaultValue={initialName}
          className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors"
          placeholder="Tu nombre completo"
        />
      </div>

      <div>
        <label htmlFor="Company" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Empresa <span className="text-amber-500">*</span>
        </label>
        <input
          type="text"
          id="Company"
          name="Company"
          aria-required="true"
          maxLength={200}
          className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors"
          placeholder="Nombre de tu empresa"
        />
      </div>

      <div>
        <label htmlFor="Email" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Correo electrónico
        </label>
        <input
          type="email"
          id="Email"
          name="Email"
          maxLength={100}
          defaultValue={initialEmail}
          className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors"
          placeholder="correo@empresa.com"
        />
      </div>

      <div>
        <label htmlFor="Mobile" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Teléfono Móvil
        </label>
        <input
          type="text"
          id="Mobile"
          name="Mobile"
          maxLength={30}
          className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors"
          placeholder="+52 (55) 0000-0000"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 px-6 rounded-xl text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Enviando...' : 'Enviar'}
        </button>
        <button
          type="reset"
          disabled={submitting}
          className="px-5 py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 text-sm transition-colors duration-200 disabled:opacity-50"
        >
          Restablecer
        </button>
      </div>
    </form>
    </>
  );
}
