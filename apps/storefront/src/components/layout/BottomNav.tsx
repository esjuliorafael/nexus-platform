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
  type LucideIcon,
} from "lucide-react";
import { useCartStore } from "../../store/cart.store";

interface BottomNavProps {
  showRaffles?: boolean;
  onOpenCart?: () => void;
}

export function BottomNav({ showRaffles = false, onOpenCart }: BottomNavProps) {
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
  ];

  return (
    <motion.div
      initial={false}
      animate={{
        x: "-50%",
        opacity: shouldShow ? 1 : 0,
        y: shouldShow ? 0 : 28,
        scale: shouldShow ? 1 : 0.98,
      }}
      transition={{ duration: 0.38, ease: [0.23, 1, 0.32, 1] }}
      className="fixed bottom-5 left-1/2 z-40 w-[92%] max-w-md md:hidden"
      style={{ pointerEvents: shouldShow ? "auto" : "none" }}
      aria-hidden={!shouldShow}
    >
      <nav
        className="grid items-center gap-1 border border-stone-800/90 bg-stone-950/94 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl"
        style={{
          gridTemplateColumns: `repeat(${navItems.length + 1}, minmax(0, 1fr))`,
          borderRadius: "var(--sf-radius-card-inner)",
        }}
      >
        {navItems.map((item) => (
          <BottomNavItem
            key={item.to}
            href={item.to}
            label={item.label}
            icon={item.icon}
            active={pathname === item.to}
          />
        ))}

        <button
          type="button"
          onClick={onOpenCart}
          className="group relative flex min-h-[4rem] flex-col items-center justify-center gap-1 rounded-[var(--sf-radius-nested)] px-1 text-stone-500 transition-colors duration-300 hover:text-stone-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25"
          style={{ transitionTimingFunction: "var(--sf-ease)" }}
        >
          <motion.span
            whileTap={{ scale: 0.92 }}
            className="relative flex h-9 w-9 items-center justify-center rounded-[var(--sf-radius-nested)]"
          >
            <ShoppingCart size={20} strokeWidth={2} />
            {mounted && totalItems > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-stone-950 bg-brand-500 px-1 text-[9px] font-black leading-none text-white shadow-md"
              >
                {totalItems}
              </motion.span>
            )}
          </motion.span>
          <span className="sf-text-label text-[10px] text-current">
            Carrito
          </span>
        </button>
      </nav>
    </motion.div>
  );
}

interface BottomNavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}

function BottomNavItem({
  href,
  label,
  icon: Icon,
  active,
}: BottomNavItemProps) {
  return (
    <Link
      href={href}
      className={`group relative flex min-h-[4rem] flex-col items-center justify-center gap-1 rounded-[var(--sf-radius-nested)] px-1 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25 ${
        active ? "text-white" : "text-stone-500 hover:text-stone-200"
      }`}
      style={{ transitionTimingFunction: "var(--sf-ease)" }}
    >
      <motion.span
        whileTap={{ scale: 0.92 }}
        className={`flex h-9 w-9 items-center justify-center rounded-[var(--sf-radius-nested)] transition-colors duration-300 ${
          active ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25" : ""
        }`}
      >
        <Icon size={20} strokeWidth={active ? 2.4 : 2} />
      </motion.span>
      <span
        className={`sf-text-label text-[10px] ${active ? "text-brand-300" : "text-current"}`}
      >
        {label}
      </span>
    </Link>
  );
}
