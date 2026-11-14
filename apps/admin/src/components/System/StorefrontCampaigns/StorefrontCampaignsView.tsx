import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  CalendarClock,
  Megaphone,
  Pencil,
  Plus,
  Tag,
  Trash2,
} from "lucide-react";
import { apiStorefrontCampaigns } from "../../../api";
import type { StorefrontCampaign } from "../../../types";
import { EmptyState } from "../../ui/EmptyState";
import { NexusSectionButton } from "../../ui/NexusButton";
import { NexusHero } from "../../ui/NexusHero";
import { NexusSpinner } from "../../ui/NexusSpinner";
import { NexusAutonomousBadge } from "../../ui/NexusBadge";
import { NexusAutonomousCard } from "../../ui/NexusCard";
import { NexusSwitch } from "../../ui/NexusSwitch";
import {
  StorefrontCampaignForm,
  StorefrontCampaignFormRef,
} from "./StorefrontCampaignForm";

export type StorefrontCampaignViewMode = "list" | "create" | "edit";
export interface StorefrontCampaignsViewRef {
  handleSave: () => void;
}

interface Props {
  viewMode: StorefrontCampaignViewMode;
  onSetViewMode: (mode: StorefrontCampaignViewMode) => void;
  showToast: (message: string, type?: "success" | "error") => void;
  setConfirmDialog: (dialog: any) => void;
  onValidationChange?: (valid: boolean) => void;
  canManage: boolean;
  canDelete: boolean;
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

function statusOf(campaign: StorefrontCampaign) {
  const now = Date.now();
  if (!campaign.active) return { label: "Pausada", variant: "muted" as const };
  if (new Date(campaign.startsAt).getTime() > now)
    return { label: "Programada", variant: "warning" as const };
  if (new Date(campaign.endsAt).getTime() < now)
    return { label: "Finalizada", variant: "muted" as const };
  return { label: "Activa", variant: "success" as const };
}

export const StorefrontCampaignsView = forwardRef<
  StorefrontCampaignsViewRef,
  Props
>(
  (
    {
      viewMode,
      onSetViewMode,
      showToast,
      setConfirmDialog,
      onValidationChange,
      canManage,
      canDelete,
    },
    ref,
  ) => {
    const [items, setItems] = useState<StorefrontCampaign[]>([]);
    const [selected, setSelected] = useState<StorefrontCampaign | null>(null);
    const [loading, setLoading] = useState(true);
    const [changingId, setChangingId] = useState<string | null>(null);
    const formRef = useRef<StorefrontCampaignFormRef>(null);

    const load = async () => {
      setLoading(true);
      try {
        setItems(await apiStorefrontCampaigns.getAll());
      } catch {
        showToast("No se pudieron cargar las campañas", "error");
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      void load();
    }, []);
    useImperativeHandle(ref, () => ({
      handleSave: () => formRef.current?.handleSave(),
    }));

    if (viewMode !== "list" && canManage) {
      return (
        <StorefrontCampaignForm
          ref={formRef}
          initialData={viewMode === "edit" ? selected : null}
          onValidationChange={onValidationChange}
          showToast={showToast}
          onSave={() => {
            onSetViewMode("list");
            setSelected(null);
            void load();
          }}
        />
      );
    }

    if (loading)
      return <NexusSpinner label="Cargando campañas del Storefront..." />;

    return (
      <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
        <NexusHero
          title="Campañas del Storefront"
          subtitle="Promociones programadas"
          icon={Megaphone}
          variant="dark"
          badge="Con cupón"
          badgeValue={`${items.length} configuradas`}
        />
        {items.length === 0 ? (
          <EmptyState
            level={1}
            icon={Megaphone}
            title="Sin campañas configuradas"
            description="Programa una promoción con un cupón existente, un mensaje y una fecha de vigencia."
            action={
              canManage ? (
                <NexusSectionButton
                  icon={Plus}
                  onClick={() => onSetViewMode("create")}
                >
                  Nueva campaña
                </NexusSectionButton>
              ) : undefined
            }
          />
        ) : (
          <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
            {items.map((item) => {
              const status = statusOf(item);
              return (
                <NexusAutonomousCard
                  key={item.id}
                  swipeable={canManage || canDelete}
                  onEdit={
                    canManage
                      ? () => {
                          setSelected(item);
                          onSetViewMode("edit");
                        }
                      : undefined
                  }
                  onDelete={
                    canDelete
                      ? () =>
                          setConfirmDialog({
                            isOpen: true,
                            title: "¿Eliminar campaña?",
                            message: `Se eliminará “${item.name}”. El cupón asociado no se eliminará.`,
                            confirmLabel: "Sí, eliminar",
                            variant: "danger",
                            onConfirm: async () => {
                              try {
                                await apiStorefrontCampaigns.delete(item.id);
                                setItems((current) =>
                                  current.filter(
                                    (entry) => entry.id !== item.id,
                                  ),
                                );
                                showToast("Campaña eliminada");
                              } catch {
                                showToast(
                                  "No se pudo eliminar la campaña",
                                  "error",
                                );
                              }
                              setConfirmDialog({ isOpen: false });
                            },
                          })
                      : undefined
                  }
                  isMuted={!item.active}
                >
                  <div
                    className="flex flex-col md:flex-row md:items-center"
                    style={{ gap: "var(--space-lg)" }}
                  >
                    <div
                      className="flex min-w-0 flex-1 items-start"
                      style={{ gap: "var(--space-md)" }}
                    >
                      <div
                        className="flex shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"
                        style={{
                          width: "var(--size-button-section)",
                          height: "var(--size-button-section)",
                        }}
                      >
                        <Megaphone size={20} />
                      </div>
                      <div
                        className="flex min-w-0 flex-1 flex-col"
                        style={{ gap: "var(--space-sm)" }}
                      >
                        <div
                          className="flex flex-wrap"
                          style={{ gap: "var(--space-xs)" }}
                        >
                          <NexusAutonomousBadge variant={status.variant}>
                            {status.label}
                          </NexusAutonomousBadge>
                          <NexusAutonomousBadge variant="brand">
                            {item.coupon.discountValue}% · {item.coupon.code}
                          </NexusAutonomousBadge>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-h2 text-text-main">
                            {item.title}
                          </h3>
                          <p className="text-secondary text-text-muted">
                            {item.name}
                            {item.message ? ` · ${item.message}` : ""}
                          </p>
                        </div>
                        <div
                          className="flex flex-wrap items-center text-secondary text-text-muted"
                          style={{ gap: "var(--space-md)" }}
                        >
                          <span
                            className="inline-flex items-center"
                            style={{ gap: "var(--space-xs)" }}
                          >
                            <CalendarClock size={16} />
                            {formatDate(item.startsAt)} –{" "}
                            {formatDate(item.endsAt)}
                          </span>
                          <span
                            className="inline-flex items-center"
                            style={{ gap: "var(--space-xs)" }}
                          >
                            <Tag size={16} />
                            {item.coupon.scope === "BIRD"
                              ? "Aves"
                              : item.coupon.scope === "ITEM"
                                ? "Artículos"
                                : "Aves y artículos"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div
                      className="flex items-center justify-between border-t border-border-main pt-[var(--space-md)] md:border-t-0 md:pt-0"
                      style={{ gap: "var(--space-lg)" }}
                    >
                      <div
                        className="flex flex-col items-center"
                        style={{ gap: "var(--space-xs)" }}
                      >
                        <NexusSwitch
                          checked={item.active}
                          onChange={async (active) => {
                            setChangingId(item.id);
                            try {
                              const updated =
                                await apiStorefrontCampaigns.updateActive(
                                  item.id,
                                  active,
                                );
                              setItems((current) =>
                                current.map((entry) =>
                                  entry.id === item.id ? updated : entry,
                                ),
                              );
                              showToast(
                                active
                                  ? "Campaña programada"
                                  : "Campaña pausada",
                              );
                            } catch (error: any) {
                              showToast(
                                error?.response?.data?.message ||
                                  "No se pudo cambiar el estado",
                                "error",
                              );
                            } finally {
                              setChangingId(null);
                            }
                          }}
                          disabled={changingId === item.id || !canManage}
                          aria-label={
                            item.active ? "Pausar campaña" : "Activar campaña"
                          }
                        />
                        <span className="text-label uppercase text-text-muted">
                          {item.active ? status.label : "Pausada"}
                        </span>
                      </div>
                      {(canManage || canDelete) && (
                        <div
                          className="hidden items-center sm:flex"
                          style={{ gap: "var(--space-sm)" }}
                        >
                          {canManage && (
                            <NexusSectionButton
                              isIconOnly
                              icon={Pencil}
                              variant="secondary"
                              onClick={() => {
                                setSelected(item);
                                onSetViewMode("edit");
                              }}
                              aria-label="Editar campaña"
                            />
                          )}
                          {canDelete && (
                            <NexusSectionButton
                              isIconOnly
                              icon={Trash2}
                              variant="secondary"
                              onClick={() =>
                                setConfirmDialog({
                                  isOpen: true,
                                  title: "¿Eliminar campaña?",
                                  message: `Se eliminará “${item.name}”. El cupón asociado no se eliminará.`,
                                  confirmLabel: "Sí, eliminar",
                                  variant: "danger",
                                  onConfirm: async () => {
                                    try {
                                      await apiStorefrontCampaigns.delete(
                                        item.id,
                                      );
                                      setItems((current) =>
                                        current.filter(
                                          (entry) => entry.id !== item.id,
                                        ),
                                      );
                                      showToast("Campaña eliminada");
                                    } catch {
                                      showToast(
                                        "No se pudo eliminar la campaña",
                                        "error",
                                      );
                                    }
                                    setConfirmDialog({ isOpen: false });
                                  },
                                })
                              }
                              aria-label="Eliminar campaña"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </NexusAutonomousCard>
              );
            })}
            {canManage && (
              <div className="flex justify-start">
                <NexusSectionButton
                  icon={Plus}
                  onClick={() => onSetViewMode("create")}
                >
                  Nueva campaña
                </NexusSectionButton>
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);
