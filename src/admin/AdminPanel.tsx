import { useState, useEffect } from 'react';
import {
  LogOut, ShieldCheck, Mail, Package, Truck, ShoppingBag, Inbox, Boxes, Tag,
  ClipboardList, FileSignature, Menu, X, ChevronRight, User as UserIcon, History,
  Users as UsersIcon, MailCheck, ArrowLeft,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import ContactsTable from './ContactsTable';
import MailingComposer, { SelectedContact } from './MailingComposer';
import PreordersTable, { Preorder } from './PreordersTable';
import PreorderMailer from './PreorderMailer';
import PreordersDashboard from './PreordersDashboard';
import AutoSendConfig from './AutoSendConfig';
import PaymentConfirmationMailer from './PaymentConfirmationMailer';
import DeliveriesTable from './DeliveriesTable';
import DeliveryReadyMailer from './DeliveryReadyMailer';
import PurchaseOrdersTable, { PurchaseOrder } from './PurchaseOrdersTable';
import PurchaseOrderEditor from './PurchaseOrderEditor';
import BulkPOImport from './BulkPOImport';
import ReceptionsTable, { Reception } from './ReceptionsTable';
import ReceptionEditor from './ReceptionEditor';
import StockTable, { StockRow } from './StockTable';
import InventoryEditor from './InventoryEditor';
import ProductsTable, { Product } from './ProductsTable';
import ProductEditor from './ProductEditor';
import ExternalOrderForm from './ExternalOrderForm';
import BulkOrderImport from './BulkOrderImport';
import PickingListsTable, { PickingList } from './PickingListsTable';
import PickingListEditor from './PickingListEditor';
import DeliveryDocumentsTable, { DeliveryDoc } from './DeliveryDocumentsTable';
import DeliveryDocumentEditor from './DeliveryDocumentEditor';
import AuditLogTable, { AuditEntry } from './AuditLogTable';
import AuditLogDetail from './AuditLogDetail';
import UsersTable, { UserProfile } from './UsersTable';
import UserEditor from './UserEditor';
import EmailPreviewGallery from './EmailPreviewGallery';
import { useCurrentUserRole } from './useCurrentUserRole';

interface AdminPanelProps {
  onLogout: () => void;
}

// ──────────────────────────────────────────────────────────────────────────
// DetailHeader — header sticky con botón "Volver" usado en el modo detalle
// drill-down de todos los tabs (preorders, deliveries, purchases, etc.).
// Extrae el patrón visual común para mantener la UI consistente.
// ──────────────────────────────────────────────────────────────────────────
interface DetailHeaderProps {
  onBack: () => void;
  backLabel: string;
  badge?: string | null;          // folio / SKU monospace en pill ámbar
  title?: string | null;          // nombre / supplier / etc.
  subtitle?: string | null;       // empresa / fecha / etc. (opcional)
}

function DetailHeader({ onBack, backLabel, badge, title, subtitle }: DetailHeaderProps) {
  return (
    <div className="flex items-center gap-3 sticky top-14 z-10 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-3 bg-black/90 backdrop-blur border-b border-gray-900">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-gray-400 hover:text-amber-400 text-sm font-medium transition-colors px-3 py-1.5 rounded-lg border border-gray-800 hover:border-amber-500/40 bg-black flex-shrink-0"
      >
        <ArrowLeft size={14} />
        {backLabel}
      </button>
      {(badge || title || subtitle) && (
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          {badge && (
            <span className="font-mono text-amber-400 text-xs font-bold tracking-widest bg-amber-500/5 border border-amber-500/15 px-2 py-1 rounded flex-shrink-0">
              {badge}
            </span>
          )}
          {title && <span className="text-white text-sm font-medium truncate">{title}</span>}
          {subtitle && (
            <span className="text-gray-500 text-xs truncate hidden sm:inline">· {subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
}

type Tab = 'mailing' | 'preorders' | 'deliveries' | 'purchases' | 'receptions' | 'inventory' | 'catalog' | 'picking' | 'delivery_docs' | 'audit' | 'users' | 'email_templates';
type POMode = 'empty' | 'create' | 'edit';
type RecMode = 'empty' | 'pick_po' | 'edit';
type ProductMode = 'empty' | 'create' | 'edit';
type PickingMode = 'empty' | 'pick_order' | 'edit';
type DDMode = 'empty' | 'pick_order' | 'edit';

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [tab, setTab] = useState<Tab>('preorders');
  const [selectedContacts, setSelectedContacts] = useState<SelectedContact[]>([]);
  const [selectedPreorder, setSelectedPreorder] = useState<Preorder | null>(null);
  const [preorders, setPreorders] = useState<Preorder[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<Preorder | null>(null);
  const [deliveriesRefreshKey, setDeliveriesRefreshKey] = useState(0);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [poMode, setPOMode] = useState<POMode>('empty');
  const [poRefreshKey, setPORefreshKey] = useState(0);
  const [showBulkPOImport, setShowBulkPOImport] = useState(false);
  const [selectedReception, setSelectedReception] = useState<Reception | null>(null);
  const [recMode, setRecMode] = useState<RecMode>('empty');
  const [recRefreshKey, setRecRefreshKey] = useState(0);
  const [selectedStockRow, setSelectedStockRow] = useState<StockRow | null>(null);
  const [stockRefreshKey, setStockRefreshKey] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productMode, setProductMode] = useState<ProductMode>('empty');
  const [productRefreshKey, setProductRefreshKey] = useState(0);
  const [showExternalOrderForm, setShowExternalOrderForm] = useState(false);
  const [showBulkOrderImport, setShowBulkOrderImport] = useState(false);
  const [preordersRefreshKey, setPreordersRefreshKey] = useState(0);
  const [selectedPicking, setSelectedPicking] = useState<PickingList | null>(null);
  const [pickingMode, setPickingMode] = useState<PickingMode>('empty');
  const [pickingRefreshKey, setPickingRefreshKey] = useState(0);
  const [selectedDeliveryDoc, setSelectedDeliveryDoc] = useState<DeliveryDoc | null>(null);
  const [ddMode, setDDMode] = useState<DDMode>('empty');
  const [ddRefreshKey, setDDRefreshKey] = useState(0);
  const [selectedAuditEntry, setSelectedAuditEntry] = useState<AuditEntry | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile | null>(null);
  const [usersRefreshKey, setUsersRefreshKey] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { role, isAdmin, isWarehouse, isFulfillment } = useCurrentUserRole();
  const canManageReceptions = isAdmin || isWarehouse;
  const canManageInventory = isAdmin || isWarehouse;
  const canManagePicking = isAdmin || isWarehouse || isFulfillment;
  const canManageDelivery = isAdmin || isFulfillment;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setUserEmail(data.user.email);
      if (data?.user?.id) setCurrentUserId(data.user.id);
    });
  }, []);

  // Cerrar drawer al cambiar de tab en mobile
  const goToTab = (next: Tab) => {
    setTab(next);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const handleEmailSent = (preorderId: string) => {
    setSelectedPreorder((prev) =>
      prev && prev.id === preorderId
        ? { ...prev, email_sent_at: new Date().toISOString(), status: 'contacted' }
        : prev
    );
  };

  const handleConfirmationSent = (preorderId: string) => {
    setSelectedPreorder((prev) =>
      prev && prev.id === preorderId
        ? { ...prev, payment_confirmation_sent_at: new Date().toISOString() }
        : prev
    );
  };

  const handlePOSelect = (po: PurchaseOrder | null) => {
    setSelectedPO(po);
    setPOMode(po ? 'edit' : 'empty');
  };

  const handlePOCreateNew = () => {
    setSelectedPO(null);
    setPOMode('create');
  };

  const handlePOChanged = () => {
    setPORefreshKey((k) => k + 1);
  };

  const handleReceptionSelect = (r: Reception | null) => {
    setSelectedReception(r);
    setRecMode(r ? 'edit' : 'empty');
  };

  const handleReceptionCreateNew = () => {
    setSelectedReception(null);
    setRecMode('pick_po');
  };

  const handleReceptionChanged = () => {
    setRecRefreshKey((k) => k + 1);
    setPORefreshKey((k) => k + 1); // PO status puede haber cambiado por el trigger
    setStockRefreshKey((k) => k + 1); // Stock puede haber cambiado por el trigger
  };

  const handleInventoryChanged = () => {
    setStockRefreshKey((k) => k + 1);
  };

  const handleProductSelect = (p: Product | null) => {
    setSelectedProduct(p);
    setProductMode(p ? 'edit' : 'empty');
  };

  const handleProductCreateNew = () => {
    setSelectedProduct(null);
    setProductMode('create');
  };

  const handleProductChanged = () => {
    setProductRefreshKey((k) => k + 1);
  };

  const handlePickingSelect = (p: PickingList | null) => {
    setSelectedPicking(p);
    setPickingMode(p ? 'edit' : 'empty');
  };

  const handlePickingCreateNew = () => {
    setSelectedPicking(null);
    setPickingMode('pick_order');
  };

  const handlePickingChanged = () => {
    setPickingRefreshKey((k) => k + 1);
    setPreordersRefreshKey((k) => k + 1);
    setStockRefreshKey((k) => k + 1);
  };

  const handleDDSelect = (d: DeliveryDoc | null) => {
    setSelectedDeliveryDoc(d);
    setDDMode(d ? 'edit' : 'empty');
  };

  const handleDDCreateNew = () => {
    setSelectedDeliveryDoc(null);
    setDDMode('pick_order');
  };

  const handleDDChanged = () => {
    setDDRefreshKey((k) => k + 1);
    setPreordersRefreshKey((k) => k + 1);
  };

  const handleDeliveryReadySent = (preorderId: string) => {
    const nowIso = new Date().toISOString();
    setSelectedDelivery((prev) =>
      prev && prev.id === preorderId
        ? {
            ...prev,
            delivery_status: 'ready',
            delivery_ready_at: nowIso,
            delivery_ready_email_sent_at: nowIso,
          }
        : prev
    );
    setDeliveriesRefreshKey((k) => k + 1);
  };

  // ============================================================
  // NAV CONFIG
  // ============================================================
  const NAV_SECTIONS: { label: string; items: { tab: Tab; label: string; icon: typeof Package }[] }[] = [
    {
      label: 'Operaciones',
      items: [
        { tab: 'preorders',     label: 'Pedidos',         icon: Package },
        { tab: 'picking',       label: 'Picking',         icon: ClipboardList },
        { tab: 'delivery_docs', label: 'Entregas',        icon: FileSignature },
        { tab: 'deliveries',    label: 'Avisos a cliente',icon: Truck },
      ],
    },
    {
      label: 'Logística',
      items: [
        { tab: 'purchases',  label: 'Compras',     icon: ShoppingBag },
        { tab: 'receptions', label: 'Recepciones', icon: Inbox },
        { tab: 'inventory',  label: 'Inventario',  icon: Boxes },
      ],
    },
    {
      label: 'Catálogos',
      items: [
        { tab: 'catalog', label: 'Productos', icon: Tag },
      ],
    },
    {
      label: 'Marketing',
      items: [
        { tab: 'mailing',         label: 'Mailing',     icon: Mail },
        { tab: 'email_templates', label: 'Plantillas',  icon: MailCheck },
      ],
    },
    {
      label: 'Sistema',
      items: [
        { tab: 'users', label: 'Usuarios',  icon: UsersIcon },
        { tab: 'audit', label: 'Auditoría', icon: History },
      ],
    },
  ];

  const currentSection = NAV_SECTIONS.find((s) => s.items.some((i) => i.tab === tab));
  const currentItem = currentSection?.items.find((i) => i.tab === tab);

  const NavItem = ({ icon: Icon, label, active, onClick }: { icon: typeof Package; label: string; active: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
          : 'text-gray-400 hover:text-white hover:bg-gray-900/60 border border-transparent'
      }`}
    >
      <Icon size={16} className="flex-shrink-0" />
      <span className="truncate">{label}</span>
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
    </button>
  );

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="px-5 py-5 border-b border-gray-900 flex items-center gap-3">
        <img src="/avantiW.png" alt="AVANTI" className="h-7 w-auto" />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-bold leading-tight">AVANTI</p>
          <p className="text-amber-400/70 text-[10px] uppercase tracking-widest leading-tight">Operaciones</p>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden text-gray-500 hover:text-white p-1"
          title="Cerrar menú"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="space-y-1">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold px-3 mb-1.5">
              {section.label}
            </p>
            {section.items.map((it) => (
              <NavItem
                key={it.tab}
                icon={it.icon}
                label={it.label}
                active={tab === it.tab}
                onClick={() => goToTab(it.tab)}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* User card */}
      <div className="px-3 py-3 border-t border-gray-900">
        <div className="flex items-center gap-3 p-2.5 bg-gray-900/40 border border-gray-900 rounded-lg">
          <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <UserIcon size={15} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate" title={userEmail}>
              {userEmail || 'usuario'}
            </p>
            <p className="text-gray-500 text-[10px] uppercase tracking-wide flex items-center gap-1">
              <ShieldCheck size={9} className="text-amber-400" />
              {role ?? '—'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
            title="Cerrar sesión"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* SIDEBAR — desktop fixed */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-gray-950 border-r border-gray-900 z-30 flex-col">
        <SidebarContent />
      </aside>

      {/* SIDEBAR — mobile drawer + overlay */}
      {sidebarOpen && (
        <button
          aria-label="Cerrar menú"
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`lg:hidden fixed left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-gray-950 border-r border-gray-900 z-40 flex flex-col transform transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* MAIN COLUMN */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        {/* TOP BAR — sticky */}
        <header className="sticky top-0 z-20 bg-black/80 backdrop-blur border-b border-gray-900">
          <div className="h-14 px-4 md:px-6 flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-white"
              title="Abrir menú"
            >
              <Menu size={18} />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs min-w-0 flex-1">
              <span className="text-gray-600 hidden sm:inline">{currentSection?.label ?? '—'}</span>
              <ChevronRight size={11} className="text-gray-700 hidden sm:inline" />
              <span className="text-white font-semibold truncate">{currentItem?.label ?? '—'}</span>
            </div>

            {/* User badge (sólo desktop, ya está en sidebar) */}
            <div className="hidden md:flex items-center gap-2 text-xs text-gray-500">
              <ShieldCheck size={12} className="text-amber-400" />
              <span className="capitalize">{role ?? 'sin rol'}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-6 lg:px-8 py-6 md:py-8 max-w-[1600px] w-full">
        {tab === 'preorders' && (() => {
          // ─────────────────────────────────────────────────────────────
          // Drill-down UX: cuando hay un pedido seleccionado (o se abrió
          // el form de creación / bulk import), ocultamos la lista y
          // mostramos sólo la vista detalle a ancho completo. El botón
          // "Volver a pedidos" regresa al modo lista.
          // ─────────────────────────────────────────────────────────────
          const inDetailMode =
            selectedPreorder !== null || showExternalOrderForm || showBulkOrderImport;

          const exitDetailMode = () => {
            setSelectedPreorder(null);
            setShowExternalOrderForm(false);
            setShowBulkOrderImport(false);
          };

          return (
            <>
              {/* Header de sección — sólo en modo lista */}
              {!inDetailMode && (
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-white mb-1">Gestion de Prepedidos</h1>
                  <p className="text-gray-600 text-sm">
                    Administra los prepedidos, cambia su estado y envia correos de confirmación con solicitud de pago.
                  </p>
                </div>
              )}

              {!inDetailMode ? (
                /* ─── MODO LISTA ─── */
                <>
                  <PreordersDashboard preorders={preorders} />
                  <div className="space-y-6 mt-6">
                    <AutoSendConfig />
                    <PreordersTable
                      onSelectPreorder={(p) => { setSelectedPreorder(p); setShowExternalOrderForm(false); setShowBulkOrderImport(false); }}
                      selectedId={null}
                      onPreordersChange={setPreorders}
                      onCreateExternal={isAdmin ? () => { setShowExternalOrderForm(true); setShowBulkOrderImport(false); setSelectedPreorder(null); } : undefined}
                      onBulkImport={isAdmin ? () => { setShowBulkOrderImport(true); setShowExternalOrderForm(false); setSelectedPreorder(null); } : undefined}
                      refreshKey={preordersRefreshKey}
                    />
                  </div>
                </>
              ) : (
                /* ─── MODO DETALLE ─── */
                <div className="max-w-3xl mx-auto space-y-6">
                  <DetailHeader
                    onBack={exitDetailMode}
                    backLabel="Volver a pedidos"
                    badge={selectedPreorder ? (selectedPreorder.folio || selectedPreorder.legacy_order_number || selectedPreorder.order_number) : null}
                    title={
                      selectedPreorder?.name ??
                      (showExternalOrderForm ? 'Nuevo pedido externo' : showBulkOrderImport ? 'Importación masiva' : null)
                    }
                    subtitle={selectedPreorder?.company || null}
                  />

                  {/* Contenido del modo detalle */}
                  {showBulkOrderImport ? (
                    <BulkOrderImport
                      isAdmin={isAdmin}
                      onClose={() => setShowBulkOrderImport(false)}
                      onImported={() => setPreordersRefreshKey((k) => k + 1)}
                    />
                  ) : showExternalOrderForm ? (
                    <ExternalOrderForm
                      isAdmin={isAdmin}
                      onClose={() => setShowExternalOrderForm(false)}
                      onCreated={() => setPreordersRefreshKey((k) => k + 1)}
                    />
                  ) : (
                    <>
                      <PreorderMailer
                        preorder={selectedPreorder}
                        onEmailSent={handleEmailSent}
                      />
                      <PaymentConfirmationMailer
                        preorder={selectedPreorder}
                        onEmailSent={handleConfirmationSent}
                      />
                    </>
                  )}
                </div>
              )}
            </>
          );
        })()}

        {tab === 'deliveries' && (
          <>
            {!selectedDelivery && (
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-1">Organizaci&oacute;n de Entregas</h1>
                <p className="text-gray-600 text-sm">
                  Pedidos confirmados listos para entregar. Marca cada uno como listo (env&iacute;a aviso al cliente) y luego como entregado al confirmar la recepci&oacute;n.
                </p>
              </div>
            )}

            {!selectedDelivery ? (
              /* ─── MODO LISTA ─── */
              <DeliveriesTable
                onSelectPreorder={setSelectedDelivery}
                selectedId={null}
                refreshKey={deliveriesRefreshKey}
              />
            ) : (
              /* ─── MODO DETALLE ─── */
              <div className="max-w-3xl mx-auto space-y-6">
                <DetailHeader
                  onBack={() => setSelectedDelivery(null)}
                  backLabel="Volver a entregas"
                  badge={selectedDelivery.folio || selectedDelivery.legacy_order_number || selectedDelivery.order_number}
                  title={selectedDelivery.name}
                  subtitle={selectedDelivery.company || null}
                />

                <DeliveryReadyMailer
                  preorder={selectedDelivery}
                  onEmailSent={handleDeliveryReadySent}
                />
              </div>
            )}
          </>
        )}

        {tab === 'purchases' && (() => {
          const inDetailMode = selectedPO !== null || poMode !== 'empty' || showBulkPOImport;
          const exitDetailMode = () => {
            setSelectedPO(null);
            setPOMode('empty');
            setShowBulkPOImport(false);
          };
          return (
            <>
              {!inDetailMode && (
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-white mb-1">Abastecimiento &mdash; &Oacute;rdenes de Compra</h1>
                  <p className="text-gray-600 text-sm">
                    Registra lo que se compra a Panini y otros proveedores. Al recibirse el producto, el almacenista cierra la recepci&oacute;n y el stock sube autom&aacute;ticamente.
                  </p>
                </div>
              )}
              {!inDetailMode ? (
                <PurchaseOrdersTable
                  onSelectPO={(po) => { handlePOSelect(po); setShowBulkPOImport(false); }}
                  selectedId={null}
                  onCreateNew={() => { handlePOCreateNew(); setShowBulkPOImport(false); }}
                  onImportCSV={isAdmin ? () => { setShowBulkPOImport(true); setSelectedPO(null); setPOMode('empty'); } : undefined}
                  refreshKey={poRefreshKey}
                />
              ) : (
                <div className="max-w-3xl mx-auto space-y-6">
                  <DetailHeader
                    onBack={exitDetailMode}
                    backLabel="Volver a órdenes de compra"
                    badge={selectedPO?.folio ?? null}
                    title={
                      selectedPO?.supplier ??
                      (showBulkPOImport ? 'Importación masiva de POs' : poMode === 'create' ? 'Nueva orden de compra' : null)
                    }
                    subtitle={selectedPO?.status ?? null}
                  />
                  {showBulkPOImport ? (
                    <BulkPOImport
                      isAdmin={isAdmin}
                      onClose={() => setShowBulkPOImport(false)}
                      onImported={() => setPORefreshKey((k) => k + 1)}
                    />
                  ) : (
                    <PurchaseOrderEditor
                      selectedPO={selectedPO}
                      mode={poMode}
                      onModeChange={setPOMode}
                      onSelectPO={setSelectedPO}
                      onChanged={handlePOChanged}
                      isAdmin={isAdmin}
                    />
                  )}
                </div>
              )}
            </>
          );
        })()}

        {tab === 'receptions' && (() => {
          const inDetailMode = selectedReception !== null || recMode !== 'empty';
          const exitDetailMode = () => {
            setSelectedReception(null);
            setRecMode('empty');
          };
          return (
            <>
              {!inDetailMode && (
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-white mb-1">Recepci&oacute;n de Mercader&iacute;a</h1>
                  <p className="text-gray-600 text-sm">
                    Registra lo que llega f&iacute;sicamente. Al cerrar la recepci&oacute;n, el sistema sube el stock autom&aacute;ticamente y actualiza el estado de la PO.
                  </p>
                </div>
              )}
              {!inDetailMode ? (
                <ReceptionsTable
                  onSelectReception={handleReceptionSelect}
                  selectedId={null}
                  onCreateNew={handleReceptionCreateNew}
                  refreshKey={recRefreshKey}
                />
              ) : (
                <div className="max-w-3xl mx-auto space-y-6">
                  <DetailHeader
                    onBack={exitDetailMode}
                    backLabel="Volver a recepciones"
                    badge={selectedReception?.folio ?? null}
                    title={
                      selectedReception
                        ? `Recepción ${selectedReception.status}`
                        : recMode === 'pick_po' ? 'Nueva recepción' : null
                    }
                    subtitle={selectedReception?.received_at ? new Date(selectedReception.received_at).toLocaleDateString('es-MX') : null}
                  />
                  <ReceptionEditor
                    selectedReception={selectedReception}
                    mode={recMode}
                    onModeChange={setRecMode}
                    onSelectReception={setSelectedReception}
                    onChanged={handleReceptionChanged}
                    canWrite={canManageReceptions}
                  />
                </div>
              )}
            </>
          );
        })()}

        {tab === 'inventory' && (() => {
          const inDetailMode = selectedStockRow !== null;
          return (
            <>
              {!inDetailMode && (
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-white mb-1">Inventario</h1>
                  <p className="text-gray-600 text-sm">
                    Stock en tiempo real por almac&eacute;n. Cualquier cambio queda registrado en el kardex y respeta los invariantes (no negativo, no sobre-reservar).
                  </p>
                </div>
              )}
              {!inDetailMode ? (
                <StockTable
                  selectedKey={null}
                  onSelectRow={setSelectedStockRow}
                  refreshKey={stockRefreshKey}
                />
              ) : (
                <div className="max-w-3xl mx-auto space-y-6">
                  <DetailHeader
                    onBack={() => setSelectedStockRow(null)}
                    backLabel="Volver a inventario"
                    badge={selectedStockRow!.product_sku}
                    title={selectedStockRow!.product_name}
                    subtitle={selectedStockRow!.warehouse_code}
                  />
                  <InventoryEditor
                    selectedRow={selectedStockRow}
                    canWrite={canManageInventory}
                    onChanged={handleInventoryChanged}
                  />
                </div>
              )}
            </>
          );
        })()}

        {tab === 'catalog' && (() => {
          const inDetailMode = selectedProduct !== null || productMode !== 'empty';
          const exitDetailMode = () => {
            setSelectedProduct(null);
            setProductMode('empty');
          };
          return (
            <>
              {!inDetailMode && (
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-white mb-1">Cat&aacute;logo de Productos</h1>
                  <p className="text-gray-600 text-sm">
                    Maestro de SKUs. Solo admin puede crear, editar y desactivar. Los productos desactivados no aparecen en POs nuevas pero los registros hist&oacute;ricos se conservan intactos.
                  </p>
                </div>
              )}
              {!inDetailMode ? (
                <ProductsTable
                  selectedId={null}
                  onSelect={handleProductSelect}
                  onCreateNew={handleProductCreateNew}
                  refreshKey={productRefreshKey}
                />
              ) : (
                <div className="max-w-3xl mx-auto space-y-6">
                  <DetailHeader
                    onBack={exitDetailMode}
                    backLabel="Volver al catálogo"
                    badge={selectedProduct?.sku ?? null}
                    title={selectedProduct?.name ?? (productMode === 'create' ? 'Nuevo producto' : null)}
                    subtitle={selectedProduct?.active === false ? 'Inactivo' : null}
                  />
                  <ProductEditor
                    selected={selectedProduct}
                    mode={productMode}
                    onModeChange={setProductMode}
                    onSelect={setSelectedProduct}
                    onChanged={handleProductChanged}
                    isAdmin={isAdmin}
                  />
                </div>
              )}
            </>
          );
        })()}

        {tab === 'picking' && (() => {
          const inDetailMode = selectedPicking !== null || pickingMode !== 'empty';
          const exitDetailMode = () => {
            setSelectedPicking(null);
            setPickingMode('empty');
          };
          return (
            <>
              {!inDetailMode && (
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-white mb-1">Picking &mdash; Listas de Surtido</h1>
                  <p className="text-gray-600 text-sm">
                    Genera y ejecuta listas de surtido contra pedidos confirmados. Al cerrar, se libera la reserva, se descuenta stock y el pedido pasa a <strong>preparando</strong> o <strong>listo</strong>.
                  </p>
                </div>
              )}
              {!inDetailMode ? (
                <PickingListsTable
                  selectedId={null}
                  onSelect={handlePickingSelect}
                  onCreateNew={handlePickingCreateNew}
                  refreshKey={pickingRefreshKey}
                />
              ) : (
                <div className="max-w-3xl mx-auto space-y-6">
                  <DetailHeader
                    onBack={exitDetailMode}
                    backLabel="Volver a picking"
                    badge={selectedPicking?.folio ?? null}
                    title={
                      selectedPicking ? `Picking de ${selectedPicking.order_id?.slice(0, 8) ?? 'pedido'}` :
                      pickingMode === 'pick_order' ? 'Nueva picking' : null
                    }
                    subtitle={selectedPicking?.status ?? null}
                  />
                  <PickingListEditor
                    selected={selectedPicking}
                    mode={pickingMode}
                    onModeChange={setPickingMode}
                    onSelect={setSelectedPicking}
                    onChanged={handlePickingChanged}
                    canWrite={canManagePicking}
                  />
                </div>
              )}
            </>
          );
        })()}

        {tab === 'delivery_docs' && (() => {
          const inDetailMode = selectedDeliveryDoc !== null || ddMode !== 'empty';
          const exitDetailMode = () => {
            setSelectedDeliveryDoc(null);
            setDDMode('empty');
          };
          return (
            <>
              {!inDetailMode && (
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-white mb-1">Documentos de Entrega</h1>
                  <p className="text-gray-600 text-sm">
                    Generaci&oacute;n del comprobante de salida con firma del receptor (touch screen). Al firmar, el pedido transita a <strong>entregado</strong> autom&aacute;ticamente.
                  </p>
                </div>
              )}
              {!inDetailMode ? (
                <DeliveryDocumentsTable
                  selectedId={null}
                  onSelect={handleDDSelect}
                  onCreateNew={handleDDCreateNew}
                  refreshKey={ddRefreshKey}
                />
              ) : (
                <div className="max-w-3xl mx-auto space-y-6">
                  <DetailHeader
                    onBack={exitDetailMode}
                    backLabel="Volver a documentos de entrega"
                    badge={selectedDeliveryDoc?.folio ?? null}
                    title={selectedDeliveryDoc?.receiver_name ?? (ddMode === 'pick_order' ? 'Nuevo documento de entrega' : null)}
                    subtitle={selectedDeliveryDoc?.status ?? null}
                  />
                  <DeliveryDocumentEditor
                    selected={selectedDeliveryDoc}
                    mode={ddMode}
                    onModeChange={setDDMode}
                    onSelect={setSelectedDeliveryDoc}
                    onChanged={handleDDChanged}
                    canWrite={canManageDelivery}
                  />
                </div>
              )}
            </>
          );
        })()}

        {tab === 'email_templates' && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-1">Plantillas de correo al cliente</h1>
              <p className="text-gray-600 text-sm">
                Vista previa de los 4 correos transaccionales que reciben los clientes en distintas etapas del pedido. Usan datos de ejemplo &mdash; al disparar la acci&oacute;n real, los datos vienen del pedido en cuesti&oacute;n.
              </p>
            </div>
            <EmailPreviewGallery />
          </>
        )}

        {tab === 'users' && (() => {
          const inDetailMode = selectedUserProfile !== null;
          return (
            <>
              {!inDetailMode && (
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-white mb-1">Usuarios &amp; Roles</h1>
                  <p className="text-gray-600 text-sm">
                    Gesti&oacute;n de usuarios del sistema. Solo <strong className="text-amber-400">admin</strong> puede asignar roles. Los nuevos usuarios aparecen autom&aacute;ticamente como <strong className="text-gray-400">Pendiente</strong> al registrarse y deben recibir un rol antes de poder operar.
                  </p>
                </div>
              )}
              {!inDetailMode ? (
                <UsersTable
                  selectedId={null}
                  onSelect={setSelectedUserProfile}
                  refreshKey={usersRefreshKey}
                />
              ) : (
                <div className="max-w-3xl mx-auto space-y-6">
                  <DetailHeader
                    onBack={() => setSelectedUserProfile(null)}
                    backLabel="Volver a usuarios"
                    badge={selectedUserProfile!.role ?? 'pending'}
                    title={selectedUserProfile!.full_name ?? selectedUserProfile!.user_id.slice(0, 8)}
                    subtitle={selectedUserProfile!.active === false ? 'Inactivo' : null}
                  />
                  <UserEditor
                    selected={selectedUserProfile}
                    isAdmin={isAdmin}
                    currentUserId={currentUserId}
                    onChanged={() => setUsersRefreshKey((k) => k + 1)}
                    onClose={() => setSelectedUserProfile(null)}
                  />
                </div>
              )}
            </>
          );
        })()}

        {tab === 'audit' && (() => {
          const inDetailMode = selectedAuditEntry !== null;
          return (
            <>
              {!inDetailMode && (
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-white mb-1">Auditor&iacute;a</h1>
                  <p className="text-gray-600 text-sm">
                    Bit&aacute;cora append-only de todos los cambios en tablas cr&iacute;ticas. Cada registro guarda qui&eacute;n, qu&eacute;, cu&aacute;ndo y el diff completo del cambio.
                  </p>
                </div>
              )}
              {!inDetailMode ? (
                <AuditLogTable
                  selectedId={null}
                  onSelect={setSelectedAuditEntry}
                />
              ) : (
                <div className="max-w-3xl mx-auto space-y-6">
                  <DetailHeader
                    onBack={() => setSelectedAuditEntry(null)}
                    backLabel="Volver al log"
                    badge={selectedAuditEntry!.action}
                    title={selectedAuditEntry!.entity_type}
                    subtitle={new Date(selectedAuditEntry!.created_at).toLocaleString('es-MX')}
                  />
                  <AuditLogDetail entry={selectedAuditEntry} />
                </div>
              )}
            </>
          );
        })()}

        {tab === 'mailing' && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-1">Mailing a Contactos</h1>
              <p className="text-gray-600 text-sm">
                Selecciona los contactos en la tabla y redacta tu mensaje para enviarlo por correo electronico.
              </p>
            </div>
            <div className="grid xl:grid-cols-5 gap-6">
              <div className="xl:col-span-3">
                <ContactsTable
                  onSelectContacts={setSelectedContacts}
                  selectedEmails={selectedContacts.map((c) => c.email)}
                />
              </div>
              <div className="xl:col-span-2">
                <MailingComposer
                  selectedContacts={selectedContacts}
                  onClearSelection={() => setSelectedContacts([])}
                />
              </div>
            </div>
          </>
        )}
        </main>
      </div>
    </div>
  );
}
