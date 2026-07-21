import React, { useEffect, useMemo, useState } from "react";
import { BadgePercent, Plus } from "lucide-react";
import { apiRaffleCoupons, type RaffleCouponRecord } from "../../../api";
import { EmptyState } from "../../ui/EmptyState";
import { NexusSectionButton } from "../../ui/NexusButton";
import { NexusPaginator } from "../../ui/NexusPaginator";
import { NexusSpinner } from "../../ui/NexusSpinner";
import { RaffleCouponCard } from "./RaffleCouponCard";

interface RaffleCouponsViewProps {
  showToast: (message: string, type?: "success" | "error") => void;
  setConfirmDialog: (dialog: any) => void;
  onCreate: () => void;
  onEdit: (coupon: RaffleCouponRecord) => void;
}

const ITEMS_PER_PAGE = 8;

export const RaffleCouponsView: React.FC<RaffleCouponsViewProps> = ({
  showToast,
  setConfirmDialog,
  onCreate,
  onEdit,
}) => {
  const [coupons, setCoupons] = useState<RaffleCouponRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(() => new Set());

  const orderedCoupons = useMemo(
    () =>
      [...coupons].sort((left, right) => {
        if (left.active !== right.active) return left.active ? -1 : 1;
        return left.code.localeCompare(right.code, "es-MX");
      }),
    [coupons],
  );
  const totalPages = Math.max(1, Math.ceil(orderedCoupons.length / ITEMS_PER_PAGE));
  const paginatedCoupons = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return orderedCoupons.slice(start, start + ITEMS_PER_PAGE);
  }, [currentPage, orderedCoupons]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    apiRaffleCoupons
      .getAll()
      .then((data) => {
        if (!cancelled) setCoupons(data);
      })
      .catch(() => showToast("No se pudieron cargar los cupones de rifas", "error"))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleToggleActive = async (coupon: RaffleCouponRecord) => {
    const nextActive = !coupon.active;
    setTogglingIds((current) => new Set(current).add(coupon.id));
    setCoupons((current) =>
      current.map((item) =>
        item.id === coupon.id ? { ...item, active: nextActive } : item,
      ),
    );
    try {
      await apiRaffleCoupons.update(coupon.id, { active: nextActive });
      showToast(nextActive ? "Cupón activado" : "Cupón pausado");
    } catch {
      setCoupons((current) =>
        current.map((item) =>
          item.id === coupon.id ? { ...item, active: coupon.active } : item,
        ),
      );
      showToast("No se pudo cambiar el estado del cupón", "error");
    } finally {
      setTogglingIds((current) => {
        const next = new Set(current);
        next.delete(coupon.id);
        return next;
      });
    }
  };

  const handleDelete = (coupon: RaffleCouponRecord) => {
    setConfirmDialog({
      isOpen: true,
      title: "¿Eliminar cupón?",
      message: `Se eliminará el cupón ${coupon.code}.`,
      confirmLabel: "Sí, eliminar",
      variant: "danger",
      onConfirm: async () => {
        try {
          await apiRaffleCoupons.delete(coupon.id);
          setCoupons((current) => current.filter((item) => item.id !== coupon.id));
          showToast("Cupón eliminado");
        } catch {
          showToast("No se pudo eliminar el cupón", "error");
        }
        setConfirmDialog({ isOpen: false });
      },
    });
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
          description="Crea códigos de descuento para las participaciones en rifas."
          action={
            <NexusSectionButton icon={Plus} onClick={onCreate}>
              Crear cupón
            </NexusSectionButton>
          }
        />
      ) : (
        <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
          {paginatedCoupons.map((coupon) => (
            <RaffleCouponCard
              key={coupon.id}
              coupon={coupon}
              onEdit={() => onEdit(coupon)}
              onDelete={() => handleDelete(coupon)}
              onToggleActive={() => void handleToggleActive(coupon)}
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
