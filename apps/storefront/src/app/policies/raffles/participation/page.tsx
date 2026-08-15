"use client";

import { CalendarClock, CheckCircle2, CreditCard, FileCheck2, FileText, Info, Landmark, Receipt, RefreshCw, RotateCcw, Sparkles, Ticket, Trophy } from "lucide-react";
import { useSettings } from "../../../../hooks/useSettings";
import { StorefrontCard } from "../../../../components/ui/Card";
import { StorefrontIcon } from "../../../../components/ui/Icon";
import { FAQAccordion, FAQItem } from "../../../../components/ui/FAQAccordion";
import { StorefrontReveal } from "../../../../components/ui/Reveal";

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
          "Cuando un apartado se crea cerca de la fecha y hora oficial de la rifa, vence en el momento que ocurra primero: el plazo configurado para el apartado o el inicio del evento de referencia. La fecha y hora efectivas de vencimiento son las que se muestran en la comunicación y en la consulta de la participación.",
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
          "La fecha y hora publicadas corresponden a la programación prevista para la rifa. El organizador podrá reprogramarlas cuando no se alcance el nivel de participación pagada necesario para realizar la rifa, o cuando exista una causa operativa, técnica, de fuerza mayor o una exigencia de autoridad que lo haga necesario.",
          "La selección de boletos apartados pero no pagados no se considera participación vendida para determinar la viabilidad de la rifa.",
        ],
      },
      {
        title: "Comunicación del cambio",
        body: [
          "Cuando se modifique la fecha, se publicará la nueva fecha y hora en el sitio y se comunicará a las participaciones activas mediante los canales disponibles. La participación pagada conservará sus mismos boletos, oportunidades y condiciones para la nueva fecha, sin necesidad de volver a comprar.",
          "Si existe un apartado pendiente de pago y el cambio de fecha extiende el tiempo disponible, el nuevo vencimiento se calculará con base en el plazo configurado para el apartado y se comunicará al participante. El cambio no convierte un apartado en una participación pagada; el pago y su validación siguen siendo necesarios.",
          "Cuando exista constancia de envío o entrega de la comunicación al medio de contacto registrado, el cambio se tendrá por comunicado al participante. La falta de lectura, respuesta o confirmación no suspende la vigencia del cambio ni permite desconocer la fecha nueva publicada; {{brand_name}} conservará los registros disponibles del envío, entrega, contenido y momento de la comunicación.",
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

const sectionIcons = [FileCheck2, Ticket, CalendarClock, RotateCcw, Trophy, Info];
const raffleFaqIcons = [Ticket, Sparkles, Trophy, CalendarClock, CreditCard, Landmark, Receipt, RefreshCw, CalendarClock, Trophy, RotateCcw, Landmark, Trophy];

const raffleFaqs: FAQItem[] = [
  {
    question: "¿Cómo participa mi boleto?",
    answer: "En una rifa simple participa tu número principal. En una rifa de oportunidades participan tu número principal y las oportunidades adicionales asociadas. La ficha de cada rifa publica el precio, las reglas, los dígitos y la fecha aplicables.",
  },
  {
    question: "¿Qué son las oportunidades adicionales?",
    answer: "Solo aplican a rifas de oportunidades. Son números asociados a tu número principal y participan junto con él conforme a la regla publicada para esa rifa. Las rifas simples no generan oportunidades adicionales.",
  },
  {
    question: "¿Cómo se determina el resultado?",
    answer: "Cada rifa indica en su ficha el mecanismo publicado para obtener el número ganador, los dígitos que se utilizan, los lugares y los premios correspondientes. Solo se considera el resultado de la fecha oficial vigente.",
  },
  {
    question: "¿Cuánto tiempo dura un apartado?",
    answer: "El apartado conserva temporalmente tus boletos durante el plazo configurado para esa rifa. Si apartas cerca de la fecha y hora oficial, vence en el momento que ocurra primero: el plazo configurado o el inicio del evento de referencia. La fecha y hora efectivas se informan en la comunicación y en la consulta de la participación.",
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
    question: "¿Dónde consulto la información para pagar?",
    answer: "La información bancaria aparece en la comunicación de tu participación y en la consulta privada de participación mientras exista un importe pendiente.",
  },
  {
    question: "¿Qué pasa si pagué, pero no envié el comprobante a tiempo?",
    answer: "Escríbenos cuanto antes. Si los boletos siguen disponibles, el organizador puede revisar una restauración y confirmar el pago; pagar después de que los boletos fueron liberados no garantiza su restauración. Si ya no están disponibles, podrás solicitar un reembolso o elegir otros boletos disponibles, según corresponda.",
  },
  {
    question: "¿Qué pasa si mi apartado fue liberado?",
    answer: "Puedes solicitar una restauración. Esta depende de la disponibilidad de los boletos y de la validación del organizador. Si fueron asignados a otra participación, no se garantiza su recuperación; podrás solicitar un reembolso o elegir otros boletos disponibles, según corresponda.",
  },
  {
    question: "¿Qué pasa si cambia la fecha de la rifa?",
    answer: "Si el cambio fue publicado y comunicado antes de iniciar el evento de referencia, la nueva fecha sustituye a la anterior. Las participaciones pagadas conservan su número principal y sus oportunidades, si las tienen. Los apartados pendientes de pago reciben el plazo actualizado que corresponda; el pago y su validación siguen siendo necesarios.",
  },
  {
    question: "¿Qué resultado es válido si la rifa cambia de fecha?",
    answer: "Si el cambio fue publicado y comunicado antes de iniciar el evento de referencia, la nueva fecha sustituye a la anterior. Solo será válido el resultado obtenido en la nueva fecha publicada. El resultado correspondiente a la fecha sustituida no genera un premio.",
  },
  {
    question: "¿Puedo solicitar un reembolso si no estoy de acuerdo con el cambio de fecha?",
    answer: "Sí. Puedes solicitarlo antes de que inicie el evento de referencia. Una vez validado y procesado, tu participación quedará cancelada y dejará de ser elegible para esa rifa, aunque el resultado posterior coincida con alguno de tus números.",
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
        <StorefrontReveal cadence="editorial" amount={0.2}>
          <header className="max-w-3xl" style={{ display: "flex", flexDirection: "column", gap: "var(--sf-space-sm)" }}>
            <h1 className="sf-text-display text-stone-900">Política de participación en rifas</h1>
            <p className="sf-text-body text-stone-600">
              Condiciones para apartar, pagar y participar en las rifas de {brandName}.
            </p>
            <p className="sf-text-secondary font-bold text-stone-500">Revisión vigente de la política: agosto de 2026</p>
          </header>
        </StorefrontReveal>

        <div className="grid grid-cols-1 items-start gap-[var(--sf-space-lg)] lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.85fr)]">
          <article className="order-2 flex flex-col lg:order-1" style={{ gap: "var(--sf-space-md)" }}>
            <StorefrontReveal cadence="editorial" delayMs={80} amount={0.15}>
              <StorefrontCard level={1} density="compact" className="border-brand-200 bg-brand-50/70">
              <div className="flex flex-col" style={{ gap: "var(--sf-space-md)" }}>
                <div className="flex items-center" style={{ gap: "var(--sf-space-md)" }}>
                  <StorefrontIcon icon={CalendarClock} context="autonomous" variant="brand" />
                  <h2 className="sf-text-h2 text-stone-900">Sobre la fecha anunciada</h2>
                </div>
                  <p className="sf-text-body text-stone-700">
                    La fecha puede reprogramarse si la participación pagada no alcanza el nivel necesario. Si ya pagaste, tu participación conserva sus boletos y condiciones para la nueva fecha; recibirás el aviso correspondiente.
                  </p>
              </div>
              </StorefrontCard>
            </StorefrontReveal>

            {sections.map((section, index) => {
              const SectionIcon = sectionIcons[index] ?? Info;

              return (
              <StorefrontReveal key={section.title} cadence="editorial" amount={0.15}>
                <section
                className={`grid grid-cols-[auto_minmax(0,1fr)] items-center ${index < sections.length - 1 ? "border-b border-stone-200 pb-[var(--sf-space-lg)]" : ""}`}
                style={{ gap: "var(--sf-space-md)" }}
              >
                <StorefrontIcon icon={SectionIcon} context="section" variant="brand" />
                <h2 className="sf-text-h2 text-stone-900">{section.title}</h2>
                <div className="col-span-2 flex flex-col lg:col-span-1 lg:col-start-2" style={{ gap: "var(--sf-space-md)" }}>
                  {section.groups.map((group) => (
                    <div key={group.title} className="flex flex-col" style={{ gap: "var(--sf-space-sm)" }}>
                      <h3 className="sf-text-subtitle text-stone-900">{group.title}</h3>
                      <div className="flex flex-col" style={{ gap: "var(--sf-space-sm)" }}>
                        {group.body.map((paragraph) => (
                          <p key={paragraph} className="sf-text-body text-stone-600">{paragraph.replace("{{brand_name}}", brandName)}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                </section>
              </StorefrontReveal>
              );
            })}
          </article>

          <StorefrontReveal className="order-1 lg:order-2 lg:sticky lg:top-[var(--sf-space-lg)]" cadence="editorial" delayMs={160} amount={0.15}>
            <aside>
              <StorefrontCard level={1} density="compact">
              <div className="mb-[var(--sf-space-md)] flex items-start" style={{ gap: "var(--sf-space-md)" }}>
                <StorefrontIcon icon={FileText} context="section" variant="brand" />
                <div className="min-w-0" style={{ display: "flex", flexDirection: "column", gap: "var(--sf-space-xs)" }}>
                  <h2 className="sf-text-h2 text-stone-900">Preguntas frecuentes</h2>
                  <p className="sf-text-body text-stone-600">Respuestas rápidas sobre tu participación.</p>
                </div>
              </div>
              <FAQAccordion items={raffleFaqs.map((faq, index) => ({ ...faq, icon: raffleFaqIcons[index] }))} />
              </StorefrontCard>
            </aside>
          </StorefrontReveal>
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
