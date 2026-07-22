import React from "react";
import { Ticket } from "lucide-react";
import { apiRaffleParticipations } from "../../api";
import { Raffle, RaffleParticipation } from "../../types";
import { EmptyState } from "../ui/EmptyState";
import { NexusPaginator } from "../ui/NexusPaginator";
import { NexusSection } from "../ui/NexusSection";
import { NexusViewToolbar, type NexusViewToolbarSegment } from "../ui/NexusViewToolbar";
import {
  buildRaffleTicketNumbers,
  RAFFLE_TICKET_STATUS_PRIORITY,
  resolveRaffleTicketStatus,
  type TicketOperationalStatus,
} from "./RaffleOverviewView";

interface RaffleTicketBoardViewProps {
  raffle: Raffle;
  showToast: (message: string, type?: "success" | "error") => void;
  onOpenParticipation: (participation: RaffleParticipation) => void;
}

type TicketBoardFilter = "all" | TicketOperationalStatus;

const PAGE_SIZE = 100;

const FILTERS: NexusViewToolbarSegment<TicketBoardFilter>[] = [
  { value: "all", label: "Todos" },
  { value: "available", label: "Disponibles" },
  { value: "reserved", label: "Apartados" },
  { value: "paid", label: "Pagados" },
  { value: "review", label: "En revisión" },
];

const statusLabel: Record<TicketOperationalStatus, string> = {
  available: "Disponible",
  reserved: "Apartado",
  paid: "Pagado",
  review: "En revisión",
};

export const RaffleTicketBoardView: React.FC<RaffleTicketBoardViewProps> = ({
  raffle,
  showToast,
  onOpenParticipation,
}) => {
  const [participations, setParticipations] = React.useState<RaffleParticipation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filter, setFilter] = React.useState<TicketBoardFilter>("all");
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    void apiRaffleParticipations.getAll()
      .then((records) => {
        if (!isMounted) return;
        setParticipations(records.filter((record) => Number(record.raffleId) === Number(raffle.id)));
      })
      .catch(() => {
        if (isMounted) showToast("No se pudo cargar la boletera.", "error");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [raffle.id, showToast]);

  const ticketNumbers = React.useMemo(() => buildRaffleTicketNumbers(raffle), [raffle]);
  const operationalData = React.useMemo(() => {
    const statusByNumber = new Map<string, TicketOperationalStatus>();
    const participationByNumber = new Map<string, RaffleParticipation>();

    participations.forEach((participation) => {
      const nextStatus = resolveRaffleTicketStatus(participation);
      if (!nextStatus) return;

      participation.ticketNumbers.forEach((number) => {
        const currentStatus = statusByNumber.get(number) || "available";
        if (RAFFLE_TICKET_STATUS_PRIORITY[nextStatus] >= RAFFLE_TICKET_STATUS_PRIORITY[currentStatus]) {
          statusByNumber.set(number, nextStatus);
          participationByNumber.set(number, participation);
        }
      });
    });

    return { statusByNumber, participationByNumber };
  }, [participations]);

  const filteredTickets = React.useMemo(() => {
    const query = searchQuery.trim();
    return ticketNumbers.filter((number) => {
      const status = operationalData.statusByNumber.get(number) || "available";
      return (!query || number.includes(query)) && (filter === "all" || status === filter);
    });
  }, [filter, operationalData.statusByNumber, searchQuery, ticketNumbers]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const visibleTickets = filteredTickets.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="flex flex-col pb-[var(--space-2xl)]" style={{ gap: "var(--space-lg)" }}>
      <NexusViewToolbar
        searchValue={searchQuery}
        onSearchChange={(value) => setSearchQuery(value.replace(/\D/g, ""))}
        searchPlaceholder="Buscar número de boleto..."
        segments={FILTERS}
        activeSegment={filter}
        onSegmentChange={setFilter}
        resultLabel={`${filteredTickets.length} ${filteredTickets.length === 1 ? "boleto" : "boletos"}`}
      />

      <NexusSection
        title="Boletera Completa"
        subtitle="Selecciona un boleto ocupado para consultar su participación"
        icon={Ticket}
        iconVariant="brand"
      >
        {isLoading ? (
          <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12" style={{ gap: "var(--space-sm)" }}>
            {Array.from({ length: 30 }, (_, index) => (
              <div key={index} className="aspect-square animate-pulse bg-bg-muted" style={{ borderRadius: "var(--radius-nested-compact)" }} />
            ))}
          </div>
        ) : visibleTickets.length === 0 ? (
          <EmptyState level={2} icon={Ticket} title="Sin boletos" description="No hay números que coincidan con la búsqueda y el estado seleccionados." />
        ) : (
          <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
            <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12" style={{ gap: "var(--space-sm)" }}>
              {visibleTickets.map((number) => {
                const status = operationalData.statusByNumber.get(number) || "available";
                const participation = operationalData.participationByNumber.get(number);
                return (
                  <TicketButton
                    key={number}
                    number={number}
                    status={status}
                    onClick={participation ? () => onOpenParticipation(participation) : undefined}
                  />
                );
              })}
            </div>

            <div className="flex flex-wrap items-center" style={{ gap: "var(--space-md)" }}>
              <Legend label="Disponible" color="bg-bg-card" />
              <Legend label="Apartado" color="bg-amber-100" />
              <Legend label="Pagado" color="bg-emerald-100" />
              <Legend label="En revisión" color="bg-blue-100" />
            </div>
          </div>
        )}
      </NexusSection>

      <NexusPaginator currentPage={safePage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
};

function TicketButton({
  number,
  status,
  onClick,
}: {
  number: string;
  status: TicketOperationalStatus;
  onClick?: () => void;
}) {
  const styles: Record<TicketOperationalStatus, string> = {
    available: "border-border-main bg-bg-card text-text-main",
    reserved: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
    paid: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    review: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`flex aspect-square items-center justify-center border text-label font-black tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${styles[status]} ${onClick ? "cursor-pointer" : "cursor-default"}`}
      style={{ borderRadius: "var(--radius-nested-compact)" }}
      aria-label={`${number}, ${statusLabel[status]}${onClick ? ", ver participación" : ""}`}
    >
      {number}
    </button>
  );
}

function Legend({ label, color }: { label: string; color: string }) {
  return (
    <span className="flex items-center text-secondary text-text-muted" style={{ gap: "var(--space-xs)" }}>
      <span className={`h-[var(--space-base)] w-[var(--space-base)] rounded-full border border-border-main ${color}`} />
      {label}
    </span>
  );
}
