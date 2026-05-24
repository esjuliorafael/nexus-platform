import React from 'react';

interface PageHeaderProps {
  activeTab: string;
  userName: string;
  // Gallery states
  galleryViewMode: string;
  isCreatingMedia: boolean;
  isEditingMedia: boolean;
  // Store states
  storeViewMode: string;
  isCreatingProduct: boolean;
  isEditingProduct: boolean;
  // Raffle states
  raffleViewMode: string;
  isCreatingRaffle: boolean;
  isEditingRaffle: boolean;
  // System states
  systemViewMode: string;
  shippingSubView: string;
  channelsViewMode: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  activeTab,
  userName,
  galleryViewMode,
  isCreatingMedia,
  isEditingMedia,
  storeViewMode,
  isCreatingProduct,
  isEditingProduct,
  raffleViewMode,
  isCreatingRaffle,
  isEditingRaffle,
  systemViewMode,
  shippingSubView,
  channelsViewMode
}) => {
  const isGalleryMode = activeTab === 'Galería';
  const isStoreMode = activeTab === 'Tienda';
  const isSystemMode = activeTab === 'Sistema';
  const isRafflesMode = activeTab === 'Rifas';
  const isOrdersMode = isStoreMode && (storeViewMode === 'orders' || storeViewMode === 'order-detail');

  const getTitle = () => {
    if (isCreatingMedia) return <>Subir <span className="text-stone-600">Nuevo Medio</span></>;
    if (isEditingMedia) return <>Editar <span className="text-stone-600">Medio</span></>;
    if (isCreatingProduct) return <>Nuevo <span className="text-stone-600">Producto</span></>;
    if (isEditingProduct) return <>Editar <span className="text-stone-600">Producto</span></>;
    if (isCreatingRaffle) return <>Nueva <span className="text-stone-600">Rifa</span></>;
    if (isEditingRaffle) return <>Editar <span className="text-stone-600">Rifa</span></>;
    if (galleryViewMode === 'category_create') return <>Nueva <span className="text-stone-600">Categoría</span></>;
    if (galleryViewMode === 'category_edit') return <>Editar <span className="text-stone-600">Categoría</span></>;
    if (galleryViewMode === 'categories_list') return <>Gestionar <span className="text-stone-600">Categorías</span></>;
    if (isGalleryMode) return <>Panel de <span className="text-stone-600">Galería</span></>;
    
    if (isStoreMode) {
      if (storeViewMode === 'orders') return <>Gestión de <span className="text-stone-600">Órdenes</span></>;
      if (storeViewMode === 'order-detail') return <>Detalle de <span className="text-stone-600">Orden</span></>;
      return <>Gestión de <span className="text-stone-600">Tienda</span></>;
    }

    if (isRafflesMode) {
      if (raffleViewMode === 'detail') return <>Detalle de <span className="text-stone-600">Rifa</span></>;
      return <>Gestión de <span className="text-stone-600">Rifas</span></>;
    }

    if (isSystemMode) {
      if (systemViewMode === 'shipping') {
        if (shippingSubView === 'zones') return <>Zonas por <span className="text-stone-600">Estado</span></>;
        return <>Gestión de <span className="text-stone-600">Envíos</span></>;
      }
      if (systemViewMode === 'users') return <>Gestión de <span className="text-stone-600">Miembros</span></>;
      if (systemViewMode === 'identity') return <>Identidad del <span className="text-stone-600">Sistema</span></>;
      if (systemViewMode === 'channels') {
        if (channelsViewMode === 'hub') return <>Centro de <span className="text-stone-600">Canales</span></>;
        if (channelsViewMode === 'create') return <>Nuevo <span className="text-stone-600">Canal</span></>;
        return <>Configurar <span className="text-stone-600">Canal</span></>;
      }
      if (systemViewMode === 'inventory') return <>Ajustes de <span className="text-stone-600">Inventario</span></>;
      if (systemViewMode === 'notifications') return <>Alertas y <span className="text-stone-600">Notificaciones</span></>;
      if (systemViewMode === 'billing') return <>Estado de <span className="text-stone-600">Cuenta</span></>;
      return <>Ajustes del <span className="text-stone-600">Sistema</span></>;
    }

    return <>¡Bienvenido de Nuevo, <span className="text-stone-600">{userName}!</span></>;
  };

  const getDescription = () => {
    if (isCreatingProduct || isEditingProduct) return 'Administra el inventario del rancho. Priorizamos la venta de aves de combate y cría.';
    if (isCreatingRaffle || isEditingRaffle) return 'Configura los parámetros de la rifa, premios y dinámica de boletos.';
    if (isCreatingMedia || isEditingMedia) return 'Completa los detalles para gestionar el contenido visual del catálogo del rancho.';
    if (galleryViewMode === 'category_create') return 'Define una nueva agrupación para organizar los medios de la galería.';
    if (galleryViewMode === 'categories_list') return 'Revisa y organiza las agrupaciones de contenido de tu galería.';
    if (isGalleryMode) return 'Explora, organiza y gestiona todos los medios visuales del rancho.';
    if (isStoreMode) {
      if (isOrdersMode) return 'Administra las ventas, estados de pago y logística de envío.';
      return 'Controla tu inventario de aves y artículos desde un solo lugar.';
    }
    if (isRafflesMode) return 'Administra los sorteos activos, boletos vendidos y ganadores.';
    if (isSystemMode) {
      if (systemViewMode === 'shipping') {
        if (shippingSubView === 'zones') return 'Administra la clasificación territorial de envíos para la República Mexicana.';
        return 'Define las reglas financieras para el envío de artículos y aves.';
      }
      if (systemViewMode === 'users') return 'Supervisa el acceso, define roles administrativos y gestiona las credenciales del equipo.';
      if (systemViewMode === 'identity') return 'Administra el logo global utilizado en el panel y la tienda.';
      if (systemViewMode === 'channels') {
        if (channelsViewMode === 'hub') return 'Configura la identidad, cobros y mensajería por departamento.';
        if (channelsViewMode === 'create') return 'Completa los pasos para configurar la identidad, pagos y WhatsApp del nuevo canal.';
        return 'Ajusta los parámetros técnicos y plantillas de mensajería del canal.';
      }
      if (systemViewMode === 'inventory') return 'Configura la cancelación automática de órdenes vencidas para liberar el stock.';
      if (systemViewMode === 'notifications') return 'Administra los avisos por correo electrónico para mantenerte informado de tus ventas.';
      if (systemViewMode === 'billing') return 'Monitorea la vigencia de tu licenciamiento y gestiona los cargos por servicios adicionales.';
      return 'Controla los parámetros globales de infraestructura, zonificación y staff.';
    }
    return 'Gestiona el inventario, ventas y medios desde tu panel central.';
  };

  return (
    <div className="animate-in fade-in slide-in-from-left-2 duration-500">
      <h1 className="text-display text-text-main">
        {getTitle()}
      </h1>
      <p className="text-text-muted mt-2 font-medium">
        {getDescription()}
      </p>
    </div>
  );
};
