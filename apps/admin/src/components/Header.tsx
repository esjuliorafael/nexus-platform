import React, { useContext, useEffect, useRef, useState } from "react";
import { LogOut, Moon, Sun, UserRound } from "lucide-react";
import { apiSystem } from "../api";
import { ThemeContext } from "../App";
import { useFavicon } from "./useFavicon";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  raffleEnabled?: boolean;
  hasBillingNotification?: boolean;
  newOrdersCount?: number;
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onLogout,
  raffleEnabled = false,
  hasBillingNotification = false,
  newOrdersCount = 0,
  onOpenProfile,
}) => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [isScrolled, setIsScrolled] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeTabElementRef = useRef<HTMLButtonElement>(null);

  useFavicon(logoUrl);

  const navItems = [
    "Inicio",
    "Medios",
    "Tienda",
    "Órdenes",
    ...(raffleEnabled ? ["Rifas"] : []),
    "Sistema",
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const config = await apiSystem.getConfig();
        if (config["branding_logo_url"]) {
          setLogoUrl(config["branding_logo_url"]);
        }
      } catch (error) {
        console.error("Error cargando logo en el header:", error);
      }
    };

    loadLogo();

    const handleLogoUpdate = () => loadLogo();
    window.addEventListener("logoUpdated", handleLogoUpdate);

    return () => window.removeEventListener("logoUpdated", handleLogoUpdate);
  }, []);

  useEffect(() => {
    const updateClipPath = () => {
      const container = containerRef.current;
      const activeElement = activeTabElementRef.current;

      if (container && activeElement) {
        const containerRect = container.getBoundingClientRect();
        const activeRect = activeElement.getBoundingClientRect();

        const leftOffset = activeRect.left - containerRect.left;
        const rightOffset = containerRect.right - activeRect.right;

        const leftPercent = Math.max(
          0,
          (leftOffset / containerRect.width) * 100,
        );
        const rightPercent = Math.max(
          0,
          (rightOffset / containerRect.width) * 100,
        );

        container.style.clipPath = `inset(0 ${rightPercent.toFixed(4)}% 0 ${leftPercent.toFixed(4)}% round 80px)`;
      }
    };

    updateClipPath();
    window.addEventListener("resize", updateClipPath);
    return () => window.removeEventListener("resize", updateClipPath);
  }, [activeTab, navItems.length]);

  return (
    <div
      className="sticky top-0 z-50 w-full transition-all duration-500"
      style={{
        paddingInlineStart: "max(var(--space-md), env(safe-area-inset-left))",
        paddingInlineEnd: "max(var(--space-md), env(safe-area-inset-right))",
        paddingTop: isScrolled
          ? "env(safe-area-inset-top)"
          : "calc(var(--space-md) + env(safe-area-inset-top))",
        transitionTimingFunction: "var(--ease-emil)",
      }}
    >
      <header
        className="mx-auto w-full max-w-7xl rounded-full border border-border-main bg-bg-card/95 shadow-xl backdrop-blur-xl transition-all duration-500 dark:shadow-none"
        style={{ transitionTimingFunction: "var(--ease-emil)" }}
      >
        <div style={{ padding: "var(--space-md)" }}>
          <div className="flex items-center justify-between">
            <div className="flex flex-shrink-0 items-center">
              <div className="group relative">
                <div
                  className="flex items-center justify-center overflow-hidden rounded-full border border-border-main bg-bg-card shadow-inner transition-all duration-300 group-hover:scale-110 active:scale-95"
                  style={{
                    width: "var(--size-button-section)",
                    height: "var(--size-button-section)",
                  }}
                >
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo del Sistema"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-label text-text-muted">NEXUS</span>
                  )}
                </div>
              </div>
            </div>

            <nav
              className="relative mx-4 hidden items-center justify-center overflow-hidden rounded-full bg-bg-muted md:flex"
              style={{ padding: "var(--space-xs)" }}
            >
              <ul className="relative z-10 flex items-center">
                {navItems.map((item) => (
                  <li key={item} className="relative">
                    <button
                      ref={activeTab === item ? activeTabElementRef : null}
                      onClick={() => setActiveTab(item)}
                      className={`flex items-center justify-center rounded-full px-8 text-button-card transition-colors duration-300 active:scale-95 ${
                        activeTab === item
                          ? "opacity-0"
                          : "text-text-muted hover:text-text-main"
                      }`}
                      style={{ height: "var(--h-button-card)" }}
                    >
                      {item}
                    </button>
                    {item === "Sistema" &&
                      hasBillingNotification &&
                      activeTab !== "Sistema" && (
                        <span className="absolute right-6 top-2 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-bg-muted bg-brand-500" />
                      )}
                    {item === "Órdenes" &&
                      newOrdersCount > 0 &&
                      activeTab !== "Órdenes" && (
                        <span className="absolute right-5 top-1 flex h-5 min-w-5 animate-pulse items-center justify-center rounded-full border-2 border-bg-muted bg-rose-500 px-1 text-[9px] font-black text-white">
                          {newOrdersCount > 9 ? "9+" : newOrdersCount}
                        </span>
                      )}
                  </li>
                ))}
              </ul>

              <div
                aria-hidden
                ref={containerRef}
                className="pointer-events-none absolute z-20 transition-[clip-path] duration-500"
                style={{
                  inset: "var(--space-xs)",
                  transitionTimingFunction: "var(--ease-emil)",
                }}
              >
                <ul className="flex h-full items-center rounded-full bg-bg-card">
                  {navItems.map((item) => (
                    <li key={item}>
                      <div
                        className="flex items-center justify-center whitespace-nowrap px-8 text-button-card text-brand-500"
                        style={{ height: "var(--h-button-card)" }}
                      >
                        {item}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>

            <div
              className="flex items-center"
              style={{ gap: "var(--space-sm)" }}
            >
              <button
                onClick={onOpenProfile}
                className={`group flex items-center justify-center rounded-full border shadow-sm transition-all active:scale-90 dark:shadow-none ${
                  activeTab === "Mi Perfil"
                    ? "border-brand-200 bg-brand-50 text-brand-600"
                    : "border-border-main bg-bg-card text-text-main hover:bg-bg-muted"
                }`}
                style={{
                  width: "var(--size-button-section)",
                  height: "var(--size-button-section)",
                  transitionTimingFunction: "var(--ease-emil)",
                }}
                title="Mi perfil"
                aria-label="Abrir mi perfil"
              >
                <UserRound size={20} />
              </button>
              <button
                onClick={toggleTheme}
                className="group flex items-center justify-center rounded-full border border-border-main bg-bg-card text-text-main shadow-sm transition-all hover:bg-bg-muted active:scale-90 dark:shadow-none"
                style={{
                  width: "var(--size-button-section)",
                  height: "var(--size-button-section)",
                  transitionTimingFunction: "var(--ease-emil)",
                }}
                title={theme === "light" ? "Modo Oscuro" : "Modo Claro"}
              >
                {theme === "light" ? (
                  <Moon
                    size={20}
                    className="transition-transform duration-300 group-hover:-rotate-12"
                  />
                ) : (
                  <Sun
                    size={20}
                    className="transition-transform duration-300 group-hover:rotate-45"
                  />
                )}
              </button>

              <button
                onClick={onLogout}
                className="group flex items-center justify-center rounded-full border border-border-main bg-bg-card text-text-main shadow-sm transition-all hover:bg-bg-muted hover:text-rose-500 active:scale-90 dark:shadow-none"
                style={{
                  width: "var(--size-button-section)",
                  height: "var(--size-button-section)",
                  transitionTimingFunction: "var(--ease-emil)",
                }}
                title="Cerrar Sesión"
              >
                <LogOut
                  size={20}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </button>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
};
