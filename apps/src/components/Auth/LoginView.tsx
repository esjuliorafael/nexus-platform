import React, { useState, useEffect, useRef } from 'react';
import { Lock, User, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { apiAuth, apiSystem, apiGallery, ASSET_BASE_URL } from '../../api';

interface LoginViewProps {
  onLoginSuccess: (userData: any) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

/* ... ESTILOS, FALLBACKS Y CardIcon INTACTOS ... */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,700;1,500&family=Inter:wght@300;400;500;600&display=swap');

  .login-playfair { font-family: 'Lora', Georgia, serif; }
  .login-inter    { font-family: 'Inter', system-ui, sans-serif; }

  @keyframes panel-slide-in {
    from { opacity: 0; transform: translateX(40px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes gallery-fade-up {
    from { opacity: 0; transform: translateY(32px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)  scale(1); }
  }
  @keyframes float-slow {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33%       { transform: translateY(-8px) rotate(0.3deg); }
    66%       { transform: translateY(-4px) rotate(-0.2deg); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes grain-drift {
    0%, 100% { transform: translate(0,0); }
    20%       { transform: translate(-1px, 1px); }
    40%       { transform: translate(1px, -1px); }
    60%       { transform: translate(-1px, -1px); }
    80%       { transform: translate(1px, 1px); }
  }
  @keyframes logo-pop {
    0%   { opacity: 0; transform: scale(0.6) rotate(-6deg); }
    60%  { opacity: 1; transform: scale(1.05) rotate(1deg); }
    80%  { transform: scale(0.98) rotate(-0.5deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes tag-slide {
    from { opacity: 0; transform: translateX(-12px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes btn-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(180,126,116,0); }
    50%       { box-shadow: 0 0 0 8px rgba(180,126,116,0.15); }
  }
  @keyframes divider-x {
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
  }

  .anim-panel       { animation: panel-slide-in   0.7s cubic-bezier(0.16,1,0.3,1) both; }
  .anim-logo        { animation: logo-pop         0.9s cubic-bezier(0.34,1.56,0.64,1) both 0.15s; }
  .anim-tag         { animation: tag-slide        0.5s cubic-bezier(0.16,1,0.3,1) both; }
  .anim-divider     { animation: divider-x        0.6s cubic-bezier(0.16,1,0.3,1) both; }
  .anim-float       { animation: float-slow       6s ease-in-out infinite; }
  .anim-float-delay { animation: float-slow       6s ease-in-out infinite 1.5s; }

  .gallery-card {
    animation: gallery-fade-up 0.7s cubic-bezier(0.16,1,0.3,1) both;
    border-radius: 1.5rem;
    overflow: hidden;
    position: relative;
    background-size: cover;
    background-position: center;
  }
  .gallery-card::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 30%, rgba(12,8,7,0.85) 100%);
    border-radius: inherit;
  }
  .gallery-card:hover { transform: scale(1.02) translateY(-2px); transition: transform 0.4s ease; }

  .shimmer-btn {
    background: linear-gradient(90deg, #9d635a 0%, #b47e74 40%, #c59d95 50%, #b47e74 60%, #9d635a 100%);
    background-size: 200% auto;
    animation: shimmer 2.5s linear infinite;
  }
  .shimmer-btn:disabled {
    background: rgba(255,255,255,0.08);
    animation: none;
  }

  .grain-overlay {
    position: absolute; inset: 0; pointer-events: none; opacity: 0.04;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-repeat: repeat; background-size: 200px;
    animation: grain-drift 0.4s steps(1) infinite;
  }

  .input-dark {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    color: #f0ebe9;
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
    outline: none;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .input-dark::placeholder { color: rgba(255,255,255,0.25); }
  .input-dark:focus {
    background: rgba(255,255,255,0.09);
    border-color: rgba(180,126,116,0.55);
    box-shadow: 0 0 0 3px rgba(180,126,116,0.1);
  }
  .input-dark:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const FALLBACK_CARDS = [
  { bg: 'linear-gradient(135deg, #2d1810 0%, #5c3222 50%, #8b4e32 100%)', label: 'Aves de Combate', sublabel: 'Criadero' },
  { bg: 'linear-gradient(135deg, #1a2a1a 0%, #2d4a20 50%, #4a6e30 100%)', label: 'Instalaciones', sublabel: 'Sector Norte' },
  { bg: 'linear-gradient(135deg, #3d2a10 0%, #7a5020 50%, #c08040 100%)', label: 'Temporada 2024', sublabel: 'Galería' },
  { bg: 'linear-gradient(135deg, #1a1a2a 0%, #2a2a4a 50%, #3a3a6a 100%)', label: 'Nocturnos', sublabel: 'Especial' },
  { bg: 'linear-gradient(135deg, #2a1a10 0%, #5a3a20 50%, #8a6040 100%)', label: 'Cría y Crianza', sublabel: 'Generación' },
  { bg: 'linear-gradient(135deg, #1a2820 0%, #2a4230 50%, #3a5a40 100%)', label: 'Campos Verdes', sublabel: 'Panorámica' },
];

const CardIcon: React.FC<{ idx: number }> = ({ idx }) => {
  const icons = ['🐓', '🌾', '🌅', '🌙', '🥚', '🌿'];
  return (
    <span style={{ fontSize: 28, lineHeight: 1, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}>
      {icons[idx % icons.length]}
    </span>
  );
};

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, showToast }) => {
  const [logoUrl, setLogoUrl]     = useState<string | null>(null);
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase]         = useState(0); 
  const [dynamicCards, setDynamicCards] = useState<any[]>([]);

  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = STYLES;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  useEffect(() => {
    const loadSystemData = async () => {
      try {
        const cfg = await apiSystem.getConfig();
        if (cfg['sistema_logo']) {
          setLogoUrl(`${ASSET_BASE_URL}${cfg['sistema_logo']}?t=${Date.now()}`);
        }

        const media = await apiGallery.getAll();
        const imagesOnly = media.filter(m => m.type === 'image');
        
        if (imagesOnly.length > 0) {
          const shuffled = imagesOnly.sort(() => 0.5 - Math.random());
          const selected = shuffled.slice(0, 6);
          
          const mappedCards = selected.map((img) => ({
            bg: `url('${img.url}')`, 
            label: img.category || 'Galería',
            sublabel: img.title || 'Archivo',
            isImage: true
          }));
          
          setDynamicCards(mappedCards);
        }

      } catch (err) {
        console.error("Error loading system data for login", err);
      }
    };
    
    loadSystemData();
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100);
    const t2 = setTimeout(() => setPhase(2), 400);
    const t3 = setTimeout(() => setPhase(3), 700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const canSubmit = username.trim() && password.trim() && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsLoading(true);
    try {
      // 2. RECIBIMOS EL OBJETO userData DESDE LA API
      const userData = await apiAuth.login({ username: username.trim(), password });
      showToast('Autenticación exitosa', 'success');
      onLoginSuccess(userData);
    } catch (err: any) {
      showToast(err.message || 'No se pudo conectar con el servidor.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const displayCards = Array.from({ length: 6 }).map((_, i) => {
    return dynamicCards[i] || FALLBACK_CARDS[i];
  });

  return (
    <div
      className="login-inter"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'row',
        background: '#0c0807',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flex: '1 1 60%',
          position: 'relative',
          display: 'none', 
          flexDirection: 'column',
          padding: '3rem',
          background: 'linear-gradient(155deg, #140c0a 0%, #0c0807 60%, #161008 100%)',
          overflow: 'hidden',
        }}
        className="gallery-panel"
      >
        <div className="grain-overlay" />

        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 50% at 30% 70%, rgba(180,126,116,0.12) 0%, transparent 70%)',
        }} />

        <div style={{
          position: 'relative', zIndex: 2,
          opacity: phase >= 1 ? 1 : 0,
          transition: 'opacity 0.6s ease',
          marginBottom: '2.5rem',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.5rem 1rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '999px',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#b47e74' }} />
            <span style={{
              fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.2em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)',
            }}>
              Rancho Las Trojes · Galería
            </span>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(2, 1fr)',
            gap: '1rem',
            position: 'relative', zIndex: 2,
          }}
        >
          {displayCards.map((card, i) => {
            const delay = [0, 80, 160, 60, 140, 220][i]; 
            return (
              <div
                key={i}
                className="gallery-card anim-float"
                style={{
                  background: card.bg,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  animationDelay: `${delay}ms, ${i * 0.7}s`,
                  animationName: 'gallery-fade-up, float-slow',
                  animationDuration: '0.7s, 6s',
                  animationFillMode: 'both, none',
                  animationTimingFunction: 'cubic-bezier(0.16,1,0.3,1), ease-in-out',
                  animationIterationCount: '1, infinite',
                  opacity: phase >= 2 ? 1 : 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  padding: '1.25rem',
                  minHeight: 0,
                  cursor: 'default',
                }}
              >
                {!card.isImage && (
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -60%)',
                    opacity: 0.35,
                  }}>
                    <CardIcon idx={i} />
                  </div>
                )}

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <p style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 600, fontSize: '0.75rem', lineHeight: 1.3, margin: 0 }} className="truncate">
                    {card.label}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.6rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0.2rem 0 0' }} className="truncate">
                    {card.sublabel}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{
          position: 'relative', zIndex: 2,
          marginTop: '2rem',
          opacity: phase >= 3 ? 1 : 0,
          transition: 'opacity 0.8s ease 0.3s',
        }}>
          <h2
            className="login-playfair"
            style={{
              fontSize: 'clamp(1.4rem, 2.2vw, 2rem)',
              fontWeight: 500,
              lineHeight: 1.25,
              color: 'rgba(255,255,255,0.85)',
              margin: '0 0 0.5rem',
              maxWidth: '28ch',
            }}
          >
            Cada imagen, <em>una historia</em><br />del rancho.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', fontWeight: 400, lineHeight: 1.6, maxWidth: '38ch' }}>
            Gestiona tu galería, inventario y ventas desde un solo panel diseñado para el campo.
          </p>
        </div>
      </div>

      <div
        className="anim-panel form-panel"
        style={{
          flex: '0 0 min(420px, 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 'clamp(2rem, 5vw, 3.5rem) clamp(1.5rem, 5vw, 3rem)',
          position: 'relative',
          background: 'linear-gradient(180deg, #1a0f0e 0%, #120b0a 100%)',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          minHeight: '100vh',
          zIndex: 1,
        }}
      >
        <div className="grain-overlay" style={{ opacity: 0.03 }} />

        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '40%', pointerEvents: 'none',
          background: 'radial-gradient(ellipse 80% 40% at 50% -10%, rgba(180,126,116,0.14) 0%, transparent 70%)',
        }} />

        <div style={{ width: '100%', maxWidth: 340, position: 'relative', zIndex: 1 }}>

          <div className="anim-logo" style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: 128, height: 128,
              borderRadius: '4rem',
              overflow: 'hidden',
              background: 'linear-gradient(145deg, #2a1a18, #1a0f0e)',
              border: '1.5px solid rgba(180,126,116,0.3)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 4px 16px rgba(180,126,116,0.1), inset 0 1px 0 rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img
                src={logoUrl || 'https://rancholastrojes.com.mx/assets/uploads/logo/logo_698abd3f7c34d.png'}
                alt="Rancho Las Trojes"
                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '0.5rem' }}
              />
            </div>
          </div>

          <div style={{
            textAlign: 'center',
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? 'none' : 'translateY(12px)',
            transition: 'all 0.6s ease 0.2s',
            marginBottom: '2.5rem',
          }}>
            <div className="anim-tag" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.3rem 0.9rem',
              background: 'rgba(180,126,116,0.1)',
              border: '1px solid rgba(180,126,116,0.2)',
              borderRadius: '999px',
              marginBottom: '1rem',
              animationDelay: '0.3s',
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#b47e74' }} />
              <span style={{
                fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em',
                textTransform: 'uppercase', color: 'rgba(180,126,116,0.85)',
              }}>
                Panel Administrativo
              </span>
            </div>

            <h1
              className="login-playfair"
              style={{
                fontSize: 'clamp(1.6rem, 3vw, 2rem)',
                fontWeight: 700,
                lineHeight: 1.15,
                background: 'linear-gradient(160deg, #f5f0ef 20%, #c59d95 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                margin: '0 0 0.5rem',
              }}
            >
              Bienvenido de vuelta
            </h1>
            <p style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: '0.8rem', fontWeight: 400, lineHeight: 1.5,
              margin: 0,
            }}>
              Accede para gestionar tu rancho
            </p>
          </div>

          <div
            className="anim-divider"
            style={{
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(180,126,116,0.35), transparent)',
              marginBottom: '2rem',
              transformOrigin: 'center',
              animationDelay: '0.4s',
            }}
          />

          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex', flexDirection: 'column', gap: '1rem',
              opacity: phase >= 2 ? 1 : 0,
              transform: phase >= 2 ? 'none' : 'translateY(16px)',
              transition: 'all 0.6s ease 0.1s',
            }}
          >
            <FormField
              type="text"
              placeholder="Usuario o correo electrónico"
              value={username}
              onChange={setUsername}
              label="Usuario"
              icon={<User size={18} strokeWidth={1.8} />}
              disabled={isLoading}
            />

            <div style={{ position: 'relative' }}>
              <FormField
                type={showPwd ? 'text' : 'password'}
                placeholder="Contraseña"
                value={password}
                onChange={setPassword}
                label="Contraseña"
                icon={<Lock size={18} strokeWidth={1.8} />}
                disabled={isLoading}
                paddingRight="3rem"
              />
              <button
                type="button"
                onClick={() => setShowPwd(p => !p)}
                style={{
                  position: 'absolute', bottom: '1.15rem', right: '1.25rem',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center',
                  transition: 'color 0.2s',
                  padding: 0,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(180,126,116,0.8)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={canSubmit ? 'shimmer-btn' : ''}
              style={{
                marginTop: '0.5rem',
                width: '100%',
                padding: '1rem 1.5rem',
                borderRadius: '1rem',
                border: canSubmit ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.06)',
                color: canSubmit ? '#fff' : 'rgba(255,255,255,0.2)',
                background: canSubmit ? undefined : 'rgba(255,255,255,0.05)',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontWeight: 700,
                fontSize: '0.75rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: canSubmit ? '0 4px 20px rgba(180,126,116,0.25), inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
                transition: 'opacity 0.2s, transform 0.2s',
              }}
              onMouseEnter={e => { if (canSubmit) (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
              onMouseDown={e => { if (canSubmit) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
              onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            >
              {isLoading
                ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Verificando...</>
                : <>Entrar al Sistema <ArrowRight size={18} /></>}
            </button>
          </form>

          <p style={{
            marginTop: '2.5rem',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.15)',
            fontSize: '0.65rem',
            fontWeight: 500,
            letterSpacing: '0.05em',
            lineHeight: 1.6,
            opacity: phase >= 3 ? 1 : 0,
            transition: 'opacity 0.6s ease 0.5s',
          }}>
            Acceso restringido · Solo personal autorizado<br />
            © {new Date().getFullYear()} Rancho Las Trojes. Todos los derechos reservados. 
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @media (min-width: 900px) {
          .gallery-panel { display: flex !important; }
          .form-panel    { flex: 0 0 380px; }
        }
        @media (min-width: 1200px) {
          .form-panel { flex: 0 0 420px; }
        }
        @media (max-width: 899px) {
          .gallery-panel { display: none !important; }
          .form-panel {
            flex: 1 1 100%;
            min-width: 0;
            border-left: none !important;
          }
        }
      `}</style>
    </div>
  );
};

interface FormFieldProps {
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  paddingRight?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  type, placeholder, value, onChange, label, icon, disabled, paddingRight = '1rem',
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <label style={{
        fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: focused ? 'rgba(180,126,116,0.8)' : 'rgba(255,255,255,0.25)',
        marginLeft: '0.25rem',
        transition: 'color 0.2s',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)',
          color: focused ? 'rgba(180,126,116,0.85)' : 'rgba(255,255,255,0.2)',
          transition: 'color 0.2s',
          display: 'flex', alignItems: 'center',
          pointerEvents: 'none',
        }}>
          {icon}
        </div>
        <input
          type={type}
          required
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          className="input-dark"
          style={{
            width: '100%',
            padding: `1rem ${paddingRight} 1rem 3rem`,
            borderRadius: '1rem',
            fontSize: '0.85rem',
            fontWeight: 500,
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
};