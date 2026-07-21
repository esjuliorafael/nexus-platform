export interface Product {
  id: number;
  type: "ITEM" | "BIRD";
  name: string;
  description: string | null;
  price: string | number;
  thumbnail: string | null;
  coverAssetId: string | null;
  coverMediaUrl: string | null;
  coverPosterUrl: string | null;
  coverMediaType: "PHOTO" | "VIDEO" | null;
  stock: number;
  ringNumber: string | null;
  age: string | null;
  purpose: string | null;
  featured?: boolean;
  featuredOrder?: number | null;
  saleStatus: "AVAILABLE" | "RESERVED" | "SOLD";
  active: boolean;
  published: boolean;
  expiresAt?: string | null;
  gallery?: ProductGallery[];
}

export interface ProductGallery {
  id: number;
  productId: number;
  filePath: string;
  fileType: "PHOTO" | "VIDEO";
  assetId: string;
  mediaUrl: string;
  posterUrl: string | null;
  mediaType: "PHOTO" | "VIDEO";
  mimeType?: string;
}

export interface Setting {
  [key: string]: string | null | any;
}

export interface GroupedSettings {
  [group: string]: {
    [key: string]: string | null;
  };
}

export interface Media {
  id: number;
  title: string;
  description: string | null;
  type: "PHOTO" | "VIDEO";
  filePath: string;
  assetId: string;
  mediaUrl: string;
  posterUrl: string | null;
  mediaType: "PHOTO" | "VIDEO";
  categoryId: number | null;
  category?: {
    id: number;
    name: string;
    icon: string | null;
  } | null;
  subcategoryId: number | null;
  subcategoryIds: number[];
  subcategories: Array<{
    id: number;
    name: string;
    categoryId: number;
  }>;
  location: string | null;
  mediaDate: string | null;
}

export interface HomeSlide {
  id: number;
  type: "PHOTO" | "VIDEO";
  mediaUrl: string;
  desktopObjectPosition: string | null;
  mobileObjectPosition: string | null;
  posterUrl: string | null;
  eyebrow: string | null;
  title: string;
  description: string | null;
  displayDurationMs: number;
  primaryText: string | null;
  primaryHref: string | null;
  secondaryText: string | null;
  secondaryHref: string | null;
  sortOrder: number;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type StoreHeroScope = "ALL" | "BIRD" | "ITEM";

export interface StoreHero {
  id: number;
  scope: StoreHeroScope;
  type: "PHOTO" | "VIDEO";
  mediaUrl: string;
  posterUrl: string | null;
  desktopObjectPosition: string | null;
  mobileObjectPosition: string | null;
  title: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

export interface PublicContactChannel {
  id: number;
  type: "WHATSAPP" | "PHONE";
  phoneNumber: string;
  label: string | null;
}

export interface PublicContact {
  id: number;
  displayName: string;
  responsibility: string;
  description: string | null;
  scheduleText: string | null;
  channels: PublicContactChannel[];
}

export interface Raffle {
  id: number;
  title: string;
  description: string | null;
  ticketPrice: string | number;
  ticketQuantity: number;
  opportunities: number;
  distribution: "LINEAR" | "RANDOM";
  useZero: boolean;
  digits: number;
  drawDate: string | null;
  image: string | null;
  imageType: "PHOTO" | "VIDEO";
  imagePoster: string | null;
  prizeShippingPolicy: "INCLUDED" | "WINNER_PAYS" | null;
  status: "ACTIVE" | "FINISHED" | "CANCELLED";
  featured: boolean;
  featuredOrder: number | null;
  winningNumber: string | null;
  resultPublishedAt: string | null;
  participationStartsAt: string | null;
  participationEndsAt: string | null;
  participationState: "OPEN" | "UPCOMING" | "EARLY_ACCESS" | "CLOSED" | "UNAVAILABLE";
  earlyAccessEnabled: boolean;
  earlyAccessConfigured: boolean;
  gallery?: RaffleGalleryItem[];
  prizes?: RafflePrize[];
  extraOpportunities?: RaffleOpportunity[];
  ticketStats?: RaffleTicketStats;
}

export interface RafflePrize {
  id: number;
  position: number;
  title: string;
  description: string;
  winnerRule: string | null;
}

export interface RaffleTicketStats {
  total: number;
  available: number;
  reserved: number;
  paid: number;
  occupancyPercent: number;
  recentActivityCount: number;
  lastParticipationAt: string | null;
}

export interface RaffleRecentResult {
  id: number;
  title: string;
  image: string | null;
  imagePoster: string | null;
  drawDate: string | null;
  winningNumber: string;
  resultPublishedAt: string;
  opportunities: number;
  digits: number;
}

export interface RaffleOpportunity {
  id: number;
  raffleId: number;
  mainTicketNumber: string;
  extraOpportunities: string[];
}

export interface RaffleGalleryItem {
  id: number;
  filePath: string;
  fileType: "PHOTO" | "VIDEO";
  posterPath: string | null;
}

export type RaffleTicketAvailabilityStatus = "RESERVED" | "PAID";

export interface RaffleTicketAvailability {
  ticketNumber: string;
  status: RaffleTicketAvailabilityStatus;
}
