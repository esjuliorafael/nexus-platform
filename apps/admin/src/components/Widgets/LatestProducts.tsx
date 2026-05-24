import React from 'react';
import { Tag, Package } from 'lucide-react';
import { NexusAutonomousButton } from '../ui/NexusButton';
import { NexusWidgetCard, NexusAutonomousCard } from '../ui/NexusCard';
import { NexusHeader } from '../ui/NexusHeader';

interface LatestProductsProps {
  items?: any[];
  isLoading?: boolean;
  onViewGallery?: () => void;
}

const ProductRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-4 p-2 bg-bg-card rounded-xl border border-border-main/50 animate-pulse">
    <div className="w-10 h-10 rounded-lg bg-stone-100 shrink-0" />
    <div className="flex-1 min-w-0 flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <div className="h-3 w-28 bg-stone-100 rounded-full" />
        <div className="h-3 w-12 bg-stone-100 rounded-full" />
      </div>
      <div className="h-2.5 w-20 bg-stone-50 rounded-full" />
    </div>
  </div>
);

const LatestProductsSkeleton: React.FC = () => (
  <NexusAutonomousCard className="h-full animate-pulse">
    <NexusHeader
      title="Últimos Productos"
      subtitle="Estado de Inventario"
      icon={Package}
    />
    <div className="flex flex-col gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <ProductRowSkeleton key={i} />
      ))}
    </div>
  </NexusAutonomousCard>
);

export const LatestProducts: React.FC<LatestProductsProps> = ({ items = [], isLoading = false, onViewGallery }) => {

  const getStatusFront = (item: any) => {
    if (item.type === 'BIRD') {
      if (item.saleStatus === 'SOLD') return 'sold';
      if (item.saleStatus === 'RESERVED') return 'reserved';
      return 'available';
    }
    return Number(item.stock) > 0 ? 'available' : 'sold';
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'available': return { 
        pillStyle: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        label: 'Disponible'
      };
      case 'reserved': return { 
        pillStyle: 'text-amber-600 bg-amber-50 border-amber-100',
        label: 'Reservado'
      };
      case 'sold': return { 
        pillStyle: 'text-rose-600 bg-rose-50 border-rose-100',
        label: 'Vendido'
      };
      default: return { 
        pillStyle: 'text-text-muted bg-bg-muted border-border-main',
        label: status
      };
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
  };

  if (isLoading) return <LatestProductsSkeleton />;

  return (
    <NexusAutonomousCard className="h-full flex flex-col">
      <NexusHeader
        title="Últimos Productos"
        subtitle="Estado de Inventario"
        icon={Package}
        iconVariant="brand"
      />
      
      <div className="flex flex-col gap-2 flex-grow">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 opacity-40">
            <Package size={32} strokeWidth={1} />
            <p className="text-label uppercase tracking-[0.15em] mt-4">Sin productos recientes</p>
          </div>
        ) : (
          items.slice(0, 3).map((product, idx) => {
            const statusConfig = getStatusConfig(getStatusFront(product));
            const imageUrl = product.imageUrl || product.thumbnail || '';
            
            return (
              <NexusWidgetCard
                key={product.id}
                delay={`${idx * 70}ms`}
                thumbnail={imageUrl}
                title={product.name}
                onClick={onViewGallery}
                subtitle={
                  <div className="flex items-center gap-1.5 uppercase font-bold tracking-widest text-[9px]">
                    <span>{formatDate(product.createdAt)}</span>
                    <span className="opacity-30">•</span>
                    <span className={statusConfig.pillStyle + " px-1 rounded-sm border-[0.5px]"}>
                      {statusConfig.label}
                    </span>
                  </div>
                }
                rightContent={
                  <div className="flex items-baseline text-h2 font-bold text-brand-700">
                    <span className="text-[10px] mr-0.5 opacity-50 font-bold">$</span>
                    {parseFloat(product.price).toLocaleString()}
                  </div>
                }
              />
            );
          })
        )}
      </div>
      
      <NexusAutonomousButton 
        variant="secondary" 
        className="w-full mt-6"
        onClick={onViewGallery}
        icon={Tag}
      >
        Ver Catálogo
      </NexusAutonomousButton>
    </NexusAutonomousCard>
  );
};
