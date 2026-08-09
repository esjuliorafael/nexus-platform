"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, Search, ShieldCheck } from "lucide-react";
import { raffleApi } from "../../api/raffles";
import { Button } from "../ui/Button";
import { StorefrontAutonomousCard } from "../ui/Card";
import { StorefrontIcon } from "../ui/Icon";
import { StorefrontPhoneField } from "../ui/PhoneField";
import { isCustomerPhoneComplete } from "../../lib/customer-phone";

export function RaffleParticipationLookupCard({ raffleId }: { raffleId: number }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const requestCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!isCustomerPhoneComplete(phone) || busy) {
      setError("Ingresa un número de WhatsApp válido.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await raffleApi.requestParticipationLookup(raffleId, phone);
      setStep("code");
      setMessage(result.message);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || "No pudimos enviar el código. Inténtalo nuevamente.");
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code) || busy) {
      setError("Ingresa el código de 6 dígitos.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await raffleApi.verifyParticipationLookup(raffleId, phone, code);
      window.location.assign(result.url);
    } catch (verifyError: any) {
      setError(verifyError?.response?.data?.message || "El código no es válido o ya venció.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <StorefrontAutonomousCard>
      <div className="flex items-start" style={{ gap: "var(--sf-space-md)" }}>
        <StorefrontIcon icon={step === "phone" ? Search : ShieldCheck} variant="brand" />
        <div className="min-w-0">
          <p className="sf-text-label text-brand-600">Consulta tus boletos</p>
          <h2 className="sf-text-h2 text-stone-950">Consultar mi participación</h2>
          <p className="sf-text-secondary mt-[var(--sf-space-xs)] text-stone-600">
            Revisa tus boletos, el estado de pago y las instrucciones de esta rifa.
          </p>
        </div>
      </div>

      {step === "phone" ? (
        <form onSubmit={requestCode} className="mt-[var(--sf-space-lg)] flex flex-col" style={{ gap: "var(--sf-space-md)" }}>
          <StorefrontPhoneField
            id={`raffle-lookup-phone-${raffleId}`}
            label="WhatsApp"
            value={phone}
            onChange={(value) => { setPhone(value); setError(""); }}
            error={error || undefined}
          />
          <Button type="submit" context="section" icon={ArrowRight} isLoading={busy} className="w-full sm:w-auto sm:self-start">
            Enviar código
          </Button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="mt-[var(--sf-space-lg)] flex flex-col" style={{ gap: "var(--sf-space-md)" }}>
          <div className="flex items-start" style={{ gap: "var(--sf-space-sm)" }}>
            <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={20} />
            <p className="sf-text-secondary text-stone-600">{message || "Te enviamos un código de 6 dígitos por WhatsApp."}</p>
          </div>
          <label className="flex flex-col" style={{ gap: "var(--sf-space-xs)" }}>
            <span className="sf-text-label text-stone-500">Código de consulta</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => { setCode(event.target.value.replace(/\D/g, "")); setError(""); }}
              className="h-[var(--sf-h-input)] w-full border border-stone-200 bg-stone-50 px-4 sf-text-body text-stone-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              style={{ borderRadius: "var(--sf-radius-card-inner)" }}
              aria-label="Código de consulta"
            />
            {error && <span className="sf-text-secondary text-rose-600">{error}</span>}
          </label>
          <div className="flex flex-col gap-[var(--sf-space-sm)] sm:flex-row">
            <Button type="submit" context="section" icon={CheckCircle2} isLoading={busy} className="w-full sm:w-auto">Consultar</Button>
            <Button type="button" context="section" onClick={() => { setStep("phone"); setCode(""); setMessage(""); setError(""); }} className="w-full sm:w-auto">Cambiar número</Button>
          </div>
        </form>
      )}
    </StorefrontAutonomousCard>
  );
}
