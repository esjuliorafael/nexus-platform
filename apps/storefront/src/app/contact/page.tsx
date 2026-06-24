"use client";

import { useEffect, useState } from "react";
import { Clock3, Headphones, MessageCircle, Phone, UserRound } from "lucide-react";
import { contactsApi } from "../../api/contacts";
import type { PublicContact } from "../../types";

const whatsappHref = (phoneNumber: string, responsibility: string) => {
  const digits = phoneNumber.replace(/\D/g, "");
  const message = encodeURIComponent(`Hola, necesito información sobre ${responsibility}.`);
  return `https://wa.me/${digits}?text=${message}`;
};

export default function ContactPage() {
  const [contacts, setContacts] = useState<PublicContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const loadContacts = async () => {
      try {
        setContacts(await contactsApi.getAll());
      } catch {
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };
    void loadContacts();
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 px-[var(--sf-padding-outer)] pb-32 pt-[var(--sf-space-lg)] md:pb-40 md:pt-24">
      <div className="mx-auto flex max-w-7xl flex-col" style={{ gap: "var(--sf-space-lg)" }}>
        <header className="max-w-3xl space-y-[var(--sf-space-sm)]">
          <div className="flex items-center gap-3 text-brand-600">
            <Headphones size={20} />
            <span className="sf-text-label">Atención directa</span>
          </div>
          <h1 className="sf-text-display text-stone-900">Contacto</h1>
          <p className="sf-text-body max-w-2xl text-stone-600">
            Elige al responsable adecuado para recibir atención sobre compras, crianza o seguimiento.
          </p>
        </header>

        {isLoading ? (
          <ContactSkeleton />
        ) : hasError ? (
          <ContactState
            title="No pudimos cargar los contactos"
            description="Intenta nuevamente en unos minutos."
          />
        ) : contacts.length === 0 ? (
          <ContactState
            title="Atención no disponible"
            description="Los responsables de atención se publicarán próximamente."
          />
        ) : (
          <div className="grid grid-cols-1 gap-[var(--sf-space-md)] lg:grid-cols-2">
            {contacts.map((contact) => (
              <article
                key={contact.id}
                className="flex flex-col justify-between border border-stone-200 bg-white shadow-sm shadow-stone-900/5"
                style={{
                  gap: "var(--sf-space-lg)",
                  padding: "var(--sf-padding-inner)",
                  borderRadius: "var(--sf-radius-card-inner)",
                }}
              >
                <div className="flex items-start" style={{ gap: "var(--sf-space-md)" }}>
                  <div
                    className="flex shrink-0 items-center justify-center border border-brand-100 bg-brand-50 text-brand-600"
                    style={{
                      width: "var(--sf-size-icon-section)",
                      height: "var(--sf-size-icon-section)",
                      borderRadius: "var(--sf-radius-inner)",
                    }}
                  >
                    <UserRound size={22} />
                  </div>
                  <div className="min-w-0 space-y-[var(--sf-space-xs)]">
                    <p className="sf-text-label text-brand-600">{contact.responsibility}</p>
                    <h2 className="sf-text-h1 text-stone-900">{contact.displayName}</h2>
                    {contact.description && (
                      <p className="sf-text-secondary max-w-xl text-stone-600">{contact.description}</p>
                    )}
                    {contact.scheduleText && (
                      <p className="sf-text-secondary flex items-center gap-2 pt-1 font-bold text-stone-500">
                        <Clock3 size={15} className="text-brand-500" />
                        {contact.scheduleText}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap" style={{ gap: "var(--sf-space-sm)" }}>
                  {contact.channels.map((channel) => {
                    const isWhatsApp = channel.type === "WHATSAPP";
                    return (
                      <a
                        key={channel.id}
                        href={
                          isWhatsApp
                            ? whatsappHref(channel.phoneNumber, contact.responsibility)
                            : `tel:${channel.phoneNumber}`
                        }
                        target={isWhatsApp ? "_blank" : undefined}
                        rel={isWhatsApp ? "noreferrer" : undefined}
                        className={`sf-text-button-card inline-flex min-h-12 flex-1 items-center justify-center gap-2 border px-5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25 active:scale-[0.98] sm:flex-none ${
                          isWhatsApp
                            ? "border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800"
                            : "border-stone-300 bg-stone-100 text-stone-900 hover:bg-stone-200"
                        }`}
                        style={{
                          borderRadius: "var(--sf-radius-nested)",
                          transitionTimingFunction: "var(--sf-ease)",
                        }}
                      >
                        {isWhatsApp ? <MessageCircle size={18} /> : <Phone size={18} />}
                        {channel.label || (isWhatsApp ? "WhatsApp" : "Llamar")}
                      </a>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ContactSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-[var(--sf-space-md)] lg:grid-cols-2" aria-label="Cargando contactos">
      {[0, 1].map((item) => (
        <div
          key={item}
          className="h-64 animate-pulse border border-stone-200 bg-white"
          style={{ borderRadius: "var(--sf-radius-card-inner)" }}
        />
      ))}
    </div>
  );
}

function ContactState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center border border-stone-200 bg-white text-center"
      style={{ gap: "var(--sf-space-sm)", borderRadius: "var(--sf-radius-card-inner)" }}>
      <Headphones size={30} className="text-brand-500" />
      <h2 className="sf-text-h2 text-stone-900">{title}</h2>
      <p className="sf-text-secondary text-stone-500">{description}</p>
    </div>
  );
}
