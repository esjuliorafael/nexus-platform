import React from 'react';
import { Edit2, Trash2, Tag, Plus, Layers } from 'lucide-react';
import { Category } from '../../types';

interface CategoryCardProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onManage: (category: Category, startWithForm: boolean) => void;
  style?: React.CSSProperties;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ 
  category, 
  onEdit, 
  onDelete, 
  onManage, 
  style 
}) => {
  return (
    <div 
      style={style}
      className="flex flex-col bg-white p-6 sm:p-7 rounded-[2.5rem] shadow-sm border border-stone-200 hover:shadow-md transition-all duration-500 animate-in fade-in zoom-in-95 group"
    >
      {/* Header de la Tarjeta */}
      <div className="flex items-center justify-between mb-5">
        <div className="p-3.5 bg-brand-50 text-brand-500 rounded-2xl group-hover:bg-brand-500 group-hover:text-white transition-colors duration-300 shadow-sm">
          <Tag size={22} />
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <button 
            onClick={() => onEdit(category)}
            className="p-2.5 bg-stone-50 hover:bg-stone-100 text-stone-600 rounded-2xl transition-colors active:scale-90"
            title="Editar Categoría"
          >
            <Edit2 size={16} strokeWidth={2.5} />
          </button>
          <button 
            onClick={() => onDelete(category.id)}
            className="p-2.5 bg-stone-50 hover:bg-rose-50 hover:text-rose-600 text-stone-600 rounded-2xl transition-colors active:scale-90"
            title="Eliminar Categoría"
          >
            <Trash2 size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Título y Contadores */}
      <div className="space-y-1.5">
        <h4 className="font-black text-stone-800 text-lg sm:text-xl tracking-tight truncate leading-tight">
          {category.name}
        </h4>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-stone-100 rounded-lg">
            <span className="text-[10px] font-black text-stone-600 uppercase tracking-widest leading-none">
              {category.count || 0} medios
            </span>
          </div>
          <span className="w-1 h-1 rounded-full bg-stone-200" />
          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
            {category.subcategorias ? category.subcategorias.length : 0} subgrupos
          </span>
        </div>
      </div>

      {/* Botones de Acción (Gestión de Subcategorías) */}
      <div className="grid grid-cols-2 gap-3 mt-8">
        <button 
          onClick={() => onManage(category, false)}
          className="px-4 py-3 bg-stone-50 hover:bg-stone-100 text-stone-600 text-[10px] font-black rounded-2xl uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-stone-200"
        >
          <Layers size={14} />
          Ver Subs
        </button>
        <button 
          onClick={() => onManage(category, true)}
          className="px-4 py-3 bg-brand-50 hover:bg-brand-100 text-brand-600 text-[10px] font-black rounded-2xl uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-brand-100/50"
        >
          <Plus size={14} strokeWidth={3} />
          Nueva Sub
        </button>
      </div>
    </div>
  );
};