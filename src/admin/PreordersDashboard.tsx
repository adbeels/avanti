import { useMemo } from 'react';
import {
  TrendingUp, DollarSign, Package, Users, CheckCircle2, Clock,
  AlertCircle, XCircle, ShoppingCart, Banknote, PackageX, Globe,
} from 'lucide-react';
import { Preorder, SALES_CHANNEL_CONFIG, type SalesChannel } from './PreordersTable';

interface PreordersDashboardProps {
  preorders: Preorder[];
}

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });
}

export default function PreordersDashboard({ preorders }: PreordersDashboardProps) {
  const stats = useMemo(() => {
    const pending = preorders.filter(p => p.status === 'pending');
    const contacted = preorders.filter(p => p.status === 'contacted');
    const confirmed = preorders.filter(p => p.status === 'confirmed');
    const partial_payment = preorders.filter(p => p.status === 'partial_payment');
    const backorder = preorders.filter(p => p.status === 'backorder');
    const cancelled = preorders.filter(p => p.status === 'cancelled');

    const channelBreakdown = preorders.reduce((acc, p) => {
      const ch = p.sales_channel ?? 'web';
      if (!acc[ch]) acc[ch] = { count: 0, revenue: 0 };
      acc[ch].count += 1;
      if (p.status === 'confirmed' || p.status === 'backorder') acc[ch].revenue += p.total;
      return acc;
    }, {} as Record<SalesChannel, { count: number; revenue: number }>);

    const totalRevenue = confirmed.reduce((sum, p) => sum + p.total, 0);
    const potentialRevenue = [...pending, ...contacted, ...partial_payment].reduce((sum, p) => sum + p.total, 0);
    const averageOrderValue = preorders.length > 0
      ? preorders.reduce((sum, p) => sum + p.total, 0) / preorders.length
      : 0;

    const totalItems = preorders.reduce((sum, p) =>
      sum + p.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );

    const productsBreakdown = preorders.reduce((acc, p) => {
      p.items.forEach(item => {
        if (!acc[item.product]) {
          acc[item.product] = { quantity: 0, revenue: 0 };
        }
        acc[item.product].quantity += item.quantity;
        acc[item.product].revenue += item.subtotal;
      });
      return acc;
    }, {} as Record<string, { quantity: number; revenue: number }>);

    const topProducts = Object.entries(productsBreakdown)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 4);

    const today = new Date();
    const last7Days = preorders.filter(p => {
      const date = new Date(p.created_at);
      const diffTime = today.getTime() - date.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    });

    const conversionRate = preorders.length > 0
      ? (confirmed.length / preorders.length) * 100
      : 0;

    const partialPaid = partial_payment.reduce((sum, p) => sum + (p.partial_payment_amount ?? 0), 0);
    const partialPending = partial_payment.reduce((sum, p) => sum + (p.total - (p.partial_payment_amount ?? 0)), 0);

    return {
      total: preorders.length,
      pending: pending.length,
      contacted: contacted.length,
      confirmed: confirmed.length,
      partial_payment: partial_payment.length,
      backorder: backorder.length,
      cancelled: cancelled.length,
      totalRevenue,
      potentialRevenue,
      averageOrderValue,
      totalItems,
      topProducts,
      last7Days: last7Days.length,
      conversionRate,
      partialPaid,
      partialPending,
      channelBreakdown,
    };
  }, [preorders]);

  const StatCard = ({
    icon: Icon,
    label,
    value,
    subtitle,
    color = 'amber',
    trend,
  }: {
    icon: any;
    label: string;
    value: string | number;
    subtitle?: string;
    color?: 'amber' | 'green' | 'blue' | 'orange' | 'red' | 'gray' | 'purple';
    trend?: string;
  }) => {
    const colors = {
      amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      green: 'text-green-400 bg-green-500/10 border-green-500/20',
      blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
      red: 'text-red-400 bg-red-500/10 border-red-500/20',
      gray: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
      purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    };

    return (
      <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg border ${colors[color]}`}>
            <Icon size={18} />
          </div>
          {trend && (
            <span className="text-xs text-green-400 font-medium">{trend}</span>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">{label}</p>
          <p className="text-white text-2xl font-bold">{value}</p>
          {subtitle && (
            <p className="text-gray-600 text-xs">{subtitle}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Total Prepedidos"
          value={stats.total}
          subtitle={`${stats.last7Days} en últimos 7 días`}
          color="amber"
        />
        <StatCard
          icon={DollarSign}
          label="Ingresos Confirmados"
          value={formatMXN(stats.totalRevenue)}
          subtitle={`${stats.confirmed} pedidos pagados`}
          color="green"
        />
        <StatCard
          icon={TrendingUp}
          label="Ingresos Potenciales"
          value={formatMXN(stats.potentialRevenue)}
          subtitle={`${stats.pending + stats.contacted + stats.partial_payment} en proceso`}
          color="blue"
        />
        <StatCard
          icon={Users}
          label="Ticket Promedio"
          value={formatMXN(stats.averageOrderValue)}
          subtitle={`${stats.totalItems} productos total`}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart size={16} className="text-amber-400" />
            <h3 className="text-white font-semibold text-sm">Estado de Pedidos</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-amber-400" />
                <span className="text-white text-sm font-medium">Pendientes</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-amber-400 font-bold">{stats.pending}</span>
                <span className="text-gray-600 text-xs">
                  {stats.total > 0 ? ((stats.pending / stats.total) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-blue-400" />
                <span className="text-white text-sm font-medium">Contactados</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-blue-400 font-bold">{stats.contacted}</span>
                <span className="text-gray-600 text-xs">
                  {stats.total > 0 ? ((stats.contacted / stats.total) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-400" />
                <span className="text-white text-sm font-medium">Confirmados</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-400 font-bold">{stats.confirmed}</span>
                <span className="text-gray-600 text-xs">
                  {stats.total > 0 ? ((stats.confirmed / stats.total) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </div>
            <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <Banknote size={14} className="text-orange-400" />
                  <span className="text-white text-sm font-medium">Pago parcial</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-orange-400 font-bold">{stats.partial_payment}</span>
                  <span className="text-gray-600 text-xs">
                    {stats.total > 0 ? ((stats.partial_payment / stats.total) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              </div>
              {stats.partial_payment > 0 && (
                <div className="border-t border-orange-500/10 grid grid-cols-2 divide-x divide-orange-500/10">
                  <div className="px-3 py-2">
                    <p className="text-gray-600 text-xs mb-0.5">Cobrado</p>
                    <p className="text-orange-400 text-xs font-semibold">{formatMXN(stats.partialPaid)}</p>
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-gray-600 text-xs mb-0.5">Saldo pendiente</p>
                    <p className="text-orange-300 text-xs font-semibold">{formatMXN(stats.partialPending)}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <PackageX size={14} className="text-purple-400" />
                <span className="text-white text-sm font-medium">Backorder</span>
                <span className="text-gray-600 text-[10px] italic ml-1">esperando stock</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-purple-400 font-bold">{stats.backorder}</span>
                <span className="text-gray-600 text-xs">
                  {stats.total > 0 ? ((stats.backorder / stats.total) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <XCircle size={14} className="text-red-400" />
                <span className="text-white text-sm font-medium">Cancelados</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-red-400 font-bold">{stats.cancelled}</span>
                <span className="text-gray-600 text-xs">
                  {stats.total > 0 ? ((stats.cancelled / stats.total) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-950 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package size={16} className="text-amber-400" />
            <h3 className="text-white font-semibold text-sm">Productos Más Vendidos</h3>
          </div>
          {stats.topProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-sm">
              No hay datos de productos
            </div>
          ) : (
            <div className="space-y-3">
              {stats.topProducts.map(([product, data], idx) => {
                const maxRevenue = stats.topProducts[0][1].revenue;
                const percentage = (data.revenue / maxRevenue) * 100;

                return (
                  <div key={product} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-bold text-xs w-5">#{idx + 1}</span>
                        <span className="text-white text-sm font-medium truncate">{product}</span>
                      </div>
                      <span className="text-gray-400 text-xs font-medium">{data.quantity} uds</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-amber-400 text-xs font-bold w-20 text-right">
                        {formatMXN(data.revenue)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Breakdown por canal de venta */}
      <div className="bg-gray-950 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={16} className="text-amber-400" />
          <h3 className="text-white font-semibold text-sm">Canal de Venta</h3>
        </div>
        {Object.keys(stats.channelBreakdown).length === 0 ? (
          <div className="text-center py-4 text-gray-600 text-sm">Sin datos</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {(Object.entries(stats.channelBreakdown) as [SalesChannel, { count: number; revenue: number }][])
              .sort(([, a], [, b]) => b.count - a.count)
              .map(([ch, data]) => (
                <div key={ch} className="p-3 bg-black/40 border border-gray-800 rounded-lg">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wide font-semibold mb-1">
                    {SALES_CHANNEL_CONFIG[ch]?.label ?? ch}
                  </p>
                  <p className="text-white text-xl font-bold">{data.count}</p>
                  <p className="text-green-400 text-xs">{formatMXN(data.revenue)}</p>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-br from-amber-950/40 to-amber-900/20 border border-amber-500/30 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <TrendingUp size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Tasa de Conversión</p>
              <p className="text-gray-500 text-xs">Pedidos confirmados vs total</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-amber-400 text-3xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
            <p className="text-gray-600 text-xs">{stats.confirmed} de {stats.total} pedidos</p>
          </div>
        </div>
      </div>
    </div>
  );
}
