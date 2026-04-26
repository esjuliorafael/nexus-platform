import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { useCartStore } from '../../store/cart.store';
import { CartDrawer } from '../cart/CartDrawer';
import { Button } from '../ui/Button';

export function Header() {
  const { getBranding } = useSettings();
  const branding = getBranding();
  const totalItems = useCartStore((state) => state.getTotalItems());
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Inicio' },
    { to: '/store', label: 'Tienda' },
    { to: '/gallery', label: 'Galería' },
  ];

  if (import.meta.env.VITE_RAFFLE_ENABLED === 'true') {
    navLinks.push({ to: '/raffles', label: 'Rifas' });
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            {branding.logo_url ? (
              <img src={branding.logo_url} alt={branding.brand_name ?? ''} className="h-10 w-auto" />
            ) : (
              <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white font-black text-xl">
                {branding.brand_name?.[0] ?? ''}
              </div>
            )}
            <span className="font-black text-xl text-stone-800 hidden sm:block tracking-tight">
              {branding.brand_name}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `text-sm font-bold transition-colors ${
                    isActive ? 'text-brand-500' : 'text-stone-500 hover:text-stone-800'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-stone-500 hover:text-brand-500 transition-colors"
            >
              <ShoppingBag size={24} />
              {totalItems > 0 && (
                <span className="absolute top-0 right-0 bg-brand-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                  {totalItems}
                </span>
              )}
            </button>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMenuOpen(true)}>
              <Menu size={24} />
            </Button>
          </div>
        </div>
      </header>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white p-6 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-between mb-12">
            <span className="font-black text-2xl tracking-tight text-stone-800">Menú</span>
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
              <X size={24} />
            </Button>
          </div>
          <nav className="flex flex-col gap-6">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setIsMenuOpen(false)}
                className="text-3xl font-black text-stone-800 active:text-brand-500 transition-colors"
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
