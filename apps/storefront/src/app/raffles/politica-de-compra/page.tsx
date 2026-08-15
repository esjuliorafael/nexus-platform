"use client";

import { CalendarClock, CheckCircle2, FileText, ShieldCheck } from "lucide-react";
import { useSettings } from "../../../hooks/useSettings";
import { Badge } from "../../../components/ui/Badge";
import { StorefrontCard } from "../../../components/ui/Card";
import { StorefrontIcon } from "../../../components/ui/Icon";
import { FAQAccordion, FAQItem } from "../../../components/ui/FAQAccordion";

const sections = [
  {
    title: "1. Objeto y aceptación",
    groups: [
      {
        title: "Alcance",
        body: [
          "Esta política explica las condiciones para seleccionar, apartar y confirmar boletos de las rifas publicadas en este sitio. Al seleccionar boletos o completar un pago, aceptas estas condiciones y las reglas particulares mostradas en la página de la rifa.",
        ],
      },
      {
        title: "Reglas de cada rifa",
        body: [
          "Las reglas particulares de cada rifa, incluyendo su premio, precio, número de boletos, mecanismo de determinación del resultado y fecha anunciada, forman parte de esta política.",
        ],
      },
    ],
  },
  {
    title: "2. Apartado y confirmación del pago",
    groups: [
      {
        title: "Qué significa apartar",
        body: [
          "Un apartado reserva temporalmente los boletos seleccionados. No constituye una venta confirmada ni garantiza su disponibilidad después del plazo indicado para pagar.",
        ],
      },
      {
        title: "Cuándo se confirma",
        body: [
          "La participación queda confirmada únicamente cuando el pago ha sido aprobado o validado por el organizador. Los pagos por depósito o transferencia deben acompañarse del comprobante solicitado y quedar sujetos a validación.",
        ],
      },
      {
        title: "Vencimiento del apartado",
        body: [
          "Si el pago no se confirma dentro del plazo informado, el apartado puede liberarse y los boletos pueden volver a estar disponibles para otras personas.",
        ],
      },
    ],
  },
  {
    title: "3. Fecha de la rifa y posibles cambios",
    groups: [
      {
        title: "Programación y reprogramación",
        body: [
          "La fecha y hora publicadas corresponden a la programación prevista para el sorteo. El organizador podrá reprogramarlas cuando no se alcance el nivel de participación pagada necesario para realizar la rifa, o cuando exista una causa operativa, técnica, de fuerza mayor o una exigencia de autoridad que lo haga necesario.",
          "La selección de boletos apartados pero no pagados no se considera participación vendida para determinar la viabilidad de la rifa.",
        ],
      },
      {
        title: "Comunicación del cambio",
        body: [
          "Cuando se modifique la fecha, se publicará la nueva fecha y hora en el sitio y se comunicará a las participaciones activas mediante los canales disponibles. La participación pagada conservará sus mismos boletos, oportunidades y condiciones para la nueva fecha, sin necesidad de volver a comprar.",
          "Cuando exista constancia de envío o entrega de la comunicación al medio de contacto registrado, el cambio se tendrá por comunicado al participante. La falta de lectura, respuesta o confirmación no suspende la vigencia del cambio ni permite desconocer la fecha nueva publicada; Nexus conservará los registros disponibles del envío, entrega, contenido y momento de la comunicación.",
        ],
      },
      {
        title: "Efectos sobre el resultado",
        body: [
          "Si el cambio se comunica antes de que inicie el evento de la Lotería Nacional usado como referencia y antes de publicar resultados, la fecha original queda sustituida de manera inmediata desde su publicación y comunicación. En ese caso, no podrá reclamarse un premio, resultado o sorteo con base en la fecha anterior; solo será válido el resultado obtenido conforme a la nueva fecha publicada.",
          "Esta regla aplica por igual al número principal y a cualquier oportunidad adicional asociada a una participación pagada. En las rifas simples se considerará el número principal; en las rifas con oportunidades, también se considerarán las oportunidades generadas para ese número. Ninguno podrá considerarse ganador con base en el resultado correspondiente a la fecha sustituida.",
          "Una vez iniciado el evento de referencia, no se aplicará un cambio de fecha con efectos retroactivos sobre un resultado ya ocurrido.",
        ],
      },
      {
        title: "Hora oficial y reembolso",
        body: [
          "Para efectos de cada rifa, la fecha y hora oficiales son exclusivamente las publicadas en su ficha, expresadas en el horario del centro de México. Si una rifa publica las 8:00 p. m., esa es la hora oficial de esa rifa; esta política no afirma que todos los eventos de la Lotería Nacional tengan siempre ese horario. El participante debe consultar la hora equivalente en su ubicación; el evento de referencia comienza en el momento oficial publicado, sin que su zona horaria modifique ese momento.",
          "Si una persona no está de acuerdo con el cambio de fecha, puede solicitar el reembolso de su participación antes de que inicie el evento de referencia, por los medios de contacto publicados. Una vez validada y procesada la solicitud, la participación se cancela de forma definitiva y deja de ser elegible para esa rifa, sin importar cuál hubiera sido su resultado potencial.",
          "Una participación cancelada y reembolsada no puede recuperar posteriormente un premio ni reclamar un número ganador, incluso si el resultado publicado coincide con alguno de sus boletos. El cambio de fecha no genera por sí mismo una devolución automática; el reembolso requiere una solicitud y su validación conforme a las condiciones comunicadas para la rifa y a la legislación aplicable.",
        ],
      },
    ],
  },
  {
    title: "4. Cancelaciones, devoluciones y pagos",
    groups: [
      {
        title: "Cancelaciones y devoluciones",
        body: [
          "Las solicitudes de cancelación o devolución deben realizarse por los medios de contacto publicados y se revisarán con base en el estado de la participación, el método de pago, la etapa de la rifa y las condiciones aplicables.",
          "Una devolución aprobada libera los boletos y deja sin efecto la participación correspondiente. Las comisiones, tiempos y ajustes del proveedor de pago pueden afectar el momento en que el importe se refleja.",
        ],
      },
      {
        title: "Pagos no concretados",
        body: [
          "Un intento de pago rechazado no confirma la participación. Cuando exista una ventana de recuperación, podrá utilizarse el enlace o las instrucciones proporcionadas en la comunicación correspondiente.",
        ],
      },
    ],
  },
  {
    title: "5. Resultado y premios",
    groups: [
      {
        title: "Determinación y elegibilidad",
        body: [
          "El resultado se determina con el mecanismo publicado en la página de la rifa y se comunica mediante los canales oficiales del sitio. Solo las participaciones con pago confirmado que cumplan las condiciones de la rifa podrán ser consideradas elegibles.",
        ],
      },
      {
        title: "Entrega del premio",
        body: [
          "La persona ganadora deberá proporcionar la información necesaria para coordinar la entrega del premio. Las condiciones de envío, entrega o coordinación posterior se indicarán en la rifa o en la comunicación al ganador.",
        ],
      },
    ],
  },
  {
    title: "6. Información y contacto",
    groups: [
      {
        title: "Consulta y aclaraciones",
        body: [
          "Conserva tus mensajes, comprobantes y el enlace de consulta de tu participación. Para aclaraciones sobre un apartado, un pago, una reprogramación o una devolución, utiliza los datos de contacto publicados en este sitio e indica tu nombre, número de WhatsApp y referencia de la participación.",
        ],
      },
      {
        title: "Versión vigente",
        body: [
          "La versión vigente de esta política es la que se encuentra publicada al momento de realizar la operación. Si se modifica, se publicará una nueva revisión con su fecha correspondiente.",
        ],
      },
    ],
  },
];

const raffleFaqs: FAQItem[] = [
  {
    question: "¿Cómo participa mi boleto?",
    answer: "Cada rifa publica sus propias reglas, precio, número de dígitos y fecha. Tu número principal participa conforme a esas condiciones y puedes consultarlas en la ficha de la rifa.",
  },
  {
    question: "¿Qué son las oportunidades adicionales?",
    answer: "Solo aplican a rifas de oportunidades. Son números asociados a tu número principal y participan junto con él conforme a la regla publicada para esa rifa.",
  },
  {
    question: "¿Cómo se determina el resultado?",
    answer: "Cada rifa indica cómo se obtiene el número ganador y cuántos dígitos se utilizan. También publica los lugares y premios que correspondan.",
  },
  {
    question: "¿Cuánto tiempo dura un apartado?",
    answer: "El apartado conserva temporalmente tus boletos durante el plazo configurado para esa rifa. El plazo y el momento de vencimiento se informan en la comunicación correspondiente.",
  },
  {
    question: "¿Qué pasa si pago con tarjeta?",
    answer: "Si el pago es aprobado, la participación se confirma de inmediato y recibirás la comunicación correspondiente. Si el pago no se concreta, podrás seguir las instrucciones de recuperación disponibles.",
  },
  {
    question: "¿Qué pasa si pago por depósito o transferencia?",
    answer: "Debes realizar el pago dentro del plazo y enviar el comprobante por el medio indicado. La participación queda confirmada cuando el organizador valida el pago.",
  },
  {
    question: "¿Qué pasa si pagué, pero no envié el comprobante a tiempo?",
    answer: "Escríbenos cuanto antes. Si los boletos siguen disponibles, el organizador puede revisar una restauración y confirmar el pago; si ya no están disponibles, se revisará la alternativa aplicable, que puede incluir un reembolso.",
  },
  {
    question: "¿Qué pasa si mi apartado fue liberado?",
    answer: "Puedes solicitar una restauración. Si los boletos siguen disponibles, podrán restaurarse; si fueron asignados a otra participación, no se garantiza su recuperación.",
  },
  {
    question: "¿Qué pasa si cambia la fecha de la rifa?",
    answer: "La nueva fecha publicada y comunicada sustituye a la anterior. Tu participación pagada conserva su número principal y sus oportunidades, si las tiene.",
  },
  {
    question: "¿Qué pasa si mi número parecía ganador antes del cambio de fecha?",
    answer: "Si el cambio fue publicado y comunicado antes de iniciar el evento de referencia, solo es válido el resultado obtenido en la nueva fecha. El resultado de la fecha sustituida no genera un premio.",
  },
  {
    question: "¿Dónde consulto la información para pagar?",
    answer: "La información bancaria aparece en la comunicación de tu participación y en la consulta privada de participación mientras exista un importe pendiente.",
  },
  {
    question: "¿Cómo se entrega un premio?",
    answer: "Después de confirmar el resultado y contactar a la persona ganadora, se coordinan los datos y condiciones de entrega conforme a lo publicado en la rifa.",
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
          <h1 className="sf-text-display text-stone-900">Política de participación en rifas</h1>
          <p className="sf-text-body text-stone-600">
            Condiciones para apartar, pagar y participar en las rifas de {brandName}.
          </p>
          <p className="sf-text-secondary font-bold text-stone-500">Revisión vigente de la política: agosto de 2026</p>
        </header>

        <div className="grid grid-cols-1 items-start gap-[var(--sf-space-lg)] lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.85fr)]">
          <article className="flex flex-col" style={{ gap: "var(--sf-space-md)" }}>
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

            {sections.map((section) => (
              <StorefrontCard key={section.title} level={1} density="compact">
                <div className="flex items-start" style={{ gap: "var(--sf-space-md)" }}>
                  <StorefrontIcon icon={ShieldCheck} context="card" variant="brand" />
                  <div className="min-w-0" style={{ display: "flex", flexDirection: "column", gap: "var(--sf-space-md)" }}>
                    <h2 className="sf-text-h2 text-stone-900">{section.title}</h2>
                    <div className="flex flex-col" style={{ gap: "var(--sf-space-md)" }}>
                      {section.groups.map((group) => (
                        <div key={group.title} className="flex flex-col" style={{ gap: "var(--sf-space-xs)" }}>
                          <h3 className="sf-text-h3 text-stone-900">{group.title}</h3>
                          <div className="flex flex-col" style={{ gap: "var(--sf-space-sm)" }}>
                            {group.body.map((paragraph) => (
                              <p key={paragraph} className="sf-text-body text-stone-600">{paragraph}</p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </StorefrontCard>
            ))}
          </article>

          <aside className="lg:sticky lg:top-[var(--sf-space-lg)]">
            <StorefrontCard level={1} density="compact">
              <div className="mb-[var(--sf-space-md)] flex items-start" style={{ gap: "var(--sf-space-md)" }}>
                <StorefrontIcon icon={FileText} context="section" variant="brand" />
                <div className="min-w-0" style={{ display: "flex", flexDirection: "column", gap: "var(--sf-space-xs)" }}>
                  <h2 className="sf-text-h2 text-stone-900">Preguntas frecuentes</h2>
                  <p className="sf-text-body text-stone-600">Respuestas rápidas sobre tu participación.</p>
                </div>
              </div>
              <FAQAccordion items={raffleFaqs} />
            </StorefrontCard>
          </aside>
        </div>

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
