import React from "react";
import {
  Check,
  Eraser,
  Eye,
  MapPin,
  Ticket,
  UserRound,
} from "lucide-react";
import {
  apiRaffleParticipations,
  apiRaffles,
  type RaffleCouponValidationResponse,
  type RaffleTicketAssignment,
} from "../../api";
import { MEXICO_STATES } from "../../constants";
import { Raffle, RaffleParticipation } from "../../types";
import { isCustomerPhoneComplete } from "../../utils/customer-phone";
import { EmptyState } from "../ui/EmptyState";
import {
  NexusAutonomousButton,
  NexusSectionButton,
} from "../ui/NexusButton";
import { NexusInput, NexusSelect } from "../ui/NexusInputs";
import { NexusModal, NexusModalActions } from "../ui/NexusModal";
import { NexusPhoneField } from "../ui/NexusPhoneField";
import { NexusPaginator } from "../ui/NexusPaginator";
import { NexusSection } from "../ui/NexusSection";
import {
  buildRaffleTicketNumbers,
  type TicketOperationalStatus,
} from "./RaffleOverviewView";
import { RaffleAdminSelectionDrawer } from "./RaffleAdminSelectionDrawer";
import { useRaffleOperationalOverview } from "./useRaffleOperationalOverview";

interface RaffleTicketBoardViewProps {
  raffle: Raffle;
  canManageOperations: boolean;
  showToast: (message: string, type?: "success" | "error") => void;
  onOpenParticipation: (participation: RaffleParticipation) => void;
  searchQuery?: string;
  filter?: TicketBoardFilter;
}

export type TicketBoardFilter = "all" | TicketOperationalStatus;
export const DEFAULT_TICKET_BOARD_FILTER: TicketBoardFilter = "all";

const PAGE_SIZE = 100;

const statusLabel: Record<TicketOperationalStatus, string> = {
  available: "Disponible",
  reserved: "Apartado",
  paid: "Pagado",
  review: "En revisión",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);

export const RaffleTicketBoardView: React.FC<RaffleTicketBoardViewProps> = ({
  raffle,
  canManageOperations,
  showToast,
  onOpenParticipation,
  searchQuery = "",
  filter = DEFAULT_TICKET_BOARD_FILTER,
}) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selectedTickets, setSelectedTickets] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isSelectionDrawerOpen, setIsSelectionDrawerOpen] =
    React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [customerState, setCustomerState] = React.useState("");
  const [coupon, setCoupon] =
    React.useState<RaffleCouponValidationResponse | null>(null);
  const [ticketAssignments, setTicketAssignments] = React.useState<
    RaffleTicketAssignment[]
  >([]);
  const ticketSectionRef = React.useRef<HTMLDivElement>(null);
  const { overview, isLoading, refresh } = useRaffleOperationalOverview(
    raffle.id,
    showToast,
  );

  const ticketNumbers = React.useMemo(
    () => buildRaffleTicketNumbers(raffle),
    [raffle],
  );
  const operationalData = React.useMemo(() => {
    const statusByNumber = new Map<string, TicketOperationalStatus>();
    const participationByNumber = new Map<string, string>();

    (overview?.ticketStatuses || []).forEach((entry) => {
      statusByNumber.set(entry.ticketNumber, entry.status);
      participationByNumber.set(entry.ticketNumber, entry.participationId);
    });

    return { statusByNumber, participationByNumber };
  }, [overview?.ticketStatuses]);

  React.useEffect(() => {
    setSelectedTickets(new Set());
    setIsCreateModalOpen(false);
    setIsSelectionDrawerOpen(false);
    setCoupon(null);
  }, [raffle.id]);

  React.useEffect(() => {
    let cancelled = false;

    if (raffle.opportunities <= 1) {
      setTicketAssignments([]);
      return () => {
        cancelled = true;
      };
    }

    void apiRaffles
      .getTicketAssignments(raffle.id)
      .then((assignments) => {
        if (!cancelled) setTicketAssignments(assignments);
      })
      .catch(() => {
        if (!cancelled) {
          setTicketAssignments([]);
          showToast("No se pudieron consultar las oportunidades.", "error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [raffle.id, raffle.opportunities, showToast]);

  React.useEffect(() => {
    const unavailable = Array.from(selectedTickets).filter((number) =>
      operationalData.statusByNumber.has(number),
    );
    if (unavailable.length === 0) return;

    setSelectedTickets((current) => {
      const next = new Set(current);
      unavailable.forEach((number) => next.delete(number));
      return next;
    });
    setCoupon(null);
    showToast(
      unavailable.length === 1
        ? "El boleto seleccionado dejó de estar disponible."
        : "Algunos boletos seleccionados dejaron de estar disponibles.",
      "error",
    );
  }, [operationalData.statusByNumber, selectedTickets, showToast]);

  const handleOpenTicket = React.useCallback(
    async (participationId: string) => {
      try {
        const participation =
          await apiRaffleParticipations.getById(participationId);
        onOpenParticipation(participation);
      } catch {
        showToast("No se pudo abrir la participación.", "error");
      }
    },
    [onOpenParticipation, showToast],
  );

  const handleToggleTicket = React.useCallback((number: string) => {
    setCoupon(null);
    setSelectedTickets((current) => {
      const next = new Set(current);
      if (next.has(number)) next.delete(number);
      else next.add(number);
      return next;
    });
  }, []);

  const resetForm = React.useCallback(() => {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerState("");
    setCoupon(null);
  }, []);

  const clearSelection = React.useCallback(() => {
    setSelectedTickets(new Set());
    setCoupon(null);
    setIsSelectionDrawerOpen(false);
  }, []);

  const removeSelectedTicket = React.useCallback((number: string) => {
    setCoupon(null);
    setSelectedTickets((current) => {
      const next = new Set(current);
      next.delete(number);
      return next;
    });
  }, []);

  const handleCreateParticipation = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (
      isCreating ||
      selectedTickets.size === 0 ||
      customerName.trim().length < 2 ||
      !isCustomerPhoneComplete(customerPhone)
    ) {
      return;
    }

    setIsCreating(true);
    try {
      const participation =
        await apiRaffleParticipations.createAdminParticipation(raffle.id, {
          tickets: Array.from<string>(selectedTickets).sort((left, right) =>
            left.localeCompare(right, "es-MX", { numeric: true }),
          ),
          customerName: customerName.trim(),
          customerPhone,
          customerState: customerState || null,
          couponCode: coupon?.code || null,
        });
      setIsCreateModalOpen(false);
      setSelectedTickets(new Set());
      resetForm();
      await refresh(true);
      showToast("Participación apartada correctamente.", "success");
      onOpenParticipation(participation);
    } catch (error: any) {
      const data = error?.response?.data;
      if (data?.code === "TICKETS_UNAVAILABLE") {
        const unavailable = new Set<string>(data.ticketNumbers || []);
        setSelectedTickets((current) => {
          const next = new Set(current);
          unavailable.forEach((number) => next.delete(number));
          return next;
        });
        setCoupon(null);
        setIsSelectionDrawerOpen(false);
        setIsCreateModalOpen(false);
        await refresh(true);
      }
      showToast(data?.message || "No se pudo crear el apartado.", "error");
    } finally {
      setIsCreating(false);
    }
  };

  const filteredTickets = React.useMemo(() => {
    const query = searchQuery.trim();
    return ticketNumbers.filter((number) => {
      const status = operationalData.statusByNumber.get(number) || "available";
      return (
        (!query || number.includes(query)) &&
        (filter === "all" || status === filter)
      );
    });
  }, [filter, operationalData.statusByNumber, searchQuery, ticketNumbers]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const visibleTickets = filteredTickets.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const selectedCount = selectedTickets.size;
  const selectedTotal = selectedCount * raffle.ticketPrice;
  const sortedSelectedTickets = React.useMemo(
    () =>
      Array.from<string>(selectedTickets).sort((left, right) =>
        left.localeCompare(right, "es-MX", { numeric: true }),
      ),
    [selectedTickets],
  );
  const canSubmit =
    selectedCount > 0 &&
    customerName.trim().length >= 2 &&
    isCustomerPhoneComplete(customerPhone);

  return (
    <div
      className="flex flex-col"
      style={{ gap: "var(--space-lg)" }}
    >
      <div ref={ticketSectionRef}>
        <NexusSection
          title="Boletera Completa"
          subtitle={
            canManageOperations
              ? "Selecciona boletos disponibles para crear un apartado o consulta una participación existente"
              : "Selecciona un boleto ocupado para consultar su participación"
          }
          icon={Ticket}
          iconVariant="brand"
          action={
            canManageOperations && selectedCount > 0 ? (
              <div
                className="flex items-center"
                style={{ gap: "var(--space-sm)" }}
              >
                <NexusSectionButton
                  type="button"
                  variant="secondary"
                  icon={Eraser}
                  isIconOnly
                  aria-label="Limpiar selección"
                  onClick={clearSelection}
                />
                <NexusSectionButton
                  type="button"
                  variant="brand"
                  icon={Eye}
                  onClick={() => setIsSelectionDrawerOpen(true)}
                >
                  Revisar Selección
                </NexusSectionButton>
              </div>
            ) : undefined
          }
          actionClassName="hidden md:block"
        >
          {isLoading ? (
            <div
              className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12"
              style={{ gap: "var(--space-sm)" }}
            >
              {Array.from({ length: 30 }, (_, index) => (
                <div
                  key={index}
                  className="aspect-square animate-pulse bg-bg-muted"
                  style={{ borderRadius: "var(--radius-nested-compact)" }}
                />
              ))}
            </div>
          ) : visibleTickets.length === 0 ? (
            <EmptyState
              level={2}
              icon={Ticket}
              title="Sin boletos"
              description="No hay números que coincidan con la búsqueda y el estado seleccionados."
            />
          ) : (
            <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
              <div
                className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12"
                style={{ gap: "var(--space-sm)" }}
              >
                {visibleTickets.map((number) => {
                  const status =
                    operationalData.statusByNumber.get(number) || "available";
                  const participationId =
                    operationalData.participationByNumber.get(number);
                  return (
                    <TicketButton
                      key={number}
                      number={number}
                      status={status}
                      selected={selectedTickets.has(number)}
                      onClick={
                        participationId
                          ? () => void handleOpenTicket(participationId)
                          : canManageOperations
                            ? () => handleToggleTicket(number)
                            : undefined
                      }
                    />
                  );
                })}
              </div>

              <div
                className="flex flex-wrap items-center"
                style={{ gap: "var(--space-md)" }}
              >
                <Legend label="Disponible" color="bg-bg-card" />
                <Legend label="Apartado" color="bg-amber-100" />
                <Legend label="Pagado" color="bg-emerald-100" />
                <Legend label="En revisión" color="bg-blue-100" />
              </div>
            </div>
          )}
        </NexusSection>
      </div>

      <NexusPaginator
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {canManageOperations && (
        <div
          className="fixed inset-x-0 bottom-0 z-[70] md:hidden"
          style={{
            paddingInlineStart:
              "max(var(--space-md), env(safe-area-inset-left))",
            paddingInlineEnd:
              "max(var(--space-md), env(safe-area-inset-right))",
            paddingTop: "var(--space-sm)",
            paddingBottom:
              "calc(var(--space-md) + env(safe-area-inset-bottom))",
          }}
        >
          <div
            className="mx-auto flex max-w-md items-center border border-border-main bg-bg-card shadow-xl"
            style={{
              gap: "var(--space-sm)",
              padding: "var(--padding-card-rail)",
              borderRadius: "var(--radius-outer)",
            }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-label uppercase text-text-muted">
                Mi Selección
              </p>
              <p className="truncate text-secondary font-bold text-text-main">
                {selectedCount > 0
                  ? `${selectedCount} ${selectedCount === 1 ? "boleto" : "boletos"} · ${formatCurrency(selectedTotal)}`
                  : "Selecciona tus boletos"}
              </p>
            </div>
            <NexusAutonomousButton
              type="button"
              variant="brand"
              icon={selectedCount > 0 ? Eye : Ticket}
              onClick={() => {
                if (selectedCount > 0) {
                  setIsSelectionDrawerOpen(true);
                  return;
                }
                ticketSectionRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            >
              {selectedCount > 0 ? "Revisar Selección" : "Elegir Boletos"}
            </NexusAutonomousButton>
          </div>
        </div>
      )}

      <RaffleAdminSelectionDrawer
        isOpen={isSelectionDrawerOpen}
        raffle={raffle}
        selectedTickets={sortedSelectedTickets}
        assignments={ticketAssignments}
        coupon={coupon}
        onCouponChange={setCoupon}
        onRemoveTicket={removeSelectedTicket}
        onClose={() => setIsSelectionDrawerOpen(false)}
        onContinue={() => {
          setIsSelectionDrawerOpen(false);
          window.setTimeout(() => setIsCreateModalOpen(true), 180);
        }}
        showToast={showToast}
      />

      <NexusModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          if (!isCreating) setIsCreateModalOpen(false);
        }}
        eyebrow="Apartado Administrativo"
        title="Nueva Participación"
        icon={UserRound}
        size="standard"
      >
        <form
          className="flex flex-col"
          style={{ gap: "var(--space-lg)" }}
          onSubmit={handleCreateParticipation}
        >
          <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
            <p className="text-secondary text-text-muted">
              {selectedCount}{" "}
              {selectedCount === 1
                ? "boleto seleccionado."
                : "boletos seleccionados."}
            </p>

            <div className="flex flex-col" style={{ gap: "var(--space-sm)" }}>
              <h4 className="text-secondary font-bold text-text-main">
                Boletos Seleccionados
              </h4>
              <div className="no-scrollbar -mx-[var(--padding-inner)] overflow-x-auto px-[var(--padding-inner)]">
                <div
                  className="flex w-max items-center"
                  style={{ gap: "var(--space-sm)" }}
                >
                  {sortedSelectedTickets.map((ticketNumber) => (
                    <span
                      key={ticketNumber}
                      className="flex items-center justify-center border border-border-main bg-bg-muted px-[var(--padding-button-card-inline)] text-button-card font-bold tabular-nums text-text-main"
                      style={{
                        height: "var(--size-button-card)",
                        borderRadius: "var(--radius-card-inner)",
                      }}
                    >
                      {ticketNumber}
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>

          <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
            <NexusInput
              label="Nombre Completo"
              icon={UserRound}
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              autoComplete="name"
              required
            />
            <NexusPhoneField
              id="admin-raffle-participant-phone"
              label="Teléfono / WhatsApp"
              value={customerPhone}
              onChange={setCustomerPhone}
              required
            />
            <NexusSelect
              label="Estado"
              icon={MapPin}
              value={customerState}
              onChange={(event) => setCustomerState(event.target.value)}
            >
              <option value="">Sin especificar</option>
              {MEXICO_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </NexusSelect>
          </div>

          <p className="text-secondary leading-relaxed text-text-muted">
            Se creará un apartado por depósito o transferencia. Nexus aplicará
            la expiración, el recordatorio y la notificación de WhatsApp
            configurados para esta rifa.
          </p>

          <NexusModalActions>
            <NexusAutonomousButton
              type="button"
              variant="secondary"
              className="flex-1"
              disabled={isCreating}
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancelar
            </NexusAutonomousButton>
            <NexusAutonomousButton
              type="submit"
              variant="brand"
              icon={Check}
              isLoading={isCreating}
              disabled={!canSubmit}
              className="flex-[2]"
            >
              Crear Apartado
            </NexusAutonomousButton>
          </NexusModalActions>
        </form>
      </NexusModal>
    </div>
  );
};

function TicketButton({
  number,
  status,
  selected = false,
  onClick,
}: {
  number: string;
  status: TicketOperationalStatus;
  selected?: boolean;
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
      aria-pressed={status === "available" && onClick ? selected : undefined}
      className={`flex aspect-square items-center justify-center border text-label font-black tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
        selected
          ? "border-brand-600 bg-brand-600 text-white hover:bg-brand-700"
          : styles[status]
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
      style={{ borderRadius: "var(--radius-nested-compact)" }}
      aria-label={`${number}, ${
        selected ? "seleccionado" : statusLabel[status]
      }${onClick && status !== "available" ? ", ver participación" : ""}`}
    >
      {number}
    </button>
  );
}

function Legend({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="flex items-center text-secondary text-text-muted"
      style={{ gap: "var(--space-xs)" }}
    >
      <span
        className={`h-[var(--space-base)] w-[var(--space-base)] rounded-full border border-border-main ${color}`}
      />
      {label}
    </span>
  );
}
