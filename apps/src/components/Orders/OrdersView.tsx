import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Package, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Order } from '../../types';
import { OrderCard } from './OrderCard';

interface OrdersViewProps {
  orders: Order[];
  isLoading?: boolean;
  onViewDetail: (order: Order) => void;
  onMarkAsPaid: (orderId: string) => void;
  onCancelOrder: (orderId: string) => void;
}

const ITEMS_PER_PAGE = 8;

export const OrdersView: React.FC<OrdersViewProps> = ({ 
  orders, 
  isLoading,
  onViewDetail, 
  onMarkAsPaid, 
  onCancelOrder 
}) => {
  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [orders]);

  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);
  
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return orders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [orders, currentPage]);

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber === currentPage) return;
    setCurrentPage(pageNumber);
    ordersTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="w-full" ref={ordersTopRef}>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32">
           <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
           <p className="text-stone-500 font-medium">Cargando órdenes...</p>
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-4">
          {paginatedOrders.map((order, idx) => (
            <div 
              key={order.id}
              className="animate-card-enter"
              style={{ animationDelay: `${idx * 70}ms` }}
            >
              <OrderCard 
                order={order}
                onViewDetail={onViewDetail}
                onMarkAsPaid={onMarkAsPaid}
                onCancelOrder={onCancelOrder}
                isSwiped={activeSwipeId === order.id}
                onSwipe={(id) => setActiveSwipeId(id)}
              />
            </div>
          ))}

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
            <Package size={40} />
          </div>
          <h3 className="text-xl font-black text-stone-800">No hay órdenes</h3>
          <p className="text-stone-500">No se encontraron órdenes que coincidan con tu búsqueda.</p>
        </div>
      )}
    </div>
  );
};