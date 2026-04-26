import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Edit2, Trash2, Search, Plus, X, Check, CornerDownRight, Layers, Loader2 } from 'lucide-react';
import { apiCategories } from '../../api';
import { Category, Subcategory } from '../../types';
import { CategoryCard } from './CategoryCard';

interface CategoryViewProps {
  searchQuery: string;
  onEdit: (category: Category) => void;
  onDelete?: (id: string) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  setConfirmDialog: (dialog: any) => void;
}

export const CategoryView: React.FC<CategoryViewProps> = ({ searchQuery, onEdit, showToast, setConfirmDialog }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  useEffect(() => {
    if (activeManagerCat) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [activeManagerCat]);

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
      const currentSubs = activeManagerCat.subcategorias 
        ? activeManagerCat.subcategorias.map(s => s.nombre) 
        : [];

      let updatedSubs = [...currentSubs];

      if (editingSub) {
        const index = activeManagerCat.subcategorias?.findIndex(s => s.id === editingSub.id);
        if (index !== undefined && index !== -1) {
          updatedSubs[index] = subNameInput.trim();
        }
      } else {
        updatedSubs.push(subNameInput.trim());
      }

      await apiCategories.update(activeManagerCat.id, {
        nombre: activeManagerCat.name,
        icono: activeManagerCat.icon,
        subcategorias: updatedSubs
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
    setSubNameInput(sub.nombre);
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
          const updatedSubs = activeManagerCat.subcategorias
            ?.filter(s => s.id !== idToDelete)
            .map(s => s.nombre) || [];

          await apiCategories.update(activeManagerCat.id, {
            nombre: activeManagerCat.name,
            icono: activeManagerCat.icon,
            subcategorias: updatedSubs
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
      <div className="flex flex-col items-center justify-center py-32">
         <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
         <p className="text-stone-500 font-medium">Cargando categorías...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filtered.map((cat, idx) => (
            <div
              key={cat.id}
              className="animate-card-enter"
              style={{ animationDelay: `${idx * 70}ms` }}
            >
              <CategoryCard
                category={cat}
                onEdit={onEdit}
                onDelete={handleDeleteCategory}
                onManage={openManager}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 bg-white/40 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-stone-200 animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center text-stone-300 mb-6 border border-stone-200 shadow-inner">
            <Search size={32} />
          </div>
          <h3 className="text-xl font-bold text-stone-800">No hay categorías</h3>
          <p className="text-stone-500 mt-2 max-w-xs text-center">No se encontraron categorías que coincidan con tu búsqueda.</p>
        </div>
      )}

      {/* Subcategory Manager Portal */}
      {activeManagerCat && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
          <div 
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            onClick={closeManager}
          />
          
          {/* Contenedor Principal: Altura controlada y estructura Flex */}
          <div className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-500 max-h-[92vh] sm:max-h-[85vh]">
            
            {/* Header: Fijo en la parte superior */}
            <div className="p-8 border-b border-stone-100 shrink-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-1">
                    {managerView === 'list' 
                      ? 'Subcategorías' 
                      : editingSub 
                        ? 'Editar Subcategoría' 
                        : 'Nueva Subcategoría'
                    }
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-stone-800 tracking-tight leading-none">
                    {managerView === 'list' 
                      ? activeManagerCat.name 
                      : `En ${activeManagerCat.name}`
                    }
                  </h3>
                </div>
                <button 
                  onClick={closeManager}
                  className="p-3 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-full transition-colors active:scale-90"
                >
                  <X size={20} strokeWidth={3} />
                </button>
              </div>
            </div>

            {/* Área desplazable: Lista o Formulario */}
            <div 
              className="flex-1 overflow-y-auto"
              style={{ scrollbarGutter: 'stable' }}
            >
              {managerView === 'list' ? (
                <div className="p-8 space-y-3">
                  {activeManagerCat.subcategorias && activeManagerCat.subcategorias.length > 0 ? (
                    activeManagerCat.subcategorias.map((sub, sidx) => (
                      <div 
                        key={sub.id} 
                        className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-200 hover:border-brand-200 hover:bg-white transition-all duration-300 animate-in fade-in slide-in-from-left-4 shadow-sm hover:shadow-md"
                        style={{ animationDelay: `${sidx * 40}ms` }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-white rounded-xl text-stone-300 border border-stone-100 shadow-sm">
                            <CornerDownRight size={14} strokeWidth={3} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-stone-800">{sub.nombre}</span>
                            <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">0 medios asociados</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => startEditSub(sub)}
                            className="p-2.5 text-stone-400 hover:text-brand-600 hover:bg-brand-50 rounded-2xl transition-all active:scale-90"
                          >
                            <Edit2 size={16} strokeWidth={2.5} />
                          </button>
                          <button 
                            onClick={() => handleDeleteSub(sub.id)}
                            className="p-2.5 text-stone-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all active:scale-90"
                          >
                            <Trash2 size={16} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center text-stone-200 mb-6 border border-stone-100/50">
                        <Layers size={32} />
                      </div>
                      <p className="text-stone-400 text-sm font-black uppercase tracking-widest">No hay subgrupos definidos</p>
                      <p className="text-stone-400 text-xs mt-1 max-w-[200px] leading-relaxed">Crea subcategorías para organizar con mayor detalle el contenido de {activeManagerCat.name}.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 animate-in fade-in slide-in-from-right-10 duration-500">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSaveSubcategory(); }}
                  className="space-y-6"
                >
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">
                      Nombre de la Subcategoría *
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ej. Atardeceres, Equipo A, Temporada 1..."
                      value={subNameInput}
                      autoFocus
                      onChange={(e) => setSubNameInput(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl text-stone-800 font-bold placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setManagerView('list')}
                      className="flex-1 py-4 bg-stone-50 text-stone-600 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-stone-100 transition-all active:scale-[0.98] border border-stone-200"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      disabled={!subNameInput.trim() || isSavingSub}
                      className={`flex-[2] py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2
                        ${!subNameInput.trim() ? 'bg-stone-100 text-stone-400 cursor-not-allowed' : 'bg-brand-500 text-white shadow-lg shadow-brand-500/20 hover:bg-brand-600'}
                      `}
                    >
                      {isSavingSub ? (
                        <span className="animate-pulse">Guardando...</span>
                      ) : (
                        <>
                          <Check size={16} strokeWidth={3} />
                          {editingSub ? 'Guardar Cambios' : 'Crear Subcategoría'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
              )}
            </div>

            {/* Footer: Botón "Nueva Subcategoría" fijo (solo en modo list) */}
            {managerView === 'list' && (
              <div className="p-8 border-t border-stone-100 shrink-0 bg-white z-10">
                <button 
                  onClick={() => { setManagerView('form'); setEditingSub(null); setSubNameInput(''); }}
                  className="w-full py-4 bg-brand-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-brand-500/20 hover:bg-brand-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Plus size={20} strokeWidth={3} />
                  Nueva Subcategoría
                </button>
              </div>
            )}

          </div>
        </div>
      , document.body)}
    </div>
  );
};