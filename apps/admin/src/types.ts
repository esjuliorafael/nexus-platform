import React from "react";

export interface OrderItem {
  id: string;
  name: string;
  type: "BIRD" | "ITEM";
  price: number;
  quantity: number;
}

export interface OrderPaymentAttempt {
  id: string;
  status: string;
  statusDetail?: string | null;
  mpPaymentId?: string | null;
  retryable: boolean;
  uncertain: boolean;
  customerMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityEvent {
  id: string;
  eventType: string;
  message?: string | null;
  actorType: "USER" | "SYSTEM" | "CUSTOMER" | "MERCADO_PAGO" | string;
  actorUserId?: number | null;
  actorName?: string | null;
  actorRole?: string | null;
  origin: "ADMIN" | "SYSTEM" | "STOREFRONT" | "MERCADO_PAGO" | string;
  previousState?: Record<string, unknown> | null;
  nextState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface Order {
  id: string;
  recordType?: "ORDER" | "PAYMENT_HOLD";
  paymentHoldId?: string | null;
  customer: string;
  customerPhone?: string;
  receiverName?: string | null;
  customerState: string;
  customerAddress?: string;
  deliveryMethod?: string | null;
  shippingStreet?: string | null;
  shippingNeighborhood?: string | null;
  shippingPostalCode?: string | null;
  shippingCity?: string | null;
  items: OrderItem[];
  total: number;
  status:
    | "paid"
    | "pending"
    | "cancelled"
    | "shipped"
    | "delivered"
    | "payment_review"
    | "not_completed";
  holdStatus?: string | null;
  expiresAt?: string | null;
  paymentMethod?: "TRANSFER" | "MERCADOPAGO" | string;
  paymentStatus?:
    | "PENDING"
    | "APPROVED"
    | "FAILED"
    | "EXPIRED"
    | "CANCELLED"
    | "REFUNDED"
    | string;
  paymentExpiresAt?: string | null;
  mpPaymentId?: string | null;
  mpSellerUserId?: string | null;
  mpPaymentStatus?: string | null;
  mpPaymentStatusDetail?: string | null;
  mpPaymentMethodId?: string | null;
  mpPaymentTypeId?: string | null;
  mpPaidAmount?: number | null;
  mpRefundId?: string | null;
  mpRefundedAmount?: number | null;
  mpRefundedAt?: string | null;
  date: string;
  isRead: boolean;
  readAt?: string;
  paymentAttempts?: OrderPaymentAttempt[];
  activityEvents?: ActivityEvent[];
}

export interface WhatsAppMessageLog {
  id: string;
  status: "sent" | "failed" | string;
  errorMessage?: string | null;
  instanceName: string;
  orderId?: string | null;
  recipientPhone: string;
  sentAt: string;
  templateUsed: string;
  ticketSaleId?: number | null;
  attempt: number;
  jobId?: string | null;
  lastStatusAt?: string | null;
  messageId?: string | null;
  provider?: WhatsAppProvider;
  providerStatus?: string | null;
  responsePayload?: unknown;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  status: "available" | "reserved" | "sold";
  createdAt: string;
  imageUrl: string;
  coverAssetId?: string | null;
  coverMediaUrl?: string | null;
  coverPosterUrl?: string | null;
  coverMediaType?: "PHOTO" | "VIDEO" | null;
  coverAssetStatus?: "UPLOADING" | "PROCESSING" | "READY" | "FAILED" | null;
  thumbnail?: string;
  type: "BIRD" | "ITEM";
  ringNumber?: string;
  age?: "COCK" | "STAG" | "HEN" | "PULLET";
  purpose?: "COMBAT" | "BREEDING";
  featured?: boolean;
  featuredOrder?: number | null;
  active: boolean;
  published: boolean;
  stock?: number;
  description: string;
  gallery: ProductGalleryAsset[];
}

export interface ProductGalleryAsset {
  id?: string;
  assetId: string;
  mediaUrl: string;
  posterUrl?: string | null;
  assetStatus?: "UPLOADING" | "PROCESSING" | "READY" | "FAILED" | null;
  mediaType: "PHOTO" | "VIDEO";
  mimeType?: string;
}

export interface ProductSale {
  orderId: string;
  customerName: string;
  customerPhone: string;
  orderStatus: string;
  paymentMethod: string;
  paymentStatus: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  confirmedAt: string;
  refundedAmount: number;
  refundedAt?: string | null;
}

export interface ProductOverview {
  product: Product;
  metrics: {
    confirmedRevenue: number;
    unitsSold: number;
    confirmedOrders: number;
    activeReservations: number;
    releasedReservations: number;
    currentStock: number;
  };
  finalSale?: ProductSale | null;
  recentSales: ProductSale[];
  activityEvents: ActivityEvent[];
}

export interface Media {
  id: string;
  title: string;
  description: string;
  type: "image" | "video";
  category: string;
  categoryId?: string | number;
  subcategory: string;
  subcategoryId?: string | number;
  subcategories: Subcategory[];
  subcategoryIds: Array<string | number>;
  url: string;
  assetId: string;
  mediaUrl: string;
  posterUrl?: string | null;
  mediaType: "PHOTO" | "VIDEO";
  thumbnail?: string;
  location?: string;
  likes: number;
  isFavorite: boolean;
  createdAt: string;
}

export interface HomeSlide {
  id: string;
  assetId: string;
  type: "PHOTO" | "VIDEO";
  mediaUrl: string;
  desktopObjectPosition?: string | null;
  mobileObjectPosition?: string | null;
  posterUrl?: string | null;
  assetStatus?: "UPLOADING" | "PROCESSING" | "READY" | "FAILED" | null;
  eyebrow?: string | null;
  title: string;
  description?: string | null;
  displayDurationMs: number;
  primaryText?: string | null;
  primaryHref?: string | null;
  secondaryText?: string | null;
  secondaryHref?: string | null;
  sortOrder: number;
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type StoreHeroScope = "ALL" | "BIRD" | "ITEM";

export type CouponDiscountType = "PERCENTAGE" | "FIXED";
export type CouponScope = "ALL" | "BIRD" | "ITEM";

export interface Coupon {
  id: string;
  code: string;
  name?: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  scope: CouponScope;
  minSubtotal?: number | null;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usedCount: number;
  active: boolean;
  startsAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoreHero {
  id: string;
  scope: StoreHeroScope;
  assetId: string;
  type: "PHOTO" | "VIDEO";
  mediaUrl: string;
  desktopObjectPosition?: string | null;
  mobileObjectPosition?: string | null;
  posterUrl?: string | null;
  assetStatus?: "UPLOADING" | "PROCESSING" | "READY" | "FAILED" | null;
  title: string;
  description?: string | null;
  sortOrder: number;
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type StorefrontAnnouncementScope =
  | "GLOBAL"
  | "STORE"
  | "RAFFLES"
  | "RAFFLE"
  | "PRODUCT"
  | "STORE_CHECKOUT"
  | "RAFFLE_CHECKOUT";

export type StorefrontAnnouncementVariant =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "CRITICAL"
  | "PROMO";

export type StorefrontAnnouncementFrequency =
  | "ONCE_VISITOR"
  | "ONCE_SESSION"
  | "ALWAYS";

export interface StorefrontAnnouncement {
  id: string;
  scope: StorefrontAnnouncementScope;
  targetId?: number | null;
  presentation: "POPUP";
  variant: StorefrontAnnouncementVariant;
  frequency: StorefrontAnnouncementFrequency;
  eyebrow?: string | null;
  title: string;
  message: string;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  dismissible: boolean;
  active: boolean;
  priority: number;
  version: number;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  count?: number;
  slug?: string;
  subcategories?: Subcategory[];
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
  createdAt: string;
  receiveNotifications?: boolean;
  notificationEmail?: string;
  contactProfile?: ContactProfile | null;
  role: "superadmin" | "admin" | "staff";
}

export type ContactChannelType = "WHATSAPP" | "PHONE";

export interface ContactChannel {
  id?: string | number;
  type: ContactChannelType;
  phoneNumber: string;
  label?: string | null;
  active: boolean;
  sortOrder?: number;
}

export interface ContactProfile {
  id?: string | number;
  displayName: string;
  responsibility: string;
  description?: string | null;
  scheduleText?: string | null;
  published: boolean;
  sortOrder: number;
  channels: ContactChannel[];
}

export interface OwnProfile {
  id: string;
  username: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: "SUPERADMIN" | "ADMIN" | "STAFF";
  active: boolean;
  mustChangePassword: boolean;
  receiveNotifications: boolean;
  notificationEmail?: string | null;
  contactProfile?: ContactProfile | null;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
}

export type QuickActionGroup =
  | "Medios"
  | "Tienda"
  | "Operaciones"
  | "Diseño"
  | "Sistema"
  | "Mi Perfil"
  | "Rifas";

export interface QuickActionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  group: QuickActionGroup;
}

export type ShippingZone = "STANDARD" | "EXTENDED";

export interface StateZone {
  id: string;
  name: string;
  zone: ShippingZone;
  active: boolean;
}

export interface ShippingConfig {
  baseRate: number;
  extendedRate: number;
  freeShippingThreshold: number;
  animalSurcharge: number;
}

// --- NUEVOS TIPOS: FACTURACIÓN ---

export interface ExtraCharge {
  id: string;
  concept: string;
  amount: number;
  status: "pending" | "paid";
  date: string;
  displayOrder: number;
}

export interface AnnualService {
  id: string;
  concept: string;
  description: string;
  amount: number;
  isPaid: boolean;
  contractDate: string;
  dueDate: string;
  iconType: "globe" | "server" | "wrench" | "shield" | "default";
  displayOrder: number;
}

export interface BillingPayment {
  id: string;
  amount: number;
  paymentDate: string;
  concept: string;
  notes?: string;
  createdAt: string;
  displayOrder: number;
}

// --- NUEVOS TIPOS: PAGOS Y WHATSAPP ---

export interface BankDetails {
  bank: string;
  beneficiary: string;
  account: string;
  clabe: string;
  card: string;
}

export interface SalesChannel extends BankDetails {
  id: string;
  name: string;
  purpose: string;
}

export type TemplateType =
  | "RESERVATION"
  | "RELEASE"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_RECOVERY"
  | "RESTORED"
  | "REMINDER"
  | "OPENING"
  | "DRAW_REMINDER"
  | "RAFFLE_INVITATION"
  | "RESULT_WINNER"
  | "RESULT_PARTICIPANTS";

export interface WhatsAppTemplate {
  id: string;
  channelId?: string;
  type: TemplateType;
  content: string;
  active: boolean;
}

export interface WhatsAppDetails {
  active: boolean;
  phone: string;
  template: string; // Keep for legacy/backward compatibility if needed, but we'll prefer templates array
}

export type WhatsAppProvider = "EVOLUTION" | "KAPSO";
export type WhatsAppDeliveryStrategy =
  | "STANDARD"
  | "KAPSO_PREFERRED"
  | "EVOLUTION_ONLY";

export interface WhatsAppChannel extends WhatsAppDetails {
  id: string;
  name: string;
  purpose: string;
  provider: WhatsAppProvider;
  deliveryStrategy?: WhatsAppDeliveryStrategy;
  instanceName?: string;
  evolutionUrl?: string;
  evolutionKey?: string;
  kapsoPhoneNumberId?: string;
  kapsoBusinessAccountId?: string;
  templates?: WhatsAppTemplate[];
}

export interface DashboardStats {
  activeProducts: number;
  products?: {
    total: number;
    available: number;
    reserved: number;
    sold: number;
  };
  activeCategories: number;
  totalMedia: number;
  orders: {
    paid: { count: number; amount: number };
    pending: { count: number; amount: number };
    cancelled: { count: number; amount: number };
    totalCount: number;
    totalAmount: number;
    totalGrossAmount?: number;
    collectionRate?: number;
  };
  participations: {
    paid: { count: number; amount: number };
    pending: { count: number; amount: number };
    cancelled: { count: number; amount: number };
  };
  latestMedia: any[];
  latestProducts: any[];
  sales7Days: Record<string, number>;
  sales7DaysBySource: Record<
    string,
    { store: number; raffles: number }
  >;
  commercialPulse7Days: {
    confirmed: { count: number; amount: number };
    pending: { count: number; amount: number };
    cancelled: { count: number; amount: number };
    conversionRate: number;
  };
  commercialPulse7DaysBySource: {
    store: {
      confirmed: { count: number; amount: number };
      pending: { count: number; amount: number };
      cancelled: { count: number; amount: number };
      conversionRate: number;
    };
    raffles: {
      confirmed: { count: number; amount: number };
      pending: { count: number; amount: number };
      cancelled: { count: number; amount: number };
      conversionRate: number;
    };
  };
}

export type SalesOverviewPeriod = "TODAY" | "7D" | "15D" | "MONTH" | "ALL";
export type SalesOverviewProductType = "ALL" | "BIRD" | "ITEM";
export type SalesOverviewPaymentMethod =
  | "ALL"
  | "TRANSFER"
  | "MERCADOPAGO";

export type DashboardCommercialSource = "ALL" | "STORE" | "RAFFLES";

export interface DashboardCommercialHistoryItem {
  kind: "ORDER" | "PARTICIPATION";
  id: string;
  raffleId?: number;
  customerName: string;
  createdAt: string;
  status: "CONFIRMED" | "PENDING" | "CANCELLED";
  paymentMethod: string | null;
  amount: number;
  unitCount: number;
  summaryItems: string[];
  ticketNumbers?: string[];
}

export interface DashboardCommercialOverview {
  period: SalesOverviewPeriod;
  source: DashboardCommercialSource;
  paymentMethod: SalesOverviewPaymentMethod;
  granularity: "DAY" | "MONTH";
  range: { from: string | null; to: string };
  salesBySource: Record<string, { store: number; raffles: number }>;
  pulse: {
    confirmed: { count: number; amount: number };
    pending: { count: number; amount: number };
    cancelled: { count: number; amount: number };
    conversionRate: number;
  };
  history: DashboardCommercialHistoryItem[];
}

export interface SalesOverview {
  period: SalesOverviewPeriod;
  productType: SalesOverviewProductType;
  paymentMethod: SalesOverviewPaymentMethod;
  range: { from: string | null; to: string };
  trendRange: { from: string | null; to: string };
  comparison: {
    from: string;
    to: string;
    previousNetRevenue: number;
    percentageChange: number | null;
    direction: "UP" | "DOWN" | "FLAT" | "NEW";
  } | null;
  metricsByProductType: Record<
    SalesOverviewProductType,
    {
      netRevenue: number;
      refundedAmount: number;
      orders: number;
      units: number;
      previousNetRevenue: number;
      percentageChange: number | null;
      direction: "UP" | "DOWN" | "FLAT" | "NEW" | null;
    }
  >;
  metrics: {
    grossRevenue: number;
    refundedAmount: number;
    netRevenue: number;
    orders: number;
    unitsSold: number;
    birdsSold: number;
    itemUnitsSold: number;
    distinctProducts: number;
    ticketAverage: number;
  };
  typeBreakdown: {
    birds: { units: number; revenue: number };
    items: { units: number; revenue: number };
  };
  topProducts: Array<{
    productId: number;
    name: string;
    type: "BIRD" | "ITEM";
    units: number;
    revenue: number;
    orders: number;
  }>;
  salesByDay: Record<string, number>;
  orderHistory: Array<{
    id: number;
    customerName: string;
    customerPhone: string;
    createdAt: string;
    status: string;
    paymentMethod: string;
    total: number;
    netRevenue: number;
    refundedAmount: number;
    itemCount: number;
    itemNames: string[];
    productType: "BIRD" | "ITEM" | "MIXED";
  }>;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// --- NUEVOS TIPOS: RIFAS ---

export interface Raffle {
  id: string;
  title: string;
  description: string;
  ticketPrice: number;
  ticketQuantity: number;
  opportunities: number;
  distribution: "LINEAR" | "RANDOM";
  useZero: boolean;
  digits: number;
  drawDate?: string;
  prizeShippingPolicy?: "INCLUDED" | "WINNER_PAYS" | null;
  image?: string;
  imageType?: "PHOTO" | "VIDEO";
  imagePoster?: string | null;
  gallery?: RaffleGalleryItem[];
  prizes?: RafflePrize[];
  status: "ACTIVE" | "FINISHED" | "CANCELLED";
  published: boolean;
  featured: boolean;
  featuredOrder?: number | null;
  winningNumber?: string | null;
  resultReferenceNumber?: string | null;
  winningTicketNumber?: string | null;
  winningParticipationId?: string | null;
  resultResolutionStatus?: RaffleResultResolutionStatus | null;
  resultPublishedAt?: string | null;
  participationStartsAt?: string | null;
  participationEndsAt?: string | null;
  participationState?:
    | "OPEN"
    | "UPCOMING"
    | "EARLY_ACCESS"
    | "CLOSED"
    | "UNAVAILABLE";
  earlyAccessEnabled: boolean;
  earlyAccessConfigured?: boolean;
  createdAt: string;
  ticketStats?: {
    total: number;
    paid: number;
    pending: number;
    available: number;
  };
}

export interface RafflePrize {
  id?: number;
  position?: number;
  title: string;
  description: string;
  winnerRule?: string | null;
  resultSource: "MAJOR_PRIZE" | "SECOND_PRIZE" | "THIRD_PRIZE" | "CUSTOM";
  resultSourceLabel?: string | null;
  resultReferenceNumber?: string | null;
  winningNumber?: string | null;
  winningTicketNumber?: string | null;
  winningParticipationId?: string | null;
  resultResolutionStatus?: RaffleResultResolutionStatus | null;
  resultPublishedAt?: string | null;
  fulfillmentStatus?: RafflePrizeFulfillmentStatus | null;
  fulfillmentUpdatedAt?: string | null;
  fulfillmentUpdatedBy?: number | null;
  fulfillmentNotes?: string | null;
}

export type RafflePrizeFulfillmentStatus =
  | "PENDING_CONTACT"
  | "CONTACTED"
  | "DELIVERY_COORDINATED"
  | "DELIVERED"
  | "NOT_CLAIMED"
  | "NOT_APPLICABLE";

export interface RaffleGalleryItem {
  id?: number;
  filePath: string;
  fileType: "PHOTO" | "VIDEO";
  posterPath?: string | null;
}

export type RaffleParticipationStatus =
  | "PENDING"
  | "PAID"
  | "CANCELLED"
  | "MIXED"
  | "PAYMENT_REVIEW"
  | "NOT_COMPLETED";

export interface RafflePaymentAttempt {
  id: string;
  status: string;
  statusDetail?: string | null;
  mpPaymentId?: string | null;
  retryable: boolean;
  uncertain: boolean;
  customerMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RaffleParticipationTicket {
  id: number;
  number: string;
  opportunities: string[];
}

export interface RaffleParticipation {
  id: string;
  recordType?: "PARTICIPATION" | "PAYMENT_HOLD";
  reservationId?: string | null;
  paymentHoldId?: string | null;
  raffleId: number;
  raffleTitle: string;
  raffleImage?: string | null;
  raffleOpportunities: number;
  customerName: string;
  customerPhone: string;
  customerState?: string | null;
  ticketNumbers: string[];
  ticketCount: number;
  ticketPrice: number;
  subtotal: number;
  discountTotal: number;
  total: number;
  couponCode?: string | null;
  paymentMethod: "TRANSFER" | "MERCADOPAGO" | string;
  mpPaymentId?: string | null;
  mpSellerUserId?: string | null;
  mpPaymentStatus?: string | null;
  mpPaymentStatusDetail?: string | null;
  mpPaymentMethodId?: string | null;
  mpPaymentTypeId?: string | null;
  mpPaidAmount?: number | null;
  mpRefundId?: string | null;
  mpRefundedAmount?: number | null;
  mpRefundedAt?: string | null;
  holdStatus?: string | null;
  expiresAt?: string | null;
  status: RaffleParticipationStatus;
  createdAt: string;
  ticketSaleIds: number[];
  tickets?: RaffleParticipationTicket[];
  paymentAttempts?: RafflePaymentAttempt[];
  whatsappLogs?: WhatsAppMessageLog[];
  activityEvents?: ActivityEvent[];
}

export type RaffleOperationalTicketStatus =
  | "available"
  | "reserved"
  | "paid"
  | "review";

export interface RaffleOperationalOverview {
  raffleId: number;
  metrics: {
    paid: number;
    reserved: number;
    review: number;
    occupied: number;
    available: number;
    revenue: number;
    occupancy: number;
  };
  ticketStatuses: Array<{
    ticketNumber: string;
    status: Exclude<RaffleOperationalTicketStatus, "available">;
    participationId: string;
  }>;
  recentParticipations: RaffleParticipation[];
  participationHistory: RaffleParticipation[];
  updatedAt: string;
}

export type RaffleResultResolutionStatus =
  | "ELIGIBLE_WINNER"
  | "UNPAID_RESERVED"
  | "PAYMENT_REVIEW"
  | "UNASSIGNED_NUMBER"
  | "OUTSIDE_UNIVERSE";

export interface RafflePrizeResultPreview {
  prizeId: number;
  position: number;
  title: string;
  resultSource: RafflePrize["resultSource"];
  resultSourceLabel: string | null;
  referenceNumber: string;
  winningNumber: string;
  winningTicketNumber: string | null;
  winningParticipationId: string | null;
  resolutionStatus: RaffleResultResolutionStatus;
  canPublish: boolean;
  participant: {
    name: string;
    phone: string;
    state?: string | null;
    paymentStatus: string;
  } | null;
}

export interface RaffleResultPreview {
  raffleId: number;
  prizes: RafflePrizeResultPreview[];
  duplicateWinningTickets: string[];
  canPublish: boolean;
}

export interface RaffleResultAdmin {
  raffleId: number;
  resultPublishedAt: string | null;
  prizes: Array<
    Omit<
      RafflePrizeResultPreview,
      "referenceNumber" | "winningNumber" | "resolutionStatus" | "canPublish"
    > & {
      referenceNumber: string | null;
      draftReferenceNumber: string | null;
      winningNumber: string | null;
      resolutionStatus: RaffleResultResolutionStatus | null;
      fulfillmentStatus: RafflePrizeFulfillmentStatus | null;
      fulfillmentUpdatedAt: string | null;
      fulfillmentUpdatedBy: number | null;
      fulfillmentNotes: string | null;
    }
  >;
  events: ActivityEvent[];
}

export type RaffleResultCampaignAudience = "WINNERS" | "PARTICIPANTS";
export type RaffleResultCampaignStatus =
  | "QUEUED"
  | "PROCESSING"
  | "PARTIAL"
  | "SENT"
  | "FAILED"
  | "EMPTY";
export type RaffleResultRecipientStatus =
  | "PENDING"
  | "PROCESSING"
  | "SENT"
  | "FAILED";

export interface RaffleResultCampaignRecipient {
  id: string;
  phone: string;
  customerName: string;
  participationIds: string[];
  status: RaffleResultRecipientStatus;
  attempts: number;
  lastError: string | null;
  messageLogId: number | null;
  sentAt: string | null;
  messageLog?: {
    id: number;
    status: string;
    providerStatus: string | null;
    provider: "EVOLUTION" | "KAPSO";
    errorMessage: string | null;
    sentAt: string;
  } | null;
}

export interface RaffleResultCampaign {
  id: string;
  audience: RaffleResultCampaignAudience;
  status: RaffleResultCampaignStatus;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  deliveredCount: number;
  providerFailedCount: number;
  acceptedCount: number;
  initiatedByName: string | null;
  initiatedByRole: string | null;
  completedAt: string | null;
  createdAt: string;
  recipients: RaffleResultCampaignRecipient[];
}

export interface RaffleResultCommunicationOverview {
  raffleId: number;
  resultPublishedAt: string | null;
  prizes: RafflePrize[];
  audienceEstimates: Array<{
    audience: RaffleResultCampaignAudience;
    totalRecipients: number;
    invalidRecipients: number;
    templateConfigured: boolean;
  }>;
  campaigns: RaffleResultCampaign[];
}

export interface RaffleDrawReminderCampaign {
  id: string;
  status: RaffleResultCampaignStatus;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  scheduledFor: string | null;
  initiatedByName: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface RaffleDrawReminderOverview {
  raffleId: number;
  drawDate: string | null;
  templateConfigured: boolean;
  totalRecipients: number;
  invalidRecipients: number;
  campaign: RaffleDrawReminderCampaign | null;
}

export type RaffleParticipantSegment =
  | "VIP_PAYERS"
  | "REPEAT_ACTIVE"
  | "HIGH_VOLUME"
  | "PROMISING_NEW"
  | "DORMANT"
  | "NON_PAYER"
  | "LOW_ACTIVITY";

export interface RaffleParticipantIntelligence {
  phone: string;
  displayName: string;
  state: string;
  rafflesParticipated: number;
  ticketsReserved: number;
  ticketsPaid: number;
  ticketsPending: number;
  ticketsCancelled: number;
  paymentRate: number;
  estimatedRevenue: number;
  firstSeenAt: string;
  lastSeenAt: string;
  averageTicketsPerRaffle: number;
  segment: RaffleParticipantSegment;
  score: number;
}

export interface RaffleIntelligenceOverview {
  uniqueParticipants: number;
  totalReservedTickets: number;
  totalPaidTickets: number;
  paymentConversionRate: number;
  estimatedRevenue: number;
  averageTicketsPerParticipant: number;
  repeatParticipants: number;
  dormantParticipants: number;
  nonPayers: number;
  topStates: Array<{
    state: string;
    participants: number;
    paidTickets: number;
    revenue: number;
  }>;
  topRaffles: Array<{
    id: string;
    title: string;
    paidTickets: number;
    reservedTickets: number;
    revenue: number;
  }>;
}

export interface RaffleIntelligenceSegment {
  segment: RaffleParticipantSegment;
  size: number;
  paidTickets: number;
  reservedTickets: number;
  estimatedRevenue: number;
  latestActivity: string | null;
  paymentRate: number;
}

export interface RaffleAudienceRules {
  minPaidParticipations?: number;
  paidInRaffleId?: number;
  minPaidTickets?: number;
  minNetRevenue?: number;
  maxDaysSinceLastPaid?: number;
  maxPaymentSpeedPercentile?: number;
  paymentMethods?: Array<"TRANSFER" | "MERCADOPAGO">;
  states?: string[];
  countries?: Array<"MX" | "US" | "GT">;
  winnerOnly?: boolean;
  openingSubscriberOnly?: boolean;
}

export interface RaffleAudience {
  id: string;
  name: string;
  description: string | null;
  rules: RaffleAudienceRules;
  active: boolean;
  createdByUserId: number | null;
  createdByName: string | null;
  createdByRole: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RaffleAudienceProfile {
  phone: string;
  displayName: string;
  state: string;
  country: "MX" | "US" | "GT" | null;
  sourceParticipations: number;
  paidParticipations: number;
  paidTickets: number;
  netRevenue: number;
  paymentMethods: Array<"TRANSFER" | "MERCADOPAGO">;
  averagePaymentHours: number | null;
  paymentSpeedPercentile: number | null;
  lastPaidAt: string | null;
  consentStatus: "UNKNOWN" | "GRANTED" | "OPTED_OUT";
}

export interface RaffleAudiencePreview {
  summary: {
    profilesAnalyzed: number;
    duplicatesRemoved: number;
    audienceMatched: number;
    eligible: number;
    excluded: number;
    exclusions: {
      noConsent: number;
      optedOut: number;
      invalidPhone: number;
      alreadyParticipating: number;
      recentlyContacted: number;
    };
  };
  sample: RaffleAudienceProfile[];
}

export interface RaffleInvitationRecipient {
  id: string;
  phone: string;
  customerName: string;
  status: RaffleResultRecipientStatus;
  attempts: number;
  lastError: string | null;
  messageLogId: number | null;
  sentAt: string | null;
  messageLog?: {
    id: number;
    status: string;
    providerStatus: string | null;
    provider: "EVOLUTION" | "KAPSO";
    errorMessage: string | null;
    sentAt: string;
  } | null;
}

export interface RaffleInvitationCampaign {
  id: string;
  audienceId: string | null;
  audienceName: string;
  frequencyWindowDays: number;
  status: RaffleResultCampaignStatus;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  initiatedByName: string | null;
  initiatedByRole: string | null;
  completedAt: string | null;
  createdAt: string;
  recipients: RaffleInvitationRecipient[];
}

export interface RaffleInvitationOverview {
  raffleId: number;
  audience: {
    id: string | null;
    name: string;
    rules: RaffleAudienceRules;
  };
  preview: RaffleAudiencePreview;
  campaigns: RaffleInvitationCampaign[];
}

export interface ChannelReadiness {
  ready: boolean;
}

export interface ChannelBankStatus extends ChannelReadiness {
  bank: string;
  beneficiary: string;
  account: string;
  clabe: string;
  card: string;
}

export interface ChannelMercadoPagoStatus extends ChannelReadiness {
  userId: string;
}

export interface ChannelWhatsappStatus extends ChannelReadiness {
  phone?: string;
  active?: boolean;
  provider?: WhatsAppProvider;
  instanceName: string;
  kapsoPhoneNumberId?: string;
  kapsoBusinessAccountId?: string;
}

export interface ChannelTemplateStatus extends ChannelReadiness {
  count?: number;
  storeCount?: number;
  raffleCount?: number;
}

export interface PrincipalChannelOverview {
  id: "principal";
  name: string;
  purpose: "PRINCIPAL";
  bank: ChannelBankStatus;
  mercadoPago: ChannelMercadoPagoStatus;
  whatsapp: ChannelWhatsappStatus;
  templates: ChannelTemplateStatus;
  readyCount: number;
}

export interface SpecializedChannelOverview {
  id: string;
  name: string;
  purpose: string;
  label: string;
  description: string;
  paymentChannelId: string | null;
  whatsappChannelId: string | null;
  bank: ChannelBankStatus;
  mercadoPago: ChannelMercadoPagoStatus;
  whatsapp: ChannelWhatsappStatus;
  templates: ChannelTemplateStatus;
  readyCount: number;
  usesPrincipalFallback: boolean;
}

export interface ChannelsOverview {
  principal: PrincipalChannelOverview;
  specialized: SpecializedChannelOverview[];
  metrics: {
    specializedCount: number;
    whatsappRoutes: number;
    mercadoPagoRoutes: number;
  };
  deliveryMatrix: Array<{
    flow: string;
    route: string;
    detail: string;
  }>;
}
