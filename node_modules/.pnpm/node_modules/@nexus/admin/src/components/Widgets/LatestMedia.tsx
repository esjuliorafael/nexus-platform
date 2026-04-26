import React from 'react';
import { Image, Film, MoreHorizontal } from 'lucide-react';
import { ASSET_BASE_URL } from '../../api';

interface LatestMediaProps {
  items?: any[];
  onViewGallery?: () => void;
  isLoading?: boolean;
}

// Skeleton de un row individual de medio
const MediaRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-4 p-2.5 rounded-2xl">
    {/* Thumbnail */}
    <div className="w-12 h-12 rounded-2xl bg-stone-200 shrink-0" />
    <div className="flex-1 min-w-0 flex flex-col gap-2">
      <div className="h-3 w-36 bg-stone-200 rounded-full" />
      <div className="h-2.5 w-20 bg-stone-100 rounded-full" />
    </div>
  </div>
);

const LatestMediaSkeleton: React.FC = () => (
  <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-stone-200 h-full flex flex-col animate-pulse">
    {/* Header */}
    <div className="flex items-center justify-between mb-6">
      <div className="flex flex-col gap-2">
        <div className="h-4 w-28 bg-stone-200 rounded-full" />
        <div className="h-2.5 w-36 bg-stone-100 rounded-full" />
      </div>
      <div className="w-8 h-8 bg-stone-100 rounded-2xl" />
    </div>
    {/* 4 rows de medio */}
    <div className="flex flex-col gap-3 flex-grow">
      {Array.from({ length: 4 }).map((_, i) => (
        <MediaRowSkeleton key={i} />
      ))}
    </div>
    {/* Botón inferior */}
    <div className="w-full mt-6 h-10 bg-stone-100 rounded-2xl" />
  </div>
);

export const LatestMedia: React.FC<LatestMediaProps> = ({ items = [], onViewGallery, isLoading = false }) => {

  const getThumbnail = (item: any) => {
    if (item.tipo === 'video' || item.tipo === 'reel') {
      return `${ASSET_BASE_URL}${item.ruta_archivo.replace('/videos/', '/videos/thumbs/').replace('.mp4', '.jpg').replace('.mov', '.jpg').replace('.webm', '.jpg')}`;
    }
    return `${ASSET_BASE_URL}${item.ruta_archivo}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isLoading) return <LatestMediaSkeleton />;

  return (
    <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-stone-200 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-stone-800 text-base font-black tracking-tight">Últimos Medios</h3>
          <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Añadidos recientemente</p>
        </div>
        <button
          onClick={onViewGallery}
          className="text-stone-300 hover:text-brand-600 transition-colors p-2 hover:bg-stone-50 rounded-2xl"
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

      <div className="flex flex-col gap-3 flex-grow">
        {items.length === 0 ? (
          <p className="text-sm font-medium text-stone-400 text-center py-6">No hay medios recientes.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-2.5 hover:bg-stone-50 rounded-2xl transition-all duration-200 cursor-pointer group border border-transparent hover:border-stone-200">
              <div className="relative w-12 h-12 rounded-2xl overflow-hidden shrink-0 bg-stone-100 border border-stone-200 shadow-sm">
                <img src={getThumbnail(item)} alt={item.titulo} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
                <div className="absolute bottom-1 right-1 p-1 bg-black/40 backdrop-blur-sm rounded-lg text-white">
                  {(item.tipo === 'video' || item.tipo === 'reel') ? <Film size={10} /> : <Image size={10} />}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-stone-700 truncate group-hover:text-brand-600 transition-colors">{item.titulo}</h4>
                <p className="text-[10px] text-stone-400 font-medium flex items-center gap-1 mt-0.5">
                  {formatDate(item.fecha_creacion)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={onViewGallery}
        className="w-full mt-6 py-3 text-[10px] font-black text-brand-600 bg-brand-50/50 rounded-2xl hover:bg-brand-50 transition-colors border border-brand-100/50 uppercase tracking-widest"
      >
        Ver Galer\u00eda
      </button>
    </div>
  );
};