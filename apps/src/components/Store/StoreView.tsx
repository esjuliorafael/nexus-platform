import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ShoppingBag, Search, PlusCircle, Filter, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Product } from '../../types';
import { ProductForm } from './ProductForm';
import { ProductCard } from './ProductCard';
import { apiProducts } from '../../api';

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
        <div className="flex flex-col items-center justify-center py-32">
           <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
           <p className="text-stone-500 font-medium">Cargando inventario...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="flex flex-col gap-4 max-w-6xl mx-auto">
          {paginatedProducts.map((product, idx) => (
            <div 
              key={product.id}
              className="animate-card-enter"
              style={{ animationDelay: `${idx * 70}ms` }}
            >
              <ProductCard 
                product={product} 
                onEdit={() => handleEdit(product)}
                onDelete={() => handleDelete(product.id)}
              />
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center pt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center gap-2 bg-white/90 backdrop-blur-xl p-2.5 rounded-full border border-white/80 shadow-xl shadow-stone-200/50">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`p-3 rounded-full transition-all ${
                    currentPage === 1 
                      ? 'text-stone-300 cursor-not-allowed opacity-50' 
                      : 'text-stone-600 hover:bg-stone-100 active:scale-90 hover:text-brand-600'
                  }`}
                >
                  <ChevronLeft size={20} strokeWidth={3} />
                </button>
                <div className="flex items-center gap-1.5 px-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-11 h-11 flex items-center justify-center rounded-full text-sm font-black transition-all duration-300 ${
                        currentPage === pageNum
                          ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30 scale-110 z-10'
                          : 'text-stone-400 hover:bg-stone-50 hover:text-stone-800'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={`p-3 rounded-full transition-all ${
                    currentPage === totalPages 
                      ? 'text-stone-300 cursor-not-allowed opacity-50' 
                      : 'text-stone-600 hover:bg-stone-100 active:scale-90 hover:text-brand-600'
                  }`}
                >
                  <ChevronRight size={20} strokeWidth={3} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-20 text-center">
          <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-300">
            <ShoppingBag size={40} />
          </div>
          <h3 className="text-xl font-black text-stone-800">No hay productos</h3>
          <p className="text-stone-500">No se encontraron productos que coincidan con tu búsqueda.</p>
        </div>
      )}
    </div>
  );
};