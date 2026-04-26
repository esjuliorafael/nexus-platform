import React from 'react';
import { Tag, MoreHorizontal } from 'lucide-react';
import { ASSET_BASE_URL } from '../../api';

interface LatestProductsProps {
  items?: any[];
  isLoading?: boolean;
}

// Skeleton de un row individual de producto
const ProductRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-4 p-2.5 rounded-2xl">
    {/* Thumbnail */}
    <div className="w-12 h-12 rounded-2xl bg-stone-200 shrink-0" />
    <div className="flex-1 min-w-0 flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <div className="h-3 w-28 bg-stone-200 rounded-full" />
        <div className="h-3 w-12 bg-stone-200 rounded-full ml-2" />
      </div>
      <div className="flex justify-between items-center">
        <div className="h-2.5 w-14 bg-stone-100 rounded-full" />
        <div className="h-2.5 w-16 bg-stone-100 rounded-full" />
      </div>
    </div>
  </div>
);

const LatestProductsSkeleton: React.FC = () => (
  <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-stone-200 h-full flex flex-col animate-pulse">
    {/* Header */}
    <div className="flex items-center justify-between mb-6">
      <div className="flex flex-col gap-2">
        <div className="h-4 w-32 bg-stone-200 rounded-full" />
        <div className="h-2.5 w-24 bg-stone-100 rounded-full" />
      </div>
      <div className="w-8 h-8 bg-stone-100 rounded-2xl" />
    </div>
    {/* 4 rows de producto */}
    <div className="flex flex-col gap-3 flex-grow">
      {Array.from({ length: 4 }).map((_, i) => (
        <ProductRowSkeleton key={i} />
      ))}
    </div>
    {/* Botón inferior */}
    <div className="w-full mt-6 h-10 bg-stone-100 rounded-2xl" />
  </div>
);

export const LatestProducts: React.FC<LatestProductsProps> = ({ items = [], isLoading = false }) => {

  const getStatusFront = (item: any) => {
    if (item.tipo === 'ave') {
      if (item.estado_venta === 'vendido') return 'sold';
      if (item.estado_venta === 'reservado') return 'reserved';
      return 'available';
    }
    return Number(item.stock) > 0 ? 'available' : 'sold';
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-50 border-green-200';
      case 'reserved': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'sold': return 'text-rose-600 bg-rose-50 border-rose-200';
      default: return 'text-stone-500 bg-stone-50 border-stone-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'Disponible';
      case 'reserved': return 'Reservado';
      case 'sold': return 'Vendido';
      default: return status;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
  };

  if (isLoading) return <LatestProductsSkeleton />;

  return (
    <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-stone-200 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-stone-800 text-base font-black tracking-tight">Últimos Productos</h3>
          <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Añadidos a la tienda</p>
        </div>
        <button className="text-stone-300 hover:text-brand-600 transition-colors p-2 hover:bg-stone-50 rounded-2xl">
          <MoreHorizontal size={20} />
        </button>
      </div>
      
      <div className="flex flex-col gap-3 flex-grow">
        {items.length === 0 ? (
          <p className="text-sm font-medium text-stone-400 text-center py-6">No hay productos recientes.</p>
        ) : (
          items.map((product) => {
            const statusFront = getStatusFront(product);
            const imageUrl = product.portada ? `${ASSET_BASE_URL}${product.portada}` : 'https://via.placeholder.com/100';
            return (
              <div key={product.id} className="flex items-center gap-4 p-2.5 hover:bg-stone-50 rounded-2xl transition-all duration-200 cursor-pointer group border border-transparent hover:border-stone-200">
                <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 bg-stone-100 border border-stone-200">
                  <img src={imageUrl} alt={product.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-bold text-stone-700 truncate">{product.nombre}</h4>
                    <span className="text-xs font-black text-stone-800 ml-2">
                      ${parseFloat(product.precio).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">{formatDate(product.fecha_creacion)}</span>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider ${getStatusStyle(statusFront)}`}>
                      {getStatusLabel(statusFront)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <button className="w-full mt-6 py-3 text-[10px] font-black text-brand-600 bg-brand-50/50 rounded-2xl hover:bg-brand-50 transition-colors border border-brand-100/50 uppercase tracking-widest flex items-center justify-center gap-2">
        <Tag size={14} />
        Ver Cat\u00e1logo
      </button>
    </div>
  );
};