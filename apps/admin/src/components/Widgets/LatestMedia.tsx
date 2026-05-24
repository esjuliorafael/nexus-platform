import React from 'react';
import { Image as ImageIcon, Film, Images } from 'lucide-react';
import { NexusAutonomousButton } from '../ui/NexusButton';
import { NexusWidgetCard, NexusAutonomousCard } from '../ui/NexusCard';
import { NexusHeader } from '../ui/NexusHeader';

interface LatestMediaProps {
  items?: any[];
  onViewGallery?: () => void;
  isLoading?: boolean;
}

const MediaRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-4 p-2 bg-bg-card rounded-xl border border-border-main/50 animate-pulse">
    <div className="w-10 h-10 rounded-lg bg-stone-100 shrink-0" />
    <div className="flex-1 min-w-0 flex flex-col gap-2">
      <div className="h-3 w-36 bg-stone-100 rounded-full" />
      <div className="h-2.5 w-20 bg-stone-50 rounded-full" />
    </div>
  </div>
);

const LatestMediaSkeleton: React.FC = () => (
  <NexusAutonomousCard className="h-full animate-pulse">
    <NexusHeader
      title="Últimos Medios"
      subtitle="Contenido Visual"
      icon={Images}
    />
    <div className="flex flex-col gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <MediaRowSkeleton key={i} />
      ))}
    </div>
  </NexusAutonomousCard>
);

export const LatestMedia: React.FC<LatestMediaProps> = ({ items = [], onViewGallery, isLoading = false }) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isLoading) return <LatestMediaSkeleton />;

  return (
    <NexusAutonomousCard className="h-full flex flex-col">
      <NexusHeader
        title="Últimos Medios"
        subtitle="Contenido Visual"
        icon={Images}
        iconVariant="brand"
      />

      <div className="flex flex-col gap-2 flex-grow">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 opacity-40">
            <ImageIcon size={32} strokeWidth={1} />
            <p className="text-label uppercase tracking-[0.15em] mt-4">Sin medios recientes</p>
          </div>
        ) : (
          items.slice(0, 3).map((item, idx) => (
            <NexusWidgetCard
              key={item.id}
              delay={`${idx * 70}ms`}
              thumbnail={item.filePath}
              title={item.title}
              onClick={onViewGallery}
              subtitle={
                <div className="flex items-center gap-1.5 uppercase font-bold tracking-widest text-[9px]">
                  {(item.type === 'video' || item.type === 'reel') ? <Film size={10} strokeWidth={2.5} /> : <ImageIcon size={10} strokeWidth={2.5} />}
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              }
            />
          ))
        )}
      </div>

      <NexusAutonomousButton 
        variant="secondary" 
        className="w-full mt-6"
        onClick={onViewGallery}
        icon={Images}
      >
        Ver Galería
      </NexusAutonomousButton>
    </NexusAutonomousCard>
  );
};
