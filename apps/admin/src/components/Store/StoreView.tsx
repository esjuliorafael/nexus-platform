import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ShoppingBag, Plus } from 'lucide-react';
import { Product } from '../../types';
import { ProductForm } from './ProductForm';
import { ProductCard } from './ProductCard';
import { apiProducts } from '../../api';
import { NexusSectionButton } from '../ui/NexusButton';
import { EmptyState } from '../ui/EmptyState';
import { NexusSpinner } from '../ui/NexusSpinner';
import { NexusPaginator } from '../ui/NexusPaginator';

interface StoreViewProps {
  searchQuery: string;
  viewMode?: 'list' | 'create' | 'edit';
  onSetViewMode?: (mode: 'list' | 'create' | 'edit') => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  setConfirmDialog: (dialog: any) => void;
  onValidationChange?: (isValid: boolean) => void;
}

const ITEMS_PER_PAGE = 8;

export const StoreView: React.FC<StoreViewProps> = ({ searchQuery, viewMode = 'list', onSetViewMode, showToast, setConfirmDialog, onValidationChange }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const storeTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewMode === 'create') {
      setEditingProduct(null);
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

  const handleSaveSuccess = () => {
    loadProducts(); 
    showToast(editingProduct ? 'Producto actualizado' : 'Producto creado con éxito');
    onSetViewMode?.('list');
    setEditingProduct(null);
  };

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <ProductForm 
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

  return (
    <div className="w-full" ref={storeTopRef}>
      {isLoading ? (
        <NexusSpinner label="Actualizando Inventario..." />
      ) : filtered.length > 0 ? (
        <div className="flex flex-col gap-5 max-w-6xl mx-auto pb-32 sm:pb-12">
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
          icon={ShoppingBag}
          title={searchQuery ? "Sin resultados" : "Inventario Vacío"}
          description={searchQuery 
            ? `No encontramos productos que coincidan con "${searchQuery}". Prueba con otros términos.` 
            : "Aún no has registrado productos en tu tienda. Comienza añadiendo tu primer artículo."}
          action={!searchQuery && onSetViewMode && (
            <NexusSectionButton 
              onClick={() => onSetViewMode('create')}
              icon={Plus}
              className="shadow-lg shadow-brand-500/20"
            >
              Añadir Producto
            </NexusSectionButton>
          )}
        />
      )}
    </div>
  );
};
