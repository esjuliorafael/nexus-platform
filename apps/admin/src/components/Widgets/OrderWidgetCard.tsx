import React from 'react';
import { Package, Clock, CheckCircle2, XCircle, Hash, ArrowRight } from 'lucide-react';
import { Order } from '../../types';
import { NexusWidgetCard } from '../ui/NexusCard';
import { NexusCardButton } from '../ui/NexusButton';

interface OrderWidgetCardProps {
  order?: Order;
  isLoading?: boolean;
  onViewDetail?: (order: Order) => void;
  onMarkAsPaid?: (id: string) => void;
  onCancelOrder?: (id: string) => void;
}

export const OrderWidgetCardSkeleton: React.FC = () => (
  <div className="flex items-center gap-4 p-2 bg-bg-card rounded-xl border border-border-main/50 animate-pulse">
    <div className="w-10 h-10 rounded-lg bg-stone-100 shrink-0" />
    <div className="flex-1 min-w-0 flex flex-col gap-2">
      <div className="h-3 w-32 bg-stone-100 rounded-full" />
      <div className="h-2.5 w-44 bg-stone-50 rounded-full" />
    </div>
  </div>
);

export const OrderWidgetCard: React.FC<OrderWidgetCardProps> = ({ 
  order, 
  isLoading = false,
  onViewDetail,
  onMarkAsPaid,
  onCancelOrder
}) => {

  if (isLoading || !order) return <OrderWidgetCardSkeleton />;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid':
        return {
          pillStyle: 'bg-emerald-50 text-emerald-600 border-emerald-100',
          icon: <CheckCircle2 size={10} strokeWidth={2.5} />,
          label: 'Pagado',
          variant: 'emerald' as const
        };
      case 'pending':
        return {
          pillStyle: 'bg-amber-50 text-amber-600 border-amber-100',
          icon: <Clock size={10} strokeWidth={2.5} />,
          label: 'Pendiente',
          variant: 'brand' as const
        };
      case 'cancelled':
        return {
          pillStyle: 'bg-rose-50 text-rose-600 border-rose-100',
          icon: <XCircle size={10} strokeWidth={2.5} />,
          label: 'Cancelado',
          variant: 'muted' as const
        };
      default:
        return {
          pillStyle: 'bg-stone-50 text-stone-400 border-stone-100',
          icon: <Package size={10} strokeWidth={2.5} />,
          label: status,
          variant: 'muted' as const
        };
    }
  };

  const statusConfig = getStatusConfig(order.status);
  
  const itemsSummary = order.items.length > 0
    ? `${order.items[0].name}${order.items.length > 1 ? ` +${order.items.length - 1} más` : ''}`
    : 'Sin productos';

  return (
    <NexusWidgetCard
      icon={Package}
      iconVariant={statusConfig.variant}
      isMuted={order.status === 'cancelled'}
      onClick={() => onViewDetail?.(order)}
      title={
        <div className="flex flex-col min-w-0" style={{ gap: 'var(--space-xs)' }}>
          <div className="flex items-center gap-2">
             <div className="flex items-center gap-1 px-1.5 py-0.5 bg-bg-muted text-text-muted border border-border-main rounded-md">
               <Hash size={9} strokeWidth={2.5} />
               <span className="text-[9px] font-bold uppercase tracking-widest">{order.id}</span>
             </div>
             <div className={`flex items-center gap-1 px-1.5 py-0.5 border rounded-md ${statusConfig.pillStyle}`}>
                {statusConfig.icon}
                <span className="text-[9px] font-bold uppercase tracking-widest leading-none mt-0.5">{statusConfig.label}</span>
             </div>
          </div>
          <h4 className="text-secondary font-bold text-text-main truncate group-hover/card:text-brand-600 transition-colors duration-500">
            {order.customer}
          </h4>
        </div>
      }
      subtitle={itemsSummary}
      rightContent={
        <div className="flex flex-col items-end" style={{ gap: '0' }}>
          <span className="text-[9px] uppercase tracking-widest text-stone-400 font-bold">Total</span>
          <div className="flex items-baseline text-h2 font-bold text-text-main">
            <span className="text-[10px] mr-0.5 opacity-50 font-bold">$</span>
            <span className="tabular-nums">{order.total.toLocaleString()}</span>
          </div>
        </div>
      }
      actions={onViewDetail && (
        <NexusCardButton 
          variant="secondary" 
          isIconOnly 
          icon={ArrowRight} 
          onClick={() => onViewDetail(order)} 
        />
      )}
    />
  );
};
