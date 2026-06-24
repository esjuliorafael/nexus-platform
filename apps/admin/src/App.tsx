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
  HomeSliderView,
  HomeSliderViewMode,
  HomeSliderViewRef,
} from "./components/Media/Slider/HomeSliderView";
import { StoreView, StoreViewRef } from "./components/Store/StoreView";
import { OrdersView } from "./components/Store/Orders/OrdersView";
import { OrderDetailView } from "./components/Store/Orders/OrderDetailView";
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
import { RaffleSettingsView } from "./components/System/Raffle/RaffleSettingsView";
import { RaffleIntelligenceView } from "./components/System/Intelligence/RaffleIntelligenceView";
import { LoginView } from "./components/Auth/LoginView";
import { SetupAccountView } from "./components/Auth/SetupAccountView";
import {
  Order,
  DashboardStats,
  AnnualService,
  ExtraCharge,
  BillingPayment,
} from "./types";
import { apiOrders, apiDashboard, apiBilling, apiSystem, api } from "./api";
import {
  NexusAutonomousButton,
  NexusSectionButton,
} from "./components/ui/NexusButton";
import { NexusAutonomousCard } from "./components/ui/NexusCard";
import { NexusAutonomousIcon } from "./components/ui/NexusIcon";
import { NexusConfirmModal } from "./components/ui/NexusConfirmModal";
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
  | HomeSliderViewMode;

type StoreModeType = "list" | "create" | "edit" | "orders" | "order-detail";

type RaffleModeType = "list" | "create" | "edit" | "detail";

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
];

const STORE_MODES: StoreModeType[] = [
  "list",
  "create",
  "edit",
  "orders",
  "order-detail",
];

const RAFFLE_MODES: RaffleModeType[] = ["list", "create", "edit", "detail"];

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
  variant?: "danger" | "warning";
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

  const [activeTab, setActiveTab] = useState<ActiveTabType>(getStoredActiveTab);
  const [mediaViewMode, setMediaViewMode] =
    useState<MediaModeType>(getStoredMediaMode);
  const [storeViewMode, setStoreViewMode] = useState<StoreModeType>(() => {
    const saved = getStoredEnum("admin_store_view_mode", STORE_MODES, "list");
    return saved === "order-detail" ? "orders" : saved;
  });
  const [raffleViewMode, setRaffleViewMode] = useState<RaffleModeType>(() =>
    getStoredEnum("admin_raffle_view_mode", RAFFLE_MODES, "list"),
  );
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
  >("hub");
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    null,
  );
  const [identityStatus, setIdentityStatus] = useState<
    "empty" | "preview" | "editing"
  >("preview");
  const [hasTempLogo, setHasTempLogo] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [raffleEnabled, setRaffleEnabled] = useState(false);

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

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
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
    variant?: "danger" | "warning";
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
          setRaffleEnabled(configData["raffle_enabled"] === "1");
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
  const isSystemMode = activeTab === "Sistema";
  const isProfileMode = activeTab === "Mi Perfil";
  const isRafflesMode = activeTab === "Rifas";

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
  const isCreatingProduct = isStoreMode && storeViewMode === "create";
  const isEditingProduct = isStoreMode && storeViewMode === "edit";
  const isCreatingRaffle = isRafflesMode && raffleViewMode === "create";
  const isEditingRaffle = isRafflesMode && raffleViewMode === "edit";

  const isFormMode =
    isCreatingMedia ||
    isEditingMedia ||
    isCreatingSlide ||
    isEditingSlide ||
    isCreatingProduct ||
    isEditingProduct ||
    isCreatingRaffle ||
    isEditingRaffle;

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
      case "Nuevo Producto":
        navigateToStore("create");
        break;
      case "Ver Productos":
        navigateToStore("list");
        break;
      case "Ver Órdenes":
        navigateToOrders();
        break;
      case "Estado de Cuenta":
        navigateToSystem("billing");
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
        if (
          isOrdersTab ||
          storeViewMode === "orders" ||
          storeViewMode === "order-detail"
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
        if (isStoreMode) setStoreViewMode("list");
        else if (isCreatingSlide || isEditingSlide)
          setMediaViewMode("slider_list");
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

  const getActionAddon = () => {
    if (isFormMode) {
      return (
        <>
          <NexusSectionButton onClick={handleCancelAction} variant="secondary">
            Cancelar
          </NexusSectionButton>
          <NexusSectionButton
            onClick={() => {
              if (isCreatingProduct || isEditingProduct)
                storeRef.current?.handleSave();
              if (isCreatingMedia || isEditingMedia)
                galleryRef.current?.handleSave();
              if (isCreatingSlide || isEditingSlide)
                homeSliderRef.current?.handleSave();
            }}
            variant="brand"
            icon={Save}
          >
            Guardar Cambios
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
            >
              Cancelar
            </NexusSectionButton>
            <NexusSectionButton
              onClick={() => channelFormRef.current?.handleSave()}
              variant="brand"
              icon={Save}
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
    ...(raffleEnabled ? ["Rifas" as const] : []),
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
          raffleEnabled={raffleEnabled}
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
            style={{ gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}
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
              raffleViewMode={raffleViewMode}
              isCreatingRaffle={isCreatingRaffle}
              isEditingRaffle={isEditingRaffle}
              systemViewMode={systemViewMode}
              profileViewMode={profileViewMode}
              shippingSubView={shippingSubView}
              channelsViewMode={channelsViewMode}
              actionAddon={getActionAddon()}
            />
          </div>

          <div
            className="flex flex-col lg:flex-row"
            style={{ gap: "var(--space-lg)" }}
          >
            <div className="z-40 w-full flex-shrink-0 lg:w-fit">
              <QuickActions
                context={isOrdersTab ? "Tienda" : activeTab}
                onAction={handleQuickAction}
                isDetail={storeViewMode === "order-detail"}
                raffleEnabled={raffleEnabled}
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
                    setConfirmDialog={setConfirmDialog}
                    onValidationChange={setIsFormValid}
                  />
                ) : (
                  <GalleryView
                    ref={galleryRef}
                    searchQuery={searchQuery}
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
                    setConfirmDialog={setConfirmDialog}
                  />
                ) : (
                  <StoreView
                    ref={storeRef}
                    searchQuery={searchQuery}
                    viewMode={storeViewMode}
                    onSetViewMode={setStoreViewMode}
                    showToast={showToast}
                    setConfirmDialog={setConfirmDialog}
                    onValidationChange={setIsFormValid}
                  />
                )
              ) : isRafflesMode ? (
                <RaffleView
                  viewMode={raffleViewMode}
                  onSetViewMode={setRaffleViewMode}
                  showToast={showToast}
                  setConfirmDialog={setConfirmDialog}
                />
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
                        onBack={() => setChannelsViewMode("hub")}
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
                  ) : systemViewMode === "raffle" ? (
                    <RaffleSettingsView
                      ref={raffleSettingsRef}
                      showToast={showToast}
                      onStatusChange={(enabled) => setRaffleEnabled(enabled)}
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
