import React, { useEffect, useMemo, useState } from "react";
import { MonitorPlay, Plus } from "lucide-react";
import { apiStoreHeroes } from "../../../api";
import type { StoreHero, StoreHeroScope } from "../../../types";
import { NexusSectionButton } from "../../ui/NexusButton";
import { NexusSpinner } from "../../ui/NexusSpinner";
import { EmptyState } from "../../ui/EmptyState";
import { NexusPaginator } from "../../ui/NexusPaginator";
import { StoreHeroCard } from "./StoreHeroCard";

interface StoreHeroViewProps {
  showToast: (message: string, type?: "success" | "error") => void;
  setConfirmDialog: (dialog: any) => void;
  onCreate: () => void;
  onEdit: (hero: StoreHero) => void;
}

const SCOPE_LABELS: Record<StoreHeroScope, string> = {
  ALL: "Todo",
  BIRD: "Aves",
  ITEM: "Artículos",
};

const SCOPE_ORDER: StoreHeroScope[] = ["ALL", "BIRD", "ITEM"];
const ITEMS_PER_PAGE = 6;

export const StoreHeroView: React.FC<StoreHeroViewProps> = ({
  showToast,
  setConfirmDialog,
  onCreate,
  onEdit,
}) => {
  const [heroes, setHeroes] = useState<StoreHero[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [togglingHeroIds, setTogglingHeroIds] = useState<Set<string>>(
    () => new Set(),
  );

  const orderedHeroes = useMemo(() => {
    return [...heroes].sort((a, b) => {
      const scopeDelta =
        SCOPE_ORDER.indexOf(a.scope) - SCOPE_ORDER.indexOf(b.scope);
      if (scopeDelta !== 0) return scopeDelta;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [heroes]);

  const totalPages = Math.ceil(orderedHeroes.length / ITEMS_PER_PAGE);
  const paginatedHeroes = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return orderedHeroes.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, orderedHeroes]);

  useEffect(() => {
    setCurrentPage(1);
  }, [heroes.length]);

  const loadHeroes = async () => {
    setIsLoading(true);
    try {
      setHeroes(await apiStoreHeroes.getAll());
    } catch (error) {
      console.error("Error cargando heroes de tienda:", error);
      showToast("No se pudieron cargar los heroes de tienda", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadHeroes();
  }, []);

  const handleDelete = (hero: StoreHero) => {
    setConfirmDialog({
      isOpen: true,
      title: "¿Eliminar hero?",
      message: `Se eliminará el hero de ${SCOPE_LABELS[hero.scope]}.`,
      confirmLabel: "Sí, eliminar",
      variant: "danger",
      onConfirm: async () => {
        try {
          await apiStoreHeroes.delete(hero.id);
          setHeroes((prev) => prev.filter((item) => item.id !== hero.id));
          showToast("Hero eliminado");
        } catch (error) {
          showToast("No se pudo eliminar el hero", "error");
        }
        setConfirmDialog({ isOpen: false });
      },
    });
  };

  const handleToggleActive = async (hero: StoreHero) => {
    const nextActive = !hero.active;

    setTogglingHeroIds((prev) => {
      const next = new Set(prev);
      next.add(hero.id);
      return next;
    });
    setHeroes((prev) =>
      prev.map((item) =>
        item.id === hero.id ? { ...item, active: nextActive } : item,
      ),
    );

    try {
      await apiStoreHeroes.update(hero.id, { active: nextActive });
      showToast(nextActive ? "Hero publicado" : "Hero pausado");
    } catch (error) {
      console.error("Error actualizando estado del hero:", error);
      setHeroes((prev) =>
        prev.map((item) =>
          item.id === hero.id ? { ...item, active: hero.active } : item,
        ),
      );
      showToast("No se pudo cambiar el estado del hero", "error");
    } finally {
      setTogglingHeroIds((prev) => {
        const next = new Set(prev);
        next.delete(hero.id);
        return next;
      });
    }
  };

  if (isLoading) return <NexusSpinner label="Cargando heroes de tienda..." />;

  return (
    <div
      className="flex flex-col"
      style={{ gap: "var(--space-lg)", paddingBottom: "var(--space-3xl)" }}
    >
      {heroes.length === 0 ? (
        <EmptyState
          level={1}
          icon={MonitorPlay}
          title="Sin heroes de tienda"
          description="Crea un hero para Todo, Aves o Artículos."
          action={
            <NexusSectionButton icon={Plus} onClick={onCreate}>
              Crear hero
            </NexusSectionButton>
          }
        />
      ) : (
        <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
          {paginatedHeroes.map((hero) => (
            <StoreHeroCard
              key={hero.id}
              hero={hero}
              onEdit={() => onEdit(hero)}
              onDelete={() => handleDelete(hero)}
              onToggleActive={() => handleToggleActive(hero)}
              isToggling={togglingHeroIds.has(hero.id)}
            />
          ))}

          <NexusPaginator
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};
