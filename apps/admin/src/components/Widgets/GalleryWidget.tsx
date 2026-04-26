import React from 'react';
import { Image as ImageIcon, ChevronRight } from 'lucide-react';

interface GalleryWidgetProps {
  count: number;
  onViewGallery?: () => void;
  isLoading?: boolean;
}

const GalleryWidgetSkeleton: React.FC = () => (
  <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-stone-200 flex flex-col justify-center flex-1 h-full animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-stone-200 shrink-0" />
        <div className="flex flex-col gap-2">
          <div className="h-2.5 w-14 bg-stone-100 rounded-full" />
          <div className="h-5 w-10 bg-stone-200 rounded-full" />
        </div>
      </div>
      <div className="w-8 h-8 rounded-full bg-stone-100" />
    </div>
  </div>
);

export const GalleryWidget: React.FC<GalleryWidgetProps> = ({ count, onViewGallery, isLoading = false }) => {
  if (isLoading) return <GalleryWidgetSkeleton />;

  return (
    <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-stone-200 flex flex-col justify-center hover:shadow-md transition-shadow duration-200 flex-1 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 text-blue-500 rounded-2xl shrink-0">
            <ImageIcon size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-stone-400 text-[10px] font-bold uppercase tracking-widest leading-none">Galería</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-xl font-black text-stone-800 leading-none">{count}</h3>
              <span className="text-stone-400 text-[9px] font-medium uppercase leading-none">Archivos</span>
            </div>
          </div>
        </div>
        <button onClick={onViewGallery} className="text-stone-300 hover:text-blue-600 transition-colors group p-2 rounded-full hover:bg-blue-50 shrink-0">
          <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};