import React from 'react';
import { Package, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Order } from '../../types';

interface OrderWidgetCardProps {
  order?: Order;
  isLoading?: boolean;
}

export const OrderWidgetCardSkeleton: React.FC = () => (
  <div className="flex items-center justify-between p-4 bg-white rounded-3xl border border-stone-200 shadow-sm animate-pulse">
    {/* Left */}
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-stone-200 shrink-0" />
      <div className="flex flex-col gap-2">
        <div className="h-3 w-28 bg-stone-200 rounded-full" />
        <div className="h-2.5 w-36 bg-stone-100 rounded-full" />
      </div>
    </div>
    {/* Right */}
    <div className="flex flex-col items-end gap-1.5">
      <div className="h-3.5 w-16 bg-stone-200 rounded-full" />
      <div className="h-4 w-20 bg-stone-100 rounded-lg" />
    </div>
  </div>
);

export const OrderWidgetCard: React.FC<OrderWidgetCardProps> = ({ order, isLoading = false }) => {

  if (isLoading || !order) return <OrderWidgetCardSkeleton />;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid':
        return {
          style: 'bg-green-500/10 text-green-600 border-green-500/20',
          icon: <CheckCircle2 size={12} strokeWidth={2.5} />,
          label: 'Pagado'
        };
      case 'pending':
        return {
          style: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
          icon: <Clock size={12} strokeWidth={2.5} />,
          label: 'Pendiente'
        };
      case 'cancelled':
        return {
          style: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
          icon: <XCircle size={12} strokeWidth={2.5} />,
          label: 'Cancelado'
        };
      default:
        return {
          style: 'bg-stone-100 text-stone-500 border-stone-200',
          icon: <Package size={12} strokeWidth={2.5} />,
          label: status
        };
    }
  };

  const statusConfig = getStatusConfig(order.status);

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow duration-200 group">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center text-stone-400 group-hover:bg-brand-50 group-hover:text-brand-500 group-hover:border-brand-100 transition-colors shrink-0">
          <Package size={20} strokeWidth={1.5} />
        </div>
        <div className="flex flex-col">
          <h4 className="font-bold text-stone-800 text-sm leading-tight">{order.customer}</h4>
          <span className="text-xs text-stone-400 font-medium mt-0.5 line-clamp-1">
            {order.items.length > 0
              ? `${order.items[0].name}${order.items.length > 1 ? ` +${order.items.length - 1} m\u00e1s` : ''}`
              : 'Sin productos'}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5">
        <span className="font-black text-stone-800 text-sm">${order.total.toLocaleString()}</span>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${statusConfig.style}`}>
          {statusConfig.icon}
          <span className="capitalize">{statusConfig.label}</span>
        </div>
      </div>
    </div>
  );
};