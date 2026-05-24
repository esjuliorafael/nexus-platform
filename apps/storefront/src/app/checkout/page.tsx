"use client";

import { useState, useEffect } from 'react';
import { useCartStore } from '../../store/cart.store';
import { orderApi } from '../../api/orders';
import { paymentApi } from '../../api/payments';
import { useSettings } from '../../hooks/useSettings';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { ShoppingBag, Truck, Store, MapPin, Phone, User, CheckCircle, ArrowRight, CreditCard, Wallet, Info, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { formatPrice } from '../../utils/formatters';

export default function CheckoutPage() {
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { getSetting, loading: settingsLoading } = useSettings();
  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'TRANSFER' | 'MERCADOPAGO'>('TRANSFER');
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'pending' | 'failure' | null>(null);
  const [mounted, setMounted] = useState(false);

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingAddress: '',
    shippingState: '',
    deliveryType: 'SHIPPING' as 'SHIPPING' | 'PICKUP',
  });

  useEffect(() => {
    setMounted(true);
    // Detect Mercado Pago status from URL
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const orderId = params.get('external_reference')?.replace('order_', '');

    if (status === 'approved' || status === 'success') {
      setPaymentStatus('success');
      clearCart();
      if (orderId) {
        setOrderComplete({ id: orderId, status: 'PAID' });
      }
    } else if (status === 'pending' || status === 'in_process') {
      setPaymentStatus('pending');
      clearCart();
    } else if (status === 'rejected' || status === 'failure') {
      setPaymentStatus('failure');
    }
  }, []);

  const isMPEnabled = !!getSetting('payments', 'mp_seller_access_token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const orderData = {
        ...formData,
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
      };
      
      console.log('Sending order data:', orderData);
      const createdOrder = await orderApi.create(orderData);
      
      if (paymentMethod === 'MERCADOPAGO') {
        // Redirigir a Mercado Pago
        const preference = await paymentApi.getPreference(createdOrder.id);
        if (preference.init_point) {
          window.location.href = preference.init_point;
          return;
        }
      }
      
      setOrderComplete(createdOrder);
      clearCart();
    } catch (error: any) {
      console.error('Order failed details:', error);
      const msg = error.response?.data?.message || 'Error al procesar el pedido. Por favor intente de nuevo.';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner className="w-12 h-12" />
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-8 animate-in fade-in duration-700">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce shadow-sm">
          <CheckCircle size={48} />
        </div>
        <h1 className="text-5xl font-black text-stone-800 uppercase italic lora tracking-tight">¡Pedido Recibido!</h1>
        <p className="text-xl text-stone-500">Gracias por tu compra, {orderComplete.customerName || 'Cliente'}. Tu número de pedido es <strong>#{orderComplete.id}</strong></p>
        
        <div className="bg-white p-8 rounded-[3rem] border border-stone-100 shadow-xl space-y-6 text-left">
           <div className="flex justify-between items-center border-b border-stone-50 pb-4 font-bold text-stone-400 uppercase tracking-widest text-xs">
              <span>Resumen</span>
              <span>Monto Total</span>
           </div>
           <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-2xl font-black text-stone-800">${formatPrice(orderComplete.total)}</p>
                <p className="text-sm text-stone-400 font-medium">Método: {orderComplete.deliveryType === 'SHIPPING' ? 'Envío a domicilio' : 'Recoger en sucursal'}</p>
              </div>
              <Button variant="outline" onClick={() => window.print()}>Imprimir Ticket</Button>
           </div>
           <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 mt-4">
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Instrucciones de Pago</p>
              <p className="text-sm text-stone-600 leading-relaxed">
                Recibirás un mensaje de WhatsApp con los detalles de tu compra. Si elegiste pago manual, verás los datos bancarios allí.
              </p>
           </div>
        </div>

        <div className="pt-8">
          <Button asChild size="lg" className="h-16 px-12 rounded-2xl shadow-xl shadow-brand-500/20 hover:scale-105 transition-transform active:scale-95">
            <Link href="/store">Seguir Comprando <ArrowRight className="ml-2" /></Link>
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-32 text-center space-y-8 animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-stone-100 text-stone-300 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner">
          <ShoppingBag size={40} />
        </div>
        <h2 className="text-3xl font-black text-stone-800 tracking-tight italic lora uppercase">Tu carrito está vacío</h2>
        <Button asChild size="lg" className="rounded-2xl h-14 px-10 shadow-lg hover:scale-105 transition-transform">
          <Link href="/store">Explorar Catálogo</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {paymentStatus === 'failure' && (
        <div className="mb-8 bg-rose-50 border border-rose-100 p-6 rounded-2xl flex items-center gap-4 text-rose-700 animate-in slide-in-from-top-4 duration-500">
          <AlertCircle size={24} />
          <p className="font-bold uppercase tracking-tight text-sm">El pago no pudo ser procesado. Por favor, intenta de nuevo o elige otro método.</p>
        </div>
      )}

      {paymentStatus === 'pending' && (
        <div className="mb-8 bg-amber-50 border border-amber-100 p-6 rounded-2xl flex items-center gap-4 text-amber-700 animate-in slide-in-from-top-4 duration-500">
          <Info size={24} />
          <p className="font-bold uppercase tracking-tight text-sm">Tu pago está en proceso de validación. Te avisaremos por WhatsApp en cuanto se apruebe.</p>
        </div>
      )}

      <h1 className="text-4xl font-black text-stone-800 tracking-tight mb-12 flex items-center gap-4 uppercase italic lora">
        Finalizar Pedido
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-10">
          <div className="bg-white rounded-[2.5rem] border border-stone-100 shadow-xl shadow-stone-200/50 p-8 md:p-12 space-y-12">
            
            {/* 1. DATOS DE CONTACTO */}
            <div className="space-y-8">
              <h3 className="text-xl font-black text-stone-800 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
                   <User size={20} />
                </div>
                Datos de Contacto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="group space-y-2">
                  <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1 group-focus-within:text-brand-500 transition-colors">Nombre Completo</label>
                  <input
                    required
                    placeholder="Ej. Juan Pérez"
                    className="w-full h-14 bg-stone-50 border border-stone-100 rounded-2xl px-5 focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 font-bold text-stone-800 transition-all shadow-sm"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  />
                </div>
                <div className="group space-y-2">
                  <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1 group-focus-within:text-brand-500 transition-colors">Correo Electrónico</label>
                  <input
                    required
                    type="email"
                    placeholder="ejemplo@correo.com"
                    className="w-full h-14 bg-stone-50 border border-stone-100 rounded-2xl px-5 focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 font-bold text-stone-800 transition-all shadow-sm"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  />
                </div>
                <div className="group space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1 group-focus-within:text-brand-500 transition-colors">Teléfono (WhatsApp)</label>
                  <input
                    required
                    type="tel"
                    placeholder="10 dígitos"
                    className="w-full h-14 bg-stone-50 border border-stone-100 rounded-2xl px-5 focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 font-bold text-stone-800 transition-all shadow-sm"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* 2. MÉTODO DE ENTREGA */}
            <div className="space-y-8">
              <h3 className="text-xl font-black text-stone-800 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
                   <Truck size={20} />
                </div>
                Método de Entrega
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, deliveryType: 'SHIPPING' })}
                  className={`flex flex-col items-center justify-center p-8 rounded-[2rem] border-2 transition-all gap-3 active:scale-95 ${
                    formData.deliveryType === 'SHIPPING' ? 'border-brand-500 bg-brand-50/30 shadow-lg shadow-brand-500/10' : 'border-stone-50 bg-stone-50/50 hover:border-stone-200'
                  }`}
                >
                  <Truck size={32} className={formData.deliveryType === 'SHIPPING' ? 'text-brand-500' : 'text-stone-300'} />
                  <span className={`text-xs font-black uppercase tracking-widest ${formData.deliveryType === 'SHIPPING' ? 'text-brand-700' : 'text-stone-400'}`}>Envío</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, deliveryType: 'PICKUP' })}
                  className={`flex flex-col items-center justify-center p-8 rounded-[2rem] border-2 transition-all gap-3 active:scale-95 ${
                    formData.deliveryType === 'PICKUP' ? 'border-brand-500 bg-brand-50/30 shadow-lg shadow-brand-500/10' : 'border-stone-50 bg-stone-50/50 hover:border-stone-200'
                  }`}
                >
                  <Store size={32} className={formData.deliveryType === 'PICKUP' ? 'text-brand-500' : 'text-stone-300'} />
                  <span className={`text-xs font-black uppercase tracking-widest ${formData.deliveryType === 'PICKUP' ? 'text-brand-700' : 'text-stone-400'}`}>Recoger</span>
                </button>
              </div>
            </div>

            {/* 3. DIRECCIÓN (Condicional) */}
            {formData.deliveryType === 'SHIPPING' && (
              <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                <h3 className="text-xl font-black text-stone-800 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
                    <MapPin size={20} />
                  </div>
                  Dirección de Envío
                </h3>
                <div className="space-y-6">
                  <div className="group space-y-2">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1 group-focus-within:text-brand-500 transition-colors">Estado</label>
                    <input
                      required
                      placeholder="Ej. Michoacán"
                      className="w-full h-14 bg-stone-50 border border-stone-100 rounded-2xl px-5 focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 font-bold text-stone-800 shadow-sm"
                      value={formData.shippingState}
                      onChange={(e) => setFormData({ ...formData, shippingState: e.target.value })}
                    />
                  </div>
                  <div className="group space-y-2">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1 group-focus-within:text-brand-500 transition-colors">Dirección Completa</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Calle, número, colonia, CP..."
                      className="w-full bg-stone-50 border border-stone-100 rounded-2xl p-6 focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 font-bold text-stone-800 shadow-sm resize-none"
                      value={formData.shippingAddress}
                      onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. MÉTODO DE PAGO */}
            <div className="space-y-8 pt-4">
              <h3 className="text-xl font-black text-stone-800 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
                   <CreditCard size={20} />
                </div>
                Método de Pago
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('TRANSFER')}
                  className={`flex items-center gap-5 p-6 rounded-[1.5rem] border-2 transition-all active:scale-95 text-left ${
                    paymentMethod === 'TRANSFER' ? 'border-stone-800 bg-stone-900 text-white shadow-xl' : 'border-stone-100 bg-stone-50/50 text-stone-500 hover:border-stone-200'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${paymentMethod === 'TRANSFER' ? 'bg-white/10 text-white' : 'bg-stone-200/50 text-stone-400'}`}>
                    <Wallet size={24} />
                  </div>
                  <div>
                    <p className="font-black uppercase tracking-widest text-[10px]">Depósito / Transferencia</p>
                    <p className="text-xs opacity-60 font-medium mt-0.5">Pago manual verificado</p>
                  </div>
                </button>

                {isMPEnabled && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('MERCADOPAGO')}
                    className={`flex items-center gap-5 p-6 rounded-[1.5rem] border-2 transition-all active:scale-95 text-left ${
                      paymentMethod === 'MERCADOPAGO' ? 'border-blue-500 bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'border-stone-100 bg-stone-50/50 text-stone-500 hover:border-stone-200'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${paymentMethod === 'MERCADOPAGO' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-500'}`}>
                      <CreditCard size={24} />
                    </div>
                    <div>
                      <p className="font-black uppercase tracking-widest text-[10px]">Tarjeta / Efectivo</p>
                      <p className="text-xs opacity-80 font-medium mt-0.5">Aprobación instantánea</p>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <Button size="lg" className="w-full h-20 text-xl font-black uppercase tracking-[0.2em] rounded-[2.5rem] shadow-2xl shadow-brand-500/30 hover:scale-[1.02] transition-transform active:scale-95" disabled={loading}>
            {loading ? <Spinner className="text-white" /> : 'Confirmar y Pagar'}
          </Button>
        </form>

        <div className="lg:col-span-5">
          <div className="bg-stone-900 rounded-[3rem] p-10 text-white space-y-10 sticky top-32 shadow-2xl shadow-stone-900/30 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full -mr-20 -mt-20 blur-[80px] pointer-events-none" />
            
            <h3 className="text-2xl font-black flex items-center gap-4 italic lora uppercase tracking-tight relative z-10">
              <ShoppingBag className="text-brand-400" /> Resumen
            </h3>
            
            <div className="space-y-6 max-h-[40vh] overflow-y-auto pr-4 custom-scrollbar relative z-10">
              {items.map(item => (
                <div key={item.productId} className="flex justify-between items-center py-4 border-b border-white/5 last:border-0 group">
                  <div className="flex gap-5">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl overflow-hidden shrink-0 border border-white/10 group-hover:scale-105 transition-transform duration-500 shadow-lg">
                      {item.thumbnail && <img src={item.thumbnail} className="w-full h-full object-cover" alt={item.name} />}
                    </div>
                    <div className="flex flex-col justify-center">
                      <p className="font-black text-sm line-clamp-1 text-stone-100">{item.name}</p>
                      <p className="text-[10px] text-stone-500 font-black uppercase tracking-[0.2em] mt-1">{item.quantity} Unidad(es)</p>
                    </div>
                  </div>
                  <span className="font-black text-brand-400 text-lg tabular-nums">${formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="pt-10 border-t border-white/10 space-y-6 relative z-10">
              <div className="flex justify-between items-center text-stone-500 font-black uppercase tracking-widest text-[10px]">
                <span>Subtotal</span>
                <span className="text-stone-300 tabular-nums">${formatPrice(getTotalPrice())}</span>
              </div>
              <div className="flex justify-between items-center text-stone-500 font-black uppercase tracking-widest text-[10px]">
                <span>Envío</span>
                <span className="text-stone-300 italic">{formData.deliveryType === 'SHIPPING' ? 'Pendiente' : 'Gratis'}</span>
              </div>
              <div className="flex justify-between items-center pt-6 text-5xl font-black tracking-tighter">
                <span className="italic lora text-stone-400 text-3xl">Total</span>
                <span className="text-brand-400 tabular-nums">${formatPrice(getTotalPrice())}</span>
              </div>
            </div>
            
            <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 relative z-10 mt-4">
               <div className="flex items-start gap-4">
                  <Info size={18} className="text-brand-400 shrink-0 mt-1" />
                  <p className="text-[10px] font-medium leading-relaxed text-stone-400 uppercase tracking-widest">
                    Al confirmar, aceptas nuestras políticas de venta y tiempos de entrega estipulados.
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
