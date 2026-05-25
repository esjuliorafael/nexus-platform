"use client";

import { useState } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { Footer } from './Footer';
import { CartDrawer } from '../cart/CartDrawer';
import { useSettings } from '../../hooks/useSettings';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { isModuleEnabled } = useSettings();
  
  const showRaffles = isModuleEnabled('raffle_enabled');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Desktop Header */}
      <Header showRaffles={showRaffles} onOpenCart={() => setIsCartOpen(true)} />

      {/* Main Content: pt-0 on mobile because header is hidden, md:pt-20 on desktop */}
      <main className="flex-1 pt-6 md:pt-20">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav showRaffles={showRaffles} onOpenCart={() => setIsCartOpen(true)} />

      {/* Universal Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* Footer */}
      <Footer />
    </div>
  );
}
