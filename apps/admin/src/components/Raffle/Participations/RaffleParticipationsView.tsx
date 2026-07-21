import React, { useEffect, useMemo, useRef, useState } from "react";
import { Ticket } from "lucide-react";
import { apiRaffleParticipations } from "../../../api";
import { RaffleParticipation } from "../../../types";
import { EmptyState } from "../../ui/EmptyState";
import { NexusPaginator } from "../../ui/NexusPaginator";
import { NexusSpinner } from "../../ui/NexusSpinner";
import { RaffleParticipationCard } from "./RaffleParticipationCard";

export type RaffleParticipationStatusFilter =
  | "PENDING"
  | "PAID"
  | "CANCELLED"
  | "PAYMENT_REVIEW"
  | "NOT_COMPLETED"
  | "ALL";

interface RaffleParticipationsViewProps {
  statusFilter: RaffleParticipationStatusFilter;
  searchQuery: string;
  onViewDetail: (participation: RaffleParticipation) => void;
  onParticipationChange: (participation: RaffleParticipation) => void;
  showToast: (message: string, type?: "success" | "error") => void;
  setConfirmDialog: (dialog: any) => void;
}

const ITEMS_PER_PAGE = 8;
const normalize = (value: string) =>
  value.toLocaleLowerCase("es-MX").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

export const RaffleParticipationsView: React.FC<RaffleParticipationsViewProps> = ({
  statusFilter,
  searchQuery,
  onViewDetail,
  onParticipationChange,
  showToast,
  setConfirmDialog,
}) => {
  const [participations, setParticipations] = useState<RaffleParticipation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void apiRaffleParticipations.getAll()
      .then(setParticipations)
      .catch(() => showToast("No se pudieron cargar las participaciones", "error"))
      .finally(() => setIsLoading(false));
  }, [showToast]);

  useEffect(() => setCurrentPage(1), [searchQuery, statusFilter]);

  const filtered = useMemo(() => {
    const query = normalize(searchQuery);
    return participations.filter((participation) => {
      if (statusFilter !== "ALL" && participation.status !== statusFilter) return false;
      if (!query) return true;
      return normalize([
        participation.customerName,
        participation.customerPhone,
        participation.customerState,
        participation.raffleTitle,
        participation.ticketNumbers.join(" "),
        participation.couponCode,
        participation.mpPaymentId,
        participation.mpPaymentStatusDetail,
        ...(participation.paymentAttempts || []).flatMap((attempt) => [
          attempt.mpPaymentId,
          attempt.statusDetail,
          attempt.customerMessage,
        ]),
      ].filter(Boolean).join(" ")).includes(query);
    });
  }, [participations, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const visibleParticipations = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const updateStatus = async (participation: RaffleParticipation, paymentStatus: "PAID" | "CANCELLED") => {
    try {
      const updated = await apiRaffleParticipations.updateStatus(participation.id, paymentStatus);
      setParticipations((current) => current.map((item) => item.id === updated.id ? updated : item));
      onParticipationChange(updated);
      showToast(paymentStatus === "PAID" ? "Pago confirmado" : "Apartado cancelado");
    } catch (error: any) {
      showToast(error?.response?.data?.message || "No se pudo actualizar la participación", "error");
    }
  };

  const confirmPayment = (participation: RaffleParticipation) => setConfirmDialog({
    isOpen: true,
    title: "¿Confirmar pago?",
    message: `Se marcarán como pagados los ${participation.ticketCount} boletos de esta participación.`,
    confirmLabel: "Confirmar Pago",
    variant: "brand",
    onConfirm: async () => {
      await updateStatus(participation, "PAID");
      setConfirmDialog({ isOpen: false });
    },
  });

  const cancelParticipation = (participation: RaffleParticipation) => setConfirmDialog({
    isOpen: true,
    title: "¿Cancelar apartado?",
    message: "Los boletos volverán a estar disponibles y se notificará al participante.",
    confirmLabel: "Sí, Cancelar",
    variant: "danger",
    onConfirm: async () => {
      await updateStatus(participation, "CANCELLED");
      setConfirmDialog({ isOpen: false });
    },
  });

  return (
    <div ref={topRef} className="w-full">
      {isLoading ? (
        <NexusSpinner label="Cargando participaciones..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title={participations.length ? "Sin resultados" : "Sin participaciones"}
          description={participations.length
            ? "Ajusta la búsqueda o cambia el estado para consultar otras participaciones."
            : "Los apartados y pagos de boletos aparecerán aquí como una participación completa."}
        />
      ) : (
        <div className="mx-auto flex max-w-6xl flex-col" style={{ gap: "var(--space-md)", paddingBottom: "var(--space-3xl)" }}>
          {visibleParticipations.map((participation, index) => (
            <div key={participation.id} className="animate-card-enter" style={{ animationDelay: `${index * 60}ms` }}>
              <RaffleParticipationCard
                participation={participation}
                onViewDetail={() => onViewDetail(participation)}
                onMarkAsPaid={() => confirmPayment(participation)}
                onCancel={() => cancelParticipation(participation)}
              />
            </div>
          ))}
          <NexusPaginator
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => {
              setCurrentPage(page);
              topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        </div>
      )}
    </div>
  );
};
