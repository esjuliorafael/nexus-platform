import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { AnnualService, ExtraCharge, BillingPayment } from '../../types';
import { NexusHero } from '../ui/NexusHero';

interface BillingAlertWidgetProps {
  services: AnnualService[];
  charges: ExtraCharge[];
  payments: BillingPayment[];
  isLoading?: boolean;
  onNavigate: () => void;
}

const BillingAlertSkeleton: React.FC = () => (
  <div className="w-full h-[180px] bg-stone-100 dark:bg-stone-900 animate-pulse" style={{ borderRadius: 'var(--radius-outer)' }} />
);

export const BillingAlertWidget: React.FC<BillingAlertWidgetProps> = ({ 
  services, 
  charges, 
  payments,
  isLoading = false, 
  onNavigate 
}) => {
  if (isLoading) return <BillingAlertSkeleton />;

  // --- LÓGICA CONTABLE UNIFICADA ---
  const totalObligations = services.filter(s => !s.isPaid).reduce((acc, s) => acc + s.amount, 0) +
                           charges.filter(c => c.status === 'pending').reduce((acc, c) => acc + c.amount, 0);
  
  const totalAbonado = payments.reduce((acc, p) => acc + p.amount, 0);
  const netBalance = Math.max(0, totalObligations - totalAbonado);

  if (netBalance === 0) return null;

  const hasPending = netBalance > 0;
  
  const unpaidServices = services.filter(s => !s.isPaid && s.dueDate);
  const nextDueDate = unpaidServices.length > 0 
    ? unpaidServices.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0].dueDate 
    : null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <div 
      onClick={onNavigate} 
      className="cursor-pointer active:scale-[0.99] transition-all duration-500 group relative z-10"
    >
      <NexusHero
        title={`$${netBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
        subtitle="Saldo Total Pendiente"
        icon={AlertCircle}
        variant="dark"
        badge={nextDueDate ? "Próximo Vencimiento" : undefined}
        badgeValue={nextDueDate ? formatDate(nextDueDate) : undefined}
        className="hover:shadow-2xl hover:shadow-brand-500/10 transition-shadow duration-700"
      />
    </div>
  );
};
