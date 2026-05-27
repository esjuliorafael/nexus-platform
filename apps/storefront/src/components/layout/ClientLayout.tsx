"use client";

import { useState } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { Footer } from './Footer';
import { CartDrawer } from '../cart/CartDrawer';
import { useSettings } from '../../hooks/useSettings';
import { useToastStore } from '../../store/toast.store';
import { StorefrontToast } from '../ui/Toast';
import { AnimatePresence } from 'framer-motion';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { isModuleEnabled } = useSettings();
  
  // Robust subscription to toast store
  const message = useToastStore((state) => state.message);
  const type = useToastStore((state) => state.type);
  const hideToast = useToastStore((state) => state.hideToast);
  
  const showRaffles = isModuleEnabled('raffle_enabled');

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900">
      <Header showRaffles={showRaffles} onOpenCart={() => setIsCartOpen(true)} />

      <main className="flex-1 pt-6 md:pt-20">
        {children}
      </main>

      <AnimatePresence>
        {message && (
          <StorefrontToast 
            key={message}
            message={message} 
            type={type} 
            onClose={hideToast} 
          />
        )}
      </AnimatePresence>

      <BottomNav showRaffles={showRaffles} onOpenCart={() => setIsCartOpen(true)} />

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      <Footer />
    </div>
  );
}
