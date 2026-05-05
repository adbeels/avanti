import { useEffect, useState } from 'react';
import { Users, RefreshCw, ChevronDown, ChevronUp, Mail, Phone, Building2, MessageSquare, Tag, MailX } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CsvImport from './CsvImport';
import { SelectedContact } from './MailingComposer';

interface ContactLead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string | null;
  interested_brands: string[];
  created_at: string;
  unsubscribed: boolean;
  unsubscribed_at: string | null;
  unsubscribe_token: string | null;
}

interface ContactsTableProps {
  onSelectContacts: (contacts: SelectedContact[]) => void;
  selectedEmails: string[];
}

export default function ContactsTable({ onSelectContacts, selectedEmails }: ContactsTableProps) {
  const [contacts, setContacts] = useState<ContactLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchContacts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('contact_leads')
      .select('*')
      .order('created_at', { ascending: false });
    setContacts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const allEmails = contacts.map((c) => c.email);
  const allSelected = allEmails.length > 0 && allEmails.every((e) => selectedEmails.includes(e));

  const toSelectedContact = (c: ContactLead): SelectedContact => ({
    email: c.email,
    name: c.name,
    company: c.company,
    unsubscribeToken: c.unsubscribe_token,
  });

  const toggleAll = () => {
    if (allSelected) {
      onSelectContacts([]);
    } else {
      onSelectContacts(contacts.map(toSelectedContact));
    }
  };

  const toggleContact = (contact: ContactLead) => {
    if (selectedEmails.includes(contact.email)) {
      const remaining = contacts
        .filter((c) => selectedEmails.includes(c.email) && c.email !== contact.email)
        .map(toSelectedContact);
      onSelectContacts(remaining);
    } else {
      const existing = contacts
        .filter((c) => selectedEmails.includes(c.email))
        .map(toSelectedContact);
      onSelectContacts([...existing, toSelectedContact(contact)]);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('es-MX', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Users size={18} className="text-amber-400" />
          <span className="text-white font-semibold">Contactos</span>
          <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-0.5 rounded-full border border-amber-500/20">
            {contacts.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {selectedEmails.length > 0 && (
            <span className="text-amber-400 text-sm font-medium">
              {selectedEmails.length} seleccionado{selectedEmails.length !== 1 ? 's' : ''}
            </span>
          )}
          <CsvImport onImportComplete={fetchContacts} />
          <button
            onClick={fetchContacts}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            title="Recargar"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay contactos aún</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800/50 bg-black/40">
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="accent-amber-500 w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Empresa</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Fecha</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider hidden xl:table-cell">Estado</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {contacts.map((contact) => (
                <>
                  <tr
                    key={contact.id}
                    className={`hover:bg-gray-900/50 transition-colors ${
                      selectedEmails.includes(contact.email) ? 'bg-amber-950/10' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedEmails.includes(contact.email)}
                        onChange={() => toggleContact(contact)}
                        className="accent-amber-500 w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white text-sm font-medium">{contact.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-400 text-sm">{contact.email}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-gray-500 text-sm">{contact.company || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-gray-600 text-xs">{formatDate(contact.created_at)}</span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-center">
                      {contact.unsubscribed ? (
                        <span className="inline-flex items-center gap-1 text-red-400/70 text-xs" title={`Desuscrito el ${contact.unsubscribed_at ? formatDate(contact.unsubscribed_at) : '—'}`}>
                          <MailX size={13} />
                          <span>Baja</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-green-500/60 text-xs">
                          <Mail size={13} />
                          <span>Activo</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setExpandedId(expandedId === contact.id ? null : contact.id)}
                        className="text-gray-600 hover:text-amber-400 transition-colors"
                      >
                        {expandedId === contact.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </td>
                  </tr>
                  {expandedId === contact.id && (
                    <tr key={`${contact.id}-expanded`} className="bg-black/60">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          {contact.phone && (
                            <div className="flex items-center gap-2 text-gray-400">
                              <Phone size={14} className="text-amber-500/60" />
                              <span>{contact.phone}</span>
                            </div>
                          )}
                          {contact.company && (
                            <div className="flex items-center gap-2 text-gray-400">
                              <Building2 size={14} className="text-amber-500/60" />
                              <span>{contact.company}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-gray-400">
                            <Mail size={14} className="text-amber-500/60" />
                            <span>{contact.email}</span>
                          </div>
                          {contact.interested_brands.length > 0 && (
                            <div className="flex items-start gap-2 text-gray-400 sm:col-span-2 lg:col-span-1">
                              <Tag size={14} className="text-amber-500/60 mt-0.5 flex-shrink-0" />
                              <div className="flex flex-wrap gap-1">
                                {contact.interested_brands.map((b) => (
                                  <span key={b} className="bg-amber-500/10 text-amber-400 text-xs px-2 py-0.5 rounded-full border border-amber-500/20">
                                    {b}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {contact.unsubscribed && (
                            <div className="flex items-center gap-2 text-red-400/60">
                              <MailX size={14} className="flex-shrink-0" />
                              <span className="text-xs">Dado de baja{contact.unsubscribed_at ? ` el ${formatDate(contact.unsubscribed_at)}` : ''}</span>
                            </div>
                          )}
                          {contact.message && (
                            <div className="flex items-start gap-2 text-gray-400 sm:col-span-2 lg:col-span-3">
                              <MessageSquare size={14} className="text-amber-500/60 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-500 italic">{contact.message}</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
