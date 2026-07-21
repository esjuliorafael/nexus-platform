import React, { useEffect, useMemo, useRef, useState } from "react";
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
  statusFilter?: OrderStatusFilter;
  searchQuery?: string;
  onOrdersChange: (orders: Order[]) => void;
  onViewDetail: (order: Order) => void;
  showToast: (message: string, type?: "success" | "error") => void;
  setConfirmDialog: (dialog: any) => void;
}

const ITEMS_PER_PAGE = 8;

export type OrderStatusFilter =
  | "pending"
  | "paid"
  | "cancelled"
  | "payment_review"
  | "not_completed"
  | "all";

const normalizeSearch = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  isLoading,
  statusFilter = "pending",
  searchQuery = "",
  onOrdersChange,
  onViewDetail,
  showToast,
  setConfirmDialog,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const ordersTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  const filtered = useMemo(() => {
    const query = normalizeSearch(searchQuery);

    return [...orders]
      .filter((order) => {
        if (statusFilter === "all") return true;
        return order.status === statusFilter;
      })
      .filter((order) => {
        if (!query) return true;

        const content = normalizeSearch(
          [
            order.id,
            order.customer,
            order.customerPhone,
            order.customerState,
            order.shippingCity,
            order.items.map((item) => item.name).join(" "),
          ]
            .filter(Boolean)
            .join(" "),
        );

        return content.includes(query);
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, searchQuery, statusFilter]);

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
          order.id === id ? { ...order, status: "paid", paymentStatus: "APPROVED" } : order,
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
      title: "¿Cancelar orden?",
      message: "Esta acción cancelará la orden y liberará el inventario.",
      confirmLabel: "Sí, cancelar",
      variant: "danger",
      onConfirm: async () => {
        try {
          await apiOrders.cancel(id);
          onOrdersChange(
            orders.map((order) =>
              order.id === id ? { ...order, status: "cancelled", paymentStatus: "CANCELLED" } : order,
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
          title={orders.length > 0 ? "No encontramos órdenes" : "No hay órdenes"}
          description={
            orders.length > 0
              ? "Ajusta la búsqueda o cambia el filtro para ver otros resultados."
              : "Aún no se han registrado órdenes en la tienda. Todas las transacciones de tus clientes aparecerán en este listado."
          }
        />
      )}
    </div>
  );
};

