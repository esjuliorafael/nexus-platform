import React from 'react';
import { Tags, ChevronRight } from 'lucide-react';

interface CategoryWidgetProps {
  count: number;
  isLoading?: boolean;
}

const CategoryWidgetSkeleton: React.FC = () => (
  <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-stone-200 flex flex-col justify-center flex-1 h-full animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-stone-200 shrink-0" />
        <div className="flex flex-col gap-2">
          <div className="h-2.5 w-20 bg-stone-100 rounded-full" />
          <div className="h-5 w-10 bg-stone-200 rounded-full" />
        </div>
      </div>
      <div className="w-8 h-8 rounded-full bg-stone-100" />
    </div>
  </div>
);

export const CategoryWidget: React.FC<CategoryWidgetProps> = ({ count, isLoading = false }) => {
  if (isLoading) return <CategoryWidgetSkeleton />;

  return (
    <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-stone-200 flex flex-col justify-center hover:shadow-md transition-shadow duration-200 flex-1 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-rose-50 text-rose-500 rounded-2xl shrink-0">
            <Tags size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-stone-400 text-[10px] font-bold uppercase tracking-widest leading-none">Categorías</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-xl font-black text-stone-800 leading-none">{count}</h3>
              <span className="text-stone-400 text-[9px] font-medium uppercase leading-none">Activas</span>
            </div>
          </div>
        </div>
        <button className="text-stone-300 hover:text-rose-500 transition-colors group p-2 rounded-full hover:bg-rose-50 shrink-0">
          <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};