"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { Footer } from "./Footer";
import { CartDrawer } from "../cart/CartDrawer";
import { useSettings } from "../../hooks/useSettings";
import { useCartUiStore } from "../../store/cart-ui.store";
import { useToastStore } from "../../store/toast.store";
import { StorefrontToast } from "../ui/Toast";
import { AnimatePresence } from "framer-motion";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const { isModuleEnabled } = useSettings();
  const isCartOpen = useCartUiStore((state) => state.isCartOpen);
  const openCart = useCartUiStore((state) => state.openCart);
  const closeCart = useCartUiStore((state) => state.closeCart);

  // Robust subscription to toast store
  const message = useToastStore((state) => state.message);
  const type = useToastStore((state) => state.type);
  const hideToast = useToastStore((state) => state.hideToast);

  const showRaffles = isModuleEnabled("raffle_enabled");
  const isProductDetailRoute = pathname.startsWith("/store/");

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900">
      <Header
        showRaffles={showRaffles}
        onOpenCart={openCart}
      />

      <main className={`flex-1 ${pathname === "/" ? "pt-0" : "pt-6 md:pt-24"}`}>
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

      {!isProductDetailRoute && (
        <BottomNav
          showRaffles={showRaffles}
          onOpenCart={openCart}
          isCartOpen={isCartOpen}
        />
      )}

      <CartDrawer isOpen={isCartOpen} onClose={closeCart} />

      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
