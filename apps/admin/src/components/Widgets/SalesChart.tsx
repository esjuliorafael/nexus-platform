import React, { useMemo } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { NexusAutonomousCard } from '../ui/NexusCard';
import { NexusHeader } from '../ui/NexusHeader';

interface SalesChartProps {
  data?: Record<string, number>;
  isLoading?: boolean;
}

const SKELETON_BARS = [55, 80, 40, 90, 65, 75, 100];

const SalesChartSkeleton: React.FC = () => (
  <NexusAutonomousCard className="h-full min-h-[320px] animate-pulse">
    <NexusHeader
      title="Tendencia de Ventas"
      subtitle="Tienda y rifas de los últimos 7 días"
      icon={TrendingUp}
    />
    <div className="flex flex-col justify-between h-full">
      <div className="flex items-baseline gap-2 mb-6">
        <div className="h-10 w-40 bg-stone-100 rounded-full" />
        <div className="h-4 w-10 bg-stone-100 rounded-full" />
      </div>
      <div className="flex-grow w-full min-h-[180px] flex items-end justify-between gap-2 pt-4">
        {SKELETON_BARS.map((height, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full rounded-t-md bg-stone-100" style={{ height: `${height}%` }} />
            <div className="h-2.5 w-5 bg-stone-50 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  </NexusAutonomousCard>
);

export const SalesChart: React.FC<SalesChartProps> = ({ data = {}, isLoading = false }) => {
  const chartData = useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const today = new Date();
    const result = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateString = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      result.push({
        name: days[d.getDay()],
        value: Number(data[dateString] || 0),
        isToday: i === 0
      });
    }
    return result;
  }, [data]);

  const valuesArray: number[] = Object.values(data) as number[];
  const totalVentas: number = valuesArray.reduce((acc: number, val: number) => acc + val, 0);

  if (isLoading) return <SalesChartSkeleton />;

  return (
    <NexusAutonomousCard className="h-full min-h-[320px]">
      <div className="flex flex-col h-full">
        <NexusHeader
          title="Tendencia de Ventas"
          subtitle="Tienda y rifas de los últimos 7 días"
          icon={TrendingUp}
          iconVariant="emerald"
        />
        
        <div className="flex items-baseline mb-8" style={{ gap: 'var(--space-xs)' }}>
          <div className="flex items-baseline text-display text-text-main">
            <span className="text-secondary mr-0.5 opacity-50 font-bold">$</span>
            <span className="font-bold tracking-tighter">
              {Number(totalVentas).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </span>
          </div>
          <span className="text-label uppercase tracking-[0.15em] text-stone-400 font-bold">MXN</span>
        </div>

        <div className="flex-grow w-full mt-auto min-h-[200px]">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-main)" opacity={0.5} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} 
                tickFormatter={(value) => value > 0 ? `$${value}` : '0'}
              />
              <Tooltip 
                cursor={{ fill: 'var(--bg-muted)', opacity: 0.4 }}
                contentStyle={{ 
                  backgroundColor: 'var(--bg-card)', 
                  borderRadius: 'var(--radius-card-inner)', 
                  border: '1px solid var(--border-main)', 
                  boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)',
                  padding: '12px'
                }}
                itemStyle={{ color: 'var(--brand-600)', fontWeight: 700, fontSize: '12px' }}
                formatter={(value: number) => [`$${Number(value).toLocaleString('es-MX')}`, 'Ventas']}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.isToday ? 'var(--brand-600)' : 'var(--border-main)'} 
                    className="transition-all duration-300 hover:opacity-80"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </NexusAutonomousCard>
  );
};
