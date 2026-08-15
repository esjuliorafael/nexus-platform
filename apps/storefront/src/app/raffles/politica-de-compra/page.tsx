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
      "Cuando exista constancia de envío o entrega de la comunicación al medio de contacto registrado, el cambio se tendrá por comunicado al participante. La falta de lectura, respuesta o confirmación no suspende la vigencia del cambio ni permite desconocer la fecha nueva publicada; Nexus conservará los registros disponibles del envío, entrega, contenido y momento de la comunicación.",
      "Si el cambio se comunica antes de que inicie el evento de la Lotería Nacional usado como referencia y antes de publicar resultados, la fecha original queda sustituida de manera inmediata desde su publicación y comunicación. En ese caso, no podrá reclamarse un premio, resultado o sorteo con base en la fecha anterior; solo será válido el resultado obtenido conforme a la nueva fecha publicada.",
      "Una vez iniciado el evento de referencia, no se aplicará un cambio de fecha con efectos retroactivos sobre un resultado ya ocurrido.",
      "Para efectos de cada rifa, la fecha y hora oficiales son exclusivamente las publicadas en su ficha, expresadas en el horario del centro de México. Si una rifa publica las 8:00 p. m., esa es la hora oficial de esa rifa; esta política no afirma que todos los eventos de la Lotería Nacional tengan siempre ese horario. El participante debe consultar la hora equivalente en su ubicación; el evento de referencia comienza en el momento oficial publicado, sin que su zona horaria modifique ese momento.",
      "Si una persona no está de acuerdo con el cambio de fecha, puede solicitar el reembolso de su participación antes de que inicie el evento de referencia, por los medios de contacto publicados. Una vez validada y procesada la solicitud, la participación se cancela de forma definitiva y deja de ser elegible para esa rifa, sin importar cuál hubiera sido su resultado potencial.",
      "Una participación cancelada y reembolsada no puede recuperar posteriormente un premio ni reclamar un número ganador, incluso si el resultado publicado coincide con alguno de sus boletos. El cambio de fecha no genera por sí mismo una devolución automática; el reembolso requiere una solicitud y su validación conforme a las condiciones comunicadas para la rifa y a la legislación aplicable.",
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
      "La versión vigente de esta política es la que se encuentra publicada al momento de realizar la operación. Si se modifica, se publicará una nueva revisión con su fecha correspondiente.",
    ],
  },
];

export default function RafflePurchasePolicyPage() {
  const { getBranding } = useSettings();
  const configuredBrandName = getBranding().brand_name;
  const brandName =
    configuredBrandName && configuredBrandName !== "Nexus Store"
      ? configuredBrandName
      : "Rancho Las Trojes";

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
          <p className="sf-text-secondary font-bold text-stone-500">Revisión vigente de la política: agosto de 2026</p>
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
