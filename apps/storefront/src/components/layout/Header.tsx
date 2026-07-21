"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useSettings } from "../../hooks/useSettings";
import { useFavicon } from "../../hooks/useFavicon";
import { useCartStore } from "../../store/cart.store";
import { Button } from "../ui/Button";
import { StorefrontBrandLogo } from "../ui/BrandLogo";

interface HeaderProps {
  showRaffles?: boolean;
  onOpenCart?: () => void;
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
  const activeNavRef = useRef<HTMLAnchorElement>(null);
  const navOverlayRef = useRef<HTMLDivElement>(null);
  const navBaseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const brandName = branding.brand_name || "Nexus Store";
  const navLinks = [
    { to: "/", label: "Inicio" },
    { to: "/store", label: "Tienda" },
    { to: "/gallery", label: "Galeria" },
    { to: "/contact", label: "Contacto" },
    ...(showRaffles ? [{ to: "/raffles", label: "Rifas" }] : []),
  ];

  useEffect(() => {
    const updateClipPath = () => {
      const base = navBaseRef.current;
      const overlay = navOverlayRef.current;
      const active = activeNavRef.current;

      if (!base || !overlay || !active) return;

      const baseRect = base.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      const leftOffset = activeRect.left - baseRect.left;
      const rightOffset = baseRect.right - activeRect.right;

      const leftPercent = Math.max(0, (leftOffset / baseRect.width) * 100);
      const rightPercent = Math.max(0, (rightOffset / baseRect.width) * 100);

      overlay.style.clipPath = `inset(0 ${rightPercent.toFixed(4)}% 0 ${leftPercent.toFixed(4)}% round 999px)`;
    };

    updateClipPath();
    const raf = window.requestAnimationFrame(updateClipPath);
    window.addEventListener("resize", updateClipPath);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateClipPath);
    };
  }, [pathname, showRaffles]);

  return (
    <>
      {pathname === "/" && (
        <header
          className="pointer-events-none fixed left-0 right-0 top-0 z-50 md:hidden"
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

      <div className="fixed bottom-6 left-1/2 z-50 hidden w-[calc(100%-3rem)] max-w-2xl -translate-x-1/2 md:block">
        <nav
          className="relative overflow-hidden border border-white/[0.15] bg-stone-950/[0.72] shadow-[0_22px_80px_rgba(12,10,9,0.34)] backdrop-blur-2xl"
          aria-label="Navegacion principal"
          style={{
            borderRadius: "var(--sf-radius-card-inner)",
            padding: "var(--sf-space-sm)",
          }}
        >
          <div
            ref={navBaseRef}
            className="relative flex items-center justify-center"
          >
            <ul className="relative z-10 flex w-full items-center justify-center">
              {navLinks.map((link) => {
                const isActive =
                  link.to === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.to);

                return (
                  <li key={link.to} className="relative flex-1">
                    <Link
                      ref={isActive ? activeNavRef : null}
                      href={link.to}
                      className={`sf-text-button-card flex h-[var(--sf-h-button-card)] items-center justify-center px-[var(--sf-padding-button-card-inline)] transition-colors duration-300 active:scale-95 ${
                        isActive
                          ? "text-transparent"
                          : "text-white/[0.58] hover:text-white"
                      }`}
                      style={{
                        borderRadius: "var(--sf-radius-card-nested)",
                        transitionTimingFunction: "var(--sf-ease)",
                      }}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div
              ref={navOverlayRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 z-20 transition-[clip-path] duration-500"
              style={{ transitionTimingFunction: "var(--sf-ease)" }}
            >
              <ul
                className="flex h-full w-full items-center justify-center bg-stone-50 shadow-inner shadow-white/50"
                style={{ borderRadius: "var(--sf-radius-card-nested)" }}
              >
                {navLinks.map((link) => (
                  <li key={link.to} className="flex-1">
                    <div
                      className="sf-text-button-card flex h-[var(--sf-h-button-card)] items-center justify-center whitespace-nowrap px-[var(--sf-padding-button-card-inline)] text-brand-600"
                      style={{ borderRadius: "var(--sf-radius-card-nested)" }}
                    >
                      {link.label}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
