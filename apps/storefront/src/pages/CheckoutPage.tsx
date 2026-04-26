import { useState } from 'react';
import { useCartStore } from '../store/cart.store';
import { orderApi } from '../api/orders';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { ShoppingBag, Truck, Store, MapPin, Phone, User, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CheckoutPage() {
  const { items, getTotalPrice, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState<any>(null);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    shippingAddress: '',
    shippingState: '',
    deliveryType: 'SHIPPING' as 'SHIPPING' | 'PICKUP',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const orderData = {
        ...formData,
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
      };
      const result = await orderApi.create(orderData);
      setOrderComplete(result);
      clearCart();
    } catch (error) {
      console.error('Order failed:', error);
      alert('Error al procesar el pedido. Por favor intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-8">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
          <CheckCircle size={48} />
        </div>
        <h1 className="text-5xl font-black text-stone-800 uppercase italic lora tracking-tight">¡Pedido Recibido!</h1>
        <p className="text-xl text-stone-500">Gracias por tu compra, {orderComplete.customerName}. Tu número de pedido es <strong>#{orderComplete.id}</strong></p>
        
        <div className="bg-white p-8 rounded-[3rem] border border-stone-100 shadow-xl space-y-6 text-left">
           <div className="flex justify-between items-center border-b border-stone-50 pb-4 font-bold text-stone-400 uppercase tracking-widest text-xs">
              <span>Resumen</span>
              <span>Monto Total</span>
           </div>
           <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-2xl font-black text-stone-800">${Number(orderComplete.total).toLocaleString()}</p>
                <p className="text-sm text-stone-400 font-medium">Método: {orderComplete.deliveryType === 'SHIPPING' ? 'Envío a domicilio' : 'Recoger en sucursal'}</p>
              </div>
              <Button variant="outline" onClick={() => window.print()}>Imprimir Ticket</Button>
           </div>
        </div>

        <div className="pt-8">
          <Button asChild size="lg" className="h-16 px-12 rounded-2xl">
            <Link to="/store">Seguir Comprando <ArrowRight className="ml-2" /></Link>
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-32 text-center space-y-8">
        <div className="w-20 h-20 bg-stone-100 text-stone-300 rounded-full flex items-center justify-center mx-auto">
          <ShoppingBag size={32} />
        </div>
        <h2 className="text-3xl font-black text-stone-800 tracking-tight">Tu carrito está vacío</h2>
        <Button asChild size="lg" className="rounded-2xl h-14 px-8">
          <Link to="/store">Explorar Catálogo</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-black text-stone-800 tracking-tight mb-12 flex items-center gap-4 uppercase italic lora">
        Finalizar Pedido
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-stone-100 shadow-xl shadow-stone-200/50 p-8 space-y-8">
            <div className="space-y-6">
              <h3 className="text-xl font-black text-stone-800 flex items-center gap-3">
                <User size={20} className="text-brand-500" /> Datos de Contacto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1">Nombre Completo</label>
                  <input
                    required
                    className="w-full h-14 bg-stone-50 border border-stone-100 rounded-2xl px-5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-stone-800 transition-all"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1">Teléfono</label>
                  <input
                    required
                    className="w-full h-14 bg-stone-50 border border-stone-100 rounded-2xl px-5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-stone-800 transition-all"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-black text-stone-800 flex items-center gap-3">
                <Truck size={20} className="text-brand-500" /> Método de Entrega
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, deliveryType: 'SHIPPING' })}
                  className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all gap-2 ${
                    formData.deliveryType === 'SHIPPING' ? 'border-brand-500 bg-brand-50/50' : 'border-stone-100 hover:border-stone-200'
                  }`}
                >
                  <Truck className={formData.deliveryType === 'SHIPPING' ? 'text-brand-500' : 'text-stone-300'} />
                  <span className={`text-sm font-bold ${formData.deliveryType === 'SHIPPING' ? 'text-brand-700' : 'text-stone-500'}`}>Envío</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, deliveryType: 'PICKUP' })}
                  className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all gap-2 ${
                    formData.deliveryType === 'PICKUP' ? 'border-brand-500 bg-brand-50/50' : 'border-stone-100 hover:border-stone-200'
                  }`}
                >
                  <Store className={formData.deliveryType === 'PICKUP' ? 'text-brand-500' : 'text-stone-300'} />
                  <span className={`text-sm font-bold ${formData.deliveryType === 'PICKUP' ? 'text-brand-700' : 'text-stone-500'}`}>Recoger</span>
                </button>
              </div>
            </div>

            {formData.deliveryType === 'SHIPPING' && (
              <div className="space-y-6 animate-in slide-in-from-top duration-300">
                <h3 className="text-xl font-black text-stone-800 flex items-center gap-3">
                  <MapPin size={20} className="text-brand-500" /> Dirección de Envío
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1">Estado</label>
                    <input
                      required
                      className="w-full h-14 bg-stone-50 border border-stone-100 rounded-2xl px-5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-stone-800"
                      value={formData.shippingState}
                      onChange={(e) => setFormData({ ...formData, shippingState: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest ml-1">Dirección Completa</label>
                    <textarea
                      required
                      rows={3}
                      className="w-full bg-stone-50 border border-stone-100 rounded-2xl p-5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold text-stone-800"
                      value={formData.shippingAddress}
                      onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <Button size="lg" className="w-full h-16 text-xl rounded-[2rem] shadow-2xl shadow-brand-500/20" disabled={loading}>
            {loading ? <Spinner className="text-white" /> : 'Confirmar Pedido'}
          </Button>
        </form>

        <div className="lg:col-span-5">
          <div className="bg-stone-900 rounded-[2.5rem] p-8 text-white space-y-8 sticky top-32 shadow-2xl shadow-stone-900/20">
            <h3 className="text-2xl font-black flex items-center gap-3 italic lora uppercase tracking-tight">
              <ShoppingBag className="text-brand-400" /> Resumen del Pedido
            </h3>
            
            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              {items.map(item => (
                <div key={item.productId} className="flex justify-between items-center py-4 border-b border-stone-800 last:border-0">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-stone-800 rounded-xl overflow-hidden shrink-0">
                      {item.thumbnail && <img src={item.thumbnail} className="w-full h-full object-cover" />}
                    </div>
                    <div>
                      <p className="font-bold line-clamp-1">{item.name}</p>
                      <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">{item.quantity} Unidad(es)</p>
                    </div>
                  </div>
                  <span className="font-black text-brand-400">${(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="pt-8 border-t border-stone-800 space-y-4">
              <div className="flex justify-between items-center text-stone-400 font-bold uppercase tracking-widest text-xs">
                <span>Subtotal</span>
                <span>${getTotalPrice().toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-stone-400 font-bold uppercase tracking-widest text-xs">
                <span>Envío</span>
                <span>{formData.deliveryType === 'SHIPPING' ? 'Calculado al procesar' : 'Gratis'}</span>
              </div>
              <div className="flex justify-between items-center pt-4 text-3xl font-black">
                <span className="italic lora">Total</span>
                <span className="text-brand-400">${getTotalPrice().toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
