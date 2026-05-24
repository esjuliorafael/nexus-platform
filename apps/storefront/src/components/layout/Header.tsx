"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { useCartStore } from '../../store/cart.store';
import { usePathname } from 'next/navigation';

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
  
  // Scroll detection to auto-hide header
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      const currentScrollPos = window.scrollY;
      const isVisible = prevScrollPos > currentScrollPos || currentScrollPos < 50;

      setPrevScrollPos(currentScrollPos);
      setVisible(isVisible);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prevScrollPos]);

  // Brand Name Override for "Granja La Manzana"
  const brandName = branding.brand_name || 'Granja La Manzana';

  const navLinks = [
    { to: '/', label: 'Inicio' },
    { to: '/store', label: 'Tienda' },
    { to: '/gallery', label: 'Galería' },
  ];

  if (showRaffles) {
    navLinks.push({ to: '/raffles', label: 'Rifas' });
  }

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-100/60 transition-transform duration-500 ease-in-out hidden md:block ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          {branding.logo_url ? (
            <img src={branding.logo_url} alt={brandName} className="h-10 w-auto group-hover:scale-105 transition-transform" />
          ) : (
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
              M
            </div>
          )}
          <span className="font-black text-xl text-stone-800 tracking-tight uppercase italic lora group-hover:text-brand-500 transition-colors">
            {brandName}
          </span>
        </Link>

        <nav className="flex items-center gap-10">
          {navLinks.map((link) => {
            const isActive = pathname === link.to;
            return (
              <a
                key={link.to}
                href={link.to}
                className={`text-xs font-black uppercase tracking-widest transition-colors relative py-2 ${
                  isActive ? 'text-brand-500' : 'text-stone-500 hover:text-stone-850'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full" />
                )}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCart}
            className="relative p-2.5 text-stone-500 hover:text-brand-500 transition-colors rounded-xl hover:bg-stone-50"
          >
            <ShoppingBag size={22} />
            {mounted && totalItems > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-brand-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
