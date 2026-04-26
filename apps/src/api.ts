/// <reference types="vite/client" />
// src/api.ts
import { Order, Product, Media, User, Category, StateZone, BankDetails, SalesChannel, WhatsAppDetails, WhatsAppChannel, DashboardStats,AnnualService,ExtraCharge} from './types';

const IS_DEV = import.meta.env.DEV;

// CONFIGURACIÓN DE RUTAS
// Producción: 'api' buscará dentro de la carpeta actual (ej. /las-trojes/admin/api o /admin/api)
const API_BASE_URL = IS_DEV ? '/admin/api' : 'api'; 

// Producción: '../' bajará un nivel para encontrar las imágenes
// Ej. de /admin/ baja a la raíz (las-trojes/ o tudominio.com/)
export const ASSET_BASE_URL = IS_DEV ? 'http://localhost/las-trojes/' : '../';

async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}/${endpoint}`;
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

export const apiDashboard = {
  getStats: async (): Promise<DashboardStats> => {
    return fetchAPI<DashboardStats>('dashboard.php');
  }
};

/* --- API: AUTENTICACIÓN --- */
export const apiAuth = {
  login: async (credentials: { username: string; password: string }) => {
    // Usamos la misma función fetchAPI que ya tienes configurada
    const url = `${API_BASE_URL}/auth.php`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', ...credentials })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error de conexión con el servidor.');
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message); // Lanza el error (ej. "Credenciales incorrectas")
    }
    return result.data;
  }
};

/* --- API: PRODUCTOS --- */
export const apiProducts = {
  getAll: async (): Promise<Product[]> => {
    const rawData = await fetchAPI<any[]>('productos.php');
    return rawData.map(item => ({
      id: item.id.toString(),
      name: item.nombre,
      price: parseFloat(item.precio),
      status: mapStatusDBtoFront(item.stock, item.estado_venta, item.tipo),
      type: item.tipo,
      stock: parseInt(item.stock),
      ringNumber: item.anillo || undefined,
      age: item.edad || undefined,
      purpose: item.proposito || undefined,
      description: item.descripcion || '',
      imageUrl: item.portada ? `${ASSET_BASE_URL}${item.portada}` : '', 
      gallery: item.galeria ? item.galeria.map((g: any) => `${ASSET_BASE_URL}${g.ruta_archivo}`) : [],
      createdAt: item.fecha_creacion
    }));
  },
  create: async (formData: FormData) => {
    return fetchAPI('productos.php', { method: 'POST', body: formData });
  },
  delete: async (id: string) => {
    return fetchAPI(`productos.php?id=${id}`, { method: 'DELETE' });
  }
};

/* --- API: GALERÍA --- */
export const apiGallery = {
  getAll: async (): Promise<Media[]> => {
    const rawData = await fetchAPI<any[]>('galeria.php');
    return rawData.map(item => ({
      id: item.id.toString(),
      title: item.titulo,
      description: item.descripcion,
      type: item.tipo === 'foto' ? 'image' : 'video',
      url: `${ASSET_BASE_URL}${item.ruta_archivo}`,
      thumbnail: item.tipo === 'video' 
        ? item.ruta_archivo.replace('/videos/', '/videos/thumbs/').replace('.mp4', '.jpg').replace('.mov', '.jpg').replace('.webm', '.jpg')
            ? `${ASSET_BASE_URL}${item.ruta_archivo.replace('/videos/', '/videos/thumbs/').replace('.mp4', '.jpg')}` 
            : undefined
        : undefined,
      category: item.categoria_nombre, 
      categoryId: item.categoria_id, 
      subcategory: item.subcategory, 
      subcategoryId: item.subcategoryId,
      location: item.ubicacion || '', 
      likes: parseInt(item.likes),
      isFavorite: Boolean(item.is_liked),
      createdAt: item.fecha_media || item.fecha_creacion
    }));
  },
  create: async (formData: FormData) => {
    return fetchAPI('galeria.php', { method: 'POST', body: formData });
  },
  update: async (formData: FormData) => {
    return fetchAPI('galeria.php', { method: 'POST', body: formData });
  },
  delete: async (id: string) => {
    return fetchAPI(`galeria.php?id=${id}`, { method: 'DELETE' });
  }
};

/* --- API: CATEGORÍAS --- */
export const apiCategories = {
  getAll: async (): Promise<Category[]> => {
    const rawData = await fetchAPI<any[]>('categorias.php');
    return rawData.map(item => ({
      id: item.id.toString(),
      name: item.nombre,
      icon: item.icono || 'folder',
      subcategorias: item.subcategorias ? item.subcategorias.map((s: any) => ({
        id: s.id.toString(),
        nombre: s.nombre,
        categoria_id: s.categoria_id.toString()
      })) : [],
      count: 0 
    }));
  },
  create: async (data: { nombre: string, icono: string, subcategorias: string[] }) => {
    return fetchAPI('categorias.php', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data) 
    });
  },
  update: async (id: string, data: { nombre: string, icono: string, subcategorias: string[] }) => {
    return fetchAPI('categorias.php', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, id }) 
    });
  },
  delete: async (id: string) => {
    return fetchAPI(`categorias.php?id=${id}`, { method: 'DELETE' });
  }
};

/* --- API: ÓRDENES --- */
export const apiOrders = {
  getAll: async (): Promise<Order[]> => {
    const rawData = await fetchAPI<any[]>('ordenes.php');
    return rawData.map(item => ({
      id: item.id.toString(),
      customer: item.cliente_nombre,
      customerPhone: item.cliente_telefono,
      customerState: item.estado_envio || 'N/A',
      customerAddress: item.direccion_envio,
      total: parseFloat(item.total),
      status: mapOrderStatus(item.estatus),
      date: item.fecha_creacion,
      // Mapear dinámicamente los detalles de la orden
      items: (item.detalles || item.items || []).map((i: any) => ({
        id: (i.producto_id || i.id).toString(),
        name: i.nombre_producto || i.nombre || 'Producto',
        price: parseFloat(i.precio_unitario || i.precio || 0),
        quantity: parseInt(i.cantidad || 1),
        type: i.tipo_producto || i.tipo || 'articulo',
        // Inyectamos la URL de la imagen/video si existe
        imageUrl: i.portada ? `${ASSET_BASE_URL}${i.portada}` : undefined
      }))
    }));
  },
  cancel: async (id: string) => {
    return fetchAPI('ordenes.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'cancelar', id })
    });
  }
};

export const apiBilling = {
  getAll: async (): Promise<{services: AnnualService[], charges: ExtraCharge[]}> => {
    const rawData = await fetchAPI<any>('facturacion.php');
    
    return {
      services: rawData.services.map((s: any) => ({
        id: s.id.toString(),
        concept: s.concepto,
        description: s.descripcion || '',
        amount: parseFloat(s.monto),
        isPaid: s.pagado === 1 || s.pagado === '1',
        contractDate: s.fecha_contrato || '',
        dueDate: s.fecha_vencimiento || '',
        iconType: s.tipo_icono
      })),
      charges: rawData.charges.map((c: any) => ({
        id: c.id.toString(),
        concept: c.concepto,
        amount: parseFloat(c.monto),
        status: (c.pagado === 1 || c.pagado === '1') ? 'paid' : 'pending',
        date: c.fecha_cargo
      }))
    };
  },

  // Operaciones de Servicios
  createService: async (data: any) => fetchAPI('facturacion.php', { method: 'POST', body: JSON.stringify({ action: 'create', type: 'service', ...data }) }),
  updateService: async (id: string, data: any) => fetchAPI('facturacion.php', { method: 'POST', body: JSON.stringify({ action: 'update', type: 'service', id, ...data }) }),
  deleteService: async (id: string) => fetchAPI('facturacion.php', { method: 'POST', body: JSON.stringify({ action: 'delete', type: 'service', id }) }),
  toggleService: async (id: string, isPaid: boolean) => fetchAPI('facturacion.php', { method: 'POST', body: JSON.stringify({ action: 'toggle', type: 'service', id, isPaid }) }),

  // Operaciones de Cargos
  createCharge: async (data: any) => fetchAPI('facturacion.php', { method: 'POST', body: JSON.stringify({ action: 'create', type: 'charge', ...data }) }),
  updateCharge: async (id: string, data: any) => fetchAPI('facturacion.php', { method: 'POST', body: JSON.stringify({ action: 'update', type: 'charge', id, ...data }) }),
  deleteCharge: async (id: string) => fetchAPI('facturacion.php', { method: 'POST', body: JSON.stringify({ action: 'delete', type: 'charge', id }) }),
  toggleCharge: async (id: string, isPaid: boolean) => fetchAPI('facturacion.php', { method: 'POST', body: JSON.stringify({ action: 'toggle', type: 'charge', id, isPaid }) })
};

export const apiPayments = {
  getAll: async (): Promise<SalesChannel[]> => {
    const rawData = await fetchAPI<any[]>('pagos.php');
    return rawData.map(item => ({
      id: item.id.toString(),
      name: item.nombre,
      purposeKey: item.proposito,
      bankName: item.banco,
      beneficiary: item.beneficiario,
      clabe: item.clabe || '',
      cardNumber: item.tarjeta || ''
    }));
  },
  create: async (data: any) => fetchAPI('pagos.php', { method: 'POST', body: JSON.stringify({ action: 'create', ...data }) }),
  update: async (id: string, data: any) => fetchAPI('pagos.php', { method: 'POST', body: JSON.stringify({ action: 'update', id, ...data }) }),
  delete: async (id: string) => fetchAPI('pagos.php', { method: 'POST', body: JSON.stringify({ action: 'delete', id }) })
};

/* --- API: WHATSAPP (CANALES) --- */
export const apiWhatsApp = {
  getAll: async (): Promise<WhatsAppChannel[]> => {
    const rawData = await fetchAPI<any[]>('whatsapp.php');
    return rawData.map(item => ({
      id: item.id.toString(),
      name: item.nombre,
      purposeKey: item.proposito,
      phoneNumber: item.telefono,
      template: item.plantilla,
      active: item.activo === 1 || item.activo === '1'
    }));
  },
  create: async (data: any) => fetchAPI('whatsapp.php', { method: 'POST', body: JSON.stringify({ action: 'create', ...data }) }),
  update: async (id: string, data: any) => fetchAPI('whatsapp.php', { method: 'POST', body: JSON.stringify({ action: 'update', id, ...data }) }),
  delete: async (id: string) => fetchAPI('whatsapp.php', { method: 'POST', body: JSON.stringify({ action: 'delete', id }) }),
  toggleStatus: async (id: string, active: boolean) => fetchAPI('whatsapp.php', { method: 'POST', body: JSON.stringify({ action: 'toggle', id, active }) })
};

/* --- API: USUARIOS --- */
export const apiUsers = {
  getAll: async (): Promise<User[]> => {
    const rawData = await fetchAPI<any[]>('usuarios.php');
    return rawData.map(item => ({
      id: item.id.toString(),
      fullName: item.nombre,
      username: item.username,
      email: item.email,
      isActive: item.activo === 1 || item.activo === '1',
      createdAt: item.fecha_creacion,
      receiveNotifications: item.recibir_notificaciones === 1 || item.recibir_notificaciones === '1',
      notificationEmail: item.email_notificaciones || item.email,
      role: item.rol || 'staff'
    }));
  },

  getCurrentUser: async (): Promise<User> => {
    const rawData = await fetchAPI<any>('usuarios.php?id=1');
    return {
      id: rawData.id.toString(),
      fullName: rawData.nombre,
      username: rawData.username,
      email: rawData.email,
      isActive: rawData.activo === 1 || rawData.activo === '1',
      createdAt: rawData.fecha_creacion,
      receiveNotifications: rawData.recibir_notificaciones === 1 || rawData.recibir_notificaciones === '1',
      notificationEmail: rawData.email_notificaciones || rawData.email,
      role: rawData.rol || 'staff'
    };
  },

  updateNotifications: async (userId: string, receive: boolean, email?: string) => {
    return fetchAPI('usuarios.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_notifications',
        id: userId,
        recibir_notificaciones: receive,
        email_notificaciones: email
      })
    });
  },

  create: async (data: any) => {
    return fetchAPI('usuarios.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', ...data })
    });
  },

  update: async (id: string, data: any) => {
    return fetchAPI('usuarios.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id, ...data })
    });
  },

  delete: async (id: string) => {
    return fetchAPI('usuarios.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id })
    });
  },

  toggleStatus: async (id: string, isActive: boolean) => {
    return fetchAPI('usuarios.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggleStatus', id, isActive })
    });
  }
};

/* --- API: SISTEMA (CONFIGURACIÓN GLOBAL) --- */
export const apiSystem = {
  getConfig: async (): Promise<Record<string, string>> => {
    return fetchAPI<Record<string, string>>('configuracion.php');
  },
  
  updateConfig: async (configData: Record<string, string | number | boolean>) => {
    const stringifiedData: Record<string, string> = {};
    for (const [key, value] of Object.entries(configData)) {
      if (typeof value === 'boolean') {
          stringifiedData[key] = value ? '1' : '0';
      } else {
          stringifiedData[key] = String(value);
      }
    }
    return fetchAPI('configuracion.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stringifiedData)
    });
  },

  getShippingZones: async (): Promise<StateZone[]> => {
    const rawData = await fetchAPI<any[]>('envios.php');
    return rawData.map(item => ({
        id: item.id.toString(),
        name: item.name,
        zone: item.zone
    }));
  },

  updateShippingZones: async (zones: StateZone[]) => {
    return fetchAPI('envios.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(zones.map(z => ({ id: z.id, zone: z.zone })))
    });
  },

  updateLogo: async (file: File): Promise<{ path: string }> => {
    const formData = new FormData();
    formData.append('logo', file);
    // IMPORTANTE: Cuando mandas un FormData con un archivo, NO debes poner el header 'Content-Type'.
    // El navegador (fetch) lo pone automáticamente con el 'boundary' correcto.
    const url = `${API_BASE_URL}/identidad.php`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error('Error al subir el logo');
    return response.json();
  }
};

/* --- UTILIDADES DE MAPEO --- */
function mapStatusDBtoFront(stock: number, estadoVenta: string, type: string): 'available' | 'reserved' | 'sold' {
    if (type === 'ave') {
        if (estadoVenta === 'vendido') return 'sold';
        if (estadoVenta === 'reservado') return 'reserved';
        return 'available';
    }
    return stock > 0 ? 'available' : 'sold';
}

function mapOrderStatus(status: string): 'paid' | 'pending' | 'cancelled' {
    const s = status.toLowerCase();
    if (s === 'pagado' || s === 'enviado' || s === 'entregado') return 'paid';
    if (s === 'cancelado') return 'cancelled';
    return 'pending';
}