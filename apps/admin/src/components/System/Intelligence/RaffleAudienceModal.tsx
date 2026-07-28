import React from "react";
import {
  BarChart3,
  Check,
  Eye,
  Trophy,
  UserRoundCheck,
} from "lucide-react";
import {
  RaffleAudience,
  RaffleAudiencePreview,
  RaffleAudienceRules,
} from "../../../types";
import { apiRaffleIntelligence } from "../../../api";
import { NexusModal, NexusModalActions } from "../../ui/NexusModal";
import {
  NexusInput,
  NexusSelect,
  NexusTextarea,
} from "../../ui/NexusInputs";
import {
  NexusAutonomousButton,
} from "../../ui/NexusButton";
import { NexusSwitch } from "../../ui/NexusSwitch";
import { NexusInlineNotice } from "../../ui/NexusInlineNotice";

interface AudienceOptions {
  raffles: Array<{ id: number; title: string; status: string }>;
  states: string[];
}

interface RaffleAudienceModalProps {
  isOpen: boolean;
  audience: RaffleAudience | null;
  options: AudienceOptions;
  onClose: () => void;
  onSaved: (audience: RaffleAudience) => void;
  showToast: (message: string, type?: "success" | "error") => void;
}

interface AudienceDraft {
  name: string;
  description: string;
  minPaidParticipations: string;
  paidInRaffleId: string;
  minPaidTickets: string;
  minNetRevenue: string;
  maxDaysSinceLastPaid: string;
  maxPaymentSpeedPercentile: string;
  paymentMethods: Array<"TRANSFER" | "MERCADOPAGO">;
  states: string[];
  countries: Array<"MX" | "US" | "GT">;
  winnerOnly: boolean;
  openingSubscriberOnly: boolean;
  active: boolean;
  targetRaffleId: string;
  frequencyWindowDays: string;
}

const emptyDraft = (): AudienceDraft => ({
  name: "",
  description: "",
  minPaidParticipations: "",
  paidInRaffleId: "",
  minPaidTickets: "",
  minNetRevenue: "",
  maxDaysSinceLastPaid: "",
  maxPaymentSpeedPercentile: "",
  paymentMethods: [],
  states: [],
  countries: [],
  winnerOnly: false,
  openingSubscriberOnly: false,
  active: true,
  targetRaffleId: "",
  frequencyWindowDays: "30",
});

const numberOrUndefined = (value: string) => (
  value.trim() === "" ? undefined : Number(value)
);

const rulesFromDraft = (draft: AudienceDraft): RaffleAudienceRules => ({
  minPaidParticipations: numberOrUndefined(draft.minPaidParticipations),
  paidInRaffleId: numberOrUndefined(draft.paidInRaffleId),
  minPaidTickets: numberOrUndefined(draft.minPaidTickets),
  minNetRevenue: numberOrUndefined(draft.minNetRevenue),
  maxDaysSinceLastPaid: numberOrUndefined(draft.maxDaysSinceLastPaid),
  maxPaymentSpeedPercentile: numberOrUndefined(draft.maxPaymentSpeedPercentile),
  paymentMethods: draft.paymentMethods.length ? draft.paymentMethods : undefined,
  states: draft.states.length ? draft.states : undefined,
  countries: draft.countries.length ? draft.countries : undefined,
  winnerOnly: draft.winnerOnly || undefined,
  openingSubscriberOnly: draft.openingSubscriberOnly || undefined,
});

const draftFromAudience = (audience: RaffleAudience): AudienceDraft => {
  const rules = audience.rules;
  return {
    ...emptyDraft(),
    name: audience.name,
    description: audience.description || "",
    minPaidParticipations: rules.minPaidParticipations?.toString() || "",
    paidInRaffleId: rules.paidInRaffleId?.toString() || "",
    minPaidTickets: rules.minPaidTickets?.toString() || "",
    minNetRevenue: rules.minNetRevenue?.toString() || "",
    maxDaysSinceLastPaid: rules.maxDaysSinceLastPaid?.toString() || "",
    maxPaymentSpeedPercentile: rules.maxPaymentSpeedPercentile?.toString() || "",
    paymentMethods: rules.paymentMethods || [],
    states: rules.states || [],
    countries: rules.countries || [],
    winnerOnly: rules.winnerOnly || false,
    openingSubscriberOnly: rules.openingSubscriberOnly || false,
    active: audience.active,
  };
};

const toggleArrayValue = <T extends string>(values: T[], value: T) => (
  values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
);

const ChoiceButton: React.FC<{
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ selected, onClick, children }) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onClick}
    className={`h-[var(--h-button-card)] border px-[var(--padding-button-card-inline)] text-button-card transition-colors ${
      selected
        ? "border-brand-500 bg-brand-50 text-brand-700"
        : "border-border-main bg-bg-muted text-text-muted hover:text-text-main"
    }`}
    style={{ borderRadius: "var(--radius-card-inner)" }}
  >
    {children}
  </button>
);

const SwitchRule: React.FC<{
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ title, description, checked, onChange }) => (
  <div
    className="flex items-center justify-between border border-border-main bg-bg-muted"
    style={{
      gap: "var(--space-md)",
      padding: "var(--padding-inner)",
      borderRadius: "var(--radius-card-inner)",
    }}
  >
    <div className="min-w-0">
      <p className="text-h3 text-text-main">{title}</p>
      <p className="text-secondary text-text-muted">{description}</p>
    </div>
    <NexusSwitch checked={checked} onChange={onChange} />
  </div>
);

export const RaffleAudienceModal: React.FC<RaffleAudienceModalProps> = ({
  isOpen,
  audience,
  options,
  onClose,
  onSaved,
  showToast,
}) => {
  const [draft, setDraft] = React.useState<AudienceDraft>(emptyDraft);
  const [preview, setPreview] = React.useState<RaffleAudiencePreview | null>(null);
  const [isPreviewing, setIsPreviewing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setDraft(audience ? draftFromAudience(audience) : emptyDraft());
    setPreview(null);
  }, [audience, isOpen]);

  const updateDraft = <K extends keyof AudienceDraft>(key: K, value: AudienceDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setPreview(null);
  };

  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      const result = await apiRaffleIntelligence.previewAudience({
        rules: rulesFromDraft(draft),
        targetRaffleId: numberOrUndefined(draft.targetRaffleId),
        frequencyWindowDays: numberOrUndefined(draft.frequencyWindowDays) || 30,
      });
      setPreview(result);
    } catch {
      showToast("No se pudo calcular la audiencia", "error");
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSave = async () => {
    if (draft.name.trim().length < 3) {
      showToast("Asigna un nombre claro a la audiencia", "error");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        rules: rulesFromDraft(draft),
        active: draft.active,
      };
      const saved = audience
        ? await apiRaffleIntelligence.updateAudience(audience.id, payload)
        : await apiRaffleIntelligence.createAudience(payload);
      onSaved(saved);
      showToast(audience ? "Audiencia actualizada" : "Audiencia guardada");
      onClose();
    } catch {
      showToast("No se pudo guardar la audiencia", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <NexusModal
      isOpen={isOpen}
      title={audience ? "Editar Audiencia" : "Nueva Audiencia"}
      eyebrow="Inteligencia de Rifas"
      icon={BarChart3}
      size="wide"
      onClose={onClose}
    >
      <div className="flex max-h-[70dvh] flex-col overflow-y-auto" style={{ gap: "var(--space-lg)" }}>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--space-md)" }}>
          <NexusInput
            label="Nombre"
            value={draft.name}
            onChange={(event) => updateDraft("name", event.target.value)}
            placeholder="Ej. Pagadores recurrentes"
          />
          <NexusSelect
            label="Estado"
            value={draft.active ? "active" : "inactive"}
            onChange={(event) => updateDraft("active", event.target.value === "active")}
          >
            <option value="active">Activa</option>
            <option value="inactive">Pausada</option>
          </NexusSelect>
        </div>

        <NexusTextarea
          label="Descripción"
          rows={2}
          value={draft.description}
          onChange={(event) => updateDraft("description", event.target.value)}
          placeholder="Explica para qué se utilizará esta audiencia."
        />

        <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
          <div>
            <h4 className="text-h2 text-text-main">Comportamiento de pago</h4>
            <p className="text-secondary text-text-muted">Todas las reglas configuradas deben cumplirse al mismo tiempo.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--space-md)" }}>
            <NexusInput
              label="Participaciones pagadas mín."
              type="number"
              min="0"
              value={draft.minPaidParticipations}
              onChange={(event) => updateDraft("minPaidParticipations", event.target.value)}
            />
            <NexusInput
              label="Boletos pagados mín."
              type="number"
              min="0"
              value={draft.minPaidTickets}
              onChange={(event) => updateDraft("minPaidTickets", event.target.value)}
            />
            <NexusInput
              label="Valor neto mínimo"
              type="number"
              min="0"
              suffix="MXN"
              value={draft.minNetRevenue}
              onChange={(event) => updateDraft("minNetRevenue", event.target.value)}
            />
            <NexusInput
              label="Actividad pagada reciente"
              type="number"
              min="1"
              suffix="días"
              value={draft.maxDaysSinceLastPaid}
              onChange={(event) => updateDraft("maxDaysSinceLastPaid", event.target.value)}
            />
            <NexusInput
              label="Percentil de rapidez máx."
              type="number"
              min="1"
              max="100"
              suffix="%"
              value={draft.maxPaymentSpeedPercentile}
              onChange={(event) => updateDraft("maxPaymentSpeedPercentile", event.target.value)}
              helperText="20 selecciona aproximadamente al 20% que paga más rápido."
            />
            <NexusSelect
              label="Pagó en una rifa"
              value={draft.paidInRaffleId}
              onChange={(event) => updateDraft("paidInRaffleId", event.target.value)}
            >
              <option value="">Cualquier rifa</option>
              {options.raffles.map((raffle) => (
                <option key={raffle.id} value={raffle.id}>{raffle.title}</option>
              ))}
            </NexusSelect>
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: "var(--space-sm)" }}>
          <h4 className="text-h2 text-text-main">Método de pago</h4>
          <div className="grid grid-cols-2" style={{ gap: "var(--space-sm)" }}>
            <ChoiceButton
              selected={draft.paymentMethods.includes("TRANSFER")}
              onClick={() => updateDraft(
                "paymentMethods",
                toggleArrayValue(draft.paymentMethods, "TRANSFER"),
              )}
            >
              Depósito / Transferencia
            </ChoiceButton>
            <ChoiceButton
              selected={draft.paymentMethods.includes("MERCADOPAGO")}
              onClick={() => updateDraft(
                "paymentMethods",
                toggleArrayValue(draft.paymentMethods, "MERCADOPAGO"),
              )}
            >
              Tarjeta
            </ChoiceButton>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--space-md)" }}>
          <div className="flex flex-col" style={{ gap: "var(--space-sm)" }}>
            <NexusSelect
              label="Agregar estado"
              value=""
              onChange={(event) => {
                const state = event.target.value;
                if (state && !draft.states.includes(state)) {
                  updateDraft("states", [...draft.states, state]);
                }
              }}
            >
              <option value="">Cualquier estado</option>
              {options.states
                .filter((state) => !draft.states.includes(state))
                .map((state) => <option key={state} value={state}>{state}</option>)}
            </NexusSelect>
            {draft.states.length > 0 && (
              <div className="flex flex-wrap" style={{ gap: "var(--space-xs)" }}>
                {draft.states.map((state) => (
                  <button
                    key={state}
                    type="button"
                    onClick={() => updateDraft(
                      "states",
                      draft.states.filter((item) => item !== state),
                    )}
                    className="border border-brand-200 bg-brand-50 px-[var(--space-sm)] py-[var(--space-xs)] text-label text-brand-700"
                    style={{ borderRadius: "var(--radius-pill)" }}
                    aria-label={`Quitar ${state}`}
                  >
                    {state}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col" style={{ gap: "var(--space-xs)" }}>
            <span className="ml-1 text-label uppercase tracking-[0.15em] text-text-muted">País</span>
            <div className="grid grid-cols-3" style={{ gap: "var(--space-sm)" }}>
              {([
                ["MX", "México"],
                ["US", "EE. UU."],
                ["GT", "Guatemala"],
              ] as const).map(([value, label]) => (
                <ChoiceButton
                  key={value}
                  selected={draft.countries.includes(value)}
                  onClick={() => updateDraft(
                    "countries",
                    toggleArrayValue(draft.countries, value),
                  )}
                >
                  {label}
                </ChoiceButton>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--space-md)" }}>
          <SwitchRule
            title="Ganadores anteriores"
            description="Solo personas que ya ganaron un premio."
            checked={draft.winnerOnly}
            onChange={(checked) => updateDraft("winnerOnly", checked)}
          />
          <SwitchRule
            title="Interés previo"
            description="Solo personas que pidieron un aviso de apertura."
            checked={draft.openingSubscriberOnly}
            onChange={(checked) => updateDraft("openingSubscriberOnly", checked)}
          />
        </div>

        <div className="border-t border-border-main pt-[var(--space-lg)]">
          <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
            <div>
              <h4 className="text-h2 text-text-main">Contexto de la previsualización</h4>
              <p className="text-secondary text-text-muted">No modifica la audiencia guardada ni envía mensajes.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--space-md)" }}>
              <NexusSelect
                label="Rifa a promocionar"
                value={draft.targetRaffleId}
                onChange={(event) => updateDraft("targetRaffleId", event.target.value)}
              >
                <option value="">Sin excluir una rifa objetivo</option>
                {options.raffles.map((raffle) => (
                  <option key={raffle.id} value={raffle.id}>{raffle.title}</option>
                ))}
              </NexusSelect>
              <NexusInput
                label="Descanso comercial"
                type="number"
                min="1"
                max="365"
                suffix="días"
                value={draft.frequencyWindowDays}
                onChange={(event) => updateDraft("frequencyWindowDays", event.target.value)}
              />
            </div>
            <NexusAutonomousButton
              type="button"
              variant="secondary"
              icon={Eye}
              onClick={handlePreview}
              isLoading={isPreviewing}
              className="w-full"
            >
              Previsualizar Audiencia
            </NexusAutonomousButton>
          </div>
        </div>

        {preview && (
          <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
            <div className="grid grid-cols-2 md:grid-cols-5" style={{ gap: "var(--space-sm)" }}>
              {[
                ["Perfiles", preview.summary.profilesAnalyzed],
                ["Duplicados", preview.summary.duplicatesRemoved],
                ["Coinciden", preview.summary.audienceMatched],
                ["Elegibles", preview.summary.eligible],
                ["Excluidos", preview.summary.excluded],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="border border-border-main bg-bg-muted"
                  style={{
                    padding: "var(--padding-inner)",
                    borderRadius: "var(--radius-card-inner)",
                  }}
                >
                  <p className="text-label text-text-muted">{label}</p>
                  <p className="text-h1 tabular-nums text-text-main">{value}</p>
                </div>
              ))}
            </div>
            <NexusInlineNotice
              icon={UserRoundCheck}
              title="Destinatarios realmente utilizables"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 text-secondary text-text-muted" style={{ gap: "var(--space-xs)" }}>
                <span>Sin consentimiento: {preview.summary.exclusions.noConsent}</span>
                <span>Baja solicitada: {preview.summary.exclusions.optedOut}</span>
                <span>Teléfono inválido: {preview.summary.exclusions.invalidPhone}</span>
                <span>Ya participa: {preview.summary.exclusions.alreadyParticipating}</span>
                <span>Contacto reciente: {preview.summary.exclusions.recentlyContacted}</span>
              </div>
            </NexusInlineNotice>
            {preview.sample.length > 0 && (
              <div className="flex flex-col" style={{ gap: "var(--space-sm)" }}>
                <h4 className="text-h2 text-text-main">Muestra elegible</h4>
                {preview.sample.slice(0, 5).map((profile) => (
                  <div
                    key={profile.phone}
                    className="flex items-center justify-between border-b border-border-main pb-[var(--space-sm)]"
                    style={{ gap: "var(--space-md)" }}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-h3 text-text-main">{profile.displayName}</p>
                      <p className="text-secondary text-text-muted">{profile.phone} · {profile.state}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-h3 tabular-nums text-brand-600">{profile.paidTickets} boletos</p>
                      <p className="text-label text-text-muted">{profile.paidParticipations} pagos</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <NexusInlineNotice icon={Trophy} title="Separación de responsabilidades">
          Guardar esta definición no crea una campaña. La promoción se preparará después desde el Resumen de una rifa.
        </NexusInlineNotice>

        <NexusModalActions className="flex-col sm:flex-row">
          <NexusAutonomousButton type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </NexusAutonomousButton>
          <NexusAutonomousButton
            type="button"
            variant="brand"
            icon={Check}
            onClick={handleSave}
            isLoading={isSaving}
            className="flex-[2]"
          >
            Guardar Audiencia
          </NexusAutonomousButton>
        </NexusModalActions>
      </div>
    </NexusModal>
  );
};
