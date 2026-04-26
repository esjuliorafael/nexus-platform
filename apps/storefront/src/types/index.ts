export interface Product {
  id: number;
  type: 'ARTICLE' | 'BIRD';
  name: string;
  description: string | null;
  price: string | number;
  thumbnail: string | null;
  stock: number;
  ringNumber: string | null;
  age: string | null;
  purpose: string | null;
  saleStatus: 'AVAILABLE' | 'RESERVED' | 'SOLD';
  active: boolean;
  gallery?: ProductGallery[];
}

export interface ProductGallery {
  id: number;
  productId: number;
  filePath: string;
  fileType: 'PHOTO' | 'VIDEO';
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
  type: 'PHOTO' | 'VIDEO';
  filePath: string;
  categoryId: number | null;
  subcategoryId: number | null;
  location: string | null;
  mediaDate: string | null;
}

export interface Raffle {
  id: number;
  title: string;
  description: string | null;
  ticketPrice: string | number;
  ticketQuantity: number;
  opportunities: number;
  drawDate: string | null;
  image: string | null;
  status: 'ACTIVE' | 'FINISHED' | 'CANCELLED';
  gallery?: any[];
}
