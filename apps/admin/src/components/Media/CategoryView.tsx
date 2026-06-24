import React, { useMemo, useState, useEffect } from 'react';
import { Edit2, Trash2, Search, Plus, Check, CornerDownRight, Layers, Loader2 } from 'lucide-react';
import { apiCategories } from '../../api';
import { Category, Subcategory } from '../../types';
import { CategoryCard } from './CategoryCard';
import { EmptyState } from '../ui/EmptyState';
import { NexusAutonomousButton } from '../ui/NexusButton';
import { NexusInput } from '../ui/NexusInputs';
import { CategoryDialog } from './CategoryDialog';
import { NexusModal, NexusModalActions } from '../ui/NexusModal';

interface CategoryViewProps {
  searchQuery: string;
  onDelete?: (id: string) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  setConfirmDialog: (dialog: any) => void;
  openCreateDialog?: boolean;
  onCreateDialogClose?: () => void;
}

export const CategoryView: React.FC<CategoryViewProps> = ({
  searchQuery,
  showToast,
  setConfirmDialog,
  openCreateDialog,
  onCreateDialogClose,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryDialogMode, setCategoryDialogMode] = useState<'create' | 'edit' | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [activeManagerCat, setActiveManagerCat] = useState<Category | null>(null);
  const [managerView, setManagerView] = useState<'list' | 'form'>('list');
  const [editingSub, setEditingSub] = useState<Subcategory | null>(null);
  const [subNameInput, setSubNameInput] = useState('');
  const [isSavingSub, setIsSavingSub] = useState(false);

  const fetchCategories = async () => {
    try {
      const data = await apiCategories.getAll();
      setCategories(data);
      return data;
    } catch (error) {
      console.error("Error cargando categorías", error);
      showToast('Error al cargar categorías', 'error');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!openCreateDialog) return;
    setEditingCategory(null);
    setCategoryDialogMode('create');
  }, [openCreateDialog]);

  const handleDeleteCategory = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Eliminar Categoría?',
      message: 'Esta acción eliminará la categoría y todas sus subcategorías. Los medios asociados quedarán sin clasificar.',
      confirmLabel: 'Sí, Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await apiCategories.delete(id);
          setCategories(prev => prev.filter(c => c.id !== id));
          showToast('Categoría eliminada correctamente');
        } catch (error) {
          showToast('Error al eliminar categoría', 'error');
        }
        setConfirmDialog({ isOpen: false });
      }
    });
  };

  const filtered = useMemo(() => {
    return categories.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [searchQuery, categories]);

  const openManager = (cat: Category, startWithForm = false) => {
    setActiveManagerCat(cat);
    if (startWithForm) {
      setManagerView('form');
      setEditingSub(null);
      setSubNameInput('');
    } else {
      setManagerView('list');
    }
  };

  const openCategoryEditor = (category: Category) => {
    setEditingCategory(category);
    setCategoryDialogMode('edit');
  };

  const closeCategoryDialog = () => {
    setCategoryDialogMode(null);
    setEditingCategory(null);
    onCreateDialogClose?.();
  };

  const handleCategoryDialogSave = async (isEdit: boolean) => {
    await fetchCategories();
    showToast(isEdit ? 'Categoria actualizada correctamente' : 'Categoria creada correctamente');
    closeCategoryDialog();
  };

  const closeManager = () => {
    setActiveManagerCat(null);
    setManagerView('list');
    setEditingSub(null);
    setSubNameInput('');
  };

  const handleSaveSubcategory = async () => {
    if (!subNameInput.trim() || !activeManagerCat) return;
    setIsSavingSub(true);

    try {
      const currentSubs = activeManagerCat.subcategories
        ? activeManagerCat.subcategories.map(s => s.name)
        : [];

      let updatedSubs = [...currentSubs];

      if (editingSub) {
        const index = activeManagerCat.subcategories?.findIndex(s => s.id === editingSub.id);
        if (index !== undefined && index !== -1) {
          updatedSubs[index] = subNameInput.trim();
        }
      } else {
        updatedSubs.push(subNameInput.trim());
      }

      await apiCategories.update(activeManagerCat.id, {
        name: activeManagerCat.name,
        icon: activeManagerCat.icon,
        subcategories: updatedSubs
      });

      const newCategories = await fetchCategories();
      const updatedCat = newCategories.find(c => c.id === activeManagerCat.id);
      if (updatedCat) {
        setActiveManagerCat(updatedCat);
      }

      showToast(editingSub ? 'Subcategoría actualizada' : 'Subcategoría creada con éxito', 'success');
      setManagerView('list');
      setEditingSub(null);
      setSubNameInput('');

    } catch (error) {
      console.error(error);
      showToast('Error al guardar subcategoría', 'error');
    } finally {
      setIsSavingSub(false);
    }
  };

  const startEditSub = (sub: Subcategory) => {
    setEditingSub(sub);
    setSubNameInput(sub.name);
    setManagerView('form');
  };

  const handleDeleteSub = (idToDelete: string) => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Eliminar subcategoría?',
      message: 'Esta acción desvinculará los medios asociados pero no los eliminará.',
      confirmLabel: 'Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        if (!activeManagerCat) return;

        try {
          const updatedSubs = activeManagerCat.subcategories
            ?.filter(s => s.id !== idToDelete)
            .map(s => s.name) || [];

          await apiCategories.update(activeManagerCat.id, {
            name: activeManagerCat.name,
            icon: activeManagerCat.icon,
            subcategories: updatedSubs
          });

          const newCategories = await fetchCategories();
          const updatedCat = newCategories.find(c => c.id === activeManagerCat.id);
          if (updatedCat) setActiveManagerCat(updatedCat);

          showToast('Subcategoría eliminada', 'success');
          setConfirmDialog({ isOpen: false });
        } catch (error) {
          showToast('Error al eliminar subcategoría', 'error');
        }
      }
    });
  };

  if (loading && categories.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{
          gap: 'var(--space-md)',
          paddingBlock: 'var(--space-2xl)'
        }}
      >
         <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
         <p className="text-text-muted font-medium">Cargando categorías...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {filtered.length > 0 ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          style={{ gap: 'var(--space-lg)' }}
        >
          {filtered.map((cat, idx) => (
            <div
              key={cat.id}
              className="animate-card-enter"
              style={{ animationDelay: `${idx * 70}ms` }}
            >
              <CategoryCard
                category={cat}
                onEdit={openCategoryEditor}
                onDelete={handleDeleteCategory}
                onManage={openManager}
              />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title="No hay categorías"
          description="No se encontraron categorías que coincidan con tu búsqueda."
        />
      )}

      <CategoryDialog
        isOpen={categoryDialogMode !== null}
        initialData={categoryDialogMode === 'edit' ? editingCategory : null}
        onClose={closeCategoryDialog}
        onSave={handleCategoryDialogSave}
      />

      {activeManagerCat && (
        <NexusModal
          isOpen={!!activeManagerCat}
          title={managerView === 'list' ? activeManagerCat.name : `En ${activeManagerCat.name}`}
          eyebrow={
            managerView === 'list'
              ? 'Subcategorias'
              : editingSub
                ? 'Editar Subcategoria'
                : 'Nueva Subcategoria'
          }
          icon={Layers}
          onClose={closeManager}
        >
          <div
            className="overflow-y-auto"
            style={{ maxHeight: 'min(54vh, 32rem)', scrollbarGutter: 'stable' }}
          >
            {managerView === 'list' ? (
              <div className="flex flex-col" style={{ gap: 'var(--space-base)' }}>
                {activeManagerCat.subcategories && activeManagerCat.subcategories.length > 0 ? (
                  activeManagerCat.subcategories.map((sub, sidx) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between bg-bg-muted border border-border-main hover:border-brand-200 hover:bg-bg-card transition-all duration-300 animate-in fade-in slide-in-from-left-4 shadow-sm dark:shadow-none hover:shadow-md"
                      style={{
                        animationDelay: `${sidx * 40}ms`,
                        gap: 'var(--space-md)',
                        padding: 'var(--padding-inner)',
                        borderRadius: 'var(--radius-card-inner)'
                      }}
                    >
                      <div className="flex items-center" style={{ gap: 'var(--space-md)' }}>
                        <div
                          className="bg-bg-card text-stone-300 border border-border-main shadow-sm dark:shadow-none"
                          style={{
                            padding: 'var(--space-sm)',
                            borderRadius: 'var(--radius-card-nested)'
                          }}
                        >
                          <CornerDownRight size={14} strokeWidth={3} />
                        </div>
                        <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                          <span className="text-sm font-bold text-text-main">{sub.name}</span>
                          <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">0 medios asociados</span>
                        </div>
                      </div>
                      <div className="flex items-center" style={{ gap: 'var(--space-xs)' }}>
                        <NexusAutonomousButton
                          density="compact"
                          variant="ghost"
                          isIconOnly
                          icon={Edit2}
                          onClick={() => startEditSub(sub)}
                          aria-label="Editar subcategoria"
                        />
                        <NexusAutonomousButton
                          density="compact"
                          variant="ghost"
                          isIconOnly
                          icon={Trash2}
                          onClick={() => handleDeleteSub(sub.id)}
                          className="hover:text-rose-500 hover:bg-rose-50"
                          aria-label="Eliminar subcategoria"
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    className="flex flex-col items-center justify-center text-center"
                    style={{ gap: 'var(--space-md)', paddingBlock: 'var(--space-xl)' }}
                  >
                    <div
                      className="w-20 h-20 bg-bg-muted flex items-center justify-center text-stone-200 border border-border-main/50"
                      style={{ borderRadius: 'var(--radius-card-inner)' }}
                    >
                      <Layers size={32} />
                    </div>
                    <p className="text-stone-400 text-sm font-black uppercase tracking-widest">No hay subgrupos definidos</p>
                    <p className="text-stone-400 text-xs max-w-[200px] leading-relaxed">Crea subcategorias para organizar con mayor detalle el contenido de {activeManagerCat.name}.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-10 duration-500">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSaveSubcategory(); }}
                  className="flex flex-col"
                  style={{ gap: 'var(--space-lg)' }}
                >
                  <NexusInput
                    label="Nombre de la Subcategoria *"
                    type="text"
                    placeholder="Ej. Atardeceres, Equipo A, Temporada 1..."
                    value={subNameInput}
                    autoFocus
                    onChange={(e) => setSubNameInput(e.target.value)}
                  />

                  <NexusModalActions>
                    <NexusAutonomousButton
                      type="button"
                      variant="secondary"
                      onClick={() => setManagerView('list')}
                      className="flex-1"
                    >
                      Cancelar
                    </NexusAutonomousButton>
                    <NexusAutonomousButton
                      type="submit"
                      variant="brand"
                      disabled={!subNameInput.trim() || isSavingSub}
                      isLoading={isSavingSub}
                      icon={Check}
                      className="flex-[2]"
                    >
                      {editingSub ? 'Guardar Cambios' : 'Crear Subcategoria'}
                    </NexusAutonomousButton>
                  </NexusModalActions>
                </form>
              </div>
            )}
          </div>

          {managerView === 'list' && (
            <div style={{ paddingTop: 'var(--space-lg)' }}>
              <NexusAutonomousButton
                variant="brand"
                icon={Plus}
                onClick={() => { setManagerView('form'); setEditingSub(null); setSubNameInput(''); }}
                className="w-full"
              >
                Nueva Subcategoria
              </NexusAutonomousButton>
            </div>
          )}
        </NexusModal>
      )}
    </div>
  );
};
