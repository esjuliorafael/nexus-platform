// Shared Types

export const PERMISSION_GROUPS = [
  { id: "dashboard", label: "Inicio y reportes" },
  { id: "orders", label: "Pedidos y pagos" },
  { id: "products", label: "Productos e inventario" },
  { id: "storefront", label: "Contenido de la tienda" },
  { id: "raffles", label: "Rifas y participaciones" },
  { id: "media", label: "Medios y archivos" },
  { id: "marketing", label: "Cupones y comunicaciones" },
  { id: "configuration", label: "Configuración" },
  { id: "platform", label: "Plataforma" },
  { id: "team", label: "Equipo" },
] as const;

export const PERMISSIONS = [
  {
    id: "dashboard.operations.view",
    group: "dashboard",
    label: "Consultar atención operativa",
    description: "Muestra pendientes de pedidos, rifas e inventario según tus permisos en cada módulo.",
  },
  {
    id: "dashboard.history.view",
    group: "dashboard",
    label: "Consultar historial de operaciones",
    description: "Muestra los movimientos recientes de pedidos y participaciones; el detalle respeta tus permisos en cada módulo.",
  },
  {
    id: "dashboard.sales.view",
    group: "dashboard",
    label: "Consultar indicadores comerciales",
    description: "Muestra tendencias, montos y conversión agregados; no concede acceso al detalle de pedidos o participaciones.",
  },
  {
    id: "dashboard.milestones.view",
    group: "dashboard",
    label: "Consultar progreso de hitos",
    description: "Muestra el acumulado histórico de ingresos, órdenes y participaciones.",
  },
  {
    id: "dashboard.milestones.acknowledge",
    group: "dashboard",
    label: "Marcar hitos como vistos",
    description: "Guarda que ya viste un hito; también requiere permiso para consultar los hitos.",
  },
  { id: "orders.view", group: "orders", label: "Consultar pedidos" },
  {
    id: "orders.manage",
    group: "orders",
    label: "Actualizar pedidos y datos del cliente",
    description: "Permite cambiar datos del cliente y estados operativos; no confirma pagos ni procesa devoluciones.",
  },
  {
    id: "orders.financial.manage",
    group: "orders",
    label: "Confirmar pagos y gestionar movimientos financieros",
    description: "Autoriza confirmar pagos de pedidos. Las devoluciones requieren el permiso separado de reembolso.",
  },
  {
    id: "orders.refund",
    group: "orders",
    label: "Reembolsar pedidos",
    description: "Permite tramitar devoluciones de pagos; no concede permisos para editar el pedido.",
  },
  { id: "orders.restore", group: "orders", label: "Restaurar pedidos eliminados" },
  {
    id: "payment-links.view",
    group: "orders",
    label: "Consultar enlaces de pago",
  },
  {
    id: "payment-links.generate",
    group: "orders",
    label: "Generar enlaces de pago",
    description: "Permite elegir productos disponibles y crear accesos de Checkout Pro; no reserva inventario por sí solo.",
  },
  {
    id: "payment-links.revoke",
    group: "orders",
    label: "Revocar enlaces de pago",
    description: "Invalida enlaces activos. Regenerar requiere también el permiso para generar.",
  },
  { id: "products.view", group: "products", label: "Consultar productos" },
  {
    id: "products.create",
    group: "products",
    label: "Crear productos",
    description: "Para adjuntar archivos nuevos al producto también se requiere Subir archivos.",
  },
  {
    id: "products.update",
    group: "products",
    label: "Editar y cambiar el estado de productos",
    description: "Para adjuntar archivos nuevos al producto también se requiere Subir archivos.",
  },
  { id: "products.delete", group: "products", label: "Eliminar productos" },
  {
    id: "categories.view",
    group: "media",
    label: "Consultar categorías y subcategorías",
  },
  {
    id: "categories.manage",
    group: "media",
    label: "Crear y editar categorías y subcategorías",
  },
  {
    id: "categories.delete",
    group: "media",
    label: "Eliminar categorías y subcategorías",
    description: "Eliminar una categoría también elimina sus subcategorías y desvincula medios.",
  },
  {
    id: "storefront.heroes.view",
    group: "storefront",
    label: "Consultar héroes de tienda",
  },
  {
    id: "storefront.heroes.manage",
    group: "storefront",
    label: "Crear y editar héroes de tienda",
    description: "Para adjuntar archivos nuevos también se requiere Subir archivos.",
  },
  {
    id: "storefront.heroes.delete",
    group: "storefront",
    label: "Eliminar héroes de tienda",
  },
  {
    id: "storefront.slides.view",
    group: "media",
    label: "Consultar slider de inicio",
  },
  {
    id: "storefront.slides.manage",
    group: "media",
    label: "Crear y editar slides de inicio",
    description: "Para adjuntar archivos nuevos también se requiere Subir archivos.",
  },
  {
    id: "storefront.slides.delete",
    group: "media",
    label: "Eliminar slides de inicio",
  },
  {
    id: "storefront.announcements.view",
    group: "storefront",
    label: "Consultar avisos del Storefront",
  },
  {
    id: "storefront.announcements.manage",
    group: "storefront",
    label: "Crear, editar y publicar avisos del Storefront",
  },
  {
    id: "storefront.announcements.delete",
    group: "storefront",
    label: "Eliminar avisos del Storefront",
  },
  { id: "storefront.status.view", group: "storefront", label: "Consultar estado del Storefront" },
  { id: "storefront.status.manage", group: "storefront", label: "Cambiar estado y pantallas del Storefront" },
  { id: "storefront.branding.view", group: "storefront", label: "Consultar identidad visual" },
  { id: "storefront.branding.manage", group: "storefront", label: "Cambiar identidad visual" },
  { id: "shipping.view", group: "configuration", label: "Consultar zonas de envío" },
  {
    id: "shipping.manage",
    group: "configuration",
    label: "Cambiar costos y cobertura de envío",
    description: "Modifica tarifas y zonas cubiertas; afecta el costo calculado en futuros checkouts.",
  },
  {
    id: "payments.config.manage",
    group: "configuration",
    label: "Administrar cuentas y canales de pago",
    description: "Modifica las cuentas bancarias principales y la conexión principal de Mercado Pago.",
  },
  { id: "payments.config.view", group: "configuration", label: "Consultar canales de pago" },
  { id: "inventory.policies.view", group: "products", label: "Consultar políticas de retención de inventario" },
  { id: "inventory.policies.manage", group: "products", label: "Cambiar políticas de retención de inventario" },
  {
    id: "billing.view",
    group: "configuration",
    label: "Consultar cargos y pagos administrativos",
    description: "Muestra servicios, cargos y pagos de la cuenta; no son pagos de pedidos de clientes.",
  },
  {
    id: "billing.manage",
    group: "configuration",
    label: "Administrar cargos y pagos administrativos",
    description: "Crea o modifica registros de facturación administrativa; no confirma pagos de pedidos.",
  },
  {
    id: "channels.view",
    group: "configuration",
    label: "Consultar canales especializados",
    description: "Permite revisar la configuración y el estado operativo de esos canales.",
  },
  {
    id: "channels.manage",
    group: "configuration",
    label: "Crear y cambiar canales especializados",
    description: "Crea, edita o elimina rutas especializadas. También requiere permisos de pagos y mensajería porque el canal combina ambas áreas.",
  },
  {
    id: "messaging.view",
    group: "marketing",
    label: "Consultar canales y comunicaciones",
    description: "Permite revisar canales de WhatsApp, plantillas y registros de comunicación.",
  },
  {
    id: "messaging.cost.view",
    group: "marketing",
    label: "Consultar costo estimado de mensajería",
    description: "Muestra métricas de costo de mensajes; no permite configurar canales ni enviar campañas.",
  },
  {
    id: "messaging.manage",
    group: "marketing",
    label: "Configurar canales, plantillas e integraciones",
    description: "Cambia conexiones y plantillas de WhatsApp; no autoriza envíos de campañas.",
  },
  {
    id: "messaging.send",
    group: "marketing",
    label: "Enviar o reintentar mensajes",
    description: "Envía o reintenta mensajes de notificación a clientes y participantes.",
  },
  { id: "coupons.view", group: "marketing", label: "Consultar cupones de la tienda" },
  { id: "coupons.manage", group: "marketing", label: "Crear, editar y activar cupones de la tienda" },
  { id: "coupons.delete", group: "marketing", label: "Eliminar cupones de la tienda" },
  { id: "media.view", group: "media", label: "Consultar galería de medios" },
  { id: "media.manage", group: "media", label: "Crear y editar registros de medios" },
  { id: "media.delete", group: "media", label: "Eliminar medios de la galería" },
  {
    id: "media.upload",
    group: "media",
    label: "Subir archivos para productos, rifas y contenido",
    description: "Es necesario cuando se adjuntan archivos nuevos; no concede permisos para editar o eliminar esos registros.",
  },
  { id: "media.vault.view", group: "media", label: "Consultar y descargar archivos de la bóveda" },
  { id: "media.vault.upload", group: "media", label: "Subir y extender disponibilidad de archivos en la bóveda" },
  { id: "media.vault.delete", group: "media", label: "Eliminar archivos de la bóveda" },
  {
    id: "inventory.audit",
    group: "products",
    label: "Revisar inconsistencias de inventario",
    description: "Consulta reservas huérfanas y otros problemas de integridad; no permite corregirlos.",
  },
  { id: "inventory.reservations.release", group: "products", label: "Liberar reservas huérfanas" },
  { id: "raffles.view", group: "raffles", label: "Consultar rifas" },
  {
    id: "raffles.manage",
    group: "raffles",
    label: "Crear, editar y publicar rifas",
    description: "Para adjuntar imágenes y archivos nuevos también se requiere Subir archivos.",
  },
  {
    id: "raffles.results.manage",
    group: "raffles",
    label: "Capturar y publicar resultados",
    description: "Publica los resultados oficiales y ganadores de una rifa.",
  },
  { id: "raffles.participations.view", group: "raffles", label: "Consultar participaciones" },
  {
    id: "raffles.participations.manage",
    group: "raffles",
    label: "Editar, cancelar y restaurar participaciones",
    description: "Modifica datos o apartados; no confirma pagos ni procesa devoluciones.",
  },
  {
    id: "raffles.financial.manage",
    group: "raffles",
    label: "Confirmar pagos y reembolsar participaciones",
    description: "Autoriza confirmar pagos y procesar devoluciones de participaciones.",
  },
  { id: "raffles.coupons.view", group: "raffles", label: "Consultar cupones de rifas" },
  { id: "raffles.coupons.manage", group: "raffles", label: "Crear, editar y activar cupones de rifas" },
  { id: "raffles.coupons.delete", group: "raffles", label: "Eliminar cupones de rifas" },
  {
    id: "raffles.settings.manage",
    group: "raffles",
    label: "Cambiar configuración de rifas",
    description: "Modifica parámetros generales del módulo, no los datos de una rifa individual.",
  },
  { id: "raffles.settings.view", group: "raffles", label: "Consultar configuración de rifas" },
  {
    id: "raffles.intelligence.view",
    group: "raffles",
    label: "Consultar inteligencia de rifas",
    description: "Muestra indicadores, segmentos y datos de participantes.",
  },
  { id: "raffles.intelligence.export", group: "raffles", label: "Exportar participantes de rifas" },
  {
    id: "raffles.intelligence.manage",
    group: "raffles",
    label: "Administrar audiencias de rifas",
    description: "Crea, edita y elimina audiencias guardadas; no envía campañas por sí solo.",
  },
  { id: "users.view", group: "team", label: "Consultar usuarios" },
  { id: "users.create", group: "team", label: "Crear usuarios" },
  { id: "users.update", group: "team", label: "Editar usuarios y su estado" },
  { id: "users.delete", group: "team", label: "Eliminar usuarios" },
  { id: "users.permissions.manage", group: "team", label: "Asignar permisos a usuarios", description: "Solo permite conceder permisos que ya tienes." },
  { id: "users.roles.manage", group: "team", label: "Cambiar roles de usuario", description: "Solo Superadmin puede conceder este permiso o usarlo para cambiar roles privilegiados." },
  { id: "platform.settings.view", group: "platform", label: "Consultar configuración de plataforma" },
  { id: "platform.settings.manage", group: "platform", label: "Cambiar configuración de plataforma" },
] as const;

export type PermissionId = (typeof PERMISSIONS)[number]["id"];
export const PERMISSION_IDS = PERMISSIONS.map((permission) => permission.id) as [
  PermissionId,
  ...PermissionId[],
];

const legacyPermissionGrants: Record<string, PermissionId[]> = {
  "users.manage": ["users.view", "users.create", "users.update", "users.delete", "users.permissions.manage"],
  "settings.view": [
    "storefront.status.view", "storefront.branding.view", "storefront.heroes.view",
    "storefront.slides.view", "storefront.announcements.view", "inventory.policies.view",
    "raffles.settings.view", "payments.config.view", "shipping.view", "messaging.view",
  ],
  "settings.manage": [
    "storefront.status.manage", "storefront.branding.manage", "inventory.policies.manage",
    "shipping.manage", "payments.config.manage", "messaging.manage",
  ],
  "products.manage": ["products.view", "products.create", "products.update", "products.delete"],
  "payment-links.manage": ["payment-links.view", "payment-links.generate", "payment-links.revoke"],
  "storefront.content.view": [
    "storefront.heroes.view", "storefront.slides.view", "storefront.announcements.view",
  ],
  "storefront.content.manage": [
    "storefront.heroes.view", "storefront.heroes.manage", "storefront.heroes.delete",
    "storefront.slides.view", "storefront.slides.manage", "storefront.slides.delete",
    "storefront.announcements.view", "storefront.announcements.manage", "storefront.announcements.delete",
    "storefront.branding.view", "storefront.branding.manage",
  ],
  "media.vault.manage": ["media.vault.view", "media.vault.upload", "media.vault.delete"],
  "inventory.audit": ["inventory.reservations.release"],
  "raffles.intelligence.view": ["raffles.intelligence.export"],
};

const permissionIdSet = new Set<string>(PERMISSION_IDS);

export function normalizePermissionIds(permissions: readonly string[]): PermissionId[] {
  const normalized = new Set<PermissionId>();
  for (const permission of permissions) {
    const grants = legacyPermissionGrants[permission] ?? [permission as PermissionId];
    for (const grant of grants) {
      if (permissionIdSet.has(grant)) normalized.add(grant);
    }
  }
  return Array.from(normalized);
}

const permissionReadGrants: Partial<Record<PermissionId, PermissionId[]>> = {
  "orders.view": ["orders.manage", "orders.financial.manage", "orders.refund", "orders.restore"],
  "products.view": ["products.create", "products.update", "products.delete"],
  "categories.view": ["categories.manage", "categories.delete"],
  "storefront.heroes.view": ["storefront.heroes.manage", "storefront.heroes.delete"],
  "storefront.slides.view": ["storefront.slides.manage", "storefront.slides.delete"],
  "storefront.announcements.view": ["storefront.announcements.manage", "storefront.announcements.delete"],
  "coupons.view": ["coupons.manage", "coupons.delete"],
  "payment-links.view": ["payment-links.generate", "payment-links.revoke"],
  "media.view": ["media.manage", "media.delete"],
  "media.vault.view": ["media.vault.upload", "media.vault.delete"],
  "shipping.view": ["shipping.manage"],
  "billing.view": ["billing.manage"],
  "channels.view": ["channels.manage"],
  "payments.config.view": ["payments.config.manage"],
  "storefront.status.view": ["storefront.status.manage"],
  "storefront.branding.view": ["storefront.branding.manage"],
  "inventory.policies.view": ["inventory.policies.manage"],
  "raffles.settings.view": ["raffles.settings.manage"],
  "platform.settings.view": ["platform.settings.manage"],
  "users.view": ["users.create", "users.update", "users.delete", "users.permissions.manage", "users.roles.manage"],
  "messaging.view": ["messaging.manage", "messaging.send"],
  "raffles.view": [
    "raffles.manage", "raffles.results.manage", "raffles.participations.manage",
    "raffles.financial.manage", "raffles.settings.manage", "raffles.intelligence.view",
    "raffles.intelligence.manage",
  ],
  "raffles.participations.view": ["raffles.participations.manage", "raffles.financial.manage"],
  "raffles.coupons.view": ["raffles.coupons.manage", "raffles.coupons.delete"],
  "raffles.intelligence.view": ["raffles.intelligence.manage", "raffles.intelligence.export"],
  "raffles.intelligence.export": ["raffles.intelligence.manage"],
};

export function userHasPermission(permissions: readonly string[], required: PermissionId | string) {
  const normalized = new Set(normalizePermissionIds(permissions));
  if (normalized.has(required as PermissionId)) return true;
  return (permissionReadGrants[required as PermissionId] ?? []).some((permission) => normalized.has(permission));
}

export interface Setting {
  id: number;
  key: string;
  value: string | null;
  description: string | null;
  group: string;
  updated_at: Date;
}

export interface User {
  id: number;
  username: string;
  name: string;
  email: string | null;
  role: "SUPERADMIN" | "ADMIN" | "STAFF";
  receiveNotifications: boolean;
  notificationEmail: string | null;
  createdAt: Date;
  active: boolean;
}

export interface Product {
  id: number;
  type: "ITEM" | "BIRD";
  name: string;
  description: string | null;
  price: number;
  thumbnail: string | null;
  stock: number;
  ringNumber: string | null;
  age: string | null;
  purpose: string | null;
  saleStatus: "AVAILABLE" | "RESERVED" | "SOLD";
  active: boolean;
  createdAt: Date;
  updated_at: Date;
}

export interface Order {
  id: number;
  customerName: string;
  customerPhone: string;
  shippingAddress: string | null;
  shippingState: string | null;
  deliveryType: "SHIPPING" | "PICKUP";
  subtotal: number;
  shippingCost: number;
  total: number;
  status: "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  paymentMethod: "TRANSFER" | "MERCADOPAGO" | string;
  paymentStatus: "PENDING" | "APPROVED" | "FAILED" | "EXPIRED" | "CANCELLED" | "REFUNDED" | string;
  paymentExpiresAt: Date | null;
  mpPaymentId: string | null;
  mpSellerUserId: string | null;
  mpPaymentStatus: string | null;
  mpPaymentStatusDetail: string | null;
  mpPaymentMethodId: string | null;
  mpPaymentTypeId: string | null;
  mpPaidAmount: number | null;
  mpRefundId: string | null;
  mpRefundedAmount: number;
  mpRefundedAt: Date | null;
  createdAt: Date;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string | null;
  productType: "ITEM" | "BIRD";
  quantity: number;
  unitPrice: number;
}

export interface Raffle {
  id: number;
  title: string;
  description: string | null;
  ticketPrice: number;
  ticketQuantity: number;
  opportunities: number;
  distribution: "LINEAR" | "RANDOM";
  useZero: boolean;
  digits: number;
  drawDate: Date | null;
  image: string | null;
  status: "ACTIVE" | "FINISHED" | "CANCELLED";
  createdAt: Date;
}

export interface TicketSale {
  id: number;
  raffleId: number;
  ticketNumber: string;
  customerName: string;
  customerPhone: string;
  customerState: string | null;
  paymentStatus: "PENDING" | "PAID" | "CANCELLED";
  paymentMethod: string | null;
  createdAt: Date;
}
