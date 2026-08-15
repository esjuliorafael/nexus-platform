"use client";

import { CalendarClock, CheckCircle2, FileText, ShieldCheck } from "lucide-react";
import { useSettings } from "../../../hooks/useSettings";
import { Badge } from "../../../components/ui/Badge";
import { StorefrontCard } from "../../../components/ui/Card";
import { StorefrontIcon } from "../../../components/ui/Icon";

const sections = [
  {
    title: "1. Objeto y aceptación",
    body: [
      "Esta política explica las condiciones para seleccionar, apartar y confirmar boletos de las rifas publicadas en este sitio. Al seleccionar boletos o completar un pago, aceptas estas condiciones y las reglas particulares mostradas en la página de la rifa.",
      "Las reglas particulares de cada rifa, incluyendo su premio, precio, número de boletos, mecanismo de determinación del resultado y fecha anunciada, forman parte de esta política.",
    ],
  },
  {
    title: "2. Apartado y confirmación del pago",
    body: [
      "Un apartado reserva temporalmente los boletos seleccionados. No constituye una venta confirmada ni garantiza su disponibilidad después del plazo indicado para pagar.",
      "La participación queda confirmada únicamente cuando el pago ha sido aprobado o validado por el organizador. Los pagos por depósito o transferencia deben acompañarse del comprobante solicitado y quedar sujetos a validación.",
      "Si el pago no se confirma dentro del plazo informado, el apartado puede liberarse y los boletos pueden volver a estar disponibles para otras personas.",
    ],
  },
  {
    title: "3. Fecha de la rifa y posibles cambios",
    body: [
      "La fecha y hora publicadas corresponden a la programación prevista para el sorteo. El organizador podrá reprogramarlas cuando no se alcance el nivel de participación pagada necesario para realizar la rifa, o cuando exista una causa operativa, técnica, de fuerza mayor o una exigencia de autoridad que lo haga necesario.",
      "La selección de boletos apartados pero no pagados no se considera participación vendida para determinar la viabilidad de la rifa.",
      "Cuando se modifique la fecha, se publicará la nueva fecha y hora en el sitio y se comunicará a las participaciones activas mediante los canales disponibles. La participación pagada conservará sus mismos boletos, oportunidades y condiciones para la nueva fecha, sin necesidad de volver a comprar.",
      "El cambio de fecha no genera por sí mismo la cancelación ni una devolución automática. Cualquier solicitud relacionada con un pago se atenderá conforme a las condiciones comunicadas para la rifa y a la legislación aplicable.",
    ],
  },
  {
    title: "4. Cancelaciones, devoluciones y pagos",
    body: [
      "Las solicitudes de cancelación o devolución deben realizarse por los medios de contacto publicados y se revisarán con base en el estado de la participación, el método de pago, la etapa de la rifa y las condiciones aplicables.",
      "Una devolución aprobada libera los boletos y deja sin efecto la participación correspondiente. Las comisiones, tiempos y ajustes del proveedor de pago pueden afectar el momento en que el importe se refleja.",
      "Un intento de pago rechazado no confirma la participación. Cuando exista una ventana de recuperación, podrá utilizarse el enlace o las instrucciones proporcionadas en la comunicación correspondiente.",
    ],
  },
  {
    title: "5. Resultado y premios",
    body: [
      "El resultado se determina con el mecanismo publicado en la página de la rifa y se comunica mediante los canales oficiales del sitio. Solo las participaciones con pago confirmado que cumplan las condiciones de la rifa podrán ser consideradas elegibles.",
      "La persona ganadora deberá proporcionar la información necesaria para coordinar la entrega del premio. Las condiciones de envío, entrega o coordinación posterior se indicarán en la rifa o en la comunicación al ganador.",
    ],
  },
  {
    title: "6. Información y contacto",
    body: [
      "Conserva tus mensajes, comprobantes y el enlace de consulta de tu participación. Para aclaraciones sobre un apartado, un pago, una reprogramación o una devolución, utiliza los datos de contacto publicados en este sitio e indica tu nombre, número de WhatsApp y referencia de la participación.",
      "La versión vigente de esta política es la que se encuentra publicada al momento de realizar la operación. Si se actualiza, se indicará la fecha de la última actualización.",
    ],
  },
];

export default function RafflePurchasePolicyPage() {
  const { getBranding } = useSettings();
  const brandName = getBranding().brand_name || "Nexus Store";

  return (
    <main className="min-h-screen px-[var(--sf-inset-page)] pb-[var(--sf-mobile-chrome-content-padding-bottom)] pt-[var(--sf-space-lg)] md:pt-24">
      <div className="mx-auto flex max-w-[var(--sf-max-width-content)] flex-col" style={{ gap: "var(--sf-space-lg)" }}>
        <header className="max-w-3xl" style={{ display: "flex", flexDirection: "column", gap: "var(--sf-space-sm)" }}>
          <Badge variant="brand" context="section" icon={FileText} className="w-fit">
            Rifas
          </Badge>
          <h1 className="sf-text-display text-stone-900">Política de compra de boletos</h1>
          <p className="sf-text-body text-stone-600">
            Condiciones claras para apartar, pagar y participar en las rifas de {brandName}.
          </p>
          <p className="sf-text-secondary font-bold text-stone-500">Última actualización: 14 de agosto de 2026</p>
        </header>

        <StorefrontCard level={1} density="compact" className="border-brand-200 bg-brand-50/70">
          <div className="flex items-start" style={{ gap: "var(--sf-space-md)" }}>
            <StorefrontIcon icon={CalendarClock} context="autonomous" variant="brand" />
            <div className="min-w-0" style={{ display: "flex", flexDirection: "column", gap: "var(--sf-space-xs)" }}>
              <h2 className="sf-text-h2 text-stone-900">Sobre la fecha anunciada</h2>
              <p className="sf-text-body text-stone-700">
                La fecha puede reprogramarse si la participación pagada no alcanza el nivel necesario. Si ya pagaste, tu participación conserva sus boletos y condiciones para la nueva fecha; recibirás el aviso correspondiente.
              </p>
            </div>
          </div>
        </StorefrontCard>

        <article className="grid grid-cols-1 gap-[var(--sf-space-md)] lg:grid-cols-2">
          {sections.map((section) => (
            <StorefrontCard key={section.title} level={1} density="compact" className="h-full">
              <div className="flex items-start" style={{ gap: "var(--sf-space-md)" }}>
                <StorefrontIcon icon={ShieldCheck} context="card" variant="brand" />
                <div className="min-w-0" style={{ display: "flex", flexDirection: "column", gap: "var(--sf-space-md)" }}>
                  <h2 className="sf-text-h2 text-stone-900">{section.title}</h2>
                  <div className="flex flex-col" style={{ gap: "var(--sf-space-sm)" }}>
                    {section.body.map((paragraph) => (
                      <p key={paragraph} className="sf-text-body text-stone-600">{paragraph}</p>
                    ))}
                  </div>
                </div>
              </div>
            </StorefrontCard>
          ))}
        </article>

        <div className="flex items-start border-t border-stone-200 pt-[var(--sf-space-md)]" style={{ gap: "var(--sf-space-sm)" }}>
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-brand-600" />
          <p className="sf-text-secondary text-stone-500">
            Esta política es informativa y debe leerse junto con las condiciones específicas publicadas para cada rifa.
          </p>
        </div>
      </div>
    </main>
  );
}
