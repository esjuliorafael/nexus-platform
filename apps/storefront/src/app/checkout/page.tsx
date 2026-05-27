"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle,
  ChevronDown,
  CreditCard,
  Info,
  MapPin,
  Search,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
  User,
  Wallet,
  type LucideIcon,
  MessageCircle,
} from 'lucide-react';
import { orderApi, StoreOrderResponse } from '../../api/orders';
import { paymentApi } from '../../api/payments';
import { settingsApi } from '../../api/settings';
import { useSettings } from '../../hooks/useSettings';
import { useCartStore } from '../../store/cart.store';
import { useToastStore } from '../../store/toast.store';
import { Button } from '../../components/ui/Button';
import { StorefrontCard } from '../../components/ui/Card';
import { StorefrontField, StorefrontTextarea } from '../../components/ui/Field';
import { StorefrontIcon } from '../../components/ui/Icon';
import { Spinner } from '../../components/ui/Spinner';
import { StorefrontModal } from '../../components/ui/Modal';
import { formatPrice } from '../../utils/formatters';

type DeliveryType = 'SHIPPING' | 'PICKUP';
type PaymentMethod = 'TRANSFER' | 'MERCADOPAGO';
type PaymentStatus = 'success' | 'pending' | 'failure' | null;

interface ShippingZone {
  id: number;
  name: string;
  zoneType: 'STANDARD' | 'EXTENDED' | string;
}

interface ShippingDetail {
  label: string;
  amount: number;
  note?: string;
}

export default function CheckoutPage() {
  const { items, getTotalPrice, clearCart, removeItem } = useCartStore();
  const { settings, getSetting } = useSettings();
  const { showToast } = useToastStore();
  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState<StoreOrderResponse | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFER');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(null);
  const [mounted, setMounted] = useState(false);
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [isZoneDropdownOpen, setIsZoneDropdownOpen] = useState(false);
  const [searchZone, setSearchZone] = useState('');
  const [selectedZone, setSelectedZone] = useState<ShippingZone | null>(null);

  // Estados para Modal
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingAddress: '',
    shippingState: '',
    deliveryType: 'SHIPPING' as DeliveryType,
  });

  useEffect(() => {
    setMounted(true);
    settingsApi.getPublicShippingZones()
      .then((data) => setZones(data as ShippingZone[]))
      .catch((err) => console.error('Error loading shipping zones:', err));

    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const orderId = params.get('external_reference')?.replace('order_', '');

    if (status === 'approved' || status === 'success') {
      setPaymentStatus('success');
      clearCart();
      if (orderId) setOrderComplete({ id: orderId, status: 'PAID' });
    } else if (status === 'pending' || status === 'in_process') {
      setPaymentStatus('pending');
      clearCart();
    } else if (status === 'rejected' || status === 'failure') {
      setPaymentStatus('failure');
    }
  }, [clearCart]);

  // LÓGICA DE CÁLCULO DE ENVÍO
  const shippingCalculation = useMemo(() => {
    if (formData.deliveryType === 'PICKUP' || !selectedZone) {
      return { total: 0, details: [] as ShippingDetail[] };
    }

    const hasBirds = items.some((i) => i.type?.toLowerCase() === 'bird');
    const hasItems = items.some((i) => i.type?.toLowerCase() === 'item');

    const findSetting = (key: string) => {
      if (!settings) return null;
      for (const group in settings) {
        if (settings[group][key] !== undefined) return settings[group][key];
      }
      return null;
    };

    const freeBirds = findSetting('shipping_free_threshold_birds') === '1';
    const freeItems = findSetting('shipping_free_threshold_items') === '1';
    const costStandard = Number(findSetting('shipping_cost_standard') || 0);
    const costExtended = Number(findSetting('shipping_cost_extended') || 0);
    const costBaseItems = Number(findSetting('shipping_base_cost_items') || 0);

    let total = 0;
    const details: ShippingDetail[] = [];

    if (hasBirds) {
      if (freeBirds) {
        details.push({ label: 'Envío de Aves', amount: 0, note: 'Promoción Envío Gratis' });
      } else {
        const amount = selectedZone.zoneType === 'EXTENDED' ? costExtended : costStandard;
        total += amount;
        details.push({
          label: `Envío Aves (${selectedZone.zoneType === 'EXTENDED' ? 'Zona Extendida' : 'Zona Normal'})`,
          amount,
          note: selectedZone.name,
        });
      }
    }

    if (hasItems) {
      if (freeItems) {
        details.push({ label: 'Envío de Productos', amount: 0, note: 'Promoción Envío Gratis' });
      } else {
        total += costBaseItems;
        details.push({ label: 'Paquetería Productos', amount: costBaseItems });
      }
    }

    return { total, details };
  }, [items, formData.deliveryType, selectedZone, settings]);

  const filteredZones = useMemo(() => {
    return zones.filter((zone) => zone.name.toLowerCase().includes(searchZone.toLowerCase()));
  }, [zones, searchZone]);

  const isMPEnabled = !!getSetting('payments', 'mp_seller_access_token');
  const orderTotal = getTotalPrice() + shippingCalculation.total;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.deliveryType === 'SHIPPING' && !selectedZone) {
      alert('Por favor selecciona un estado para el envío.');
      return;
    }

    setLoading(true);
    try {
      const createdOrder = await orderApi.create({
        ...formData,
        shippingCost: shippingCalculation.total,
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      });

      if (paymentMethod === 'MERCADOPAGO') {
        const preference = await paymentApi.getPreference(Number(createdOrder.id));
        if (preference.init_point) {
          window.location.href = preference.init_point;
          return;
        }
      }

      setOrderComplete(createdOrder);
      clearCart();
    } catch (error: unknown) {
      console.error('Order failed details:', error);
      alert(getErrorMessage(error) || 'Error al procesar el pedido. Por favor intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRemove = () => {
    if (itemToDelete) {
      removeItem(itemToDelete.productId);
      showToast(`${itemToDelete.name} eliminado de tu selección.`, 'info');
      setItemToDelete(null);
    }
  };

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  if (orderComplete) {
    return <OrderComplete order={orderComplete} />;
  }

  if (items.length === 0) {
    return <EmptyCart />;
  }

  return (
    <div className="mx-auto max-w-7xl px-6" style={{ paddingBlock: 'var(--sf-space-xl)' }}>
      <div className="flex flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
        {paymentStatus === 'failure' && (
          <div
            className="flex items-center border border-red-100 bg-red-50 text-red-700"
            style={{ borderRadius: 'var(--sf-radius-inner)', padding: 'var(--sf-padding-inner)', gap: 'var(--sf-space-md)' }}
          >
            <AlertCircle size={24} />
            <p className="sf-text-label uppercase tracking-widest font-black text-xs">El pago no pudo ser procesado. Intenta de nuevo o elige otro método.</p>
          </div>
        )}

        <div className="flex items-center" style={{ gap: 'var(--sf-space-md)' }}>
          <StorefrontIcon icon={ShoppingBag} context="section" variant="brand" />
          <div>
            <p className="sf-text-label text-brand-500 uppercase tracking-[0.2em] font-black">Checkout</p>
            <h1 className="sf-text-display text-stone-850 uppercase leading-none text-4xl">Finalizar Pedido</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start lg:grid-cols-12" style={{ gap: 'var(--sf-space-lg)' }}>
          <form onSubmit={handleSubmit} className="lg:col-span-7">
            <div className="flex flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
              <StorefrontCard className="flex flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
                <CheckoutSection title="Datos de Contacto" icon={User}>
                  <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'var(--sf-space-md)' }}>
                    <StorefrontField
                      required
                      label="Nombre Completo"
                      placeholder="Ej. Juan Pérez"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    />
                    <StorefrontField
                      required
                      label="Correo Electrónico"
                      type="email"
                      placeholder="ejemplo@correo.com"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    />
                    <StorefrontField
                      required
                      className="md:col-span-2"
                      label="Teléfono (WhatsApp)"
                      type="tel"
                      placeholder="10 dígitos"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    />
                  </div>
                </CheckoutSection>

                <CheckoutSection title="Método de Entrega" icon={Truck}>
                  <div className="grid grid-cols-2" style={{ gap: 'var(--sf-space-md)' }}>
                    <ChoiceButton
                      icon={Truck}
                      label="Envío"
                      active={formData.deliveryType === 'SHIPPING'}
                      onClick={() => setFormData({ ...formData, deliveryType: 'SHIPPING' })}
                    />
                    <ChoiceButton
                      icon={Store}
                      label="Recoger"
                      active={formData.deliveryType === 'PICKUP'}
                      onClick={() => setFormData({ ...formData, deliveryType: 'PICKUP' })}
                    />
                  </div>
                </CheckoutSection>

                {formData.deliveryType === 'SHIPPING' && (
                  <CheckoutSection title="Dirección de Envío" icon={MapPin}>
                    <div className="flex flex-col" style={{ gap: 'var(--sf-space-md)' }}>
                      <ZoneSelector
                        open={isZoneDropdownOpen}
                        setOpen={setIsZoneDropdownOpen}
                        selectedZone={selectedZone}
                        setSelectedZone={(zone) => {
                          setSelectedZone(zone);
                          setFormData({ ...formData, shippingState: zone.name });
                        }}
                        searchZone={searchZone}
                        setSearchZone={setSearchZone}
                        zones={filteredZones}
                      />
                      <StorefrontTextarea
                        required
                        label="Dirección Completa"
                        rows={3}
                        placeholder="Calle, número, colonia, CP..."
                        value={formData.shippingAddress}
                        onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                      />
                    </div>
                  </CheckoutSection>
                )}

                <CheckoutSection title="Método de Pago" icon={CreditCard}>
                  <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'var(--sf-space-md)' }}>
                    <PaymentButton
                      icon={Wallet}
                      title="Depósito / Transferencia"
                      subtitle="Pago manual verificado"
                      active={paymentMethod === 'TRANSFER'}
                      onClick={() => setPaymentMethod('TRANSFER')}
                    />
                    {isMPEnabled && (
                      <PaymentButton
                        icon={CreditCard}
                        title="Tarjeta / Efectivo"
                        subtitle="Aprobación instantánea"
                        active={paymentMethod === 'MERCADOPAGO'}
                        onClick={() => setPaymentMethod('MERCADOPAGO')}
                      />
                    )}
                  </div>
                </CheckoutSection>
              </StorefrontCard>

              <Button context="section" className="w-full h-20 text-xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-brand-500/20" disabled={loading}>
                {loading ? <Spinner className="text-white" /> : 'Confirmar y Pagar'}
              </Button>
            </div>
          </form>

          <aside className="lg:col-span-5">
            <OrderSummary
              items={items}
              subtotal={getTotalPrice()}
              shippingTotal={shippingCalculation.total}
              shippingDetails={shippingCalculation.details}
              deliveryType={formData.deliveryType}
              selectedZone={selectedZone}
              total={orderTotal}
              onRemoveItem={(item) => setItemToDelete(item)}
            />
          </aside>
        </div>
      </div>

      {/* Global Components Area */}
      <StorefrontModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        title="¿Eliminar producto?"
        description={`Se eliminará "${itemToDelete?.name}" de tu pedido.`}
        icon={Trash2}
        variant="danger"
        confirmLabel="Sí, eliminar"
        onConfirm={handleConfirmRemove}
      />
    </div>
  );
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'message' in error.response.data &&
    typeof error.response.data.message === 'string'
  ) {
    return error.response.data.message;
  }

  return null;
}

function CheckoutSection({ title, icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <section className="flex flex-col" style={{ gap: 'var(--sf-space-md)' }}>
      <div className="flex items-center" style={{ gap: 'var(--sf-space-md)' }}>
        <StorefrontIcon icon={icon} context="section" variant="brand" />
        <h3 className="sf-text-h1 uppercase tracking-tight leading-none text-stone-850">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function ChoiceButton({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center border-2 transition-all duration-500 active:scale-95 ${
        active ? 'border-brand-500 bg-brand-50/40 shadow-xl shadow-brand-500/10' : 'border-stone-100 bg-stone-50/70 hover:border-stone-200'
      }`}
      style={{ 
        borderRadius: 'var(--sf-radius-inner)', 
        padding: 'var(--sf-padding-inner)', 
        gap: 'var(--sf-space-sm)',
        transitionTimingFunction: 'var(--sf-ease)'
      }}
    >
      <Icon size={32} className={`transition-colors duration-500 ${active ? 'text-brand-500' : 'text-stone-300'}`} />
      <span className={`sf-text-label uppercase tracking-widest font-black transition-colors duration-500 ${active ? 'text-brand-700' : 'text-stone-400'}`}>{label}</span>
    </button>
  );
}

function PaymentButton({
  icon: Icon,
  title,
  subtitle,
  active,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center border-2 text-left transition-all duration-500 active:scale-95 ${
        active ? 'border-stone-800 bg-stone-900 text-white shadow-2xl shadow-stone-900/20' : 'border-stone-100 bg-stone-50/70 text-stone-500 hover:border-stone-200'
      }`}
      style={{ 
        borderRadius: 'var(--sf-radius-inner)', 
        padding: 'var(--sf-padding-inner)', 
        gap: 'var(--sf-space-md)',
        transitionTimingFunction: 'var(--sf-ease)'
      }}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center transition-all duration-500 ${active ? 'bg-white/10 text-white' : 'bg-stone-200/60 text-stone-400'}`}
        style={{ borderRadius: 'var(--sf-radius-nested)' }}
      >
        <Icon size={24} />
      </div>
      <div className="flex flex-col">
        <p className={`sf-text-label uppercase tracking-widest font-black transition-colors duration-500 ${active ? 'text-white' : 'text-stone-800'}`}>{title}</p>
        <p className={`sf-text-secondary opacity-70 font-medium transition-colors duration-500 ${active ? 'text-stone-300' : 'text-stone-500'}`}>{subtitle}</p>
      </div>
    </button>
  );
}

function ZoneSelector({
  open,
  setOpen,
  selectedZone,
  setSelectedZone,
  searchZone,
  setSearchZone,
  zones,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  selectedZone: ShippingZone | null;
  setSelectedZone: (zone: ShippingZone) => void;
  searchZone: string;
  setSearchZone: (value: string) => void;
  zones: ShippingZone[];
}) {
  return (
    <div className="relative flex flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
      <span className="sf-text-label text-stone-400">Estado de la República</span>
      <button
        type="button"
        className={`flex h-[var(--sf-h-input)] w-full items-center justify-between border bg-white px-5 transition-all duration-300 ${
          open ? 'border-brand-500 ring-4 ring-brand-500/10' : 'border-stone-200 hover:border-stone-300'
        }`}
        style={{ borderRadius: 'var(--sf-radius-inner)', transitionTimingFunction: 'var(--sf-ease)' }}
        onClick={() => setOpen(!open)}
      >
        <span className={`font-bold ${selectedZone ? 'text-stone-800' : 'text-stone-400'}`}>
          {selectedZone ? selectedZone.name : 'Selecciona tu estado...'}
        </span>
        <ChevronDown size={18} className={`text-stone-400 transition-transform duration-500 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-[60] overflow-hidden border border-stone-100 bg-white/95 shadow-2xl backdrop-blur-xl"
            style={{ borderRadius: 'var(--sf-radius-inner)', transitionTimingFunction: 'var(--sf-ease-reveal)' }}
          >
            <div className="flex items-center border-b border-stone-100 bg-stone-50/50" style={{ padding: 'var(--sf-space-md)', gap: 'var(--sf-space-sm)' }}>
              <Search size={16} className="text-stone-400" />
              <input
                autoFocus
                placeholder="Buscar estado..."
                className="w-full border-none bg-transparent text-sm font-bold text-stone-800 focus:outline-none"
                value={searchZone}
                onChange={(e) => setSearchZone(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              {zones.length > 0 ? (
                zones.map((zone) => (
                  <button
                    key={zone.id}
                    type="button"
                    className="group flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-brand-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedZone(zone);
                      setOpen(false);
                      setSearchZone('');
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-stone-800 group-hover:text-brand-700 transition-colors">{zone.name}</span>
                      <span className="sf-text-label text-stone-400 uppercase">{zone.zoneType === 'EXTENDED' ? 'Zona Extendida' : 'Zona Normal'}</span>
                    </div>
                    {selectedZone?.id === zone.id && <Check size={18} className="text-brand-500" />}
                  </button>
                ))
              ) : (
                <div className="px-6 py-10 text-center sf-text-secondary text-stone-400 italic font-medium">No se encontraron resultados.</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OrderSummary({
  items,
  subtotal,
  shippingTotal,
  shippingDetails,
  deliveryType,
  selectedZone,
  total,
  onRemoveItem,
}: {
  items: ReturnType<typeof useCartStore.getState>['items'];
  subtotal: number;
  shippingTotal: number;
  shippingDetails: ShippingDetail[];
  deliveryType: DeliveryType;
  selectedZone: ShippingZone | null;
  total: number;
  onRemoveItem: (item: any) => void;
}) {
  return (
    <div
      className="sticky top-32 overflow-hidden bg-stone-900 text-white shadow-2xl shadow-stone-900/40"
      style={{ borderRadius: 'var(--sf-radius-outer)', padding: 'var(--sf-padding-outer)' }}
    >
      {/* Decorative effect */}
      <div className="absolute right-0 top-0 h-64 w-64 -translate-y-20 translate-x-20 rounded-full bg-brand-500/10 blur-[100px] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
        <div className="flex items-center" style={{ gap: 'var(--sf-space-md)' }}>
          <StorefrontIcon icon={ShoppingBag} context="section" variant="brand" className="bg-white/10 border-white/10 text-brand-400 shadow-none" />
          <div>
            <p className="sf-text-label text-brand-400 uppercase tracking-[0.2em] font-black text-[10px]">Tu Selección</p>
            <h3 className="sf-text-h1 uppercase tracking-tight leading-none text-2xl">Resumen</h3>
          </div>
        </div>

        <div className="max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar-dark flex flex-col" style={{ gap: 'var(--sf-space-sm)' }}>
          {items.map((item) => (
            <div key={item.productId} className="group flex items-center justify-between border-b border-white/5 py-4 last:border-0" style={{ gap: 'var(--sf-space-md)' }}>
              <div className="flex min-w-0" style={{ gap: 'var(--sf-space-md)' }}>
                <div className="h-16 w-16 shrink-0 overflow-hidden border border-white/10 bg-white/5 shadow-inner" style={{ borderRadius: 'var(--sf-radius-inner)' }}>
                  {item.thumbnail ? (
                    <img src={item.thumbnail} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/10">
                      <ShoppingBag size={24} />
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-col justify-center">
                  <p className="truncate text-sm font-black text-stone-100 group-hover:text-brand-400 transition-colors">{item.name}</p>
                  <p className="sf-text-label text-stone-500 uppercase tracking-widest mt-1 text-[9px]">{item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="sf-text-h2 tabular-nums text-brand-400 font-black text-lg">${formatPrice(item.price * item.quantity)}</span>
                <button 
                  onClick={() => onRemoveItem(item)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-white/20 hover:bg-rose-500/20 hover:text-rose-500 transition-all active:scale-90"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col border-t border-white/10 pt-[var(--sf-space-lg)]" style={{ gap: 'var(--sf-space-md)' }}>
          <SummaryRow label="Subtotal" value={`$${formatPrice(subtotal)}`} />
          
          <AnimatePresence mode="popLayout">
            {deliveryType === 'SHIPPING' && selectedZone && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 10 }} 
                className="flex flex-col" 
                style={{ gap: 'var(--sf-space-sm)' }}
              >
                {shippingDetails.map((detail, index) => (
                  <SummaryRow key={index} label={detail.label} value={detail.amount > 0 ? `$${formatPrice(detail.amount)}` : '¡Gratis!'} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <SummaryRow
            label="Envío Total"
            value={deliveryType === 'PICKUP' ? 'Sin costo (Recoger)' : selectedZone ? `$${formatPrice(shippingTotal)}` : 'Pendiente de zona'}
          />

          <div className="flex flex-col pt-[var(--sf-space-md)] mt-2">
            <div className="flex items-baseline justify-between border-t border-white/5 pt-4">
              <span className="sf-text-h1 text-stone-400 uppercase tracking-tighter text-xl">Total Final</span>
              <span className="sf-text-display tabular-nums text-brand-400 font-black tracking-tighter leading-none text-3xl">
                ${formatPrice(total)}
              </span>
            </div>
          </div>
        </div>

        <div className="border border-white/5 bg-white/5 shadow-inner" style={{ borderRadius: 'var(--sf-radius-inner)', padding: 'var(--sf-padding-inner)' }}>
          <div className="flex items-start" style={{ gap: 'var(--sf-space-sm)' }}>
            <Info size={16} className="mt-1 shrink-0 text-brand-400" />
            <p className="sf-text-label leading-relaxed text-stone-400 uppercase tracking-widest text-[9px]">
              {selectedZone
                ? `Enviando a ${selectedZone.name}. Entrega estimada de 3 a 5 días hábiles.`
                : 'Al confirmar, aceptas nuestras políticas de venta y tiempos de entrega.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between sf-text-label text-stone-500 uppercase tracking-widest font-black text-[9px]">
      <span>{label}</span>
      <span className="tabular-nums text-stone-300">{value}</span>
    </div>
  );
}

function OrderComplete({ order }: { order: StoreOrderResponse }) {
  return (
    <div className="mx-auto max-w-2xl px-6 text-center" style={{ paddingBlock: 'var(--sf-space-xl)' }}>
      <div className="flex flex-col items-center" style={{ gap: 'var(--sf-space-lg)' }}>
        <StorefrontIcon icon={CheckCircle} context="section" variant="success" />
        <div className="flex flex-col" style={{ gap: 'var(--sf-space-sm)' }}>
          <h1 className="sf-text-display text-stone-850 uppercase text-4xl">Pedido Recibido</h1>
          <p className="sf-text-body text-stone-500 font-medium text-lg">
            Gracias por tu compra, {order.customerName || 'Cliente'}. Tu número de pedido es <strong className="text-stone-850">#{order.id}</strong>.
          </p>
        </div>
        <StorefrontCard className="w-full text-left bg-stone-50/50 border-dashed border-stone-200">
          <div className="flex flex-col" style={{ gap: 'var(--sf-space-md)' }}>
            <div className="flex justify-between border-b border-stone-100 pb-[var(--sf-space-md)] sf-text-label text-stone-400 uppercase tracking-widest font-black text-[10px]">
              <span>Resumen</span>
              <span>Monto Total</span>
            </div>
            <div className="flex items-end justify-between" style={{ gap: 'var(--sf-space-md)' }}>
              <div>
                <p className="sf-text-display text-stone-850 tracking-tighter leading-none text-5xl font-black">${formatPrice(Number(order.total || 0))}</p>
                <p className="sf-text-secondary text-stone-400 uppercase tracking-widest font-bold mt-2 text-xs">
                  Método: {order.deliveryType === 'SHIPPING' ? 'Envío a domicilio' : 'Recoger en sucursal'}
                </p>
              </div>
              <Button variant="outline" context="card" onClick={() => window.print()}>Imprimir Ticket</Button>
            </div>
          </div>
        </StorefrontCard>
        <div className="bg-emerald-50 p-6 rounded-[var(--sf-radius-inner)] border border-emerald-100 w-full shadow-sm">
          <p className="sf-text-label text-emerald-800 leading-relaxed font-black text-[10px]">
            Recibirás un mensaje de WhatsApp con los detalles de tu compra e instrucciones de pago.
          </p>
        </div>
        <Button asChild context="section" className="h-16 px-12 shadow-xl shadow-brand-500/20">
          <Link href="/store">Seguir Comprando <ArrowRight className="ml-2" /></Link>
        </Button>
      </div>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="mx-auto max-w-2xl px-6 text-center" style={{ paddingBlock: 'var(--sf-space-xl)' }}>
      <div className="flex flex-col items-center" style={{ gap: 'var(--sf-space-md)' }}>
        <StorefrontIcon icon={ShoppingBag} context="section" variant="muted" />
        <h2 className="sf-text-display text-stone-850 uppercase leading-none text-4xl">Tu carrito está vacío</h2>
        <p className="sf-text-body text-stone-500 font-medium mb-4">Parece que aún no has añadido ejemplares o productos a tu selección.</p>
        <Button asChild context="section" className="h-16 px-12 shadow-lg">
          <Link href="/store">Explorar Catálogo</Link>
        </Button>
      </div>
    </div>
  );
}
