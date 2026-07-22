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
  Plus,
  Package,
  ArrowRight,
} from "lucide-react";
import { Header } from "./components/Header";
import { QuickActions } from "./components/QuickActions";
import { PageHeader } from "./components/Layout/PageHeader";
import { DashboardView } from "./components/Dashboard/DashboardView";

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
import {
  StoreView,
  StoreViewRef,
} from "./components/Store/StoreView";
import {
  DEFAULT_STORE_PRODUCT_ADVANCED_FILTERS,
  StoreProductAdvancedFilters,
  StoreProductFiltersModal,
} from "./components/Store/StoreProductFiltersModal";
import { OrdersView } from "./components/Store/Orders/OrdersView";
import { OrderDetailView } from "./components/Store/Orders/OrderDetailView";
import {
  DEFAULT_ORDER_ADVANCED_FILTERS,
  OrderFiltersModal,
  type OrderAdvancedFilters,
} from "./components/Store/Orders/OrderFiltersModal";
import { PlatformSettingsView } from "./components/System/Config/PlatformSettingsView";
import { ShippingView } from "./components/System/Shipping/ShippingView";
import { UsersView, UsersViewRef } from "./components/System/Users/UsersView";
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
import {
  DEFAULT_RAFFLE_ADVANCED_FILTERS,
  RaffleFiltersModal,
  type RaffleAdvancedFilters,
} from "./components/Raffle/RaffleFiltersModal";
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
  AnnualService,
  ExtraCharge,
  BillingPayment,
  RaffleParticipation,
} from "./types";
import { apiOrders, apiDashboard, apiBilling, apiSystem, api, apiRaffleParticipations } from "./api";
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
  | "Órdenes"
  | "Sistema"
  | "Mi Perfil"
  | "Rifas";

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
  | "create"
  | "edit"
  | "hero_list"
  | "hero_create"
  | "hero_edit"
  | "coupon_list"
  | "coupon_create"
  | "coupon_edit"
  | "orders"
  | "order-detail";

type RaffleModeType =
  | "list"
  | "detail"
  | "tickets"
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
  "Órdenes",
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
];

const RAFFLE_MODES: RaffleModeType[] = [
  "list",
  "detail",
  "tickets",
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
  const [galleryAdvancedFilters, setGalleryAdvancedFilters] =
    useState<GalleryAdvancedFilters>(DEFAULT_GALLERY_ADVANCED_FILTERS);
  const [isGalleryFiltersOpen, setIsGalleryFiltersOpen] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderAdvancedFilters, setOrderAdvancedFilters] =
    useState<OrderAdvancedFilters>(DEFAULT_ORDER_ADVANCED_FILTERS);
  const [isOrderFiltersOpen, setIsOrderFiltersOpen] = useState(false);
  const [raffleParticipationSearchQuery, setRaffleParticipationSearchQuery] =
    useState("");
  const [raffleParticipationFilters, setRaffleParticipationFilters] =
    useState<RaffleParticipationAdvancedFilters>(DEFAULT_RAFFLE_PARTICIPATION_FILTERS);
  const [isRaffleParticipationFiltersOpen, setIsRaffleParticipationFiltersOpen] =
    useState(false);
  const [raffleSearchQuery, setRaffleSearchQuery] = useState("");
  const [raffleAdvancedFilters, setRaffleAdvancedFilters] =
    useState<RaffleAdvancedFilters>(DEFAULT_RAFFLE_ADVANCED_FILTERS);
  const [isRaffleFiltersOpen, setIsRaffleFiltersOpen] = useState(false);
  const [storeProductSearchQuery, setStoreProductSearchQuery] = useState("");
  const [mediaVaultSearchQuery, setMediaVaultSearchQuery] = useState("");
  const [mediaVaultFilter, setMediaVaultFilter] =
    useState<MediaVaultFilter>(DEFAULT_MEDIA_VAULT_FILTER);
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
    return saved === "order-detail" ? "orders" : saved;
  });
  const [raffleViewMode, setRaffleViewMode] = useState<RaffleModeType>(() => {
    const legacyMode = localStorage.getItem("admin_raffle_view_mode");
    if (legacyMode === "orders" || legacyMode === "order-detail") {
      return "participations";
    }
    if (legacyMode === "coupons") return "coupon_list";
    const saved = getStoredEnum(
      "admin_raffle_view_mode",
      RAFFLE_MODES,
      "list",
    );
    if (saved === "participation-detail") return "participations";
    return saved === "detail" ? "list" : saved;
  });
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
  const [raffleEnabled, setRaffleEnabled] = useState(
    () => localStorage.getItem("admin_raffle_enabled") === "1",
  );

  const shippingRef = React.useRef<{
    handleSaveConfig: () => void;
    handleSaveZones: () => void;
  }>(null);
  const usersRef = React.useRef<UsersViewRef>(null);
  const identityRef = React.useRef<IdentityViewRef>(null);
  const channelFormRef = React.useRef<{ handleSave: () => void }>(null);
  const inventoryRef = React.useRef<InventorySettingsViewRef>(null);
  const billingRef = React.useRef<BillingViewRef>(null);
  const raffleSettingsRef = React.useRef<{ handleSave: () => void }>(null);
  const platformSettingsRef = React.useRef<{ handleSave: () => void }>(null);
  const storefrontStatusRef = React.useRef<StorefrontStatusViewRef>(null);
  const storefrontAnnouncementRef = React.useRef<StorefrontAnnouncementViewRef>(null);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedRaffleParticipation, setSelectedRaffleParticipation] =
    useState<RaffleParticipation | null>(null);
  const [raffleParticipationReturnMode, setRaffleParticipationReturnMode] =
    useState<"participations" | "detail" | "tickets">("participations");
  const [orders, setOrders] = useState<Order[]>([]);
  const [pendingOrderIds, setPendingOrderIds] = useState<Set<string>>(new Set());
  const announcedUnreadOrderIdsRef = React.useRef<Set<string>>(new Set());
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
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
    setActiveTab("Órdenes");
    setStoreViewMode("orders");
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
            apiOrders.getAll(),
            apiDashboard.getStats(),
            apiBilling.getAll(),
            apiSystem.getConfig(),
          ]);

        flushSync(() => {
          setOrders(ordersData);
          setDashboardStats(statsData);
          setBillingServices(billingData.services);
          setBillingCharges(billingData.charges);
          setBillingPayments(billingData.payments);
          const nextRaffleEnabled = configData["raffle_enabled"] === "1";
          localStorage.setItem("admin_raffle_enabled", nextRaffleEnabled ? "1" : "0");
          setRaffleEnabled(nextRaffleEnabled);
          if (!nextRaffleEnabled) {
            setActiveTab((current) => (current === "Rifas" ? "Inicio" : current));
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
  }, [token, showToast, syncUnreadOrders]);

  useEffect(() => {
    if (!token) return;

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
  }, [token, syncUnreadOrders]);

  const closeConfirm = () =>
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));

  const handleLoginSuccess = (userData: any, jwtToken: string) => {
    const authData = {
      loggedIn: true,
      token: jwtToken,
      id: userData.id,
      username: userData.username,
      name: userData.name,
      role: userData.role || "staff",
      mustChangePassword: userData.mustChangePassword,
      expiresAt: new Date().getTime() + 12 * 60 * 60 * 1000,
    };
    localStorage.setItem("admin_session", JSON.stringify(authData));
    localStorage.removeItem("admin_known_order_ids");
    localStorage.removeItem("admin_pending_order_ids");
    announcedUnreadOrderIdsRef.current.clear();
    setPendingOrderIds(new Set());
    setUserName(userData.name.split(" ")[0]);
    setUserRole(userData.role || "staff");
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
  const isStoreMode = activeTab === "Tienda";
  const isOrdersTab = activeTab === "Órdenes";
  const isOrdersViewActive =
    isOrdersTab || (isStoreMode && storeViewMode === "orders");
  const isOrdersListViewActive =
    isOrdersViewActive && storeViewMode !== "order-detail";
  const isStoreProductListViewActive = isStoreMode && storeViewMode === "list";
  const isMediaVaultListViewActive =
    isMediaMode && mediaViewMode === "vault_list";
  const isMediaPanelListViewActive =
    isMediaMode && mediaViewMode === "list";
  const isSystemMode = activeTab === "Sistema";
  const isProfileMode = activeTab === "Mi Perfil";
  const isRafflesMode = activeTab === "Rifas";
  const isRaffleListViewActive =
    isRafflesMode && raffleViewMode === "list";
  const isRaffleParticipationsListViewActive =
    isRafflesMode && raffleViewMode === "participations";
  // The active raffle route reserves its navigation rail before remote config resolves.
  const showRaffleNavigation = raffleEnabled || isRafflesMode;

  const hasStoreProductAdvancedFilters =
    storeProductAdvancedFilters.type !== DEFAULT_STORE_PRODUCT_ADVANCED_FILTERS.type ||
    storeProductAdvancedFilters.publication !== DEFAULT_STORE_PRODUCT_ADVANCED_FILTERS.publication ||
    storeProductAdvancedFilters.purpose !== DEFAULT_STORE_PRODUCT_ADVANCED_FILTERS.purpose ||
    storeProductAdvancedFilters.age !== DEFAULT_STORE_PRODUCT_ADVANCED_FILTERS.age;
  const hasMediaVaultFilters = mediaVaultFilter !== DEFAULT_MEDIA_VAULT_FILTER;
  const hasGalleryAdvancedFilters =
    galleryAdvancedFilters.type !== DEFAULT_GALLERY_ADVANCED_FILTERS.type ||
    galleryAdvancedFilters.categoryId !== DEFAULT_GALLERY_ADVANCED_FILTERS.categoryId;
  const hasRaffleParticipationFilters =
    raffleParticipationFilters.status !== DEFAULT_RAFFLE_PARTICIPATION_FILTERS.status ||
    raffleParticipationFilters.type !== DEFAULT_RAFFLE_PARTICIPATION_FILTERS.type ||
    raffleParticipationFilters.paymentMethod !== DEFAULT_RAFFLE_PARTICIPATION_FILTERS.paymentMethod;
  const hasOrderAdvancedFilters =
    orderAdvancedFilters.status !== DEFAULT_ORDER_ADVANCED_FILTERS.status ||
    orderAdvancedFilters.type !== DEFAULT_ORDER_ADVANCED_FILTERS.type ||
    orderAdvancedFilters.paymentMethod !== DEFAULT_ORDER_ADVANCED_FILTERS.paymentMethod ||
    orderAdvancedFilters.deliveryMethod !== DEFAULT_ORDER_ADVANCED_FILTERS.deliveryMethod;
  const hasRaffleAdvancedFilters =
    raffleAdvancedFilters.status !== DEFAULT_RAFFLE_ADVANCED_FILTERS.status ||
    raffleAdvancedFilters.type !== DEFAULT_RAFFLE_ADVANCED_FILTERS.type ||
    raffleAdvancedFilters.access !== DEFAULT_RAFFLE_ADVANCED_FILTERS.access ||
    raffleAdvancedFilters.featured !== DEFAULT_RAFFLE_ADVANCED_FILTERS.featured;

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
    isEditingRaffleCoupon;

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
    setActiveTab("Órdenes");
    setStoreViewMode("orders");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateToSystem = (mode: SystemViewType = "billing") => {
    setActiveTab("Sistema");
    setSystemViewMode(mode);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleQuickAction = (actionLabel: string) => {
    switch (actionLabel) {
      case "Nuevo Medio":
        navigateToMedia("create");
        break;
      case "Ver Medios":
        navigateToMedia("list");
        break;
      case "Nueva Categoría":
        navigateToMedia("category_create");
        break;
      case "Ver Categorías":
        navigateToMedia("categories_list");
        break;
      case "Slider Inicio":
        navigateToMedia("slider_list");
        break;
      case "Nuevo Slide":
        navigateToMedia("slide_create");
        break;
      case "Bóveda de Medios":
        navigateToMedia("vault_list");
        break;
      case "Subir a Bóveda":
        navigateToMedia("vault_upload");
        break;
      case "Nuevo Producto":
        navigateToStore("create");
        break;
      case "Ver Productos":
        navigateToStore("list");
        break;
      case "Héroes Tienda":
        navigateToStore("hero_list");
        break;
      case "Cupones":
        navigateToStore("coupon_list");
        break;
      case "Ver Órdenes":
        navigateToOrders();
        break;
      case "Estado de Cuenta":
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
      case "Configurar Envíos":
        navigateToSystem("shipping");
        break;
      case "Activar Rifas":
        navigateToSystem("raffle");
        break;
      case "Audiencias":
        navigateToSystem("intelligence");
        break;
      case "Ver Rifas":
        setActiveTab("Rifas");
        setRaffleViewMode("list");
        break;
      case "Nueva Rifa":
        setActiveTab("Rifas");
        setRaffleViewMode("create");
        break;
      case "Participaciones":
        setActiveTab("Rifas");
        setRaffleViewMode("participations");
        break;
      case "Cupones de Rifas":
        setActiveTab("Rifas");
        setRaffleViewMode("coupon_list");
        window.scrollTo({ top: 0, behavior: "smooth" });
        break;
      case "Notificaciones":
        setActiveTab("Mi Perfil");
        setProfileViewMode("notifications");
        break;
      case "Datos Personales":
        setActiveTab("Mi Perfil");
        setProfileViewMode("details");
        break;
      case "Contacto Público":
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
      case "Añadir Logo":
        navigateToSystem("identity");
        break;
      case "Volver":
        if (isSystemMode && systemViewMode === "channels") {
          setChannelsViewMode("hub");
          setSelectedChannelId(null);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (isRafflesMode && raffleViewMode === "participation-detail") {
          setRaffleViewMode(raffleParticipationReturnMode);
          setSelectedRaffleParticipation(null);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (isRafflesMode && raffleViewMode === "tickets") {
          setRaffleViewMode("detail");
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (isRafflesMode && raffleViewMode === "detail") {
          setRaffleViewMode("list");
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (
          isOrdersTab ||
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
      confirmLabel: "Sí, Descartar",
      variant: "warning",
      onConfirm: () => {
        if (isCreatingStoreHero || isEditingStoreHero)
          setStoreViewMode("hero_list");
        else if (isCreatingCoupon || isEditingCoupon)
          setStoreViewMode("coupon_list");
        else if (isStoreMode) setStoreViewMode("list");
        else if (isCreatingRaffle || isEditingRaffle)
          setRaffleViewMode("list");
        else if (isCreatingRaffleCoupon || isEditingRaffleCoupon)
          setRaffleViewMode("coupon_list");
        else if (isCreatingSlide || isEditingSlide)
          setMediaViewMode("slider_list");
        else if (isUploadingToVault)
          setMediaViewMode("vault_list");
        else if (isMediaMode) setMediaViewMode("list");
        closeConfirm();
      },
    });
  };

  const handleViewOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    setStoreViewMode("order-detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        status === "PAID"
          ? "Error al actualizar estado"
          : "Error al cancelar",
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
      showToast(paymentStatus === "PAID" ? "Pago confirmado" : "Apartado cancelado");
    } catch (error: any) {
      showToast(error?.response?.data?.message || "No se pudo actualizar la participación", "error");
    }
  };

  const getActionAddon = () => {
    if (isFormMode) {
      return (
        <>
          <NexusSectionButton
            onClick={handleCancelAction}
            variant="secondary"
            className="text-text-muted hover:text-text-main"
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
              if (isUploadingToVault)
                mediaVaultRef.current?.handleSave();
              if (isCreatingRaffle || isEditingRaffle)
                (document.getElementById("raffle-form") as HTMLFormElement | null)?.requestSubmit();
              if (isCreatingRaffleCoupon || isEditingRaffleCoupon)
                (document.getElementById("raffle-coupon-form") as HTMLFormElement | null)?.requestSubmit();
            }}
            variant="brand"
            icon={isUploadingToVault ? Upload : Save}
            disabled={
              (isCreatingRaffle ||
                isEditingRaffle ||
                isCreatingRaffleCoupon ||
                isEditingRaffleCoupon ||
                isUploadingToVault) &&
              !isFormValid
            }
          >
            {isUploadingToVault ? "Subir Archivos" : "Guardar Cambios"}
          </NexusSectionButton>
        </>
      );
    }

    if ((isStoreMode || isOrdersTab) && storeViewMode === "order-detail" && selectedOrder) {
      return (
        <>
          {(selectedOrder.status === "pending" || selectedOrder.status === "paid") && (
            <NexusSectionButton
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Cancelar orden",
                  message:
                    "Esta acción cancelará la orden y liberará el inventario reservado cuando aplique.",
                  confirmLabel: "Cancelar Orden",
                  variant: "danger",
                  onConfirm: async () => {
                    await handleDetailOrderStatusChange(selectedOrder.id, "CANCELLED");
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
          {selectedOrder.status === "pending" && (
            <NexusSectionButton
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Confirmar pago",
                  message:
                    "Esta acción marcará la orden como pagada y puede activar cambios de estado y notificaciones.",
                  confirmLabel: "Confirmar Pago",
                  variant: "brand",
                  onConfirm: async () => {
                    await handleDetailOrderStatusChange(selectedOrder.id, "PAID");
                    closeConfirm();
                  },
                })
              }
              variant="brand"
              icon={CheckCircle2}
            >
              Confirmar Pago
            </NexusSectionButton>
          )}
          {selectedOrder.status === "cancelled" && (
            <NexusSectionButton
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  title: "Restaurar orden",
                  message:
                    "Se validará que los productos sigan disponibles y se generará un nuevo tiempo límite de apartado.",
                  confirmLabel: "Restaurar Orden",
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
              Restaurar Orden
            </NexusSectionButton>
          )}
        </>
      );
    }

    if (
      isRafflesMode &&
      raffleViewMode === "participation-detail" &&
      selectedRaffleParticipation?.status === "PENDING"
    ) {
      const isTransfer = selectedRaffleParticipation.paymentMethod !== "MERCADOPAGO";
      if (!isTransfer) return null;
      return (
        <>
          <NexusSectionButton
            variant="secondary"
            className="text-text-muted hover:text-text-main"
            onClick={() => setConfirmDialog({
              isOpen: true,
              title: "¿Cancelar apartado?",
              message: "Los boletos volverán a estar disponibles y se notificará al participante.",
              confirmLabel: "Sí, Cancelar",
              variant: "danger",
              onConfirm: async () => {
                await handleRaffleParticipationStatusChange("CANCELLED");
                closeConfirm();
              },
            })}
          >
            Cancelar
          </NexusSectionButton>
          <NexusSectionButton
            variant="brand"
            icon={CheckCircle2}
            onClick={() => setConfirmDialog({
              isOpen: true,
              title: "¿Confirmar pago?",
              message: `Se confirmará el pago de ${selectedRaffleParticipation.ticketCount} ${selectedRaffleParticipation.ticketCount === 1 ? "boleto" : "boletos"}.`,
              confirmLabel: "Confirmar Pago",
              variant: "brand",
              onConfirm: async () => {
                await handleRaffleParticipationStatusChange("PAID");
                closeConfirm();
              },
            })}
          >
            Confirmar Pago
          </NexusSectionButton>
        </>
      );
    }

    if (isMediaMode) {
      if (mediaViewMode === "list") {
        return (
          <NexusSectionButton
            onClick={() => setMediaViewMode("create")}
            variant="brand"
            icon={Plus}
          >
            Nuevo Medio
          </NexusSectionButton>
        );
      }
      if (mediaViewMode === "categories_list") {
        return (
          <NexusSectionButton
            onClick={() => setMediaViewMode("category_create")}
            variant="brand"
            icon={Plus}
          >
            Nueva Categoría
          </NexusSectionButton>
        );
      }
      if (mediaViewMode === "slider_list") {
        return (
          <NexusSectionButton
            onClick={() => setMediaViewMode("slide_create")}
            variant="brand"
            icon={Plus}
          >
            Nuevo Slide
          </NexusSectionButton>
        );
      }
      if (mediaViewMode === "vault_list") {
        return (
          <NexusSectionButton
            onClick={() => setMediaViewMode("vault_upload")}
            variant="brand"
            icon={Upload}
          >
            Subir Archivos
          </NexusSectionButton>
        );
      }
    }

    if (isStoreMode && storeViewMode === "list") {
      return (
        <NexusSectionButton
          onClick={() => setStoreViewMode("create")}
          variant="brand"
          icon={Plus}
        >
          Nuevo Producto
        </NexusSectionButton>
      );
    }

    if (isStoreMode && storeViewMode === "hero_list") {
      return (
        <NexusSectionButton
          onClick={() => setStoreViewMode("hero_create")}
          variant="brand"
          icon={Plus}
        >
          Nuevo Hero
        </NexusSectionButton>
      );
    }

    if (isStoreMode && storeViewMode === "coupon_list") {
      return (
        <NexusSectionButton
          onClick={() => setStoreViewMode("coupon_create")}
          variant="brand"
          icon={Plus}
        >
          Nuevo Cupón
        </NexusSectionButton>
      );
    }

    if (isRafflesMode && raffleViewMode === "list") {
      return (
        <NexusSectionButton
          onClick={() => setRaffleViewMode("create")}
          variant="brand"
          icon={Plus}
        >
          Nueva Rifa
        </NexusSectionButton>
      );
    }

    if (isRafflesMode && raffleViewMode === "coupon_list") {
      return (
        <NexusSectionButton
          onClick={() => setRaffleViewMode("coupon_create")}
          variant="brand"
          icon={Plus}
        >
          Nuevo Cupón
        </NexusSectionButton>
      );
    }

    if (isSystemMode) {
      if (systemViewMode === "config") {
        return (
          <NexusSectionButton
            onClick={() => platformSettingsRef.current?.handleSave()}
            variant="brand"
            icon={Save}
          >
            Guardar Configuración
          </NexusSectionButton>
        );
      }
      if (systemViewMode === "shipping") {
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
            Guardar Cambios
          </NexusSectionButton>
        );
      }
      if (systemViewMode === "identity") {
        if (identityStatus === "editing") {
          return (
            <>
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
                Guardar Identidad
              </NexusSectionButton>
            </>
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
            Guardar Ajustes
          </NexusSectionButton>
        );
      }
      if (systemViewMode === "storefront") {
        return (
          <NexusSectionButton
            onClick={() => storefrontStatusRef.current?.handleSave()}
            variant="brand"
            icon={Save}
          >
            Guardar Estado
          </NexusSectionButton>
        );
      }
      if (systemViewMode === "announcements") {
        if (announcementViewMode === "list") {
          return (
            <NexusSectionButton
              onClick={() => setAnnouncementViewMode("create")}
              variant="brand"
              icon={Plus}
            >
              Nuevo Aviso
            </NexusSectionButton>
          );
        }
        return (
          <>
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
              Guardar Aviso
            </NexusSectionButton>
          </>
        );
      }
      if (systemViewMode === "raffle") {
        return (
          <NexusSectionButton
            onClick={() => raffleSettingsRef.current?.handleSave()}
            variant="brand"
            icon={Save}
          >
            Guardar Módulo
          </NexusSectionButton>
        );
      }
      if (
        systemViewMode === "channels" &&
        (channelsViewMode === "create" || channelsViewMode === "edit")
      ) {
        return (
          <>
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
          </>
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

  const bottomNavTabs: Array<
    "Inicio" | "Medios" | "Tienda" | "Órdenes" | "Sistema" | "Rifas"
  > = [
    "Inicio",
    "Medios",
    "Tienda",
    "Órdenes",
    ...(showRaffleNavigation ? ["Rifas" as const] : []),
    "Sistema",
  ];

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <UploadQueueProvider showToast={showToast}>
      <div className="min-h-screen bg-bg-app font-sans pb-[var(--space-3xl)] text-stone-900 transition-colors duration-500 dark:text-stone-100 md:pb-[var(--space-lg)]">
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab as any}
          onLogout={handleLogout}
          raffleEnabled={showRaffleNavigation}
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
              marginBottom: isOrdersListViewActive ||
                isStoreProductListViewActive ||
                isRaffleParticipationsListViewActive ||
                isMediaPanelListViewActive ||
                isMediaVaultListViewActive
                ? "var(--space-md)"
                : "var(--space-lg)",
            }}
          >
            <PageHeader
              activeTab={activeTab}
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
              announcementViewMode={announcementViewMode}
              profileViewMode={profileViewMode}
              shippingSubView={shippingSubView}
              channelsViewMode={channelsViewMode}
              selectedOrderRecordType={selectedOrder?.recordType}
              actionAddon={getActionAddon()}
            />
          </div>

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

          {isRaffleParticipationsListViewActive && (
            <div style={{ marginBottom: "var(--space-lg)" }}>
              <NexusViewToolbar
                searchValue={raffleParticipationSearchQuery}
                onSearchChange={setRaffleParticipationSearchQuery}
                searchPlaceholder="Buscar rifa, participante, teléfono, estado o boleto..."
                filterActive={hasRaffleParticipationFilters}
                onFilterClick={() => setIsRaffleParticipationFiltersOpen(true)}
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
            <div className="z-40 w-full flex-shrink-0 lg:w-fit">
              <QuickActions
                context={isOrdersTab ? "Tienda" : activeTab}
                onAction={handleQuickAction}
                isDetail={
                  storeViewMode === "order-detail" ||
                  (isRafflesMode && raffleViewMode === "participation-detail") ||
                  (isRafflesMode && raffleViewMode === "detail") ||
                  (isRafflesMode && raffleViewMode === "tickets") ||
                  (isSystemMode &&
                    systemViewMode === "channels" &&
                    channelsViewMode === "principal")
                }
                raffleEnabled={showRaffleNavigation}
                userRole={userRole}
              />
            </div>

            <div className="flex-1">
              {isProfileMode ? (
                <ProfileView
                  viewMode={profileViewMode}
                  showToast={showToast}
                  onIdentityChange={(nextProfile: OwnProfile) => {
                    setUserName(nextProfile.name.split(" ")[0]);
                    const currentSession = localStorage.getItem("admin_session");
                    if (currentSession) {
                      const parsed = JSON.parse(currentSession);
                      parsed.name = nextProfile.name;
                      localStorage.setItem("admin_session", JSON.stringify(parsed));
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
              ) : isStoreMode || isOrdersTab ? (
                (storeViewMode === "orders" || isOrdersTab) &&
                storeViewMode !== "order-detail" ? (
                  <OrdersView
                    orders={orders}
                    isLoading={isLoadingDashboard}
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
                    onBack={() =>
                      isOrdersTab
                        ? setActiveTab("Órdenes")
                        : setStoreViewMode("orders")
                    }
                    showToast={showToast}
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
                  />
                )
              ) : isRafflesMode ? (
                raffleViewMode === "participations" ? (
                  <RaffleParticipationsView
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
                        current?.id === participation.id ? participation : current,
                      );
                    }}
                    showToast={showToast}
                    setConfirmDialog={setConfirmDialog}
                  />
                ) : raffleViewMode === "participation-detail" && selectedRaffleParticipation ? (
                  <RaffleParticipationDetailView
                    participation={selectedRaffleParticipation}
                    onLoaded={setSelectedRaffleParticipation}
                    showToast={showToast}
                  />
                ) : (
                  <RaffleView
                    searchQuery={raffleSearchQuery}
                    advancedFilters={raffleAdvancedFilters}
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
                  />
                )
              ) : isSystemMode ? (
                <div
                  className="animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-visible"
                  style={{ paddingBottom: "var(--space-xl)" }}
                >
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
                    <UsersView
                      ref={usersRef}
                      showToast={showToast}
                      setConfirmDialog={setConfirmDialog}
                    />
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
                        onEditPrincipal={() => setChannelsViewMode("principal")}
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
                        onClose={() => setChannelsViewMode("hub")}
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
                      onStatusChange={(enabled) => {
                        localStorage.setItem("admin_raffle_enabled", enabled ? "1" : "0");
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
                        <NexusAutonomousIcon icon={Settings} variant="muted" />
                      <h3 className="text-h3 text-text-main">
                        Módulo en Desarrollo
                      </h3>
                      <p className="text-secondary text-text-muted">
                        Esta sección del sistema estará disponible próximamente.
                      </p>
                      </div>
                    </NexusAutonomousCard>
                  )}
                </div>
              ) : (
                <DashboardView
                  isLoading={isLoadingDashboard}
                  stats={dashboardStats}
                  orders={orders}
                  billingServices={billingServices}
                  billingCharges={billingCharges}
                  billingPayments={billingPayments}
                  onNavigateToSystem={navigateToSystem}
                  onNavigateToMedia={navigateToMedia}
                  onTabChange={setActiveTab as any}
                />
              )}
            </div>
          </div>
        </main>

        <BottomNav
          activeTab={activeTab as any}
          onTabChange={setActiveTab as any}
          tabs={bottomNavTabs}
          newOrdersCount={pendingOrderIds.size}
        />
        <StoreProductFiltersModal
          isOpen={isStoreProductFiltersOpen}
          value={storeProductAdvancedFilters}
          onClose={() => setIsStoreProductFiltersOpen(false)}
          onApply={(filters) => {
            setStoreProductAdvancedFilters(filters);
            setIsStoreProductFiltersOpen(false);
          }}
          onClear={() => {
            setStoreProductAdvancedFilters(DEFAULT_STORE_PRODUCT_ADVANCED_FILTERS);
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
        <RaffleParticipationFiltersModal
          isOpen={isRaffleParticipationFiltersOpen}
          value={raffleParticipationFilters}
          onClose={() => setIsRaffleParticipationFiltersOpen(false)}
          onApply={(filters) => {
            setRaffleParticipationFilters(filters);
            setIsRaffleParticipationFiltersOpen(false);
          }}
          onClear={() => {
            setRaffleParticipationFilters(DEFAULT_RAFFLE_PARTICIPATION_FILTERS);
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
