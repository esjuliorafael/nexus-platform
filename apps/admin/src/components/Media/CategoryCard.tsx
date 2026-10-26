import React from 'react';
import { Edit2, Trash2, Tag, Plus, Layers } from 'lucide-react';
import { Category } from '../../types';
import { NexusAutonomousButton } from '../ui/NexusButton';
import { NexusAutonomousIcon } from '../ui/NexusIcon';
import { NexusAutonomousCard } from '../ui/NexusCard';
import { NexusAutonomousBadge } from '../ui/NexusBadge';

interface CategoryCardProps {
  category: Category;
  onEdit?: (category: Category) => void;
  onDelete?: (id: string) => void;
  onManage: (category: Category, startWithForm: boolean) => void;
  canManage: boolean;
  style?: React.CSSProperties;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ 
  category, 
  onEdit, 
  onDelete, 
  onManage, 
  style,
  canManage,
}) => {
  return (
    <NexusAutonomousCard
      onEdit={onEdit ? () => onEdit(category) : undefined}
      onDelete={onDelete ? () => onDelete(category.id) : undefined}
      swipeable={Boolean(onEdit || onDelete)}
      innerClassName="flex flex-col justify-between"
      style={style}
    >
      <div className="flex flex-col" style={{ gap: 'var(--space-lg)' }}>
        {/* Header de la Tarjeta */}
        <div className="flex items-center justify-between">
          <NexusAutonomousIcon
            icon={Tag}
            variant="brand"
            hoverGroup="group/card"
            className="group-hover/card:bg-brand-500 group-hover/card:text-white"
          />
          
          {(onEdit || onDelete) && <div className="hidden sm:flex items-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" style={{ gap: 'var(--space-sm)' }}>
            {onEdit && <NexusAutonomousButton
              density="compact"
              variant="secondary"
              isIconOnly
              onClick={() => onEdit(category)}
              icon={Edit2}
              title="Editar categoría"
            />}
            {onDelete && <NexusAutonomousButton
              density="compact"
              variant="secondary"
              isIconOnly
              onClick={() => onDelete(category.id)}
              icon={Trash2}
              className="hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100"
              title="Eliminar categoría"
            />}
          </div>}
        </div>

        {/* Título y Contadores */}
        <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
          <h4 className="text-h2 text-text-main truncate">
            {category.name}
          </h4>
          <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
            <NexusAutonomousBadge
              variant="muted"
              className="bg-stone-100/80 text-stone-500 border-border-main/50 backdrop-blur-sm"
            >
              {category.count || 0} medios
            </NexusAutonomousBadge>
            
            <NexusAutonomousBadge
              variant="muted"
              className="bg-stone-100/80 text-stone-400 border-border-main/50 backdrop-blur-sm"
            >
              {category.subcategories ? category.subcategories.length : 0} subs
            </NexusAutonomousBadge>
          </div>
        </div>
      </div>

      {/* Botones de Acción (Gestión de Subcategorías) */}
      <div className={`grid ${canManage ? "grid-cols-2" : "grid-cols-1"}`} style={{ gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
        <NexusAutonomousButton
          density="compact"
          variant="secondary"
          onClick={() => onManage(category, false)}
          icon={Layers}
          className="w-full truncate"
        >
          Ver subs
        </NexusAutonomousButton>
        {canManage && <NexusAutonomousButton
          density="compact"
          variant="brand"
          onClick={() => onManage(category, true)}
          icon={Plus}
          className="w-full truncate bg-brand-50 text-brand-600 border-brand-200 hover:bg-brand-100 shadow-none"
        >
          Nueva sub
        </NexusAutonomousButton>}
      </div>
    </NexusAutonomousCard>
  );
};
