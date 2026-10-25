import React, { useState, useCallback, useEffect, createContext } from "react";
import ReactDOM, { flushSync } from "react-dom";
import {
  Calendar,
  Search,
  X,
  Check,
  CheckCircle2,
  Settings,
  Save,
  UserPlus,
  Upload,
  RefreshCw,
  RotateCcw,
  Plus,
  Package,
  ArrowRight,
  ArrowLeft,
  Download,
  Pencil,
  Image as ImageIcon,
  Ticket,
  Link2,
} from "lucide-react";
import { Header } from "./components/Header";
import { QuickActions } from "./components/QuickActions";
import { PageHeader } from "./components/Layout/PageHeader";
import { DashboardView } from "./components/Dashboard/DashboardView";
import { DashboardMilestonesView } from "./components/Dashboard/DashboardMilestonesView";
import { SalesOverviewView } from "./components/Dashboard/SalesOverviewView";
import {
  DEFAULT_SALES_OVERVIEW_FILTERS,
  SalesOverviewFiltersModal,
  type SalesOverviewFilters,
} from "./components/Dashboard/SalesOverviewFiltersModal";
import {
  DEFAULT_DASHBOARD_COMMERCIAL_FILTERS,
  DashboardCommercialFiltersModal,
  type DashboardCommercialFilters,
} from "./components/Dashboard/DashboardCommercialFiltersModal";

import { BottomNav } from "./components/BottomNav";
import { GalleryView, GalleryViewRef } from "./components/Media/GalleryView";
import {
  DEFAULT_GALLERY_ADVANCED_FILTERS,
  GalleryFiltersModal,
  type GalleryAdvancedFilters,
} from "./components/Media/GalleryFiltersModal";
import {
  HomeSliderView,
  HomeSliderViewMode,
  HomeSliderViewRef,
} from "./components/Media/Slider/HomeSliderView";
import {
  MediaVaultView,
  MediaVaultViewMode,
  MediaVaultViewRef,
} from "./components/Media/Vault/MediaVaultView";
import {
  DEFAULT_MEDIA_VAULT_FILTER,
  MediaVaultFiltersModal,
  type MediaVaultFilter,
} from "./components/Media/Vault/MediaVaultFiltersModal";
import { StoreView, StoreViewRef } from "./components/Store/StoreView";
import { PaymentLinksView } from "./components/Store/PaymentLinks/PaymentLinksView";
import {
  DEFAULT_STORE_PRODUCT_ADVANCED_FILTERS,
  StoreProductAdvancedFilters,
  StoreProductFiltersModal,
} from "./components/Store/StoreProductFiltersModal";
import { OrdersView } from "./components/Store/Orders/OrdersView";
import { OrderDetailView } from "./components/Store/Orders/OrderDetailView";
import { OperationsView } from "./components/Operations/OperationsView";
import {
  DEFAULT_OPERATIONS_FILTERS,
  OperationsFiltersModal,
  type OperationsAdvancedFilters,
} from "./components/Operations/OperationsFiltersModal";
import {
  DEFAULT_ORDER_ADVANCED_FILTERS,
  OrderFiltersModal,
  type OrderAdvancedFilters,
} from "./components/Store/Orders/OrderFiltersModal";
import { PlatformSettingsView } from "./components/System/Config/PlatformSettingsView";
import { ShippingView } from "./components/System/Shipping/ShippingView";
import { UsersView } from "./components/System/Users/UsersView";
import { UserForm, type UserFormRef } from "./components/System/Users/UserForm";
import {
  IdentityView,
  IdentityViewRef,
} from "./components/System/Identity/IdentityView";
import { ChannelForm } from "./components/System/Channels/ChannelForm";
import { ChannelEditor } from "./components/System/Channels/ChannelEditor";
import { ChannelsHub } from "./components/System/Channels/ChannelsHub";
import { PrincipalChannelView } from "./components/System/Channels/PrincipalChannelView";
import {
  InventorySettingsView,
  InventorySettingsViewRef,
} from "./components/System/Inventory/InventorySettingsView";
import {
  BillingView,
  BillingViewRef,
} from "./components/System/Billing/BillingView";
import { RaffleView } from "./components/Raffle/RaffleView";
import type { MaterialKind } from "./components/Raffle/RaffleMaterialsView";
import {
  DEFAULT_RAFFLE_ADVANCED_FILTERS,
  RaffleFiltersModal,
  type RaffleAdvancedFilters,
} from "./components/Raffle/RaffleFiltersModal";
import {
  DEFAULT_TICKET_BOARD_FILTER,
  type TicketBoardFilter,
} from "./components/Raffle/RaffleTicketBoardView";
import { RaffleTicketBoardFiltersModal } from "./components/Raffle/RaffleTicketBoardFiltersModal";
import { RaffleParticipationsView } from "./components/Raffle/Participations/RaffleParticipationsView";
import {
  DEFAULT_RAFFLE_PARTICIPATION_FILTERS,
  RaffleParticipationFiltersModal,
  type RaffleParticipationAdvancedFilters,
} from "./components/Raffle/Participations/RaffleParticipationFiltersModal";
import { RaffleParticipationDetailView } from "./components/Raffle/Participations/RaffleParticipationDetailView";
import { RaffleSettingsView } from "./components/System/Raffle/RaffleSettingsView";
import { RaffleIntelligenceView } from "./components/System/Intelligence/RaffleIntelligenceView";
import {
  StorefrontStatusView,
  StorefrontStatusViewRef,
} from "./components/System/StorefrontStatus/StorefrontStatusView";
import {
  StorefrontAnnouncementView,
  StorefrontAnnouncementViewMode,
  StorefrontAnnouncementViewRef,
} from "./components/System/StorefrontAnnouncements/StorefrontAnnouncementView";
import { LoginView } from "./components/Auth/LoginView";
import { SetupAccountView } from "./components/Auth/SetupAccountView";
import {
  Order,
  DashboardStats,
  DashboardCommercialOverview,
  AnnualService,
  ExtraCharge,
  BillingPayment,
  Raffle,
  RaffleParticipation,
  User,
} from "./types";
import type { PermissionId } from "@nexus/types";
import {
  apiOrders,
  apiDashboard,
  apiBilling,
  apiSystem,
  api,
  apiAuth,
  apiRaffleParticipations,
} from "./api";
import {
  NexusAutonomousButton,
  NexusSectionButton,
} from "./components/ui/NexusButton";
import { NexusAutonomousCard } from "./components/ui/NexusCard";
import { NexusAutonomousIcon } from "./components/ui/NexusIcon";
import { NexusConfirmModal } from "./components/ui/NexusConfirmModal";
import { NexusViewToolbar } from "./components/ui/NexusViewToolbar";
import { UploadQueueProvider } from "./components/uploads/UploadQueueProvider";
import { ProfileView, ProfileViewMode } from "./components/Profile/ProfileView";
import type { OwnProfile } from "./types";

export const ThemeContext = createContext<{
  theme: "light" | "dark";
  toggleTheme: () => void;
}>({
  theme: "light",
  toggleTheme: () => {},
});

const PageHeaderActionPair: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const actions = React.Children.toArray(children);

  return (
    <div
      className={
        actions.length > 1
          ? "grid w-full grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:flex md:w-auto"
          : "flex w-full [&>button]:w-full md:w-auto md:[&>button]:w-auto"
      }
      style={{ gap: "var(--space-sm)" }}
    >
      {actions}
    </div>
  );
};

type SystemViewType =
  | "shipping"
  | "config"
  | "users"
  | "identity"
  | "channels"
  | "inventory"
  | "billing"
  | "storefront"
  | "announcements"
  | "raffle"
  | "intelligence";

type ActiveTabType =
  | "Inicio"
  | "Medios"
  | "Tienda"
  | "Operaciones"
  | "Sistema"
  | "Mi Perfil"
  | "Rifas";

type DashboardViewMode = "overview" | "milestones";

type MediaModeType =
  | "list"
  | "create"
  | "media_edit"
  | "category_create"
  | "categories_list"
  | "category_edit"
  | HomeSliderViewMode
  | MediaVaultViewMode;

type StoreModeType =
  | "list"
  | "overview"
  | "create"
  | "edit"
  | "hero_list"
  | "hero_create"
  | "hero_edit"
  | "coupon_list"
  | "coupon_create"
  | "coupon_edit"
  | "orders"
  | "orders-overview"
  | "order-detail"
  | "payment_links";

type RaffleModeType =
  | "list"
  | "detail"
  | "tickets"
  | "materials"
  | "create"
  | "edit"
  | "coupon_list"
  | "coupon_create"
  | "coupon_edit"
  | "participations"
  | "participation-detail";

const ACTIVE_TABS: ActiveTabType[] = [
  "Inicio",
  "Medios",
  "Tienda",
  "Operaciones",
  "Sistema",
  "Mi Perfil",
  "Rifas",
];

const MEDIA_MODES: MediaModeType[] = [
  "list",
  "create",
  "media_edit",
  "category_create",
  "categories_list",
  "category_edit",
  "slider_list",
  "slide_create",
  "slide_edit",
  "vault_list",
  "vault_upload",
];

const STORE_MODES: StoreModeType[] = [
  "list",
  "overview",
  "create",
  "edit",
  "hero_list",
  "hero_create",
  "hero_edit",
  "coupon_list",
  "coupon_create",
  "coupon_edit",
  "orders",
  "order-detail",
  "payment_links",
];

const RAFFLE_MODES: RaffleModeType[] = [
  "list",
  "detail",
  "tickets",
  "materials",
  "create",
  "edit",
  "coupon_list",
  "coupon_create",
  "coupon_edit",
  "participations",
  "participation-detail",
];

const getStoredEnum = <T extends string>(
  key: string,
  validValues: readonly T[],
  fallback: T,
) => {
  const value = localStorage.getItem(key) as T | null;
  return value && validValues.includes(value) ? value : fallback;
};

const getStoredActiveTab = (): ActiveTabType => {
  const value = localStorage.getItem("admin_active_tab");
  if (value === "Galería") return "Medios";
  if (value === "Órdenes") return "Operaciones";
  return value && ACTIVE_TABS.includes(value as ActiveTabType)
    ? (value as ActiveTabType)
    : "Inicio";
};

const getStoredMediaMode = (): MediaModeType => {
  const value =
    localStorage.getItem("admin_media_view_mode") ??
    localStorage.getItem("admin_gallery_view_mode");
  return value && MEDIA_MODES.includes(value as MediaModeType)
    ? (value as MediaModeType)
    : "list";
};

const Toast = ({
  message,
  type,
  actionLabel,
  onAction,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
}) => {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-[var(--space-3xl)] left-[var(--space-md)] right-[var(--space-md)] z-[100] animate-in slide-in-from-right-10 fade-in duration-300 md:bottom-[var(--space-lg)] md:left-auto md:right-[var(--space-lg)]">
      <div
        className={`flex items-center border bg-bg-card shadow-2xl ${type === "success" ? "border-green-100" : "border-rose-100"}`}
        style={{
          gap: "var(--space-sm)",
          padding: "var(--space-sm) var(--space-md)",
          borderRadius: "var(--radius-outer)",
        }}
      >
        <div
          className={`flex shrink-0 items-center justify-center ${type === "success" ? "bg-green-50 text-green-600" : "bg-rose-50 text-rose-600"}`}
          style={{
            width: "var(--size-button-card)",
            height: "var(--size-button-card)",
            borderRadius: "var(--radius-card-inner)",
          }}
        >
          <CheckCircle2 size={20} />
        </div>
        <p className="text-secondary font-bold text-text-main">{message}</p>
        {actionLabel && onAction && (
          <NexusAutonomousButton
            type="button"
            variant="dark"
            density="compact"
            onClick={() => {
              onAction();
              onClose();
            }}
            className="shrink-0"
          >
            {actionLabel}
          </NexusAutonomousButton>
        )}
        <NexusAutonomousButton
          type="button"
          onClick={onClose}
          variant="ghost"
          density="compact"
          isIconOnly
          icon={X}
          className="ml-auto shrink-0"
          aria-label="Cerrar notificación"
        />
      </div>
    </div>
  );
};

const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  variant = "danger",
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "warning" | "brand";
}) => {
  if (!isOpen) return null;
  return (
    <NexusConfirmModal
      isOpen={isOpen}
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      onConfirm={onConfirm}
      onCancel={onCancel}
      tone={variant}
    />
  );
};

function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    return (saved as "light" | "dark") || "light";
  });

  const [token, setToken] = useState<string | null>(() => {
    try {
      const session = localStorage.getItem("admin_session");
      if (!session) return null;
      const parsed = JSON.parse(session);
      return parsed.token || null;
    } catch {
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const authString = localStorage.getItem("admin_session");
    if (!authString) return false;
    try {
      const authData = JSON.parse(authString);
      const now = new Date().getTime();
      if (now > authData.expiresAt) {
        localStorage.removeItem("admin_session");
        return false;
      }
      return !!authData.token;
    } catch (error) {
      return false;
    }
  });

  const [mustChangePassword, setMustChangePassword] = useState<boolean>(() => {
    const authString = localStorage.getItem("admin_session");
    if (!authString) return false;
    try {
      return !!JSON.parse(authString).mustChangePassword;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem("theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === "light" ? "dark" : "light";

    if (!(document as any).startViewTransition) {
      setTheme(newTheme);
      return;
    }

    (document as any).startViewTransition(() => {
      flushSync(() => {
        setTheme(newTheme);
      });
    });
  }, [theme]);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common["Authorization"];
    }
  }, [token]);

  const [userPermissions, setUserPermissions] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("admin_session") || "{}").permissions || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!token) {
      setUserPermissions([]);
      return;
    }
    let active = true;
    apiAuth.me().then((user) => {
      if (!active) return;
      const permissions = Array.isArray(user.permissions) ? user.permissions : [];
      setUserPermissions(permissions);
      setUserRole(String(user.role || "staff").toLowerCase());
      const sessionValue = localStorage.getItem("admin_session");
      if (sessionValue) {
        const session = JSON.parse(sessionValue);
        session.permissions = permissions;
        session.role = String(user.role || "staff").toLowerCase();
        localStorage.setItem("admin_session", JSON.stringify(session));
      }
    }).catch((error) => {
      if (!active || error?.response?.status !== 401) return;
      localStorage.removeItem("admin_session");
      setToken(null);
      setUserPermissions([]);
      setUserRole("staff");
      setUserName("Usuario");
      setMustChangePassword(false);
      setIsAuthenticated(false);
    });
    return () => {
      active = false;
    };
  }, [token]);

  const [userName, setUserName] = useState<string>(() => {
    const authString = localStorage.getItem("admin_session");
    if (!authString) return "Usuario";
    try {
      const authData = JSON.parse(authString);
      return authData.name ? authData.name.split(" ")[0] : "Usuario";
    } catch (error) {
      return "Usuario";
    }
  });

  const [userRole, setUserRole] = useState<string>(() => {
    const authString = localStorage.getItem("admin_session");
    if (!authString) return "staff";
    try {
      return (JSON.parse(authString).role || "staff").toLowerCase();
    } catch {
      return "staff";
    }
  });

  const storeRef = React.useRef<StoreViewRef>(null);
  const galleryRef = React.useRef<GalleryViewRef>(null);
  const homeSliderRef = React.useRef<HomeSliderViewRef>(null);
  const mediaVaultRef = React.useRef<MediaVaultViewRef>(null);

  const [activeTab, setActiveTab] = useState<ActiveTabType>(getStoredActiveTab);
  const [dashboardViewMode, setDashboardViewMode] =
    useState<DashboardViewMode>("overview");
  const [galleryAdvancedFilters, setGalleryAdvancedFilters] =
    useState<GalleryAdvancedFilters>(DEFAULT_GALLERY_ADVANCED_FILTERS);
  const [isGalleryFiltersOpen, setIsGalleryFiltersOpen] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderAdvancedFilters, setOrderAdvancedFilters] =
    useState<OrderAdvancedFilters>(DEFAULT_ORDER_ADVANCED_FILTERS);
  const [isOrderFiltersOpen, setIsOrderFiltersOpen] = useState(false);
  const [operationsSearchQuery, setOperationsSearchQuery] = useState("");
  const [operationsFilters, setOperationsFilters] =
    useState<OperationsAdvancedFilters>(DEFAULT_OPERATIONS_FILTERS);
  const [isOperationsFiltersOpen, setIsOperationsFiltersOpen] =
    useState(false);
  const [raffleParticipationSearchQuery, setRaffleParticipationSearchQuery] =
    useState("");
  const [raffleParticipationFilters, setRaffleParticipationFilters] =
    useState<RaffleParticipationAdvancedFilters>(
      DEFAULT_RAFFLE_PARTICIPATION_FILTERS,
    );
  const [
    isRaffleParticipationFiltersOpen,
    setIsRaffleParticipationFiltersOpen,
  ] = useState(false);
  const [raffleSearchQuery, setRaffleSearchQuery] = useState("");
  const [raffleAdvancedFilters, setRaffleAdvancedFilters] =
    useState<RaffleAdvancedFilters>(DEFAULT_RAFFLE_ADVANCED_FILTERS);
  const [isRaffleFiltersOpen, setIsRaffleFiltersOpen] = useState(false);
  const [raffleTicketBoardSearchQuery, setRaffleTicketBoardSearchQuery] =
    useState("");
  const [raffleTicketBoardFilter, setRaffleTicketBoardFilter] =
    useState<TicketBoardFilter>(DEFAULT_TICKET_BOARD_FILTER);
  const [isRaffleTicketBoardFiltersOpen, setIsRaffleTicketBoardFiltersOpen] =
    useState(false);
  const [storeProductSearchQuery, setStoreProductSearchQuery] = useState("");
  const [mediaVaultSearchQuery, setMediaVaultSearchQuery] = useState("");
  const [mediaVaultFilter, setMediaVaultFilter] = useState<MediaVaultFilter>(
    DEFAULT_MEDIA_VAULT_FILTER,
  );
  const [isMediaVaultFiltersOpen, setIsMediaVaultFiltersOpen] = useState(false);
  const [storeProductAdvancedFilters, setStoreProductAdvancedFilters] =
    useState<StoreProductAdvancedFilters>(
      DEFAULT_STORE_PRODUCT_ADVANCED_FILTERS,
    );
  const [isStoreProductFiltersOpen, setIsStoreProductFiltersOpen] =
    useState(false);
  const [mediaViewMode, setMediaViewMode] =
    useState<MediaModeType>(getStoredMediaMode);
  const [storeViewMode, setStoreViewMode] = useState<StoreModeType>(() => {
    if (localStorage.getItem("admin_store_view_mode") === "heroes")
      return "hero_list";
    const saved = getStoredEnum("admin_store_view_mode", STORE_MODES, "list");
    return saved === "order-detail"
      ? "orders"
      : saved === "overview"
        ? "list"
        : saved;
  });
  const [isPaymentLinkGeneratorOpen, setIsPaymentLinkGeneratorOpen] = useState(false);
  const canManageOrder = userPermissions.includes("orders.manage");
  const canManageOrderFinancial = userPermissions.includes("orders.financial.manage");
  const canRefundOrder = userPermissions.includes("orders.refund");
  const canSendMessages = userPermissions.includes("messaging.send");
  const canManageRaffles = userPermissions.includes("raffles.manage");
  const canManageResults = userPermissions.includes("raffles.results.manage");
  const canManageRaffleCoupons = userPermissions.includes("raffles.coupons.manage");
  const canManageParticipation = userPermissions.includes("raffles.participations.manage");
  const canManageRaffleFinancial = userPermissions.includes("raffles.financial.manage");
  const canViewMessages = userPermissions.some((permission) => [
    "messaging.view", "messaging.manage", "messaging.send",
  ].includes(permission));
  const canViewOrders = userPermissions.some((permission) => [
    "orders.view", "orders.manage", "orders.financial.manage", "orders.refund", "orders.restore",
  ].includes(permission));
  const canViewRaffleParticipations = userPermissions.some((permission) => [
    "raffles.participations.view", "raffles.participations.manage", "raffles.financial.manage",
  ].includes(permission));
  const [raffleViewMode, setRaffleViewMode] = useState<RaffleModeType>(() => {
    const legacyMode = localStorage.getItem("admin_raffle_view_mode");
    if (legacyMode === "orders" || legacyMode === "order-detail") {
      return "participations";
    }
    if (legacyMode === "coupons") return "coupon_list";
    const saved = getStoredEnum("admin_raffle_view_mode", RAFFLE_MODES, "list");
    if (saved === "participation-detail") return "participations";
    return saved === "detail" ? "list" : saved;
  });
  const [raffleMaterialKind, setRaffleMaterialKind] =
    useState<MaterialKind>("raffle-card");
  const [selectedRaffleForHeader, setSelectedRaffleForHeader] =
    useState<Raffle | null>(null);
  const [profileViewMode, setProfileViewMode] = useState<ProfileViewMode>(() =>
    getStoredEnum(
      "admin_profile_view_mode",
      ["details", "contact", "notifications", "security"] as const,
      "details",
    ),
  );
  const [systemViewMode, setSystemViewMode] = useState<SystemViewType>(() => {
    const saved = localStorage.getItem("last_system_view");
    const validModes: SystemViewType[] = [
      "shipping",
      "config",
      "users",
      "identity",
      "channels",
      "inventory",
      "billing",
      "storefront",
      "announcements",
      "raffle",
      "intelligence",
    ];
    if (saved && validModes.includes(saved as SystemViewType))
      return saved as SystemViewType;
    return "billing";
  });
  const [userFormMode, setUserFormMode] = useState<"create" | "edit" | null>(null);
  const [selectedUserForForm, setSelectedUserForForm] = useState<User | null>(null);

  useEffect(() => {
    localStorage.setItem("last_system_view", systemViewMode);
    // Resetear estados transitorios al cambiar de vista
    if (systemViewMode !== "identity") {
      setIdentityStatus("preview");
      setHasTempLogo(false);
    }
  }, [systemViewMode]);

  useEffect(() => {
    localStorage.setItem("admin_active_tab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem("admin_media_view_mode", mediaViewMode);
    localStorage.removeItem("admin_gallery_view_mode");
  }, [mediaViewMode]);

  useEffect(() => {
    localStorage.setItem("admin_store_view_mode", storeViewMode);
  }, [storeViewMode]);

  useEffect(() => {
    localStorage.setItem("admin_raffle_view_mode", raffleViewMode);
  }, [raffleViewMode]);

  useEffect(() => {
    localStorage.setItem("admin_profile_view_mode", profileViewMode);
  }, [profileViewMode]);

  const [shippingSubView, setShippingSubView] = useState<"config" | "zones">(
    "config",
  );
  const [channelsViewMode, setChannelsViewMode] = useState<
    "hub" | "create" | "edit" | "principal"
  >(() =>
    getStoredEnum(
      "admin_channels_view_mode",
      ["hub", "create", "edit", "principal"],
      "hub",
    ),
  );
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    () => localStorage.getItem("admin_selected_channel_id"),
  );

  useEffect(() => {
    localStorage.setItem("admin_channels_view_mode", channelsViewMode);
  }, [channelsViewMode]);

  useEffect(() => {
    if (selectedChannelId) {
      localStorage.setItem("admin_selected_channel_id", selectedChannelId);
    } else {
      localStorage.removeItem("admin_selected_channel_id");
    }
  }, [selectedChannelId]);
  const [identityStatus, setIdentityStatus] = useState<
    "empty" | "preview" | "editing"
  >("preview");
  const [hasTempLogo, setHasTempLogo] = useState(false);
  const [announcementViewMode, setAnnouncementViewMode] =
    useState<StorefrontAnnouncementViewMode>("list");
  const [isFormValid, setIsFormValid] = useState(false);
  const [isUserFormSaving, setIsUserFormSaving] = useState(false);
  const [raffleEnabled, setRaffleEnabled] = useState(
    () => localStorage.getItem("admin_raffle_enabled") === "1",
  );

  const shippingRef = React.useRef<{
    handleSaveConfig: () => void;
    handleSaveZones: () => void;
  }>(null);
  const userFormRef = React.useRef<UserFormRef>(null);
  const identityRef = React.useRef<IdentityViewRef>(null);
  const channelFormRef = React.useRef<{ handleSave: () => void }>(null);
  const inventoryRef = React.useRef<InventorySettingsViewRef>(null);
  const billingRef = React.useRef<BillingViewRef>(null);
  const raffleSettingsRef = React.useRef<{ handleSave: () => void }>(null);
  const platformSettingsRef = React.useRef<{ handleSave: () => void }>(null);
  const storefrontStatusRef = React.useRef<StorefrontStatusViewRef>(null);
  const storefrontAnnouncementRef =
    React.useRef<StorefrontAnnouncementViewRef>(null);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const orderDetailOriginRef = React.useRef<
    | "dashboard"
    | "orders-tab"
    | "store-orders"
    | "product-overview"
    | "orders-overview"
  >("orders-tab");
  const [selectedRaffleParticipation, setSelectedRaffleParticipation] =
    useState<RaffleParticipation | null>(null);
  const [raffleParticipationReturnMode, setRaffleParticipationReturnMode] =
    useState<
      "dashboard" | "operations" | "participations" | "detail" | "tickets"
    >(
      "participations",
    );
  const [orders, setOrders] = useState<Order[]>([]);
  const [pendingOrderIds, setPendingOrderIds] = useState<Set<string>>(
    new Set(),
  );
  const announcedUnreadOrderIdsRef = React.useRef<Set<string>>(new Set());
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(
    null,
  );
  const [dashboardCommercialOverview, setDashboardCommercialOverview] =
    useState<DashboardCommercialOverview | null>(null);
  const [dashboardCommercialFilters, setDashboardCommercialFilters] =
    useState<DashboardCommercialFilters>(
      DEFAULT_DASHBOARD_COMMERCIAL_FILTERS,
    );
  const [
    isDashboardCommercialFiltersOpen,
    setIsDashboardCommercialFiltersOpen,
  ] = useState(false);
  const [isLoadingDashboardCommercial, setIsLoadingDashboardCommercial] =
    useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [salesOverviewFilters, setSalesOverviewFilters] =
    useState<SalesOverviewFilters>(DEFAULT_SALES_OVERVIEW_FILTERS);
  const [isSalesOverviewFiltersOpen, setIsSalesOverviewFiltersOpen] =
    useState(false);

  const [billingServices, setBillingServices] = useState<AnnualService[]>([]);
  const [billingCharges, setBillingCharges] = useState<ExtraCharge[]>([]);
  const [billingPayments, setBillingPayments] = useState<BillingPayment[]>([]);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
    onCancel?: () => void;
    variant?: "danger" | "warning" | "brand";
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "",
    onConfirm: () => {},
  });
  const [principalTemplateEditor, setPrincipalTemplateEditor] = useState<{
    label: string;
    provider: "EVOLUTION" | "CLOUD";
    isDirty: boolean;
    isSaving: boolean;
    onSave: () => void;
    canActivate: boolean;
    activationLabel: string;
    onActivate: () => void;
  } | null>(null);
  const [principalTemplateEditorResetToken, setPrincipalTemplateEditorResetToken] =
    useState(0);

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setToast({ message, type });
    },
    [],
  );

  const showActionToast = useCallback(
    (
      message: string,
      actionLabel: string,
      onAction: () => void,
      type: "success" | "error" = "success",
    ) => {
      setToast({ message, type, actionLabel, onAction });
    },
    [],
  );

  useEffect(() => {
    if (activeTab !== "Inicio") setDashboardViewMode("overview");
  }, [activeTab]);

  useEffect(() => {
    if (!token || activeTab !== "Inicio") return;

    let cancelled = false;
    setIsLoadingDashboardCommercial(true);
    apiDashboard
      .getCommercialOverview(
        dashboardCommercialFilters.period,
        dashboardCommercialFilters.source,
        dashboardCommercialFilters.paymentMethod,
      )
      .then((overview) => {
        if (!cancelled) setDashboardCommercialOverview(overview);
      })
      .catch(() => {
        if (!cancelled) {
          showToast("No se pudo actualizar la vista comercial", "error");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDashboardCommercial(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    dashboardCommercialFilters.paymentMethod,
    dashboardCommercialFilters.period,
    dashboardCommercialFilters.source,
    showToast,
    token,
  ]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mpConnect = params.get("mp_connect");
    if (!mpConnect) return;

    if (mpConnect === "success") {
      showToast("Mercado Pago vinculado correctamente");
    } else if (mpConnect === "cancelled") {
      showToast("Vinculación de Mercado Pago cancelada", "error");
    } else {
      showToast("No se pudo vincular Mercado Pago", "error");
    }

    params.delete("mp_connect");
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }, [showToast]);

  const openOrdersFromNotification = useCallback(() => {
    setActiveTab("Operaciones");
    setStoreViewMode("list");
    setSelectedOrder(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const syncUnreadOrders = useCallback(
    (nextOrders: Order[], notify: boolean) => {
      const unreadOrders = nextOrders.filter((order) => !order.isRead);
      const unreadIds = new Set(unreadOrders.map((order) => order.id));
      setPendingOrderIds(unreadIds);

      const unannouncedOrders = unreadOrders.filter(
        (order) => !announcedUnreadOrderIdsRef.current.has(order.id),
      );
      unreadOrders.forEach((order) =>
        announcedUnreadOrderIdsRef.current.add(order.id),
      );

      if (notify && unannouncedOrders.length > 0) {
        showActionToast(
          unannouncedOrders.length === 1
            ? "Nueva orden recibida"
            : `${unannouncedOrders.length} órdenes nuevas recibidas`,
          "Ver órdenes",
          openOrdersFromNotification,
        );
      }
    },
    [openOrdersFromNotification, showActionToast],
  );

  useEffect(() => {
    if (!token) return;
    const fetchInitialData = async () => {
      setIsLoadingDashboard(true);
      try {
        const [ordersData, statsData, billingData, configData] =
          await Promise.all([
            canViewOrders
              ? apiOrders.getAll()
              : Promise.resolve([]),
            userPermissions.includes("dashboard.view")
              ? apiDashboard.getStats()
              : Promise.resolve(null),
            userPermissions.includes("billing.view")
              ? apiBilling.getAll()
              : Promise.resolve({ services: [], charges: [], payments: [] }),
            apiSystem.getPublicConfig(),
          ]);

        flushSync(() => {
          setOrders(ordersData);
          setDashboardStats(statsData);
          setBillingServices(billingData.services);
          setBillingCharges(billingData.charges);
          setBillingPayments(billingData.payments);
          const nextRaffleEnabled = configData["raffle_enabled"] === "1";
          localStorage.setItem(
            "admin_raffle_enabled",
            nextRaffleEnabled ? "1" : "0",
          );
          setRaffleEnabled(nextRaffleEnabled);
          if (!nextRaffleEnabled) {
            setActiveTab((current) =>
              current === "Rifas" ? "Inicio" : current,
            );
            setRaffleViewMode("list");
          }
        });
        syncUnreadOrders(ordersData, true);
      } catch (error: any) {
        if (error.response?.status === 401) {
          handleLogout();
        } else if (error.response?.status !== 429) {
          showToast("Error al sincronizar datos con el servidor", "error");
        }
      } finally {
        setIsLoadingDashboard(false);
      }
    };
    fetchInitialData();
  }, [token, userPermissions, showToast, syncUnreadOrders]);

  useEffect(() => {
    if (!token || !canViewOrders) return;

    const pollOrders = async () => {
      try {
        const nextOrders = await apiOrders.getAll();
        setOrders(nextOrders);
        syncUnreadOrders(nextOrders, true);
      } catch (error: any) {
        if (error.response?.status === 401) {
          handleLogout();
        }
      }
    };

    const interval = window.setInterval(pollOrders, 30000);
    return () => window.clearInterval(interval);
  }, [token, canViewOrders, syncUnreadOrders]);

  const closeConfirm = () =>
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));

  const handleLoginSuccess = (userData: any, jwtToken: string) => {
    const normalizedRole = String(userData.role || "staff").toLowerCase();
    const authData = {
      loggedIn: true,
      token: jwtToken,
      id: userData.id,
      username: userData.username,
      name: userData.name,
      role: normalizedRole,
      permissions: userData.permissions || [],
      mustChangePassword: userData.mustChangePassword,
      expiresAt: new Date().getTime() + 12 * 60 * 60 * 1000,
    };
    localStorage.setItem("admin_session", JSON.stringify(authData));
    localStorage.removeItem("admin_known_order_ids");
    localStorage.removeItem("admin_pending_order_ids");
    announcedUnreadOrderIdsRef.current.clear();
    setPendingOrderIds(new Set());
    setUserName(userData.name.split(" ")[0]);
    setUserRole(normalizedRole);
    setUserPermissions(userData.permissions || []);
    setToken(jwtToken);
    setMustChangePassword(userData.mustChangePassword);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_session");
    announcedUnreadOrderIdsRef.current.clear();
    setPendingOrderIds(new Set());
    setOrders([]);
    setSelectedOrder(null);
    setToken(null);
    setUserPermissions([]);
    setIsAuthenticated(false);
  };

  const handleSetupComplete = () => {
    setMustChangePassword(false);
    const authString = localStorage.getItem("admin_session");
    if (authString) {
      const authData = JSON.parse(authString);
      authData.mustChangePassword = false;
      localStorage.setItem("admin_session", JSON.stringify(authData));
    }
  };

  const currentDate = new Date().toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const isMediaMode = activeTab === "Medios";
  const isDashboardMode = activeTab === "Inicio";
  const isStoreMode = activeTab === "Tienda";
  const isOperationsTab = activeTab === "Operaciones";
  const isOrdersViewActive =
    isOperationsTab || (isStoreMode && storeViewMode === "orders");
  const isOrdersListViewActive =
    isStoreMode &&
    storeViewMode === "orders" &&
    storeViewMode !== "order-detail" &&
    storeViewMode !== "orders-overview";
  const isOrdersOverviewActive =
    isStoreMode && storeViewMode === "orders-overview";
  const isOperationsListViewActive =
    isOperationsTab && storeViewMode !== "order-detail";
  const isStoreProductListViewActive = isStoreMode && storeViewMode === "list";
  const isMediaVaultListViewActive =
    isMediaMode && mediaViewMode === "vault_list";
  const isMediaPanelListViewActive = isMediaMode && mediaViewMode === "list";
  const isSystemMode = activeTab === "Sistema";
  const isProfileMode = activeTab === "Mi Perfil";
  const isRafflesMode = activeTab === "Rifas";
  const isRaffleListViewActive = isRafflesMode && raffleViewMode === "list";
  const isRaffleParticipationsListViewActive =
    isRafflesMode && raffleViewMode === "participations";
  const isRaffleTicketBoardViewActive =
    isRafflesMode && raffleViewMode === "tickets";
  // The active raffle route reserves its navigation rail before remote config resolves.
  const showRaffleNavigation = raffleEnabled || isRafflesMode;
  const hasPermission = (permission: string) => userPermissions.includes(permission);
  const visibleTabs: ActiveTabType[] = [
    ...(hasPermission("dashboard.view") ? ["Inicio" as const] : []),
    ...((hasPermission("products.view") || hasPermission("products.manage") || canViewOrders || canViewRaffleParticipations) ? ["Operaciones" as const] : []),
    ...((hasPermission("products.view") || hasPermission("products.manage") || canViewOrders || hasPermission("payment-links.manage") || hasPermission("coupons.manage")) ? ["Tienda" as const] : []),
    ...(raffleEnabled && userPermissions.some((permission) => permission.startsWith("raffles.")) ? ["Rifas" as const] : []),
    ...((hasPermission("media.manage") || hasPermission("media.upload") || hasPermission("media.vault.manage") || hasPermission("storefront.content.manage")) ? ["Medios" as const] : []),
    ...(userPermissions.some((permission) => [
      "shipping.view", "shipping.manage", "payments.config.manage", "settings.view",
      "settings.manage", "billing.view", "billing.manage", "channels.view",
      "channels.manage", "messaging.view", "messaging.manage", "users.manage",
    ].includes(permission)) ? ["Sistema" as const] : []),
  ];

  useEffect(() => {
    if (
      canViewRaffleParticipations &&
      !hasPermission("raffles.view") &&
      !hasPermission("raffles.manage") &&
      !hasPermission("raffles.results.manage") &&
      raffleViewMode === "list"
    ) {
      setRaffleViewMode("participations");
    }
    if (
      hasPermission("raffles.coupons.manage") &&
      !hasPermission("raffles.view") &&
      !hasPermission("raffles.manage") &&
      !hasPermission("raffles.results.manage") &&
      !canViewRaffleParticipations &&
      raffleViewMode === "list"
    ) {
      setRaffleViewMode("coupon_list");
    }
    if (!hasPermission("products.view") && !hasPermission("products.manage") && canViewOrders && storeViewMode === "list") {
      setStoreViewMode("orders");
    }
    if (
      !hasPermission("products.view") &&
      !hasPermission("products.manage") &&
      !canViewOrders &&
      userPermissions.includes("payment-links.manage") &&
      storeViewMode === "list"
    ) {
      setStoreViewMode("payment_links");
    }
  }, [userPermissions, canViewOrders, canViewRaffleParticipations, raffleViewMode, storeViewMode]);

  useEffect(() => {
    if (activeTab !== "Mi Perfil" && !visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0] || "Mi Perfil");
    }
  }, [activeTab, userPermissions, raffleEnabled]);

  const hasStoreProductAdvancedFilters =
    storeProductAdvancedFilters.type !==
      DEFAULT_STORE_PRODUCT_ADVANCED_FILTERS.type ||
    storeProductAdvancedFilters.publication !==
      DEFAULT_STORE_PRODUCT_ADVANCED_FILTERS.publication ||
    storeProductAdvancedFilters.purpose !==
      DEFAULT_STORE_PRODUCT_ADVANCED_FILTERS.purpose ||
    storeProductAdvancedFilters.age !==
      DEFAULT_STORE_PRODUCT_ADVANCED_FILTERS.age;
  const hasMediaVaultFilters = mediaVaultFilter !== DEFAULT_MEDIA_VAULT_FILTER;
  const hasGalleryAdvancedFilters =
    galleryAdvancedFilters.type !== DEFAULT_GALLERY_ADVANCED_FILTERS.type ||
    galleryAdvancedFilters.categoryId !==
      DEFAULT_GALLERY_ADVANCED_FILTERS.categoryId;
  const hasRaffleParticipationFilters =
    raffleParticipationFilters.status !==
      DEFAULT_RAFFLE_PARTICIPATION_FILTERS.status ||
    raffleParticipationFilters.type !==
      DEFAULT_RAFFLE_PARTICIPATION_FILTERS.type ||
    raffleParticipationFilters.paymentMethod !==
      DEFAULT_RAFFLE_PARTICIPATION_FILTERS.paymentMethod;
  const hasOrderAdvancedFilters =
    orderAdvancedFilters.status !== DEFAULT_ORDER_ADVANCED_FILTERS.status ||
    orderAdvancedFilters.type !== DEFAULT_ORDER_ADVANCED_FILTERS.type ||
    orderAdvancedFilters.paymentMethod !==
      DEFAULT_ORDER_ADVANCED_FILTERS.paymentMethod ||
    orderAdvancedFilters.deliveryMethod !==
      DEFAULT_ORDER_ADVANCED_FILTERS.deliveryMethod;
  const hasOperationsFilters =
    operationsFilters.source !== DEFAULT_OPERATIONS_FILTERS.source ||
    operationsFilters.status !== DEFAULT_OPERATIONS_FILTERS.status ||
    operationsFilters.paymentMethod !==
      DEFAULT_OPERATIONS_FILTERS.paymentMethod;
  const hasRaffleAdvancedFilters =
    raffleAdvancedFilters.status !== DEFAULT_RAFFLE_ADVANCED_FILTERS.status ||
    raffleAdvancedFilters.type !== DEFAULT_RAFFLE_ADVANCED_FILTERS.type ||
    raffleAdvancedFilters.access !== DEFAULT_RAFFLE_ADVANCED_FILTERS.access ||
    raffleAdvancedFilters.featured !== DEFAULT_RAFFLE_ADVANCED_FILTERS.featured;
  const hasRaffleTicketBoardFilter =
    raffleTicketBoardFilter !== DEFAULT_TICKET_BOARD_FILTER;

  useEffect(() => {
    if (!token || !isOrdersViewActive) return;

    const unreadIds = orders
      .filter((order) => !order.isRead)
      .map((order) => order.id);

    if (unreadIds.length === 0) {
      setPendingOrderIds(new Set());
      return;
    }

    let cancelled = false;
    const markVisibleOrdersRead = async () => {
      try {
        await apiOrders.markRead(unreadIds);
        if (cancelled) return;

        const readAt = new Date().toISOString();
        const unreadIdSet = new Set(unreadIds);
        setOrders((current) =>
          current.map((order) =>
            unreadIdSet.has(order.id)
              ? { ...order, isRead: true, readAt }
              : order,
          ),
        );
        setSelectedOrder((current) =>
          current && unreadIdSet.has(current.id)
            ? { ...current, isRead: true, readAt }
            : current,
        );
        setPendingOrderIds(new Set());
      } catch {
        if (!cancelled) {
          showToast("No se pudo confirmar la lectura de las órdenes", "error");
        }
      }
    };

    void markVisibleOrdersRead();
    return () => {
      cancelled = true;
    };
  }, [isOrdersViewActive, orders, showToast, token]);

  const isCreatingMedia = isMediaMode && mediaViewMode === "create";
  const isEditingMedia = isMediaMode && mediaViewMode === "media_edit";
  const isCreatingSlide = isMediaMode && mediaViewMode === "slide_create";
  const isEditingSlide = isMediaMode && mediaViewMode === "slide_edit";
  const isUploadingToVault = isMediaMode && mediaViewMode === "vault_upload";
  const isCreatingProduct = isStoreMode && storeViewMode === "create";
  const isEditingProduct = isStoreMode && storeViewMode === "edit";
  const isCreatingStoreHero = isStoreMode && storeViewMode === "hero_create";
  const isEditingStoreHero = isStoreMode && storeViewMode === "hero_edit";
  const isCreatingCoupon = isStoreMode && storeViewMode === "coupon_create";
  const isEditingCoupon = isStoreMode && storeViewMode === "coupon_edit";
  const isCreatingRaffle = isRafflesMode && raffleViewMode === "create";
  const isEditingRaffle = isRafflesMode && raffleViewMode === "edit";
  const isCreatingRaffleCoupon =
    isRafflesMode && raffleViewMode === "coupon_create";
  const isEditingRaffleCoupon =
    isRafflesMode && raffleViewMode === "coupon_edit";
  const isCreatingUser = isSystemMode && systemViewMode === "users" && userFormMode === "create";
  const isEditingUser = isSystemMode && systemViewMode === "users" && userFormMode === "edit";

  const isFormMode =
    isCreatingMedia ||
    isEditingMedia ||
    isCreatingSlide ||
    isEditingSlide ||
    isUploadingToVault ||
    isCreatingProduct ||
    isEditingProduct ||
    isCreatingStoreHero ||
    isEditingStoreHero ||
    isCreatingCoupon ||
    isEditingCoupon ||
    isCreatingRaffle ||
    isEditingRaffle ||
    isCreatingRaffleCoupon ||
    isEditingRaffleCoupon ||
    isCreatingUser ||
    isEditingUser;

  const navigateToMedia = (mode: any = "list") => {
    setActiveTab("Medios");
    setMediaViewMode(mode);
    setSearchQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateToStore = (mode: any = "list") => {
    setActiveTab("Tienda");
    setStoreViewMode(mode);
    setSearchQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateToOrders = () => {
    setActiveTab("Tienda");
    setStoreViewMode("orders");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateToSystem = (mode: SystemViewType = "billing") => {
    setActiveTab("Sistema");
    setSystemViewMode(mode);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackFromOrderDetail = () => {
    const origin = orderDetailOriginRef.current;
    if (origin === "dashboard") {
      setActiveTab("Inicio");
      setStoreViewMode("list");
    } else if (origin === "orders-overview") {
      setActiveTab("Tienda");
      setStoreViewMode("orders-overview");
    } else if (origin === "product-overview") {
      setActiveTab("Tienda");
      setStoreViewMode("overview");
    } else if (origin === "store-orders") {
      setActiveTab("Tienda");
      setStoreViewMode("orders");
    } else if (origin === "orders-tab") {
      setActiveTab("Operaciones");
      setStoreViewMode("list");
    } else {
      navigateToOrders();
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleQuickAction = (actionLabel: string) => {
    switch (actionLabel) {
      case "Nuevo Medio":
        navigateToMedia("create");
        break;
      case "Ver medios":
        navigateToMedia("list");
        break;
      case "Nueva Categoría":
        navigateToMedia("category_create");
        break;
      case "Ver categorías":
        navigateToMedia("categories_list");
        break;
      case "Slider inicio":
        navigateToMedia("slider_list");
        break;
      case "Nuevo Slide":
        navigateToMedia("slide_create");
        break;
      case "Bóveda de medios":
        navigateToMedia("vault_list");
        break;
      case "Subir a Bóveda":
        navigateToMedia("vault_upload");
        break;
      case "Nuevo producto":
        navigateToStore("create");
        break;
      case "Ver productos":
        navigateToStore("list");
        break;
      case "Héroes tienda":
        navigateToStore("hero_list");
        break;
      case "Cupones":
        navigateToStore("coupon_list");
        break;
      case "Ver Órdenes":
        navigateToOrders();
        break;
      case "Enlaces de pago":
        navigateToStore("payment_links");
        break;
      case "Gestión de Órdenes":
        navigateToOrders();
        break;
      case "Gestión de operaciones":
        setActiveTab("Operaciones");
        setStoreViewMode("list");
        window.scrollTo({ top: 0, behavior: "smooth" });
        break;
      case "Resumen de órdenes":
        setActiveTab("Tienda");
        setStoreViewMode("orders-overview");
        window.scrollTo({ top: 0, behavior: "smooth" });
        break;
      case "Estado de cuenta":
        navigateToSystem("billing");
        break;
      case "Estado Storefront":
        navigateToSystem("storefront");
        break;
      case "Avisos Storefront":
        navigateToSystem("announcements");
        setAnnouncementViewMode("list");
        break;
      case "Plataforma":
        navigateToSystem("config");
        break;
      case "Usuarios":
        navigateToSystem("users");
        break;
      case "Departamentos":
        navigateToSystem("channels");
        break;
      case "Configurar envíos":
        navigateToSystem("shipping");
        break;
      case "Activar rifas":
        navigateToSystem("raffle");
        break;
      case "Audiencias":
        navigateToSystem("intelligence");
        break;
      case "Ver rifas":
        setActiveTab("Rifas");
        setRaffleViewMode("list");
        break;
      case "Ficha de la Rifa":
        setRaffleMaterialKind("raffle-card");
        setActiveTab("Rifas");
        setRaffleViewMode("materials");
        window.scrollTo({ top: 0, behavior: "smooth" });
        break;
      case "Boletera Visual":
        setRaffleMaterialKind("ticket-board");
        setActiveTab("Rifas");
        setRaffleViewMode("materials");
        window.scrollTo({ top: 0, behavior: "smooth" });
        break;
      case "Nueva Rifa":
        setActiveTab("Rifas");
        setRaffleViewMode("create");
        break;
      case "Participaciones":
      case "Gestión de participaciones":
        setActiveTab("Rifas");
        setRaffleViewMode("participations");
        break;
      case "Cupones de rifas":
        setActiveTab("Rifas");
        setRaffleViewMode("coupon_list");
        window.scrollTo({ top: 0, behavior: "smooth" });
        break;
      case "Notificaciones":
        setActiveTab("Mi Perfil");
        setProfileViewMode("notifications");
        break;
      case "Datos personales":
        setActiveTab("Mi Perfil");
        setProfileViewMode("details");
        break;
      case "Contacto público":
        setActiveTab("Mi Perfil");
        setProfileViewMode("contact");
        break;
      case "Seguridad":
        setActiveTab("Mi Perfil");
        setProfileViewMode("security");
        break;
      case "Lib. Inventario":
        navigateToSystem("inventory");
        break;
      case "Añadir logo":
        navigateToSystem("identity");
        break;
      case "Volver":
        if (isSystemMode && systemViewMode === "channels") {
          if (channelsViewMode === "principal" && principalTemplateEditor) {
            const leaveTemplateEditor = () => {
              setPrincipalTemplateEditorResetToken((token) => token + 1);
              setPrincipalTemplateEditor(null);
              closeConfirm();
            };
            if (principalTemplateEditor.isDirty) {
              setConfirmDialog({
                isOpen: true,
                title: "Descartar cambios?",
                message:
                  "Los cambios de esta plantilla no se han guardado y se perderan si vuelves ahora.",
                confirmLabel: "Descartar cambios",
                variant: "warning",
                onConfirm: leaveTemplateEditor,
                onCancel: closeConfirm,
              });
            } else {
              leaveTemplateEditor();
            }
          } else {
            setChannelsViewMode("hub");
            setSelectedChannelId(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        } else if (isRafflesMode && raffleViewMode === "participation-detail") {
          if (raffleParticipationReturnMode === "dashboard") {
            setActiveTab("Inicio");
            setRaffleViewMode("list");
          } else if (raffleParticipationReturnMode === "operations") {
            setActiveTab("Operaciones");
            setRaffleViewMode("list");
          } else {
            setRaffleViewMode(raffleParticipationReturnMode);
          }
          setSelectedRaffleParticipation(null);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (isRafflesMode && raffleViewMode === "materials") {
          setRaffleViewMode("detail");
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (isRafflesMode && raffleViewMode === "tickets") {
          setRaffleViewMode("detail");
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (isRafflesMode && raffleViewMode === "detail") {
          setRaffleViewMode("list");
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (isStoreMode && storeViewMode === "overview") {
          setStoreViewMode("list");
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (
          (isStoreMode || isOperationsTab) &&
          storeViewMode === "order-detail"
        ) {
          handleBackFromOrderDetail();
        } else if (
          isOperationsTab ||
          (isStoreMode &&
            (storeViewMode === "orders" || storeViewMode === "order-detail"))
        ) {
          navigateToOrders();
        } else if (isStoreMode) {
          navigateToStore("list");
        } else if (isMediaMode) {
          navigateToMedia("list");
        }
        break;
    }
  };

  const handleCancelAction = () => {
    setConfirmDialog({
      isOpen: true,
      title: "¿Descartar cambios?",
      message: "Si cancelas ahora, perderás toda la información ingresada.",
      confirmLabel: "Sí, descartar",
      variant: "warning",
      onConfirm: () => {
        if (isCreatingUser || isEditingUser) {
          setUserFormMode(null);
          setSelectedUserForForm(null);
          setIsFormValid(false);
        } else if (isCreatingStoreHero || isEditingStoreHero)
          setStoreViewMode("hero_list");
        else if (isCreatingCoupon || isEditingCoupon)
          setStoreViewMode("coupon_list");
        else if (isStoreMode) setStoreViewMode("list");
        else if (isCreatingRaffle || isEditingRaffle) setRaffleViewMode("list");
        else if (isCreatingRaffleCoupon || isEditingRaffleCoupon)
          setRaffleViewMode("coupon_list");
        else if (isCreatingSlide || isEditingSlide)
          setMediaViewMode("slider_list");
        else if (isUploadingToVault) setMediaViewMode("vault_list");
        else if (isMediaMode) setMediaViewMode("list");
        closeConfirm();
      },
    });
  };

  const handleViewOrderDetail = (order: Order) => {
    orderDetailOriginRef.current = isOperationsTab
      ? "orders-tab"
      : "store-orders";
    setSelectedOrder(order);
    setStoreViewMode("order-detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleViewProductOrder = async (orderId: string) => {
    try {
      const order = await apiOrders.getById(orderId);
      orderDetailOriginRef.current = "product-overview";
      setSelectedOrder(order);
      setStoreViewMode("order-detail");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      showToast("No se pudo abrir la orden asociada", "error");
    }
  };

  const handleViewSalesOrder = async (orderId: string) => {
    try {
      const order = await apiOrders.getById(orderId);
      orderDetailOriginRef.current = "orders-overview";
      setSelectedOrder(order);
      setActiveTab("Tienda");
      setStoreViewMode("order-detail");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      showToast("No se pudo abrir la orden asociada", "error");
    }
  };

  const handleViewDashboardParticipation = async (participationId: string) => {
    try {
      const participation =
        await apiRaffleParticipations.getById(participationId);
      setRaffleParticipationReturnMode("dashboard");
      setSelectedRaffleParticipation(participation);
      setActiveTab("Rifas");
      setRaffleViewMode("participation-detail");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      showToast("No se pudo abrir la participación asociada", "error");
    }
  };

  const handleViewDashboardOrder = async (orderId: string) => {
    try {
      const order = await apiOrders.getById(orderId);
      orderDetailOriginRef.current = "dashboard";
      setSelectedOrder(order);
      setActiveTab("Operaciones");
      setStoreViewMode("order-detail");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      showToast("No se pudo abrir la orden asociada", "error");
    }
  };

  const handleDetailOrderStatusChange = async (
    orderId: string,
    status: "PAID" | "CANCELLED",
  ) => {
    try {
      const updatedOrder =
        status === "PAID"
          ? await apiOrders.updateStatus(orderId, status)
          : selectedOrder?.id === orderId
            ? { ...selectedOrder, status: "cancelled" as const }
            : null;

      if (status === "CANCELLED") {
        await apiOrders.cancel(orderId);
      }

      if (!updatedOrder) return;

      setOrders((current) =>
        current.map((order) => (order.id === orderId ? updatedOrder : order)),
      );
      setSelectedOrder((current) =>
        current?.id === orderId ? updatedOrder : current,
      );
      showToast(
        status === "PAID"
          ? "Orden marcada como pagada"
          : "Orden cancelada correctamente",
      );
    } catch (error) {
      showToast(
        status === "PAID" ? "Error al actualizar estado" : "Error al cancelar",
        "error",
      );
    }
  };

  const handleRestoreOrder = async (orderId: string) => {
    try {
      const updatedOrder = await apiOrders.restore(orderId);
      setOrders((current) =>
        current.map((order) => (order.id === orderId ? updatedOrder : order)),
      );
      setSelectedOrder((current) =>
        current?.id === orderId ? updatedOrder : current,
      );
      showToast("Orden restaurada correctamente");
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || "No se pudo restaurar la orden",
        "error",
      );
    }
  };

  const handleRaffleParticipationStatusChange = async (
    paymentStatus: "PAID" | "CANCELLED",
  ) => {
    if (!selectedRaffleParticipation) return;
    try {
      const updated = await apiRaffleParticipations.updateStatus(
        selectedRaffleParticipation.id,
        paymentStatus,
      );
      setSelectedRaffleParticipation(updated);
      showToast(
        paymentStatus === "PAID" ? "Pago confirmado" : "Apartado cancelado",
      );
    } catch (error: any) {
      showToast(
        error?.response?.data?.message ||
          "No se pudo actualizar la participación",
        "error",
      );
    }
  };

  const handleRevertRafflePaymentConfirmation = async () => {
    if (!selectedRaffleParticipation) return;
    try {
      const updated = await apiRaffleParticipations.revertPaymentConfirmation(
        selectedRaffleParticipation.id,
      );
      setSelectedRaffleParticipation(updated);
      showToast("Confirmación de pago revertida");
    } catch (error: any) {
      showToast(
        error?.response?.data?.message ||
          "No se pudo revertir la confirmación de pago",
        "error",
      );
    }
  };

  const handleRestoreRaffleParticipation = async (confirmPayment = false) => {
    if (!selectedRaffleParticipation) return;
    try {
      const updated = confirmPayment
        ? await apiRaffleParticipations.restoreAndConfirmPayment(
            selectedRaffleParticipation.id,
          )
        : await apiRaffleParticipations.restore(selectedRaffleParticipation.id);
      setSelectedRaffleParticipation(updated);
      showToast(
        confirmPayment
          ? "Participación restaurada y pago confirmado"
          : "Participación restaurada correctamente",
      );
    } catch (error: any) {
      showToast(
        error?.response?.data?.message ||
          "No se pudo restaurar la participación",
        "error",
      );
    }
  };

  const getActionAddon = () => {
    if (isDashboardMode && dashboardViewMode === "milestones") {
      return (
        <NexusSectionButton
          type="button"
          variant="secondary"
          icon={ArrowLeft}
          onClick={() => setDashboardViewMode("overview")}
        >
          Volver a inicio
        </NexusSectionButton>
      );
    }

    if (
      isSystemMode &&
      systemViewMode === "channels" &&
      channelsViewMode === "principal" &&
      principalTemplateEditor
    ) {
      if (!hasPermission("messaging.manage")) return null;
      return (
        <div className="flex flex-wrap items-center" style={{ gap: "var(--space-sm)" }}>
          {principalTemplateEditor.provider === "EVOLUTION" && (
            <NexusSectionButton
              type="button"
              variant="secondary"
              icon={RefreshCw}
              disabled={!principalTemplateEditor.canActivate || principalTemplateEditor.isSaving}
              onClick={principalTemplateEditor.onActivate}
            >
              {principalTemplateEditor.activationLabel}
            </NexusSectionButton>
          )}
          <NexusSectionButton
            type="button"
            variant="brand"
            icon={Save}
            disabled={!principalTemplateEditor.isDirty || principalTemplateEditor.isSaving}
            isLoading={principalTemplateEditor.isSaving}
            onClick={principalTemplateEditor.onSave}
          >
            Guardar plantilla
          </NexusSectionButton>
        </div>
      );
    }

    if (isOrdersOverviewActive) {
      return (
        <NexusSectionButton
          type="button"
          variant="secondary"
          icon={Download}
          disabled
          title="La exportación estará disponible próximamente"
        >
          Exportar
        </NexusSectionButton>
      );
    }

    if (
      isRafflesMode &&
      raffleViewMode === "detail" &&
      selectedRaffleForHeader
    ) {
      return (
        <NexusSectionButton
          type="button"
          variant="brand"
          icon={Download}
          onClick={() => {
            setRaffleViewMode("materials");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          Materiales
        </NexusSectionButton>
      );
    }

    if (isStoreMode && storeViewMode === "payment_links") {
      if (!hasPermission("payment-links.manage")) return null;
      return (
        <NexusSectionButton
          type="button"
          variant="brand"
          icon={Link2}
          onClick={() => setIsPaymentLinkGeneratorOpen(true)}
        >
          Generar enlace
        </NexusSectionButton>
      );
    }

    if (isFormMode) {
      const canSaveCurrentForm =
        ((isCreatingProduct || isEditingProduct) && hasPermission("products.manage")) ||
        ((isCreatingStoreHero || isEditingStoreHero) && hasPermission("storefront.content.manage")) ||
        ((isCreatingCoupon || isEditingCoupon) && hasPermission("coupons.manage")) ||
        ((isCreatingMedia || isEditingMedia) && hasPermission("media.manage")) ||
        ((isCreatingSlide || isEditingSlide) && hasPermission("storefront.content.manage")) ||
        (isUploadingToVault && hasPermission("media.upload")) ||
        ((isCreatingRaffle || isEditingRaffle) && hasPermission("raffles.manage")) ||
        ((isCreatingRaffleCoupon || isEditingRaffleCoupon) && hasPermission("raffles.coupons.manage")) ||
        ((isCreatingUser || isEditingUser) && hasPermission("users.manage"));
      if (!canSaveCurrentForm) return null;
      return (
        <PageHeaderActionPair>
          <NexusSectionButton
            onClick={handleCancelAction}
            variant="secondary"
            className="text-text-muted hover:text-text-main"
            disabled={(isCreatingUser || isEditingUser) && isUserFormSaving}
          >
            Cancelar
          </NexusSectionButton>
          <NexusSectionButton
            onClick={() => {
              if (isCreatingProduct || isEditingProduct)
                storeRef.current?.handleSave();
              if (isCreatingStoreHero || isEditingStoreHero)
                storeRef.current?.handleSave();
              if (isCreatingCoupon || isEditingCoupon)
                storeRef.current?.handleSave();
              if (isCreatingMedia || isEditingMedia)
                galleryRef.current?.handleSave();
              if (isCreatingSlide || isEditingSlide)
                homeSliderRef.current?.handleSave();
              if (isUploadingToVault) mediaVaultRef.current?.handleSave();
              if (isCreatingRaffle || isEditingRaffle)
                (
                  document.getElementById(
                    "raffle-form",
                  ) as HTMLFormElement | null
                )?.requestSubmit();
              if (isCreatingRaffleCoupon || isEditingRaffleCoupon)
                (
                  document.getElementById(
                    "raffle-coupon-form",
                  ) as HTMLFormElement | null
                )?.requestSubmit();
              if (isCreatingUser || isEditingUser)
                userFormRef.current?.handleSave();
            }}
            variant="brand"
            icon={isCreatingUser ? UserPlus : isUploadingToVault ? Upload : Save}
            disabled={
              ((isCreatingRaffle ||
                isEditingRaffle ||
                isCreatingRaffleCoupon ||
                isEditingRaffleCoupon ||
                isUploadingToVault ||
                isCreatingUser ||
                isEditingUser) &&
                !isFormValid) ||
              ((isCreatingUser || isEditingUser) && isUserFormSaving)
            }
            isLoading={(isCreatingUser || isEditingUser) && isUserFormSaving}
          >
            {isCreatingUser
              ? "Crear usuario"
              : isUploadingToVault
                ? "Subir Archivos"
                : "Guardar cambios"}
          </NexusSectionButton>
        </PageHeaderActionPair>
      );
    }

    if (
      (isStoreMode || isOperationsTab) &&
      storeViewMode === "order-detail" &&
      selectedOrder
    ) {
      return (
        <PageHeaderActionPair>
          {hasPermission("orders.manage") && (selectedOrder.status === "pending" ||
            selectedOrder.status === "paid") && (
            <NexusSectionButton
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Cancelar orden",
                  message:
                    "Esta acción cancelará la orden y liberará el inventario reservado cuando aplique.",
                  confirmLabel: "Cancelar orden",
                  variant: "danger",
                  onConfirm: async () => {
                    await handleDetailOrderStatusChange(
                      selectedOrder.id,
                      "CANCELLED",
                    );
                    closeConfirm();
                  },
                })
              }
              variant="secondary"
              className="text-text-muted hover:text-text-main"
            >
              Cancelar
            </NexusSectionButton>
          )}
          {hasPermission("orders.financial.manage") && selectedOrder.status === "pending" && (
            <NexusSectionButton
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Confirmar pago",
                  message:
                    "Esta acción marcará la orden como pagada y puede activar cambios de estado y notificaciones.",
                  confirmLabel: "Confirmar pago",
                  variant: "brand",
                  onConfirm: async () => {
                    await handleDetailOrderStatusChange(
                      selectedOrder.id,
                      "PAID",
                    );
                    closeConfirm();
                  },
                })
              }
              variant="brand"
              icon={CheckCircle2}
            >
              Confirmar pago
            </NexusSectionButton>
          )}
          {hasPermission("orders.restore") && selectedOrder.status === "cancelled" && (
            <NexusSectionButton
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Restaurar orden",
                  message:
                    "Se validará que los productos sigan disponibles y se generará un nuevo tiempo límite de apartado.",
                  confirmLabel: "Restaurar orden",
                  variant: "brand",
                  onConfirm: async () => {
                    await handleRestoreOrder(selectedOrder.id);
                    closeConfirm();
                  },
                })
              }
              variant="brand"
              icon={RefreshCw}
            >
              Restaurar orden
            </NexusSectionButton>
          )}
        </PageHeaderActionPair>
      );
    }

    if (
      isRafflesMode &&
      raffleViewMode === "participation-detail" &&
      selectedRaffleParticipation?.status === "PENDING"
    ) {
      const isTransfer =
        selectedRaffleParticipation.paymentMethod !== "MERCADOPAGO";
      if (!isTransfer) return null;
      return (
        <PageHeaderActionPair>
          {hasPermission("raffles.participations.manage") && <NexusSectionButton
            variant="secondary"
            className="w-full text-text-muted hover:text-text-main md:w-auto"
            onClick={() =>
              setConfirmDialog({
                isOpen: true,
                title: "¿Cancelar apartado?",
                message:
                  "Los boletos volverán a estar disponibles y se notificará al participante.",
                confirmLabel: "Sí, cancelar",
                variant: "danger",
                onConfirm: async () => {
                  await handleRaffleParticipationStatusChange("CANCELLED");
                  closeConfirm();
                },
              })
            }
          >
            Cancelar
          </NexusSectionButton>}
          {hasPermission("raffles.financial.manage") && <NexusSectionButton
            variant="brand"
            icon={CheckCircle2}
            className="w-full md:w-auto"
            onClick={() =>
              setConfirmDialog({
                isOpen: true,
                title: "¿Confirmar pago?",
                message: `Se confirmará el pago de ${selectedRaffleParticipation.ticketCount} ${selectedRaffleParticipation.ticketCount === 1 ? "boleto" : "boletos"}.`,
                confirmLabel: "Confirmar pago",
                variant: "brand",
                onConfirm: async () => {
                  await handleRaffleParticipationStatusChange("PAID");
                  closeConfirm();
                },
              })
            }
          >
            Confirmar pago
          </NexusSectionButton>}
        </PageHeaderActionPair>
      );
    }

    if (
      isRafflesMode &&
      hasPermission("raffles.financial.manage") &&
      raffleViewMode === "participation-detail" &&
      selectedRaffleParticipation?.recordType !== "PAYMENT_HOLD" &&
      selectedRaffleParticipation?.paymentMethod !== "MERCADOPAGO" &&
      selectedRaffleParticipation?.status === "PAID"
    ) {
      return (
        <NexusSectionButton
          variant="secondary"
          icon={RotateCcw}
          className="w-full whitespace-nowrap sm:w-auto"
          onClick={() =>
            setConfirmDialog({
              isOpen: true,
              title: "¿Revertir confirmación?",
              message:
                "La participación volverá a apartada. Se conservará el plazo original y se enviará nuevamente el mensaje de apartado con el tiempo restante; no se crearán 24 horas nuevas.",
              confirmLabel: "Revertir confirmación",
              variant: "warning",
              onConfirm: async () => {
                await handleRevertRafflePaymentConfirmation();
                closeConfirm();
              },
            })
          }
        >
          Revertir confirmación
        </NexusSectionButton>
      );
    }

    if (
      isRafflesMode &&
      raffleViewMode === "participation-detail" &&
      selectedRaffleParticipation?.recordType !== "PAYMENT_HOLD" &&
      selectedRaffleParticipation?.paymentMethod !== "MERCADOPAGO" &&
      selectedRaffleParticipation?.status === "CANCELLED"
    ) {
      return (
        <div
          className="flex w-full flex-col sm:flex-row"
          style={{ gap: "var(--space-sm)" }}
        >
          {hasPermission("raffles.participations.manage") && <NexusSectionButton
            variant="secondary"
            icon={RotateCcw}
            className="w-full whitespace-nowrap sm:w-auto"
            onClick={() =>
              setConfirmDialog({
                isOpen: true,
                title: "¿Restaurar participación?",
                message:
                  "Nexus comprobará que todos los boletos sigan disponibles, iniciará un nuevo plazo de apartado y notificará al participante.",
                confirmLabel: "Restaurar participación",
                variant: "brand",
                onConfirm: async () => {
                  await handleRestoreRaffleParticipation();
                  closeConfirm();
                },
              })
            }
          >
            Restaurar participación
          </NexusSectionButton>}
          {hasPermission("raffles.financial.manage") && <NexusSectionButton
            variant="brand"
            icon={CheckCircle2}
            className="w-full whitespace-nowrap sm:w-auto"
            onClick={() =>
              setConfirmDialog({
                isOpen: true,
                title: "¿Restaurar y confirmar pago?",
                message:
                  "Usa esta acción únicamente si ya recibiste el pago. Nexus restaurará los boletos, marcará la participación como pagada y enviará la confirmación por WhatsApp.",
                confirmLabel: "Restaurar y confirmar pago",
                variant: "brand",
                onConfirm: async () => {
                  await handleRestoreRaffleParticipation(true);
                  closeConfirm();
                },
              })
            }
          >
            Restaurar y confirmar
          </NexusSectionButton>}
        </div>
      );
    }

    if (isMediaMode) {
      if (mediaViewMode === "list") {
        if (!hasPermission("media.manage")) return null;
        return (
          <NexusSectionButton
            onClick={() => setMediaViewMode("create")}
            variant="brand"
            icon={Plus}
          >
            Nuevo medio
          </NexusSectionButton>
        );
      }
      if (mediaViewMode === "categories_list") {
        if (!hasPermission("categories.manage")) return null;
        return (
          <NexusSectionButton
            onClick={() => setMediaViewMode("category_create")}
            variant="brand"
            icon={Plus}
          >
            Nueva categoría
          </NexusSectionButton>
        );
      }
      if (mediaViewMode === "slider_list") {
        if (!hasPermission("storefront.content.manage")) return null;
        return (
          <NexusSectionButton
            onClick={() => setMediaViewMode("slide_create")}
            variant="brand"
            icon={Plus}
          >
            Nuevo slide
          </NexusSectionButton>
        );
      }
      if (mediaViewMode === "vault_list") {
        if (!hasPermission("media.upload")) return null;
        return (
          <NexusSectionButton
            onClick={() => setMediaViewMode("vault_upload")}
            variant="brand"
            icon={Upload}
          >
            Subir archivos
          </NexusSectionButton>
        );
      }
    }

    if (isStoreMode && storeViewMode === "overview") {
      if (!hasPermission("products.manage")) return null;
      return (
        <NexusSectionButton
          onClick={() => storeRef.current?.handleEditSelected()}
          variant="brand"
          icon={Pencil}
        >
          Editar producto
        </NexusSectionButton>
      );
    }

    if (isStoreMode && storeViewMode === "list") {
      if (!hasPermission("products.manage")) return null;
      return (
        <NexusSectionButton
          onClick={() => setStoreViewMode("create")}
          variant="brand"
          icon={Plus}
        >
          Nuevo producto
        </NexusSectionButton>
      );
    }

    if (isStoreMode && storeViewMode === "hero_list") {
      if (!hasPermission("storefront.content.manage")) return null;
      return (
        <NexusSectionButton
          onClick={() => setStoreViewMode("hero_create")}
          variant="brand"
          icon={Plus}
        >
          Nuevo hero
        </NexusSectionButton>
      );
    }

    if (isStoreMode && storeViewMode === "coupon_list") {
      if (!hasPermission("coupons.manage")) return null;
      return (
        <NexusSectionButton
          onClick={() => setStoreViewMode("coupon_create")}
          variant="brand"
          icon={Plus}
        >
          Nuevo cupón
        </NexusSectionButton>
      );
    }

    if (isRafflesMode && raffleViewMode === "list") {
      if (!hasPermission("raffles.manage")) return null;
      return (
        <NexusSectionButton
          onClick={() => setRaffleViewMode("create")}
          variant="brand"
          icon={Plus}
        >
          Nueva rifa
        </NexusSectionButton>
      );
    }

    if (isRafflesMode && raffleViewMode === "coupon_list") {
      if (!hasPermission("raffles.coupons.manage")) return null;
      return (
        <NexusSectionButton
          onClick={() => setRaffleViewMode("coupon_create")}
          variant="brand"
          icon={Plus}
        >
          Nuevo cupón
        </NexusSectionButton>
      );
    }

    if (isSystemMode) {
      if (systemViewMode === "config") {
        if (!hasPermission("settings.manage")) return null;
        return (
          <NexusSectionButton
            onClick={() => platformSettingsRef.current?.handleSave()}
            variant="brand"
            icon={Save}
          >
            Guardar configuración
          </NexusSectionButton>
        );
      }
      if (systemViewMode === "shipping") {
        if (!hasPermission("shipping.manage")) return null;
        return (
          <NexusSectionButton
            onClick={() =>
              shippingSubView === "config"
                ? shippingRef.current?.handleSaveConfig()
                : shippingRef.current?.handleSaveZones()
            }
            variant="brand"
            icon={Save}
          >
            Guardar cambios
          </NexusSectionButton>
        );
      }
      if (systemViewMode === "identity") {
        if (identityStatus === "editing") {
          if (!hasPermission("settings.manage")) return null;
          return (
            <PageHeaderActionPair>
              <NexusSectionButton
                onClick={() => identityRef.current?.handleCancel()}
                variant="secondary"
                className="text-text-muted hover:text-text-main"
              >
                Cancelar
              </NexusSectionButton>
              <NexusSectionButton
                onClick={() => identityRef.current?.handleSave()}
                variant="brand"
                icon={Save}
              >
                Guardar identidad
              </NexusSectionButton>
            </PageHeaderActionPair>
          );
        }
        return null;
      }
      if (systemViewMode === "inventory") {
        return (
          <NexusSectionButton
            onClick={() => inventoryRef.current?.handleSave()}
            variant="brand"
            icon={Save}
          >
            Guardar ajustes
          </NexusSectionButton>
        );
      }
      if (systemViewMode === "storefront") {
        if (!hasPermission("settings.manage")) return null;
        return (
          <NexusSectionButton
            onClick={() => storefrontStatusRef.current?.handleSave()}
            variant="brand"
            icon={Save}
          >
            Guardar estado
          </NexusSectionButton>
        );
      }
      if (systemViewMode === "announcements") {
        if (!hasPermission("storefront.content.manage")) return null;
        if (announcementViewMode === "list") {
          return (
            <NexusSectionButton
              onClick={() => setAnnouncementViewMode("create")}
              variant="brand"
              icon={Plus}
            >
              Nuevo aviso
            </NexusSectionButton>
          );
        }
        return (
          <PageHeaderActionPair>
            <NexusSectionButton
              onClick={() => setAnnouncementViewMode("list")}
              variant="secondary"
              className="text-text-muted hover:text-text-main"
            >
              Cancelar
            </NexusSectionButton>
            <NexusSectionButton
              onClick={() => storefrontAnnouncementRef.current?.handleSave()}
              variant="brand"
              icon={Save}
              disabled={!isFormValid}
            >
              Guardar aviso
            </NexusSectionButton>
          </PageHeaderActionPair>
        );
      }
      if (systemViewMode === "raffle") {
        if (!hasPermission("raffles.settings.manage")) return null;
        return (
          <NexusSectionButton
            onClick={() => raffleSettingsRef.current?.handleSave()}
            variant="brand"
            icon={Save}
          >
            Guardar módulo
          </NexusSectionButton>
        );
      }
      if (
        systemViewMode === "channels" &&
        (channelsViewMode === "create" || channelsViewMode === "edit")
      ) {
        if (!hasPermission("channels.manage")) return null;
        return (
          <PageHeaderActionPair>
            <NexusSectionButton
              onClick={() => setChannelsViewMode("hub")}
              variant="secondary"
              className="text-text-muted hover:text-text-main"
            >
              Cancelar
            </NexusSectionButton>
            <NexusSectionButton
              onClick={() => channelFormRef.current?.handleSave()}
              variant="brand"
              icon={Save}
              disabled={channelsViewMode === "create" && !isFormValid}
            >
              {channelsViewMode === "create"
                ? "Crear Canal"
                : "Actualizar Canal"}
            </NexusSectionButton>
          </PageHeaderActionPair>
        );
      }
    }

    return null;
  };

  if (!isAuthenticated)
    return (
      <LoginView onLoginSuccess={handleLoginSuccess} showToast={showToast} />
    );

  if (mustChangePassword)
    return (
      <SetupAccountView
        onSetupComplete={handleSetupComplete}
        showToast={showToast}
        userName={userName}
        onLogout={handleLogout}
      />
    );

  const bottomNavTabs = visibleTabs.filter((tab) => tab !== "Mi Perfil") as Array<
    "Inicio" | "Medios" | "Tienda" | "Operaciones" | "Sistema" | "Rifas"
  >;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <UploadQueueProvider showToast={showToast}>
        <div className="min-h-screen bg-bg-app font-sans pb-[var(--admin-page-content-padding-bottom)] text-stone-900 transition-colors duration-500 dark:text-stone-100">
          <Header
            activeTab={activeTab}
            setActiveTab={(tab) => {
              if (tab === "Operaciones") {
                setStoreViewMode("list");
                setSelectedOrder(null);
              }
              setActiveTab(tab as ActiveTabType);
            }}
            onLogout={handleLogout}
            raffleEnabled={showRaffleNavigation}
            tabs={visibleTabs.filter((tab) => tab !== "Mi Perfil")}
            newOrdersCount={pendingOrderIds.size}
            onOpenProfile={() => {
              setActiveTab("Mi Perfil");
              setProfileViewMode("details");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />

          <main
            className="mx-auto max-w-7xl"
            style={{
              paddingInline: "var(--space-md)",
              paddingTop: "var(--space-lg)",
            }}
          >
            <div
              className="flex flex-col justify-between sm:flex-row sm:items-end"
              style={{
                gap: "var(--space-md)",
                marginBottom:
                  isOrdersListViewActive ||
                  isOperationsListViewActive ||
                  isStoreProductListViewActive ||
                  isRaffleParticipationsListViewActive ||
                  isMediaPanelListViewActive ||
                  isMediaVaultListViewActive ||
                  isDashboardMode ||
                  isOrdersOverviewActive
                    ? "var(--space-md)"
                    : "var(--space-lg)",
              }}
            >
              <PageHeader
                activeTab={activeTab}
                dashboardViewMode={dashboardViewMode}
                userName={userName}
                currentDate={currentDate}
                mediaViewMode={mediaViewMode}
                isCreatingMedia={isCreatingMedia}
                isEditingMedia={isEditingMedia}
                isCreatingSlide={isCreatingSlide}
                isEditingSlide={isEditingSlide}
                storeViewMode={storeViewMode}
                isCreatingProduct={isCreatingProduct}
                isEditingProduct={isEditingProduct}
                isCreatingStoreHero={isCreatingStoreHero}
                isEditingStoreHero={isEditingStoreHero}
                raffleViewMode={raffleViewMode}
                isCreatingRaffle={isCreatingRaffle}
                isEditingRaffle={isEditingRaffle}
                systemViewMode={systemViewMode}
                usersFormMode={userFormMode}
                announcementViewMode={announcementViewMode}
                profileViewMode={profileViewMode}
                shippingSubView={shippingSubView}
                channelsViewMode={channelsViewMode}
                selectedOrderRecordType={selectedOrder?.recordType}
                principalTemplateEditor={principalTemplateEditor}
                actionAddon={getActionAddon()}
              />
            </div>

            {isDashboardMode && dashboardViewMode === "overview" && (
              <div style={{ marginBottom: "var(--space-lg)" }}>
                <NexusViewToolbar
                  filterSummaries={[
                    dashboardCommercialFilters.period === "TODAY"
                      ? "Hoy"
                      : dashboardCommercialFilters.period === "7D"
                        ? "7 Días"
                        : dashboardCommercialFilters.period === "15D"
                          ? "15 Días"
                          : dashboardCommercialFilters.period === "MONTH"
                            ? "Este Mes"
                            : "Histórico",
                    dashboardCommercialFilters.source === "STORE"
                      ? "Tienda"
                      : dashboardCommercialFilters.source === "RAFFLES"
                        ? "Rifas"
                        : "Todo",
                    dashboardCommercialFilters.paymentMethod === "TRANSFER"
                      ? "Depósito / Transferencia"
                      : dashboardCommercialFilters.paymentMethod ===
                          "MERCADOPAGO"
                        ? "Tarjeta"
                        : "Todos los Métodos",
                  ]}
                  filterActive={
                    dashboardCommercialFilters.period !==
                      DEFAULT_DASHBOARD_COMMERCIAL_FILTERS.period ||
                    dashboardCommercialFilters.source !==
                      DEFAULT_DASHBOARD_COMMERCIAL_FILTERS.source ||
                    dashboardCommercialFilters.paymentMethod !==
                      DEFAULT_DASHBOARD_COMMERCIAL_FILTERS.paymentMethod
                  }
                  onFilterClick={() =>
                    setIsDashboardCommercialFiltersOpen(true)
                  }
                />
              </div>
            )}

            {isOrdersOverviewActive && (
              <div style={{ marginBottom: "var(--space-lg)" }}>
                <NexusViewToolbar
                  filterSummaries={[
                    salesOverviewFilters.period === "TODAY"
                      ? "Hoy"
                      : salesOverviewFilters.period === "7D"
                        ? "7 Días"
                        : salesOverviewFilters.period === "15D"
                          ? "15 Días"
                          : salesOverviewFilters.period === "MONTH"
                            ? "Este Mes"
                            : "Histórico",
                    salesOverviewFilters.productType === "BIRD"
                      ? "Aves"
                      : salesOverviewFilters.productType === "ITEM"
                        ? "Artículos"
                        : "Todos los Productos",
                    salesOverviewFilters.paymentMethod === "TRANSFER"
                      ? "Depósito / Transferencia"
                      : salesOverviewFilters.paymentMethod === "MERCADOPAGO"
                        ? "Tarjeta"
                        : "Todos los Métodos",
                  ]}
                  filterActive={
                    salesOverviewFilters.period !==
                      DEFAULT_SALES_OVERVIEW_FILTERS.period ||
                    salesOverviewFilters.productType !==
                      DEFAULT_SALES_OVERVIEW_FILTERS.productType ||
                    salesOverviewFilters.paymentMethod !==
                      DEFAULT_SALES_OVERVIEW_FILTERS.paymentMethod
                  }
                  onFilterClick={() => setIsSalesOverviewFiltersOpen(true)}
                />
              </div>
            )}

            {isOrdersListViewActive && (
              <div style={{ marginBottom: "var(--space-lg)" }}>
                <NexusViewToolbar
                  searchValue={orderSearchQuery}
                  onSearchChange={setOrderSearchQuery}
                  searchPlaceholder="Buscar orden, producto, cliente, teléfono o estado..."
                  filterActive={hasOrderAdvancedFilters}
                  onFilterClick={() => setIsOrderFiltersOpen(true)}
                />
              </div>
            )}

            {isOperationsListViewActive && (
              <div style={{ marginBottom: "var(--space-lg)" }}>
                <NexusViewToolbar
                  searchValue={operationsSearchQuery}
                  onSearchChange={setOperationsSearchQuery}
                  searchPlaceholder="Buscar cliente, orden, participación, producto, rifa o boleto..."
                  filterActive={hasOperationsFilters}
                  onFilterClick={() => setIsOperationsFiltersOpen(true)}
                />
              </div>
            )}

            {isStoreProductListViewActive && (
              <div style={{ marginBottom: "var(--space-lg)" }}>
                <NexusViewToolbar
                  searchValue={storeProductSearchQuery}
                  onSearchChange={setStoreProductSearchQuery}
                  searchPlaceholder="Buscar producto, anillo, precio o estado..."
                  filterActive={hasStoreProductAdvancedFilters}
                  onFilterClick={() => setIsStoreProductFiltersOpen(true)}
                />
              </div>
            )}

            {isRaffleListViewActive && (
              <div style={{ marginBottom: "var(--space-lg)" }}>
                <NexusViewToolbar
                  searchValue={raffleSearchQuery}
                  onSearchChange={setRaffleSearchQuery}
                  searchPlaceholder="Buscar título o número de rifa..."
                  filterLabel="Filtros"
                  filterActive={hasRaffleAdvancedFilters}
                  onFilterClick={() => setIsRaffleFiltersOpen(true)}
                />
              </div>
            )}

            {isRaffleTicketBoardViewActive && (
              <div style={{ marginBottom: "var(--space-lg)" }}>
                <NexusViewToolbar
                  searchValue={raffleTicketBoardSearchQuery}
                  onSearchChange={(value) =>
                    setRaffleTicketBoardSearchQuery(value.replace(/\D/g, ""))
                  }
                  searchPlaceholder="Buscar boleto u oportunidad..."
                  filterLabel="Filtros"
                  filterActive={hasRaffleTicketBoardFilter}
                  onFilterClick={() => setIsRaffleTicketBoardFiltersOpen(true)}
                />
              </div>
            )}

            {isRaffleParticipationsListViewActive && (
              <div style={{ marginBottom: "var(--space-lg)" }}>
                <NexusViewToolbar
                  searchValue={raffleParticipationSearchQuery}
                  onSearchChange={setRaffleParticipationSearchQuery}
                  searchPlaceholder="Buscar rifa, participante, teléfono, estado o boleto..."
                  filterActive={hasRaffleParticipationFilters}
                  onFilterClick={() =>
                    setIsRaffleParticipationFiltersOpen(true)
                  }
                />
              </div>
            )}

            {isMediaPanelListViewActive && (
              <div style={{ marginBottom: "var(--space-lg)" }}>
                <NexusViewToolbar
                  searchValue={searchQuery}
                  onSearchChange={setSearchQuery}
                  searchPlaceholder="Buscar medio, categoría o subcategoría..."
                  filterActive={hasGalleryAdvancedFilters}
                  onFilterClick={() => setIsGalleryFiltersOpen(true)}
                />
              </div>
            )}

            {isMediaVaultListViewActive && (
              <div style={{ marginBottom: "var(--space-lg)" }}>
                <NexusViewToolbar
                  searchValue={mediaVaultSearchQuery}
                  onSearchChange={setMediaVaultSearchQuery}
                  searchPlaceholder="Buscar archivo, formato o usuario..."
                  filterActive={hasMediaVaultFilters}
                  onFilterClick={() => setIsMediaVaultFiltersOpen(true)}
                />
              </div>
            )}

            <div
              className="flex flex-col lg:flex-row"
              style={{ gap: "var(--space-lg)" }}
            >
              {dashboardViewMode === "overview" && (
                <div className="z-40 w-full flex-shrink-0 lg:w-fit">
                  <QuickActions
                    context={activeTab}
                    onAction={handleQuickAction}
                    isDetail={
                      storeViewMode === "order-detail" ||
                      (isStoreMode && storeViewMode === "overview") ||
                      (isRafflesMode &&
                        raffleViewMode === "participation-detail") ||
                      (isRafflesMode && raffleViewMode === "detail") ||
                      (isRafflesMode && raffleViewMode === "tickets") ||
                      (isRafflesMode && raffleViewMode === "materials") ||
                      (isSystemMode &&
                        systemViewMode === "channels" &&
                        channelsViewMode === "principal")
                    }
                    detailActions={
                      isRafflesMode && raffleViewMode === "materials"
                        ? [
                            { icon: <ImageIcon size={20} />, label: "Ficha de la rifa" },
                            { icon: <Ticket size={20} />, label: "Boletera visual" },
                          ]
                        : undefined
                    }
                    raffleEnabled={showRaffleNavigation}
                    permissions={userPermissions}
                  />
                </div>
              )}

              <div className="min-w-0 w-full flex-1">
                {isProfileMode ? (
                  <ProfileView
                    viewMode={profileViewMode}
                    showToast={showToast}
                    onIdentityChange={(nextProfile: OwnProfile) => {
                      setUserName(nextProfile.name.split(" ")[0]);
                      const currentSession =
                        localStorage.getItem("admin_session");
                      if (currentSession) {
                        const parsed = JSON.parse(currentSession);
                        parsed.name = nextProfile.name;
                        localStorage.setItem(
                          "admin_session",
                          JSON.stringify(parsed),
                        );
                      }
                    }}
                  />
                ) : isMediaMode ? (
                  mediaViewMode === "slider_list" ||
                  mediaViewMode === "slide_create" ||
                  mediaViewMode === "slide_edit" ? (
                    <HomeSliderView
                      ref={homeSliderRef}
                      viewMode={mediaViewMode}
                      onSetViewMode={setMediaViewMode}
                      showToast={showToast}
                      onValidationChange={setIsFormValid}
                    />
                  ) : mediaViewMode === "vault_list" ||
                    mediaViewMode === "vault_upload" ? (
                    <MediaVaultView
                      ref={mediaVaultRef}
                      viewMode={mediaViewMode}
                      filter={mediaVaultFilter}
                      searchQuery={mediaVaultSearchQuery}
                      onSetViewMode={setMediaViewMode}
                      showToast={showToast}
                      setConfirmDialog={setConfirmDialog}
                      onValidationChange={setIsFormValid}
                    />
                  ) : (
                    <GalleryView
                      ref={galleryRef}
                      searchQuery={searchQuery}
                      advancedFilters={galleryAdvancedFilters}
                      viewMode={mediaViewMode}
                      onSetViewMode={setMediaViewMode}
                      showToast={showToast}
                      setConfirmDialog={setConfirmDialog}
                      onValidationChange={setIsFormValid}
                    />
                  )
                ) : isOperationsTab ? (
                  storeViewMode === "order-detail" && selectedOrder ? (
                    <OrderDetailView
                      order={selectedOrder}
                      canManageOrder={canManageOrder}
                      canRefundOrder={canRefundOrder}
                      canSendMessages={canSendMessages}
                      onBack={handleBackFromOrderDetail}
                      showToast={showToast}
                    />
                  ) : (
                    <OperationsView
                      orders={orders}
                      isLoadingOrders={isLoadingDashboard}
                      canManageOrder={canManageOrder}
                      canManageOrderFinancial={canManageOrderFinancial}
                      canViewParticipations={canViewRaffleParticipations}
                      canManageParticipation={canManageParticipation}
                      canManageRaffleFinancial={canManageRaffleFinancial}
                      filters={operationsFilters}
                      searchQuery={operationsSearchQuery}
                      onOrdersChange={setOrders}
                      onViewOrder={handleViewOrderDetail}
                      onViewParticipation={(participation) => {
                        setRaffleParticipationReturnMode("operations");
                        setSelectedRaffleParticipation(participation);
                        setActiveTab("Rifas");
                        setRaffleViewMode("participation-detail");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      showToast={showToast}
                      setConfirmDialog={setConfirmDialog}
                    />
                  )
                ) : isStoreMode ? (
                  isOrdersOverviewActive ? (
                    <SalesOverviewView
                      period={salesOverviewFilters.period}
                      productType={salesOverviewFilters.productType}
                      paymentMethod={salesOverviewFilters.paymentMethod}
                      showToast={showToast}
                      onOpenOrder={handleViewSalesOrder}
                    />
                  ) : storeViewMode === "orders" &&
                    storeViewMode !== "order-detail" ? (
                    <OrdersView
                      orders={orders}
                      isLoading={isLoadingDashboard}
                      canManageOrder={canManageOrder}
                      canManageOrderFinancial={canManageOrderFinancial}
                      advancedFilters={orderAdvancedFilters}
                      searchQuery={orderSearchQuery}
                      onOrdersChange={setOrders}
                      onViewDetail={handleViewOrderDetail}
                      showToast={showToast}
                      setConfirmDialog={setConfirmDialog}
                    />
                  ) : storeViewMode === "order-detail" && selectedOrder ? (
                    <OrderDetailView
                      order={selectedOrder}
                      canManageOrder={canManageOrder}
                      canRefundOrder={canRefundOrder}
                      canSendMessages={canSendMessages}
                      onBack={handleBackFromOrderDetail}
                      showToast={showToast}
                    />
                  ) : storeViewMode === "payment_links" ? (
                    <PaymentLinksView
                      showToast={showToast}
                      setConfirmDialog={setConfirmDialog}
                      isGeneratorOpen={isPaymentLinkGeneratorOpen}
                      onCloseGenerator={() => setIsPaymentLinkGeneratorOpen(false)}
                    />
                  ) : (
                    <StoreView
                      ref={storeRef}
                      productSearchQuery={storeProductSearchQuery}
                      advancedFilters={storeProductAdvancedFilters}
                      viewMode={storeViewMode}
                      onSetViewMode={setStoreViewMode}
                      showToast={showToast}
                      setConfirmDialog={setConfirmDialog}
                      onValidationChange={setIsFormValid}
                      onOpenOrder={handleViewProductOrder}
                    />
                  )
                ) : isRafflesMode ? (
                  raffleViewMode === "participations" ? (
                    <RaffleParticipationsView
                      canManageParticipation={canManageParticipation}
                      canManageRaffleFinancial={canManageRaffleFinancial}
                      advancedFilters={raffleParticipationFilters}
                      searchQuery={raffleParticipationSearchQuery}
                      onViewDetail={(participation) => {
                        setRaffleParticipationReturnMode("participations");
                        setSelectedRaffleParticipation(participation);
                        setRaffleViewMode("participation-detail");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      onParticipationChange={(participation) => {
                        setSelectedRaffleParticipation((current) =>
                          current?.id === participation.id
                            ? participation
                            : current,
                        );
                      }}
                      showToast={showToast}
                      setConfirmDialog={setConfirmDialog}
                    />
                  ) : raffleViewMode === "participation-detail" &&
                    selectedRaffleParticipation ? (
                    <RaffleParticipationDetailView
                      participation={selectedRaffleParticipation}
                      canManageParticipation={canManageParticipation}
                      canManageRaffleFinancial={canManageRaffleFinancial}
                      canSendMessages={canSendMessages}
                      onLoaded={setSelectedRaffleParticipation}
                      showToast={showToast}
                    />
                  ) : (
                    <RaffleView
                      searchQuery={raffleSearchQuery}
                      canManageRaffles={canManageRaffles}
                      canManageRaffleCoupons={canManageRaffleCoupons}
                      canManageResults={canManageResults}
                      canManageParticipations={canManageParticipation}
                      canViewMessages={canViewMessages}
                      canSendMessages={canSendMessages}
                      advancedFilters={raffleAdvancedFilters}
                      ticketBoardSearchQuery={raffleTicketBoardSearchQuery}
                      ticketBoardFilter={raffleTicketBoardFilter}
                      materialKind={raffleMaterialKind}
                      viewMode={raffleViewMode}
                      onSetViewMode={setRaffleViewMode}
                      onViewParticipation={(participation, origin) => {
                        setRaffleParticipationReturnMode(origin);
                        setSelectedRaffleParticipation(participation);
                        setRaffleViewMode("participation-detail");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      showToast={showToast}
                      setConfirmDialog={setConfirmDialog}
                      onValidationChange={setIsFormValid}
                      onSelectedRaffleChange={setSelectedRaffleForHeader}
                    />
                  )
                ) : isSystemMode ? (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-visible">
                    {systemViewMode === "shipping" ? (
                      <ShippingView
                        ref={shippingRef}
                        subView={shippingSubView}
                        setSubView={setShippingSubView}
                        showToast={showToast}
                        setConfirmDialog={setConfirmDialog}
                      />
                    ) : systemViewMode === "config" ? (
                      <PlatformSettingsView
                        ref={platformSettingsRef}
                        showToast={showToast}
                      />
                    ) : systemViewMode === "users" ? (
                      userFormMode ? (
                        <UserForm
                          key={`${userFormMode}-${selectedUserForForm?.id ?? "new"}`}
                          ref={userFormRef}
                          user={selectedUserForForm}
                          currentUserPermissions={userPermissions as PermissionId[]}
                          showToast={showToast}
                          onSavingChange={setIsUserFormSaving}
                          onValidationChange={setIsFormValid}
                          onSaved={() => {
                            setUserFormMode(null);
                            setSelectedUserForForm(null);
                            setIsFormValid(false);
                            setIsUserFormSaving(false);
                          }}
                        />
                      ) : (
                        <UsersView
                          showToast={showToast}
                          setConfirmDialog={setConfirmDialog}
                          onCreateUser={() => {
                            setSelectedUserForForm(null);
                            setIsFormValid(false);
                            setUserFormMode("create");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          onEditUser={(user) => {
                            setSelectedUserForForm(user);
                            setIsFormValid(false);
                            setUserFormMode("edit");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        />
                      )
                    ) : systemViewMode === "identity" ? (
                      <IdentityView
                        ref={identityRef}
                        status={identityStatus}
                        setStatus={setIdentityStatus}
                        onTempLogoChange={setHasTempLogo}
                        showToast={showToast}
                      />
                    ) : systemViewMode === "channels" ? (
                      channelsViewMode === "hub" ? (
                        <ChannelsHub
                          onEditPrincipal={() =>
                            setChannelsViewMode("principal")
                          }
                          onCreateChannel={() => {
                            setSelectedChannelId(null);
                            setChannelsViewMode("create");
                          }}
                          onEditChannel={(id) => {
                            setSelectedChannelId(id);
                            setChannelsViewMode("edit");
                          }}
                          showToast={showToast}
                          setConfirmDialog={setConfirmDialog}
                        />
                      ) : channelsViewMode === "principal" ? (
                        <PrincipalChannelView
                          showToast={showToast}
                          setConfirmDialog={setConfirmDialog}
                          templateEditorResetToken={principalTemplateEditorResetToken}
                          onTemplateEditorChange={setPrincipalTemplateEditor}
                        />
                      ) : channelsViewMode === "create" ? (
                        <ChannelForm
                          ref={channelFormRef}
                          onCancel={() => setChannelsViewMode("hub")}
                          onSave={() => setChannelsViewMode("hub")}
                          onValidationChange={setIsFormValid}
                          showToast={showToast}
                          setConfirmDialog={setConfirmDialog}
                        />
                      ) : (
                        <ChannelEditor
                          id={selectedChannelId!}
                          onSave={() => setChannelsViewMode("hub")}
                          showToast={showToast}
                          setConfirmDialog={setConfirmDialog}
                        />
                      )
                    ) : systemViewMode === "inventory" ? (
                      <InventorySettingsView
                        ref={inventoryRef}
                        showToast={showToast}
                      />
                    ) : systemViewMode === "billing" ? (
                      <BillingView
                        ref={billingRef}
                        showToast={showToast}
                        setConfirmDialog={setConfirmDialog}
                        canManageBilling={hasPermission("billing.manage")}
                      />
                    ) : systemViewMode === "storefront" ? (
                      <StorefrontStatusView
                        ref={storefrontStatusRef}
                        showToast={showToast}
                      />
                    ) : systemViewMode === "announcements" ? (
                      <StorefrontAnnouncementView
                        ref={storefrontAnnouncementRef}
                        viewMode={announcementViewMode}
                        onSetViewMode={setAnnouncementViewMode}
                        onValidationChange={setIsFormValid}
                        showToast={showToast}
                        setConfirmDialog={setConfirmDialog}
                      />
                    ) : systemViewMode === "raffle" ? (
                      <RaffleSettingsView
                        ref={raffleSettingsRef}
                        showToast={showToast}
                        canManageRaffleSettings={hasPermission("raffles.settings.manage")}
                        onStatusChange={(enabled) => {
                          localStorage.setItem(
                            "admin_raffle_enabled",
                            enabled ? "1" : "0",
                          );
                          setRaffleEnabled(enabled);
                        }}
                      />
                    ) : systemViewMode === "intelligence" ? (
                      <RaffleIntelligenceView showToast={showToast} />
                    ) : (
                      <NexusAutonomousCard>
                        <div
                          className="flex flex-col items-center text-center"
                          style={{ gap: "var(--space-sm)" }}
                        >
                          <NexusAutonomousIcon
                            icon={Settings}
                            variant="muted"
                          />
                          <h3 className="text-h3 text-text-main">
                            Módulo en desarrollo
                          </h3>
                          <p className="text-secondary text-text-muted">
                            Esta sección del sistema estará disponible
                            próximamente.
                          </p>
                        </div>
                      </NexusAutonomousCard>
                    )}
                  </div>
                ) : isDashboardMode && dashboardViewMode === "milestones" ? (
                  <DashboardMilestonesView
                    isLoading={isLoadingDashboard}
                    stats={dashboardStats}
                  />
                ) : (
                  <DashboardView
                    isLoading={isLoadingDashboard}
                    isLoadingCommercial={isLoadingDashboardCommercial}
                    stats={dashboardStats}
                    commercialOverview={dashboardCommercialOverview}
                    canViewMilestones={hasPermission("dashboard.view")}
                    billingServices={billingServices}
                    billingCharges={billingCharges}
                    billingPayments={billingPayments}
                    onNavigateToSystem={navigateToSystem}
                    onTabChange={setActiveTab as any}
                    onOpenOrder={handleViewDashboardOrder}
                    onOpenParticipation={handleViewDashboardParticipation}
                    onOpenRaffleParticipations={() => {
                      setActiveTab("Rifas");
                      setRaffleViewMode("participations");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onOpenMilestones={() => {
                      setDashboardViewMode("milestones");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onOpenCommercialHistory={({ source, paymentMethod }) => {
                      setOperationsSearchQuery("");
                      setOperationsFilters({
                        source:
                          source === "STORE"
                            ? "store"
                            : source === "RAFFLES"
                              ? "raffles"
                              : "all",
                        status: "all",
                        paymentMethod:
                          paymentMethod === "MERCADOPAGO"
                            ? "card"
                            : paymentMethod === "TRANSFER"
                              ? "transfer"
                              : "all",
                      });
                      setSelectedOrder(null);
                      setActiveTab("Operaciones");
                      setStoreViewMode("list");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                )}
              </div>
            </div>
          </main>

          {!isRaffleTicketBoardViewActive && (
          <BottomNav
              activeTab={activeTab as any}
              onTabChange={(tab) => {
                if (tab === "Operaciones") {
                  setStoreViewMode("list");
                  setSelectedOrder(null);
                }
                setActiveTab(tab as ActiveTabType);
              }}
              tabs={bottomNavTabs}
              newOrdersCount={pendingOrderIds.size}
            />
          )}
          <StoreProductFiltersModal
            isOpen={isStoreProductFiltersOpen}
            value={storeProductAdvancedFilters}
            onClose={() => setIsStoreProductFiltersOpen(false)}
            onApply={(filters) => {
              setStoreProductAdvancedFilters(filters);
              setIsStoreProductFiltersOpen(false);
            }}
            onClear={() => {
              setStoreProductAdvancedFilters(
                DEFAULT_STORE_PRODUCT_ADVANCED_FILTERS,
              );
              setIsStoreProductFiltersOpen(false);
            }}
          />
          <GalleryFiltersModal
            isOpen={isGalleryFiltersOpen}
            value={galleryAdvancedFilters}
            onClose={() => setIsGalleryFiltersOpen(false)}
            onApply={(filters) => {
              setGalleryAdvancedFilters(filters);
              setIsGalleryFiltersOpen(false);
            }}
            onClear={() => {
              setGalleryAdvancedFilters(DEFAULT_GALLERY_ADVANCED_FILTERS);
              setIsGalleryFiltersOpen(false);
            }}
          />
          <MediaVaultFiltersModal
            isOpen={isMediaVaultFiltersOpen}
            value={mediaVaultFilter}
            onClose={() => setIsMediaVaultFiltersOpen(false)}
            onApply={(filter) => {
              setMediaVaultFilter(filter);
              setIsMediaVaultFiltersOpen(false);
            }}
            onClear={() => {
              setMediaVaultFilter(DEFAULT_MEDIA_VAULT_FILTER);
              setIsMediaVaultFiltersOpen(false);
            }}
          />
          <SalesOverviewFiltersModal
            isOpen={isSalesOverviewFiltersOpen}
            value={salesOverviewFilters}
            onClose={() => setIsSalesOverviewFiltersOpen(false)}
            onApply={(filters) => {
              setSalesOverviewFilters(filters);
              setIsSalesOverviewFiltersOpen(false);
            }}
            onClear={() => {
              setSalesOverviewFilters(DEFAULT_SALES_OVERVIEW_FILTERS);
              setIsSalesOverviewFiltersOpen(false);
            }}
          />
          <DashboardCommercialFiltersModal
            isOpen={isDashboardCommercialFiltersOpen}
            value={dashboardCommercialFilters}
            onClose={() => setIsDashboardCommercialFiltersOpen(false)}
            onApply={(filters) => {
              setDashboardCommercialFilters(filters);
              setIsDashboardCommercialFiltersOpen(false);
            }}
            onClear={() => {
              setDashboardCommercialFilters(
                DEFAULT_DASHBOARD_COMMERCIAL_FILTERS,
              );
              setIsDashboardCommercialFiltersOpen(false);
            }}
          />
          <OrderFiltersModal
            isOpen={isOrderFiltersOpen}
            value={orderAdvancedFilters}
            onClose={() => setIsOrderFiltersOpen(false)}
            onApply={(filters) => {
              setOrderAdvancedFilters(filters);
              setIsOrderFiltersOpen(false);
            }}
            onClear={() => {
              setOrderAdvancedFilters(DEFAULT_ORDER_ADVANCED_FILTERS);
              setIsOrderFiltersOpen(false);
            }}
          />
          <OperationsFiltersModal
            isOpen={isOperationsFiltersOpen}
            value={operationsFilters}
            onClose={() => setIsOperationsFiltersOpen(false)}
            onApply={(filters) => {
              setOperationsFilters(filters);
              setIsOperationsFiltersOpen(false);
            }}
            onClear={() => {
              setOperationsFilters(DEFAULT_OPERATIONS_FILTERS);
              setIsOperationsFiltersOpen(false);
            }}
          />
          <RaffleParticipationFiltersModal
            isOpen={isRaffleParticipationFiltersOpen}
            value={raffleParticipationFilters}
            onClose={() => setIsRaffleParticipationFiltersOpen(false)}
            onApply={(filters) => {
              setRaffleParticipationFilters(filters);
              setIsRaffleParticipationFiltersOpen(false);
            }}
            onClear={() => {
              setRaffleParticipationFilters(
                DEFAULT_RAFFLE_PARTICIPATION_FILTERS,
              );
              setIsRaffleParticipationFiltersOpen(false);
            }}
          />
          <RaffleFiltersModal
            isOpen={isRaffleFiltersOpen}
            value={raffleAdvancedFilters}
            onClose={() => setIsRaffleFiltersOpen(false)}
            onApply={(filters) => {
              setRaffleAdvancedFilters(filters);
              setIsRaffleFiltersOpen(false);
            }}
            onClear={() => {
              setRaffleAdvancedFilters(DEFAULT_RAFFLE_ADVANCED_FILTERS);
              setIsRaffleFiltersOpen(false);
            }}
          />
          <RaffleTicketBoardFiltersModal
            isOpen={isRaffleTicketBoardFiltersOpen}
            value={raffleTicketBoardFilter}
            onClose={() => setIsRaffleTicketBoardFiltersOpen(false)}
            onApply={(filter) => {
              setRaffleTicketBoardFilter(filter);
              setIsRaffleTicketBoardFiltersOpen(false);
            }}
            onClear={() => {
              setRaffleTicketBoardFilter(DEFAULT_TICKET_BOARD_FILTER);
              setIsRaffleTicketBoardFiltersOpen(false);
            }}
          />
          <ConfirmModal {...confirmDialog} onCancel={closeConfirm} />
          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              actionLabel={toast.actionLabel}
              onAction={toast.onAction}
              onClose={() => setToast(null)}
            />
          )}
        </div>
      </UploadQueueProvider>
    </ThemeContext.Provider>
  );
}

export default App;
