"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, LucideIcon, Search, ShieldCheck } from "lucide-react";
import { raffleApi } from "../../api/raffles";
import { Button } from "../ui/Button";
import { StorefrontAutonomousCard } from "../ui/Card";
import { StorefrontIcon } from "../ui/Icon";
import { StorefrontPhoneField } from "../ui/PhoneField";
import { StorefrontModal } from "../ui/Modal";
import { BottomSheet } from "../ui/BottomSheet";
import { isCustomerPhoneComplete } from "../../lib/customer-phone";

interface LookupSurfaceProps {
  isMobile: boolean | null;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}

function LookupSurface({
  isMobile,
  isOpen,
  onClose,
  title,
  icon,
  children,
}: LookupSurfaceProps) {
  if (isMobile === null) return null;

  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        icon={icon}
      >
        {children}
      </BottomSheet>
    );
  }

  return (
    <StorefrontModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={icon}
      width="compact"
      showDefaultActions={false}
    >
      {children}
    </StorefrontModal>
  );
}

export function RaffleParticipationLookupCard({ raffleId }: { raffleId: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => setIsMobile(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);
    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  const openLookup = () => {
    setIsOpen(true);
    setError("");
  };

  const closeLookup = () => {
    setIsOpen(false);
    setError("");
  };

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

  const lookupContent = (
    <>
      {step === "phone" ? (
        <form onSubmit={requestCode} className="flex flex-col" style={{ gap: "var(--sf-space-md)" }}>
          <p className="sf-text-secondary text-stone-600">
            Ingresa el nÃºmero de WhatsApp que usaste al apartar tus boletos. Te enviaremos un cÃ³digo de 6 dÃ­gitos.
          </p>
          <div className="flex flex-col" style={{ gap: "var(--sf-space-sm)" }}>
            <StorefrontPhoneField
              id={`raffle-lookup-phone-${raffleId}`}
              label="WhatsApp"
              value={phone}
              onChange={(value) => { setPhone(value); setError(""); }}
              error={error || undefined}
            />
            <Button type="submit" context="section" icon={ArrowRight} isLoading={busy} className="w-full">
              Enviar cÃ³digo
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex flex-col" style={{ gap: "var(--sf-space-md)" }}>
          <div className="flex items-start" style={{ gap: "var(--sf-space-sm)" }}>
            <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={20} />
            <p className="sf-text-secondary text-stone-600">
              {message || "Te enviamos un cÃ³digo de 6 dÃ­gitos por WhatsApp."}
            </p>
          </div>
          <label className="flex flex-col" style={{ gap: "var(--sf-space-xs)" }}>
            <span className="sf-text-label text-stone-500">CÃ³digo de consulta</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => { setCode(event.target.value.replace(/\D/g, "")); setError(""); }}
              className="h-[var(--sf-h-input)] w-full border border-stone-200 bg-stone-50 px-4 sf-text-body text-stone-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              style={{ borderRadius: "var(--sf-radius-inner)" }}
              aria-label="CÃ³digo de consulta"
            />
            {error && <span className="sf-text-secondary text-rose-600">{error}</span>}
          </label>
          <div className="flex flex-col gap-[var(--sf-space-sm)] sm:flex-row">
            <Button type="submit" context="section" icon={CheckCircle2} isLoading={busy} className="w-full sm:flex-1">
              Consultar
            </Button>
            <Button
              type="button"
              context="section"
              onClick={() => { setStep("phone"); setCode(""); setMessage(""); setError(""); }}
              className="w-full sm:flex-1"
            >
              Cambiar nÃºmero
            </Button>
          </div>
        </form>
      )}
    </>
  );

  return (
    <>
      <StorefrontAutonomousCard>
        <div className="flex flex-col" style={{ gap: "var(--sf-space-md)" }}>
          <div className="flex items-start" style={{ gap: "var(--sf-space-md)" }}>
            <StorefrontIcon icon={Search} variant="brand" context="autonomous" />
            <div className="flex min-w-0 flex-col" style={{ gap: "var(--sf-space-xs)" }}>
              <span className="sf-text-label text-brand-600">Consulta de participación</span>
              <h2 className="sf-text-h2 text-stone-950">¿Ya tienes boletos?</h2>
            </div>
          </div>
          <p className="sf-text-secondary text-stone-600">
            Consulta tus boletos y su estado usando el número de WhatsApp registrado.
          </p>
          <Button
            type="button"
            context="autonomous"
            icon={ArrowRight}
            onClick={openLookup}
            className="w-full"
          >
            Consultar participación
          </Button>
        </div>
      </StorefrontAutonomousCard>

      <LookupSurface
        isMobile={isMobile}
        isOpen={isOpen}
        onClose={closeLookup}
        title="Consultar participación"
        icon={ShieldCheck}
      >
        {step === "phone" ? (
          <form onSubmit={requestCode} className="flex flex-col" style={{ gap: "var(--sf-space-md)" }}>
            <p className="sf-text-secondary text-stone-600">
              Ingresa el número de WhatsApp que usaste al apartar tus boletos. Te enviaremos un código de 6 dígitos.
            </p>
            <div className="flex flex-col" style={{ gap: "var(--sf-space-sm)" }}>
              <StorefrontPhoneField
                id={`raffle-lookup-phone-${raffleId}`}
                label="WhatsApp"
                value={phone}
                onChange={(value) => { setPhone(value); setError(""); }}
                error={error || undefined}
              />
              <Button type="submit" context="section" icon={ArrowRight} isLoading={busy} className="w-full">
                Enviar código
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="flex flex-col" style={{ gap: "var(--sf-space-md)" }}>
            <div className="flex items-start" style={{ gap: "var(--sf-space-sm)" }}>
              <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={20} />
              <p className="sf-text-secondary text-stone-600">
                {message || "Te enviamos un código de 6 dígitos por WhatsApp."}
              </p>
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
                style={{ borderRadius: "var(--sf-radius-inner)" }}
                aria-label="Código de consulta"
              />
              {error && <span className="sf-text-secondary text-rose-600">{error}</span>}
            </label>
            <div className="flex flex-col gap-[var(--sf-space-sm)] sm:flex-row">
              <Button type="submit" context="section" icon={CheckCircle2} isLoading={busy} className="w-full sm:flex-1">
                Consultar
              </Button>
              <Button
                type="button"
                context="section"
                onClick={() => { setStep("phone"); setCode(""); setMessage(""); setError(""); }}
                className="w-full sm:flex-1"
              >
                Cambiar número
              </Button>
            </div>
          </form>
        )}
      </LookupSurface>
    </>
  );
}
