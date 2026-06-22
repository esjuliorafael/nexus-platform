export interface Product {
  id: number;
  type: "ITEM" | "BIRD";
  name: string;
  description: string | null;
  price: string | number;
  thumbnail: string | null;
  stock: number;
  ringNumber: string | null;
  age: string | null;
  purpose: string | null;
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
  categoryId: number | null;
  subcategoryId: number | null;
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
