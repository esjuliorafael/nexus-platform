import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, PlusCircle, Ticket } from "lucide-react";
import { apiRaffles, type RaffleCouponRecord } from "../../api";
import { Raffle, RaffleParticipation } from "../../types";
import { EmptyState } from "../ui/EmptyState";
import { NexusSectionButton } from "../ui/NexusButton";
import { NexusPaginator } from "../ui/NexusPaginator";
import { RaffleCard } from "./RaffleCard";
import { RaffleForm } from "./RaffleForm";
import { RaffleOverviewView } from "./RaffleOverviewView";
import { RaffleTicketBoardView } from "./RaffleTicketBoardView";
import { RaffleCouponForm } from "./Coupons/RaffleCouponForm";
import { RaffleCouponsView } from "./Coupons/RaffleCouponsView";
import {
  DEFAULT_RAFFLE_ADVANCED_FILTERS,
  type RaffleAdvancedFilters,
  type RaffleStatusFilter,
} from "./RaffleFiltersModal";

const ITEMS_PER_PAGE = 8;

interface RaffleViewProps {
  searchQuery: string;
  advancedFilters?: RaffleAdvancedFilters;
  viewMode?: "list" | "detail" | "tickets" | "create" | "edit" | "coupon_list" | "coupon_create" | "coupon_edit";
  onSetViewMode?: (mode: "list" | "detail" | "tickets" | "create" | "edit" | "coupon_list" | "coupon_create" | "coupon_edit") => void;
  onViewParticipation?: (participation: RaffleParticipation, origin: "detail" | "tickets") => void;
  showToast: (message: string, type?: "success" | "error") => void;
  setConfirmDialog: (dialog: any) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export const RaffleView: React.FC<RaffleViewProps> = ({
  searchQuery,
  advancedFilters = DEFAULT_RAFFLE_ADVANCED_FILTERS,
  viewMode = "list",
  onSetViewMode,
  onViewParticipation,
  showToast,
  setConfirmDialog,
  onValidationChange,
}) => {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<RaffleCouponRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [togglingPublishedIds, setTogglingPublishedIds] = useState<Set<string>>(() => new Set());
  const [togglingFeaturedIds, setTogglingFeaturedIds] = useState<Set<string>>(() => new Set());
  const [isReorderingFeatured, setIsReorderingFeatured] = useState(false);

  const loadRaffles = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRaffles.getAll();
      setRaffles(data);
    } catch (error) {
      console.error("Error cargando rifas:", error);
      showToast("Error al cargar las rifas", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadRaffles();
  }, [loadRaffles]);

  useEffect(() => {
    if (viewMode === "create") setSelectedRaffle(null);
  }, [viewMode]);

  useEffect(() => {
    if (!["detail", "tickets"].includes(viewMode) || selectedRaffle || raffles.length === 0) return;
    const selectedId = sessionStorage.getItem("admin_selected_raffle_id");
    const restoredRaffle = raffles.find((raffle) => raffle.id === selectedId);
    if (restoredRaffle) setSelectedRaffle(restoredRaffle);
    else onSetViewMode?.("list");
  }, [onSetViewMode, raffles, selectedRaffle, viewMode]);

  const filteredRaffles = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("es-MX");
    const normalizedIdQuery = query.replace(/^#/, "");
    const now = Date.now();

    const getOperationalState = (raffle: Raffle): RaffleStatusFilter => {
      if (raffle.status === "FINISHED") return "finished";
      if (raffle.status === "CANCELLED") return "cancelled";
      if (!raffle.published) return "paused";

      const startsAt = raffle.participationStartsAt
        ? new Date(raffle.participationStartsAt).getTime()
        : null;
      const endsAt = raffle.participationEndsAt
        ? new Date(raffle.participationEndsAt).getTime()
        : null;

      if (startsAt && now < startsAt) return "upcoming";
      if (endsAt && now >= endsAt) return "closed";
      return "open";
    };

    return [...raffles]
      .filter((raffle) => {
        const matchesSearch = !query
          || raffle.title.toLocaleLowerCase("es-MX").includes(query)
          || raffle.id.toLocaleLowerCase("es-MX").includes(normalizedIdQuery);
        const matchesStatus = advancedFilters.status === "all"
          || getOperationalState(raffle) === advancedFilters.status;
        const matchesType = advancedFilters.type === "all"
          || (advancedFilters.type === "simple" ? raffle.opportunities <= 1 : raffle.opportunities > 1);
        const matchesAccess = advancedFilters.access === "all"
          || (advancedFilters.access === "early_access" ? raffle.earlyAccessEnabled : !raffle.earlyAccessEnabled);
        const matchesFeatured = advancedFilters.featured === "all"
          || (advancedFilters.featured === "featured" ? raffle.featured : !raffle.featured);
        return matchesSearch && matchesStatus && matchesType && matchesAccess && matchesFeatured;
      })
      .sort((left, right) => {
        if (left.featured !== right.featured) return left.featured ? -1 : 1;
        if (left.featured && right.featured) {
          return (left.featuredOrder ?? Number.MAX_SAFE_INTEGER) - (right.featuredOrder ?? Number.MAX_SAFE_INTEGER);
        }
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });
  }, [advancedFilters, raffles, searchQuery]);
  const featuredRaffles = useMemo(
    () =>
      raffles
        .filter((raffle) => raffle.featured)
        .sort(
          (left, right) =>
            (left.featuredOrder ?? Number.MAX_SAFE_INTEGER) - (right.featuredOrder ?? Number.MAX_SAFE_INTEGER),
        ),
    [raffles],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRaffles.length / ITEMS_PER_PAGE));
  const paginatedRaffles = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRaffles.slice(start, start + ITEMS_PER_PAGE);
  }, [currentPage, filteredRaffles]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [advancedFilters, searchQuery]);

  const handleEdit = (raffle: Raffle) => {
    setSelectedRaffle(raffle);
    onSetViewMode?.("edit");
  };

  const handleOpenOverview = (raffle: Raffle) => {
    setSelectedRaffle(raffle);
    sessionStorage.setItem("admin_selected_raffle_id", raffle.id);
    onSetViewMode?.("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "¿Eliminar rifa?",
      message: "Esta acción borrará la rifa y todas sus oportunidades permanentemente.",
      confirmLabel: "Sí, eliminar",
      variant: "danger",
      onConfirm: async () => {
        try {
          await apiRaffles.remove(id);
          setRaffles((current) => current.filter((raffle) => raffle.id !== id));
          showToast("Rifa eliminada correctamente");
        } catch (error) {
          showToast("No se pudo eliminar la rifa", "error");
        }
        setConfirmDialog({ isOpen: false });
      },
    });
  };

  const handleTogglePublished = async (raffle: Raffle) => {
    const nextPublished = !raffle.published;

    setTogglingPublishedIds((current) => new Set(current).add(raffle.id));
    setRaffles((current) =>
      current.map((item) =>
        item.id === raffle.id
          ? {
              ...item,
              published: nextPublished,
              featured: nextPublished ? item.featured : false,
              featuredOrder: nextPublished ? item.featuredOrder : null,
            }
          : item,
      ),
    );

    try {
      const response = await apiRaffles.updatePublication(raffle.id, nextPublished);
      setRaffles((current) =>
        current.map((item) =>
          item.id === raffle.id
            ? {
                ...item,
                ...response.data,
                id: String(response.data.id),
                ticketPrice: Number(response.data.ticketPrice),
                featured: response.data.featured === true,
                featuredOrder: response.data.featuredOrder == null ? null : Number(response.data.featuredOrder),
              }
            : item,
        ),
      );
      showToast(nextPublished ? "Rifa publicada" : "Rifa pausada");
    } catch (error) {
      console.error("Error actualizando publicación de rifa:", error);
      setRaffles((current) =>
        current.map((item) =>
          item.id === raffle.id
            ? {
                ...item,
                published: raffle.published,
                featured: raffle.featured,
                featuredOrder: raffle.featuredOrder ?? null,
              }
            : item,
        ),
      );
      showToast("No se pudo cambiar la publicación de la rifa", "error");
    } finally {
      setTogglingPublishedIds((current) => {
        const next = new Set(current);
        next.delete(raffle.id);
        return next;
      });
    }
  };

  const handleToggleFeatured = async (raffle: Raffle) => {
    const nextFeatured = !raffle.featured;
    const nextOrder = nextFeatured
      ? Math.max(0, ...featuredRaffles.map((item) => item.featuredOrder ?? 0)) + 1
      : null;

    setTogglingFeaturedIds((current) => new Set(current).add(raffle.id));
    setRaffles((current) =>
      current.map((item) =>
        item.id === raffle.id
          ? { ...item, featured: nextFeatured, featuredOrder: nextOrder }
          : item,
      ),
    );

    try {
      const response = await apiRaffles.updateFeatured(raffle.id, nextFeatured, nextOrder);
      setRaffles((current) =>
        current.map((item) =>
          item.id === raffle.id
            ? {
                ...item,
                ...response.data,
                id: String(response.data.id),
                ticketPrice: Number(response.data.ticketPrice),
                featured: response.data.featured === true,
                featuredOrder: response.data.featuredOrder == null ? null : Number(response.data.featuredOrder),
              }
            : item,
        ),
      );
      showToast(nextFeatured ? "Rifa destacada" : "Rifa retirada de destacadas");
    } catch (error: any) {
      setRaffles((current) =>
        current.map((item) =>
          item.id === raffle.id
            ? { ...item, featured: raffle.featured, featuredOrder: raffle.featuredOrder ?? null }
            : item,
        ),
      );
      showToast(error?.response?.data?.message || "No se pudo cambiar la rifa destacada", "error");
    } finally {
      setTogglingFeaturedIds((current) => {
        const next = new Set(current);
        next.delete(raffle.id);
        return next;
      });
    }
  };

  const handleMoveFeatured = async (raffleId: string, direction: -1 | 1) => {
    const currentIndex = featuredRaffles.findIndex((raffle) => raffle.id === raffleId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= featuredRaffles.length) return;

    const previousRaffles = raffles;
    const reordered = [...featuredRaffles];
    [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
    const orderById = new Map(reordered.map((raffle, index) => [raffle.id, index + 1]));

    setIsReorderingFeatured(true);
    setRaffles((current) =>
      current.map((raffle) =>
        orderById.has(raffle.id) ? { ...raffle, featuredOrder: orderById.get(raffle.id)! } : raffle,
      ),
    );

    try {
      const updated = await apiRaffles.reorderFeatured(reordered.map((raffle) => raffle.id));
      const updatedById = new Map(updated.map((raffle) => [raffle.id, raffle]));
      setRaffles((current) =>
        current.map((raffle) => updatedById.get(raffle.id) ?? raffle),
      );
      showToast("Orden de destacadas actualizado");
    } catch (error: any) {
      setRaffles(previousRaffles);
      showToast(error?.response?.data?.message || "No se pudo reordenar las rifas destacadas", "error");
    } finally {
      setIsReorderingFeatured(false);
    }
  };

  const handleSaveSuccess = () => {
    void loadRaffles();
    showToast(selectedRaffle ? "Rifa actualizada" : "Rifa creada con éxito");
    onSetViewMode?.("list");
    setSelectedRaffle(null);
  };

  if (viewMode === "create" || viewMode === "edit") {
    return (
      <RaffleForm
        key={selectedRaffle ? selectedRaffle.id : "new"}
        initialData={selectedRaffle || undefined}
        onCancel={() => {
          setSelectedRaffle(null);
          onSetViewMode?.("list");
        }}
        onSave={handleSaveSuccess}
        onValidationChange={onValidationChange}
        showToast={showToast}
      />
    );
  }

  if (viewMode === "coupon_create" || viewMode === "coupon_edit") {
    return (
      <RaffleCouponForm
        key={selectedCoupon?.id || "new-raffle-coupon"}
        initialData={selectedCoupon || undefined}
        onSave={() => {
          showToast(selectedCoupon ? "Cupón actualizado" : "Cupón creado");
          setSelectedCoupon(null);
          onSetViewMode?.("coupon_list");
        }}
        showToast={showToast}
        onValidationChange={onValidationChange}
      />
    );
  }

  if (viewMode === "coupon_list") {
    return (
      <RaffleCouponsView
        showToast={showToast}
        setConfirmDialog={setConfirmDialog}
        onCreate={() => {
          setSelectedCoupon(null);
          onSetViewMode?.("coupon_create");
        }}
        onEdit={(coupon) => {
          setSelectedCoupon(coupon);
          onSetViewMode?.("coupon_edit");
        }}
      />
    );
  }

  if (viewMode === "detail" && selectedRaffle) {
    return (
      <RaffleOverviewView
        raffle={selectedRaffle}
        showToast={showToast}
        onOpenTicketBoard={() => onSetViewMode?.("tickets")}
        onOpenParticipation={(participation) => onViewParticipation?.(participation, "detail")}
      />
    );
  }

  if (viewMode === "tickets" && selectedRaffle) {
    return (
      <RaffleTicketBoardView
        raffle={selectedRaffle}
        showToast={showToast}
        onOpenParticipation={(participation) => onViewParticipation?.(participation, "tickets")}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ gap: "var(--space-md)", paddingBlock: "var(--space-2xl)" }}>
        <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
        <p className="font-medium text-text-muted">Cargando rifas...</p>
      </div>
    );
  }

  if (raffles.length === 0) {
    return (
      <EmptyState
        icon={Ticket}
        title="Sin rifas creadas"
        description="Crea la primera rifa para configurar su universo y comenzar a vender boletos."
        action={
          <NexusSectionButton icon={PlusCircle} onClick={() => onSetViewMode?.("create")}>
            Crear rifa
          </NexusSectionButton>
        }
      />
    );
  }

  if (filteredRaffles.length === 0) {
    return (
      <EmptyState
        level={2}
        icon={Ticket}
        title="Sin resultados"
        description="No encontramos rifas que coincidan con tu búsqueda y filtros."
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col pb-[var(--space-2xl)] sm:pb-[var(--space-lg)]" style={{ gap: "var(--space-md)" }}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3" style={{ gap: "var(--space-md)" }}>
        {paginatedRaffles.map((raffle, index) => (
          <div key={raffle.id} className="animate-card-enter h-full" style={{ animationDelay: `${index * 48}ms` }}>
            <RaffleCard
              raffle={raffle}
              onOpen={() => handleOpenOverview(raffle)}
              onEdit={() => handleEdit(raffle)}
              onDelete={() => handleDelete(raffle.id)}
              onTogglePublished={() => void handleTogglePublished(raffle)}
              onToggleFeatured={() => void handleToggleFeatured(raffle)}
              onMoveFeaturedUp={() => void handleMoveFeatured(raffle.id, -1)}
              onMoveFeaturedDown={() => void handleMoveFeatured(raffle.id, 1)}
              canMoveFeaturedUp={featuredRaffles.findIndex((item) => item.id === raffle.id) > 0}
              canMoveFeaturedDown={
                featuredRaffles.findIndex((item) => item.id === raffle.id) >= 0
                && featuredRaffles.findIndex((item) => item.id === raffle.id) < featuredRaffles.length - 1
              }
              isTogglingPublished={togglingPublishedIds.has(raffle.id)}
              isTogglingFeatured={togglingFeaturedIds.has(raffle.id)}
              isReorderingFeatured={isReorderingFeatured}
            />
          </div>
        ))}
      </div>

      <NexusPaginator currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
};
