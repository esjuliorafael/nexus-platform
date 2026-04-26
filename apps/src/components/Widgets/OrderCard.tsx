import React from 'react';
import { Package, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Order } from '../../types';

interface OrderCardProps {
  order: Order;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
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
    // ESTÁNDAR: rounded-3xl (Tarjeta pequeña de widget), border-stone-200
    <div className="flex items-center justify-between p-4 bg-white rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow duration-200 group">
      {/* Left: Icon & Customer Info */}
      <div className="flex items-center gap-4">
        {/* Icon: rounded-2xl */}
        <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center text-stone-400 group-hover:bg-brand-50 group-hover:text-brand-500 group-hover:border-brand-100 transition-colors shrink-0">
          <Package size={20} strokeWidth={1.5} />
        </div>
        <div className="flex flex-col">
          <h4 className="font-bold text-stone-800 text-sm leading-tight">{order.customer}</h4>
          <span className="text-xs text-stone-400 font-medium mt-0.5 line-clamp-1">
            {order.items.length > 0 
              ? `${order.items[0].name}${order.items.length > 1 ? ` +${order.items.length - 1} más` : ''}`
              : 'Sin productos'}
          </span>
        </div>
      </div>
      
      {/* Right: Total & Status Stack */}
      <div className="flex flex-col items-end gap-1.5">
        <span className="font-black text-stone-800 text-sm">${order.total.toLocaleString()}</span>
        {/* Píldora de estado pequeña */}
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${statusConfig.style}`}>
          {statusConfig.icon}
          <span className="capitalize">{statusConfig.label}</span>
        </div>
      </div>
    </div>
  );
};