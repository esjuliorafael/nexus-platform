import React, { useEffect, useState } from 'react';
import { Check, FolderPlus } from 'lucide-react';
import { apiCategories } from '../../api';
import { Category } from '../../types';
import { NexusInput } from '../ui/NexusInputs';
import { NexusAutonomousButton } from '../ui/NexusButton';
import { NexusModal, NexusModalActions } from '../ui/NexusModal';

interface CategoryDialogProps {
  isOpen: boolean;
  initialData?: Category | null;
  onClose: () => void;
  onSave: (isEdit: boolean) => void;
}

export const CategoryDialog: React.FC<CategoryDialogProps> = ({
  isOpen,
  initialData,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = !!initialData;

  useEffect(() => {
    if (!isOpen) return;
    setName(initialData?.name || '');
    setIsSubmitting(false);
  }, [initialData, isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (initialData) {
        const existingSubNames = initialData.subcategories
          ? initialData.subcategories.map((sub) => sub.name)
          : [];

        await apiCategories.update(initialData.id, {
          name: name.trim(),
          icon: initialData.icon || 'folder',
          subcategories: existingSubNames,
        });
      } else {
        await apiCategories.create({
          name: name.trim(),
          icon: 'folder',
        });
      }

      onSave(isEdit);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <NexusModal
      isOpen={isOpen}
      title={isEdit ? initialData?.name : 'Crear agrupacion'}
      eyebrow={isEdit ? 'Editar Categoria' : 'Nueva Categoria'}
      icon={FolderPlus}
      onClose={onClose}
      zIndex={180}
    >
        <form
          onSubmit={handleSubmit}
          className="flex flex-col"
          style={{ gap: 'var(--space-lg)' }}
        >
          <NexusInput
            label="Nombre de la Categoria *"
            type="text"
            required
            placeholder="Ej. Temporada de Cosecha, Nuevas Instalaciones..."
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
            helperText={!name.trim() ? 'Este campo es obligatorio para continuar' : undefined}
          />

          <NexusModalActions>
            <NexusAutonomousButton
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </NexusAutonomousButton>
            <NexusAutonomousButton
              type="submit"
              variant="brand"
              icon={Check}
              isLoading={isSubmitting}
              disabled={!name.trim() || isSubmitting}
              className="flex-[2]"
            >
              {isEdit ? 'Guardar Cambios' : 'Crear Categoria'}
            </NexusAutonomousButton>
          </NexusModalActions>
        </form>
    </NexusModal>
  );
};
