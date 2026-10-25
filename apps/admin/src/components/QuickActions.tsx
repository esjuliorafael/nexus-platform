import React from "react";
import {
  Archive,
  Image,
  ShoppingBag,
  PackagePlus,
  ClipboardList,
  PenTool,
  Settings,
  Truck,
  Users,
  LayoutGrid,
  Tags,
  ArrowLeft,
  MessageCircle,
  Timer,
  Bell,
  Receipt,
  Ticket,
  Brain,
  MonitorPlay,
  UserRound,
  KeyRound,
  Store,
  BadgePercent,
  Megaphone,
  ChartNoAxesCombined,
  Link2,
} from "lucide-react";
import type { PermissionId } from "@nexus/types";

type ActionItem = {
  icon: React.ReactNode;
  label: string;
  permission?: PermissionId | PermissionId[];
};

interface QuickActionsProps {
  className?: string;
  context?: string;
  onAction?: (label: string) => void;
  isDetail?: boolean;
  raffleEnabled?: boolean;
  permissions: string[];
  detailActions?: Array<{ icon: React.ReactNode; label: string }>;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  className = "",
  context,
  onAction,
  isDetail,
  raffleEnabled = false,
  permissions,
  detailActions = [],
}) => {
  const can = (permission?: PermissionId | PermissionId[]) =>
    !permission || (Array.isArray(permission)
      ? permission.some((item) => permissions.includes(item))
      : permissions.includes(permission));

  const allActions: { group: string; items: ActionItem[] }[] = [
    {
      group: "Medios",
      items: [
        { icon: <Image size={20} />, label: "Ver medios", permission: "media.manage" },
        { icon: <Tags size={20} />, label: "Ver categorías", permission: "categories.manage" },
        { icon: <MonitorPlay size={20} />, label: "Slider inicio", permission: "storefront.content.manage" },
        { icon: <Archive size={20} />, label: "Bóveda de medios", permission: "media.vault.manage" },
      ] satisfies ActionItem[],
    },
    {
      group: "Tienda",
      items: [
        { icon: <ShoppingBag size={20} />, label: "Ver productos", permission: "products.view" },
        { icon: <PackagePlus size={20} />, label: "Nuevo producto", permission: "products.manage" },
        { icon: <MonitorPlay size={20} />, label: "Héroes tienda", permission: "storefront.content.manage" },
        { icon: <BadgePercent size={20} />, label: "Cupones", permission: "coupons.manage" },
        { icon: <Link2 size={20} />, label: "Enlaces de pago", permission: "payment-links.manage" },
        {
          icon: isDetail ? (
            <ArrowLeft size={20} />
          ) : (
            <ClipboardList size={20} />
          ),
          label: isDetail ? "Volver" : "Ver Órdenes",
          permission: isDetail ? undefined : "orders.view",
        },
      ] satisfies ActionItem[],
    },
    {
      group: "Operaciones",
      items: [
        {
          icon: <ClipboardList size={20} />,
          label: "Gestión de operaciones",
          permission: ["orders.view", "products.view", "raffles.participations.view"],
        },
        {
          icon: <ChartNoAxesCombined size={20} />,
          label: "Resumen de órdenes",
          permission: "dashboard.view",
        },
      ] satisfies ActionItem[],
    },
    {
      group: "Rifas",
      items: [
        { icon: <Ticket size={20} />, label: "Ver rifas", permission: "raffles.view" },
        { icon: <BadgePercent size={20} />, label: "Cupones de rifas", permission: "raffles.coupons.manage" },
        {
          icon: <ClipboardList size={20} />,
          label: "Gestión de participaciones",
          permission: "raffles.participations.view",
        },
      ] satisfies ActionItem[],
    },
    {
      group: "Sistema",
      items: [
        { icon: <Receipt size={20} />, label: "Estado de cuenta", permission: "billing.view" },
        { icon: <Store size={20} />, label: "Estado Storefront", permission: "settings.view" },
        { icon: <Megaphone size={20} />, label: "Avisos Storefront", permission: "storefront.content.manage" },
        { icon: <Settings size={20} />, label: "Plataforma", permission: "settings.manage" },
        { icon: <Users size={20} />, label: "Usuarios", permission: "users.manage" },
        { icon: <LayoutGrid size={20} />, label: "Departamentos", permission: "categories.manage" },
        { icon: <Truck size={20} />, label: "Configurar envíos", permission: "shipping.manage" },
        { icon: <Ticket size={20} />, label: "Activar rifas", permission: "raffles.settings.manage" },
        { icon: <Brain size={20} />, label: "Audiencias", permission: "raffles.intelligence.view" },
        { icon: <Timer size={20} />, label: "Lib. Inventario", permission: "inventory.audit" },
        { icon: <PenTool size={20} />, label: "Añadir logo", permission: "storefront.content.manage" },
      ] satisfies ActionItem[],
    },
    {
      group: "Mi Perfil",
      items: [
        { icon: <UserRound size={20} />, label: "Datos personales" },
        { icon: <MessageCircle size={20} />, label: "Contacto público" },
        { icon: <Bell size={20} />, label: "Notificaciones" },
        { icon: <KeyRound size={20} />, label: "Seguridad" },
      ] satisfies ActionItem[],
    },
  ];

  let filteredActions =
    context && context !== "Inicio"
      ? allActions.filter((group) => group.group === context)
      : allActions;

  filteredActions = filteredActions
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => can(item.permission)),
    }))
    .filter((group) => group.items.length > 0);

  if (!raffleEnabled) {
    filteredActions = filteredActions.filter(
      (group) => group.group !== "Rifas",
    );
  }

  if (isDetail) {
    filteredActions = [
      {
        group: context || "Tienda",
        items: [
          { icon: <ArrowLeft size={20} />, label: "Volver" },
          ...detailActions,
        ],
      },
    ];
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
          scrollSnapType: "x proximity",
          overscrollBehaviorInline: "contain",
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
                  scrollSnapAlign: "start",
                  scrollSnapStop: "normal",
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
                <span className="text-secondary font-medium leading-tight normal-case text-text-main text-center w-full truncate">
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
