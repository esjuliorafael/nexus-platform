import React, { useEffect, useState } from "react";
import {
  Clock3,
  MessageCircle,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import type { ContactChannel } from "../../types";
import { NexusSection } from "../ui/NexusSection";
import { NexusCardButton, NexusSectionButton } from "../ui/NexusButton";
import { NexusInput, NexusSelect, NexusTextarea } from "../ui/NexusInputs";
import { NexusBadge } from "../ui/NexusBadge";
import { NexusSwitch } from "../ui/NexusSwitch";
import type { ContactProfileOwner, ToastHandler } from "./profileTypes";

interface PublicContactViewProps {
  profile: ContactProfileOwner;
  showToast: ToastHandler;
  saveContact: (data: any) => Promise<unknown>;
  onSaved?: (result: unknown) => void;
  canPublish?: boolean;
  saveLabel?: string;
  successMessage?: string;
}

const emptyChannel = (): ContactChannel => ({
  type: "WHATSAPP",
  phoneNumber: "",
  label: "",
  active: true,
});

export const PublicContactView: React.FC<PublicContactViewProps> = ({
  profile,
  showToast,
  saveContact,
  onSaved,
  canPublish = profile.role === "ADMIN" || profile.role === "SUPERADMIN",
  saveLabel = "Guardar contacto",
  successMessage = "Contacto publico actualizado",
}) => {
  const existing = profile.contactProfile;
  const [form, setForm] = useState({
    displayName: existing?.displayName || profile.name,
    responsibility: existing?.responsibility || "",
    description: existing?.description || "",
    scheduleText: existing?.scheduleText || "",
    published: existing?.published || false,
    channels: existing?.channels.length ? existing.channels : [emptyChannel()],
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setForm({
      displayName: existing?.displayName || profile.name,
      responsibility: existing?.responsibility || "",
      description: existing?.description || "",
      scheduleText: existing?.scheduleText || "",
      published: existing?.published || false,
      channels: existing?.channels.length ? existing.channels : [emptyChannel()],
    });
  }, [existing, profile.name]);

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
      const result = await saveContact({
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
      showToast(successMessage, "success");
      onSaved?.(result);
    } catch (error: any) {
      showToast(error?.response?.data?.message || "No se pudo actualizar el contacto", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col animate-in fade-in duration-300"
      style={{ gap: "var(--space-lg)" }}
    >
      <NexusSection
        title="Contacto publico"
        subtitle="Informacion visible en la pagina de contacto del Storefront"
        icon={MessageCircle}
        action={
          <NexusSectionButton type="submit" icon={Save} variant="brand" isLoading={isSaving}>
            {saveLabel}
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
                <NexusBadge context="card" variant={form.published ? "success" : "muted"}>
                  {form.published ? "Publicado" : "Oculto"}
                </NexusBadge>
              </div>
              <p className="text-secondary text-text-muted">
                {canPublish
                  ? "Controla si este perfil aparece publicamente."
                  : "Un administrador controla la publicacion de este contacto."}
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
              label="Nombre publico"
              value={form.displayName}
              onChange={(event) => setForm({ ...form, displayName: event.target.value })}
              icon={UserRound}
              required
            />
            <NexusInput
              label="Area de atencion"
              value={form.responsibility}
              onChange={(event) => setForm({ ...form, responsibility: event.target.value })}
              icon={ShieldCheck}
              placeholder="Aves de combate, cria, asistencia..."
              required
            />
            <NexusInput
              label="Horario de atencion"
              value={form.scheduleText}
              onChange={(event) => setForm({ ...form, scheduleText: event.target.value })}
              icon={Clock3}
              placeholder="Lun a sab, 9:00 a 18:00"
            />
            <div className="lg:col-span-2">
              <NexusTextarea
                label="Descripcion breve"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Indica en que temas puede ayudar este contacto."
                rows={3}
              />
            </div>
          </div>
        </div>
      </NexusSection>

      <NexusSection
        title="Canales de atencion"
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
                label="Numero"
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
