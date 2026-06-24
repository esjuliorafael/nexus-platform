import React, { useState } from "react";
import { Check, KeyRound, ShieldCheck } from "lucide-react";
import { apiAuth } from "../../api";
import { NexusSection } from "../ui/NexusSection";
import { NexusSectionButton } from "../ui/NexusButton";
import { NexusInput } from "../ui/NexusInputs";
import type { ToastHandler } from "./profileTypes";

interface SecurityViewProps {
  showToast: ToastHandler;
}

export const SecurityView: React.FC<SecurityViewProps> = ({ showToast }) => {
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
      showToast("Contrasena actualizada", "success");
    } catch (error: any) {
      showToast(error?.response?.data?.message || "No se pudo cambiar la contrasena", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="animate-in fade-in duration-300">
      <NexusSection
        title="Seguridad"
        subtitle="Actualiza tu contrasena confirmando primero tu identidad"
        icon={KeyRound}
        action={
          <NexusSectionButton
            type="submit"
            icon={Check}
            variant="brand"
            disabled={!isValid}
            isLoading={isSaving}
          >
            Cambiar contrasena
          </NexusSectionButton>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: "var(--space-md)" }}>
          <div className="lg:col-span-2">
            <NexusInput
              label="Contrasena actual"
              type="password"
              value={form.current}
              onChange={(event) => setForm({ ...form, current: event.target.value })}
              icon={KeyRound}
              required
            />
          </div>
          <NexusInput
            label="Nueva contrasena"
            type="password"
            value={form.next}
            onChange={(event) => setForm({ ...form, next: event.target.value })}
            icon={ShieldCheck}
            helperText="Minimo 8 caracteres."
            required
          />
          <NexusInput
            label="Confirmar contrasena"
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
