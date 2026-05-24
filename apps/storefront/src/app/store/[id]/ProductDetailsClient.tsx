"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Product } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useCartStore } from '../../../store/cart.store';
import { ChevronLeft, ShoppingCart, CheckCircle2, ShieldCheck, Truck } from 'lucide-react';
import { formatBirdAge, formatBirdPurpose, formatSaleStatus, formatPrice } from '../../../utils/formatters';

interface ProductDetailsClientProps {
  product: Product;
}

export function ProductDetailsClient({ product }: ProductDetailsClientProps) {
  const [activeImage, setActiveImage] = useState<string | null>(product.thumbnail);
  const addItem = useCartStore((state) => state.addItem);

  const isAvailable = product.saleStatus === 'AVAILABLE';

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
      <Link href="/store" className="inline-flex items-center gap-2 text-stone-500 hover:text-brand-500 font-bold transition-colors">
        <ChevronLeft size={20} /> Volver al catálogo
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
        {/* Gallery */}
        <div className="space-y-6">
          <div className="aspect-square rounded-[3rem] overflow-hidden bg-white border border-stone-100 shadow-xl shadow-stone-200/50">
            {activeImage ? (
              <img src={activeImage} className="w-full h-full object-cover" alt={product.name} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-300 italic">Sin imagen</div>
            )}
          </div>
          
          {product.gallery && product.gallery.length > 0 && (
            <div className="grid grid-cols-4 gap-4">
              <button 
                onClick={() => setActiveImage(product.thumbnail)}
                className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all ${activeImage === product.thumbnail ? 'border-brand-500' : 'border-transparent opacity-60 hover:opacity-100'}`}
              >
                {product.thumbnail && <img src={product.thumbnail} className="w-full h-full object-cover" alt="Thumbnail" />}
              </button>
              {product.gallery.map((img) => (
                <button 
                  key={img.id}
                  onClick={() => setActiveImage(img.filePath)}
                  className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all ${activeImage === img.filePath ? 'border-brand-500' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <img src={img.filePath} className="w-full h-full object-cover" alt="Gallery item" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-8 py-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant={product.type === 'BIRD' ? 'default' : 'outline'}>
                {product.type === 'BIRD' ? 'Ave' : 'Artículo'}
              </Badge>
              <Badge variant={isAvailable ? 'success' : 'warning'}>
                  {formatSaleStatus(product.saleStatus)}
              </Badge>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-stone-800 tracking-tight leading-tight uppercase italic lora">
              {product.name}
            </h1>
            <p className="text-4xl font-black text-brand-500">
              ${formatPrice(product.price)}
            </p>
          </div>

          <p className="text-lg text-stone-500 leading-relaxed max-w-lg">
            {product.description || 'Sin descripción disponible.'}
          </p>

          {product.type === 'BIRD' && (
            <div className="grid grid-cols-2 gap-4 bg-stone-50 p-6 rounded-[2rem] border border-stone-100">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-stone-400 tracking-widest">No. Anillo</span>
                <p className="font-bold text-stone-700">{product.ringNumber || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Edad / Etapa</span>
                <p className="font-bold text-stone-700">{formatBirdAge(product.age)}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Propósito</span>
                <p className="font-bold text-stone-700">{formatBirdPurpose(product.purpose)}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {isAvailable ? (
              <Button 
                size="lg" 
                className="w-full h-16 text-xl rounded-2xl shadow-xl shadow-brand-500/20"
                onClick={() => addItem({
                  productId: product.id,
                  name: product.name,
                  price: Number(product.price),
                  quantity: 1,
                  thumbnail: product.thumbnail
                })}
              >
                <ShoppingCart className="mr-2" size={24} /> Agregar al Carrito
              </Button>
            ) : (
              <Button size="lg" className="w-full h-16 text-xl rounded-2xl" disabled>
                No disponible
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-stone-100">
            <div className="flex items-center gap-3 text-stone-400">
              <ShieldCheck className="text-brand-500" size={20} />
              <span className="text-xs font-bold uppercase tracking-wider">Compra Segura</span>
            </div>
            <div className="flex items-center gap-3 text-stone-400">
              <Truck className="text-brand-500" size={20} />
              <span className="text-xs font-bold uppercase tracking-wider">Envíos a todo el país</span>
            </div>
            <div className="flex items-center gap-3 text-stone-400">
              <CheckCircle2 className="text-brand-500" size={20} />
              <span className="text-xs font-bold uppercase tracking-wider">Garantía de Calidad</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
