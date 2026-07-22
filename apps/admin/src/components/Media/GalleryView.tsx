import React, { useState, useEffect, useMemo, useRef, useImperativeHandle } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Media } from '../../types';
import { MediaCard } from './MediaCard';
import { MediaForm } from './MediaForm';
import { CategoryView } from './CategoryView';
import { apiGallery } from '../../api';
import { EmptyState } from '../ui/EmptyState';
import { NexusPaginator } from '../ui/NexusPaginator';
import {
  DEFAULT_GALLERY_ADVANCED_FILTERS,
  type GalleryAdvancedFilters,
} from './GalleryFiltersModal';

interface GalleryViewProps {
  searchQuery: string;
  advancedFilters?: GalleryAdvancedFilters;
  viewMode?: 'list' | 'create' | 'media_edit' | 'category_create' | 'categories_list' | 'category_edit';
  onSetViewMode?: (mode: 'list' | 'create' | 'media_edit' | 'category_create' | 'categories_list' | 'category_edit') => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  setConfirmDialog: (dialog: any) => void;
  onValidationChange?: (isValid: boolean) => void;
}

const ITEMS_PER_PAGE = 12;

export interface GalleryViewRef {
  handleSave: () => void;
}

export const GalleryView = React.forwardRef<GalleryViewRef, GalleryViewProps>(
  ({
    searchQuery,
    advancedFilters = DEFAULT_GALLERY_ADVANCED_FILTERS,
    viewMode = 'list',
    onSetViewMode,
    showToast,
    setConfirmDialog,
    onValidationChange,
  }, ref) => {
    const [mediaItems, setMediaItems] = useState<Media[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [editingMedia, setEditingMedia] = useState<Media | null>(null);
    const galleryTopRef = useRef<HTMLDivElement>(null);
    const mediaFormRef = useRef<{ handleSave: () => void }>(null);

    useImperativeHandle(ref, () => ({
      handleSave: () => {
        if (viewMode === 'create' || viewMode === 'media_edit') {
          mediaFormRef.current?.handleSave();
        }
      }
    }));

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
      const handleMediaUploadChange = () => {
        void loadMedia();
      };
      window.addEventListener('nexus:media-upload-complete', handleMediaUploadChange);
      window.addEventListener('nexus:media-upload-failed', handleMediaUploadChange);
      return () => {
        window.removeEventListener('nexus:media-upload-complete', handleMediaUploadChange);
        window.removeEventListener('nexus:media-upload-failed', handleMediaUploadChange);
      };
    }, []);

    useEffect(() => {
      if (viewMode === 'create') {
        setEditingMedia(null);
      }
    }, [viewMode]);

    const filteredMedia = useMemo(() => {
      return [...mediaItems]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .filter(item => {
          const matchesType = advancedFilters.type === 'all'
            || item.mediaType === advancedFilters.type;
          const matchesCategory = advancedFilters.categoryId === 'all'
            || String(item.categoryId) === advancedFilters.categoryId;
          if (!matchesType || !matchesCategory) return false;

          const query = searchQuery.toLowerCase();
          return (
            item.title.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query) ||
            item.type.toLowerCase().includes(query) ||
            item.category.toLowerCase().includes(query) ||
            item.subcategory.toLowerCase().includes(query)
          );
        });
    }, [advancedFilters, mediaItems, searchQuery]);

    useEffect(() => {
      setCurrentPage(1);
    }, [advancedFilters, searchQuery]);

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
          ref={mediaFormRef}
          key={editingMedia ? editingMedia.id : 'new-media'}
          initialData={editingMedia || undefined}
          onCancel={() => {
              setEditingMedia(null);
              onSetViewMode?.('list');
          }} 
          onSave={handleSaveSuccess} 
          onValidationChange={onValidationChange}
          showToast={showToast}
        />
      );
    }

    if (viewMode === 'categories_list' || viewMode === 'category_create' || viewMode === 'category_edit') {
      return (
        <CategoryView 
          searchQuery={searchQuery}
          showToast={showToast}
          setConfirmDialog={setConfirmDialog}
          openCreateDialog={viewMode === 'category_create'}
          onCreateDialogClose={() => onSetViewMode?.('categories_list')}
        />
      );
    }

    return (
      <div
        className="w-full flex flex-col"
        ref={galleryTopRef}
        style={{ gap: 'var(--space-lg)' }}
      >
        {isLoading ? (
          <div
            className="flex flex-col items-center justify-center"
            style={{
              gap: 'var(--space-md)',
              paddingBlock: 'var(--space-2xl)'
            }}
          >
             <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
             <p className="text-text-muted font-medium">Cargando galería...</p>
          </div>
        ) : filteredMedia.length > 0 ? (
          <div className="w-full">
              <div
                className="hidden lg:grid grid-cols-3 min-h-[500px]"
                style={{ gap: 'var(--space-lg)' }}
              >
                  {columns3.map((colItems, colIdx) => (
                  <div
                    key={`col-3-${colIdx}`}
                    className="flex flex-col"
                    style={{ gap: 'var(--space-lg)' }}
                  >
                      {colItems.map((item) => {
                      const originalIndex = paginatedMedia.indexOf(item);
                      return renderMediaItem(item, originalIndex, false);
                      })}
                  </div>
                  ))}
              </div>

              <div
                className="grid lg:hidden grid-cols-2 min-h-[500px]"
                style={{ gap: 'var(--space-md)' }}
              >
                  {columns2.map((colItems, colIdx) => (
                  <div
                    key={`col-2-${colIdx}`}
                    className="flex flex-col"
                    style={{ gap: 'var(--space-md)' }}
                  >
                      {colItems.map((item) => {
                      const originalIndex = paginatedMedia.indexOf(item);
                      return renderMediaItem(item, originalIndex, true);
                      })}
                  </div>
                  ))}
              </div>

              <NexusPaginator
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
          </div>
        ) : (
          <EmptyState
            icon={Search}
            title="No hay medios"
            description="No se encontraron medios que coincidan con tu búsqueda."
          />
        )}
      </div>
    );
  }
);
