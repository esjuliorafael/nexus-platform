import React, { useState } from "react";
import { Bell, Mail, Save } from "lucide-react";
import { apiAuth } from "../../api";
import type { OwnProfile } from "../../types";
import { NexusSection } from "../ui/NexusSection";
import { NexusSectionButton } from "../ui/NexusButton";
import { NexusInput } from "../ui/NexusInputs";
import { NexusSwitch } from "../ui/NexusSwitch";
import type { ToastHandler } from "./profileTypes";

interface NotificationPreferencesViewProps {
  profile: OwnProfile;
  onUpdated: (profile: OwnProfile) => void;
  showToast: ToastHandler;
}

export const NotificationPreferencesView: React.FC<NotificationPreferencesViewProps> = ({
  profile,
  onUpdated,
  showToast,
}) => {
  const [active, setActive] = useState(profile.receiveNotifications);
  const [email, setEmail] = useState(profile.notificationEmail || profile.email || "");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const next = await apiAuth.updateNotifications({
        receiveNotifications: active,
        notificationEmail: active ? email.trim() : null,
      });
      onUpdated(next);
      showToast("Preferencias actualizadas", "success");
    } catch (error: any) {
      showToast(error?.response?.data?.message || "No se pudieron guardar las preferencias", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="animate-in fade-in duration-300">
      <NexusSection
        title="Notificaciones"
        subtitle="Avisos personales relacionados con nuevas ordenes"
        icon={Bell}
        action={
          <NexusSectionButton type="submit" icon={Save} variant="brand" isLoading={isSaving}>
            Guardar preferencias
          </NexusSectionButton>
        }
      >
        <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
          <div className="flex items-center justify-between" style={{ gap: "var(--space-md)" }}>
            <div className="flex min-w-0 flex-col" style={{ gap: "var(--space-xs)" }}>
              <p className="text-h2 text-text-main">Alertas por correo</p>
              <p className="text-secondary text-text-muted">Recibe un resumen cuando se registre una nueva orden.</p>
            </div>
            <NexusSwitch checked={active} onChange={setActive} aria-label="Activar alertas por correo" />
          </div>
          <NexusInput
            label="Correo de recepcion"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            icon={Mail}
            disabled={!active}
            required={active}
          />
        </div>
      </NexusSection>
    </form>
  );
};
