import axios from "axios";
import {
  Order,
  Product,
  Media,
  User,
  Category,
  StateZone,
  SalesChannel,
  WhatsAppChannel,
  DashboardStats,
  AnnualService,
  ExtraCharge,
  Raffle,
  TicketSale,
  BillingPayment,
  TemplateType,
  RaffleIntelligenceOverview,
  RaffleIntelligenceSegment,
  RaffleParticipantIntelligence,
  ChannelsOverview,
  HomeSlide,
  StoreHero,
  StoreHeroScope,
  Coupon,
  OwnProfile,
  WhatsAppMessageLog,
} from "./types";

// Derive API URL dynamically based on current domain if not explicitly provided via ENV
// Pattern: admin.domain.com -> api.domain.com
const getDynamicApiUrl = () => {
  if (typeof window === "undefined") return "http://localhost:3001/api/v1";

  const { hostname, protocol, port } = window.location;

  // Local development fallback
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return import.meta.env.VITE_API_URL || `http://${hostname}:3001/api/v1`;
  }

  // Multi-tenant production pattern: admin.[client-domain] -> api.[client-domain]
  if (hostname.startsWith("admin.")) {
    const rootDomain = hostname.replace("admin.", "");
    return `${protocol}//api.${rootDomain}/api/v1`;
  }

  // Fallback to Env or relative path (risky for different subdomains but useful as last resort)
  return (
    import.meta.env.VITE_API_URL ||
    `${protocol}//${hostname}${port ? `:${port}` : ""}/api/v1`
  );
};

const API_BASE_URL = import.meta.env.VITE_API_URL || getDynamicApiUrl();

// Media assets base URL - Derived from API URL by default
const getDynamicAssetUrl = () => {
  return API_BASE_URL.replace("/api/v1", "/");
};

export const ASSET_BASE_URL =
  import.meta.env.VITE_ASSET_BASE_URL || getDynamicAssetUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export const apiMercadoPago = {
  getAuthUrl: async (channelId?: string | number): Promise<string> => {
    const query = channelId ? `?channelId=${encodeURIComponent(String(channelId))}` : "";
    const res = await api.get(`/mp/auth-url${query}`);
    return res.data.url;
  },
  disconnectMain: async (): Promise<{ success: boolean }> => {
    const res = await api.post("/mp/disconnect-main");
    return res.data;
  },
};

export interface MediaUploadResult {
  assetId: string;
  status: "UPLOADING" | "PROCESSING" | "READY" | "FAILED";
  type: "PHOTO" | "VIDEO";
  mimeType: string;
  url: string | null;
  posterUrl: string | null;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  error: string | null;
}

export interface DirectUploadResult {
  asset: MediaUploadResult;
  uploadUrl: string;
  expiresInSeconds: number;
}

api.interceptors.request.use((config) => {
  try {
    const session = localStorage.getItem("admin_session");
    if (session) {
      const { token } = JSON.parse(session);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch (e) {
    // ignore parse errors
  }
  return config;
});

export const apiUpload = {
  createDirectVideoUpload: async (file: File): Promise<DirectUploadResult> => {
    const res = await api.post("/admin/uploads/direct", {
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    return {
      ...res.data,
      asset: normalizeUploadResult(res.data.asset),
    } as DirectUploadResult;
  },
  uploadToSignedUrl: async (
    uploadUrl: string,
    file: File,
    onProgress?: (progress: number) => void,
  ) => {
    await axios.put(uploadUrl, file, {
      headers: {
        "Content-Type": file.type,
      },
      onUploadProgress: (event) => {
        if (!event.total) return;
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      },
    });
  },
  completeDirectUpload: async (assetId: string): Promise<MediaUploadResult> => {
    const res = await api.post(`/admin/uploads/${assetId}/complete`);
    return normalizeUploadResult(res.data);
  },
  upload: async (file: File): Promise<MediaUploadResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post("/admin/uploads", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    let asset = normalizeUploadResult(res.data);
    const deadline = Date.now() + 5 * 60 * 1000;

    while (asset.status === "PROCESSING" && Date.now() < deadline) {
      await new Promise((resolve) => window.setTimeout(resolve, 1200));
      const statusResponse = await api.get(`/admin/uploads/${asset.assetId}`);
      asset = normalizeUploadResult(statusResponse.data);
    }

    if (asset.status === "FAILED") {
      await api
        .delete(`/admin/uploads/${asset.assetId}`)
        .catch(() => undefined);
      throw new Error(asset.error || "No se pudo procesar el video.");
    }
    if (asset.status !== "READY" || !asset.url) {
      throw new Error(
        "El procesamiento del medio excedio el tiempo permitido.",
      );
    }

    return asset;
  },
  remove: async (assetId: string) => api.delete(`/admin/uploads/${assetId}`),
};

function normalizeUploadResult(data: any): MediaUploadResult {
  return {
    assetId: data.assetId || data.id,
    status: data.status,
    type: data.type || data.mediaType,
    mimeType: data.mimeType,
    url: data.url ?? data.mediaUrl ?? null,
    posterUrl: data.posterUrl ?? null,
    durationMs: data.durationMs ?? null,
    width: data.width ?? null,
    height: data.height ?? null,
    error: data.error ?? data.errorMessage ?? null,
  };
}

export const apiDashboard = {
  getStats: async (): Promise<DashboardStats> => {
    const res = await api.get("/admin/dashboard/stats");
    return res.data;
  },
};

export const apiAuth = {
  login: async (credentials: { username: string; password: string }) => {
    const res = await api.post("/auth/login", credentials);
    return res.data;
  },
  me: async () => {
    const res = await api.get("/auth/me");
    return res.data;
  },
  setupAccount: async (password: string) => {
    const res = await api.post("/auth/setup-account", { password });
    return res.data;
  },
  getProfile: async (): Promise<OwnProfile> => {
    const res = await api.get("/auth/me/profile");
    return { ...res.data, id: res.data.id.toString() };
  },
  updateProfile: async (data: {
    name: string;
    username: string;
    email?: string | null;
    phone?: string | null;
  }): Promise<OwnProfile> => {
    const res = await api.put("/auth/me/profile", data);
    return { ...res.data, id: res.data.id.toString() };
  },
  updateNotifications: async (data: {
    receiveNotifications: boolean;
    notificationEmail?: string | null;
  }): Promise<OwnProfile> => {
    const res = await api.put("/auth/me/notifications", data);
    return { ...res.data, id: res.data.id.toString() };
  },
  updateContact: async (data: any): Promise<OwnProfile> => {
    const res = await api.put("/auth/me/contact", data);
    return { ...res.data, id: res.data.id.toString() };
  },
  changePassword: async (currentPassword: string, newPassword: string) => {
    const res = await api.put("/auth/me/password", { currentPassword, newPassword });
    return res.data;
  },
};

export const apiProducts = {
  getAll: async (): Promise<Product[]> => {
    const res = await api.get("/admin/products");
    return res.data.map((item: any) => ({
      id: item.id.toString(),
      name: item.name,
      price: parseFloat(item.price),
      status: mapStatusDBtoFront(item.stock, item.saleStatus, item.type),
      type: mapProductType(item.type),
      stock: item.stock,
      ringNumber: item.ringNumber || undefined,
      age: item.age || undefined,
      purpose: item.purpose || undefined,
      featured: Boolean(item.featured),
      featuredOrder: item.featuredOrder ?? null,
      active: item.active !== false,
      published: item.published !== false,
      description: item.description || "",
      imageUrl: item.thumbnail || "",
      thumbnail: item.thumbnail || "",
      coverAssetId: item.coverAssetId,
      coverMediaUrl: item.coverMediaUrl,
      coverPosterUrl: item.coverPosterUrl,
      coverMediaType: item.coverMediaType,
      coverAssetStatus: item.coverAssetStatus,
      gallery: item.gallery
        ? item.gallery.map((g: any) => ({
            id: g.id?.toString(),
            assetId: g.assetId,
            mediaUrl: g.mediaUrl,
            posterUrl: g.posterUrl,
            mediaType: g.mediaType,
            mimeType: g.mimeType,
          }))
        : [],
      createdAt: item.createdAt,
    }));
  },
  create: async (data: any) => {
    return api.post("/admin/products", data);
  },
  update: async (id: string, data: any) => {
    return api.put(`/admin/products/${id}`, data);
  },
  updateStatus: async (id: string, status: string) => {
    return api.patch(`/admin/products/${id}/status`, {
      saleStatus: status.toUpperCase(),
    });
  },
  delete: async (id: string) => {
    return api.delete(`/admin/products/${id}`);
  },
};

export const apiGallery = {
  getAll: async (): Promise<Media[]> => {
    const res = await api.get("/admin/media");
    return res.data.map((item: any) => {
      const subcategories = Array.isArray(item.subcategories)
        ? item.subcategories
        : item.subcategory
          ? [item.subcategory]
          : [];
      return {
        id: item.id.toString(),
        title: item.title,
        description: item.description,
        type: item.mediaType === "PHOTO" ? "image" : "video",
        assetId: item.assetId,
        mediaUrl: item.mediaUrl,
        posterUrl: item.posterUrl,
        assetStatus: item.assetStatus,
        mediaType: item.mediaType,
        url: item.mediaUrl,
        thumbnail: item.posterUrl || undefined,
        category: item.category?.name,
        categoryId: item.categoryId,
        subcategory: subcategories.map((sub: any) => sub.name).join(", "),
        subcategoryId: subcategories[0]?.id,
        subcategories: subcategories.map((sub: any) => ({
          id: sub.id.toString(),
          name: sub.name,
          categoryId: sub.categoryId.toString(),
        })),
        subcategoryIds: subcategories.map((sub: any) => sub.id.toString()),
        location: item.location || "",
        likes: item.likes || 0,
        createdAt: item.mediaDate || item.createdAt,
      };
    });
  },
  create: async (data: any) => {
    return api.post("/admin/media", data);
  },
  update: async (id: string, data: any) => {
    return api.put(`/admin/media/${id}`, data);
  },
  delete: async (id: string) => {
    return api.delete(`/admin/media/${id}`);
  },
};

const mapHomeSlide = (item: any): HomeSlide => ({
  ...item,
  id: item.id.toString(),
  sortOrder: Number(item.sortOrder || 0),
  displayDurationMs: Number(item.displayDurationMs || 8000),
});

export const apiHomeSlides = {
  getAll: async (): Promise<HomeSlide[]> => {
    const res = await api.get("/admin/home-slides");
    return res.data.map(mapHomeSlide);
  },
  create: async (data: Partial<HomeSlide>) => {
    const res = await api.post("/admin/home-slides", data);
    return mapHomeSlide(res.data);
  },
  update: async (id: string, data: Partial<HomeSlide>) => {
    const res = await api.put(`/admin/home-slides/${id}`, data);
    return mapHomeSlide(res.data);
  },
  reorder: async (ids: string[]): Promise<HomeSlide[]> => {
    const res = await api.put("/admin/home-slides/reorder", { ids });
    return res.data.map(mapHomeSlide);
  },
  delete: async (id: string) => {
    return api.delete(`/admin/home-slides/${id}`);
  },
};

const mapStoreHero = (item: any): StoreHero => ({
  ...item,
  id: item.id.toString(),
  sortOrder: Number(item.sortOrder || 0),
});

export const apiStoreHeroes = {
  getAll: async (scope?: StoreHeroScope): Promise<StoreHero[]> => {
    const res = await api.get("/admin/store-heroes", {
      params: scope ? { scope } : undefined,
    });
    return res.data.map(mapStoreHero);
  },
  create: async (data: Partial<StoreHero>) => {
    const res = await api.post("/admin/store-heroes", data);
    return mapStoreHero(res.data);
  },
  update: async (id: string, data: Partial<StoreHero>) => {
    const res = await api.put(`/admin/store-heroes/${id}`, data);
    return mapStoreHero(res.data);
  },
  reorder: async (scope: StoreHeroScope, ids: string[]): Promise<StoreHero[]> => {
    const res = await api.put("/admin/store-heroes/reorder", { scope, ids });
    return res.data.map(mapStoreHero);
  },
  delete: async (id: string) => {
    return api.delete(`/admin/store-heroes/${id}`);
  },
};

const mapNullableNumber = (value: any) =>
  value === null || value === undefined || value === "" ? null : Number(value);

const mapCoupon = (item: any): Coupon => ({
  ...item,
  id: item.id.toString(),
  discountValue: Number(item.discountValue || 0),
  minSubtotal: mapNullableNumber(item.minSubtotal),
  maxDiscount: mapNullableNumber(item.maxDiscount),
  usageLimit: item.usageLimit ?? null,
  usedCount: Number(item.usedCount || 0),
  active: item.active !== false,
});

export const apiCoupons = {
  getAll: async (): Promise<Coupon[]> => {
    const res = await api.get("/admin/coupons");
    return res.data.map(mapCoupon);
  },
  create: async (data: Partial<Coupon>) => {
    const res = await api.post("/admin/coupons", data);
    return mapCoupon(res.data);
  },
  update: async (id: string, data: Partial<Coupon>) => {
    const res = await api.put(`/admin/coupons/${id}`, data);
    return mapCoupon(res.data);
  },
  delete: async (id: string) => {
    return api.delete(`/admin/coupons/${id}`);
  },
};

export const apiCategories = {
  getAll: async (): Promise<Category[]> => {
    const res = await api.get("/admin/categories");
    return res.data.map((item: any) => ({
      id: item.id.toString(),
      name: item.name,
      icon: item.icon || "folder",
      subcategories: item.subcategories
        ? item.subcategories.map((s: any) => ({
            id: s.id.toString(),
            name: s.name,
            categoryId: s.categoryId.toString(),
          }))
        : [],
      count: 0,
    }));
  },
  create: async (data: any) => api.post("/admin/categories", data),
  update: async (id: string, data: any) =>
    api.put(`/admin/categories/${id}`, data),
  delete: async (id: string) => api.delete(`/admin/categories/${id}`),
};

export const apiOrders = {
  getAll: async (): Promise<Order[]> => {
    const res = await api.get("/store/orders/admin");
    return res.data.map((item: any) => mapOrderResponse(item));
  },
  updateStatus: async (id: string, status: string): Promise<Order> => {
    const res = await api.patch(`/store/orders/admin/${id}/status`, { status });
    return mapOrderResponse(res.data);
  },
  cancel: async (id: string) => {
    return api.delete(`/store/orders/admin/${id}`);
  },
  restore: async (id: string): Promise<Order> => {
    const res = await api.post(`/store/orders/admin/${id}/restore`);
    return mapOrderResponse(res.data);
  },
  delete: async (id: string) => {
    return api.delete(`/store/orders/admin/${id}`);
  },
  resendWhatsApp: async (id: string) => {
    return api.post(`/store/orders/admin/${id}/resend-whatsapp`);
  },
  refundMercadoPago: async (id: string): Promise<Order> => {
    const res = await api.post(`/store/orders/admin/${id}/refund`);
    return mapOrderResponse(res.data);
  },
  updateCustomer: async (
    id: string,
    data: { customerName: string; customerPhone: string; shippingState?: string | null },
  ): Promise<Order> => {
    const res = await api.patch(`/store/orders/admin/${id}/customer`, data);
    return mapOrderResponse(res.data);
  },
  getWhatsAppLogs: async (id: string): Promise<WhatsAppMessageLog[]> => {
    const res = await api.get(`/store/orders/admin/${id}/whatsapp-logs`);
    return res.data.map((item: any) => ({
      id: item.id.toString(),
      status: item.status,
      errorMessage: item.errorMessage,
      instanceName: item.instanceName,
      orderId: item.orderId,
      recipientPhone: item.recipientPhone,
      sentAt: item.sentAt,
      templateUsed: item.templateUsed,
      ticketSaleId: item.ticketSaleId,
      attempt: item.attempt ?? 1,
      jobId: item.jobId,
      lastStatusAt: item.lastStatusAt,
      messageId: item.messageId,
      providerStatus: item.providerStatus,
    }));
  },
  markRead: async (ids: string[]) => {
    return api.post("/store/orders/admin/read", {
      ids: ids.map((id) => Number(id)),
    });
  },
};

export const apiBilling = {
  getAll: async (): Promise<{
    services: AnnualService[];
    charges: ExtraCharge[];
    payments: BillingPayment[];
  }> => {
    const [services, charges, payments] = await Promise.all([
      api.get("/admin/billing/annual-services"),
      api.get("/admin/billing/extra-charges"),
      api.get("/admin/billing/payments"),
    ]);

    return {
      services: services.data.map((s: any) => ({
        id: s.id.toString(),
        concept: s.concept,
        description: s.description || "",
        amount: parseFloat(s.amount),
        isPaid: s.isPaid,
        contractDate: s.contractDate || "",
        dueDate: s.expirationDate || "",
        iconType: s.iconType,
        displayOrder: s.displayOrder ?? 0,
      })),
      charges: charges.data.map((c: any) => ({
        id: c.id.toString(),
        concept: c.concept,
        amount: parseFloat(c.amount),
        status: c.isPaid ? "paid" : "pending",
        date: c.chargeDate,
        displayOrder: c.displayOrder ?? 0,
      })),
      payments: payments.data.map((p: any) => ({
        id: p.id.toString(),
        amount: parseFloat(p.amount),
        paymentDate: p.paymentDate,
        concept: p.concept,
        notes: p.notes || "",
        createdAt: p.createdAt,
        displayOrder: p.displayOrder ?? 0,
      })),
    };
  },

  createService: async (data: any) =>
    api.post("/admin/billing/annual-services", data),
  updateService: async (id: string, data: any) =>
    api.put(`/admin/billing/annual-services/${id}`, data),
  deleteService: async (id: string) =>
    api.delete(`/admin/billing/annual-services/${id}`),
  toggleService: async (id: string, isPaid: boolean) =>
    api.put(`/admin/billing/annual-services/${id}`, { isPaid }),
  reorderServices: async (ids: string[]) =>
    api.put("/admin/billing/annual-services/reorder", { ids }),

  createCharge: async (data: any) =>
    api.post("/admin/billing/extra-charges", data),
  updateCharge: async (id: string, data: any) =>
    api.put(`/admin/billing/extra-charges/${id}`, data),
  deleteCharge: async (id: string) =>
    api.delete(`/admin/billing/extra-charges/${id}`),
  toggleCharge: async (id: string, isPaid: boolean) =>
    api.put(`/admin/billing/extra-charges/${id}`, { isPaid }),
  reorderCharges: async (ids: string[]) =>
    api.put("/admin/billing/extra-charges/reorder", { ids }),

  createPayment: async (data: any) => api.post("/admin/billing/payments", data),
  updatePayment: async (id: string, data: any) =>
    api.put(`/admin/billing/payments/${id}`, data),
  deletePayment: async (id: string) =>
    api.delete(`/admin/billing/payments/${id}`),
  reorderPayments: async (ids: string[]) =>
    api.put("/admin/billing/payments/reorder", { ids }),
};

export const apiPayments = {
  getAll: async (): Promise<SalesChannel[]> => {
    const res = await api.get("/admin/payment-channels");
    return res.data.map((item: any) => ({
      id: item.id.toString(),
      name: item.name,
      purpose: item.purpose,
      bank: item.bank,
      beneficiary: item.beneficiary,
      account: item.accountNumber || "",
      clabe: item.clabe || "",
      card: item.card || "",
    }));
  },
  create: async (data: any) => api.post("/admin/payment-channels", data),
  update: async (id: string, data: any) =>
    api.put(`/admin/payment-channels/${id}`, data),
  delete: async (id: string) => api.delete(`/admin/payment-channels/${id}`),
};

export const apiWhatsApp = {
  getAll: async (): Promise<WhatsAppChannel[]> => {
    const res = await api.get("/admin/whatsapp-channels");
    return res.data.map((item: any) => ({
      id: item.id.toString(),
      name: item.name,
      purpose: item.purpose,
      phone: item.phone,
      template: item.template,
      active: item.active,
      instanceName: item.instanceName,
      templates: item.templates || [],
    }));
  },
  create: async (data: any) => api.post("/admin/whatsapp-channels", data),
  update: async (id: string, data: any) =>
    api.put(`/admin/whatsapp-channels/${id}`, data),
  delete: async (id: string) => api.delete(`/admin/whatsapp-channels/${id}`),
  toggleStatus: async (id: string, active: boolean) =>
    api.put(`/admin/whatsapp-channels/${id}`, { active }),

  // New method for templates
  saveTemplate: async (
    channelId: string,
    data: { type: TemplateType; content: string },
  ) => {
    return api.post(`/admin/whatsapp-channels/${channelId}/templates`, data);
  },

  // Evolution Proxy
  getStatus: async (instanceName: string) =>
    api.get(`/admin/whatsapp/status/${instanceName}`),
  getQR: async (instanceName: string) =>
    api.post(`/admin/whatsapp/connect/${instanceName}`),
  disconnect: async (instanceName: string) =>
    api.post(`/admin/whatsapp/disconnect/${instanceName}`),
};

export const apiChannels = {
  getOverview: async (): Promise<ChannelsOverview> => {
    const res = await api.get("/admin/channels/overview");
    return res.data;
  },
};

export const apiUsers = {
  getAll: async (): Promise<User[]> => {
    const res = await api.get("/admin/users");
    return res.data.map((item: any) => ({
      id: item.id.toString(),
      name: item.name,
      username: item.username,
      email: item.email || "",
      phone: item.phone,
      isActive: item.active,
      createdAt: item.createdAt,
      receiveNotifications: item.receiveNotifications,
      notificationEmail: item.notificationEmail || item.email,
      contactProfile: item.contactProfile,
      role: item.role.toLowerCase(),
    }));
  },
  create: async (data: any) => api.post("/admin/users", data),
  update: async (id: string, data: any) => api.put(`/admin/users/${id}`, data),
  updateContact: async (id: string, data: any) => api.put(`/admin/users/${id}/contact`, data),
  delete: async (id: string) => api.delete(`/admin/users/${id}`),
  toggleStatus: async (id: string, active: boolean) =>
    api.put(`/admin/users/${id}`, { active }),
};

export const apiSystem = {
  getConfig: async (): Promise<Record<string, string>> => {
    const res = await api.get("/admin/settings");
    const flat: Record<string, string> = {};
    Object.values(res.data).forEach((group: any) => {
      Object.entries(group).forEach(([k, v]) => {
        flat[k] = v as string;
      });
    });
    return flat;
  },

  updateConfig: async (
    configData: Record<string, string | number | boolean>,
  ) => {
    const settings = Object.entries(configData).map(([key, value]) => ({
      key,
      value: String(value),
      group: key.startsWith("storage_r2_")
        ? "storage"
        : key.startsWith("storefront_")
          ? "storefront"
          : "general",
    }));
    return api.put("/admin/settings", { settings });
  },

  getShippingZones: async (): Promise<StateZone[]> => {
    const res = await api.get("/admin/shipping-zones");
    return res.data.map((item: any) => ({
      id: item.id.toString(),
      name: item.name,
      zone: item.zoneType,
      active: item.active,
    }));
  },

  updateShippingZone: async (
    id: string,
    data: { zoneType?: string; active?: boolean },
  ) => {
    return api.put(`/admin/shipping-zones/${id}`, data);
  },

  updateShippingZones: async (zones: any[]) => {
    const promises = zones.map((z) =>
      api.put(`/admin/shipping-zones/${z.id}`, {
        zoneType: z.zone,
        active: z.active,
      }),
    );
    return Promise.all(promises);
  },

  updateLogo: async (logoUrl: string) => {
    return api.post("/admin/settings/logo", { logoUrl });
  },
};

export const apiRaffles = {
  getAll: async (): Promise<Raffle[]> => {
    const res = await api.get("/raffles/admin");
    return res.data.map((item: any) => ({
      ...item,
      id: item.id.toString(),
      ticketPrice: parseFloat(item.ticketPrice),
    }));
  },
  create: async (data: any) => api.post("/raffles", data),
  update: async (id: string, data: any) => api.put(`/raffles/${id}`, data),
  remove: async (id: string) => api.delete(`/raffles/${id}`),
  getTickets: async (raffleId: string): Promise<TicketSale[]> => {
    const res = await api.get(`/raffles/${raffleId}/tickets`);
    return res.data.map((item: any) => ({
      ...item,
      id: item.id.toString(),
      raffleId: item.raffleId.toString(),
    }));
  },
  createTicket: async (raffleId: string, data: any) =>
    api.post(`/raffles/${raffleId}/tickets`, data),
  updateTicketStatus: async (id: string, status: string) => {
    return api.patch(`/ticket-sales/${id}/status`, { paymentStatus: status });
  },
};

export const apiRaffleIntelligence = {
  getOverview: async (
    params: Record<string, any> = {},
  ): Promise<RaffleIntelligenceOverview> => {
    const res = await api.get("/admin/raffle-intelligence/overview", {
      params,
    });
    return res.data;
  },
  getSegments: async (
    params: Record<string, any> = {},
  ): Promise<RaffleIntelligenceSegment[]> => {
    const res = await api.get("/admin/raffle-intelligence/segments", {
      params,
    });
    return res.data;
  },
  getParticipants: async (
    params: Record<string, any> = {},
  ): Promise<{
    data: RaffleParticipantIntelligence[];
    meta: { total: number; page: number; pageSize: number; totalPages: number };
  }> => {
    const res = await api.get("/admin/raffle-intelligence/participants", {
      params,
    });
    return res.data;
  },
  exportParticipants: async (params: Record<string, any> = {}) => {
    const res = await api.get("/admin/raffle-intelligence/export", {
      params,
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(
      new Blob([res.data], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `raffle-intelligence-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

/* --- UTILIDADES DE MAPEO --- */
function mapStatusDBtoFront(
  stock: number,
  saleStatus: string,
  type: string,
): "available" | "reserved" | "sold" {
  if (type.toLowerCase() === "bird" || type.toLowerCase() === "ave") {
    if (saleStatus === "SOLD") return "sold";
    if (saleStatus === "RESERVED") return "reserved";
    return "available";
  }
  return stock > 0 ? "available" : "sold";
}

function mapProductType(type?: string): "BIRD" | "ITEM" {
  const normalized = type?.toUpperCase();
  return normalized === "BIRD" || normalized === "AVE" ? "BIRD" : "ITEM";
}

function mapOrderResponse(item: any): Order {
  return {
    id: item.id.toString(),
    customer: item.customerName,
    customerPhone: item.customerPhone,
    receiverName: item.receiverName,
    customerState: item.shippingState || "N/A",
    customerAddress: item.shippingAddress,
    deliveryMethod: item.deliveryMethod,
    shippingStreet: item.shippingStreet,
    shippingNeighborhood: item.shippingNeighborhood,
    shippingPostalCode: item.shippingPostalCode,
    shippingCity: item.shippingCity,
    total: parseFloat(item.total),
    status: mapOrderStatus(item.status),
    paymentMethod: item.paymentMethod,
    paymentStatus: item.paymentStatus,
    paymentExpiresAt: item.paymentExpiresAt,
    mpPaymentId: item.mpPaymentId,
    mpSellerUserId: item.mpSellerUserId,
    mpPaymentStatus: item.mpPaymentStatus,
    mpPaymentStatusDetail: item.mpPaymentStatusDetail,
    mpPaymentMethodId: item.mpPaymentMethodId,
    mpPaymentTypeId: item.mpPaymentTypeId,
    mpPaidAmount: item.mpPaidAmount != null ? parseFloat(item.mpPaidAmount) : null,
    mpRefundId: item.mpRefundId,
    mpRefundedAmount: item.mpRefundedAmount != null ? parseFloat(item.mpRefundedAmount) : null,
    mpRefundedAt: item.mpRefundedAt,
    date: item.createdAt,
    isRead: Boolean(item.isRead),
    readAt: item.readAt || undefined,
    items: (item.items || []).map((i: any) => ({
      id: i.productId.toString(),
      name: i.productName || "Producto",
      price: parseFloat(i.unitPrice),
      quantity: i.quantity,
      type: mapProductType(i.productType),
      imageUrl: i.product?.thumbnail,
    })),
  };
}

function mapOrderStatus(status: string): "paid" | "pending" | "cancelled" {
  const s = status.toUpperCase();
  if (s === "PAID" || s === "SHIPPED" || s === "DELIVERED") return "paid";
  if (s === "CANCELLED") return "cancelled";
  return "pending";
}
