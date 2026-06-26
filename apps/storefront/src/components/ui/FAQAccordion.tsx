"use client";

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { StorefrontCard } from './Card';
import { StorefrontIcon } from './Icon';

interface FAQItem {
  question: string;
  answer: string;
}

const defaultFAQs: FAQItem[] = [
  {
    question: 'Como se coordinan los envios de las aves?',
    answer:
      'Todos los envios se coordinan de forma segura y personalizada. Trabajamos con transportistas especializados en animales vivos y confirmamos ruta, horario y condiciones por WhatsApp despues de la compra o reserva.',
  },
  {
    question: 'Que metodos de pago tienen disponibles?',
    answer:
      'Aceptamos tarjetas por Mercado Pago, transferencias SPEI y depositos directos. Los datos detallados se envian automaticamente cuando generas tu reserva.',
  },
  {
    question: 'Cuanto tiempo dura una reserva antes de liberarse?',
    answer:
      'La duracion depende de la configuracion vigente del inventario, usualmente entre 12 y 24 horas. Recibiras un recordatorio antes de que expire y el producto vuelva al catalogo.',
  },
  {
    question: 'Como puedo verificar la autenticidad genetica de un ave?',
    answer:
      'Cada ave puede incluir numero de anillo, edad, linaje y proposito en su ficha. Tambien puedes solicitar fotos o videos adicionales por los canales de contacto.',
  },
];

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-3xl space-y-[var(--sf-space-sm)]">
      {defaultFAQs.map((faq, index) => {
        const isOpen = openIndex === index;

        return (
          <StorefrontCard key={faq.question} interactive={false} density="none" className="overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between gap-4 p-[var(--sf-padding-inner)] text-left transition-colors duration-300 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20"
              style={{ transitionTimingFunction: 'var(--sf-ease)' }}
            >
              <span className="flex min-w-0 items-center gap-4">
                <StorefrontIcon icon={HelpCircle} variant={isOpen ? 'brand' : 'muted'} />
                <span className="sf-text-h2 text-stone-900">{faq.question}</span>
              </span>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="flex shrink-0 items-center justify-center text-stone-400"
              >
                <ChevronDown size={20} />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                >
                  <div className="border-t border-stone-100 px-[var(--sf-padding-inner)] pb-[var(--sf-padding-inner)] pt-4">
                    <p className="sf-text-body text-stone-500">{faq.answer}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </StorefrontCard>
        );
      })}
    </div>
  );
}
