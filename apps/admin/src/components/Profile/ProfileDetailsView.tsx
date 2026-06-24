import React, { useState } from "react";
import { Mail, Phone, Save, UserRound } from "lucide-react";
import { apiAuth } from "../../api";
import type { OwnProfile } from "../../types";
import { NexusSection } from "../ui/NexusSection";
import { NexusSectionButton } from "../ui/NexusButton";
import { NexusInput } from "../ui/NexusInputs";
import type { ToastHandler } from "./profileTypes";

interface ProfileDetailsViewProps {
  profile: OwnProfile;
  onUpdated: (profile: OwnProfile) => void;
  showToast: ToastHandler;
}

export const ProfileDetailsView: React.FC<ProfileDetailsViewProps> = ({
  profile,
  onUpdated,
  showToast,
}) => {
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
            label="Correo electronico"
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            icon={Mail}
          />
          <NexusInput
            label="Telefono privado"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            icon={Phone}
            placeholder="+521234567890"
            helperText="No se publica automaticamente en el Storefront."
          />
        </div>
      </NexusSection>
    </form>
  );
};
