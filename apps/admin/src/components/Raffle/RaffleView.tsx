import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, PlusCircle, Ticket } from "lucide-react";
import { apiRaffles } from "../../api";
import { Raffle } from "../../types";
import { EmptyState } from "../ui/EmptyState";
import { NexusSectionButton } from "../ui/NexusButton";
import { NexusPaginator } from "../ui/NexusPaginator";
import { RaffleCard } from "./RaffleCard";
import { RaffleDetail } from "./RaffleDetail";
import { RaffleForm } from "./RaffleForm";

const ITEMS_PER_PAGE = 8;

interface RaffleViewProps {
  searchQuery: string;
  viewMode?: "list" | "create" | "edit" | "detail";
  onSetViewMode?: (mode: "list" | "create" | "edit" | "detail") => void;
  showToast: (message: string, type?: "success" | "error") => void;
  setConfirmDialog: (dialog: any) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export const RaffleView: React.FC<RaffleViewProps> = ({
  searchQuery,
  viewMode = "list",
  onSetViewMode,
  showToast,
  setConfirmDialog,
  onValidationChange,
}) => {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [togglingPublishedIds, setTogglingPublishedIds] = useState<Set<string>>(() => new Set());

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

  const filteredRaffles = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("es-MX");
    return [...raffles]
      .filter((raffle) => !query || raffle.title.toLocaleLowerCase("es-MX").includes(query))
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [raffles, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRaffles.length / ITEMS_PER_PAGE));
  const paginatedRaffles = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRaffles.slice(start, start + ITEMS_PER_PAGE);
  }, [currentPage, filteredRaffles]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleEdit = (raffle: Raffle) => {
    setSelectedRaffle(raffle);
    onSetViewMode?.("edit");
  };

  const handleViewDetail = (raffle: Raffle) => {
    setSelectedRaffle(raffle);
    onSetViewMode?.("detail");
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
      current.map((item) => (item.id === raffle.id ? { ...item, published: nextPublished } : item)),
    );

    try {
      await apiRaffles.updatePublication(raffle.id, nextPublished);
      showToast(nextPublished ? "Rifa publicada" : "Rifa pausada");
    } catch (error) {
      console.error("Error actualizando publicación de rifa:", error);
      setRaffles((current) =>
        current.map((item) => (item.id === raffle.id ? { ...item, published: raffle.published } : item)),
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

  if (viewMode === "detail" && selectedRaffle) {
    return (
      <RaffleDetail
        raffle={selectedRaffle}
        onBack={() => onSetViewMode?.("list")}
        showToast={showToast}
        setConfirmDialog={setConfirmDialog}
        onUpdate={loadRaffles}
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
        description="No encontramos rifas que coincidan con tu búsqueda."
      />
    );
  }

  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col pb-[var(--space-2xl)] sm:pb-[var(--space-lg)]"
      style={{ gap: "var(--space-md)" }}
    >
      {paginatedRaffles.map((raffle, index) => (
        <div key={raffle.id} className="animate-card-enter" style={{ animationDelay: `${index * 60}ms` }}>
          <RaffleCard
            raffle={raffle}
            onEdit={() => handleEdit(raffle)}
            onDelete={() => handleDelete(raffle.id)}
            onViewDetail={() => handleViewDetail(raffle)}
            onTogglePublished={() => void handleTogglePublished(raffle)}
            isTogglingPublished={togglingPublishedIds.has(raffle.id)}
          />
        </div>
      ))}

      <NexusPaginator currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
};
