import React, { useMemo, useRef, useState } from "react";
import { Package } from "lucide-react";
import { Order } from "../../../types";
import { apiOrders } from "../../../api";
import { EmptyState } from "../../ui/EmptyState";
import { NexusPaginator } from "../../ui/NexusPaginator";
import { NexusSpinner } from "../../ui/NexusSpinner";
import { OrderCard } from "./OrderCard";

interface OrdersViewProps {
  orders: Order[];
  isLoading: boolean;
  onOrdersChange: (orders: Order[]) => void;
  onViewDetail: (order: Order) => void;
  showToast: (message: string, type?: "success" | "error") => void;
  setConfirmDialog: (dialog: any) => void;
}

const ITEMS_PER_PAGE = 8;

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  isLoading,
  onOrdersChange,
  onViewDetail,
  showToast,
  setConfirmDialog,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const ordersTopRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    return [...orders].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [orders]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber === currentPage) return;
    setCurrentPage(pageNumber);
    ordersTopRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      await apiOrders.updateStatus(id, "PAID");
      onOrdersChange(
        orders.map((order) =>
          order.id === id ? { ...order, status: "paid" } : order,
        ),
      );
      showToast("Orden marcada como pagada");
    } catch (error) {
      showToast("Error al actualizar estado", "error");
    }
  };

  const handleCancelOrder = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "¿Cancelar Orden?",
      message: "Esta acción cancelará la orden y liberará el inventario.",
      confirmLabel: "Sí, Cancelar",
      variant: "danger",
      onConfirm: async () => {
        try {
          await apiOrders.cancel(id);
          onOrdersChange(
            orders.map((order) =>
              order.id === id ? { ...order, status: "cancelled" } : order,
            ),
          );
          showToast("Orden cancelada correctamente");
        } catch (error) {
          showToast("Error al cancelar", "error");
        }
        setConfirmDialog({ isOpen: false });
      },
    });
  };

  return (
    <div className="w-full" ref={ordersTopRef}>
      {isLoading ? (
        <NexusSpinner label="Cargando órdenes..." />
      ) : filtered.length > 0 ? (
        <div
          className="mx-auto flex max-w-6xl flex-col"
          style={{ gap: "var(--space-md)", paddingBottom: "var(--space-3xl)" }}
        >
          {paginatedOrders.map((order, idx) => (
            <div
              key={order.id}
              className="animate-card-enter"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
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
