import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { BellRing, Plus } from "lucide-react";
import { apiStorefrontAnnouncements } from "../../../api";
import type { StorefrontAnnouncement } from "../../../types";
import { EmptyState } from "../../ui/EmptyState";
import { NexusSectionButton } from "../../ui/NexusButton";
import { NexusHero } from "../../ui/NexusHero";
import { NexusSpinner } from "../../ui/NexusSpinner";
import { StorefrontAnnouncementCard } from "./StorefrontAnnouncementCard";
import { StorefrontAnnouncementForm, StorefrontAnnouncementFormRef } from "./StorefrontAnnouncementForm";

export type StorefrontAnnouncementViewMode = "list" | "create" | "edit";
export interface StorefrontAnnouncementViewRef { handleSave: () => void }

interface Props {
  viewMode: StorefrontAnnouncementViewMode;
  onSetViewMode: (mode: StorefrontAnnouncementViewMode) => void;
  showToast: (message: string, type?: "success" | "error") => void;
  setConfirmDialog: (dialog: any) => void;
  onValidationChange?: (valid: boolean) => void;
}

export const StorefrontAnnouncementView = forwardRef<StorefrontAnnouncementViewRef, Props>(({
  viewMode, onSetViewMode, showToast, setConfirmDialog, onValidationChange,
}, ref) => {
  const [items, setItems] = useState<StorefrontAnnouncement[]>([]);
  const [selected, setSelected] = useState<StorefrontAnnouncement | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const formRef = useRef<StorefrontAnnouncementFormRef>(null);

  const load = async () => {
    setLoading(true);
    try { setItems(await apiStorefrontAnnouncements.getAll()); }
    catch { showToast("No se pudieron cargar los avisos", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);
  useImperativeHandle(ref, () => ({ handleSave: () => formRef.current?.handleSave() }));

  if (viewMode !== "list") {
    return <StorefrontAnnouncementForm ref={formRef} initialData={viewMode === "edit" ? selected : null} onValidationChange={onValidationChange} showToast={showToast} onSave={() => { onSetViewMode("list"); setSelected(null); void load(); }} />;
  }

  if (loading) return <NexusSpinner label="Cargando avisos del Storefront..." />;

  return (
    <div className="flex flex-col" style={{ gap: "var(--space-lg)", paddingBottom: "var(--space-xl)" }}>
      <NexusHero title="Avisos del Storefront" subtitle="Comunicación pública" icon={BellRing} variant="dark" badge="Centralizados" badgeValue={`${items.length} configurados`} />
      {items.length === 0 ? (
        <EmptyState level={1} icon={BellRing} title="Sin avisos configurados" description="Publica mensajes globales o específicos sin modificar una rifa o producto." action={<NexusSectionButton icon={Plus} onClick={() => onSetViewMode("create")}>Nuevo aviso</NexusSectionButton>} />
      ) : (
        <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
          {items.map((item) => (
            <StorefrontAnnouncementCard
              key={item.id}
              announcement={item}
              isToggling={toggling === item.id}
              onEdit={() => { setSelected(item); onSetViewMode("edit"); }}
              onToggle={async (active) => {
                setToggling(item.id);
                setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, active } : entry));
                try { await apiStorefrontAnnouncements.updateStatus(item.id, active); showToast(active ? "Aviso publicado" : "Aviso pausado"); }
                catch { setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, active: item.active } : entry)); showToast("No se pudo cambiar el estado", "error"); }
                finally { setToggling(null); }
              }}
              onDelete={() => setConfirmDialog({
                isOpen: true,
                title: "¿Eliminar aviso?",
                message: `Se eliminará “${item.title}”.`,
                confirmLabel: "Sí, eliminar",
                variant: "danger",
                onConfirm: async () => {
                  try { await apiStorefrontAnnouncements.delete(item.id); setItems((current) => current.filter((entry) => entry.id !== item.id)); showToast("Aviso eliminado"); }
                  catch { showToast("No se pudo eliminar el aviso", "error"); }
                  setConfirmDialog({ isOpen: false });
                },
              })}
            />
          ))}
        </div>
      )}
    </div>
  );
});

