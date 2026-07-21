"use client";

import { FormEvent, useState } from "react";
import { Clock3, KeyRound, LockKeyhole } from "lucide-react";
import { raffleApi } from "../../api/raffles";
import { saveRaffleEarlyAccess } from "../../lib/raffle-early-access";
import { Raffle } from "../../types";
import { Button } from "../ui/Button";
import { StorefrontAutonomousCard } from "../ui/Card";
import { StorefrontField } from "../ui/Field";

interface RaffleParticipationGateProps {
  raffle: Raffle;
  state: "UPCOMING" | "EARLY_ACCESS" | "CLOSED";
  onUnlocked: (accessToken: string) => void;
}

const formatOpening = (value: string | null) => {
  if (!value) return "Próximamente";
  const formattedDate = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

  return formattedDate.charAt(0).toLocaleUpperCase("es-MX") + formattedDate.slice(1);
};

export function RaffleParticipationGate({
  raffle,
  state,
  onUnlocked,
}: RaffleParticipationGateProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isClosed = state === "CLOSED";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (code.trim().length < 4 || isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    try {
      const access = await raffleApi.unlockEarlyAccess(raffle.id, code.trim());
      saveRaffleEarlyAccess(raffle.id, access);
      onUnlocked(access.accessToken);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || "No pudimos validar el código de acceso.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StorefrontAutonomousCard className="w-full">
      <div className="flex flex-col" style={{ gap: "var(--sf-space-lg)" }}>
        <div className="flex flex-col" style={{ gap: "var(--sf-space-md)" }}>
          <div className="flex items-center" style={{ gap: "var(--sf-space-md)" }}>
            <div
              className="flex shrink-0 items-center justify-center border border-brand-100 bg-brand-50 text-brand-600"
              style={{
                width: "var(--sf-h-button-section)",
                height: "var(--sf-h-button-section)",
                borderRadius: "var(--sf-radius-card-inner)",
              }}
            >
              {isClosed ? <LockKeyhole size={22} /> : <Clock3 size={22} />}
            </div>
            <div className="flex min-w-0 flex-col" style={{ gap: "var(--sf-space-xs)" }}>
              <span className="sf-text-label text-brand-600">
                {isClosed ? "Participación cerrada" : "Próxima apertura"}
              </span>
              <h2 className="sf-text-h2 text-stone-950">
                {isClosed ? "Esta rifa ya no admite apartados" : formatOpening(raffle.participationStartsAt)}
              </h2>
            </div>
          </div>
          <p className="sf-text-secondary text-stone-600">
            {isClosed
              ? "Puedes consultar la información de la rifa, pero el periodo para seleccionar boletos ha finalizado."
              : "La boletera se habilitará automáticamente cuando comience la participación pública."}
          </p>
        </div>

        {state === "EARLY_ACCESS" && (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col border-t border-stone-200"
            style={{ gap: "var(--sf-space-md)", paddingTop: "var(--sf-space-lg)" }}
          >
            <div className="flex flex-col" style={{ gap: "var(--sf-space-xs)" }}>
              <h3 className="sf-text-secondary-strong text-stone-950">¿Tienes acceso anticipado?</h3>
              <p className="sf-text-secondary text-stone-600">
                Ingresa el código que recibiste para seleccionar tus boletos antes de la apertura.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto]" style={{ gap: "var(--sf-space-sm)" }}>
              <StorefrontField
                label="Código de acceso"
                aria-label="Código de acceso anticipado"
                icon={KeyRound}
                type="password"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  setError("");
                }}
                placeholder="Código de acceso"
                error={error || undefined}
              />
              <Button
                type="submit"
                context="section"
                icon={KeyRound}
                disabled={code.trim().length < 4}
                isLoading={isSubmitting}
                className="w-full self-end sm:w-auto"
              >
                Desbloquear
              </Button>
            </div>
          </form>
        )}
      </div>
    </StorefrontAutonomousCard>
  );
}
