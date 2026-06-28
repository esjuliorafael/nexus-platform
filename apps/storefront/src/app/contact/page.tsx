"use client";

import { useEffect, useState } from "react";
import { Clock3, Headphones, MessageCircle, Phone, UserRound } from "lucide-react";
import { contactsApi } from "../../api/contacts";
import type { PublicContact } from "../../types";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { StorefrontCard } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { StorefrontIcon } from "../../components/ui/Icon";

const whatsappHref = (phoneNumber: string, responsibility: string) => {
  const digits = phoneNumber.replace(/\D/g, "");
  const message = encodeURIComponent(`Hola, necesito informacion sobre ${responsibility}.`);
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
    <main className="min-h-screen px-[var(--sf-inset-page-mobile)] pb-[var(--sf-mobile-chrome-content-padding-bottom)] pt-[var(--sf-space-lg)] md:px-[var(--sf-padding-outer)] md:pt-24">
      <div className="mx-auto flex max-w-7xl flex-col" style={{ gap: "var(--sf-space-lg)" }}>
        <header className="flex max-w-3xl flex-col" style={{ gap: "var(--sf-space-sm)" }}>
          <Badge variant="brand" context="section" icon={Headphones} className="w-fit">
            Atencion directa
          </Badge>
          <h1 className="sf-text-display text-stone-900">Contacto</h1>
          <p className="sf-text-body max-w-2xl text-stone-600">
            Elige al responsable adecuado para recibir atencion sobre compras, crianza o seguimiento.
          </p>
        </header>

        {isLoading ? (
          <ContactSkeleton />
        ) : hasError ? (
          <EmptyState
            icon={Headphones}
            title="No pudimos cargar los contactos"
            description="Intenta nuevamente en unos minutos."
            compact
          />
        ) : contacts.length === 0 ? (
          <EmptyState
            icon={Headphones}
            title="Atencion no disponible"
            description="Los responsables de atencion se publicaran proximamente."
            compact
          />
        ) : (
          <section className="grid grid-cols-1 gap-[var(--sf-space-md)] lg:grid-cols-2">
            {contacts.map((contact) => (
              <StorefrontCard
                key={contact.id}
                level={1}
                density="compact"
                className="flex flex-col justify-between"
                style={{ gap: "var(--sf-space-lg)" }}
              >
                <div className="flex items-start" style={{ gap: "var(--sf-space-md)" }}>
                  <StorefrontIcon icon={UserRound} context="autonomous" variant="brand" />
                  <div className="min-w-0 space-y-[var(--sf-space-xs)]">
                    <p className="sf-text-label text-brand-600">{contact.responsibility}</p>
                    <h2 className="sf-text-h1 text-stone-900">{contact.displayName}</h2>
                    {contact.description && (
                      <p className="sf-text-secondary max-w-xl text-stone-600">{contact.description}</p>
                    )}
                    {contact.scheduleText && (
                      <p
                        className="sf-text-secondary flex items-center pt-1 font-bold text-stone-500"
                        style={{ gap: "var(--sf-space-sm)" }}
                      >
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
                      <Button
                        key={channel.id}
                        asChild
                        variant={isWhatsApp ? "success" : "outline"}
                        context="card"
                        className="flex-1 gap-2 sm:flex-none"
                      >
                        <a
                          href={
                            isWhatsApp
                              ? whatsappHref(channel.phoneNumber, contact.responsibility)
                              : `tel:${channel.phoneNumber}`
                          }
                          target={isWhatsApp ? "_blank" : undefined}
                          rel={isWhatsApp ? "noreferrer" : undefined}
                        >
                          {isWhatsApp ? <MessageCircle size={18} /> : <Phone size={18} />}
                          {channel.label || (isWhatsApp ? "WhatsApp" : "Llamar")}
                        </a>
                      </Button>
                    );
                  })}
                </div>
              </StorefrontCard>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function ContactSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-[var(--sf-space-md)] lg:grid-cols-2" aria-label="Cargando contactos">
      {[0, 1].map((item) => (
        <StorefrontCard key={item} level={1} density="compact" className="h-64 animate-pulse" />
      ))}
    </div>
  );
}
