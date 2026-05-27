"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { useCartStore } from '../../store/cart.store';
import { Button } from '../ui/Button';

interface HeaderProps {
  showRaffles?: boolean;
  onOpenCart?: () => void;
}

export function Header({ showRaffles = false, onOpenCart }: HeaderProps) {
  const pathname = usePathname();
  const { getBranding } = useSettings();
  const branding = getBranding();
  const totalItems = useCartStore((state) => state.items.reduce((acc, item) => acc + item.quantity, 0));
  const [mounted, setMounted] = useState(false);
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      const currentScrollPos = window.scrollY;
      const shouldShow = prevScrollPos > currentScrollPos || currentScrollPos < 50;

      setPrevScrollPos(currentScrollPos);
      setVisible(shouldShow);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prevScrollPos]);

  const brandName = branding.brand_name || 'Granja La Manzana';
  const navLinks = [
    { to: '/', label: 'Inicio' },
    { to: '/store', label: 'Tienda' },
    { to: '/gallery', label: 'Galeria' },
    ...(showRaffles ? [{ to: '/raffles', label: 'Rifas' }] : []),
  ];

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-40 hidden border-b border-stone-200/70 bg-stone-50/90 backdrop-blur-xl transition-transform duration-500 md:block ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
      style={{ transitionTimingFunction: 'var(--sf-ease)' }}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-[var(--sf-padding-outer)]">
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          {branding.logo_url ? (
            <img
              src={branding.logo_url}
              alt={brandName}
              className="h-10 w-auto shrink-0 transition-transform duration-300 group-hover:scale-105"
              style={{ transitionTimingFunction: 'var(--sf-ease)' }}
            />
          ) : (
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center bg-brand-500 text-xl font-black text-white shadow-lg shadow-brand-500/20 transition-transform duration-300 group-hover:scale-105"
              style={{ borderRadius: 'var(--sf-radius-nested)', transitionTimingFunction: 'var(--sf-ease)' }}
            >
              M
            </div>
          )}
          <span className="truncate text-lg font-black uppercase leading-none text-stone-900 transition-colors group-hover:text-brand-500">
            {brandName}
          </span>
        </Link>

        <nav className="flex items-center gap-2 rounded-full border border-stone-200 bg-white/75 p-1 shadow-sm shadow-stone-900/5">
          {navLinks.map((link) => {
            const isActive = pathname === link.to;

            return (
              <Link
                key={link.to}
                href={link.to}
                className={`sf-text-label relative rounded-full px-5 py-3 transition-colors duration-300 ${
                  isActive
                    ? 'bg-stone-900 text-white shadow-sm shadow-stone-900/10'
                    : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <Button
          type="button"
          onClick={onOpenCart}
          variant="ghost"
          size="icon"
          aria-label="Abrir carrito"
          className="relative text-stone-600 hover:text-brand-500"
        >
          <ShoppingBag size={22} />
          {mounted && totalItems > 0 && (
            <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-stone-50 bg-brand-500 px-1 text-[10px] font-black leading-none text-white shadow-sm">
              {totalItems}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
}
