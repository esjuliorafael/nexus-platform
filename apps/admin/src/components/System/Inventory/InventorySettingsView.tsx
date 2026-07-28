import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { CreditCard, PackageCheck, RefreshCw, RotateCcw, ShieldCheck, Timer, Unlock } from "lucide-react";
import { apiInventoryIntegrity, apiSystem, type InventoryIntegrityIssue } from "../../../api";
import { NexusSectionButton } from "../../ui/NexusButton";
import { NexusSectionBadge } from "../../ui/NexusBadge";
import { NexusSectionCard } from "../../ui/NexusCard";
import { NexusConfirmModal } from "../../ui/NexusConfirmModal";
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
  paymentRecoveryEnabled: boolean;
  paymentRecoveryServerEnabled: boolean;
  paymentRecoveryTemplatesReady: boolean;
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
  paymentRecoveryEnabled: false,
  paymentRecoveryServerEnabled: false,
  paymentRecoveryTemplatesReady: false,
};

const SwitchState = ({
  checked,
  onChange,
  label,
  stateLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  stateLabel?: string;
}) => (
  <div className="flex flex-col items-center" style={{ gap: "var(--space-xs)" }}>
    <NexusSwitch checked={checked} onChange={onChange} aria-label={label} />
    <span className="text-caption text-text-muted uppercase">
      {stateLabel || (checked ? "Activo" : "Inactivo")}
    </span>
  </div>
);

export const InventorySettingsView = forwardRef<InventorySettingsViewRef, InventorySettingsViewProps>(
  ({ showToast }, ref) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [config, setConfig] = useState<InventoryConfig>(DEFAULT_CONFIG);
    const [integrityIssues, setIntegrityIssues] = useState<InventoryIntegrityIssue[]>([]);
    const [isIntegrityLoading, setIsIntegrityLoading] = useState(true);
    const [integrityAuditFailed, setIntegrityAuditFailed] = useState(false);
    const [issueToRelease, setIssueToRelease] = useState<InventoryIntegrityIssue | null>(null);
    const [isReleasing, setIsReleasing] = useState(false);

    const refreshIntegrity = useCallback(async (showFeedback = false) => {
      setIsIntegrityLoading(true);
      setIntegrityAuditFailed(false);
      try {
        const result = await apiInventoryIntegrity.audit();
        setIntegrityIssues(result.issues);
        if (showFeedback) {
          showToast(
            result.count
              ? `${result.count} incidencia${result.count === 1 ? "" : "s"} encontrada${result.count === 1 ? "" : "s"}.`
              : "El inventario no presenta incidencias.",
            result.count ? "error" : "success",
          );
        }
      } catch (error) {
        console.error("Error auditando la integridad del inventario", error);
        setIntegrityAuditFailed(true);
        if (showFeedback) showToast("No se pudo auditar el inventario", "error");
      } finally {
        setIsIntegrityLoading(false);
      }
    }, [showToast]);

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
            paymentRecoveryEnabled: data.payment_recovery_enabled === "1",
            paymentRecoveryServerEnabled:
              data.payment_recovery_server_enabled === "1",
            paymentRecoveryTemplatesReady:
              data.payment_recovery_templates_ready === "1",
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

    useEffect(() => {
      void refreshIntegrity();
    }, [refreshIntegrity]);

    const releaseOrphanReservation = async () => {
      if (!issueToRelease || isReleasing) return;
      setIsReleasing(true);
      try {
        const result = await apiInventoryIntegrity.releaseOrphanReservation(issueToRelease.productId);
        showToast(`${result.productName} volvió a estar disponible.`);
        setIssueToRelease(null);
        await refreshIntegrity();
      } catch (error: any) {
        showToast(
          error?.response?.data?.message || "No se pudo liberar la reserva.",
          "error",
        );
      } finally {
        setIsReleasing(false);
      }
    };

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
            payment_recovery_enabled: config.paymentRecoveryEnabled ? "1" : "0",
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
          action={(
            <SwitchState
              checked={config.paymentRecoveryEnabled}
              onChange={(paymentRecoveryEnabled) =>
                setConfig((current) => ({ ...current, paymentRecoveryEnabled }))
              }
              label="Recuperación de pagos no concretados"
              stateLabel={
                config.paymentRecoveryEnabled &&
                (!config.paymentRecoveryServerEnabled ||
                  !config.paymentRecoveryTemplatesReady)
                  ? "Pendiente"
                  : undefined
              }
            />
          )}
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

            {!config.paymentRecoveryServerEnabled ? (
              <NexusInlineNotice title="Bloqueo operativo activo" variant="warning" context="section">
                La preferencia puede guardarse, pero el API no programará avisos hasta habilitar la recuperación en el servidor.
              </NexusInlineNotice>
            ) : !config.paymentRecoveryTemplatesReady ? (
              <NexusInlineNotice title="Plantillas pendientes" variant="warning" context="section">
                Configura y aprueba las plantillas de Pago no concretado para Tienda y Rifas antes de activar los envíos.
              </NexusInlineNotice>
            ) : config.paymentRecoveryEnabled ? (
              <NexusInlineNotice title="Recuperación activa" variant="success" context="section">
                Tras un rechazo definitivo, Nexus conservará temporalmente el inventario y enviará un enlace seguro para retomar el pago.
              </NexusInlineNotice>
            ) : (
              <NexusInlineNotice title="Recuperación desactivada" variant="neutral" context="section">
                Los pagos rechazados conservarán su retención normal, pero no generarán un aviso para retomar el checkout.
              </NexusInlineNotice>
            )}
          </div>

          <NexusInlineNotice
            title="Conciliación protegida"
            variant="neutral"
            context="section"
            style={{ marginTop: "var(--space-xl)" }}
          >
            Si Mercado Pago mantiene el cobro en proceso, Nexus conserva la retención y consulta el estado cada 10 minutos.
            Después de 2 horas inicia la cancelación segura; el inventario solo se libera al confirmar un estado definitivo.
          </NexusInlineNotice>
        </NexusSection>

        <NexusSection
          title="Salud del inventario"
          subtitle="Auditoría de reservas y retenciones de aves"
          icon={ShieldCheck}
          iconVariant={integrityIssues.length ? "rose" : "emerald"}
          action={(
            <NexusSectionButton
              type="button"
              variant="secondary"
              icon={RefreshCw}
              isIconOnly
              aria-label="Auditar inventario"
              title="Auditar inventario"
              onClick={() => void refreshIntegrity(true)}
              isLoading={isIntegrityLoading}
            />
          )}
        >
          <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
            {isIntegrityLoading && integrityIssues.length === 0 ? (
              <NexusInlineNotice title="Auditando inventario" variant="info" context="section">
                Estamos contrastando aves reservadas, órdenes activas y retenciones de tarjeta.
              </NexusInlineNotice>
            ) : integrityAuditFailed ? (
              <NexusInlineNotice title="Auditoría no disponible" variant="warning" context="section">
                No fue posible comprobar el estado del inventario. Reintenta la auditoría antes de realizar una liberación manual.
              </NexusInlineNotice>
            ) : integrityIssues.length === 0 ? (
              <NexusInlineNotice title="Sin incidencias" variant="success" context="section">
                Todas las aves reservadas tienen una orden pendiente o una retención de pago que las protege.
              </NexusInlineNotice>
            ) : (
              integrityIssues.map((issue) => (
                <NexusSectionCard
                  key={`${issue.productId}-${issue.issueType}`}
                  icon={PackageCheck}
                  iconVariant="rose"
                  title={issue.productName}
                  subtitle={issue.message}
                  rightContent={(
                    <NexusSectionBadge variant={issue.canRelease ? "warning" : "danger"}>
                      {issue.canRelease ? "Reserva huérfana" : "Revisión requerida"}
                    </NexusSectionBadge>
                  )}
                  actions={issue.canRelease ? (
                    <NexusSectionButton
                      type="button"
                      variant="warning"
                      icon={Unlock}
                      onClick={() => setIssueToRelease(issue)}
                    >
                      Liberar reserva
                    </NexusSectionButton>
                  ) : undefined}
                />
              ))
            )}
          </div>
        </NexusSection>

        <NexusConfirmModal
          isOpen={Boolean(issueToRelease)}
          title="¿Liberar reserva huérfana?"
          message={issueToRelease
            ? `${issueToRelease.productName} volverá a estar disponible. Confirmamos que no tiene una orden pendiente ni una retención de pago activa.`
            : ""}
          confirmLabel="Sí, liberar"
          tone="warning"
          icon={Unlock}
          onCancel={() => setIssueToRelease(null)}
          onConfirm={() => void releaseOrphanReservation()}
        />
      </div>
    );
  },
);

InventorySettingsView.displayName = "InventorySettingsView";
