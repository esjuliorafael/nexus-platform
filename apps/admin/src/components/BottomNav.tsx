import React, { useRef, useEffect } from 'react';
import { LayoutGrid, Image, ShoppingBag, Settings, Package, Truck, Ticket } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'Inicio' | 'Galería' | 'Tienda' | 'Órdenes' | 'Envíos' | 'Sistema' | 'Rifas';
  onTabChange: (tab: 'Inicio' | 'Galería' | 'Tienda' | 'Órdenes' | 'Envíos' | 'Sistema' | 'Rifas') => void;
  tabs: Array<'Inicio' | 'Galería' | 'Tienda' | 'Órdenes' | 'Envíos' | 'Sistema' | 'Rifas'>;
  hasBillingNotification?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ 
  activeTab, 
  onTabChange, 
  tabs,
  hasBillingNotification = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTabElementRef = useRef<HTMLButtonElement>(null);

  const items = [
    { id: 'Inicio', label: 'Inicio', icon: <LayoutGrid size={20} /> },
    { id: 'Galería', label: 'Galería', icon: <Image size={20} /> },
    { id: 'Tienda', label: 'Tienda', icon: <ShoppingBag size={20} /> },
    { id: 'Órdenes', label: 'Órdenes', icon: <Package size={20} /> },
    { id: 'Envíos', label: 'Envíos', icon: <Truck size={20} /> },
    { id: 'Sistema', label: 'Sistema', icon: <Settings size={20} /> },
    { id: 'Rifas', label: 'Rifas', icon: <Ticket size={20} /> },
  ];

  // Clip-Path Effect Logic
  useEffect(() => {
    const updateClipPath = () => {
      const container = containerRef.current;
      const activeElement = activeTabElementRef.current;
      
      if (container && activeElement) {
        const containerRect = container.getBoundingClientRect();
        const activeRect = activeElement.getBoundingClientRect();

        const leftOffset = activeRect.left - containerRect.left;
        const rightOffset = containerRect.right - activeRect.right;

        const leftPercent = Math.max(0, (leftOffset / containerRect.width) * 100);
        const rightPercent = Math.max(0, (rightOffset / containerRect.width) * 100);

        // round 2rem para que coincida con el redondeo del contenedor interno
        container.style.clipPath = `inset(0 ${rightPercent.toFixed(4)}% 0 ${leftPercent.toFixed(4)}% round 2rem)`;
      }
    };

    // Usamos ResizeObserver para mayor robustez
    const observer = new ResizeObserver(updateClipPath);
    if (containerRef.current) observer.observe(containerRef.current);
    
    updateClipPath();
    window.addEventListener('resize', updateClipPath);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateClipPath);
    };
  }, [activeTab, tabs.length]);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[60] px-4 pb-8 pt-2">
      <div className="max-w-md mx-auto bg-bg-card/90 backdrop-blur-2xl border border-border-main shadow-2xl dark:shadow-none rounded-[2.5rem] p-1.5 relative overflow-hidden">
        
        {/* Layer 1: Base (Inactive State) */}
        <div className="flex items-center justify-around w-full relative">
          {tabs.map((tabId) => {
            const item = items.find(i => i.id === tabId);
            if (!item) return null;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                ref={isActive ? activeTabElementRef : null}
                onClick={() => onTabChange(item.id)}
                className="relative flex flex-col items-center justify-center flex-1 gap-1 py-2 group select-none outline-none z-10"
              >
                <div className={`transition-all duration-300 active:scale-75 ${
                  isActive ? 'opacity-0' : 'text-text-muted opacity-60 group-hover:opacity-100'
                }`}>
                  {item.icon}
                  {item.id === 'Sistema' && hasBillingNotification && !isActive && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-500 rounded-full border-2 border-bg-card animate-pulse" />
                  )}
                </div>
                <span className={`text-[9px] font-bold tracking-tight transition-all duration-300 ${
                  isActive ? 'opacity-0' : 'text-text-muted opacity-40 group-hover:opacity-70'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Layer 2: Overlay (Active State revealed by Clip-Path) */}
        <div 
          aria-hidden 
          ref={containerRef}
          className="absolute inset-1.5 pointer-events-none transition-[clip-path] duration-500 z-20"
          style={{ transitionTimingFunction: 'var(--ease-emil)' }}
        >
          <div className="flex items-center justify-around h-full bg-bg-muted rounded-[2rem] shadow-inner border border-border-main/50">
            {tabs.map((tabId) => {
              const item = items.find(i => i.id === tabId);
              if (!item) return null;
              
              return (
                <div
                  key={`overlay-${item.id}`}
                  className="flex flex-col items-center justify-center flex-1 gap-1 py-2"
                >
                  <div className="text-brand-600 scale-110">
                    {item.icon}
                  </div>
                  <span className="text-[9px] font-black tracking-tight text-text-main">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
