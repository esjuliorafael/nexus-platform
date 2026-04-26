import React, { useRef } from 'react';
import { Package, Clock, CheckCircle2, XCircle, Phone, MapPin, User, Calendar, DollarSign, Plane, Truck } from 'lucide-react';
import { Order } from '../../types';

// Sub-componente para manejar la miniatura (Foto o Video al hacer hover)
const OrderItemThumbnail = ({ item }: { item: any }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = item.imageUrl?.toLowerCase().endsWith('.mp4');

  const handleMouseEnter = () => {
    if (isVideo && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) playPromise.catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (isVideo && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  if (!item.imageUrl) {
    return (
      <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center border ${item.type === 'ave' ? 'bg-brand-50 text-brand-600 border-brand-100' : 'bg-stone-50 text-stone-500 border-stone-100'}`}>
        {item.type === 'ave' ? <Plane size={24} strokeWidth={1.5} /> : <Package size={24} strokeWidth={1.5} />}
      </div>
    );
  }

  return (
    <div 
      className="w-14 h-14 shrink-0 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 shadow-inner relative group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isVideo ? (
        <video
          ref={videoRef}
          src={item.imageUrl}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : (
        <img 
          src={item.imageUrl} 
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      )}
      <div className="absolute inset-0 bg-black/5" />
    </div>
  );
};

interface OrderDetailViewProps {
  order: Order;
  onBack: () => void;
  onMarkAsPaid: (orderId: string) => void;
  onCancelOrder: (orderId: string) => void;
}

// Utilidad para formatear fecha (YYYY-MM-DD -> DD/MM/YYYY)
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const datePart = dateStr.split(' ')[0]; 
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
};

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({ 
  order, 
  onBack,
  onMarkAsPaid,
  onCancelOrder
}) => {
  // --- Configuración de Estados Homologada ---
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid': 
        return { 
          style: 'bg-green-500/10 text-green-600 border-green-500/20', 
          icon: <CheckCircle2 size={16} strokeWidth={2.5} />,
          label: 'Pagada'
        };
      case 'pending': 
        return { 
          style: 'bg-amber-500/10 text-amber-600 border-amber-500/20', 
          icon: <Clock size={16} strokeWidth={2.5} />,
          label: 'Pendiente'
        };
      case 'cancelled': 
        return { 
          style: 'bg-rose-500/10 text-rose-600 border-rose-500/20', 
          icon: <XCircle size={16} strokeWidth={2.5} />,
          label: 'Cancelada'
        };
      default: 
        return { 
          style: 'bg-stone-100 text-stone-500 border-stone-200', 
          icon: <Package size={16} strokeWidth={2.5} />,
          label: status 
        };
    }
  };

  const statusConfig = getStatusConfig(order.status);

  const hasBirds = order.items.some(item => item.type === 'ave');
  const hasArticles = order.items.some(item => item.type === 'articulo');

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-10">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Order Summary & Items */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* General Info Card */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-stone-200 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div>
                <span className="text-xs font-black text-stone-400 tracking-widest uppercase mb-1 block">Detalle de Orden</span>
                <h2 className="text-3xl font-black text-stone-900 tracking-tight">{order.id}</h2>
              </div>
              {/* Píldora de Estado Homologada */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border shadow-sm ${statusConfig.style}`}>
                {statusConfig.icon}
                {statusConfig.label}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-stone-400">
                  <Calendar size={14} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Fecha</span>
                </div>
                {/* APLICADO: Formato de fecha corregido */}
                <p className="font-bold text-stone-800">{formatDate(order.date)}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-stone-400">
                  <DollarSign size={14} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Total</span>
                </div>
                <p className="font-bold text-stone-800">${order.total.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-stone-400">
                  <Package size={14} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Productos</span>
                </div>
                <p className="font-bold text-stone-800">{order.items.length}</p>
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="bg-white rounded-[2.5rem] overflow-hidden border border-stone-200 shadow-sm">
            <div className="p-8 border-b border-stone-100">
              <h3 className="text-xl font-black text-stone-800 tracking-tight">Productos en la Orden</h3>
            </div>
            <div className="divide-y divide-stone-100">
              {order.items.map((item) => (
                <div key={item.id} className="p-6 flex items-center justify-between hover:bg-stone-50 transition-colors">
                  <div className="flex items-center gap-4">
                    {/* Thumbnail Container */}
                    <OrderItemThumbnail item={item} />
                    <div>
                      <p className="font-bold text-stone-800 text-lg leading-tight">{item.name}</p>
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mt-1">{item.type === 'ave' ? 'Ave' : 'Artículo'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-stone-900">${item.price.toLocaleString()}</p>
                    <p className="text-xs font-bold text-stone-400">Cant: {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-8 bg-stone-50 flex justify-between items-center border-t border-stone-100">
              <span className="text-sm font-black text-stone-500 uppercase tracking-widest">Total de la Orden</span>
              <span className="text-3xl font-black text-stone-900 tracking-tight">${order.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Customer & Shipping */}
        <div className="space-y-8">
          
          {/* Customer Info Card */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-stone-200 shadow-sm">
            <h3 className="text-xl font-black text-stone-800 tracking-tight mb-8">Información del Cliente</h3>
            
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center text-stone-400 shrink-0">
                  <User size={20} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-wider mb-0.5">Nombre</p>
                  <p className="font-bold text-stone-800 text-sm">{order.customer}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center text-stone-400 shrink-0">
                  <Phone size={20} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-wider mb-0.5">Teléfono</p>
                  <p className="font-bold text-stone-800 text-sm">{order.customerPhone}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center text-stone-400 shrink-0">
                  <MapPin size={20} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-wider mb-0.5">Estado</p>
                  <p className="font-bold text-stone-800 text-sm">{order.customerState}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Logic Card */}
          <div className="bg-stone-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-stone-900/20 border border-stone-800">
            <h3 className="text-xl font-black tracking-tight mb-6">Información de Envío</h3>
            
            <div className="space-y-8">
              {hasBirds && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-brand-400">
                    <Plane size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Envío de Aves</span>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-5 border border-white/10">
                    <p className="text-sm font-medium leading-relaxed text-stone-300">
                      {hasArticles 
                        ? `El envío se realizará al aeropuerto o terminal más cercana al estado de ${order.customerState}.`
                        : (order.customerAddress || `El envío se realizará al aeropuerto o terminal más cercana al estado de ${order.customerState}.`)
                      }
                    </p>
                  </div>
                </div>
              )}

              {hasArticles && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Truck size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Envío de Artículos</span>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-5 border border-white/10">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-wider mb-1">Dirección Completa</p>
                    <p className="text-sm font-medium leading-relaxed text-stone-300">
                      {order.customerAddress || 'No se proporcionó dirección completa.'}
                    </p>
                  </div>
                </div>
              )}

              {!hasBirds && !hasArticles && (
                <p className="text-stone-400 text-sm italic">No hay información de envío disponible.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};