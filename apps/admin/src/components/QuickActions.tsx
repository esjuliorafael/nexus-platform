import React from 'react';
import { 
  Image, PlusCircle, Layers, ShoppingBag, 
  PackagePlus, ListOrdered, ClipboardList, PenTool, 
  Settings, Truck, Users, LayoutGrid, Tags, FolderPlus,
  ArrowLeft, CreditCard, MessageCircle, Timer, Bell, Receipt,
  Ticket, TicketPlus
} from 'lucide-react';
import { QuickActionGroup } from '../types';

interface QuickActionsProps {
  className?: string;
  context?: string;
  onAction?: (label: string) => void;
  isDetail?: boolean;
  raffleEnabled?: boolean;
  userRole?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ 
  className, context, onAction, isDetail, 
  raffleEnabled = false, userRole = 'staff' 
}) => {
  const allActions = [
    {
      group: 'Galería',
      items: [
        { icon: <Image size={20} />, label: 'Ver Medios' },
        { icon: <PlusCircle size={20} />, label: 'Nuevo Medio' },
        { icon: <Tags size={20} />, label: 'Ver Categorías' },
        { icon: <FolderPlus size={20} />, label: 'Nueva Categoría' },
      ]
    },
    {
      group: 'Tienda',
      items: [
        { icon: <ShoppingBag size={20} />, label: 'Ver Productos' },
        { icon: <PackagePlus size={20} />, label: 'Nuevo Producto' },
        { 
          icon: isDetail ? <ArrowLeft size={20} /> : <ClipboardList size={20} />, 
          label: isDetail ? 'Volver' : 'Ver Órdenes' 
        },
      ]
    },
    {
      group: 'Rifas',
      items: [
        { icon: <Ticket size={20} />, label: 'Ver Rifas' },
        { icon: <TicketPlus size={20} />, label: 'Nueva Rifa' },
      ]
    },
    {
      group: 'Sistema',
      items: [
        { icon: <Receipt size={20} />, label: 'Estado de Cuenta' },
        ...(userRole?.toLowerCase() === 'superadmin' ? [{ icon: <Settings size={20} />, label: 'Plataforma' }] : []),
        { icon: <Users size={20} />, label: 'Usuarios' },
        { icon: <LayoutGrid size={20} />, label: 'Departamentos' },
        { icon: <Truck size={20} />, label: 'Configurar Envíos' },
        { icon: <Ticket size={20} />, label: 'Activar Rifas' },
        { icon: <Bell size={20} />, label: 'Notificaciones' },
        { icon: <Timer size={20} />, label: 'Lib. Inventario' },
        { icon: <PenTool size={20} />, label: 'Añadir Logo' },
      ]
    }
  ];

  let filteredActions = context && context !== 'Inicio'
    ? allActions.filter(group => group.group === context)
    : allActions;

  if (import.meta.env.VITE_RAFFLE_ENABLED !== 'true' || !raffleEnabled) {
    filteredActions = filteredActions.filter(group => group.group !== 'Rifas');
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Mobile/Tablet: Horizontal Scroll */}
      <div className="lg:hidden w-full overflow-x-auto no-scrollbar py-2 -mx-4 px-4">
        <div className="flex gap-3 min-w-max">
          {filteredActions.flatMap((group, gIndex) => 
            group.items.map((action, iIndex) => (
              <button 
                key={`${gIndex}-${iIndex}`}
                onClick={() => onAction?.(action.label)}
                className="flex flex-col items-center justify-center bg-bg-card p-2 rounded-3xl shadow-sm dark:shadow-none border border-border-main w-20 h-20 active:scale-90 transition-all duration-200"
                style={{ transitionTimingFunction: 'var(--ease-emil)' }}
                title={action.label}
              >
                <div className="text-stone-600 mb-1.5 bg-bg-muted p-2 rounded-2xl group-active:scale-90 transition-transform">
                  {action.icon}
                </div>
                <span className="text-[9px] font-black uppercase tracking-tight text-text-muted text-center leading-tight w-full truncate px-1">
                  {action.label}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Desktop: Vertical Sticky Sidebar Style */}
      <div className="hidden lg:flex flex-col gap-6 sticky top-24">
        {filteredActions.map((group, idx) => (
          <div key={idx} className="group relative">
            <div className="flex flex-col gap-2 bg-bg-card/80 backdrop-blur-xl p-2 rounded-[2rem] shadow-xl shadow-stone-200/40 border border-border-main">
              {group.items.map((item, itemIdx) => (
                <button 
                  key={itemIdx}
                  onClick={() => onAction?.(item.label)}
                  className="p-3 rounded-2xl text-stone-400 hover:bg-brand-50 hover:text-brand-600 transition-all duration-200 relative group/btn flex items-center justify-center active:scale-90"
                  style={{ transitionTimingFunction: 'var(--ease-emil)' }}
                  aria-label={item.label}
                >
                  <div className="transition-transform duration-200 group-hover/btn:scale-110">
                    {item.icon}
                  </div>
                  <span className="absolute left-full ml-4 px-3 py-2 bg-stone-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover/btn:opacity-100 transition-all duration-200 translate-x-[-10px] group-hover/btn:translate-x-0 z-50 pointer-events-none shadow-2xl">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
