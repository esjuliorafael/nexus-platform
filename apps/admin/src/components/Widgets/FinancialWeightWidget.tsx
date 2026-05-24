import React from 'react';
import { Banknote } from 'lucide-react';
import { NexusAutonomousCard } from '../ui/NexusCard';
import { NexusHeader } from '../ui/NexusHeader';

interface FinancialWeightWidgetProps {
  stats?: {
    paid: { amount: number };
    pending: { amount: number };
    cancelled: { amount: number };
    totalGrossAmount?: number;
    collectionRate?: number;
  };
  isLoading?: boolean;
}

const FinancialWeightSkeleton: React.FC = () => (
  <NexusAutonomousCard className="h-full min-h-[340px] animate-pulse">
    <NexusHeader title="Salud Financiera" subtitle="Impacto" icon={Banknote} />
    <div className="flex flex-col gap-8 pt-4">
       <div className="h-12 w-64 bg-stone-100 rounded-full" />
       <div className="h-4 w-full bg-stone-100 rounded-full" />
    </div>
  </NexusAutonomousCard>
);

export const FinancialWeightWidget: React.FC<FinancialWeightWidgetProps> = ({
  stats,
  isLoading = false
}) => {
  if (isLoading) return <FinancialWeightSkeleton />;

  const paid = stats?.paid.amount || 0;
  const pending = stats?.pending.amount || 0;
  const cancelled = stats?.cancelled.amount || 0;
  const gross = stats?.totalGrossAmount ?? (paid + pending + cancelled);
  const collectionRate = stats?.collectionRate ?? (gross > 0 ? (paid / gross) * 100 : 0);
  
  const paidWidth = gross > 0 ? (paid / gross) * 100 : 0;
  const pendingWidth = gross > 0 ? (pending / gross) * 100 : 0;
  const cancelledWidth = gross > 0 ? (cancelled / gross) * 100 : 0;

  return (
    <NexusAutonomousCard className="h-full flex flex-col min-h-[360px]">
      <div className="flex-1 flex flex-col">
        <NexusHeader
          title="Salud Financiera"
          subtitle="Proyección y cobranza"
          icon={Banknote}
          iconVariant="emerald"
        />

        <div className="flex flex-col gap-2 mt-8 flex-1 justify-center">
          <p className="text-label uppercase text-text-muted font-black tracking-widest">Monto Bruto Total</p>
          <div className="flex items-baseline gap-2">
            <span className="text-[2.5rem] font-black text-text-main leading-none tabular-nums">
              ${gross.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </span>
            <span className="text-secondary font-black text-brand-600 tabular-nums">
              {collectionRate.toFixed(1)}% Pagado
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div 
          className="flex h-4 overflow-hidden bg-bg-muted border border-border-main"
          style={{ borderRadius: 'var(--radius-card-nested)' }}
        >
          <div className="bg-emerald-500 transition-all duration-1000" style={{ width: `${paidWidth}%` }} />
          <div className="bg-amber-500 transition-all duration-1000" style={{ width: `${pendingWidth}%` }} />
          <div className="bg-rose-500 transition-all duration-1000" style={{ width: `${cancelledWidth}%` }} />
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-label uppercase font-black tracking-widest text-text-muted">Pagado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-label uppercase font-black tracking-widest text-text-muted">Pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-label uppercase font-black tracking-widest text-text-muted">Cancelado</span>
          </div>
        </div>
      </div>
    </NexusAutonomousCard>
  );
};
