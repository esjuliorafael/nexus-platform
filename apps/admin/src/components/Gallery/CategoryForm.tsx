import React, { useState, useEffect } from 'react';
import { Info, Check } from 'lucide-react';
import { apiCategories } from '../../api'; // Importamos la API
import { Category } from '../../types';

interface CategoryFormProps {
  // Ajustamos initialData para que pueda recibir el objeto completo, incluyendo subcategorias
  initialData?: Category; 
  onCancel: () => void;
  onSave: () => void;
  onValidationChange?: (isValid: boolean) => void;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({ initialData, onCancel, onSave, onValidationChange }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
    }
  }, [initialData]);

  useEffect(() => {
    onValidationChange?.(name.trim().length > 0);
  }, [name, onValidationChange]);

  useEffect(() => {
    return () => onValidationChange?.(false);
  }, [onValidationChange]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim() || isSubmitting) return;
    
    setIsSubmitting(true);

    try {
      if (initialData) {
        // MODO EDICIÓN:
        // CRUCIAL: Rescatar las subcategorías existentes para no borrarlas al editar el nombre
        const existingSubNames = initialData.subcategorias 
          ? initialData.subcategorias.map(s => s.nombre) 
          : [];

        await apiCategories.update(initialData.id, {
          nombre: name.trim(),
          icono: initialData.icon || 'folder', // Mantenemos el icono o default
          subcategorias: existingSubNames // Enviamos las subs existentes para preservarlas
        });
      } else {
        // MODO CREACIÓN:
        await apiCategories.create({
          nombre: name.trim(),
          icono: 'folder', // Icono por defecto
          subcategorias: [] // Array vacío al crear
        });
      }
      
      onSave(); // Notificar al padre para recargar lista
    } catch (error) {
      console.error("Error al guardar categoría:", error);
      // Aquí podrías manejar un toast de error si tuvieras acceso a la función
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* ESTÁNDAR: rounded-[2.5rem], border-stone-200 */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-stone-200 overflow-hidden">
        <div className="p-8 sm:p-10">
          
          <form id="category-form" onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">
                Nombre de la Categoría *
              </label>
              <input 
                type="text" 
                required
                placeholder="Ej. Temporada de Cosecha, Nuevas Instalaciones..."
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                // ESTÁNDAR: rounded-2xl, border-stone-200
                className="w-full bg-stone-50 border border-stone-200 p-4 rounded-2xl text-stone-800 font-bold placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
              {!name.trim() && (
                <p className="text-[10px] text-stone-300 font-bold uppercase ml-1 tracking-tighter">Este campo es obligatorio para continuar</p>
              )}
            </div>

            {!initialData && (
              // ESTÁNDAR: rounded-[2rem], border-stone-200
              <div className="bg-stone-50/80 p-6 rounded-[2rem] border border-stone-200 flex items-start gap-5">
                <div className="p-3 bg-white rounded-2xl text-stone-400 shadow-sm shrink-0">
                  <Info size={20} />
                </div>
                <div className="space-y-1">
                  <h5 className="text-stone-800 font-black text-xs uppercase tracking-tight">Estructura y Organización</h5>
                  <p className="text-stone-500 text-[13px] font-medium leading-relaxed max-w-4xl">
                    La categoría que crees aquí estará disponible inmediatamente al subir nuevos medios en la Galería. Organiza tu contenido de forma clara para facilitar la gestión y el filtrado del catálogo del rancho.
                  </p>
                </div>
              </div>
            )}

            <button type="submit" className="hidden" disabled={!name.trim() || isSubmitting} />

          </form>
        </div>
      </div>
    </div>
  );
};