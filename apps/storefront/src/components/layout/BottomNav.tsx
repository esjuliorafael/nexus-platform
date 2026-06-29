"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  Image as ImageIcon,
  ShoppingBag,
  ShoppingCart,
  Ticket,
  Headphones,
  type LucideIcon,
} from "lucide-react";
import { useCartStore } from "../../store/cart.store";

interface BottomNavProps {
  showRaffles?: boolean;
  onOpenCart?: () => void;
  isCartOpen?: boolean;
}

export function BottomNav({
  showRaffles = false,
  onOpenCart,
  isCartOpen = false,
}: BottomNavProps) {
  const pathname = usePathname();
  const totalItems = useCartStore((state) =>
    state.items.reduce((acc, item) => acc + item.quantity, 0),
  );
  const [mounted, setMounted] = useState(false);
  const [isPastHomeTop, setIsPastHomeTop] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (pathname !== "/") {
      setIsPastHomeTop(true);
      return;
    }

    const handleScroll = () => {
      setIsPastHomeTop(window.scrollY > 12);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  const shouldShow = pathname === "/" ? isPastHomeTop : true;

  const navItems = [
    { to: "/", label: "Inicio", icon: Home },
    { to: "/store", label: "Tienda", icon: ShoppingBag },
    { to: "/gallery", label: "Galeria", icon: ImageIcon },
    ...(showRaffles ? [{ to: "/raffles", label: "Rifas", icon: Ticket }] : []),
    { to: "/contact", label: "Contacto", icon: Headphones },
  ];
  const isActiveRoute = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <motion.div
      initial={false}
      animate={{
        opacity: shouldShow ? 1 : 0,
        y: shouldShow ? 0 : 28,
        scale: shouldShow ? 1 : 0.98,
      }}
      transition={{ duration: 0.38, ease: [0.23, 1, 0.32, 1] }}
      className="fixed inset-x-0 z-40 flex justify-center md:hidden"
      style={{
        bottom: "var(--sf-inset-mobile-chrome-block)",
        pointerEvents: shouldShow ? "auto" : "none",
      }}
      aria-hidden={!shouldShow}
    >
      <div
        className="flex min-w-0 items-center justify-center"
        style={{
          maxWidth: showRaffles
            ? "calc(100vw - (var(--sf-space-base) * 2))"
            : "calc(100vw - (var(--sf-inset-mobile-chrome) * 2))",
        }}
      >
        <nav
          className="flex min-w-0 items-center justify-center border border-stone-200/90 bg-white shadow-[0_18px_48px_rgba(87,68,55,0.14)]"
          style={{
            height: "var(--sf-h-mobile-nav)",
            borderRadius: "var(--sf-radius-outer)",
            gap: "var(--sf-space-xs)",
            padding: "var(--sf-space-sm)",
          }}
        >
          {navItems.map((item) => (
            <BottomNavItem
              key={item.to}
              href={item.to}
              label={item.label}
              icon={item.icon}
              active={!isCartOpen && isActiveRoute(item.to)}
              compact={showRaffles}
            />
          ))}
        </nav>

        <div
          className="flex shrink-0 items-center justify-center border border-stone-200/90 bg-white shadow-[0_18px_48px_rgba(87,68,55,0.14)]"
          style={{
            height: "var(--sf-h-mobile-nav)",
            borderRadius: "var(--sf-radius-outer)",
            marginLeft: "var(--sf-space-sm)",
            padding: "var(--sf-space-sm)",
          }}
        >
          <button
            type="button"
            onClick={onOpenCart}
            className={`group relative flex shrink-0 items-center justify-center border transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25 ${
              isCartOpen
                ? "border-brand-100 bg-brand-50 text-brand-800 shadow-sm"
                : "border-transparent text-stone-500 hover:bg-stone-100 hover:text-stone-950"
            }`}
            style={{
              width: "var(--sf-size-mobile-nav-item)",
              height: "var(--sf-size-mobile-nav-item)",
              borderRadius: "var(--sf-radius-mobile-nav-item)",
              transitionTimingFunction: "var(--sf-ease)",
            }}
            aria-label="Carrito"
            aria-pressed={isCartOpen}
          >
            <motion.span
              whileTap={{ scale: 0.92 }}
              data-cart-icon
              className="flex shrink-0 items-center justify-center"
            >
              <ShoppingCart
                style={{ width: "var(--sf-size-mobile-nav-icon)", height: "var(--sf-size-mobile-nav-icon)" }}
                strokeWidth={isCartOpen ? 2.35 : 2.3}
              />
            </motion.span>
            {mounted && totalItems > 0 && (
              <motion.span
                data-cart-count
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-[0.125rem] -top-[0.125rem] flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full border-2 border-white bg-brand-500 px-1 text-[8px] font-black leading-none text-white shadow-md"
              >
                {totalItems}
              </motion.span>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface BottomNavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  compact?: boolean;
}

function BottomNavItem({
  href,
  label,
  icon: Icon,
  active,
  compact = false,
}: BottomNavItemProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`group relative flex min-w-0 items-center justify-center overflow-hidden border transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25 ${
        active
          ? "shrink-0 border-brand-100 bg-brand-50 text-brand-800 shadow-sm"
          : "shrink-0 border-transparent px-0 text-stone-500 hover:bg-stone-100 hover:text-stone-950"
      }`}
      style={{
        width: active ? undefined : "var(--sf-size-mobile-nav-item)",
        height: "var(--sf-size-mobile-nav-item)",
        gap: active ? "var(--sf-space-sm)" : undefined,
        paddingInline: active
          ? compact
            ? "var(--sf-space-base)"
            : "var(--sf-padding-mobile-nav-active-inline)"
          : undefined,
        borderRadius: "var(--sf-radius-mobile-nav-item)",
        transitionTimingFunction: "var(--sf-ease)",
      }}
    >
      <motion.span
        whileTap={{ scale: 0.92 }}
        className="flex shrink-0 items-center justify-center"
      >
        <Icon
          style={{ width: "var(--sf-size-mobile-nav-icon)", height: "var(--sf-size-mobile-nav-icon)" }}
          strokeWidth={active ? 2.35 : 2.3}
        />
      </motion.span>
      {active && (
        <span className="sf-text-caption min-w-0 truncate text-current">
          {label}
        </span>
      )}
    </Link>
  );
}
