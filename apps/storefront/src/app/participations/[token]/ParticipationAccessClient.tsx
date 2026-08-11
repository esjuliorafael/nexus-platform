"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, CreditCard, Ticket, Trophy } from "lucide-react";
import { raffleApi, type RaffleParticipationAccessResponse } from "../../../api/raffles";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { StorefrontAutonomousCard, StorefrontCard } from "../../../components/ui/Card";
import { StorefrontIcon } from "../../../components/ui/Icon";
import { BankInfoCard } from "../../../components/checkout/BankInfoCard";
import { formatPrice } from "../../../utils/formatters";

export function ParticipationAccessClient({
  token,
  initialData,
}: {
  token: string;
  initialData: RaffleParticipationAccessResponse | null;
}) {
  const [data, setData] = useState<RaffleParticipationAccessResponse | null>(initialData);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (initialData) return;
    let cancelled = false;
    const load = async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const access = await raffleApi.getParticipationAccess(token);
          if (!cancelled) setData(access);
          return;
        } catch (error: any) {
          const status = error?.response?.status;
          if (status === 429 || attempt === 2) break;
          await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
        }
      }
      if (!cancelled) setFailed(true);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [initialData, token]);

  if (!data && !failed) {
    return <div className="mx-auto min-h-[58vh] max-w-5xl px-[var(--sf-inset-page)]" aria-busy="true" />;
  }

  if (failed || !data) {
    return (
      <div className="mx-auto flex min-h-[58vh] max-w-xl items-center px-[var(--sf-inset-page)]">
        <StorefrontAutonomousCard className="w-full text-center" density="default">
          <StorefrontIcon icon={CircleAlert} variant="warning" className="mx-auto" />
          <h1 className="sf-text-h2 mt-[var(--sf-space-md)] text-stone-900">Consulta no disponible</h1>
          <p className="sf-text-secondary mt-[var(--sf-space-xs)] text-stone-500">Este enlace es privado, pudo vencer o ya no está disponible.</p>
          <Button asChild context="section" className="mt-[var(--sf-space-lg)]"><Link href="/raffles">Ver rifas</Link></Button>
        </StorefrontAutonomousCard>
      </div>
    );
  }

  const paid = data.participations.every((item) => item.paymentStatus === "PAID");
  const cancelled = data.participations.every(
    (item) => item.paymentStatus === "CANCELLED",
  );
  const overallStatus = paid
    ? {
        title: "Participación confirmada",
        description: "Tus boletos ya participan en la rifa.",
        badge: "Pago confirmado",
        icon: CheckCircle2,
        variant: "success" as const,
      }
    : cancelled
      ? {
          title: "Participación cancelada",
          description: "Esta participación ya no conserva sus boletos.",
          badge: "Cancelada",
          icon: CircleAlert,
          variant: "muted" as const,
        }
      : {
          title: "Participación pendiente",
          description: "Confirma tu pago para conservar tu participación.",
          badge: "Pago pendiente",
          icon: CreditCard,
          variant: "warning" as const,
        };
  return (
    <div className="mx-auto w-full max-w-5xl px-[var(--sf-inset-page)] pb-[var(--sf-space-2xl)] pt-[var(--sf-space-xl)] md:pt-[var(--sf-space-2xl)]">
      <div className="flex flex-col" style={{ gap: "var(--sf-space-lg)" }}>
        <header className="flex flex-col" style={{ gap: "var(--sf-space-xs)" }}>
          <Button asChild context="section" variant="outline" icon={ArrowLeft} className="self-start">
            <Link href={`/raffles/${data.raffle.id}`}>Volver a la rifa</Link>
          </Button>
          <div className="flex items-center" style={{ gap: "var(--sf-space-sm)" }}>
            <StorefrontIcon icon={Ticket} variant="brand" />
            <p className="sf-text-eyebrow text-brand-600">Consulta privada</p>
          </div>
          <h1 className="sf-text-h1 text-stone-900">Mi participación</h1>
          <p className="sf-text-secondary text-stone-500">{data.raffle.title}</p>
          {data.participantName && (
            <p className="sf-text-secondary text-stone-500">
              Participante: <span className="font-semibold text-stone-700">{data.participantName}</span>
            </p>
          )}
        </header>

        <StorefrontAutonomousCard density="default">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between" style={{ gap: "var(--sf-space-md)" }}>
            <div className="flex min-w-0 items-center" style={{ gap: "var(--sf-space-sm)" }}>
              <StorefrontIcon icon={overallStatus.icon} variant={overallStatus.variant} />
              <div>
                <p className="sf-text-h3 text-stone-900">{overallStatus.title}</p>
                <p className="sf-text-secondary text-stone-500">{overallStatus.description}</p>
              </div>
            </div>
            <Badge variant={overallStatus.variant}>{overallStatus.badge}</Badge>
          </div>
        </StorefrontAutonomousCard>

        {data.participations.map((participation) => (
          <StorefrontCard key={participation.reference} level={2} density="default">
            <div className="flex items-center justify-between" style={{ gap: "var(--sf-space-md)" }}>
              <div>
                <p className="sf-text-eyebrow text-stone-500">Referencia</p>
                <p className="sf-text-body font-semibold text-stone-900">{participation.reference.slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="flex items-end" style={{ gap: "var(--sf-space-md)" }}>
                <Badge
                  variant={
                    participation.paymentStatus === "PAID"
                      ? "success"
                      : participation.paymentStatus === "CANCELLED"
                        ? "muted"
                        : "warning"
                  }
                >
                  {participation.status}
                </Badge>
                <div className="text-right">
                  <p className="sf-text-eyebrow text-stone-500">Total</p>
                  <p className="sf-text-h3 text-stone-900">${formatPrice(participation.total)}</p>
                </div>
              </div>
            </div>
            <div className="mt-[var(--sf-space-md)] border-t border-stone-200 pt-[var(--sf-space-md)]">
              <p className="sf-text-h3 text-stone-900">Boletos seleccionados</p>
              <div className="mt-[var(--sf-space-sm)] grid grid-cols-1 gap-[var(--sf-space-sm)] sm:grid-cols-2">
                {participation.tickets.map((ticket) => (
                  <StorefrontCard key={ticket.number} level={3} density="compact">
                    <div className="flex items-center justify-between" style={{ gap: "var(--sf-space-sm)" }}>
                      <div className="flex items-center" style={{ gap: "var(--sf-space-xs)" }}>
                        <StorefrontIcon icon={Ticket} variant="muted" />
                        <span className="sf-text-h3 text-stone-900">{ticket.number}</span>
                      </div>
                      {ticket.opportunities.length > 0 && <Badge variant="muted">{ticket.opportunities.length + 1} números</Badge>}
                    </div>
                    {ticket.opportunities.length > 0 && (
                      <div className="mt-[var(--sf-space-sm)]">
                        <p className="sf-text-label text-stone-500">Oportunidades adicionales</p>
                        <p className="sf-text-secondary mt-[var(--sf-space-2xs)] text-stone-700">{ticket.opportunities.join(", ")}</p>
                      </div>
                    )}
                  </StorefrontCard>
                ))}
              </div>
            </div>
          </StorefrontCard>
        ))}

        {data.bankInfo && data.participations.some((participation) => participation.paymentStatus === "PENDING") && (
          <BankInfoCard
            bankInfo={{
              source: data.bankInfo.source,
              label: data.bankInfo.label,
              bank: data.bankInfo.bank,
              beneficiary: data.bankInfo.beneficiary,
              accountNumber: data.bankInfo.accountNumber,
              clabe: data.bankInfo.clabe,
              card: data.bankInfo.card,
            }}
            onCopy={(value) => {
              void navigator.clipboard?.writeText(value);
            }}
          />
        )}

        <StorefrontCard level={2} density="default">
          <div className="flex items-start" style={{ gap: "var(--sf-space-sm)" }}>
            <StorefrontIcon icon={Trophy} variant="brand" />
            <div>
              <p className="sf-text-h3 text-stone-900">Premios de la rifa</p>
              <div className="mt-[var(--sf-space-xs)] flex flex-col" style={{ gap: "var(--sf-space-2xs)" }}>
                {data.raffle.prizes.map((prize) => <p key={prize.position} className="sf-text-secondary text-stone-600">{prize.position}. {prize.title}</p>)}
              </div>
            </div>
          </div>
        </StorefrontCard>
      </div>
    </div>
  );
}
