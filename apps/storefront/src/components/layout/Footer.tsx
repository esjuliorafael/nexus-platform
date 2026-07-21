"use client";

import Link from 'next/link';
import {
  Facebook,
  HelpCircle,
  Instagram,
  type LucideIcon,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { useBrandImageReady } from '../ui/BrandLogo';
import { StorefrontIcon } from '../ui/Icon';

export function Footer() {
  const { getBranding, getContact, isModuleEnabled } = useSettings();
  const branding = getBranding();
  const contact = getContact();

  const brandName = branding.brand_name || 'Nexus Store';
  const showRaffles = isModuleEnabled('raffle_enabled');
  const isBrandLogoReady = useBrandImageReady(branding.logo_url);

  const trustItems = [
    {
      icon: ShieldCheck,
      title: 'Garantia genetica',
      body: 'Linajes seleccionados con trazabilidad clara para compra, cria y seguimiento.',
    },
    {
      icon: Truck,
      title: 'Envios especializados',
      body: 'Coordinacion de traslados seguros con operadores preparados para bienestar animal.',
    },
    {
      icon: HelpCircle,
      title: 'Atencion directa',
      body: 'Acompanamiento por WhatsApp antes, durante y despues de cada compra.',
    },
  ];

  const navLinks = [
    { href: '/', label: 'Inicio' },
    { href: '/store', label: 'Tienda oficial' },
    { href: '/gallery', label: 'Galeria' },
    { href: '/contact', label: 'Contacto' },
    ...(showRaffles ? [{ href: '/raffles', label: 'Rifas activas' }] : []),
  ];

  const helpLinks = [
    { href: '/#preguntas-frecuentes', label: 'Preguntas frecuentes' },
    { href: '/contact', label: 'Contactar a un responsable' },
    { href: '/store', label: 'Catalogo disponible' },
    { href: '/gallery', label: 'Archivo visual' },
    ...(showRaffles ? [{ href: '/raffles', label: 'Rifas activas' }] : []),
  ];

  return (
    <footer className="border-t border-stone-800 bg-stone-950 px-[var(--sf-inset-page)] pb-32 pt-[var(--sf-space-xl)] text-stone-400 md:pb-20">
      <div className="mx-auto max-w-[var(--sf-max-width-content)] space-y-[var(--sf-space-xl)]">
        <div className="grid grid-cols-1 gap-[var(--sf-space-md)] border-b border-stone-800 pb-[var(--sf-space-lg)] md:grid-cols-3">
          {trustItems.map((item) => (
            <div
              key={item.title}
              className="group flex items-start gap-4 border border-stone-800 bg-stone-900/45 p-[var(--sf-padding-inner)] shadow-sm shadow-black/10"
              style={{ borderRadius: 'var(--sf-radius-card-inner)' }}
            >
              <StorefrontIcon icon={item.icon} variant="dark" />
              <div className="min-w-0 space-y-2">
                <h4 className="sf-text-h2 text-white">{item.title}</h4>
                <p className="sf-text-secondary text-stone-500">{item.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-[var(--sf-space-lg)] lg:grid-cols-5">
          <div className="space-y-[var(--sf-space-md)] lg:col-span-2">
            <Link href="/" className="group flex min-w-0 items-center gap-3 text-white">
              {branding.logo_url && isBrandLogoReady && (
                <img
                  src={branding.logo_url}
                  alt={brandName}
                  className="sf-brand-logo-reveal h-9 w-auto brightness-0 invert"
                />
              )}
              <span className="truncate text-xl font-black uppercase leading-none transition-colors group-hover:text-brand-400">
                {brandName}
              </span>
            </Link>

            <p className="sf-text-body max-w-md text-stone-500">
              Crianza profesional y seleccion genetica de aves de alta calidad, con procesos claros de compra,
              entrega y seguimiento.
            </p>

            <div className="flex items-center gap-3 pt-1">
              <SocialLink href="https://facebook.com" label="Facebook" icon={Facebook} />
              <SocialLink href="https://instagram.com" label="Instagram" icon={Instagram} />
              {contact.phone && (
                <SocialLink
                  href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`}
                  label="WhatsApp"
                  icon={Phone}
                />
              )}
            </div>
          </div>

          <FooterColumn title="Navegacion" links={navLinks} />

          <div className="space-y-[var(--sf-space-md)]">
            <h4 className="sf-text-label text-white">Contacto</h4>
            <ul className="space-y-4">
              <ContactItem icon={Phone} value={contact.phone || '-'} />
              <ContactItem icon={Mail} value={contact.email || '-'} breakAll />
              <ContactItem icon={MapPin} value={contact.address || '-'} alignStart />
            </ul>
          </div>

          <FooterColumn title="Ayuda" links={helpLinks} />
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-stone-800 pt-[var(--sf-space-md)] text-center md:flex-row md:text-left">
          <p className="sf-text-label text-stone-600">
            &copy; {new Date().getFullYear()} {brandName}. Todos los derechos reservados.
          </p>
          <p className="sf-text-secondary font-bold text-stone-600">Criado en Mexico.</p>
        </div>
      </div>
    </footer>
  );
}

interface FooterColumnProps {
  title: string;
  links: Array<{ href: string; label: string }>;
}

function FooterColumn({ title, links }: FooterColumnProps) {
  return (
    <div className="space-y-[var(--sf-space-md)]">
      <h4 className="sf-text-label text-white">{title}</h4>
      <ul className="space-y-4">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link className="sf-text-secondary font-bold text-stone-400 transition-colors hover:text-white" href={link.href}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ContactItemProps {
  icon: LucideIcon;
  value: string;
  alignStart?: boolean;
  breakAll?: boolean;
}

function ContactItem({ icon: Icon, value, alignStart = false, breakAll = false }: ContactItemProps) {
  return (
    <li className={`sf-text-secondary flex gap-3 font-bold text-stone-400 ${alignStart ? 'items-start' : 'items-center'}`}>
      <Icon size={16} className={`shrink-0 text-brand-400 ${alignStart ? 'mt-0.5' : ''}`} />
      <span className={breakAll ? 'break-all' : ''}>{value}</span>
    </li>
  );
}

interface SocialLinkProps {
  href: string;
  label: string;
  icon: LucideIcon;
}

function SocialLink({ href, label, icon: Icon }: SocialLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center border border-stone-800 bg-stone-900 text-stone-400 shadow-sm shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-500 hover:text-white"
      style={{ borderRadius: 'var(--sf-radius-nested)', transitionTimingFunction: 'var(--sf-ease)' }}
    >
      <Icon size={18} />
    </a>
  );
}
