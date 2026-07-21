import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { CreditCard, RotateCcw, Timer } from "lucide-react";
import { apiSystem } from "../../../api";
import { NexusSectionCard } from "../../ui/NexusCard";
import { NexusInlineNotice } from "../../ui/NexusInlineNotice";
import { NexusInput } from "../../ui/NexusInputs";
import { NexusSection } from "../../ui/NexusSection";
import { NexusSwitch } from "../../ui/NexusSwitch";

export interface InventorySettingsViewRef {
  handleSave: () => void;
}

interface InventorySettingsViewProps {
  showToast: (message: string, type?: "success" | "error") => void;
}

interface InventoryConfig {
  storeActive: boolean;
  storeHours: number;
  storeReminderActive: boolean;
  storeReminderHoursBefore: number;
  raffleActive: boolean;
  raffleHours: number;
  raffleReminderActive: boolean;
  raffleReminderHoursBefore: number;
  cardHoldMinutes: number;
}

const DEFAULT_CONFIG: InventoryConfig = {
  storeActive: true,
  storeHours: 24,
  storeReminderActive: false,
  storeReminderHoursBefore: 4,
  raffleActive: true,
  raffleHours: 24,
  raffleReminderActive: false,
  raffleReminderHoursBefore: 4,
  cardHoldMinutes: 30,
};

const SwitchState = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) => (
  <div className="flex flex-col items-center" style={{ gap: "var(--space-xs)" }}>
    <NexusSwitch checked={checked} onChange={onChange} aria-label={label} />
    <span className="text-caption text-text-muted uppercase">
      {checked ? "Activo" : "Inactivo"}
    </span>
  </div>
);

export const InventorySettingsView = forwardRef<InventorySettingsViewRef, InventorySettingsViewProps>(
  ({ showToast }, ref) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [config, setConfig] = useState<InventoryConfig>(DEFAULT_CONFIG);

    useEffect(() => {
      const loadConfig = async () => {
        setIsLoading(true);
        try {
          const data = await apiSystem.getConfig();
          setConfig({
            storeActive: data.inventory_release_active === "1",
            storeHours: Number(data.inventory_release_hours || 24),
            storeReminderActive: data.inventory_reminder_active === "1",
            storeReminderHoursBefore: Number(data.inventory_reminder_hours_before || 4),
            raffleActive: data.raffle_release_active === "1",
            raffleHours: Number(data.raffle_release_hours || 24),
            raffleReminderActive: data.raffle_reminder_active === "1",
            raffleReminderHoursBefore: Number(data.raffle_reminder_hours_before || 4),
            cardHoldMinutes: Number(data.mp_payment_hold_minutes || 30),
          });
        } catch (error) {
          console.error("Error cargando configuración de inventario", error);
          showToast("Error al cargar la configuración actual", "error");
        } finally {
          setIsLoading(false);
        }
      };

      void loadConfig();
    }, [showToast]);

    useImperativeHandle(ref, () => ({
      handleSave: async () => {
        if (config.storeActive && (!config.storeHours || config.storeHours <= 0)) {
          showToast("Ingresa un número de horas válido para la tienda.", "error");
          return;
        }
        if (config.raffleActive && (!config.raffleHours || config.raffleHours <= 0)) {
          showToast("Ingresa un número de horas válido para las rifas.", "error");
          return;
        }
        if (
          config.storeReminderActive &&
          (!config.storeReminderHoursBefore || config.storeReminderHoursBefore <= 0 || config.storeReminderHoursBefore >= config.storeHours)
        ) {
          showToast("El recordatorio de tienda debe ser menor al tiempo límite.", "error");
          return;
        }
        if (
          config.raffleReminderActive &&
          (!config.raffleReminderHoursBefore || config.raffleReminderHoursBefore <= 0 || config.raffleReminderHoursBefore >= config.raffleHours)
        ) {
          showToast("El recordatorio de rifas debe ser menor al tiempo límite.", "error");
          return;
        }
        if (!Number.isInteger(config.cardHoldMinutes) || config.cardHoldMinutes < 5 || config.cardHoldMinutes > 60) {
          showToast("La retención para pagos con tarjeta debe estar entre 5 y 60 minutos.", "error");
          return;
        }
        if (isSaving) return;

        setIsSaving(true);
        try {
          await apiSystem.updateConfig({
            inventory_release_active: config.storeActive ? "1" : "0",
            inventory_release_hours: config.storeHours,
            inventory_reminder_active: config.storeReminderActive ? "1" : "0",
            inventory_reminder_hours_before: config.storeReminderHoursBefore,
            raffle_release_active: config.raffleActive ? "1" : "0",
            raffle_release_hours: config.raffleHours,
            raffle_reminder_active: config.raffleReminderActive ? "1" : "0",
            raffle_reminder_hours_before: config.raffleReminderHoursBefore,
            mp_payment_hold_minutes: config.cardHoldMinutes,
          });
          showToast("Configuración de inventario guardada correctamente", "success");
        } catch (error) {
          console.error("Error guardando configuración de inventario", error);
          showToast("Error al guardar la configuración", "error");
        } finally {
          setIsSaving(false);
        }
      },
    }));

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-40 animate-in fade-in duration-500">
          <div className="relative mb-6 h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
          <p className="text-label text-text-muted uppercase">Cargando ajustes...</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col animate-in fade-in duration-700" style={{ gap: "var(--space-xl)" }}>
        <NexusInlineNotice title="Liberación automática" variant="info" context="section">
          Las órdenes por depósito o transferencia utilizan el plazo comercial de cada módulo. Los pagos con tarjeta
          emplean una retención breve e independiente mientras Mercado Pago resuelve el cobro.
        </NexusInlineNotice>

        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--space-xl)" }}>
          <NexusSection
            title="Órdenes de Tienda"
            subtitle="Apartados por depósito o transferencia"
            icon={RotateCcw}
            action={(
              <SwitchState
                checked={config.storeActive}
                onChange={(storeActive) => setConfig((current) => ({ ...current, storeActive }))}
                label="Liberación automática de órdenes"
              />
            )}
          >
            <div
              className="flex flex-col transition-opacity"
              style={{ gap: "var(--space-lg)", opacity: config.storeActive ? 1 : 0.5, pointerEvents: config.storeActive ? "auto" : "none" }}
            >
              <div className="relative">
                <NexusInput
                  label="Tiempo límite de pago"
                  type="number"
                  min="1"
                  value={config.storeHours}
                  onChange={(event) => setConfig((current) => ({ ...current, storeHours: Number(event.target.value) }))}
                  icon={Timer}
                  suffix="Horas"
                  helperText="Después de este plazo, la orden se cancela y el inventario se libera."
                />
              </div>

              <NexusSectionCard
                title="Recordatorio de pago"
                subtitle="Envía un WhatsApp antes del vencimiento."
                rightContent={(
                  <SwitchState
                    checked={config.storeReminderActive}
                    onChange={(storeReminderActive) => setConfig((current) => ({ ...current, storeReminderActive }))}
                    label="Recordatorio de pago de tienda"
                  />
                )}
              />

              <div className="relative" style={{ opacity: config.storeReminderActive ? 1 : 0.5, pointerEvents: config.storeReminderActive ? "auto" : "none" }}>
                <NexusInput
                  label="Horas antes de vencer"
                  type="number"
                  min="1"
                  value={config.storeReminderHoursBefore}
                  onChange={(event) => setConfig((current) => ({ ...current, storeReminderHoursBefore: Number(event.target.value) }))}
                  icon={Timer}
                  suffix="Horas"
                  helperText="Debe ser menor al tiempo límite de pago."
                />
              </div>
            </div>
          </NexusSection>

          <NexusSection
            title="Apartados de Rifas"
            subtitle="Reservas por depósito o transferencia"
            icon={RotateCcw}
            action={(
              <SwitchState
                checked={config.raffleActive}
                onChange={(raffleActive) => setConfig((current) => ({ ...current, raffleActive }))}
                label="Liberación automática de boletos"
              />
            )}
          >
            <div
              className="flex flex-col transition-opacity"
              style={{ gap: "var(--space-lg)", opacity: config.raffleActive ? 1 : 0.5, pointerEvents: config.raffleActive ? "auto" : "none" }}
            >
              <div className="relative">
                <NexusInput
                  label="Tiempo límite de apartado"
                  type="number"
                  min="1"
                  value={config.raffleHours}
                  onChange={(event) => setConfig((current) => ({ ...current, raffleHours: Number(event.target.value) }))}
                  icon={Timer}
                  suffix="Horas"
                  helperText="Después de este plazo, los boletos se liberan automáticamente."
                />
              </div>

              <NexusSectionCard
                title="Recordatorio de pago"
                subtitle="Envía un WhatsApp antes de liberar los boletos."
                rightContent={(
                  <SwitchState
                    checked={config.raffleReminderActive}
                    onChange={(raffleReminderActive) => setConfig((current) => ({ ...current, raffleReminderActive }))}
                    label="Recordatorio de pago de rifas"
                  />
                )}
              />

              <div className="relative" style={{ opacity: config.raffleReminderActive ? 1 : 0.5, pointerEvents: config.raffleReminderActive ? "auto" : "none" }}>
                <NexusInput
                  label="Horas antes de vencer"
                  type="number"
                  min="1"
                  value={config.raffleReminderHoursBefore}
                  onChange={(event) => setConfig((current) => ({ ...current, raffleReminderHoursBefore: Number(event.target.value) }))}
                  icon={Timer}
                  suffix="Horas"
                  helperText="Debe ser menor al tiempo límite de apartado."
                />
              </div>
            </div>
          </NexusSection>
        </div>

        <NexusSection
          title="Pagos con Tarjeta"
          subtitle="Retención temporal de productos y boletos"
          icon={CreditCard}
          iconVariant="blue"
        >
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--space-xl)" }}>
            <div className="relative">
              <NexusInput
                label="Tiempo de retención"
                type="number"
                min="5"
                max="60"
                step="1"
                value={config.cardHoldMinutes}
                onChange={(event) => setConfig((current) => ({ ...current, cardHoldMinutes: Number(event.target.value) }))}
                icon={Timer}
                suffix="Minutos"
                helperText="Ventana disponible para completar el pago o intentar con otra tarjeta."
              />
            </div>

            <NexusInlineNotice title="Conciliación protegida" variant="neutral" context="section">
              Si Mercado Pago mantiene el cobro en proceso, Nexus conserva la retención y consulta el estado cada 10 minutos.
              Después de 2 horas inicia la cancelación segura; el inventario solo se libera al confirmar un estado definitivo.
            </NexusInlineNotice>
          </div>
        </NexusSection>
      </div>
    );
  },
);

InventorySettingsView.displayName = "InventorySettingsView";
