import React, { useState, useEffect, useRef, useContext } from 'react';
import { LogOut, Sun, Moon } from 'lucide-react';
import { apiSystem, ASSET_BASE_URL } from '../api';
import { useFavicon } from './useFavicon';
import { ThemeContext } from '../App';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  raffleEnabled?: boolean;
  hasBillingNotification?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeTab, 
  setActiveTab, 
  onLogout, 
  raffleEnabled = false,
  hasBillingNotification = false
}) => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [isScrolled, setIsScrolled] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTabElementRef = useRef<HTMLButtonElement>(null);
  
  useFavicon(logoUrl);

  const navItems = [
    'Inicio',
    'Galería',
    'Tienda',
    ...(raffleEnabled ? ['Rifas'] : []),
    'Sistema',
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const config = await apiSystem.getConfig();
        if (config['branding_logo_url']) {
          setLogoUrl(config['branding_logo_url']);
        }
      } catch (error) {
        console.error("Error cargando logo en el header:", error);
      }
    };
    
    loadLogo();

    const handleLogoUpdate = () => loadLogo();
    window.addEventListener('logoUpdated', handleLogoUpdate);
    
    return () => window.removeEventListener('logoUpdated', handleLogoUpdate);
  }, []);

  // Efecto Mágico de Clip-Path (Emil Kowalski)
  useEffect(() => {
    const updateClipPath = () => {
      const container = containerRef.current;
      const activeElement = activeTabElementRef.current;
      
      if (container && activeElement) {
        const containerRect = container.getBoundingClientRect();
        const activeRect = activeElement.getBoundingClientRect();

        const leftOffset = activeRect.left - containerRect.left;
        const rightOffset = containerRect.right - activeRect.right;

        const leftPercent = Math.max(0, (leftOffset / containerRect.width) * 100);
        const rightPercent = Math.max(0, (rightOffset / containerRect.width) * 100);

        // round 80px para asegurar forma de píldora perfecta
        container.style.clipPath = `inset(0 ${rightPercent.toFixed(4)}% 0 ${leftPercent.toFixed(4)}% round 80px)`;
      }
    };

    updateClipPath();
    window.addEventListener('resize', updateClipPath);
    return () => window.removeEventListener('resize', updateClipPath);
  }, [activeTab, navItems.length]);

  return (
    <div className={`sticky top-0 z-50 w-full px-4 transition-all duration-500 ${isScrolled ? 'pt-0' : 'pt-4'}`}>
      <header 
        className="max-w-7xl mx-auto w-full bg-bg-card/95 backdrop-blur-xl border border-border-main shadow-xl dark:shadow-none transition-all duration-500 rounded-full"
        style={{ transitionTimingFunction: 'var(--ease-emil)' }}
      >
        <div className="p-3 sm:p-4">
          <div className="flex items-center justify-between">
            
            <div className="flex-shrink-0 flex items-center">
              <div className="relative group">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-bg-card flex items-center justify-center overflow-hidden border-2 border-border-main shadow-inner transition-all duration-300 group-hover:scale-110 active:scale-95">
                  {logoUrl ? (
                    <img 
                      src={logoUrl} 
                      alt="Logo del Sistema" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span className="text-[10px] font-black text-text-muted tracking-[0.2em]">NEXUS</span>
                  )}
                </div>
              </div>
            </div>

            {/* NAVEGACIÓN CON EFECTO CLIP-PATH (EMIL KOWALSKI) */}
            <nav className="hidden md:flex items-center justify-center bg-bg-muted p-1.5 rounded-full mx-4 relative overflow-hidden">
              {/* Capa Base: Texto gris (Title Case) */}
              <ul className="flex items-center relative z-10">
                {navItems.map((item) => (
                  <li key={item} className="relative">
                    <button
                      ref={activeTab === item ? activeTabElementRef : null}
                      onClick={() => setActiveTab(item)}
                      className={`px-8 py-3 rounded-full text-[12px] font-black tracking-widest transition-colors duration-300 active:scale-95 ${
                        activeTab === item ? 'opacity-0' : 'text-text-muted hover:text-text-main'
                      }`}
                    >
                      {item}
                    </button>
                    {item === 'Sistema' && hasBillingNotification && activeTab !== 'Sistema' && (
                      <span className="absolute top-2 right-6 w-2.5 h-2.5 bg-brand-500 rounded-full border-2 border-bg-muted animate-pulse" />
                    )}
                  </li>
                ))}
              </ul>

              {/* Capa de Superposición (Overlay): Revelada mediante clip-path */}
              <div 
                aria-hidden 
                ref={containerRef}
                className="absolute inset-1.5 pointer-events-none transition-[clip-path] duration-500 z-20"
                style={{ transitionTimingFunction: 'var(--ease-emil)' }}
              >
                <ul className="flex items-center bg-bg-card h-full rounded-full">
                  {navItems.map((item) => (
                    <li key={item}>
                      <div className="px-8 py-3 text-[12px] font-black tracking-widest text-brand-500 whitespace-nowrap">
                        {item}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>

            <div className="flex items-center gap-3">
              <button 
                onClick={toggleTheme}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-bg-card text-text-main shadow-sm dark:shadow-none hover:bg-bg-muted transition-all border border-border-main group active:scale-90"
                style={{ transitionTimingFunction: 'var(--ease-emil)' }}
                title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
              >
                {theme === 'light' ? (
                  <Moon size={20} className="group-hover:-rotate-12 transition-transform duration-300" />
                ) : (
                  <Sun size={20} className="group-hover:rotate-45 transition-transform duration-300" />
                )}
              </button>

              <button 
                onClick={onLogout}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-bg-card text-text-main shadow-sm dark:shadow-none hover:bg-bg-muted hover:text-rose-500 transition-all border border-border-main group active:scale-90"
                style={{ transitionTimingFunction: 'var(--ease-emil)' }}
                title="Cerrar Sesión"
              >
                <LogOut size={20} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
};
