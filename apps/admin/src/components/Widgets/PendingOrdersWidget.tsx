import React from 'react';
import { Clock } from 'lucide-react';

interface PendingOrdersWidgetProps {
  amount: number;
  totalAmount: number;
  isLoading?: boolean;
}

const PendingOrdersWidgetSkeleton: React.FC = () => (
  <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-stone-200 flex flex-col justify-between h-full animate-pulse">
    <div className="flex justify-between items-start">
      <div className="w-12 h-12 rounded-2xl bg-stone-200" />
      <div className="h-5 w-12 rounded-lg bg-stone-200" />
    </div>
    <div className="flex flex-col gap-2 mt-4">
      <div className="h-8 w-16 bg-stone-200 rounded-full" />
      <div className="h-2.5 w-20 bg-stone-100 rounded-full" />
    </div>
  </div>
);

export const PendingOrdersWidget: React.FC<PendingOrdersWidgetProps> = ({ amount, totalAmount, isLoading = false }) => {
  if (isLoading) return <PendingOrdersWidgetSkeleton />;

  const percentage = totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : '0.0';

  return (
    <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-stone-200 flex flex-col justify-between hover:shadow-md transition-shadow group h-full">
      <div className="flex justify-between items-start">
        <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100 group-hover:scale-110 transition-transform">
          <Clock size={24} strokeWidth={1.5} />
        </div>
        <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 uppercase tracking-wider">
          {percentage}%
        </span>
      </div>
      <div>
        <h4 className="text-3xl font-black text-stone-800 mt-4 tracking-tight">
          ${amount > 1000 ? (amount/1000).toFixed(1) + 'k' : amount.toLocaleString()}
        </h4>
        <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mt-1">Por Cobrar</p>
      </div>
    </div>
  );
};