import React, { useEffect, useState } from "react";
import {
  Bell,
  Check,
  Clock3,
  KeyRound,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { apiAuth } from "../../api";
import type { ContactChannel, OwnProfile } from "../../types";
import { NexusSection } from "../ui/NexusSection";
import { NexusInput, NexusSelect, NexusTextarea } from "../ui/NexusInputs";
import { NexusSectionButton, NexusCardButton } from "../ui/NexusButton";
import { NexusSwitch } from "../ui/NexusSwitch";
import { NexusSectionBadge } from "../ui/NexusBadge";
import { NexusSpinner } from "../ui/NexusSpinner";

export type ProfileViewMode = "details" | "contact" | "notifications" | "security";

interface ProfileViewProps {
  viewMode: ProfileViewMode;
  showToast: (message: string, type?: "success" | "error") => void;
  onIdentityChange: (profile: OwnProfile) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  viewMode,
  showToast,
  onIdentityChange,
}) => {
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    apiAuth.getProfile()
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch(() => showToast("No se pudo cargar tu perfil", "error"))
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showToast]);

  const handleUpdated = (next: OwnProfile) => {
    setProfile(next);
    onIdentityChange(next);
  };

  if (isLoading || !profile) return <NexusSpinner label="Cargando tu perfil..." />;

  if (viewMode === "contact") {
    return <PublicContactView profile={profile} onUpdated={handleUpdated} showToast={showToast} />;
  }
  if (viewMode === "notifications") {
    return <NotificationPreferencesView profile={profile} onUpdated={handleUpdated} showToast={showToast} />;
  }
  if (viewMode === "security") {
    return <SecurityView showToast={showToast} />;
  }
  return <ProfileDetailsView profile={profile} onUpdated={handleUpdated} showToast={showToast} />;
};

interface ProfileSectionProps {
  profile: OwnProfile;
  onUpdated: (profile: OwnProfile) => void;
  showToast: (message: string, type?: "success" | "error") => void;
}

const ProfileDetailsView: React.FC<ProfileSectionProps> = ({ profile, onUpdated, showToast }) => {
  const [form, setForm] = useState({
    name: profile.name,
    username: profile.username,
    email: profile.email || "",
    phone: profile.phone || "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const next = await apiAuth.updateProfile({
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
      });
      onUpdated(next);
      showToast("Perfil actualizado", "success");
    } catch (error: any) {
      showToast(error?.response?.data?.message || "No se pudo actualizar el perfil", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="animate-in fade-in duration-300">
      <NexusSection
        title="Datos personales"
        subtitle="Identidad utilizada dentro del panel administrativo"
        icon={UserRound}
        action={
          <NexusSectionButton type="submit" icon={Save} variant="brand" isLoading={isSaving}>
            Guardar cambios
          </NexusSectionButton>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: "var(--space-md)" }}>
          <NexusInput
            label="Nombre completo"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            icon={UserRound}
            required
          />
          <NexusInput
            label="Nombre de usuario"
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
            icon={UserRound}
            required
          />
          <NexusInput
            label="Correo electrónico"
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            icon={Mail}
          />
          <NexusInput
            label="Teléfono privado"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            icon={Phone}
            placeholder="+521234567890"
            helperText="No se publica automáticamente en el Storefront."
          />
        </div>
      </NexusSection>
    </form>
  );
};

const emptyChannel = (): ContactChannel => ({
  type: "WHATSAPP",
  phoneNumber: "",
  label: "",
  active: true,
});

const PublicContactView: React.FC<ProfileSectionProps> = ({ profile, onUpdated, showToast }) => {
  const existing = profile.contactProfile;
  const canPublish = profile.role === "ADMIN" || profile.role === "SUPERADMIN";
  const [form, setForm] = useState({
    displayName: existing?.displayName || profile.name,
    responsibility: existing?.responsibility || "",
    description: existing?.description || "",
    scheduleText: existing?.scheduleText || "",
    published: existing?.published || false,
    channels: existing?.channels.length ? existing.channels : [emptyChannel()],
  });
  const [isSaving, setIsSaving] = useState(false);

  const updateChannel = (index: number, patch: Partial<ContactChannel>) => {
    setForm((current) => ({
      ...current,
      channels: current.channels.map((channel, channelIndex) =>
        channelIndex === index ? { ...channel, ...patch } : channel,
      ),
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const next = await apiAuth.updateContact({
        displayName: form.displayName.trim() || null,
        responsibility: form.responsibility.trim(),
        description: form.description.trim() || null,
        scheduleText: form.scheduleText.trim() || null,
        ...(canPublish ? { published: form.published } : {}),
        channels: form.channels
          .filter((channel) => channel.phoneNumber.trim())
          .map((channel) => ({
            type: channel.type,
            phoneNumber: channel.phoneNumber.trim(),
            label: channel.label?.trim() || null,
            active: channel.active,
          })),
      });
      onUpdated(next);
      showToast("Contacto público actualizado", "success");
    } catch (error: any) {
      showToast(error?.response?.data?.message || "No se pudo actualizar el contacto", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col animate-in fade-in duration-300" style={{ gap: "var(--space-lg)" }}>
      <NexusSection
        title="Contacto público"
        subtitle="Información visible en la página de contacto del Storefront"
        icon={MessageCircle}
        action={
          <NexusSectionButton type="submit" icon={Save} variant="brand" isLoading={isSaving}>
            Guardar contacto
          </NexusSectionButton>
        }
      >
        <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
          <div
            className="flex flex-col justify-between border border-border-main bg-bg-muted sm:flex-row sm:items-center"
            style={{
              gap: "var(--space-md)",
              padding: "var(--padding-inner)",
              borderRadius: "var(--radius-card-inner)",
            }}
          >
            <div className="flex min-w-0 flex-col" style={{ gap: "var(--space-xs)" }}>
              <div className="flex flex-wrap items-center" style={{ gap: "var(--space-sm)" }}>
                <p className="text-h2 text-text-main">Mostrar en Storefront</p>
                <NexusSectionBadge variant={form.published ? "success" : "muted"}>
                  {form.published ? "Publicado" : "Oculto"}
                </NexusSectionBadge>
              </div>
              <p className="text-secondary text-text-muted">
                {canPublish
                  ? "Controla si este perfil aparece públicamente."
                  : "Un administrador controla la publicación de tu contacto."}
              </p>
            </div>
            <NexusSwitch
              checked={form.published}
              onChange={(published) => setForm({ ...form, published })}
              disabled={!canPublish}
              aria-label="Publicar contacto"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: "var(--space-md)" }}>
            <NexusInput
              label="Nombre público"
              value={form.displayName}
              onChange={(event) => setForm({ ...form, displayName: event.target.value })}
              icon={UserRound}
              required
            />
            <NexusInput
              label="Área de atención"
              value={form.responsibility}
              onChange={(event) => setForm({ ...form, responsibility: event.target.value })}
              icon={ShieldCheck}
              placeholder="Aves de combate, cría, asistencia..."
              required
            />
            <NexusInput
              label="Horario de atención"
              value={form.scheduleText}
              onChange={(event) => setForm({ ...form, scheduleText: event.target.value })}
              icon={Clock3}
              placeholder="Lun a sáb, 9:00 a 18:00"
            />
            <div className="lg:col-span-2">
              <NexusTextarea
                label="Descripción breve"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Indica en qué temas puede ayudar este contacto."
                rows={3}
              />
            </div>
          </div>
        </div>
      </NexusSection>

      <NexusSection
        title="Canales de atención"
        subtitle="WhatsApp y llamadas disponibles para clientes"
        icon={Phone}
        action={
          <NexusSectionButton
            type="button"
            variant="secondary"
            icon={Plus}
            onClick={() => setForm({ ...form, channels: [...form.channels, emptyChannel()] })}
            disabled={form.channels.length >= 6}
          >
            Agregar canal
          </NexusSectionButton>
        }
      >
        <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
          {form.channels.map((channel, index) => (
            <div
              key={`${index}-${channel.type}`}
              className="grid grid-cols-1 items-end border border-border-main bg-bg-muted lg:grid-cols-[minmax(10rem,0.8fr)_minmax(14rem,1.2fr)_minmax(10rem,1fr)_auto]"
              style={{
                gap: "var(--space-md)",
                padding: "var(--padding-inner)",
                borderRadius: "var(--radius-card-inner)",
              }}
            >
              <NexusSelect
                label="Tipo"
                value={channel.type}
                onChange={(event) => updateChannel(index, { type: event.target.value as ContactChannel["type"] })}
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="PHONE">Llamada</option>
              </NexusSelect>
              <NexusInput
                label="Número"
                value={channel.phoneNumber}
                onChange={(event) => updateChannel(index, { phoneNumber: event.target.value })}
                icon={channel.type === "WHATSAPP" ? MessageCircle : Phone}
                placeholder="+521234567890"
                required
              />
              <NexusInput
                label="Etiqueta"
                value={channel.label || ""}
                onChange={(event) => updateChannel(index, { label: event.target.value })}
                placeholder="Principal, oficina..."
              />
              <NexusCardButton
                type="button"
                variant="danger"
                icon={Trash2}
                isIconOnly
                aria-label="Eliminar canal"
                onClick={() => setForm({
                  ...form,
                  channels: form.channels.filter((_, channelIndex) => channelIndex !== index),
                })}
              />
            </div>
          ))}
        </div>
      </NexusSection>
    </form>
  );
};

const NotificationPreferencesView: React.FC<ProfileSectionProps> = ({ profile, onUpdated, showToast }) => {
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
        subtitle="Avisos personales relacionados con nuevas órdenes"
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
            label="Correo de recepción"
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

const SecurityView: React.FC<Pick<ProfileSectionProps, "showToast">> = ({ showToast }) => {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [isSaving, setIsSaving] = useState(false);
  const isValid = form.current.length > 0 && form.next.length >= 8 && form.next === form.confirm;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid) return;
    setIsSaving(true);
    try {
      await apiAuth.changePassword(form.current, form.next);
      setForm({ current: "", next: "", confirm: "" });
      showToast("Contraseña actualizada", "success");
    } catch (error: any) {
      showToast(error?.response?.data?.message || "No se pudo cambiar la contraseña", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="animate-in fade-in duration-300">
      <NexusSection
        title="Seguridad"
        subtitle="Actualiza tu contraseña confirmando primero tu identidad"
        icon={KeyRound}
        action={
          <NexusSectionButton
            type="submit"
            icon={Check}
            variant="brand"
            disabled={!isValid}
            isLoading={isSaving}
          >
            Cambiar contraseña
          </NexusSectionButton>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: "var(--space-md)" }}>
          <div className="lg:col-span-2">
            <NexusInput
              label="Contraseña actual"
              type="password"
              value={form.current}
              onChange={(event) => setForm({ ...form, current: event.target.value })}
              icon={KeyRound}
              required
            />
          </div>
          <NexusInput
            label="Nueva contraseña"
            type="password"
            value={form.next}
            onChange={(event) => setForm({ ...form, next: event.target.value })}
            icon={ShieldCheck}
            helperText="Mínimo 8 caracteres."
            required
          />
          <NexusInput
            label="Confirmar contraseña"
            type="password"
            value={form.confirm}
            onChange={(event) => setForm({ ...form, confirm: event.target.value })}
            icon={ShieldCheck}
            required
          />
        </div>
      </NexusSection>
    </form>
  );
};
