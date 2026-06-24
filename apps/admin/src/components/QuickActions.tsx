import React from "react";
import {
  Image,
  PlusCircle,
  Layers,
  ShoppingBag,
  PackagePlus,
  ListOrdered,
  ClipboardList,
  PenTool,
  Settings,
  Truck,
  Users,
  LayoutGrid,
  Tags,
  FolderPlus,
  ArrowLeft,
  CreditCard,
  MessageCircle,
  Timer,
  Bell,
  Receipt,
  Ticket,
  TicketPlus,
  Brain,
  MonitorPlay,
  UserRound,
  KeyRound,
} from "lucide-react";
import { QuickActionGroup } from "../types";

interface QuickActionsProps {
  className?: string;
  context?: string;
  onAction?: (label: string) => void;
  isDetail?: boolean;
  raffleEnabled?: boolean;
  userRole?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  className = "",
  context,
  onAction,
  isDetail,
  raffleEnabled = false,
  userRole = "staff",
}) => {
  const allActions = [
    {
      group: "Medios",
      items: [
        { icon: <Image size={20} />, label: "Ver Medios" },
        { icon: <PlusCircle size={20} />, label: "Nuevo Medio" },
        { icon: <Tags size={20} />, label: "Ver Categorías" },
        { icon: <FolderPlus size={20} />, label: "Nueva Categoría" },
        { icon: <MonitorPlay size={20} />, label: "Slider Inicio" },
      ],
    },
    {
      group: "Tienda",
      items: [
        { icon: <ShoppingBag size={20} />, label: "Ver Productos" },
        { icon: <PackagePlus size={20} />, label: "Nuevo Producto" },
        {
          icon: isDetail ? (
            <ArrowLeft size={20} />
          ) : (
            <ClipboardList size={20} />
          ),
          label: isDetail ? "Volver" : "Ver Órdenes",
        },
      ],
    },
    {
      group: "Rifas",
      items: [
        { icon: <Ticket size={20} />, label: "Ver Rifas" },
        { icon: <TicketPlus size={20} />, label: "Nueva Rifa" },
      ],
    },
    {
      group: "Sistema",
      items: [
        { icon: <Receipt size={20} />, label: "Estado de Cuenta" },
        ...(userRole?.toLowerCase() === "superadmin"
          ? [{ icon: <Settings size={20} />, label: "Plataforma" }]
          : []),
        ...(userRole?.toLowerCase() === "superadmin" || userRole?.toLowerCase() === "admin"
          ? [{ icon: <Users size={20} />, label: "Usuarios" }]
          : []),
        { icon: <LayoutGrid size={20} />, label: "Departamentos" },
        { icon: <Truck size={20} />, label: "Configurar Envíos" },
        { icon: <Ticket size={20} />, label: "Activar Rifas" },
        ...(userRole?.toLowerCase() === "superadmin"
          ? [{ icon: <Brain size={20} />, label: "Audiencias" }]
          : []),
        { icon: <Timer size={20} />, label: "Lib. Inventario" },
        { icon: <PenTool size={20} />, label: "Añadir Logo" },
      ],
    },
    {
      group: "Mi Perfil",
      items: [
        { icon: <UserRound size={20} />, label: "Datos Personales" },
        { icon: <MessageCircle size={20} />, label: "Contacto Público" },
        { icon: <Bell size={20} />, label: "Notificaciones" },
        { icon: <KeyRound size={20} />, label: "Seguridad" },
      ],
    },
  ];

  let filteredActions =
    context && context !== "Inicio"
      ? allActions.filter((group) => group.group === context)
      : allActions;

  if (!raffleEnabled) {
    filteredActions = filteredActions.filter(
      (group) => group.group !== "Rifas",
    );
  }

  return (
    <div className={`flex flex-col ${className}`} style={{ gap: "var(--space-md)" }}>
      {/* Mobile/Tablet: Horizontal Scroll */}
      <div
        className="relative z-40 lg:hidden w-screen overflow-x-auto no-scrollbar"
        style={{
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
          paddingBlock: "var(--space-sm)",
          paddingLeft: "max(var(--space-md), env(safe-area-inset-left))",
          paddingRight: "max(var(--space-md), env(safe-area-inset-right))",
          scrollPaddingInline: "var(--space-md)",
        }}
      >
        <div className="flex min-w-max" style={{ gap: "var(--space-base)" }}>
          {filteredActions.flatMap((group, gIndex) =>
            group.items.map((action, iIndex) => (
              <button
                key={`${gIndex}-${iIndex}`}
                onClick={() => onAction?.(action.label)}
                className="flex flex-col items-center justify-center bg-bg-card shadow-sm dark:shadow-none border border-border-main active:scale-95 transition-all duration-200"
                style={{
                  width: "var(--size-quick-action-mobile)",
                  minWidth: "var(--size-quick-action-mobile)",
                  aspectRatio: "1 / 1",
                  gap: "var(--space-sm)",
                  padding: "var(--padding-card-micro)",
                  borderRadius: "var(--radius-outer)",
                  transitionTimingFunction: "var(--ease-emil)",
                }}
                title={action.label}
              >
                <div
                  className="text-stone-600 bg-bg-muted group-active:scale-95 transition-transform flex items-center justify-center"
                  style={{
                    width: "var(--size-button-card)",
                    height: "var(--size-button-card)",
                    borderRadius: "var(--radius-card-micro-inner)",
                  }}
                >
                  {action.icon}
                </div>
                <span className="text-caption uppercase text-text-main text-center w-full truncate">
                  {action.label}
                </span>
              </button>
            )),
          )}
        </div>
      </div>

      {/* Desktop: Vertical Sticky Sidebar Style */}
      <div
        className="hidden lg:flex flex-col sticky"
        style={{ gap: "var(--space-lg)", top: "var(--space-2xl)" }}
      >
        {filteredActions.map((group, idx) => (
          <div key={idx} className="group relative">
            <div
              className="flex flex-col items-center bg-bg-card/80 backdrop-blur-xl shadow-xl shadow-stone-200/40 border border-border-main"
              style={{
                gap: "var(--space-sm)",
                padding: "var(--padding-card-rail)",
                borderRadius: "var(--radius-outer)",
                width: "fit-content",
              }}
            >
              {group.items.map((item, itemIdx) => (
                <button
                  key={itemIdx}
                  onClick={() => onAction?.(item.label)}
                  className="text-stone-400 hover:bg-brand-50 hover:text-brand-600 transition-all duration-200 relative group/btn flex items-center justify-center active:scale-90"
                  style={{
                    width: "var(--size-button-card)",
                    height: "var(--size-button-card)",
                    borderRadius: "var(--radius-card-rail-inner)",
                    transitionTimingFunction: "var(--ease-emil)",
                  }}
                  aria-label={item.label}
                >
                  <div className="transition-transform duration-200 group-hover/btn:scale-110">
                    {item.icon}
                  </div>
                  <span
                    className="absolute left-full bg-stone-800 text-white text-label uppercase tracking-[0.15em] opacity-0 group-hover/btn:opacity-100 transition-all duration-200 translate-x-[calc(var(--space-sm)*-1)] group-hover/btn:translate-x-0 z-50 pointer-events-none shadow-2xl"
                    style={{
                      marginLeft: "var(--space-md)",
                      padding: "var(--space-sm) var(--space-md)",
                      borderRadius: "var(--radius-card-rail-inner)",
                    }}
                  >
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
