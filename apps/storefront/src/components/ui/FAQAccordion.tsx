"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const defaultFAQs: FAQItem[] = [
  {
    question: "¿Cómo se coordinan los envíos de las aves?",
    answer: "Todos los envíos de nuestras aves de combate y cría se coordinan de forma segura y personalizada. Trabajamos con transportistas especializados en traslados de animales vivos para garantizar que lleguen en perfectas condiciones y con total comodidad. Una vez realizada la compra o reserva, nos ponemos en contacto directo contigo vía WhatsApp para acordar la ruta y horario exacto de entrega."
  },
  {
    question: "¿Qué métodos de pago tienen disponibles?",
    answer: "Aceptamos una gran variedad de métodos seguros que facilitan tu compra: pagos directos con tarjetas de débito y crédito a través de Mercado Pago, transferencias electrónicas bancarias (SPEI) para mayor comodidad, y depósitos directos en efectivo. Los datos de pago detallados se envían automáticamente a tu WhatsApp una vez generas tu reserva."
  },
  {
    question: "¿Cuánto tiempo dura una reserva antes de liberarse?",
    answer: "Para dar oportunidad a todos los clientes de adquirir ejemplares de genética única, las reservas tienen un límite de tiempo predeterminado (usualmente entre 12 y 24 horas, según la configuración actual del inventario). Recibirás un mensaje automático recordatorio en tu WhatsApp antes de que expire la reserva y el producto vuelva a estar disponible en el catálogo."
  },
  {
    question: "¿Cómo puedo verificar la autenticidad y genética de un ave?",
    answer: "Cada una de nuestras aves cuenta con un número de anillo grabado único y exclusivo que certifica su registro en nuestras instalaciones. En la ficha de detalle del producto podrás verificar el tipo de anillo, edad, linaje, y propósito específico (combate o cría). Además, puedes solicitarnos fotos o videos adicionales del ejemplar a través de nuestros canales de contacto."
  }
];

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {defaultFAQs.map((faq, index) => {
        const isOpen = openIndex === index;

        return (
          <div 
            key={index} 
            className="bg-white rounded-[2rem] border border-stone-200/60 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md hover:border-brand-500/20"
          >
            <button
              onClick={() => toggleFAQ(index)}
              className="w-full px-8 py-6 flex items-center justify-between text-left focus:outline-none"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                  isOpen ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25' : 'bg-stone-50 text-stone-400'
                }`}>
                  <HelpCircle size={18} />
                </div>
                <span className="font-bold text-stone-800 text-base md:text-lg">
                  {faq.question}
                </span>
              </div>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="text-stone-400 hover:text-stone-700"
              >
                <ChevronDown size={20} />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <div className="px-8 pb-6 pt-2 text-stone-500 font-medium text-sm leading-relaxed border-t border-stone-100/60">
                    {faq.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
