import React from "react";
import { BadgeDollarSign, MessageCircleMore, ShieldCheck } from "lucide-react";
import type { DashboardCommercialOverview } from "../../types";
import { NexusAutonomousCard } from "../ui/NexusCard";
import { NexusAutonomousIcon } from "../ui/NexusIcon";

const money = (value: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);

export const MessagingCostWidget = ({ cost, isLoading }: { cost?: DashboardCommercialOverview["messagingCost"]; isLoading?: boolean }) => {
  if (isLoading) return <NexusAutonomousCard className="h-56 animate-pulse bg-bg-muted" />;
  const value = cost ?? { estimatedMxn: 0, cloudDelivered: 0, billable: 0, exempt: 0, evolution: 0, unpriced: 0, rateCardVersion: "", breakdown: [] };
  return (
    <NexusAutonomousCard>
      <div className="flex min-w-0 items-center" style={{ gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
        <NexusAutonomousIcon icon={BadgeDollarSign} variant="brand" />
        <div className="min-w-0">
          <h3 className="text-h1 text-text-main">Costo de Mensajería</h3>
          <p className="text-secondary text-text-muted">Estimado Meta para los filtros seleccionados.</p>
        </div>
      </div>
      <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
        <strong className="text-display tabular-nums text-text-main">{money(value.estimatedMxn)}</strong>
        <div className="grid grid-cols-2" style={{ gap: "var(--space-sm)" }}>
          <Metric label="Facturables" value={value.billable} icon={MessageCircleMore} />
          <Metric label="Sin cargo" value={value.exempt} icon={ShieldCheck} />
        </div>
        <p className="text-caption text-text-muted">
          {value.cloudDelivered} entregas Cloud API. {value.evolution} envíos Evolution no generan costo Meta estimado.
          {value.unpriced > 0 ? ` ${value.unpriced} sin tarifa de destino.` : ""}
        </p>
      </div>
    </NexusAutonomousCard>
  );
};

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return <div className="flex items-center justify-between border border-border-main bg-bg-muted" style={{ gap: "var(--space-sm)", padding: "var(--padding-card-nested)", borderRadius: "var(--radius-card-nested-compact)" }}><div className="flex flex-col" style={{ gap: "var(--space-xs)" }}><span className="text-caption text-text-muted">{label}</span><strong className="text-h2 tabular-nums text-text-main">{value}</strong></div><Icon className="text-brand-600" style={{ width: "var(--size-inner-icon-card)", height: "var(--size-inner-icon-card)" }} /></div>;
}
