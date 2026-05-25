// Shared Types

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
