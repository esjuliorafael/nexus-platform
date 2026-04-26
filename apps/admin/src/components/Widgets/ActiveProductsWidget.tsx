import React from 'react';
import { Package } from 'lucide-react';

interface ActiveProductsWidgetProps {
  count: number;
  isLoading?: boolean;
}

const ActiveProductsWidgetSkeleton: React.FC = () => (
  <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-stone-200 flex flex-col justify-between h-full animate-pulse">
    {/* Fila superior: icono + badge */}
    <div className="flex justify-between items-start">
      <div className="w-12 h-12 rounded-2xl bg-stone-200" />
      <div className="h-5 w-14 rounded-lg bg-stone-200" />
    </div>
    {/* N\u00famero grande + label */}
    <div className="flex flex-col gap-2 mt-4">
      <div className="h-8 w-16 bg-stone-200 rounded-full" />
      <div className="h-2.5 w-28 bg-stone-100 rounded-full" />
    </div>
  </div>
);

export const ActiveProductsWidget: React.FC<ActiveProductsWidgetProps> = ({ count, isLoading = false }) => {

  if (isLoading) return <ActiveProductsWidgetSkeleton />;

  return (
    <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-stone-200 flex flex-col justify-between hover:shadow-md transition-shadow group h-full">
      <div className="flex justify-between items-start">
        <div className="p-3.5 bg-blue-50 text-blue-500 rounded-2xl border border-blue-100 group-hover:scale-110 transition-transform">
          <Package size={24} strokeWidth={1.5} />
        </div>
        <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 uppercase tracking-wider">STOCK</span>
      </div>
      <div>
        <h4 className="text-3xl font-black text-stone-800 mt-4 tracking-tight">{count}</h4>
        <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mt-1">Productos Activos</p>
      </div>
    </div>
  );
};