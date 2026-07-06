import React from "react";
import { Calendar } from "lucide-react";

interface PageHeaderProps {
  activeTab: string;
  userName: string;
  currentDate?: string;
  mediaViewMode: string;
  isCreatingMedia: boolean;
  isEditingMedia: boolean;
  isCreatingSlide?: boolean;
  isEditingSlide?: boolean;
  storeViewMode: string;
  isCreatingProduct: boolean;
  isEditingProduct: boolean;
  isCreatingStoreHero?: boolean;
  isEditingStoreHero?: boolean;
  raffleViewMode: string;
  isCreatingRaffle: boolean;
  isEditingRaffle: boolean;
  systemViewMode: string;
  profileViewMode: string;
  shippingSubView: string;
  channelsViewMode: string;
  actionAddon?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  activeTab,
  userName,
  currentDate,
  mediaViewMode,
  isCreatingMedia,
  isEditingMedia,
  isCreatingSlide = false,
  isEditingSlide = false,
  storeViewMode,
  isCreatingProduct,
  isEditingProduct,
  isCreatingStoreHero = false,
  isEditingStoreHero = false,
  raffleViewMode,
  isCreatingRaffle,
  isEditingRaffle,
  systemViewMode,
  profileViewMode,
  shippingSubView,
  channelsViewMode,
  actionAddon,
}) => {
  const isMediaMode = activeTab === "Medios";
  const isStoreMode = activeTab === "Tienda";
  const isOrdersTab = activeTab === "Órdenes" || activeTab.includes("rdenes");
  const isSystemMode = activeTab === "Sistema";
  const isProfileMode = activeTab === "Mi Perfil";
  const isRafflesMode = activeTab === "Rifas";
  const isOrdersMode =
    isOrdersTab ||
    (isStoreMode &&
      (storeViewMode === "orders" || storeViewMode === "order-detail"));

  const getTitle = () => {
    if (isCreatingMedia)
      return <>Subir <span className="text-text-muted">Nuevo Medio</span></>;
    if (isEditingMedia)
      return <>Editar <span className="text-text-muted">Medio</span></>;
    if (isCreatingSlide)
      return <>Nuevo <span className="text-text-muted">Slide</span></>;
    if (isEditingSlide)
      return <>Editar <span className="text-text-muted">Slide</span></>;
    if (isStoreMode && storeViewMode === "coupon_create")
      return <>Nuevo <span className="text-text-muted">{"Cup\u00f3n"}</span></>;
    if (isStoreMode && storeViewMode === "coupon_edit")
      return <>Editar <span className="text-text-muted">{"Cup\u00f3n"}</span></>;
    if (isCreatingProduct)
      return <>Nuevo <span className="text-text-muted">Producto</span></>;
    if (isEditingProduct)
      return <>Editar <span className="text-text-muted">Producto</span></>;
    if (isCreatingStoreHero)
      return <>Nuevo <span className="text-text-muted">Hero</span></>;
    if (isEditingStoreHero)
      return <>Editar <span className="text-text-muted">Hero</span></>;
    if (isCreatingRaffle)
      return <>Nueva <span className="text-text-muted">Rifa</span></>;
    if (isEditingRaffle)
      return <>Editar <span className="text-text-muted">Rifa</span></>;

    if (isMediaMode) {
      if (
        mediaViewMode === "categories_list" ||
        mediaViewMode === "category_create" ||
        mediaViewMode === "category_edit"
      )
        return <>Gestionar <span className="text-text-muted">Categorías</span></>;
      if (mediaViewMode === "slider_list")
        return <>Slider <span className="text-text-muted">Principal</span></>;
      return <>Panel de <span className="text-text-muted">Medios</span></>;
    }

    if (isOrdersMode) {
      if (storeViewMode === "order-detail")
        return <>Detalle de <span className="text-text-muted">Orden</span></>;
      return <>Gestión de <span className="text-text-muted">Órdenes</span></>;
    }

    if (isStoreMode) {
      if (storeViewMode === "orders")
        return <>Gestión de <span className="text-text-muted">Órdenes</span></>;
      if (storeViewMode === "order-detail")
        return <>Detalle de <span className="text-text-muted">Orden</span></>;
      if (storeViewMode === "coupon_list")
        return <>Cupones de <span className="text-text-muted">Tienda</span></>;
      if (storeViewMode === "hero_list")
        return <>Héroes de <span className="text-text-muted">Tienda</span></>;
      return <>Gestión de <span className="text-text-muted">Tienda</span></>;
    }

    if (isRafflesMode) {
      if (raffleViewMode === "detail")
        return <>Detalle de <span className="text-text-muted">Rifa</span></>;
      return <>Gestión de <span className="text-text-muted">Rifas</span></>;
    }

    if (isSystemMode) {
      if (systemViewMode === "shipping") {
        if (shippingSubView === "zones")
          return <>Zonas por <span className="text-text-muted">Estado</span></>;
        return <>Gestión de <span className="text-text-muted">Envíos</span></>;
      }
      if (systemViewMode === "users")
        return <>Gestión de <span className="text-text-muted">Miembros</span></>;
      if (systemViewMode === "identity")
        return <>Identidad del <span className="text-text-muted">Sistema</span></>;
      if (systemViewMode === "channels") {
        if (channelsViewMode === "hub")
          return <>Centro de <span className="text-text-muted">Canales</span></>;
        if (channelsViewMode === "principal")
          return <>Canal <span className="text-text-muted">Principal</span></>;
        if (channelsViewMode === "create")
          return <>Nuevo <span className="text-text-muted">Canal</span></>;
        return <>Configurar <span className="text-text-muted">Canal</span></>;
      }
      if (systemViewMode === "inventory")
        return <>Ajustes de <span className="text-text-muted">Inventario</span></>;
      if (systemViewMode === "billing")
        return <>Estado de <span className="text-text-muted">Cuenta</span></>;
      if (systemViewMode === "storefront")
        return <>Estado del <span className="text-text-muted">Storefront</span></>;
      if (systemViewMode === "intelligence")
        return <>Inteligencia de <span className="text-text-muted">Audiencias</span></>;
      if (systemViewMode === "config")
        return <>Ajustes de <span className="text-text-muted">Plataforma</span></>;
      return <>Ajustes del <span className="text-text-muted">Sistema</span></>;
    }

    if (isProfileMode) {
      if (profileViewMode === "contact")
        return <>Contacto <span className="text-text-muted">Público</span></>;
      if (profileViewMode === "notifications")
        return <>Mis <span className="text-text-muted">Notificaciones</span></>;
      if (profileViewMode === "security")
        return <>Cuenta y <span className="text-text-muted">Seguridad</span></>;
      return <>Mi <span className="text-text-muted">Perfil</span></>;
    }

    return (
      <>
        ¡Bienvenido de Nuevo,{" "}
        <span className="text-text-muted">{userName}!</span>
      </>
    );
  };

  const getDescription = () => {
    if (isCreatingProduct || isEditingProduct)
      return "Administra el inventario del rancho. Priorizamos la venta de aves de combate y cría.";
    if (isCreatingStoreHero || isEditingStoreHero)
      return "Configura el bloque editorial que se muestra en la tienda del Storefront.";
    if (isStoreMode && (storeViewMode === "coupon_create" || storeViewMode === "coupon_edit"))
      return "Define el c\u00f3digo, descuento, alcance y vigencia del cup\u00f3n.";
    if (isCreatingRaffle || isEditingRaffle)
      return "Configura los parámetros de la rifa, premios y dinámica de boletos.";
    if (isCreatingMedia || isEditingMedia)
      return "Completa los detalles para gestionar el contenido visual del catálogo del rancho.";
    if (isCreatingSlide || isEditingSlide)
      return "Configura el contenido editorial que se muestra en el primer impacto del Storefront.";
    if (isMediaMode) {
      if (
        mediaViewMode === "categories_list" ||
        mediaViewMode === "category_create" ||
        mediaViewMode === "category_edit"
      )
        return "Revisa y organiza las agrupaciones de contenido de tu galería.";
      if (mediaViewMode === "slider_list")
        return "Administra las imágenes, videos y mensajes principales del inicio del Storefront.";
      return "Explora, organiza y gestiona todos los medios visuales del rancho.";
    }
    if (isOrdersMode)
      return storeViewMode === "order-detail"
        ? "Revisa el detalle del pedido, productos, cliente, pagos y notificaciones asociadas."
        : "Administra las ventas, estados de pago y logística de envío.";
    if (isStoreMode) {
      if (storeViewMode === "coupon_list")
        return "Administra promociones y códigos de descuento para el checkout.";
      if (storeViewMode === "hero_list")
        return "Administra los héroes editoriales por tipo de producto.";
      return "Controla tu inventario de aves y artículos desde un solo lugar.";
    }
    if (isRafflesMode)
      return "Administra los sorteos activos, boletos vendidos y ganadores.";
    if (isSystemMode) {
      if (systemViewMode === "shipping") {
        if (shippingSubView === "zones")
          return "Administra la clasificación territorial de envíos para la República Mexicana.";
        return "Define las reglas financieras para el envío de artículos y aves.";
      }
      if (systemViewMode === "users")
        return "Supervisa el acceso, define roles administrativos y gestiona las credenciales del equipo.";
      if (systemViewMode === "identity")
        return "Administra el logo global utilizado en el panel y la tienda.";
      if (systemViewMode === "channels") {
        if (channelsViewMode === "hub")
          return "Configura la identidad, cobros y mensajería por departamento.";
        if (channelsViewMode === "principal")
          return "Administra el fallback bancario, Mercado Pago, mensajería y plantillas principales.";
        if (channelsViewMode === "create")
          return "Completa los pasos para configurar la identidad, pagos y WhatsApp del nuevo canal.";
        return "Ajusta los parámetros técnicos y plantillas de mensajería del canal.";
      }
      if (systemViewMode === "inventory")
        return "Configura la cancelación automática de órdenes vencidas para liberar el stock.";
      if (systemViewMode === "billing")
        return "Monitorea la vigencia de tu licenciamiento y gestiona los cargos por servicios adicionales.";
      if (systemViewMode === "storefront")
        return "Controla la disponibilidad pública de la tienda y el mensaje temporal para visitantes.";
      if (systemViewMode === "intelligence")
        return "Segmenta participantes de rifas, detecta valor comercial y exporta audiencias accionables.";
      if (systemViewMode === "config")
        return "Administra los parámetros globales de infraestructura, zonificación y staff.";
      return "Controla los parámetros globales de infraestructura, zonificación y staff.";
    }
    if (isProfileMode) {
      if (profileViewMode === "contact")
        return "Administra la información de atención que puede mostrarse en el Storefront.";
      if (profileViewMode === "notifications")
        return "Define cómo quieres recibir avisos relacionados con la operación.";
      if (profileViewMode === "security")
        return "Protege tu cuenta y actualiza tus credenciales personales.";
      return "Actualiza tu identidad y datos personales dentro de Nexus.";
    }
    return "Gestiona el inventario, ventas y medios desde tu panel central.";
  };

  return (
    <div
      className="flex flex-col md:flex-row md:items-center justify-between animate-in fade-in slide-in-from-left-2 duration-500 w-full"
      style={{ gap: "var(--space-lg)" }}
    >
      <div
        className="flex-1 min-w-0 flex flex-col"
        style={{ gap: "var(--space-xs)" }}
      >
        <h1 className="text-display text-text-main">{getTitle()}</h1>
        <p className="text-secondary text-text-muted">{getDescription()}</p>
      </div>

      <div
        className="flex items-center shrink-0"
        style={{ gap: "var(--space-sm)" }}
      >
        {actionAddon ? (
          actionAddon
        ) : currentDate ? (
          <div
            className="inline-flex items-center justify-center select-none bg-bg-card text-text-main border border-border-main text-button-section"
            style={{
              height: "var(--size-button-section)",
              padding: "0 2rem",
              borderRadius: "var(--radius-inner-visual)",
              gap: "var(--space-sm)",
            }}
          >
            <Calendar className="text-brand-500" size={20} strokeWidth={2.5} />
            <span className="capitalize">{currentDate}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};
