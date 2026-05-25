"use client";

import { useSettings } from '../../hooks/useSettings';
import { Mail, Phone, MapPin, Facebook, Instagram, ShieldCheck, Truck, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  const { getBranding, getContact } = useSettings();
  const branding = getBranding();
  const contact = getContact();

  const brandName = branding.brand_name || 'Granja La Manzana';
  const { isModuleEnabled } = useSettings();
  const showRaffles = isModuleEnabled('raffle_enabled');

  return (
    <footer className="bg-stone-950 text-stone-400 border-t border-stone-900 pb-32 md:pb-20 pt-20 px-6 font-medium">
      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Value Propositions / Trust Banners */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12 border-b border-stone-900">
          <div className="flex items-start gap-4 p-6 bg-stone-900/30 rounded-3xl border border-stone-900/50">
            <div className="p-3 bg-brand-500/10 text-brand-400 rounded-2xl shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 className="text-white font-bold text-base uppercase tracking-wider mb-1">Garantía Genética</h4>
              <p className="text-xs text-stone-500 leading-relaxed">Cada una de nuestras aves de combate y cría cuenta con un linaje rigurosamente seleccionado y certificado.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-6 bg-stone-900/30 rounded-3xl border border-stone-900/50">
            <div className="p-3 bg-brand-500/10 text-brand-400 rounded-2xl shrink-0">
              <Truck size={24} />
            </div>
            <div>
              <h4 className="text-white font-bold text-base uppercase tracking-wider mb-1">Envíos Especializados</h4>
              <p className="text-xs text-stone-500 leading-relaxed">Coordinamos traslados seguros y confortables con transportistas expertos en bienestar animal en todo el país.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-6 bg-stone-900/30 rounded-3xl border border-stone-900/50">
            <div className="p-3 bg-brand-500/10 text-brand-400 rounded-2xl shrink-0">
              <HelpCircle size={24} />
            </div>
            <div>
              <h4 className="text-white font-bold text-base uppercase tracking-wider mb-1">Atención Exclusiva</h4>
              <p className="text-xs text-stone-500 leading-relaxed">Soporte directo por WhatsApp antes, durante y después de tu compra para resolver cualquier duda.</p>
            </div>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-8">
          
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-6">
            <Link href="/" className="flex items-center gap-3 text-white group">
              {branding.logo_url ? (
                <img src={branding.logo_url} alt={brandName} className="h-8 w-auto brightness-0 invert" />
              ) : (
                <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-brand-500/25 group-hover:scale-105 transition-transform">
                  M
                </div>
              )}
              <span className="font-black text-xl tracking-tight uppercase italic lora group-hover:text-brand-400 transition-colors">
                {brandName}
              </span>
            </Link>
            <p className="max-w-sm text-sm text-stone-500 leading-relaxed">
              Dedicados a la crianza profesional y selección genética de aves de combate y cría de la más alta calidad. Comprometidos con el desarrollo del deporte y la excelencia.
            </p>
            
            {/* Social Media Links */}
            <div className="flex items-center gap-3 pt-2">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noreferrer"
                className="w-10 h-10 bg-stone-900 hover:bg-brand-500 hover:text-white border border-stone-800 rounded-xl flex items-center justify-center text-stone-400 transition-all duration-300 hover:-translate-y-1 shadow-md"
              >
                <Facebook size={18} />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noreferrer"
                className="w-10 h-10 bg-stone-900 hover:bg-brand-500 hover:text-white border border-stone-800 rounded-xl flex items-center justify-center text-stone-400 transition-all duration-300 hover:-translate-y-1 shadow-md"
              >
                <Instagram size={18} />
              </a>
              {contact.phone && (
                <a 
                  href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-10 h-10 bg-stone-900 hover:bg-brand-500 hover:text-white border border-stone-800 rounded-xl flex items-center justify-center text-stone-400 transition-all duration-300 hover:-translate-y-1 shadow-md"
                >
                  <Phone size={18} />
                </a>
              )}
            </div>
          </div>

          {/* Catalog / Navigation */}
          <div className="space-y-6">
            <h4 className="text-white font-black text-xs uppercase tracking-widest">Navegación</h4>
            <ul className="space-y-4 text-sm font-semibold">
              <li><Link href="/" className="hover:text-white transition-colors">Inicio</Link></li>
              <li><Link href="/store" className="hover:text-white transition-colors">Tienda Oficial</Link></li>
              <li><Link href="/gallery" className="hover:text-white transition-colors">Galería del Rancho</Link></li>
              <li><Link href="/raffles" className="hover:text-white transition-colors">Rifas Activas</Link></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-6">
            <h4 className="text-white font-black text-xs uppercase tracking-widest">Contacto</h4>
            <ul className="space-y-4 text-sm font-semibold">
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-brand-500 shrink-0" />
                <span>{contact.phone || '-'}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={16} className="text-brand-500 shrink-0" />
                <span className="break-all">{contact.email || '-'}</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={16} className="text-brand-500 shrink-0 mt-0.5" />
                <span>{contact.address || '-'}</span>
              </li>
            </ul>
          </div>

          {/* Legal / Policy Links */}
          <div className="space-y-6">
            <h4 className="text-white font-black text-xs uppercase tracking-widest">Políticas</h4>
            <ul className="space-y-4 text-sm font-semibold">
              <li><Link href="#" className="hover:text-white transition-colors">Términos del Servicio</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Aviso de Privacidad</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Políticas de Envío</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Preguntas Frecuentes</Link></li>
            </ul>
          </div>

        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-stone-900 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-bold uppercase tracking-wider text-stone-600">
          <p>© {new Date().getFullYear()} {brandName}. Todos los derechos reservados.</p>
          <p className="flex items-center gap-1.5 normal-case tracking-normal">
            Orgullosamente criado en México.
          </p>
        </div>
      </div>
    </footer>
  );
}
