import React, { useEffect, useMemo, useState } from "react";
import { BadgePercent, Plus } from "lucide-react";
import { apiCoupons } from "../../../api";
import type { Coupon } from "../../../types";
import { EmptyState } from "../../ui/EmptyState";
import { NexusSectionButton } from "../../ui/NexusButton";
import { NexusPaginator } from "../../ui/NexusPaginator";
import { NexusSpinner } from "../../ui/NexusSpinner";
import { CouponCard } from "./CouponCard";

interface CouponsViewProps {
  showToast: (message: string, type?: "success" | "error") => void;
  setConfirmDialog: (dialog: any) => void;
  onCreate: () => void;
  onEdit: (coupon: Coupon) => void;
}

const ITEMS_PER_PAGE = 8;

export const CouponsView: React.FC<CouponsViewProps> = ({
  showToast,
  setConfirmDialog,
  onCreate,
  onEdit,
}) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(() => new Set());

  const orderedCoupons = useMemo(() => {
    return [...coupons].sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [coupons]);

  const totalPages = Math.ceil(orderedCoupons.length / ITEMS_PER_PAGE);
  const paginatedCoupons = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return orderedCoupons.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, orderedCoupons]);

  useEffect(() => {
    setCurrentPage(1);
  }, [coupons.length]);

  const loadCoupons = async () => {
    setIsLoading(true);
    try {
      setCoupons(await apiCoupons.getAll());
    } catch (error) {
      console.error("Error cargando cupones:", error);
      showToast("No se pudieron cargar los cupones", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCoupons();
  }, []);

  const handleDelete = (coupon: Coupon) => {
    setConfirmDialog({
      isOpen: true,
      title: "¿Eliminar cupón?",
      message: `Se eliminará el cupón ${coupon.code}.`,
      confirmLabel: "Sí, eliminar",
      variant: "danger",
      onConfirm: async () => {
        try {
          await apiCoupons.delete(coupon.id);
          setCoupons((prev) => prev.filter((item) => item.id !== coupon.id));
          showToast("Cupón eliminado");
        } catch (error) {
          showToast("No se pudo eliminar el cupón", "error");
        }
        setConfirmDialog({ isOpen: false });
      },
    });
  };

  const handleToggleActive = async (coupon: Coupon) => {
    const nextActive = !coupon.active;
    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.add(coupon.id);
      return next;
    });
    setCoupons((prev) =>
      prev.map((item) =>
        item.id === coupon.id ? { ...item, active: nextActive } : item,
      ),
    );

    try {
      await apiCoupons.update(coupon.id, { active: nextActive });
      showToast(nextActive ? "Cupón activado" : "Cupón pausado");
    } catch (error) {
      setCoupons((prev) =>
        prev.map((item) =>
          item.id === coupon.id ? { ...item, active: coupon.active } : item,
        ),
      );
      showToast("No se pudo cambiar el estado del cupón", "error");
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(coupon.id);
        return next;
      });
    }
  };

  if (isLoading) return <NexusSpinner label="Cargando cupones..." />;

  return (
    <div
      className="flex flex-col"
      style={{ gap: "var(--space-lg)", paddingBottom: "var(--space-3xl)" }}
    >
      {coupons.length === 0 ? (
        <EmptyState
          level={1}
          icon={BadgePercent}
          title="Sin cupones"
          description="Crea códigos de descuento para promociones de tienda."
          action={
            <NexusSectionButton icon={Plus} onClick={onCreate}>
              Crear cupón
            </NexusSectionButton>
          }
        />
      ) : (
        <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
          {paginatedCoupons.map((coupon) => (
            <CouponCard
              key={coupon.id}
              coupon={coupon}
              onEdit={() => onEdit(coupon)}
              onDelete={() => handleDelete(coupon)}
              onToggleActive={() => handleToggleActive(coupon)}
              isToggling={togglingIds.has(coupon.id)}
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
