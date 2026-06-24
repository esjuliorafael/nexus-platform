import React, { useEffect, useState } from "react";
import { Clock3, MessageCircle, Phone, Plus, Save, Trash2, UserRound } from "lucide-react";
import type { ContactChannel, User } from "../../../types";
import { apiUsers } from "../../../api";
import { NexusModal, NexusModalActions } from "../../ui/NexusModal";
import { NexusInput, NexusSelect, NexusTextarea } from "../../ui/NexusInputs";
import { NexusAutonomousButton, NexusCardButton } from "../../ui/NexusButton";
import { NexusSwitch } from "../../ui/NexusSwitch";

interface UserContactModalProps {
  user: User | null;
  onClose: () => void;
  onSaved: () => void;
  showToast: (message: string, type?: "success" | "error") => void;
}

const createChannel = (): ContactChannel => ({
  type: "WHATSAPP",
  phoneNumber: "",
  label: "",
  active: true,
});

export const UserContactModal: React.FC<UserContactModalProps> = ({
  user,
  onClose,
  onSaved,
  showToast,
}) => {
  const [form, setForm] = useState({
    displayName: "",
    responsibility: "",
    description: "",
    scheduleText: "",
    published: false,
    channels: [createChannel()],
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const profile = user.contactProfile;
    setForm({
      displayName: profile?.displayName || user.name,
      responsibility: profile?.responsibility || "",
      description: profile?.description || "",
      scheduleText: profile?.scheduleText || "",
      published: profile?.published || false,
      channels: profile?.channels.length ? profile.channels : [createChannel()],
    });
  }, [user]);

  if (!user) return null;

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
      await apiUsers.updateContact(user.id, {
        displayName: form.displayName.trim() || null,
        responsibility: form.responsibility.trim(),
        description: form.description.trim() || null,
        scheduleText: form.scheduleText.trim() || null,
        published: form.published,
        channels: form.channels
          .filter((channel) => channel.phoneNumber.trim())
          .map((channel) => ({
            type: channel.type,
            phoneNumber: channel.phoneNumber.trim(),
            label: channel.label?.trim() || null,
            active: channel.active,
          })),
      });
      showToast("Contacto público actualizado", "success");
      onSaved();
      onClose();
    } catch (error: any) {
      showToast(error?.response?.data?.message || "No se pudo guardar el contacto", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <NexusModal
      isOpen
      title={user.name}
      eyebrow="Contacto Público"
      icon={MessageCircle}
      size="wide"
      onClose={onClose}
    >
      <form onSubmit={submit} className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
        <div className="flex items-center justify-between" style={{ gap: "var(--space-md)" }}>
          <div className="flex flex-col" style={{ gap: "var(--space-xs)" }}>
            <p className="text-h2 text-text-main">Mostrar en Storefront</p>
            <p className="text-secondary text-text-muted">La cuenta también debe permanecer activa.</p>
          </div>
          <NexusSwitch
            checked={form.published}
            onChange={(published) => setForm({ ...form, published })}
            aria-label="Publicar contacto"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "var(--space-md)" }}>
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
            icon={MessageCircle}
            required
          />
          <NexusInput
            label="Horario"
            value={form.scheduleText}
            onChange={(event) => setForm({ ...form, scheduleText: event.target.value })}
            icon={Clock3}
          />
          <div className="sm:col-span-2">
            <NexusTextarea
              label="Descripción breve"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={3}
            />
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
          <div className="flex items-center justify-between" style={{ gap: "var(--space-md)" }}>
            <p className="text-h2 text-text-main">Canales</p>
            <NexusAutonomousButton
              type="button"
              density="compact"
              variant="secondary"
              icon={Plus}
              onClick={() => setForm({ ...form, channels: [...form.channels, createChannel()] })}
              disabled={form.channels.length >= 6}
            >
              Agregar
            </NexusAutonomousButton>
          </div>

          {form.channels.map((channel, index) => (
            <div
              key={`${index}-${channel.type}`}
              className="grid grid-cols-1 items-end border border-border-main bg-bg-muted sm:grid-cols-[0.8fr_1.2fr_1fr_auto]"
              style={{
                gap: "var(--space-md)",
                padding: "var(--space-base)",
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
                icon={Phone}
                placeholder="+521234567890"
                required
              />
              <NexusInput
                label="Etiqueta"
                value={channel.label || ""}
                onChange={(event) => updateChannel(index, { label: event.target.value })}
              />
              <NexusCardButton
                type="button"
                variant="danger"
                icon={Trash2}
                isIconOnly
                onClick={() => setForm({
                  ...form,
                  channels: form.channels.filter((_, channelIndex) => channelIndex !== index),
                })}
                aria-label="Eliminar canal"
              />
            </div>
          ))}
        </div>

        <NexusModalActions>
          <NexusAutonomousButton type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </NexusAutonomousButton>
          <NexusAutonomousButton
            type="submit"
            variant="brand"
            icon={Save}
            isLoading={isSaving}
            disabled={!form.responsibility.trim()}
            className="flex-[2]"
          >
            Guardar contacto
          </NexusAutonomousButton>
        </NexusModalActions>
      </form>
    </NexusModal>
  );
};
