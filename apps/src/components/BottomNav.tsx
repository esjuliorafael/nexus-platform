import React from 'react';
import { LayoutGrid, Image, ShoppingBag, Settings, Package, Truck } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'Inicio' | 'Galería' | 'Tienda' | 'Órdenes' | 'Envíos' | 'Sistema';
  onTabChange: (tab: 'Inicio' | 'Galería' | 'Tienda' | 'Órdenes' | 'Envíos' | 'Sistema') => void;
  tabs: Array<'Inicio' | 'Galería' | 'Tienda' | 'Órdenes' | 'Envíos' | 'Sistema'>;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, tabs }) => {
  const items = [
    { id: 'Inicio', label: 'Inicio', icon: <LayoutGrid size={22} /> },
    { id: 'Galería', label: 'Galería', icon: <Image size={22} /> },
    { id: 'Tienda', label: 'Tienda', icon: <ShoppingBag size={22} /> },
    { id: 'Órdenes', label: 'Órdenes', icon: <Package size={22} /> },
    { id: 'Envíos', label: 'Envíos', icon: <Truck size={22} /> },
    { id: 'Sistema', label: 'Sistema', icon: <Settings size={22} /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[60] px-4 pb-6 pt-2">
      <div className="max-w-md mx-auto bg-white/90 backdrop-blur-xl border border-white/60 shadow-[0_-8px_30px_rgb(0,0,0,0.06)] rounded-[2.5rem] flex items-center justify-around py-3 px-2">
        {tabs.map((tabId) => {
          const item = items.find(i => i.id === tabId);
          if (!item) return null;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className="relative flex flex-col items-center justify-center flex-1 gap-1 group transition-all duration-300 py-1"
            >
              {isActive && (
                <div className="absolute inset-0 bg-brand-50 rounded-2xl animate-in fade-in zoom-in duration-300 -z-10 mx-1 scale-90" />
              )}
              
              <div className={`transition-all duration-300 ${isActive ? 'text-brand-600 scale-110' : 'text-stone-400 group-hover:text-stone-600'}`}>
                {item.icon}
              </div>
              
              <span className={`text-[10px] font-bold tracking-tight transition-all duration-300 ${isActive ? 'text-brand-700 opacity-100' : 'text-stone-400 opacity-80'}`}>
                {item.label}
              </span>

              {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 bg-brand-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};