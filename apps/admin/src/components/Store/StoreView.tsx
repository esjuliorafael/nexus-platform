import React, { useState, useMemo, useEffect, useRef, useImperativeHandle } from 'react';
import { ShoppingBag, Plus } from 'lucide-react';
import { Coupon, Product, StoreHero } from '../../types';
import { ProductForm } from './ProductForm';
import { ProductCard } from './ProductCard';
import { StoreHeroView } from './Hero/StoreHeroView';
import { StoreHeroForm } from './Hero/StoreHeroForm';
import { CouponsView } from './Coupons/CouponsView';
import { CouponForm } from './Coupons/CouponForm';
import { apiProducts } from '../../api';
import { NexusSectionButton } from '../ui/NexusButton';
import { EmptyState } from '../ui/EmptyState';
import { NexusSpinner } from '../ui/NexusSpinner';
import { NexusPaginator } from '../ui/NexusPaginator';

interface StoreViewProps {
  searchQuery: string;
  viewMode?: 'list' | 'create' | 'edit' | 'hero_list' | 'hero_create' | 'hero_edit' | 'coupon_list' | 'coupon_create' | 'coupon_edit' | 'orders' | 'order-detail';
  onSetViewMode?: (mode: 'list' | 'create' | 'edit' | 'hero_list' | 'hero_create' | 'hero_edit' | 'coupon_list' | 'coupon_create' | 'coupon_edit' | 'orders' | 'order-detail') => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  setConfirmDialog: (dialog: any) => void;
  onValidationChange?: (isValid: boolean) => void;
}

const ITEMS_PER_PAGE = 8;

export interface StoreViewRef {
  handleSave: () => void;
}

export const StoreView = React.forwardRef<StoreViewRef, StoreViewProps>(
  ({ searchQuery, viewMode = 'list', onSetViewMode, showToast, setConfirmDialog, onValidationChange }, ref) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editingHero, setEditingHero] = useState<StoreHero | null>(null);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [togglingPublishedIds, setTogglingPublishedIds] = useState<Set<string>>(new Set());
    const storeTopRef = useRef<HTMLDivElement>(null);
    const productFormRef = useRef<{ handleSave: () => void }>(null);
    const storeHeroFormRef = useRef<{ handleSave: () => void }>(null);
    const couponFormRef = useRef<{ handleSave: () => void }>(null);

    useImperativeHandle(ref, () => ({
      handleSave: () => {
        if (productFormRef.current) {
          productFormRef.current.handleSave();
        }
        if (storeHeroFormRef.current) {
          storeHeroFormRef.current.handleSave();
        }
        if (couponFormRef.current) {
          couponFormRef.current.handleSave();
        }
      }
    }));

  useEffect(() => {
    if (viewMode === 'create') {
      setEditingProduct(null);
    }
    if (viewMode === 'hero_create') {
      setEditingHero(null);
    }
    if (viewMode === 'coupon_create') {
      setEditingCoupon(null);
    }
  }, [viewMode]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const data = await apiProducts.getAll();
      setProducts(data);
    } catch (error) {
      console.error("Error cargando productos:", error);
      showToast('Error al cargar el inventario', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const handleMediaUploadChange = () => {
      void loadProducts();
    };
    window.addEventListener('nexus:media-upload-complete', handleMediaUploadChange);
    window.addEventListener('nexus:media-upload-failed', handleMediaUploadChange);
    return () => {
      window.removeEventListener('nexus:media-upload-complete', handleMediaUploadChange);
      window.removeEventListener('nexus:media-upload-failed', handleMediaUploadChange);
    };
  }, []);

  const filtered = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ringNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [products, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber === currentPage) return;
    setCurrentPage(pageNumber);
    storeTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    onSetViewMode?.('edit');
  };

  const handleDelete = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Eliminar producto?',
      message: 'Esta acción borrará el producto y sus archivos multimedia permanentemente.',
      confirmLabel: 'Sí, Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await apiProducts.delete(id);
          setProducts(prev => prev.filter(p => p.id !== id));
          showToast('Producto eliminado correctamente');
        } catch (error) {
          showToast('No se pudo eliminar el producto', 'error');
        }
        setConfirmDialog({ isOpen: false });
      }
    });
  };

  const handleToggleFeatured = async (product: Product) => {
    const nextFeatured = !product.featured;
    const sameTypeFeatured = products
      .filter((item) => item.type === product.type && item.featured && item.id !== product.id)
      .map((item) => item.featuredOrder || 0);
    const nextOrder = nextFeatured
      ? Math.max(0, ...sameTypeFeatured) + 1
      : null;

    try {
      await apiProducts.update(product.id, {
        featured: nextFeatured,
        featuredOrder: nextOrder,
      });
      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id
            ? { ...item, featured: nextFeatured, featuredOrder: nextOrder }
            : item,
        ),
      );
      showToast(nextFeatured ? 'Producto destacado' : 'Producto retirado de destacados');
    } catch (error) {
      console.error("Error actualizando destacado:", error);
      showToast('No se pudo actualizar el destacado', 'error');
    }
  };

  const handleTogglePublished = async (product: Product) => {
    const nextPublished = product.published === false;

    setTogglingPublishedIds((prev) => new Set(prev).add(product.id));
    setProducts((prev) =>
      prev.map((item) =>
        item.id === product.id ? { ...item, published: nextPublished } : item,
      ),
    );

    try {
      await apiProducts.update(product.id, { published: nextPublished });
      showToast(nextPublished ? 'Producto publicado' : 'Producto pausado');
    } catch (error) {
      console.error("Error actualizando publicación:", error);
      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id ? { ...item, published: product.published } : item,
        ),
      );
      showToast('No se pudo actualizar la publicación', 'error');
    } finally {
      setTogglingPublishedIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }
  };

  const handleSaveSuccess = () => {
    loadProducts(); 
    showToast(editingProduct ? 'Producto actualizado' : 'Producto creado con éxito');
    onSetViewMode?.('list');
    setEditingProduct(null);
  };

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <ProductForm 
        ref={productFormRef}
        key={editingProduct ? editingProduct.id : 'new'} 
        initialData={editingProduct || undefined}
        onCancel={() => {
          setEditingProduct(null);
          onSetViewMode?.('list');
        }}
        onSave={handleSaveSuccess}
        onValidationChange={onValidationChange}
        showToast={showToast}
      />
    );
  }

  if (viewMode === 'hero_create' || viewMode === 'hero_edit') {
    return (
      <StoreHeroForm
        ref={storeHeroFormRef}
        key={editingHero ? editingHero.id : 'new-store-hero'}
        initialData={editingHero || undefined}
        onSave={() => {
          showToast(editingHero ? 'Hero actualizado' : 'Hero creado');
          setEditingHero(null);
          onSetViewMode?.('hero_list');
        }}
        showToast={showToast}
        onValidationChange={onValidationChange}
      />
    );
  }

  if (viewMode === 'hero_list') {
    return (
      <StoreHeroView
        showToast={showToast}
        setConfirmDialog={setConfirmDialog}
        onCreate={() => onSetViewMode?.('hero_create')}
        onEdit={(hero) => {
          setEditingHero(hero);
          onSetViewMode?.('hero_edit');
        }}
      />
    );
  }

  if (viewMode === 'coupon_create' || viewMode === 'coupon_edit') {
    return (
      <CouponForm
        ref={couponFormRef}
        key={editingCoupon ? editingCoupon.id : 'new-coupon'}
        initialData={editingCoupon || undefined}
        onSave={() => {
          showToast(editingCoupon ? 'Cupón actualizado' : 'Cupón creado');
          setEditingCoupon(null);
          onSetViewMode?.('coupon_list');
        }}
        showToast={showToast}
        onValidationChange={onValidationChange}
      />
    );
  }

  if (viewMode === 'coupon_list') {
    return (
      <CouponsView
        showToast={showToast}
        setConfirmDialog={setConfirmDialog}
        onCreate={() => onSetViewMode?.('coupon_create')}
        onEdit={(coupon) => {
          setEditingCoupon(coupon);
          onSetViewMode?.('coupon_edit');
        }}
      />
    );
  }

  return (
    <div className="w-full" ref={storeTopRef}>
      {isLoading ? (
        <NexusSpinner label="Actualizando Inventario..." />
      ) : filtered.length > 0 ? (
        <div
          className="flex flex-col max-w-6xl mx-auto"
          style={{ gap: 'var(--space-md)', paddingBottom: 'var(--space-3xl)' }}
        >
          {paginatedProducts.map((product, idx) => (
            <div 
              key={product.id}
              className="animate-card-enter"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <ProductCard 
                product={product} 
                onEdit={() => handleEdit(product)}
                onDelete={() => handleDelete(product.id)}
                onToggleFeatured={() => handleToggleFeatured(product)}
                onTogglePublished={() => handleTogglePublished(product)}
                isTogglingPublished={togglingPublishedIds.has(product.id)}
              />
            </div>
          ))}

          <NexusPaginator 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      ) : (
        <EmptyState 
          level={1}
          icon={ShoppingBag}
          title={searchQuery ? "Sin resultados" : "Inventario Vacío"}
          description={searchQuery 
            ? `No encontramos productos que coincidan con "${searchQuery}". Prueba con otros términos.` 
            : "Aún no has registrado productos en tu tienda. Comienza añadiendo tu primer artículo."}
          action={!searchQuery && onSetViewMode && (
            <NexusSectionButton onClick={() => onSetViewMode('create')} icon={Plus}>
              Nuevo Producto
            </NexusSectionButton>
          )}
        />
      )}
    </div>
  );
});
