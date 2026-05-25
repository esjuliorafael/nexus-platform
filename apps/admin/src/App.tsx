import React, { useState, useCallback, useEffect, createContext } from 'react';
import ReactDOM, { flushSync } from 'react-dom';
import { Calendar, Search, X, Check, AlertTriangle, CheckCircle2, Settings, Save, UserPlus, Upload, RefreshCw, Plus, Package, ArrowRight } from 'lucide-react';
import { Header } from './components/Header';
import { QuickActions } from './components/QuickActions';
import { PageHeader } from './components/Layout/PageHeader';
import { DashboardView } from './components/Dashboard/DashboardView';

import { BottomNav } from './components/BottomNav';
import { GalleryView } from './components/Gallery/GalleryView';
import { StoreView } from './components/Store/StoreView';
import { OrdersView } from './components/Store/Orders/OrdersView';
import { OrderDetailView } from './components/Store/Orders/OrderDetailView';
import { PlatformSettingsView } from './components/System/Config/PlatformSettingsView';
import { ShippingView } from './components/System/Shipping/ShippingView';
import { UsersView, UsersViewRef } from './components/System/Users/UsersView';
import { IdentityView, IdentityViewRef } from './components/System/Identity/IdentityView';
import { ChannelForm } from './components/System/Channels/ChannelForm';
import { ChannelEditor } from './components/System/Channels/ChannelEditor';
import { ChannelsHub } from './components/System/Channels/ChannelsHub';
import { InventorySettingsView, InventorySettingsViewRef } from './components/System/Inventory/InventorySettingsView';
import { NotificationSettingsView, NotificationSettingsViewRef } from './components/System/Notifications/NotificationSettingsView';
import { BillingView, BillingViewRef } from './components/System/Billing/BillingView';
import { RaffleView } from './components/Raffle/RaffleView';
import { RaffleSettingsView } from './components/System/Raffle/RaffleSettingsView';
import { LoginView } from './components/Auth/LoginView'; 
import { Order, DashboardStats, AnnualService, ExtraCharge, BillingPayment } from './types';
import { apiOrders, apiDashboard, apiBilling, apiSystem, api } from './api';
import { NexusSectionButton } from './components/ui/NexusButton';

export const ThemeContext = createContext<{ theme: 'light' | 'dark'; toggleTheme: () => void }>({
  theme: 'light',
  toggleTheme: () => {},
});

type SystemViewType = 'shipping' | 'config' | 'users' | 'identity' | 'channels' | 'inventory' | 'notifications' | 'billing' | 'raffle';

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-24 md:bottom-10 right-4 left-4 md:left-auto md:right-10 z-[100] animate-in slide-in-from-right-10 fade-in duration-300">
      <div className={`flex items-center gap-3 px-6 py-4 rounded-3xl shadow-2xl border ${type === 'success' ? 'bg-white border-green-100' : 'bg-white border-rose-100'}`}>
        <div className={`p-2 rounded-full ${type === 'success' ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>
          <CheckCircle2 size={20} />
        </div>
        <p className="text-sm font-bold text-stone-700">{message}</p>
        <button onClick={onClose} className="ml-auto text-stone-300 hover:text-stone-500 transition-colors">
          <X size={18} />
        </button>
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
  variant = 'danger' 
}: { 
  isOpen: boolean, 
  title: string, 
  message: string, 
  confirmLabel: string, 
  onConfirm: () => void, 
  onCancel: () => void,
  variant?: 'danger' | 'warning'
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" onClick={onCancel} />
      <div className="relative w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 sm:p-10 text-center">
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ${variant === 'danger' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'}`}>
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-2xl font-black text-stone-800 tracking-tight mb-3">{title}</h3>
          <p className="text-stone-500 text-sm font-medium leading-relaxed">{message}</p>
          
          <div className="grid grid-cols-2 gap-4 mt-10">
            <NexusSectionButton onClick={onCancel} variant="secondary">
              Cancelar
            </NexusSectionButton>
            <NexusSectionButton onClick={onConfirm} variant={variant === 'danger' ? 'danger' : 'brand'}>
              {confirmLabel}
            </NexusSectionButton>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  const [token, setToken] = useState<string | null>(() => {
    try {
      const session = localStorage.getItem('admin_session');
      if (!session) return null;
      const parsed = JSON.parse(session);
      return parsed.token || null;
    } catch { return null; }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const authString = localStorage.getItem('admin_session');
    if (!authString) return false;
    try {
      const authData = JSON.parse(authString);
      const now = new Date().getTime();
      if (now > authData.expiresAt) {
        localStorage.removeItem('admin_session');
        return false;
      }
      return !!authData.token;
    } catch (error) {
      return false; 
    }
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    
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
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const [userName, setUserName] = useState<string>(() => {
    const authString = localStorage.getItem('admin_session');
    if (!authString) return 'Usuario';
    try {
      const authData = JSON.parse(authString);
      return authData.name ? authData.name.split(' ')[0] : 'Usuario';
    } catch (error) {
      return 'Usuario';
    }
  });

  const [userRole, setUserRole] = useState<string>(() => {
    const authString = localStorage.getItem('admin_session');
    if (!authString) return 'staff';
    try {
      return (JSON.parse(authString).role || 'staff').toLowerCase();
    } catch {
      return 'staff';
    }
  });

  const storeRef = React.useRef<StoreViewRef>(null);
  const galleryRef = React.useRef<GalleryViewRef>(null);

  const [activeTab, setActiveTab] = useState<'Inicio' | 'Galería' | 'Tienda' | 'Órdenes' | 'Sistema' | 'Rifas'>('Inicio');
  const [galleryViewMode, setGalleryViewMode] = useState<'list' | 'create' | 'media_edit' | 'category_create' | 'categories_list' | 'category_edit'>('list');
  const [storeViewMode, setStoreViewMode] = useState<'list' | 'create' | 'edit' | 'orders' | 'order-detail'>('list');
  const [raffleViewMode, setRaffleViewMode] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [systemViewMode, setSystemViewMode] = useState<SystemViewType>(() => {
    const saved = localStorage.getItem('last_system_view');
    const validModes: SystemViewType[] = ['shipping', 'config', 'users', 'identity', 'channels', 'inventory', 'notifications', 'billing', 'raffle'];
    if (saved && validModes.includes(saved as SystemViewType)) return saved as SystemViewType;
    return 'billing'; 
  });

  useEffect(() => {
    localStorage.setItem('last_system_view', systemViewMode);
  }, [systemViewMode]);
  
  const [shippingSubView, setShippingSubView] = useState<'config' | 'zones'>('config');
  const [channelsViewMode, setChannelsViewMode] = useState<'hub' | 'create' | 'edit'>('hub');
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [identityStatus, setIdentityStatus] = useState<'empty' | 'preview' | 'editing'>('preview');
  const [hasTempLogo, setHasTempLogo] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [raffleEnabled, setRaffleEnabled] = useState(false);
  
  const shippingRef = React.useRef<{ handleSaveConfig: () => void; handleSaveZones: () => void }>(null);
  const usersRef = React.useRef<UsersViewRef>(null);
  const identityRef = React.useRef<IdentityViewRef>(null);
  const channelFormRef = React.useRef<{ handleSave: () => void }>(null);
  const inventoryRef = React.useRef<InventorySettingsViewRef>(null);
  const notificationsRef = React.useRef<NotificationSettingsViewRef>(null);
  const billingRef = React.useRef<BillingViewRef>(null);
  const raffleSettingsRef = React.useRef<{ handleSave: () => void }>(null);
  const platformSettingsRef = React.useRef<{ handleSave: () => void }>(null);
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [billingServices, setBillingServices] = useState<AnnualService[]>([]);
  const [billingCharges, setBillingCharges] = useState<ExtraCharge[]>([]);
  const [billingPayments, setBillingPayments] = useState<BillingPayment[]>([]);
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ 
    isOpen: boolean, 
    title: string, 
    message: string, 
    confirmLabel: string, 
    onConfirm: () => void,
    onCancel?: () => void,
    variant?: 'danger' | 'warning'
  }>({ isOpen: false, title: '', message: '', confirmLabel: '', onConfirm: () => {} });

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (!token) return;
    const fetchInitialData = async () => {
      setIsLoadingDashboard(true);
      try {
        const [ordersData, statsData, billingData, configData] = await Promise.all([
          apiOrders.getAll(),
          apiDashboard.getStats(),
          apiBilling.getAll(),
          apiSystem.getConfig()
        ]);
        
        flushSync(() => {
          setOrders(ordersData);
          setDashboardStats(statsData);
          setBillingServices(billingData.services);
          setBillingCharges(billingData.charges);
          setBillingPayments(billingData.payments);
          setRaffleEnabled(configData['raffle_enabled'] === '1');
        });
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
  }, [token, showToast]);

  const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, isOpen: false }));

  const handleLoginSuccess = (userData: any, jwtToken: string) => {
    const authData = {
      loggedIn: true,
      token: jwtToken,
      name: userData.name,
      role: userData.role || 'staff',
      expiresAt: new Date().getTime() + (12 * 60 * 60 * 1000) 
    };
    localStorage.setItem('admin_session', JSON.stringify(authData));
    setUserName(userData.name.split(' ')[0]);
    setUserRole(userData.role || 'staff');
    setToken(jwtToken);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    setToken(null);
    setIsAuthenticated(false);
  };

  const currentDate = new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

  const isGalleryMode = activeTab === 'Galería';
  const isStoreMode = activeTab === 'Tienda';
  const isOrdersTab = activeTab === 'Órdenes';
  const isSystemMode = activeTab === 'Sistema';
  const isRafflesMode = activeTab === 'Rifas';
  
  const isCreatingMedia = isGalleryMode && galleryViewMode === 'create';
  const isEditingMedia = isGalleryMode && galleryViewMode === 'media_edit';
  const isCategoryForm = isGalleryMode && (galleryViewMode === 'category_create' || galleryViewMode === 'category_edit');
  const isCreatingProduct = isStoreMode && storeViewMode === 'create';
  const isEditingProduct = isStoreMode && storeViewMode === 'edit';
  const isCreatingRaffle = isRafflesMode && raffleViewMode === 'create';
  const isEditingRaffle = isRafflesMode && raffleViewMode === 'edit';

  const isFormMode = isCreatingMedia || isEditingMedia || isCategoryForm || isCreatingProduct || isEditingProduct || isCreatingRaffle || isEditingRaffle;

  const navigateToGallery = (mode: any = 'list') => {
    setActiveTab('Galería');
    setGalleryViewMode(mode);
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToStore = (mode: any = 'list') => {
    setActiveTab('Tienda');
    setStoreViewMode(mode);
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToOrders = () => {
    setActiveTab('Órdenes');
    setStoreViewMode('orders');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToSystem = (mode: SystemViewType = 'billing') => {
    setActiveTab('Sistema');
    setSystemViewMode(mode);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickAction = (actionLabel: string) => {
    switch (actionLabel) {
      case 'Nuevo Medio': navigateToGallery('create'); break;
      case 'Ver Medios': navigateToGallery('list'); break;
      case 'Nueva Categoría': navigateToGallery('category_create'); break;
      case 'Ver Categorías': navigateToGallery('categories_list'); break;
      case 'Nuevo Producto': navigateToStore('create'); break;
      case 'Ver Productos': navigateToStore('list'); break;
      case 'Ver Órdenes': navigateToOrders(); break;
      case 'Estado de Cuenta': navigateToSystem('billing'); break;
      case 'Plataforma': navigateToSystem('config'); break;
      case 'Usuarios': navigateToSystem('users'); break;
      case 'Departamentos': navigateToSystem('channels'); break;
      case 'Configurar Envíos': navigateToSystem('shipping'); break;
      case 'Activar Rifas': navigateToSystem('raffle'); break;
      case 'Notificaciones': navigateToSystem('notifications'); break;
      case 'Lib. Inventario': navigateToSystem('inventory'); break;
      case 'Añadir Logo': navigateToSystem('identity'); break;
      case 'Volver': 
        if (isOrdersTab || storeViewMode === 'orders' || storeViewMode === 'order-detail') {
          navigateToOrders();
        } else if (isStoreMode) {
          navigateToStore('list');
        } else if (isGalleryMode) {
          navigateToGallery('list');
        }
        break;
    }
  };

  const handleCancelAction = () => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Descartar cambios?',
      message: 'Si cancelas ahora, perderás toda la información ingresada.',
      confirmLabel: 'Sí, Descartar',
      variant: 'warning',
      onConfirm: () => {
        if (isStoreMode) setStoreViewMode('list');
        else if (isGalleryMode) setGalleryViewMode('list');
        closeConfirm();
      }
    });
  };

  const handleViewOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    setStoreViewMode('order-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
              if (isCreatingProduct || isEditingProduct) storeRef.current?.handleSave();
              if (isCreatingMedia || isEditingMedia || isCategoryForm) galleryRef.current?.handleSave();
            }} 
            variant="brand"
            icon={Save}
          >
            Guardar Cambios
          </NexusSectionButton>
        </>
      );
    }

    if (isSystemMode) {
      if (systemViewMode === 'config') {
        return (
          <NexusSectionButton onClick={() => platformSettingsRef.current?.handleSave()} variant="brand" icon={Save}>
            Guardar Configuración
          </NexusSectionButton>
        );
      }
      if (systemViewMode === 'shipping') {
        return (
          <NexusSectionButton 
            onClick={() => shippingSubView === 'config' ? shippingRef.current?.handleSaveConfig() : shippingRef.current?.handleSaveZones()} 
            variant="brand" 
            icon={Save}
          >
            Guardar Cambios
          </NexusSectionButton>
        );
      }
      if (systemViewMode === 'identity') {
        return (
          <NexusSectionButton onClick={() => identityRef.current?.handleSave()} variant="brand" icon={Save}>
            Guardar Identidad
          </NexusSectionButton>
        );
      }
      if (systemViewMode === 'inventory') {
        return (
          <NexusSectionButton onClick={() => inventoryRef.current?.handleSave()} variant="brand" icon={Save}>
            Guardar Ajustes
          </NexusSectionButton>
        );
      }
      if (systemViewMode === 'notifications') {
        return (
          <NexusSectionButton onClick={() => notificationsRef.current?.handleSave()} variant="brand" icon={Save}>
            Guardar Notificaciones
          </NexusSectionButton>
        );
      }
      if (systemViewMode === 'raffle') {
        return (
          <NexusSectionButton onClick={() => raffleSettingsRef.current?.handleSave()} variant="brand" icon={Save}>
            Guardar Módulo
          </NexusSectionButton>
        );
      }
      if (systemViewMode === 'channels' && channelsViewMode !== 'hub') {
        return (
          <>
            <NexusSectionButton onClick={() => setChannelsViewMode('hub')} variant="secondary">
              Cancelar
            </NexusSectionButton>
            <NexusSectionButton onClick={() => channelFormRef.current?.handleSave()} variant="brand" icon={Save}>
              {channelsViewMode === 'create' ? 'Crear Canal' : 'Actualizar Canal'}
            </NexusSectionButton>
          </>
        );
      }
    }

    return null;
  };

  if (!isAuthenticated) return <LoginView onLoginSuccess={handleLoginSuccess} showToast={showToast} />;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className="min-h-screen bg-bg-app font-sans pb-32 md:pb-10 text-stone-900 dark:text-stone-100 transition-colors duration-500">
        <Header activeTab={activeTab} setActiveTab={setActiveTab as any} onLogout={handleLogout} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <PageHeader 
              activeTab={activeTab}
              userName={userName}
              galleryViewMode={galleryViewMode}
              isCreatingMedia={isCreatingMedia}
              isEditingMedia={isEditingMedia}
              storeViewMode={storeViewMode}
              isCreatingProduct={isCreatingProduct}
              isEditingProduct={isEditingProduct}
              raffleViewMode={raffleViewMode}
              isCreatingRaffle={isCreatingRaffle}
              isEditingRaffle={isEditingRaffle}
              systemViewMode={systemViewMode}
              shippingSubView={shippingSubView}
              channelsViewMode={channelsViewMode}
              actionAddon={getActionAddon()}
            />
            <div className="bg-white dark:bg-stone-900 px-5 py-3.5 rounded-full shadow-sm border border-stone-200 dark:border-stone-800 flex items-center gap-2 text-stone-600 dark:text-stone-400 font-medium text-sm capitalize">
              <Calendar size={16} className="text-brand-500" /> {currentDate}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-20 flex-shrink-0 z-40">
              <QuickActions 
                context={isOrdersTab ? 'Tienda' : activeTab} 
                onAction={handleQuickAction} 
                isDetail={storeViewMode === 'order-detail'}
                raffleEnabled={raffleEnabled}
                userRole={userRole}
              />
            </div>

            <div className="flex-1">
              {isGalleryMode ? (
                <GalleryView ref={galleryRef} searchQuery={searchQuery} viewMode={galleryViewMode} onSetViewMode={setGalleryViewMode} showToast={showToast} setConfirmDialog={setConfirmDialog} onValidationChange={setIsFormValid} />
              ) : (isStoreMode || isOrdersTab) ? (
                (storeViewMode === 'orders' || isOrdersTab) && storeViewMode !== 'order-detail' ? (
                  <OrdersView 
                    onViewDetail={handleViewOrderDetail} 
                    showToast={showToast} 
                    setConfirmDialog={setConfirmDialog} 
                  />
                ) : storeViewMode === 'order-detail' && selectedOrder ? (
                  <OrderDetailView 
                    order={selectedOrder} 
                    onBack={() => isOrdersTab ? setActiveTab('Órdenes') : setStoreViewMode('orders')} 
                    showToast={showToast} 
                    setConfirmDialog={setConfirmDialog} 
                  />
                ) : (
                  <StoreView ref={storeRef} searchQuery={searchQuery} viewMode={storeViewMode} onSetViewMode={setStoreViewMode} showToast={showToast} setConfirmDialog={setConfirmDialog} onValidationChange={setIsFormValid} />
                )
              ) : isSystemMode ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-visible pb-10">
                  {systemViewMode === 'shipping' ? (
                    <ShippingView 
                      ref={shippingRef}
                      subView={shippingSubView}
                      setSubView={setShippingSubView}
                      showToast={showToast} 
                    />
                  ) : systemViewMode === 'config' ? (
                    <PlatformSettingsView 
                      ref={platformSettingsRef}
                      showToast={showToast}
                    />
                  ) : systemViewMode === 'users' ? (
                    <UsersView 
                      ref={usersRef} 
                      showToast={showToast}
                      setConfirmDialog={setConfirmDialog}
                    />
                  ) : systemViewMode === 'identity' ? (
                    <IdentityView 
                      ref={identityRef} 
                      status={identityStatus} 
                      setStatus={setIdentityStatus} 
                      onTempLogoChange={setHasTempLogo} 
                      showToast={showToast} 
                    />
                  ) : systemViewMode === 'channels' ? (
                    channelsViewMode === 'hub' ? (
                      <ChannelsHub 
                        onCreateChannel={() => {
                          setSelectedChannelId(null);
                          setChannelsViewMode('create');
                        }}
                        onEditChannel={(id) => {
                          setSelectedChannelId(id);
                          setChannelsViewMode('edit');
                        }}
                        showToast={showToast}
                        setConfirmDialog={setConfirmDialog}
                      />
                    ) : channelsViewMode === 'create' ? (
                      <ChannelForm 
                        ref={channelFormRef}
                        onCancel={() => setChannelsViewMode('hub')}
                        onSave={() => setChannelsViewMode('hub')}
                        onValidationChange={setIsFormValid}
                        showToast={showToast}
                        setConfirmDialog={setConfirmDialog}
                      />
                    ) : (
                      <ChannelEditor 
                        id={selectedChannelId!}
                        onClose={() => setChannelsViewMode('hub')}
                        onSave={() => setChannelsViewMode('hub')}
                        showToast={showToast}
                        setConfirmDialog={setConfirmDialog}
                      />
                    )
                  ) : systemViewMode === 'inventory' ? (
                    <InventorySettingsView 
                      ref={inventoryRef} 
                      showToast={showToast} 
                    />
                  ) : systemViewMode === 'notifications' ? (
                    <NotificationSettingsView 
                      ref={notificationsRef} 
                      showToast={showToast} 
                    />
                  ) : systemViewMode === 'billing' ? (
                    <BillingView 
                      ref={billingRef} 
                      showToast={showToast}
                      setConfirmDialog={setConfirmDialog}
                    />
                  ) : systemViewMode === 'raffle' ? (
                    <RaffleSettingsView
                      ref={raffleSettingsRef}
                      showToast={showToast}
                      onStatusChange={(enabled) => setRaffleEnabled(enabled)}
                    />
                  ) : (
                    <div className="bg-bg-card p-12 rounded-[3rem] shadow-sm dark:shadow-none border border-border-main text-center">
                      <Settings size={48} className="mx-auto text-stone-300 mb-4" />
                      <h3 className="text-xl font-bold text-text-main">Módulo en Desarrollo</h3>
                      <p className="text-text-muted mt-2">Esta sección del sistema estará disponible próximamente.</p>
                    </div>
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
                  onNavigateToGallery={navigateToGallery}
                  onTabChange={setActiveTab as any}
                />
              )}
            </div>
          </div>
        </main>

        <BottomNav activeTab={activeTab as any} onTabChange={setActiveTab as any} tabs={['Inicio', 'Galería', 'Tienda', 'Órdenes', 'Sistema']} />
        <ConfirmModal {...confirmDialog} onCancel={closeConfirm} />
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </div>
    </ThemeContext.Provider>
  );
}

export default App;
