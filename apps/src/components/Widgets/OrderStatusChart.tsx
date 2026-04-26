import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface OrderStatusChartProps {
  stats?: {
    paid: { count: number; amount: number };
    pending: { count: number; amount: number };
    cancelled: { count: number; amount: number };
    totalCount: number;
    totalAmount: number;
  };
  isLoading?: boolean;
}

const OrderStatusChartSkeleton: React.FC = () => (
  <div className="flex flex-col h-full bg-white rounded-[2.5rem] p-8 shadow-sm border border-stone-200 animate-pulse">
    {/* Header */}
    <div className="flex flex-col mb-4 gap-2">
      <div className="h-4 w-36 bg-stone-200 rounded-full" />
      <div className="flex items-baseline gap-2">
        <div className="h-9 w-12 bg-stone-200 rounded-full" />
        <div className="h-3 w-14 bg-stone-100 rounded-full" />
      </div>
    </div>

    {/* Donut placeholder */}
    <div className="flex-grow flex items-center justify-center min-h-[180px]">
      <div className="relative w-[140px] h-[140px]">
        {/* Anillo exterior */}
        <div className="absolute inset-0 rounded-full bg-stone-200" />
        {/* Agujero interior */}
        <div className="absolute inset-[30px] rounded-full bg-white" />
      </div>
    </div>

    {/* Leyenda: 3 filas */}
    <div className="flex flex-col gap-3 mt-4 border-t border-stone-100 pt-5">
      {[72, 56, 64].map((w, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-stone-200" />
            <div className={`h-2.5 bg-stone-200 rounded-full`} style={{ width: w }} />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-5 bg-stone-200 rounded-full" />
            <div className="h-2.5 w-10 bg-stone-100 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const OrderStatusChart: React.FC<OrderStatusChartProps> = ({ stats, isLoading = false }) => {

  const data = [
    { name: 'Pagado',    value: stats?.paid.count      || 0, color: '#15803d' },
    { name: 'Pendiente', value: stats?.pending.count   || 0, color: '#b45309' },
    { name: 'Cancelado', value: stats?.cancelled.count || 0, color: '#be123c' },
  ];

  const totalOrders = stats?.totalCount || 0;

  if (isLoading) return <OrderStatusChartSkeleton />;

  return (
    <div className="flex flex-col h-full bg-white rounded-[2.5rem] p-8 shadow-sm border border-stone-200">
      <div className="flex flex-col mb-4">
        <h3 className="text-lg font-black text-stone-700 tracking-tight">Estado de Órdenes</h3>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-4xl font-black text-stone-800 tracking-tighter">{totalOrders}</span>
          <span className="text-sm text-stone-400 font-bold">totales</span>
        </div>
      </div>

      <div className="flex-grow w-full relative min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e7e5e4', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
              itemStyle={{ fontWeight: 700, fontSize: '12px' }}
              formatter={(value: number) => [value, '\u00d3rdenes']}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black text-stone-700">{totalOrders}</span>
        </div>
      </div>

      {/* Detailed Legend */}
      <div className="flex flex-col gap-3 mt-4 border-t border-stone-100 pt-5">
        {data.map((item) => {
          const percentage = totalOrders > 0 ? ((item.value / totalOrders) * 100).toFixed(1) : '0.0';
          return (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-stone-600 font-bold text-xs uppercase tracking-wider">{item.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-stone-800 font-black">{item.value}</span>
                <span className="text-stone-400 text-[10px] font-bold w-10 text-right">{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};