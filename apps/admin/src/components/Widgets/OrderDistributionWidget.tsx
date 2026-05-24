import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ShoppingBag } from 'lucide-react';
import { NexusAutonomousCard } from '../ui/NexusCard';
import { NexusHeader } from '../ui/NexusHeader';

interface OrderDistributionWidgetProps {
  stats?: {
    paid: { count: number };
    pending: { count: number };
    cancelled: { count: number };
  };
  isLoading?: boolean;
}

const OrderDistributionSkeleton: React.FC = () => (
  <NexusAutonomousCard className="h-full min-h-[340px] animate-pulse">
    <NexusHeader title="Distribución" subtitle="Volumen" icon={ShoppingBag} />
    <div className="flex flex-col items-center justify-center pt-8">
       <div className="w-48 h-48 rounded-full border-[16px] border-stone-100" />
    </div>
  </NexusAutonomousCard>
);

export const OrderDistributionWidget: React.FC<OrderDistributionWidgetProps> = ({
  stats,
  isLoading = false
}) => {
  if (isLoading) return <OrderDistributionSkeleton />;

  const data = [
    { name: 'Pagadas', count: stats?.paid.count || 0, color: '#059669' },
    { name: 'Pendientes', count: stats?.pending.count || 0, color: '#d97706' },
    { name: 'Canceladas', count: stats?.cancelled.count || 0, color: '#e11d48' }
  ];

  const total = data.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <NexusAutonomousCard className="h-full flex flex-col min-h-[360px]">
      <NexusHeader
        title="Distribución"
        subtitle="Estado de órdenes"
        icon={ShoppingBag}
        iconVariant="brand"
      />

      <div className="relative flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={95}
              paddingAngle={4}
              dataKey="count"
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: 'var(--radius-card-inner)',
                border: '1px solid var(--border-main)',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                padding: '12px'
              }}
              itemStyle={{ fontWeight: 700, fontSize: '10px' }}
              formatter={(value: number) => [value, 'Órdenes']}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-display text-text-main tabular-nums leading-none">{total}</span>
          <span className="text-label uppercase text-text-muted font-black tracking-widest mt-1">Total</span>
        </div>
      </div>
    </NexusAutonomousCard>
  );
};
