import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Package } from 'lucide-react';
import { Order } from '../../../types';
import { OrderCard } from './OrderCard';
import { OrderDetailView } from './OrderDetailView';
import { apiOrders } from '../../../api';
import { EmptyState } from '../../ui/EmptyState';
import { NexusSpinner } from '../../ui/NexusSpinner';
import { NexusPaginator } from '../../ui/NexusPaginator';

interface OrdersViewProps {
  onViewDetail: (order: Order) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  setConfirmDialog: (dialog: any) => void;
}

const ITEMS_PER_PAGE = 8;

export const OrdersView: React.FC<OrdersViewProps> = ({ 
  onViewDetail, 
  showToast, 
  setConfirmDialog
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [swipedOrderId, setSwipedOrderId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersTopRef = useRef<HTMLDivElement>(null);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await apiOrders.getAll();
      setOrders(data);
    } catch (error) {
      console.error("Error cargando órdenes:", error);
      showToast('Error al cargar órdenes', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  const filtered = useMemo(() => {
    return [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber === currentPage) return;
    setCurrentPage(pageNumber);
    ordersTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      await apiOrders.updateStatus(id, 'PAID');
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'paid' } : o));
      showToast('Orden marcada como pagada');
    } catch (error) { showToast('Error al actualizar estado', 'error'); }
  };

  const handleCancelOrder = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Cancelar Orden?',
      message: 'Esta acción cancelará la orden y liberará el inventario.',
      confirmLabel: 'Sí, Cancelar',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await apiOrders.updateStatus(id, 'CANCELLED');
          setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelled' } : o));
          showToast('Orden cancelada correctamente');
        } catch (error) { showToast('Error al cancelar', 'error'); }
        setConfirmDialog({ isOpen: false });
      }
    });
  };

  return (
    <div className="w-full" ref={ordersTopRef}>
      {isLoading ? (
        <NexusSpinner label="Cargando órdenes..." />
      ) : filtered.length > 0 ? (
        <div className="flex flex-col gap-5 max-w-6xl mx-auto pb-32 sm:pb-12">
          {paginatedOrders.map((order, idx) => (
            <div key={order.id} className="animate-card-enter" style={{ animationDelay: `${idx * 60}ms` }}>
              <OrderCard 
                order={order} 
                onViewDetail={onViewDetail}
                onMarkAsPaid={handleMarkAsPaid}
                onCancelOrder={handleCancelOrder}
              />
            </div>
          ))}

          <NexusPaginator 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      ) : (
        <EmptyState 
          icon={Package}
          title="No hay órdenes"
          description="Aún no se han registrado órdenes en la tienda. Todas las transacciones de tus clientes aparecerán en este listado."
        />
      )}
    </div>
  );
};
