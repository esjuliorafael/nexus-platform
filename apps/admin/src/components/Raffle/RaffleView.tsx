import React, { useState, useEffect, useCallback } from 'react';
import { Ticket, Loader2 } from 'lucide-react';
import { Raffle } from '../../types';
import { apiRaffles } from '../../api';
import { RaffleList } from './RaffleList';
import { RaffleForm } from './RaffleForm';
import { RaffleDetail } from './RaffleDetail';

interface RaffleViewProps {
  searchQuery: string;
  viewMode?: 'list' | 'create' | 'edit' | 'detail';
  onSetViewMode?: (mode: 'list' | 'create' | 'edit' | 'detail') => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  setConfirmDialog: (dialog: any) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export const RaffleView: React.FC<RaffleViewProps> = ({ 
  searchQuery, 
  viewMode = 'list', 
  onSetViewMode, 
  showToast, 
  setConfirmDialog, 
  onValidationChange 
}) => {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);

  const loadRaffles = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRaffles.getAll();
      setRaffles(data);
    } catch (error) {
      console.error("Error cargando rifas:", error);
      showToast('Error al cargar las rifas', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadRaffles();
  }, [loadRaffles]);

  useEffect(() => {
    if (viewMode === 'create') {
      setSelectedRaffle(null);
    }
  }, [viewMode]);

  const handleEdit = (raffle: Raffle) => {
    setSelectedRaffle(raffle);
    onSetViewMode?.('edit');
  };

  const handleViewDetail = (raffle: Raffle) => {
    setSelectedRaffle(raffle);
    onSetViewMode?.('detail');
  };

  const handleDelete = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Eliminar rifa?',
      message: 'Esta acción borrará la rifa y todas sus oportunidades permanentemente.',
      confirmLabel: 'Sí, Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await apiRaffles.remove(id);
          setRaffles(prev => prev.filter(r => r.id !== id));
          showToast('Rifa eliminada correctamente');
        } catch (error) {
          showToast('No se pudo eliminar la rifa', 'error');
        }
        setConfirmDialog({ isOpen: false });
      }
    });
  };

  const handleSaveSuccess = () => {
    loadRaffles();
    showToast(selectedRaffle ? 'Rifa actualizada' : 'Rifa creada con éxito');
    onSetViewMode?.('list');
    setSelectedRaffle(null);
  };

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <RaffleForm 
        key={selectedRaffle ? selectedRaffle.id : 'new'} 
        initialData={selectedRaffle || undefined}
        onCancel={() => {
          setSelectedRaffle(null);
          onSetViewMode?.('list');
        }}
        onSave={handleSaveSuccess}
        onValidationChange={onValidationChange}
        showToast={showToast}
      />
    );
  }

  if (viewMode === 'detail' && selectedRaffle) {
    return (
      <RaffleDetail 
        raffle={selectedRaffle}
        onBack={() => onSetViewMode?.('list')}
        showToast={showToast}
        setConfirmDialog={setConfirmDialog}
        onUpdate={loadRaffles}
      />
    );
  }

  return (
    <div className="w-full">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 animate-in fade-in duration-500">
           <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 border-4 border-brand-100 rounded-full" />
              <div className="absolute inset-0 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
           </div>
           <p className="text-stone-400 font-black uppercase tracking-[0.2em] text-[10px]">Cargando Rifas...</p>
        </div>
      ) : (
        <RaffleList 
          raffles={raffles}
          searchQuery={searchQuery}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDetail={handleViewDetail}
        />
      )}
    </div>
  );
};
