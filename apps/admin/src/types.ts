import React from 'react';

export interface OrderItem {
  id: string;
  name: string;
  type: 'ave' | 'articulo';
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
  status: 'paid' | 'pending' | 'cancelled' | 'shipped' | 'delivered';
  date: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  status: 'available' | 'reserved' | 'sold';
  createdAt: string;
  imageUrl: string;
  type: 'ave' | 'articulo';
  ringNumber?: string;
  age?: 'gallina' | 'gallo' | 'polla' | 'pollo';
  purpose?: 'combate' | 'cria';
  stock?: number;
  description: string;
  gallery: string[];
}

export interface Media {
  id: string;
  title: string;
  description: string;
  type: 'image' | 'video';
  category: string;
  categoryId?: string | number; 
  subcategory: string;
  subcategoryId?: string | number;
  url: string;
  thumbnail?: string;
  location?: string;
  likes: number;
  isFavorite: boolean;
  createdAt: string; 
}

export interface Subcategory {
  id: string;
  nombre: string;
  categoria_id: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  count?: number;
  slug?: string;
  subcategorias?: Subcategory[];
}

export interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  receiveNotifications?: boolean;
  notificationEmail?: string;
  role: 'superadmin' | 'admin' | 'staff';
}

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

export type QuickActionGroup = 'Galería' | 'Tienda' | 'Órdenes' | 'Diseño' | 'Sistema';

export interface QuickActionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  group: QuickActionGroup;
}

export type ShippingZone = 'normal' | 'extendida';

export interface StateZone {
  id: string;
  name: string;
  zone: ShippingZone;
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
  status: 'pending' | 'paid';
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
  iconType: 'globe' | 'server' | 'wrench' | 'shield' | 'default';
}

// --- NUEVOS TIPOS: PAGOS Y WHATSAPP ---

export interface BankDetails {
  bankName: string;
  beneficiary: string;
  clabe: string;
  cardNumber: string;
}

export interface SalesChannel extends BankDetails {
  id: string;
  name: string;
  purposeKey: string;
}

export interface WhatsAppDetails {
  active: boolean;
  phoneNumber: string;
  template: string;
}

export interface WhatsAppChannel extends WhatsAppDetails {
  id: string;
  name: string;
  purposeKey: string;
}

export interface DashboardStats {
  activeProducts: number;
  activeCategories: number;
  totalMedia: number;
  orders: {
    paid: { count: number; amount: number };
    pending: { count: number; amount: number };
    cancelled: { count: number; amount: number };
    totalCount: number;
    totalAmount: number;
  };
  latestMedia: any[];
  latestProducts: any[];
  sales7Days: Record<string, number>;
}