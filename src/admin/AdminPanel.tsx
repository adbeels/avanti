import { useState, useEffect } from 'react';
import {
  LogOut, ShieldCheck, Mail, Package, Truck, ShoppingBag, Inbox, Boxes, Tag,
  ClipboardList, FileSignature, Menu, X, ChevronRight, User as UserIcon, History,
  Users as UsersIcon, MailCheck,
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
        {tab === 'preorders' && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-1">Gestion de Prepedidos</h1>
              <p className="text-gray-600 text-sm">
                Administra los prepedidos, cambia su estado y envia correos de confirmación con solicitud de pago.
              </p>
            </div>
            <PreordersDashboard preorders={preorders} />
            <div className="grid 2xl:grid-cols-3 gap-6 items-start">
              <div className="2xl:col-span-2 min-w-0">
                <PreordersTable
                  onSelectPreorder={(p) => { setSelectedPreorder(p); setShowExternalOrderForm(false); setShowBulkOrderImport(false); }}
                  selectedId={selectedPreorder?.id || null}
                  onPreordersChange={setPreorders}
                  onCreateExternal={isAdmin ? () => { setShowExternalOrderForm(true); setShowBulkOrderImport(false); setSelectedPreorder(null); } : undefined}
                  onBulkImport={isAdmin ? () => { setShowBulkOrderImport(true); setShowExternalOrderForm(false); setSelectedPreorder(null); } : undefined}
                  refreshKey={preordersRefreshKey}
                />
              </div>
              <div className="2xl:col-span-1 2xl:sticky 2xl:top-20 max-h-[calc(100vh-80px)] overflow-y-auto space-y-6 pr-1 pb-8">
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
                    <AutoSendConfig />
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
            </div>
          </>
        )}

        {tab === 'deliveries' && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-1">Organizaci&oacute;n de Entregas</h1>
              <p className="text-gray-600 text-sm">
                Pedidos confirmados listos para entregar. Marca cada uno como listo (env&iacute;a aviso al cliente) y luego como entregado al confirmar la recepci&oacute;n.
              </p>
            </div>
            <div className="grid 2xl:grid-cols-3 gap-6 items-start">
              <div className="2xl:col-span-2 min-w-0">
                <DeliveriesTable
                  onSelectPreorder={setSelectedDelivery}
                  selectedId={selectedDelivery?.id || null}
                  refreshKey={deliveriesRefreshKey}
                />
              </div>
              <div className="2xl:col-span-1 2xl:sticky 2xl:top-20 max-h-[calc(100vh-80px)] overflow-y-auto space-y-6 pr-1 pb-8">
                <DeliveryReadyMailer
                  preorder={selectedDelivery}
                  onEmailSent={handleDeliveryReadySent}
                />
              </div>
            </div>
          </>
        )}

        {tab === 'purchases' && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-1">Abastecimiento &mdash; &Oacute;rdenes de Compra</h1>
              <p className="text-gray-600 text-sm">
                Registra lo que se compra a Panini y otros proveedores. Al recibirse el producto, el almacenista cierra la recepci&oacute;n y el stock sube autom&aacute;ticamente.
              </p>
            </div>
            <div className="grid 2xl:grid-cols-3 gap-6 items-start">
              <div className="2xl:col-span-2 min-w-0">
                <PurchaseOrdersTable
                  onSelectPO={(po) => { handlePOSelect(po); setShowBulkPOImport(false); }}
                  selectedId={selectedPO?.id || null}
                  onCreateNew={() => { handlePOCreateNew(); setShowBulkPOImport(false); }}
                  onImportCSV={isAdmin ? () => { setShowBulkPOImport(true); setSelectedPO(null); setPOMode('empty'); } : undefined}
                  refreshKey={poRefreshKey}
                />
              </div>
              <div className="2xl:col-span-1 2xl:sticky 2xl:top-20 max-h-[calc(100vh-80px)] overflow-y-auto space-y-6 pr-1 pb-8">
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
            </div>
          </>
        )}

        {tab === 'receptions' && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-1">Recepci&oacute;n de Mercader&iacute;a</h1>
              <p className="text-gray-600 text-sm">
                Registra lo que llega f&iacute;sicamente. Al cerrar la recepci&oacute;n, el sistema sube el stock autom&aacute;ticamente y actualiza el estado de la PO.
              </p>
            </div>
            <div className="grid 2xl:grid-cols-3 gap-6 items-start">
              <div className="2xl:col-span-2 min-w-0">
                <ReceptionsTable
                  onSelectReception={handleReceptionSelect}
                  selectedId={selectedReception?.id || null}
                  onCreateNew={handleReceptionCreateNew}
                  refreshKey={recRefreshKey}
                />
              </div>
              <div className="2xl:col-span-1 2xl:sticky 2xl:top-20 max-h-[calc(100vh-80px)] overflow-y-auto space-y-6 pr-1 pb-8">
                <ReceptionEditor
                  selectedReception={selectedReception}
                  mode={recMode}
                  onModeChange={setRecMode}
                  onSelectReception={setSelectedReception}
                  onChanged={handleReceptionChanged}
                  canWrite={canManageReceptions}
                />
              </div>
            </div>
          </>
        )}

        {tab === 'inventory' && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-1">Inventario</h1>
              <p className="text-gray-600 text-sm">
                Stock en tiempo real por almac&eacute;n. Cualquier cambio queda registrado en el kardex y respeta los invariantes (no negativo, no sobre-reservar).
              </p>
            </div>
            <div className="grid 2xl:grid-cols-3 gap-6 items-start">
              <div className="2xl:col-span-2 min-w-0">
                <StockTable
                  selectedKey={selectedStockRow ? `${selectedStockRow.product_id}:${selectedStockRow.warehouse_id}` : null}
                  onSelectRow={setSelectedStockRow}
                  refreshKey={stockRefreshKey}
                />
              </div>
              <div className="2xl:col-span-1 2xl:sticky 2xl:top-20 max-h-[calc(100vh-80px)] overflow-y-auto space-y-6 pr-1 pb-8">
                <InventoryEditor
                  selectedRow={selectedStockRow}
                  canWrite={canManageInventory}
                  onChanged={handleInventoryChanged}
                />
              </div>
            </div>
          </>
        )}

        {tab === 'catalog' && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-1">Cat&aacute;logo de Productos</h1>
              <p className="text-gray-600 text-sm">
                Maestro de SKUs. Solo admin puede crear, editar y desactivar. Los productos desactivados no aparecen en POs nuevas pero los registros hist&oacute;ricos se conservan intactos.
              </p>
            </div>
            <div className="grid 2xl:grid-cols-3 gap-6 items-start">
              <div className="2xl:col-span-2 min-w-0">
                <ProductsTable
                  selectedId={selectedProduct?.id || null}
                  onSelect={handleProductSelect}
                  onCreateNew={handleProductCreateNew}
                  refreshKey={productRefreshKey}
                />
              </div>
              <div className="2xl:col-span-1 2xl:sticky 2xl:top-20 max-h-[calc(100vh-80px)] overflow-y-auto space-y-6 pr-1 pb-8">
                <ProductEditor
                  selected={selectedProduct}
                  mode={productMode}
                  onModeChange={setProductMode}
                  onSelect={setSelectedProduct}
                  onChanged={handleProductChanged}
                  isAdmin={isAdmin}
                />
              </div>
            </div>
          </>
        )}

        {tab === 'picking' && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-1">Picking &mdash; Listas de Surtido</h1>
              <p className="text-gray-600 text-sm">
                Genera y ejecuta listas de surtido contra pedidos confirmados. Al cerrar, se libera la reserva, se descuenta stock y el pedido pasa a <strong>preparando</strong> o <strong>listo</strong>.
              </p>
            </div>
            <div className="grid 2xl:grid-cols-3 gap-6 items-start">
              <div className="2xl:col-span-2 min-w-0">
                <PickingListsTable
                  selectedId={selectedPicking?.id || null}
                  onSelect={handlePickingSelect}
                  onCreateNew={handlePickingCreateNew}
                  refreshKey={pickingRefreshKey}
                />
              </div>
              <div className="2xl:col-span-1 2xl:sticky 2xl:top-20 max-h-[calc(100vh-80px)] overflow-y-auto space-y-6 pr-1 pb-8">
                <PickingListEditor
                  selected={selectedPicking}
                  mode={pickingMode}
                  onModeChange={setPickingMode}
                  onSelect={setSelectedPicking}
                  onChanged={handlePickingChanged}
                  canWrite={canManagePicking}
                />
              </div>
            </div>
          </>
        )}

        {tab === 'delivery_docs' && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-1">Documentos de Entrega</h1>
              <p className="text-gray-600 text-sm">
                Generaci&oacute;n del comprobante de salida con firma del receptor (touch screen). Al firmar, el pedido transita a <strong>entregado</strong> autom&aacute;ticamente.
              </p>
            </div>
            <div className="grid 2xl:grid-cols-3 gap-6 items-start">
              <div className="2xl:col-span-2 min-w-0">
                <DeliveryDocumentsTable
                  selectedId={selectedDeliveryDoc?.id || null}
                  onSelect={handleDDSelect}
                  onCreateNew={handleDDCreateNew}
                  refreshKey={ddRefreshKey}
                />
              </div>
              <div className="2xl:col-span-1 2xl:sticky 2xl:top-20 max-h-[calc(100vh-80px)] overflow-y-auto space-y-6 pr-1 pb-8">
                <DeliveryDocumentEditor
                  selected={selectedDeliveryDoc}
                  mode={ddMode}
                  onModeChange={setDDMode}
                  onSelect={setSelectedDeliveryDoc}
                  onChanged={handleDDChanged}
                  canWrite={canManageDelivery}
                />
              </div>
            </div>
          </>
        )}

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

        {tab === 'users' && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-1">Usuarios &amp; Roles</h1>
              <p className="text-gray-600 text-sm">
                Gesti&oacute;n de usuarios del sistema. Solo <strong className="text-amber-400">admin</strong> puede asignar roles. Los nuevos usuarios aparecen autom&aacute;ticamente como <strong className="text-gray-400">Pendiente</strong> al registrarse y deben recibir un rol antes de poder operar.
              </p>
            </div>
            <div className="grid 2xl:grid-cols-3 gap-6 items-start">
              <div className="2xl:col-span-2 min-w-0">
                <UsersTable
                  selectedId={selectedUserProfile?.user_id ?? null}
                  onSelect={setSelectedUserProfile}
                  refreshKey={usersRefreshKey}
                />
              </div>
              <div className="2xl:col-span-1 2xl:sticky 2xl:top-20 max-h-[calc(100vh-80px)] overflow-y-auto space-y-6 pr-1 pb-8">
                <UserEditor
                  selected={selectedUserProfile}
                  isAdmin={isAdmin}
                  currentUserId={currentUserId}
                  onChanged={() => setUsersRefreshKey((k) => k + 1)}
                  onClose={() => setSelectedUserProfile(null)}
                />
              </div>
            </div>
          </>
        )}

        {tab === 'audit' && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-1">Auditor&iacute;a</h1>
              <p className="text-gray-600 text-sm">
                Bit&aacute;cora append-only de todos los cambios en tablas cr&iacute;ticas. Cada registro guarda qui&eacute;n, qu&eacute;, cu&aacute;ndo y el diff completo del cambio.
              </p>
            </div>
            <div className="grid 2xl:grid-cols-3 gap-6 items-start">
              <div className="2xl:col-span-2 min-w-0">
                <AuditLogTable
                  selectedId={selectedAuditEntry?.id ?? null}
                  onSelect={setSelectedAuditEntry}
                />
              </div>
              <div className="2xl:col-span-1 2xl:sticky 2xl:top-20 max-h-[calc(100vh-80px)] overflow-y-auto space-y-6 pr-1 pb-8">
                <AuditLogDetail entry={selectedAuditEntry} />
              </div>
            </div>
          </>
        )}

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
