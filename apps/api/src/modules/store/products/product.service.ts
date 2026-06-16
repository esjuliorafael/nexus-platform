import { storePrisma } from "@nexus/db/store";
import { ProductType, SaleStatus } from "@prisma/client-store";
import { storageService } from "../../../services/storage.service";

export interface ProductFilters {
  type?: ProductType;
  status?: SaleStatus;
  search?: string;
  onlyActive?: boolean;
}

export const productService = {
  async getAll(filters: ProductFilters) {
    const where: any = {};
    
    if (filters.onlyActive !== false) where.active = true;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.saleStatus = filters.status;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const products = await storePrisma.product.findMany({
      where,
      include: { 
        gallery: true,
        orderItems: {
          where: {
            order: {
              status: "PENDING"
            }
          },
          include: {
            order: {
              select: {
                expiresAt: true
              }
            }
          },
          take: 1
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return products.map(p => {
      const pendingOrder = p.orderItems[0]?.order;
      const { orderItems, ...productData } = p as any;
      return {
        ...productData,
        expiresAt: pendingOrder?.expiresAt || null
      };
    });
  },

  async getById(id: number) {
    const product = await storePrisma.product.findUnique({
      where: { id },
      include: { 
        gallery: true,
        orderItems: {
          where: {
            order: {
              status: "PENDING"
            }
          },
          include: {
            order: {
              select: {
                expiresAt: true
              }
            }
          },
          take: 1
        }
      },
    });

    if (!product) return null;

    const pendingOrder = product.orderItems[0]?.order;
    const { orderItems, ...productData } = product as any;
    return {
      ...productData,
      expiresAt: pendingOrder?.expiresAt || null
    };
  },

  async create(data: any) {
    const { gallery, ...productData } = data;
    
    return storePrisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...productData,
          updated_at: new Date()
        },
      });

      if (gallery && Array.isArray(gallery) && gallery.length > 0) {
        await tx.productGallery.createMany({
          data: gallery.map((item: any) => {
            const url = typeof item === 'string' ? item : item.url;
            const type = (typeof item === 'object' && item.type) ? item.type : 
                         (url.toLowerCase().match(/\.(mp4|mov|webm)$/) ? "VIDEO" : "PHOTO");
            
            return {
              productId: product.id,
              filePath: url,
              fileType: type,
            };
          }),
        });
      }

      return tx.product.findUnique({
        where: { id: product.id },
        include: { gallery: true },
      });
    });
  },

  async update(id: number, data: any) {
    const { gallery, ...productData } = data;

    // Obtener el producto actual para comparar archivos
    const currentProduct = await storePrisma.product.findUnique({
      where: { id },
      include: { gallery: true }
    });

    if (!currentProduct) throw new Error("Product not found");

    return storePrisma.$transaction(async (tx) => {
      // 1. Si la portada cambió, borrar la anterior de R2
      if (productData.thumbnail && currentProduct.thumbnail && productData.thumbnail !== currentProduct.thumbnail) {
        await storageService.deleteFile(currentProduct.thumbnail);
      }

      const product = await tx.product.update({
        where: { id },
        data: {
          ...productData,
          updated_at: new Date()
        },
      });

      if (gallery !== undefined && Array.isArray(gallery)) {
        // 2. Identificar archivos de la galería que se van a eliminar
        const currentGalleryUrls = currentProduct.gallery.map(g => g.filePath);
        const newGalleryItems = gallery as any[];
        const newGalleryUrls = newGalleryItems.map(item => typeof item === 'string' ? item : item.url);
        
        const urlsToDelete = currentGalleryUrls.filter(url => !newGalleryUrls.includes(url));

        // 3. Borrar archivos de R2
        for (const url of urlsToDelete) {
          await storageService.deleteFile(url);
        }

        // 4. Actualizar base de datos
        await tx.productGallery.deleteMany({
          where: { productId: id },
        });

        if (newGalleryItems.length > 0) {
          await tx.productGallery.createMany({
            data: newGalleryItems.map((item: any) => {
              const url = typeof item === 'string' ? item : item.url;
              const type = (typeof item === 'object' && item.type) ? item.type : 
                           (url.toLowerCase().match(/\.(mp4|mov|webm)$/) ? "VIDEO" : "PHOTO");

              return {
                productId: id,
                filePath: url,
                fileType: type,
              };
            }),
          });
        }
      }

      return tx.product.findUnique({
        where: { id: id },
        include: { gallery: true },
      });
    });
  },

  async softDelete(id: number) {
    // 1. Buscar para obtener archivos
    const product = await storePrisma.product.findUnique({
      where: { id },
      include: { gallery: true }
    });

    if (product) {
      // 2. Borrar de R2 (Aunque sea soft delete en DB, el usuario espera limpieza en R2)
      if (product.thumbnail) {
        await storageService.deleteFile(product.thumbnail);
      }
      for (const item of product.gallery) {
        await storageService.deleteFile(item.filePath);
      }
    }

    return storePrisma.product.update({
      where: { id },
      data: { active: false },
    });
  },
};
