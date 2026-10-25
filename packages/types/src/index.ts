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
    id: "payment-links.manage",
    group: "orders",
    label: "Generar y administrar enlaces de pago",
    description: "Genera, revoca y regenera enlaces de Checkout Pro; el enlace no reserva inventario por sí solo.",
  },
  { id: "products.view", group: "products", label: "Consultar productos" },
  { id: "products.manage", group: "products", label: "Crear, editar y eliminar productos" },
  {
    id: "categories.manage",
    group: "products",
    label: "Administrar categorías y subcategorías",
    description: "Crea y organiza categorías usadas para clasificar medios de la galería.",
  },
  {
    id: "storefront.content.manage",
    group: "storefront",
    label: "Administrar slides, heroes y avisos",
    description: "Modifica contenido público del Storefront: slides, heroes, avisos e identidad visual.",
  },
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
  {
    id: "settings.view",
    group: "configuration",
    label: "Consultar configuración del sistema",
    description: "Permite consultar ajustes globales; los valores secretos solo son visibles con permiso de edición.",
  },
  {
    id: "settings.manage",
    group: "configuration",
    label: "Cambiar configuración del sistema",
    description: "Modifica ajustes globales. La configuración general de rifas requiere un permiso aparte.",
  },
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
    description: "Crea, edita o elimina canales e integraciones asociadas; puede afectar pagos o mensajería.",
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
  { id: "coupons.manage", group: "marketing", label: "Administrar cupones de la tienda" },
  { id: "media.manage", group: "media", label: "Administrar galería y archivos multimedia" },
  { id: "media.upload", group: "media", label: "Subir archivos" },
  { id: "media.vault.manage", group: "media", label: "Administrar la bóveda de medios" },
  {
    id: "inventory.audit",
    group: "products",
    label: "Revisar y corregir inconsistencias de inventario",
    description: "Permite liberar reservas huérfanas solo si no tienen una orden vigente ni una retención activa.",
  },
  { id: "raffles.view", group: "raffles", label: "Consultar rifas" },
  { id: "raffles.manage", group: "raffles", label: "Crear, editar y publicar rifas" },
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
  { id: "raffles.coupons.manage", group: "raffles", label: "Administrar cupones de rifas" },
  {
    id: "raffles.settings.manage",
    group: "raffles",
    label: "Cambiar configuración de rifas",
    description: "Modifica parámetros generales del módulo, no los datos de una rifa individual.",
  },
  {
    id: "raffles.intelligence.view",
    group: "raffles",
    label: "Consultar inteligencia de rifas",
    description: "Muestra indicadores, segmentos y datos de participantes; incluye exportación CSV.",
  },
  {
    id: "raffles.intelligence.manage",
    group: "raffles",
    label: "Administrar audiencias de rifas",
    description: "Crea, edita y elimina audiencias guardadas; no envía campañas por sí solo.",
  },
  {
    id: "users.manage",
    group: "team",
    label: "Crear usuarios y asignar permisos",
    description: "Permite crear y editar usuarios, y asignar únicamente permisos que ya tienes.",
  },
] as const;

export type PermissionId = (typeof PERMISSIONS)[number]["id"];
export const PERMISSION_IDS = PERMISSIONS.map((permission) => permission.id) as [
  PermissionId,
  ...PermissionId[],
];

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
