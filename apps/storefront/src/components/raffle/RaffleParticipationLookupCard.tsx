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

function LookupSurface({ isMobile, isOpen, onClose, title, icon, children }: LookupSurfaceProps) {
  if (isMobile === null) return null;
  if (isMobile) {
    return <BottomSheet isOpen={isOpen} onClose={onClose} title={title} icon={icon}>{children}</BottomSheet>;
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
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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
    setSubmitted(false);
    setError("");
  };

  const closeLookup = () => {
    setIsOpen(false);
    setSubmitted(false);
    setError("");
  };

  const requestLookup = async (event: FormEvent) => {
    event.preventDefault();
    if (!isCustomerPhoneComplete(phone) || busy) {
      setError("Ingresa un número de WhatsApp válido.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await raffleApi.requestParticipationLookup(raffleId, phone);
      setSubmitted(true);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || "No pudimos procesar la consulta. Inténtalo nuevamente.");
    } finally {
      setBusy(false);
    }
  };

  const content = submitted ? (
    <div className="flex flex-col" style={{ gap: "var(--sf-space-md)" }}>
      <div className="flex items-start" style={{ gap: "var(--sf-space-sm)" }}>
        <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={20} />
        <p className="sf-text-secondary text-stone-600">
          Si encontramos una participaci&oacute;n para este n&uacute;mero, recibir&aacute;s un enlace por WhatsApp para consultar tus boletos y su estado.
        </p>
      </div>
      <Button type="button" context="section" onClick={closeLookup} className="w-full">
        Cerrar
      </Button>
    </div>
  ) : (
    <form onSubmit={requestLookup} className="flex flex-col" style={{ gap: "var(--sf-space-md)" }}>
      <p className="sf-text-secondary text-stone-600">
        Ingresa el n&uacute;mero de WhatsApp que usaste al apartar tus boletos. Te enviaremos un enlace privado si encontramos una participaci&oacute;n.
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
          Consultar participaci&oacute;n
        </Button>
      </div>
    </form>
  );

  return (
    <>
      <StorefrontAutonomousCard>
        <div className="flex flex-col" style={{ gap: "var(--sf-space-md)" }}>
          <div className="flex items-start" style={{ gap: "var(--sf-space-md)" }}>
            <StorefrontIcon icon={Search} variant="brand" context="autonomous" />
            <div className="flex min-w-0 flex-col" style={{ gap: "var(--sf-space-xs)" }}>
              <span className="sf-text-label text-brand-600">Consulta de participaci&oacute;n</span>
              <h2 className="sf-text-h2 text-stone-950">&iquest;Ya tienes boletos?</h2>
            </div>
          </div>
          <p className="sf-text-secondary text-stone-600">
            Consulta tus boletos y su estado usando el n&uacute;mero de WhatsApp registrado.
          </p>
          <Button type="button" context="autonomous" icon={ArrowRight} onClick={openLookup} className="w-full">
            Consultar participaci&oacute;n
          </Button>
        </div>
      </StorefrontAutonomousCard>

      <LookupSurface isMobile={isMobile} isOpen={isOpen} onClose={closeLookup} title="Consultar participacion" icon={ShieldCheck}>
        {content}
      </LookupSurface>
    </>
  );
}
