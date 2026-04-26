import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Search, Loader2 } from 'lucide-react';
import { Media } from '../../types';
import { MediaCard } from './MediaCard';
import { MediaForm } from './MediaForm';
import { CategoryForm } from './CategoryForm';
import { CategoryView } from './CategoryView';
import { apiGallery } from '../../api';

interface GalleryViewProps {
  searchQuery: string;
  viewMode?: 'list' | 'create' | 'media_edit' | 'category_create' | 'categories_list' | 'category_edit';
  onSetViewMode?: (mode: 'list' | 'create' | 'media_edit' | 'category_create' | 'categories_list' | 'category_edit') => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  setConfirmDialog: (dialog: any) => void;
  onValidationChange?: (isValid: boolean) => void;
}

const ITEMS_PER_PAGE = 12;

export const GalleryView: React.FC<GalleryViewProps> = ({ searchQuery, viewMode = 'list', onSetViewMode, showToast, setConfirmDialog, onValidationChange }) => {
  const [mediaItems, setMediaItems] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [editingCategory, setEditingCategory] = useState<{id: string, name: string} | null>(null);
  const [editingMedia, setEditingMedia] = useState<Media | null>(null);
  const galleryTopRef = useRef<HTMLDivElement>(null);

  const loadMedia = async () => {
    setIsLoading(true);
    try {
      const data = await apiGallery.getAll();
      setMediaItems(data);
    } catch (error) {
      console.error("Error cargando galería:", error);
      showToast('Error al conectar con el servidor', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);

  useEffect(() => {
    if (viewMode === 'create') {
      setEditingMedia(null);
    }
    if (viewMode === 'category_create') {
        setEditingCategory(null);
    }
  }, [viewMode]);

  const filteredMedia = useMemo(() => {
    return [...mediaItems]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter(item => {
        const query = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.type.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query) ||
          item.subcategory.toLowerCase().includes(query)
        );
      });
  }, [mediaItems, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredMedia.length / ITEMS_PER_PAGE);
  
  const paginatedMedia = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMedia.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredMedia, currentPage]);

  const columns3 = useMemo(() => {
    const cols: Media[][] = [[], [], []];
    paginatedMedia.forEach((item, i) => {
      cols[i % 3].push(item);
    });
    return cols;
  }, [paginatedMedia]);

  const columns2 = useMemo(() => {
    const cols: Media[][] = [[], []];
    paginatedMedia.forEach((item, i) => {
      cols[i % 2].push(item);
    });
    return cols;
  }, [paginatedMedia]);

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber === currentPage) return;
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    galleryTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleEditMedia = (media: Media) => {
    setEditingMedia(media);
    onSetViewMode?.('media_edit');
  };

  const handleDeleteMedia = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Eliminar este medio?',
      message: 'Esta acción es irreversible. El archivo se borrará permanentemente de la galería.',
      confirmLabel: 'Sí, Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await apiGallery.delete(id);
          setMediaItems(prev => prev.filter(m => m.id !== id));
          showToast('Medio eliminado correctamente');
        } catch (error) {
          showToast('No se pudo eliminar el medio', 'error');
        }
        setConfirmDialog({ isOpen: false });
      }
    });
  };

  const handleSaveSuccess = () => {
    loadMedia(); 
    showToast(editingMedia ? 'Medio actualizado con éxito' : 'Medio subido con éxito');
    onSetViewMode?.('list');
    setEditingMedia(null);
  };

  const handleCategorySaveSuccess = (isEdit: boolean) => {
      showToast(isEdit ? 'Categoría actualizada con éxito' : 'Categoría creada correctamente');
      onSetViewMode?.('categories_list'); 
      setEditingCategory(null);
  };

  const renderMediaItem = (item: Media, indexInPage: number, isMobile: boolean) => {
    const isTall = isMobile 
      ? (indexInPage % 4 === 1) || (indexInPage % 4 === 2) 
      : (indexInPage % 2 === 1);

    return (
      <div 
        key={item.id} 
        className="animate-card-enter"
        style={{ animationDelay: `${(indexInPage % ITEMS_PER_PAGE) * 70}ms` }}
      >
        <MediaCard 
          media={item} 
          isTall={isTall} 
          onEdit={() => handleEditMedia(item)}
          onDelete={() => handleDeleteMedia(item.id)}
        />
      </div>
    );
  };

  if (viewMode === 'create' || viewMode === 'media_edit') {
    return (
      <MediaForm 
        key={editingMedia ? editingMedia.id : 'new-media'}
        initialData={editingMedia || undefined}
        onCancel={() => {
            setEditingMedia(null);
            onSetViewMode?.('list');
        }} 
        onSave={handleSaveSuccess} 
        onValidationChange={onValidationChange}
      />
    );
  }

  if (viewMode === 'category_create') {
    return (
      <CategoryForm 
        key="new-cat"
        onCancel={() => onSetViewMode?.('list')} 
        onSave={() => handleCategorySaveSuccess(false)} 
        onValidationChange={onValidationChange}
      />
    );
  }

  if (viewMode === 'category_edit') {
    return (
      <CategoryForm 
        key={editingCategory ? editingCategory.id : 'edit-cat'}
        initialData={editingCategory || undefined}
        onCancel={() => {
            setEditingCategory(null);
            onSetViewMode?.('categories_list');
        }} 
        onSave={() => handleCategorySaveSuccess(true)} 
        onValidationChange={onValidationChange}
      />
    );
  }

  if (viewMode === 'categories_list') {
    return (
      <CategoryView 
        searchQuery={searchQuery}
        showToast={showToast}
        setConfirmDialog={setConfirmDialog}
        onEdit={(cat) => {
          setEditingCategory(cat);
          onSetViewMode?.('category_edit');
        }}
      />
    );
  }

  return (
    <div className="w-full flex flex-col gap-10" ref={galleryTopRef}>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32">
           <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
           <p className="text-stone-500 font-medium">Cargando galería...</p>
        </div>
      ) : filteredMedia.length > 0 ? (
        <div className="w-full">
            <div className="hidden lg:grid grid-cols-3 gap-6 min-h-[500px]">
                {columns3.map((colItems, colIdx) => (
                <div key={`col-3-${colIdx}`} className="flex flex-col gap-6">
                    {colItems.map((item) => {
                    const originalIndex = paginatedMedia.indexOf(item);
                    return renderMediaItem(item, originalIndex, false);
                    })}
                </div>
                ))}
            </div>

            <div className="grid lg:hidden grid-cols-2 gap-4 sm:gap-6 min-h-[500px]">
                {columns2.map((colItems, colIdx) => (
                <div key={`col-2-${colIdx}`} className="flex flex-col gap-4 sm:gap-6">
                    {colItems.map((item) => {
                    const originalIndex = paginatedMedia.indexOf(item);
                    return renderMediaItem(item, originalIndex, true);
                    })}
                </div>
                ))}
            </div>

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
            <Search size={40} />
          </div>
          <h3 className="text-xl font-black text-stone-800">No hay medios</h3>
          <p className="text-stone-500">No se encontraron medios que coincidan con tu búsqueda.</p>
        </div>
      )}
    </div>
  );
};