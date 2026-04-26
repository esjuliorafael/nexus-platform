import { useSettings } from '../../hooks/useSettings';
import { Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  const { getBranding, getContact } = useSettings();
  const branding = getBranding();
  const contact = getContact();

  return (
    <footer className="bg-stone-900 text-stone-400 py-20 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="md:col-span-2 space-y-6">
          <Link to="/" className="flex items-center gap-3 text-white">
            {branding.logo_url ? (
              <img src={branding.logo_url} alt={branding.brand_name ?? ''} className="h-8 w-auto brightness-0 invert" />
            ) : (
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-black">
                {branding.brand_name?.[0] ?? ''}
              </div>
            )}
            <span className="font-black text-xl tracking-tight uppercase italic lora">
              {branding.brand_name}
            </span>
          </Link>
          <p className="max-w-sm text-sm leading-relaxed">
            Plataforma líder en comercialización de aves de combate y artículos de primera calidad. 
            Comprometidos con la excelencia y la satisfacción de nuestros clientes.
          </p>
        </div>

        <div className="space-y-6">
          <h4 className="text-white font-bold text-sm uppercase tracking-widest">Contacto</h4>
          <ul className="space-y-4 text-sm">
            <li className="flex items-center gap-3">
              <Phone size={16} className="text-brand-500" />
              {contact.phone}
            </li>
            <li className="flex items-center gap-3">
              <Mail size={16} className="text-brand-500" />
              {contact.email}
            </li>
            <li className="flex items-start gap-3">
              <MapPin size={16} className="text-brand-500 shrink-0" />
              {contact.address}
            </li>
          </ul>
        </div>

        <div className="space-y-6">
          <h4 className="text-white font-bold text-sm uppercase tracking-widest">Legal</h4>
          <ul className="space-y-4 text-sm">
            <li><Link to="#" className="hover:text-white transition-colors">Términos y Condiciones</Link></li>
            <li><Link to="#" className="hover:text-white transition-colors">Aviso de Privacidad</Link></li>
            <li><Link to="#" className="hover:text-white transition-colors">Envíos y Devoluciones</Link></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-stone-800 text-center text-xs uppercase tracking-widest font-bold">
        <p>© {new Date().getFullYear()} {branding.brand_name}. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
