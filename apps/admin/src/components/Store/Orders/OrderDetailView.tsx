import React, { useRef } from 'react';
import { 
  Package, Clock, CheckCircle2, Phone, MapPin, User, 
  Calendar, DollarSign, Plane, Truck, CircleX, ChevronLeft, Layers, MessageCircle 
} from 'lucide-react';
import { Order } from '../../../types';
import { NexusSectionButton, NexusCardButton } from '../../ui/NexusButton';
import { NexusSection } from '../../ui/NexusSection';
import { ASSET_BASE_URL } from '../../../api';

// --- SUB-COMPONENTES ---

/**
 * OrderItemThumbnail: Miniatura refinada para los productos dentro de la orden.
 * Aplica Geometría Nivel 2 y carga de assets absolutos.
 */
const OrderItemThumbnail = ({ item }: { item: any }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const getFullUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${ASSET_BASE_URL}${cleanPath}`;
  };

  const imageUrl = getFullUrl(item.imageUrl);
  const isVideo = imageUrl.toLowerCase().split('?')[0].endsWith('.mp4') || 
                  imageUrl.toLowerCase().split('?')[0].endsWith('.mov');

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
      <div 
        className={`w-16 h-16 shrink-0 flex items-center justify-center border ${item.type === 'BIRD' ? 'bg-brand-50 text-brand-600 border-brand-100/50' : 'bg-bg-muted text-text-muted border-border-main'}`}
        style={{ borderRadius: 'var(--radius-inner-visual)' }}
      >
        {item.type === 'BIRD' ? <Plane size={24} strokeWidth={1.5} /> : <Package size={24} strokeWidth={1.5} />}
      </div>
    );
  }

  return (
    <div 
      className="w-16 h-16 shrink-0 overflow-hidden bg-stone-100 border border-border-main shadow-inner relative group"
      style={{ borderRadius: 'var(--radius-inner-visual)' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isVideo ? (
        <video
          ref={videoRef}
          src={imageUrl}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : (
        <img 
          src={imageUrl} 
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

// Utilidad para formatear fecha (YYYY-MM-DD... -> DD/MM/YYYY)
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const pureDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0]; 
  const parts = pureDate.split('-');
  if (parts.length < 3) return pureDate;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({ 
  order, 
  onBack,
  onMarkAsPaid,
  onCancelOrder
  }) => {
  const [isResending, setIsResending] = React.useState(false);

  // --- CONFIGURACIÓN DE ESTADOS ---
  const getStatusConfig = (status: string) => {    switch (status) {
      case 'paid': 
        return { 
          style: 'bg-emerald-50 text-emerald-600 border-emerald-100', 
          icon: <CheckCircle2 size={14} strokeWidth={2.5} />,
          label: 'Pagada'
        };
      case 'pending': 
        return { 
          style: 'bg-amber-50 text-amber-600 border-amber-100', 
          icon: <Clock size={14} strokeWidth={2.5} />,
          label: 'Pendiente'
        };
      case 'cancelled': 
        return { 
          style: 'bg-rose-50 text-rose-600 border-rose-100', 
          icon: <CircleX size={14} strokeWidth={2.5} />,
          label: 'Cancelada'
        };
      default: 
        return { 
          style: 'bg-bg-muted text-text-muted border-border-main', 
          icon: <Package size={14} strokeWidth={2.5} />,
          label: status 
        };
    }
  };

  const statusConfig = getStatusConfig(order?.status || 'pending');
  const itemsList = order?.items || [];
  const hasBirds = itemsList.some(item => item?.type?.toUpperCase() === 'BIRD');
  const hasItems = itemsList.some(item => item?.type?.toUpperCase() === 'ITEM');

  const handleResendWhatsApp = async () => {
    if (!order?.id) return;
    setIsResending(true);
    try {
      await apiOrders.resendWhatsApp(String(order.id));
      showToast('Notificación enviada a la cola', 'success');
    } catch (error) {
      showToast('No se pudo re-enviar la notificación', 'error');
    } finally {
      setIsResending(false);
    }
  };

  if (!order) {
    return (
      <div className="py-20 text-center">
        <p className="text-text-muted">No se pudo cargar la información de la orden.</p>
        <NexusCardButton variant="secondary" onClick={onBack} icon={ChevronLeft} className="mt-4">
          Volver a Órdenes
        </NexusCardButton>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-10 flex flex-col" style={{ gap: 'var(--space-lg)' }}>
      
      {/* Botón Volver Volante */}
      <div className="flex items-center justify-between">
        <NexusCardButton variant="secondary" onClick={onBack} icon={ChevronLeft}>
          Volver a Órdenes
        </NexusCardButton>
        <NexusCardButton 
          onClick={handleResendWhatsApp} 
          isLoading={isResending} 
          icon={MessageCircle}
          variant="ghost"
          className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-100"
        >
          Re-enviar WhatsApp
        </NexusCardButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 'var(--space-lg)' }}>
        
        {/* Left Column: Order Summary & Items */}
        <div className="lg:col-span-2 flex flex-col" style={{ gap: 'var(--space-lg)' }}>
          
          {/* General Info Section */}
          <NexusSection
            title={`Orden #${order.id}`}
            subtitle="Detalle de Orden de Venta"
            icon={Layers}
            iconVariant="brand"
            action={
              <div className="flex flex-col sm:flex-row items-center gap-[var(--space-sm)] w-full sm:w-auto">
                {(order.status === 'pending' || order.status === 'paid') && (
                  <NexusSectionButton 
                    onClick={() => onCancelOrder(String(order.id))}
                    variant="outline"
                    icon={CircleX}
                    className="w-full sm:w-auto border-rose-200 text-rose-500 hover:bg-rose-50 hover:border-rose-300"
                  >
                    Cancelar
                  </NexusSectionButton>
                )}
                {order.status === 'pending' && (
                  <NexusSectionButton 
                    onClick={() => onMarkAsPaid(String(order.id))}
                    icon={CheckCircle2}
                    variant="brand"
                    className="w-full sm:w-auto shadow-xl shadow-brand-500/20"
                  >
                    Confirmar Pago
                  </NexusSectionButton>
                )}
              </div>
            }
          >
            <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 'var(--space-lg)' }}>
              <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                <div className="flex items-center gap-2 text-stone-400">
                  <Calendar size={14} className="opacity-50" />
                  <span className="text-label uppercase tracking-[0.15em]">Fecha</span>
                </div>
                <p className="text-secondary text-text-main font-bold">{formatDate(order.date)}</p>
              </div>
              <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                <div className="flex items-center gap-2 text-stone-400">
                  <DollarSign size={14} className="opacity-50" />
                  <span className="text-label uppercase tracking-[0.15em]">Total</span>
                </div>
                <p className="text-secondary text-text-main font-bold">${(order.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                <div className="flex items-center gap-2 text-stone-400">
                  <Package size={14} className="opacity-50" />
                  <span className="text-label uppercase tracking-[0.15em]">Artículos</span>
                </div>
                <p className="text-secondary text-text-main font-bold">{itemsList.length}</p>
              </div>
            </div>
          </NexusSection>

          {/* Items List Section */}
          <NexusSection
            title="Productos"
            subtitle="Detalle del pedido"
            icon={Package}
            iconVariant="muted"
          >
            <div className="flex flex-col divide-y divide-border-main/50">
              {itemsList.map((item) => (
                <div key={item?.id} className="py-6 flex items-center justify-between hover:bg-bg-muted/30 transition-colors px-2 rounded-xl">
                  <div className="flex items-center" style={{ gap: 'var(--space-md)' }}>
                    <OrderItemThumbnail item={item} />
                    <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                      <p className="text-h2 text-text-main truncate">{item?.name || 'Producto sin nombre'}</p>
                      <p className="text-label text-stone-400 uppercase tracking-[0.15em]">
                        {item?.type?.toUpperCase() === 'BIRD' ? 'Ave' : 'Artículo'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                    <p className="text-h2 text-text-main">${(item?.price || 0).toLocaleString('es-MX')}</p>
                    <p className="text-label text-stone-400">Cant: {item?.quantity || 0}</p>
                  </div>
                </div>
              ))}
            </div>
            <div 
              className="mt-8 p-8 bg-bg-muted/50 flex justify-between items-center border-t border-border-main"
              style={{ borderRadius: 'var(--radius-inner-visual)' }}
            >
              <span className="text-label text-text-muted uppercase tracking-[0.15em]">Total de la Orden</span>
              <span className="text-h1 text-text-main">${(order.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
          </NexusSection>
        </div>

        {/* Right Column: Customer & Shipping */}
        <div className="flex flex-col" style={{ gap: 'var(--space-lg)' }}>
          
          {/* Customer Info Section */}
          <NexusSection
            title="Cliente"
            subtitle="Datos de contacto"
            icon={User}
            iconVariant="brand"
          >
            <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
              <div className="flex items-center" style={{ gap: 'var(--space-md)' }}>
                <div 
                  className="w-12 h-12 bg-bg-muted border border-border-main flex items-center justify-center text-stone-400 shrink-0"
                  style={{ borderRadius: 'var(--radius-inner-visual)' }}
                >
                  <User size={20} strokeWidth={2} />
                </div>
                <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <p className="text-label text-stone-400 uppercase tracking-[0.15em]">Nombre</p>
                  <p className="text-secondary text-text-main font-bold">{order.customer}</p>
                </div>
              </div>

              <div className="flex items-center" style={{ gap: 'var(--space-md)' }}>
                <div 
                  className="w-12 h-12 bg-bg-muted border border-border-main flex items-center justify-center text-stone-400 shrink-0"
                  style={{ borderRadius: 'var(--radius-inner-visual)' }}
                >
                  <Phone size={20} strokeWidth={2} />
                </div>
                <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <p className="text-label text-stone-400 uppercase tracking-[0.15em]">Teléfono</p>
                  <p className="text-secondary text-text-main font-bold">{order.customerPhone}</p>
                </div>
              </div>

              <div className="flex items-center" style={{ gap: 'var(--space-md)' }}>
                <div 
                  className="w-12 h-12 bg-bg-muted border border-border-main flex items-center justify-center text-stone-400 shrink-0"
                  style={{ borderRadius: 'var(--radius-inner-visual)' }}
                >
                  <MapPin size={20} strokeWidth={2} />
                </div>
                <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <p className="text-label text-stone-400 uppercase tracking-[0.15em]">Estado</p>
                  <p className="text-secondary text-text-main font-bold">{order.customerState}</p>
                </div>
              </div>
            </div>
          </NexusSection>

          {/* Shipping Logic Section: Dark Variant */}
          <div 
            className="bg-stone-900 p-[var(--padding-outer)] text-white shadow-xl shadow-stone-900/20 border border-stone-800 flex flex-col" 
            style={{ borderRadius: 'var(--radius-outer)', gap: 'var(--space-lg)' }}
          >
            <div className="flex items-center" style={{ gap: 'var(--space-md)' }}>
               <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-brand-400 border border-white/10">
                  <Truck size={24} strokeWidth={1.5} />
               </div>
               <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <h3 className="text-h2 tracking-tight">Logística de Envío</h3>
                  <p className="text-label text-white/40 uppercase tracking-[0.15em]">Instrucciones de entrega</p>
               </div>
            </div>
            
            <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
              {hasBirds && (
                <div className="flex flex-col" style={{ gap: 'var(--space-sm)' }}>
                  <div className="flex items-center gap-2 text-brand-400">
                    <Plane size={16} strokeWidth={2.5} />
                    <span className="text-label uppercase tracking-[0.15em]">Envío de Aves</span>
                  </div>
                  <div 
                    className="bg-white/5 p-5 border border-white/10"
                    style={{ borderRadius: 'var(--radius-inner-visual)' }}
                  >
                    <p className="text-secondary leading-relaxed text-stone-300">
                      {hasItems 
                        ? `El envío se realizará al aeropuerto o terminal más cercana al estado de ${order.customerState}.`
                        : (order.customerAddress || `El envío se realizará al aeropuerto o terminal más cercana al estado de ${order.customerState}.`)
                      }
                    </p>
                  </div>
                </div>
              )}

              {hasItems && (
                <div className="flex flex-col" style={{ gap: 'var(--space-sm)' }}>
                  <div className="flex items-center gap-2 text-blue-400">
                    <Truck size={16} strokeWidth={2.5} />
                    <span className="text-label uppercase tracking-[0.15em]">Envío de Artículos</span>
                  </div>
                  <div 
                    className="bg-white/5 p-5 border border-white/10"
                    style={{ borderRadius: 'var(--radius-inner-visual)' }}
                  >
                    <p className="text-label text-white/30 uppercase tracking-[0.15em] mb-1.5">Dirección Completa</p>
                    <p className="text-secondary leading-relaxed text-stone-300">
                      {order.customerAddress || 'No se proporcionó dirección completa.'}
                    </p>
                  </div>
                </div>
              )}

              {!hasBirds && !hasItems && (
                <p className="text-stone-400 text-secondary italic">No hay información de envío disponible.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
