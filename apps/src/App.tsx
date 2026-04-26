import React, { useState, useCallback, useEffect } from 'react';
import { Calendar, Search, X, Check, AlertTriangle, CheckCircle2, Settings, Save, UserPlus, Upload, RefreshCw, Plus, Package } from 'lucide-react';
import { Header } from './components/Header';
import { QuickActions } from './components/QuickActions';
import { SalesChart } from './components/Widgets/SalesChart';
import { OrderWidgetCard, OrderWidgetCardSkeleton } from './components/Widgets/OrderWidgetCard';
import { OrderStatusChart } from './components/Widgets/OrderStatusChart';
import { LatestMedia } from './components/Widgets/LatestMedia';
import { LatestProducts } from './components/Widgets/LatestProducts';
import { CategoryWidget } from './components/Widgets/CategoryWidget';
import { GalleryWidget } from './components/Widgets/GalleryWidget';
import { ActiveProductsWidget } from './components/Widgets/ActiveProductsWidget';
import { PaidOrdersWidget } from './components/Widgets/PaidOrdersWidget';
import { PendingOrdersWidget } from './components/Widgets/PendingOrdersWidget';
import { BillingAlertWidget } from './components/Widgets/BillingAlertWidget';

import { BottomNav } from './components/BottomNav';
import { GalleryView } from './components/Gallery/GalleryView';
import { StoreView } from './components/Store/StoreView';
import { OrdersView } from './components/Orders/OrdersView';
import { OrderDetailView } from './components/Orders/OrderDetailView';
import { ShippingView } from './components/System/Shipping/ShippingView';
import { UsersView, UsersViewRef } from './components/System/Users/UsersView';
import { IdentityView, IdentityViewRef } from './components/System/Identity/IdentityView';
import { PaymentMethodView, PaymentMethodViewRef } from './components/System/Payment/PaymentMethodView';
import { WhatsAppView, WhatsAppViewRef } from './components/System/WhatsApp/WhatsAppView';
import { InventorySettingsView, InventorySettingsViewRef } from './components/System/Inventory/InventorySettingsView';
import { NotificationSettingsView, NotificationSettingsViewRef } from './components/System/Notifications/NotificationSettingsView';
import { BillingView, BillingViewRef } from './components/System/Billing/BillingView';
import { LoginView } from './components/Auth/LoginView'; 
import { Order, DashboardStats, AnnualService, ExtraCharge } from './types';
import { apiOrders, apiDashboard, apiBilling } from './api';

type SystemViewType = 'shipping' | 'config' | 'users' | 'identity' | 'payment' | 'whatsapp' | 'inventory' | 'notifications' | 'billing';

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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" onClick={onCancel} />
      <div className="relative w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 sm:p-10 text-center">
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ${variant === 'danger' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'}`}>
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-2xl font-black text-stone-800 tracking-tight mb-3">{title}</h3>
          <p className="text-stone-500 text-sm font-medium leading-relaxed">{message}</p>
          
          <div className="grid grid-cols-2 gap-4 mt-10">
            <button 
              onClick={onCancel}
              className="py-4 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button 
              onClick={onConfirm}
              className={`py-4 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg
                ${variant === 'danger' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20' : 'bg-brand-500 hover:bg-brand-600 shadow-brand-500/20'}
              `}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
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
      return true;
    } catch (error) {
      return false; 
    }
  });

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
      return JSON.parse(authString).role || 'staff';
    } catch {
      return 'staff';
    }
  });

  const [activeTab, setActiveTab] = useState<'Inicio' | 'Galería' | 'Tienda' | 'Órdenes' | 'Sistema'>('Inicio');
  
  const [galleryViewMode, setGalleryViewMode] = useState<'list' | 'create' | 'media_edit' | 'category_create' | 'categories_list' | 'category_edit'>('list');
  const [storeViewMode, setStoreViewMode] = useState<'list' | 'create' | 'edit'>('list');
  const [ordersViewMode, setOrdersViewMode] = useState<'list' | 'detail'>('list');
  
  const [systemViewMode, setSystemViewMode] = useState<SystemViewType>(() => {
    const saved = localStorage.getItem('last_system_view');
    const validModes: SystemViewType[] = ['shipping', 'config', 'users', 'identity', 'payment', 'whatsapp', 'inventory', 'notifications', 'billing'];
    if (saved && validModes.includes(saved as SystemViewType)) {
      return saved as SystemViewType;
    }
    return 'billing'; 
  });

  useEffect(() => {
    localStorage.setItem('last_system_view', systemViewMode);
  }, [systemViewMode]);
  
  const [shippingSubView, setShippingSubView] = useState<'config' | 'zones'>('config');
  const [paymentSubView, setPaymentSubView] = useState<'config' | 'channels'>('config'); 
  const [whatsappSubView, setWhatsappSubView] = useState<'config' | 'channels'>('config');
  const [identityStatus, setIdentityStatus] = useState<'empty' | 'preview' | 'editing'>('preview');
  const [hasTempLogo, setHasTempLogo] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  
  const shippingRef = React.useRef<{ handleSaveConfig: () => void; handleSaveZones: () => void }>(null);
  const usersRef = React.useRef<UsersViewRef>(null);
  const identityRef = React.useRef<IdentityViewRef>(null);
  const paymentRef = React.useRef<PaymentMethodViewRef>(null);
  const whatsappRef = React.useRef<WhatsAppViewRef>(null);
  const inventoryRef = React.useRef<InventorySettingsViewRef>(null);
  const notificationsRef = React.useRef<NotificationSettingsViewRef>(null);
  const billingRef = React.useRef<BillingViewRef>(null);
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [billingServices, setBillingServices] = useState<AnnualService[]>([]);
  const [billingCharges, setBillingCharges] = useState<ExtraCharge[]>([]);
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ 
    isOpen: boolean, 
    title: string, 
    message: string, 
    confirmLabel: string, 
    onConfirm: () => void,
    variant?: 'danger' | 'warning'
  }>({ isOpen: false, title: '', message: '', confirmLabel: '', onConfirm: () => {} });

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchInitialData = async () => {
      setIsLoadingDashboard(true);
      try {
        const [ordersData, statsData, billingData] = await Promise.all([
          apiOrders.getAll(),
          apiDashboard.getStats(),
          apiBilling.getAll()
        ]);
        setOrders(ordersData);
        setDashboardStats(statsData);
        setBillingServices(billingData.services);
        setBillingCharges(billingData.charges);
      } catch (error) {
        console.error("Error cargando datos iniciales:", error);
        showToast("Error al conectar con la base de datos", "error");
      } finally {
        setIsLoadingDashboard(false);
      }
    };
    fetchInitialData();
  }, [isAuthenticated]);

  useEffect(() => {
    if (confirmDialog.isOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [confirmDialog.isOpen]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, isOpen: false }));

  const handleLoginSuccess = (userData: any) => {
    const authData = {
      loggedIn: true,
      name: userData.name,
      role: userData.role || 'staff',
      expiresAt: new Date().getTime() + (12 * 60 * 60 * 1000) 
    };
    localStorage.setItem('admin_session', JSON.stringify(authData));
    setUserName(userData.name.split(' ')[0]);
    setUserRole(userData.role || 'staff');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    setIsAuthenticated(false);
  };

  const currentDate = new Date().toLocaleDateString('es-ES', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short' 
  });

  const isGalleryMode = activeTab === 'Galería';
  const isStoreMode = activeTab === 'Tienda';
  const isOrdersMode = activeTab === 'Órdenes';
  const isSystemMode = activeTab === 'Sistema';
  
  const isCreatingMedia = isGalleryMode && galleryViewMode === 'create';
  const isEditingMedia = isGalleryMode && galleryViewMode === 'media_edit';
  const isCategoryForm = isGalleryMode && (galleryViewMode === 'category_create' || galleryViewMode === 'category_edit');
  
  const isCreatingProduct = isStoreMode && storeViewMode === 'create';
  const isEditingProduct = isStoreMode && storeViewMode === 'edit';

  const isFormMode = isCreatingMedia || isEditingMedia || isCategoryForm || isCreatingProduct || isEditingProduct;

  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customerState.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleMarkAsPaid = (orderId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Marcar como Pagada?',
      message: `¿Confirmas que la orden ${orderId} ha sido pagada en su totalidad?`,
      confirmLabel: 'Sí, Confirmar',
      variant: 'warning',
      onConfirm: () => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'paid' } : o));
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(prev => prev ? { ...prev, status: 'paid' } : null);
        }
        showToast(`Orden ${orderId} marcada como pagada`);
        closeConfirm();
      }
    });
  };

  const handleCancelOrder = (orderId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Cancelar Orden?',
      message: `¿Estás seguro de que deseas cancelar la orden ${orderId}? Esta acción devolverá el stock al inventario.`,
      confirmLabel: 'Sí, Cancelar',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await apiOrders.cancel(orderId);
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
          if (selectedOrder?.id === orderId) {
            setSelectedOrder(prev => prev ? { ...prev, status: 'cancelled' } : null);
          }
          showToast(`Orden ${orderId} cancelada y stock restaurado`, 'success');
        } catch (error) {
          showToast("Error al cancelar la orden en el servidor", "error");
        }
        closeConfirm();
      }
    });
  };

  const handleViewOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    setOrdersViewMode('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToGallery = (mode: 'list' | 'create' | 'media_edit' | 'category_create' | 'categories_list' | 'category_edit' = 'list') => {
    setActiveTab('Galería');
    setGalleryViewMode(mode);
    setSearchQuery('');
    setIsFormValid(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToStore = (mode: 'list' | 'create' | 'edit' = 'list') => {
    setActiveTab('Tienda');
    setStoreViewMode(mode);
    setSearchQuery('');
    setIsFormValid(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToSystem = (mode: SystemViewType = 'billing') => {
    setActiveTab('Sistema');
    setSystemViewMode(mode);
    setShippingSubView('config');
    setPaymentSubView('config'); 
    setWhatsappSubView('config');
    setSearchQuery('');
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
      case 'Configurar Envíos': navigateToSystem('shipping'); break;
      case 'Config': navigateToSystem('config'); break;
      case 'Usuarios': navigateToSystem('users'); break;
      case 'Identidad': 
      case 'Añadir Logo': navigateToSystem('identity'); break;
      case 'Método de Pago': navigateToSystem('payment'); break;
      case 'WhatsApp': navigateToSystem('whatsapp'); break;
      case 'Lib. Inventario': navigateToSystem('inventory'); break;
      case 'Notificaciones': navigateToSystem('notifications'); break;
      case 'Estado de Cuenta': navigateToSystem('billing'); break;
      case 'Ver Órdenes': 
      case 'Volver':
        setActiveTab('Órdenes');
        setOrdersViewMode('list');
        setSearchQuery('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
    }
  };

  const handleCancelAction = () => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Descartar cambios?',
      message: 'Si cancelas ahora, perderás toda la información ingresada en este formulario.',
      confirmLabel: 'Sí, Descartar',
      variant: 'warning',
      onConfirm: () => {
        if (isStoreMode) {
          setStoreViewMode('list');
        } else if (galleryViewMode === 'category_edit') {
          setGalleryViewMode('categories_list');
        } else {
          setGalleryViewMode('list');
        }
        setSearchQuery('');
        setIsFormValid(false);
        closeConfirm();
      }
    });
  };

  if (!isAuthenticated) {
    return (
      <>
        <LoginView 
          onLoginSuccess={handleLoginSuccess} 
          showToast={showToast} 
        />
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] font-sans pb-32 md:pb-10 text-stone-900">
      <Header 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          if (tab !== activeTab) {
            setActiveTab(tab as any);
            setSearchQuery('');
            if (tab === 'Galería') setGalleryViewMode('list');
            if (tab === 'Tienda') setStoreViewMode('list');
            if (tab === 'Órdenes') setOrdersViewMode('list');
          }
        }} 
        onLogout={handleLogout} 
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div className="animate-in fade-in slide-in-from-left-2 duration-500">
            <h1 className="text-3xl sm:text-4xl font-bold text-stone-800 tracking-tight">
              {isCreatingMedia ? (
                <>Subir <span className="text-stone-600">Nuevo Medio</span></>
              ) : isEditingMedia ? (
                <>Editar <span className="text-stone-600">Medio</span></>
              ) : isCreatingProduct ? (
                <>Nuevo <span className="text-stone-600">Producto</span></>
              ) : isEditingProduct ? (
                <>Editar <span className="text-stone-600">Producto</span></>
              ) : galleryViewMode === 'category_create' ? (
                <>Nueva <span className="text-stone-600">Categoría</span></>
              ) : galleryViewMode === 'category_edit' ? (
                <>Editar <span className="text-stone-600">Categoría</span></>
              ) : galleryViewMode === 'categories_list' ? (
                <>Gestionar <span className="text-stone-600">Categorías</span></>
              ) : isGalleryMode ? (
                <>Panel de <span className="text-stone-600">Galería</span></>
              ) : isStoreMode ? (
                <>Gestión de <span className="text-stone-600">Tienda</span></>
              ) : isOrdersMode ? (
                ordersViewMode === 'detail' ? (
                  <>Detalle de <span className="text-stone-600">Orden</span></>
                ) : (
                  <>Gestión de <span className="text-stone-600">Órdenes</span></>
                )
              ) : isSystemMode ? (
                systemViewMode === 'shipping' ? (
                  shippingSubView === 'zones' ? (
                    <>Zonas por <span className="text-stone-600">Estado</span></>
                  ) : (
                    <>Gestión de <span className="text-stone-600">Envíos</span></>
                  )
                ) : systemViewMode === 'users' ? (
                  <>Gestión de <span className="text-stone-600">Usuarios</span></>
                ) : systemViewMode === 'identity' ? (
                  <>Identidad del <span className="text-stone-600">Sistema</span></>
                ) : systemViewMode === 'payment' ? (
                  paymentSubView === 'channels' ? (
                    <>Canales de <span className="text-stone-600">Venta</span></>
                  ) : (
                    <>Método de <span className="text-stone-600">Pago</span></>
                  )
                ) : systemViewMode === 'whatsapp' ? (
                  whatsappSubView === 'channels' ? (
                    <>Mensajería por <span className="text-stone-600">Canal</span></>
                  ) : (
                    <>Integración <span className="text-stone-600">WhatsApp</span></>
                  )
                ) : systemViewMode === 'inventory' ? (
                  <>Ajustes de <span className="text-stone-600">Inventario</span></>
                ) : systemViewMode === 'notifications' ? (
                  <>Alertas y <span className="text-stone-600">Notificaciones</span></>
                ) : systemViewMode === 'billing' ? (
                  <>Estado de Cuenta y <span className="text-stone-600">Servicios</span></>
                ) : (
                  <>Configuración del <span className="text-stone-600">Sistema</span></>
                )
              ) : (
                <>¡Bienvenido de Nuevo, <span className="text-stone-600">{userName}!</span></>
              )}
            </h1>
            <p className="text-stone-500 mt-2 font-medium">
              {isCreatingProduct || isEditingProduct 
                ? 'Administra el inventario del rancho. Priorizamos la venta de aves de combate y cría.'
                : isCreatingMedia || isEditingMedia
                ? 'Completa los detalles para gestionar el contenido visual del catálogo del rancho.'
                : galleryViewMode === 'category_create'
                  ? 'Define una nueva agrupación para organizar los medios de la galería.'
                  : galleryViewMode === 'categories_list'
                    ? 'Revisa y organiza las agrupaciones de contenido de tu galería.'
                    : isGalleryMode 
                      ? 'Explora, organiza y gestiona todos los medios visuales del rancho.' 
                      : isStoreMode
                      ? 'Controla tu inventario de aves y artículos desde un solo lugar.'
                      : isOrdersMode
                      ? 'Administra las ventas, estados de pago y logística de envío.'
                      : isSystemMode
                      ? systemViewMode === 'shipping'
                        ? shippingSubView === 'zones'
                          ? 'Administra la clasificación territorial de envíos para la República Mexicana.'
                          : 'Define las reglas financieras para el envío de artículos y aves.'
                        : systemViewMode === 'users'
                          ? 'Administra los accesos, roles y estados de los usuarios del sistema.'
                          : systemViewMode === 'identity'
                            ? 'Administra el logo global utilizado en el panel y la tienda.'
                          : systemViewMode === 'payment'
                            ? paymentSubView === 'channels'
                                ? 'Configura la información de contacto y cobro específica para cada propósito.'
                                : 'Configura la cuenta bancaria donde recibirás los pagos de tus clientes.'
                          : systemViewMode === 'whatsapp'
                            ? whatsappSubView === 'channels'
                                ? 'Configura números y plantillas específicas para cada departamento.'
                                : 'Ajusta el número y mensaje principal de confirmación de órdenes.'
                          : systemViewMode === 'inventory'
                            ? 'Configura la cancelación automática de órdenes vencidas para liberar el stock.'
                          : systemViewMode === 'notifications'
                            ? 'Administra los avisos por correo electrónico para mantenerte informado de tus ventas.'
                          : systemViewMode === 'billing'
                            ? 'Consulta las fechas de vencimiento de tu plataforma y gestiona cargos adicionales.'
                          : 'Ajusta los parámetros globales, zonificación y usuarios del rancho.'
                      : 'Gestiona el inventario, ventas y medios desde tu panel central.'}
            </p>
          </div>
          
          <div className="animate-in fade-in slide-in-from-right-2 duration-500">
            {isFormMode ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleCancelAction}
                  className="bg-white px-6 py-3.5 rounded-full shadow-sm border border-stone-200 flex items-center gap-2 text-stone-600 font-bold text-sm hover:bg-stone-50 transition-all active:scale-95"
                >
                  <X size={18} className="text-stone-400" />
                  Cancelar
                </button>
                
                {isCreatingMedia && (
                  <button type="submit" form="media-form" disabled={!isFormValid} className={`px-6 py-3.5 rounded-full shadow-sm border flex items-center gap-2 text-stone-600 font-bold text-sm transition-all active:scale-95 ${!isFormValid ? 'bg-stone-50 border-stone-100 opacity-50 cursor-not-allowed' : 'bg-white border-stone-200 hover:bg-stone-50'}`}>
                    <Save size={18} className="text-stone-400" /> Subir Medio
                  </button>
                )}
                {isEditingMedia && (
                  <button type="submit" form="media-form" disabled={!isFormValid} className={`px-6 py-3.5 rounded-full shadow-sm border flex items-center gap-2 text-stone-600 font-bold text-sm transition-all active:scale-95 ${!isFormValid ? 'bg-stone-50 border-stone-100 opacity-50 cursor-not-allowed' : 'bg-white border-stone-200 hover:bg-stone-50'}`}>
                    <Save size={18} className="text-stone-400" /> Guardar Cambios
                  </button>
                )}
                {galleryViewMode === 'category_create' && (
                  <button type="submit" form="category-form" disabled={!isFormValid} className={`px-6 py-3.5 rounded-full shadow-sm border flex items-center gap-2 text-stone-600 font-bold text-sm transition-all active:scale-95 ${!isFormValid ? 'bg-stone-50 border-stone-100 opacity-50 cursor-not-allowed' : 'bg-white border-stone-200 hover:bg-stone-50'}`}>
                    <Save size={18} className="text-stone-400" /> Crear Categoría
                  </button>
                )}
                {galleryViewMode === 'category_edit' && (
                  <button type="submit" form="category-form" disabled={!isFormValid} className={`px-6 py-3.5 rounded-full shadow-sm border flex items-center gap-2 text-stone-600 font-bold text-sm transition-all active:scale-95 ${!isFormValid ? 'bg-stone-50 border-stone-100 opacity-50 cursor-not-allowed' : 'bg-white border-stone-200 hover:bg-stone-50'}`}>
                    <Save size={18} className="text-stone-400" /> Guardar Cambios
                  </button>
                )}
                {isCreatingProduct && (
                  <button type="submit" form="product-form" disabled={!isFormValid} className={`px-6 py-3.5 rounded-full shadow-sm border flex items-center gap-2 text-stone-600 font-bold text-sm transition-all active:scale-95 ${!isFormValid ? 'bg-stone-50 border-stone-100 opacity-50 cursor-not-allowed' : 'bg-white border-stone-200 hover:bg-stone-50'}`}>
                    <Save size={18} className="text-stone-400" /> Crear Producto
                  </button>
                )}
                {isEditingProduct && (
                  <button type="submit" form="product-form" disabled={!isFormValid} className={`px-6 py-3.5 rounded-full shadow-sm border flex items-center gap-2 text-stone-600 font-bold text-sm transition-all active:scale-95 ${!isFormValid ? 'bg-stone-50 border-stone-100 opacity-50 cursor-not-allowed' : 'bg-white border-stone-200 hover:bg-stone-50'}`}>
                    <Save size={18} className="text-stone-400" /> Guardar Cambios
                  </button>
                )}
                
              </div>
            ) : (isGalleryMode || isStoreMode || (isOrdersMode && ordersViewMode === 'list')) ? (
              <div className="relative group w-full sm:w-auto min-w-[300px]">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-stone-400 group-focus-within:text-brand-500 transition-colors">
                  <Search size={18} />
                </div>
                <input 
                  type="text" 
                  placeholder={isStoreMode ? "Busca productos, anillos..." : isOrdersMode ? "Busca por ID, cliente, estado..." : "Busca por título, categoría..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white pl-12 pr-6 py-3.5 rounded-full shadow-sm border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm font-medium placeholder:text-stone-400"
                />
              </div>
            ) : (isOrdersMode && ordersViewMode === 'detail' && selectedOrder) ? (
              <div className="flex gap-3">
                {(selectedOrder.status === 'pending' || selectedOrder.status === 'paid') && (
                  <button 
                    onClick={() => handleCancelOrder(selectedOrder.id)}
                    className="bg-white px-6 py-3.5 rounded-full shadow-sm border border-stone-200 flex items-center gap-2 text-stone-600 font-bold text-sm hover:bg-stone-50 transition-all active:scale-95"
                  >
                    <X size={18} className="text-stone-400" />
                    Cancelar Orden
                  </button>
                )}
                {selectedOrder.status === 'pending' && (
                  <button 
                    onClick={() => handleMarkAsPaid(selectedOrder.id)}
                    className="bg-white px-6 py-3.5 rounded-full shadow-sm border border-stone-200 flex items-center gap-2 text-stone-600 font-bold text-sm hover:bg-stone-50 transition-all active:scale-95"
                  >
                    <Check size={18} className="text-stone-400" />
                    Marcar como Pagada
                  </button>
                )}
              </div>
            ) : (isSystemMode && systemViewMode === 'users') ? (
              <div className="flex gap-3">
              {userRole !== 'staff' && (
                <button 
                  onClick={() => usersRef.current?.handleCreateUser()}
                  className="bg-white px-6 py-3.5 rounded-full shadow-sm border border-stone-200 flex items-center gap-2 text-stone-600 font-bold text-sm hover:bg-stone-50 transition-all active:scale-95"
                >
                  <UserPlus size={18} className="text-stone-400" />
                  Nuevo Usuario
                </button>
              )}
              </div>
            ) : (isSystemMode && systemViewMode === 'shipping') ? (
              <div className="flex gap-3">
                {shippingSubView === 'zones' ? (
                  <>
                    <button 
                      onClick={() => setShippingSubView('config')}
                      className="bg-white px-6 py-3.5 rounded-full shadow-sm border border-stone-200 flex items-center gap-2 text-stone-600 font-bold text-sm hover:bg-stone-50 transition-all active:scale-95"
                    >
                      <X size={18} className="text-stone-400" />
                      Cancelar
                    </button>
                    <button 
                      onClick={() => shippingRef.current?.handleSaveZones()}
                      className="bg-white px-6 py-3.5 rounded-full shadow-sm border border-stone-200 flex items-center gap-2 text-stone-600 font-bold text-sm hover:bg-stone-50 transition-all active:scale-95"
                    >
                      <Save size={18} className="text-stone-400" />
                      Guardar Cambios
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => shippingRef.current?.handleSaveConfig()}
                    className="bg-white px-6 py-3.5 rounded-full shadow-sm border border-stone-200 flex items-center gap-2 text-stone-600 font-bold text-sm hover:bg-stone-50 transition-all active:scale-95"
                  >
                    <Save size={18} className="text-stone-400" />
                    Guardar Configuración
                  </button>
                )}
              </div>
            ) : (isSystemMode && systemViewMode === 'payment') ? (
              <div className="flex gap-3">
                {paymentSubView === 'channels' ? (
                  <>
                    <button 
                      onClick={() => setPaymentSubView('config')}
                      className="bg-white px-6 py-3.5 rounded-full shadow-sm border border-stone-200 flex items-center gap-2 text-stone-600 font-bold text-sm hover:bg-stone-50 transition-all active:scale-95"
                    >
                      <X size={18} className="text-stone-400" />
                      Cancelar
                    </button>
                    <button 
                      onClick={() => paymentRef.current?.handleCreateChannel()}
                      className="bg-white px-6 py-3.5 rounded-full shadow-sm border border-stone-200 flex items-center gap-2 text-stone-600 font-bold text-sm hover:bg-stone-50 transition-all active:scale-95"
                    >
                      <Plus size={18} className="text-stone-400" />
                      Añadir Canal
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => paymentRef.current?.handleSaveConfig()}
                    className="bg-white px-6 py-3.5 rounded-full shadow-sm border border-stone-200 flex items-center gap-2 text-stone-600 font-bold text-sm hover:bg-stone-50 transition-all active:scale-95"
                  >
                    <Save size={18} className="text-stone-400" />
                    Guardar Configuración
                  </button>
                )}
              </div>
            ) : (isSystemMode && systemViewMode === 'whatsapp') ? (
              <div className="flex gap-3">
                {whatsappSubView === 'channels' ? (
                  <>
                    <button 
                      onClick={() => setWhatsappSubView('config')}
                      className="bg-white px-6 py-3.5 rounded-full shadow-sm border border-stone-200 flex items-center gap-2 text-stone-600 font-bold text-sm hover:bg-stone-50 transition-all active:scale-95"
                    >
                      <X size={18} className="text-stone-400" />
                      Cancelar
                    </button>
                    <button 
                      onClick={() => whatsappRef.current?.handleCreateChannel()}
                      className="bg-white px-6 py-3.5 rounded-full shadow-sm border border-stone-200 flex items-center gap-2 text-stone-600 font-bold text-sm hover:bg-stone-50 transition-all active:scale-95"
                    >
                      <Plus size={18} className="text-stone-400" />
                      Añadir Canal
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => whatsappRef.current?.handleSaveConfig()}
                    className="bg-white px-6 py-3.5 rounded-full shadow-sm border border-stone-200 flex items-center gap-2 text-stone-600 font-bold text-sm hover:bg-stone-50 transition-all active:scale-95"
                  >
                    <Save size={18} className="text-stone-400" />
                    Guardar Configuración
                  </button>
                )}
              </div>
            ) : (isSystemMode && systemViewMode === 'inventory') ? (
              <div className="flex gap-3">
                <button 
                  onClick={() => inventoryRef.current?.handleSaveConfig()}
                  className="bg-white px-6 py-3.5 rounded-full shadow-sm border border-stone-200 flex items-center gap-2 text-stone-600 font-bold text-sm hover:bg-stone-50 transition-all active:scale-95"
                >
                  <Save size={18} className="text-stone-400" />
                  Guardar Configuración
                </button>
              </div>
            ) : (isSystemMode && systemViewMode === 'notifications') ? (
              <div className="flex gap-3">
                <button 
                  onClick={() => notificationsRef.current?.handleSaveConfig()}
                  className="bg-white px-6 py-3.5 rounded-full shadow-sm border border-stone-200 flex items-center gap-2 text-stone-600 font-bold text-sm hover:bg-stone-50 transition-all active:scale-95"
                >
                  <Save size={18} className="text-stone-400" />
                  Guardar Configuración
                </button>
              </div>
            ) : (isSystemMode && systemViewMode === 'billing') ? (
              <div className="flex gap-3">
                <button 
                  onClick={() => billingRef.current?.handleCreateCharge()}
                  className="bg-stone-900 px-6 py-3.5 rounded-full shadow-sm border border-stone-800 flex items-center gap-2 text-white font-bold text-sm hover:bg-stone-800 transition-all active:scale-95"
                >
                  <Plus size={18} className="text-stone-400" />
                  Añadir Cargo Extra
                </button>
              </div>
            ) : (isSystemMode && systemViewMode === 'identity') ? (
              <div className="flex gap-3">
                {identityStatus === 'empty' && (
                  <button 
                    onClick={() => setIdentityStatus('editing')}
                    className="bg-white px-6 py-3.5 rounded-full shadow-sm border border-stone-200 flex items-center gap-2 text-stone-600 font-bold text-sm hover:bg-stone-50 transition-all active:scale-95"
                  >
                    <Upload size={18} className="text-stone-400" />
                    Subir logo
                  </button>
                )}
                {identityStatus === 'preview' && (
                  <button 
                    onClick={() => setIdentityStatus('editing')}
                    className="bg-white px-6 py-3.5 rounded-full shadow-sm border border-stone-200 flex items-center gap-2 text-stone-600 font-bold text-sm hover:bg-stone-50 transition-all active:scale-95"
                  >
                    <RefreshCw size={18} className="text-stone-400" />
                    Reemplazar logo
                  </button>
                )}
                {identityStatus === 'editing' && (
                  <>
                    <button 
                      onClick={() => identityRef.current?.handleCancel()}
                      className="bg-white px-6 py-3.5 rounded-full shadow-sm border border-stone-200 flex items-center gap-2 text-stone-600 font-bold text-sm hover:bg-stone-50 transition-all active:scale-95"
                    >
                      <X size={18} className="text-stone-400" />
                      Cancelar
                    </button>
                    <button 
                      onClick={() => identityRef.current?.handleSave()}
                      disabled={!hasTempLogo}
                      className={`px-6 py-3.5 rounded-full shadow-sm border flex items-center gap-2 text-stone-600 font-bold text-sm transition-all active:scale-95 ${!hasTempLogo ? 'bg-stone-50 border-stone-100 opacity-50 cursor-not-allowed' : 'bg-white border-stone-200 hover:bg-stone-50'}`}
                    >
                      <Save size={18} className="text-stone-400" />
                      Guardar Nuevo Logo
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="self-start sm:self-center bg-white px-5 py-3.5 rounded-full shadow-sm border border-stone-200 flex items-center gap-2 text-stone-600 font-medium text-sm whitespace-nowrap">
                <Calendar size={16} className="text-brand-500" />
                <span className="capitalize">{currentDate}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-20 flex-shrink-0 z-40">
            <QuickActions 
              context={activeTab} 
              onAction={handleQuickAction} 
              isDetail={isOrdersMode && ordersViewMode === 'detail'}
            />
          </div>

          <div className="flex-1">
            {isGalleryMode ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <GalleryView 
                  searchQuery={searchQuery} 
                  viewMode={galleryViewMode} 
                  onSetViewMode={setGalleryViewMode} 
                  showToast={showToast}
                  setConfirmDialog={setConfirmDialog}
                  onValidationChange={setIsFormValid}
                />
              </div>
            ) : isStoreMode ? (
               <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <StoreView 
                  searchQuery={searchQuery} 
                  viewMode={storeViewMode} 
                  onSetViewMode={setStoreViewMode} 
                  showToast={showToast}
                  setConfirmDialog={setConfirmDialog}
                  onValidationChange={setIsFormValid}
                />
              </div>
            ) : isOrdersMode ? (
              ordersViewMode === 'detail' && selectedOrder ? (
                <OrderDetailView 
                  order={selectedOrder} 
                  onBack={() => setOrdersViewMode('list')}
                  onMarkAsPaid={handleMarkAsPaid}
                  onCancelOrder={handleCancelOrder}
                />
              ) : (
                <OrdersView 
                  orders={filteredOrders}
                  isLoading={isLoadingDashboard}
                  onViewDetail={handleViewOrderDetail}
                  onMarkAsPaid={handleMarkAsPaid}
                  onCancelOrder={handleCancelOrder}
                />
              )
            ) : isSystemMode ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {systemViewMode === 'shipping' ? (
                  <ShippingView 
                    ref={shippingRef}
                    subView={shippingSubView}
                    setSubView={setShippingSubView}
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
                ) : systemViewMode === 'payment' ? (
                  <PaymentMethodView 
                    ref={paymentRef} 
                    subView={paymentSubView}
                    setSubView={setPaymentSubView}
                    showToast={showToast}
                    setConfirmDialog={setConfirmDialog} 
                  />
                ) : systemViewMode === 'whatsapp' ? (
                  <WhatsAppView 
                    ref={whatsappRef} 
                    subView={whatsappSubView}
                    setSubView={setWhatsappSubView}
                    showToast={showToast}
                    setConfirmDialog={setConfirmDialog} 
                  />
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
                ) : (
                  <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-white/60 text-center">
                    <Settings size={48} className="mx-auto text-stone-300 mb-4" />
                    <h3 className="text-xl font-bold text-stone-800">Módulo en Desarrollo</h3>
                    <p className="text-stone-500 mt-2">Esta sección del sistema estará disponible próximamente.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">

                {/* WIDGET DE FACTURACIÓN CON SKELETON */}
                <BillingAlertWidget 
                  services={billingServices} 
                  charges={billingCharges}
                  isLoading={isLoadingDashboard}
                  onNavigate={() => navigateToSystem('billing')} 
                />

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <div className="xl:col-span-2 min-h-[350px]">
                    {/* SALESCHART CON SKELETON */}
                    <SalesChart
                      data={dashboardStats?.sales7Days}
                      isLoading={isLoadingDashboard}
                    />
                  </div>
                  
                  <div className="xl:col-span-1 flex flex-col gap-6">
                    <div className="flex-1">
                      {/* ACTIVEPRODUCTSWIDGET CON SKELETON */}
                      <ActiveProductsWidget
                        count={dashboardStats?.activeProducts || 0}
                        isLoading={isLoadingDashboard}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* PAIDORDERSWIDGET CON SKELETON */}
                      <PaidOrdersWidget 
                        amount={dashboardStats?.orders?.paid?.amount || 0} 
                        totalAmount={dashboardStats?.orders?.totalAmount || 1}
                        isLoading={isLoadingDashboard}
                      />
                      {/* PENDINGORDERSWIDGET CON SKELETON */}
                      <PendingOrdersWidget 
                        amount={dashboardStats?.orders?.pending?.amount || 0} 
                        totalAmount={(dashboardStats?.orders?.totalAmount || 0) + (dashboardStats?.orders?.pending?.amount || 0)}
                        isLoading={isLoadingDashboard}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <div className="xl:col-span-2 flex flex-col">
                    <div className="flex items-center justify-between mb-4 px-1">
                      <h3 className="text-xl font-bold text-stone-800">Últimas Órdenes</h3>
                      <button 
                        onClick={() => {
                          setActiveTab('Órdenes');
                          setOrdersViewMode('list');
                          setSearchQuery('');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-sm text-brand-600 font-semibold hover:text-brand-700 transition-colors"
                      >
                        Ver todas
                      </button>
                    </div>
                    <div className="flex flex-col gap-3 flex-1">
                      {isLoadingDashboard ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <OrderWidgetCardSkeleton key={i} />
                        ))
                      ) : orders.length > 0 ? (
                        orders.slice(0, 5).map((order) => (
                          <OrderWidgetCard key={order.id} order={order} />
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                          <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-300">
                            <Package size={32} />
                          </div>
                          <h3 className="text-xl font-black text-stone-800 tracking-tight mb-2">No hay órdenes</h3>
                          <p className="text-stone-500 text-sm font-medium max-w-sm">
                            Aún no tienes órdenes registradas en el sistema.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="xl:col-span-1">
                    {/* ORDERSTATUSCHART CON SKELETON */}
                    <OrderStatusChart
                      stats={dashboardStats?.orders}
                      isLoading={isLoadingDashboard}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
                  <div className="xl:col-span-1 flex flex-col gap-4">
                    {/* GALLERYWIDGET CON SKELETON */}
                    <GalleryWidget 
                      count={dashboardStats?.totalMedia || 0} 
                      onViewGallery={() => navigateToGallery('list')}
                      isLoading={isLoadingDashboard}
                    />
                    {/* CATEGORYWIDGET CON SKELETON */}
                    <CategoryWidget
                      count={dashboardStats?.activeCategories || 0}
                      isLoading={isLoadingDashboard}
                    />
                  </div>
                  <div className="xl:col-span-1">
                    {/* LATESTMEDIA CON SKELETON */}
                    <LatestMedia 
                      items={dashboardStats?.latestMedia || []} 
                      onViewGallery={() => navigateToGallery('list')}
                      isLoading={isLoadingDashboard}
                    />
                  </div>
                  <div className="xl:col-span-1">
                    {/* LATESTPRODUCTS CON SKELETON */}
                    <LatestProducts
                      items={dashboardStats?.latestProducts || []}
                      isLoading={isLoadingDashboard}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav 
        activeTab={activeTab as any} 
        onTabChange={setActiveTab as any}
        tabs={['Inicio', 'Galería', 'Tienda', 'Órdenes', 'Sistema']}
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <ConfirmModal {...confirmDialog} onCancel={closeConfirm} />
    </div>
  );
}

export default App;