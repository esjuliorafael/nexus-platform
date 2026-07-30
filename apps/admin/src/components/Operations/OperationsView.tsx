import React, { useEffect, useMemo, useRef, useState } from "react";
import { Activity } from "lucide-react";
import { apiOrders, apiRaffleParticipations } from "../../api";
import type { Order, RaffleParticipation } from "../../types";
import { EmptyState } from "../ui/EmptyState";
import { NexusPaginator } from "../ui/NexusPaginator";
import { NexusSpinner } from "../ui/NexusSpinner";
import { OrderCard } from "../Store/Orders/OrderCard";
import { RaffleParticipationCard } from "../Raffle/Participations/RaffleParticipationCard";
import {
  DEFAULT_OPERATIONS_FILTERS,
  type OperationsAdvancedFilters,
} from "./OperationsFiltersModal";

interface OperationsViewProps {
  orders: Order[];
  isLoadingOrders: boolean;
  canManageOperations: boolean;
  filters?: OperationsAdvancedFilters;
  searchQuery: string;
  onOrdersChange: (orders: Order[]) => void;
  onViewOrder: (order: Order) => void;
  onViewParticipation: (participation: RaffleParticipation) => void;
  showToast: (message: string, type?: "success" | "error") => void;
  setConfirmDialog: (dialog: any) => void;
}

type OperationRecord =
  | { kind: "ORDER"; date: string; order: Order }
  | {
      kind: "PARTICIPATION";
      date: string;
      participation: RaffleParticipation;
    };

const ITEMS_PER_PAGE = 8;
const normalize = (value: string) =>
  value
    .toLocaleLowerCase("es-MX")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const normalizeParticipationStatus = (status: string) => {
  const value = status.toUpperCase();
  if (value === "PAYMENT_REVIEW") return "payment_review";
  if (value === "NOT_COMPLETED") return "not_completed";
  return value.toLowerCase();
};

export const OperationsView: React.FC<OperationsViewProps> = ({
  orders,
  isLoadingOrders,
  canManageOperations,
  filters = DEFAULT_OPERATIONS_FILTERS,
  searchQuery,
  onOrdersChange,
  onViewOrder,
  onViewParticipation,
  showToast,
  setConfirmDialog,
}) => {
  const [participations, setParticipations] = useState<RaffleParticipation[]>(
    [],
  );
  const [isLoadingParticipations, setIsLoadingParticipations] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void apiRaffleParticipations
      .getAll()
      .then(setParticipations)
      .catch(() =>
        showToast("No se pudieron cargar las participaciones", "error"),
      )
      .finally(() => setIsLoadingParticipations(false));
  }, [showToast]);

  useEffect(() => setCurrentPage(1), [filters, searchQuery]);

  const records = useMemo(() => {
    const query = normalize(searchQuery);
    const matchesPayment = (paymentMethod?: string | null) =>
      filters.paymentMethod === "all" ||
      (filters.paymentMethod === "card"
        ? paymentMethod?.toUpperCase() === "MERCADOPAGO"
        : paymentMethod?.toUpperCase() !== "MERCADOPAGO");

    const orderRecords: OperationRecord[] =
      filters.source === "raffles"
        ? []
        : orders
            .filter(
              (order) =>
                (filters.status === "all" ||
                  order.status === filters.status) &&
                matchesPayment(order.paymentMethod),
            )
            .filter((order) => {
              if (!query) return true;
              return normalize(
                [
                  order.id,
                  order.customer,
                  order.customerPhone,
                  order.customerState,
                  order.items.map((item) => item.name).join(" "),
                ]
                  .filter(Boolean)
                  .join(" "),
              ).includes(query);
            })
            .map((order) => ({ kind: "ORDER", date: order.date, order }));

    const participationRecords: OperationRecord[] =
      filters.source === "store"
        ? []
        : participations
            .filter(
              (participation) =>
                (filters.status === "all" ||
                  normalizeParticipationStatus(participation.status) ===
                    filters.status) &&
                matchesPayment(participation.paymentMethod),
            )
            .filter((participation) => {
              if (!query) return true;
              return normalize(
                [
                  participation.id,
                  participation.customerName,
                  participation.customerPhone,
                  participation.customerState,
                  participation.raffleTitle,
                  participation.ticketNumbers.join(" "),
                ]
                  .filter(Boolean)
                  .join(" "),
              ).includes(query);
            })
            .map((participation) => ({
              kind: "PARTICIPATION",
              date: participation.createdAt,
              participation,
            }));

    return [...orderRecords, ...participationRecords].sort(
      (left, right) =>
        new Date(right.date).getTime() - new Date(left.date).getTime(),
    );
  }, [filters, orders, participations, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(records.length / ITEMS_PER_PAGE));
  const visibleRecords = records.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const updateOrderStatus = async (
    order: Order,
    status: "PAID" | "CANCELLED",
  ) => {
    try {
      const updated =
        status === "PAID"
          ? await apiOrders.updateStatus(order.id, status)
          : await apiOrders.cancel(order.id);
      onOrdersChange(
        orders.map((item) =>
          item.id === order.id
            ? updated || { ...item, status: "cancelled" as const }
            : item,
        ),
      );
      showToast(status === "PAID" ? "Pago confirmado" : "Orden cancelada");
    } catch {
      showToast("No se pudo actualizar la orden", "error");
    }
  };

  const updateParticipationStatus = async (
    participation: RaffleParticipation,
    status: "PAID" | "CANCELLED",
  ) => {
    try {
      const updated = await apiRaffleParticipations.updateStatus(
        participation.id,
        status,
      );
      setParticipations((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      showToast(
        status === "PAID" ? "Pago confirmado" : "Participación cancelada",
      );
    } catch {
      showToast("No se pudo actualizar la participación", "error");
    }
  };

  const confirmAction = (
    title: string,
    message: string,
    label: string,
    variant: "brand" | "danger",
    action: () => Promise<void>,
  ) =>
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmLabel: label,
      variant,
      onConfirm: async () => {
        await action();
        setConfirmDialog({ isOpen: false });
      },
    });

  const isLoading = isLoadingOrders || isLoadingParticipations;

  return (
    <div ref={topRef} className="w-full">
      {isLoading ? (
        <NexusSpinner label="Cargando operaciones..." />
      ) : records.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Sin operaciones"
          description="Ajusta la búsqueda o los filtros para consultar otras órdenes y participaciones."
        />
      ) : (
        <div
          className="mx-auto flex max-w-6xl flex-col"
          style={{ gap: "var(--space-md)" }}
        >
          {visibleRecords.map((record, index) => (
            <div
              key={`${record.kind}-${record.kind === "ORDER" ? record.order.id : record.participation.id}`}
              className="animate-card-enter"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              {record.kind === "ORDER" ? (
                <OrderCard
                  order={record.order}
                  canManageOperations={canManageOperations}
                  onViewDetail={onViewOrder}
                  onMarkAsPaid={() =>
                    confirmAction(
                      "¿Confirmar pago?",
                      `Se marcará como pagada la orden #${record.order.id}.`,
                      "Confirmar Pago",
                      "brand",
                      () => updateOrderStatus(record.order, "PAID"),
                    )
                  }
                  onCancelOrder={() =>
                    confirmAction(
                      "¿Cancelar orden?",
                      "Se cancelará la orden y se liberará su inventario.",
                      "Sí, Cancelar",
                      "danger",
                      () => updateOrderStatus(record.order, "CANCELLED"),
                    )
                  }
                />
              ) : (
                <RaffleParticipationCard
                  participation={record.participation}
                  canManageOperations={canManageOperations}
                  onViewDetail={() =>
                    onViewParticipation(record.participation)
                  }
                  onMarkAsPaid={() =>
                    confirmAction(
                      "¿Confirmar pago?",
                      `Se marcarán como pagados ${record.participation.ticketCount} boletos.`,
                      "Confirmar Pago",
                      "brand",
                      () =>
                        updateParticipationStatus(
                          record.participation,
                          "PAID",
                        ),
                    )
                  }
                  onCancel={() =>
                    confirmAction(
                      "¿Cancelar participación?",
                      "Los boletos volverán a estar disponibles.",
                      "Sí, Cancelar",
                      "danger",
                      () =>
                        updateParticipationStatus(
                          record.participation,
                          "CANCELLED",
                        ),
                    )
                  }
                />
              )}
            </div>
          ))}
          <NexusPaginator
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => {
              setCurrentPage(page);
              topRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
          />
        </div>
      )}
    </div>
  );
};
