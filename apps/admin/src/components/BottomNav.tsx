import React, { useEffect, useRef } from "react";
import {
  Image,
  LayoutGrid,
  Package,
  Settings,
  ShoppingBag,
  Ticket,
  Truck,
} from "lucide-react";

type BottomTab =
  | "Inicio"
  | "Medios"
  | "Tienda"
  | "Órdenes"
  | "Envíos"
  | "Sistema"
  | "Rifas";

interface BottomNavProps {
  activeTab: BottomTab;
  onTabChange: (tab: BottomTab) => void;
  tabs: BottomTab[];
  hasBillingNotification?: boolean;
  newOrdersCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  tabs,
  hasBillingNotification = false,
  newOrdersCount = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTabElementRef = useRef<HTMLButtonElement>(null);

  const items = [
    { id: "Inicio", label: "Inicio", icon: <LayoutGrid size={20} /> },
    { id: "Medios", label: "Medios", icon: <Image size={20} /> },
    { id: "Tienda", label: "Tienda", icon: <ShoppingBag size={20} /> },
    { id: "Órdenes", label: "Órdenes", icon: <Package size={20} /> },
    { id: "Envíos", label: "Envíos", icon: <Truck size={20} /> },
    { id: "Sistema", label: "Sistema", icon: <Settings size={20} /> },
    { id: "Rifas", label: "Rifas", icon: <Ticket size={20} /> },
  ] as const;

  useEffect(() => {
    const updateClipPath = () => {
      const container = containerRef.current;
      const activeElement = activeTabElementRef.current;

      if (container && activeElement) {
        const containerRect = container.getBoundingClientRect();
        const activeRect = activeElement.getBoundingClientRect();

        const leftOffset = activeRect.left - containerRect.left;
        const rightOffset = containerRect.right - activeRect.right;

        const leftPercent = Math.max(
          0,
          (leftOffset / containerRect.width) * 100,
        );
        const rightPercent = Math.max(
          0,
          (rightOffset / containerRect.width) * 100,
        );

        container.style.clipPath = `inset(0 ${rightPercent.toFixed(4)}% 0 ${leftPercent.toFixed(4)}% round 2rem)`;
      }
    };

    const observer = new ResizeObserver(updateClipPath);
    if (containerRef.current) observer.observe(containerRef.current);

    updateClipPath();
    window.addEventListener("resize", updateClipPath);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateClipPath);
    };
  }, [activeTab, tabs.length]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[60] px-4 pb-8 pt-2 md:hidden">
      <div className="relative mx-auto max-w-md overflow-hidden rounded-[2.5rem] border border-border-main bg-bg-card/90 p-1.5 shadow-2xl backdrop-blur-2xl dark:shadow-none">
        <div className="relative flex w-full items-center justify-around">
          {tabs.map((tabId) => {
            const item = items.find((candidate) => candidate.id === tabId);
            if (!item) return null;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                ref={isActive ? activeTabElementRef : null}
                onClick={() => onTabChange(item.id)}
                className="group relative z-10 flex flex-1 select-none flex-col items-center justify-center gap-1 py-2 outline-none"
              >
                <div
                  className={`relative transition-all duration-300 active:scale-75 ${
                    isActive
                      ? "opacity-0"
                      : "text-text-muted opacity-60 group-hover:opacity-100"
                  }`}
                >
                  {item.icon}
                  {item.id === "Sistema" &&
                    hasBillingNotification &&
                    !isActive && (
                      <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-bg-card bg-brand-500" />
                    )}
                  {item.id === "Órdenes" && newOrdersCount > 0 && !isActive && (
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-5 animate-pulse items-center justify-center rounded-full border-2 border-bg-card bg-rose-500 px-1 text-[9px] font-black text-white">
                      {newOrdersCount > 9 ? "9+" : newOrdersCount}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[9px] font-bold tracking-tight transition-all duration-300 ${
                    isActive
                      ? "opacity-0"
                      : "text-text-muted opacity-40 group-hover:opacity-70"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        <div
          aria-hidden
          ref={containerRef}
          className="pointer-events-none absolute inset-1.5 z-20 transition-[clip-path] duration-500"
          style={{ transitionTimingFunction: "var(--ease-emil)" }}
        >
          <div className="flex h-full items-center justify-around rounded-[2rem] border border-border-main/50 bg-bg-muted shadow-inner">
            {tabs.map((tabId) => {
              const item = items.find((candidate) => candidate.id === tabId);
              if (!item) return null;

              return (
                <div
                  key={`overlay-${item.id}`}
                  className="flex flex-1 flex-col items-center justify-center gap-1 py-2"
                >
                  <div className="scale-110 text-brand-600">{item.icon}</div>
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
