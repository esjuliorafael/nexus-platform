"use client";

import { FormEvent, HTMLAttributes, useEffect, useState } from "react";
import { BellRing, CheckCircle2 } from "lucide-react";
import { raffleApi } from "../../api/raffles";
import {
  hasRegisteredRaffleOpeningReminder,
  markRaffleOpeningReminderRegistered,
  subscribeToRaffleOpeningReminder,
} from "../../lib/raffle-opening-reminder";
import { Button } from "../ui/Button";
import { StorefrontAutonomousCard } from "../ui/Card";
import { StorefrontPhoneField } from "../ui/PhoneField";
import { isCustomerPhoneComplete } from "../../lib/customer-phone";

export interface RaffleOpeningReminderController {
  fieldId: string;
  phone: string;
  error: string;
  isSubmitting: boolean;
  isRegistered: boolean;
  setPhone: (phone: string) => void;
  clearError: () => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export function useRaffleOpeningReminder(
  raffleId: number,
): RaffleOpeningReminderController {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    setIsRegistered(hasRegisteredRaffleOpeningReminder(raffleId));
    return subscribeToRaffleOpeningReminder(raffleId, setIsRegistered);
  }, [raffleId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isCustomerPhoneComplete(phone) || isSubmitting) {
      setError("Ingresa un número de WhatsApp válido.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await raffleApi.requestOpeningReminder(raffleId, phone);
      markRaffleOpeningReminderRegistered(raffleId);
      setIsRegistered(true);
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.message ||
          "No pudimos registrar el aviso. Inténtalo nuevamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    fieldId: `raffle-opening-phone-${raffleId}`,
    phone,
    error,
    isSubmitting,
    isRegistered,
    setPhone,
    clearError: () => setError(""),
    handleSubmit,
  };
}

interface RaffleOpeningReminderCardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  reminder: RaffleOpeningReminderController;
}

export function RaffleOpeningReminderCard({
  reminder,
  className,
  ...props
}: RaffleOpeningReminderCardProps) {
  return (
    <StorefrontAutonomousCard className={`w-full ${className || ""}`} {...props}>
      <RaffleOpeningReminderContent reminder={reminder} showCardHeader />
    </StorefrontAutonomousCard>
  );
}

interface RaffleOpeningReminderContentProps {
  reminder: RaffleOpeningReminderController;
  showCardHeader?: boolean;
}

export function RaffleOpeningReminderContent({
  reminder,
  showCardHeader = false,
}: RaffleOpeningReminderContentProps) {
  const {
    phone,
    error,
    isSubmitting,
    isRegistered,
    setPhone,
    clearError,
    handleSubmit,
  } = reminder;
  const HeaderIcon = isRegistered ? CheckCircle2 : BellRing;
  const controlContext = showCardHeader ? "autonomous" : "section";

  return (
    <div
      className="flex flex-col"
      style={{ gap: showCardHeader ? "var(--sf-space-lg)" : "var(--sf-space-md)" }}
    >
      <div className={showCardHeader ? "flex flex-col" : "hidden"} style={{ gap: "var(--sf-space-md)" }}>
        {showCardHeader && (
          <div className="flex items-center" style={{ gap: "var(--sf-space-md)" }}>
            <div
              className={`flex shrink-0 items-center justify-center border ${
                isRegistered
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : "border-brand-100 bg-brand-50 text-brand-600"
              }`}
              style={{
                width: "var(--sf-h-button-section)",
                height: "var(--sf-h-button-section)",
                borderRadius: "var(--sf-radius-card-inner)",
              }}
            >
              <HeaderIcon size={22} strokeWidth={2} />
            </div>
            <div className="flex min-w-0 flex-col" style={{ gap: "var(--sf-space-xs)" }}>
              <span className={`sf-text-label ${isRegistered ? "text-emerald-700" : "text-brand-600"}`}>
                Aviso de apertura
              </span>
              <h2 className="sf-text-h2 text-stone-950">
                {isRegistered ? "Aviso registrado" : "¿Quieres que te avisemos?"}
              </h2>
            </div>
          </div>
        )}

        {showCardHeader && (
          <p className="sf-text-secondary text-stone-600">
            {isRegistered
              ? "Te enviaremos un mensaje por WhatsApp cuando la boletera esté disponible."
              : "Ingresa tu número de WhatsApp para recibir un aviso cuando comience la participación."}
          </p>
        )}
      </div>

      {!showCardHeader && !isRegistered && (
        <p className="sf-text-secondary text-stone-600">
          Ingresa tu número de WhatsApp para recibir un aviso cuando comience la participación.
        </p>
      )}

      {!isRegistered && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col"
          style={{ gap: "var(--sf-space-md)" }}
        >
          <div
            className={
              showCardHeader
                ? "grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto]"
                : "flex flex-col"
            }
            style={{ gap: "var(--sf-space-sm)" }}
          >
            <StorefrontPhoneField
              id={reminder.fieldId}
              label="WhatsApp"
              context={controlContext}
              value={phone}
              onChange={(value) => {
                setPhone(value);
                clearError();
              }}
              error={error || undefined}
            />
            <Button
              type="submit"
              context={controlContext}
              icon={BellRing}
              isLoading={isSubmitting}
              aria-label={isSubmitting ? "Registrando aviso" : "Avísame"}
              className={showCardHeader ? "w-full self-end sm:w-auto" : "w-full"}
            >
              Avísame
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
