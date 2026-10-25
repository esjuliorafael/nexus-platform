"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Headphones,
  Home,
  Image as ImageIcon,
  ShoppingBag,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import { useSettings } from "../../hooks/useSettings";
import { useFavicon } from "../../hooks/useFavicon";
import { useCartStore } from "../../store/cart.store";
import { Button } from "../ui/Button";
import { StorefrontBrandLogo } from "../ui/BrandLogo";

interface HeaderProps {
  showRaffles?: boolean;
  onOpenCart?: () => void;
}

interface DesktopNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export function Header({ showRaffles = false, onOpenCart }: HeaderProps) {
  const pathname = usePathname();
  const { getBranding } = useSettings();
  const branding = getBranding();
  useFavicon(branding.logo_url);
  const totalItems = useCartStore((state) =>
    state.items.reduce((acc, item) => acc + item.quantity, 0),
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const brandName = branding.brand_name || "Nexus Store";
  const navLinks: DesktopNavItem[] = [
    { to: "/", label: "Inicio", icon: Home },
    { to: "/store", label: "Tienda", icon: ShoppingBag },
    { to: "/gallery", label: "Galería", icon: ImageIcon },
    ...(showRaffles
      ? [{ to: "/raffles", label: "Rifas", icon: Ticket }]
      : []),
    { to: "/contact", label: "Contacto", icon: Headphones },
  ];

  return (
    <>
      {pathname === "/" && (
        <header
          className="pointer-events-none absolute left-0 right-0 top-0 z-50 md:hidden"
          style={{
            paddingTop:
              "calc(var(--sf-inset-mobile-chrome-block) + env(safe-area-inset-top, 0px))",
            paddingInline: "var(--sf-inset-mobile-chrome)",
          }}
        >
          <StorefrontBrandLogo
            src={branding.logo_url}
            alt={brandName}
            size="mobile"
            className="pointer-events-auto transition-transform duration-300 active:scale-95"
          />
        </header>
      )}

      <header className="pointer-events-none fixed left-0 right-0 top-0 z-50 hidden md:block">
        <div className="mx-auto flex max-w-[1440px] items-start justify-between px-[var(--sf-padding-outer)] pt-[var(--sf-space-md)]">
          <StorefrontBrandLogo
            src={branding.logo_url}
            alt={brandName}
            size="desktop"
            className="pointer-events-auto group flex min-h-[4.25rem] min-w-[4.25rem] transition-transform duration-300 hover:scale-[1.03] active:scale-95"
          />

          <Button
            type="button"
            onClick={onOpenCart}
            aria-label="Abrir carrito"
            variant="ghost"
            context="autonomous"
            size="icon"
            icon={ShoppingBag}
            className="pointer-events-auto relative ml-auto border-white/[0.18] bg-stone-950/[0.45] text-white shadow-[0_18px_45px_rgba(12,10,9,0.28)] backdrop-blur-xl hover:-translate-y-0.5 hover:border-white/25 hover:bg-stone-950/[0.65] hover:text-white"
            floatingContent={mounted && totalItems > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-stone-950 bg-brand-500 px-1.5 text-[10px] font-black leading-none text-white shadow-lg shadow-stone-950/20">
                {totalItems}
              </span>
            ) : null}
          />
        </div>
      </header>

      <div
        className="fixed left-1/2 z-50 hidden max-w-[calc(100vw-var(--sf-space-xl))] -translate-x-1/2 md:block"
        style={{ bottom: "var(--sf-inset-mobile-chrome-block)" }}
      >
        <nav
          className="flex w-fit min-w-0 items-center justify-center border border-stone-200/90 bg-white shadow-[0_18px_48px_rgba(87,68,55,0.14)]"
          aria-label="Navegación principal"
          style={{
            height: "var(--sf-h-mobile-nav)",
            borderRadius: "var(--sf-radius-outer)",
            gap: "var(--sf-gap-mobile-nav-actions)",
            padding: "var(--sf-space-sm)",
          }}
        >
          {navLinks.map((link) => {
            const isActive =
              link.to === "/"
                ? pathname === "/"
                : pathname === link.to || pathname.startsWith(`${link.to}/`);
            const Icon = link.icon;

            return (
              <Link
                key={link.to}
                href={link.to}
                aria-label={link.label}
                title={link.label}
                className={`group relative flex min-w-0 items-center justify-center overflow-hidden transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25 ${
                  isActive
                    ? "shrink-0 border border-brand-100 bg-brand-50 text-brand-800 shadow-sm"
                    : "shrink-0 border-0 bg-transparent text-stone-500 hover:bg-stone-100 hover:text-stone-950"
                }`}
                style={{
                  height: "var(--sf-size-mobile-nav-item)",
                  gap: "var(--sf-space-sm)",
                  paddingInline: "var(--sf-padding-mobile-nav-active-inline)",
                  borderRadius: "var(--sf-radius-mobile-nav-item)",
                  transitionTimingFunction: "var(--sf-ease)",
                }}
              >
                <motion.span
                  whileTap={{ scale: 0.92 }}
                  className="flex shrink-0 items-center justify-center"
                >
                  <Icon
                    style={{
                      width: "var(--sf-size-mobile-nav-icon)",
                      height: "var(--sf-size-mobile-nav-icon)",
                    }}
                    strokeWidth={isActive ? 2.35 : 2.3}
                  />
                </motion.span>
                <span className="sf-text-secondary min-w-0 whitespace-nowrap text-current">
                  {link.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
