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
  useZero: boolean;
  digits: number;
  drawDate: string | null;
  image: string | null;
  status: "ACTIVE" | "FINISHED" | "CANCELLED";
  gallery?: any[];
}
