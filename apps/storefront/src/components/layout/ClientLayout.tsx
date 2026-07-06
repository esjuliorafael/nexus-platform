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
import { StorefrontUnavailableView } from "./StorefrontUnavailableView";
import { AnimatePresence } from "framer-motion";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const {
    getBranding,
    getStorefrontAvailability,
    isModuleEnabled,
    loading: settingsLoading,
  } = useSettings();
  const isCartOpen = useCartUiStore((state) => state.isCartOpen);
  const openCart = useCartUiStore((state) => state.openCart);
  const closeCart = useCartUiStore((state) => state.closeCart);

  // Robust subscription to toast store
  const title = useToastStore((state) => state.title);
  const message = useToastStore((state) => state.message);
  const type = useToastStore((state) => state.type);
  const action = useToastStore((state) => state.action);
  const durationMs = useToastStore((state) => state.durationMs);
  const hideToast = useToastStore((state) => state.hideToast);

  const showRaffles = isModuleEnabled("raffle_enabled");
  const isProductDetailRoute = pathname.startsWith("/store/");
  const isCheckoutRoute = pathname === "/checkout";
  const branding = getBranding();
  const availability = getStorefrontAvailability();

  if (settingsLoading) {
    return <div className="min-h-screen bg-[var(--sf-bg-app)]" />;
  }

  if (availability.isUnavailable) {
    return (
      <StorefrontUnavailableView
        status={availability.status as "MAINTENANCE" | "COMING_SOON"}
        title={availability.title}
        description={availability.description}
        showLogo={availability.showLogo}
        logoUrl={branding.logo_url}
        brandName={branding.brand_name}
        eyebrow={availability.eyebrow}
        mediaUrl={availability.mediaUrl}
        posterUrl={availability.posterUrl}
        mediaType={availability.mediaType}
        desktopObjectPosition={availability.desktopObjectPosition}
        mobileObjectPosition={availability.mobileObjectPosition}
        primaryText={availability.primaryText}
        primaryHref={availability.primaryHref}
        secondaryText={availability.secondaryText}
        secondaryHref={availability.secondaryHref}
      />
    );
  }

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
            title={title}
            message={message}
            type={type}
            action={action}
            durationMs={durationMs}
            onClose={hideToast}
          />
        )}
      </AnimatePresence>

      {!isProductDetailRoute && !isCheckoutRoute && !settingsLoading && (
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
