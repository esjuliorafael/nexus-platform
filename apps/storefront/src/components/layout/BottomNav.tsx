"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, Image as ImageIcon, Ticket, ShoppingCart } from 'lucide-react';
import { useCartStore } from '../../store/cart.store';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface BottomNavProps {
  showRaffles?: boolean;
  onOpenCart?: () => void;
}

export function BottomNav({ showRaffles = false, onOpenCart }: BottomNavProps) {
  const pathname = usePathname();
  const totalItems = useCartStore((state) => state.items.reduce((acc, item) => acc + item.quantity, 0));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(mounted => true);
  }, []);

  const navItems = [
    { to: '/', label: 'Inicio', icon: Home },
    { to: '/store', label: 'Tienda', icon: ShoppingBag },
    { to: '/gallery', label: 'Galería', icon: ImageIcon },
  ];

  if (showRaffles) {
    navItems.push({ to: '/raffles', label: 'Rifas', icon: Ticket });
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md md:hidden">
      <nav className="flex items-center justify-around bg-stone-900/90 backdrop-blur-xl border border-stone-800/80 rounded-[2rem] px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
        {navItems.map((item) => {
          const isActive = pathname === item.to;
          const Icon = item.icon;

          return (
            <Link key={item.to} href={item.to} className="relative flex flex-col items-center justify-center p-2 rounded-2xl group transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900">
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30' 
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </motion.div>
              <span className={`text-[10px] font-black uppercase tracking-wider mt-1 transition-all duration-300 ${
                isActive ? 'text-brand-400 scale-100 font-extrabold' : 'text-stone-500 scale-95'
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Quick Cart Button */}
        <button 
          onClick={onOpenCart} 
          className="relative flex flex-col items-center justify-center p-2 rounded-2xl group transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900"
        >
          <motion.div
            whileTap={{ scale: 0.9 }}
            className="relative flex items-center justify-center w-10 h-10 rounded-2xl text-stone-400 hover:text-stone-200"
          >
            <ShoppingCart size={20} strokeWidth={2} />
            {mounted && totalItems > 0 && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 bg-brand-500 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-stone-900 shadow-md"
              >
                {totalItems}
              </motion.span>
            )}
          </motion.div>
          <span className="text-[10px] font-black uppercase tracking-wider mt-1 text-stone-500">
            Carrito
          </span>
        </button>
      </nav>
    </div>
  );
}
