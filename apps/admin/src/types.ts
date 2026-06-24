import React from "react";

export interface OrderItem {
  id: string;
  name: string;
  type: "BIRD" | "ITEM";
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  customer: string;
  customerPhone?: string;
  customerState: string;
  customerAddress?: string;
  items: OrderItem[];
  total: number;
  status: "paid" | "pending" | "cancelled" | "shipped" | "delivered";
  date: string;
  isRead: boolean;
  readAt?: string;
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
  | "Órdenes"
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
}

export interface BillingPayment {
  id: string;
  amount: number;
  paymentDate: string;
  concept: string;
  notes?: string;
  createdAt: string;
}

// --- NUEVOS TIPOS: PAGOS Y WHATSAPP ---

export interface BankDetails {
  bank: string;
  beneficiary: string;
  clabe: string;
  card: string;
}

export interface SalesChannel extends BankDetails {
  id: string;
  name: string;
  purpose: string;
}

export type TemplateType = "RESERVATION" | "RELEASE" | "PAYMENT_CONFIRMED";

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

export interface WhatsAppChannel extends WhatsAppDetails {
  id: string;
  name: string;
  purpose: string;
  instanceName?: string;
  evolutionUrl?: string;
  evolutionKey?: string;
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
  latestMedia: any[];
  latestProducts: any[];
  sales7Days: Record<string, number>;
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
  image?: string;
  status: "ACTIVE" | "FINISHED" | "CANCELLED";
  createdAt: string;
  ticketStats?: {
    total: number;
    paid: number;
    pending: number;
    available: number;
  };
}

export interface TicketSale {
  id: string;
  raffleId: string;
  ticketNumber: string;
  customerName: string;
  customerPhone: string;
  customerState?: string;
  status: "PENDING" | "PAID" | "CANCELLED";
  paymentMethod?: string;
  createdAt: string;
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

export interface ChannelReadiness {
  ready: boolean;
}

export interface ChannelBankStatus extends ChannelReadiness {
  bank: string;
  beneficiary: string;
  clabe: string;
  card: string;
}

export interface ChannelMercadoPagoStatus extends ChannelReadiness {
  userId: string;
}

export interface ChannelWhatsappStatus extends ChannelReadiness {
  phone?: string;
  active?: boolean;
  instanceName: string;
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
