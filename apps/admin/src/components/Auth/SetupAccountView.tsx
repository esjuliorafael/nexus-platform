import React, { useState } from 'react';
import { CheckCircle2, Save, ShieldCheck, Lock, AlertTriangle, ArrowRight, LogOut } from 'lucide-react';
import { apiAuth } from '../../api';
import { NexusInput } from '../ui/NexusInputs';
import { NexusSectionButton } from '../ui/NexusButton';
import { NexusHeroIcon } from '../ui/NexusIcon';

interface SetupAccountViewProps {
  onSetupComplete: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  userName: string;
  onLogout: () => void;
}

export const SetupAccountView: React.FC<SetupAccountViewProps> = ({ onSetupComplete, showToast, userName, onLogout }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Las contraseñas no coinciden', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiAuth.setupAccount(password);
      showToast('Cuenta configurada con éxito', 'success');
      onSetupComplete();
    } catch (error) {
      showToast('Error al actualizar contraseña', 'error');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-app flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl animate-in fade-in zoom-in-95 duration-700">
        
        {/* LOGO & SALUDO */}
        <div className="text-center flex flex-col items-center" style={{ marginBottom: 'var(--space-lg)', gap: 'var(--space-md)' }}>
          <div className="rotate-3">
             <NexusHeroIcon icon={ShieldCheck} variant="solid-brand" className="-rotate-3" />
          </div>
          <div>
            <h1 className="text-display text-text-main">Bienvenido, {userName}</h1>
            <p className="text-secondary text-text-muted mt-2">Configuración de Seguridad de tu Cuenta</p>
          </div>
        </div>

        <div className="bg-bg-card shadow-2xl border border-border-main overflow-hidden" style={{ borderRadius: 'var(--radius-outer)' }}>
          
          {step === 1 ? (
            <div className="animate-in slide-in-from-right-8 duration-500 flex flex-col" style={{ padding: 'var(--padding-outer)', gap: 'var(--space-lg)' }}>
              <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
                 <h2 className="text-h1 text-text-main flex items-center" style={{ gap: 'var(--space-sm)' }}>
                   <Lock className="text-brand-500" size={24} />
                   Seguridad Requerida
                 </h2>
                 <p className="text-body text-text-muted">
                   Tu cuenta fue creada por un administrador con una contraseña temporal por defecto o tu clave actual requiere un reseteo de seguridad. 
                 </p>
                 <p className="text-body text-text-muted">
                   Para continuar y acceder al panel de Nexus, debes establecer una <strong className="font-bold text-text-main">nueva contraseña segura</strong> que solo tú conocerás.
                 </p>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 flex" style={{ padding: 'var(--padding-inner)', borderRadius: 'var(--radius-inner-visual)', gap: 'var(--space-md)' }}>
                 <AlertTriangle size={24} className="shrink-0" />
                 <p className="text-secondary">
                   Nunca compartas tu contraseña. Los administradores nunca te pedirán tu clave.
                 </p>
              </div>

              <div className="flex" style={{ gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
                <NexusSectionButton onClick={onLogout} variant="secondary" isIconOnly icon={LogOut} />
                <NexusSectionButton 
                  onClick={() => setStep(2)} 
                  variant="brand" 
                  className="flex-1"
                  icon={ArrowRight}
                >
                  Cambiar Contraseña
                </NexusSectionButton>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="animate-in slide-in-from-right-8 duration-500 flex flex-col" style={{ padding: 'var(--padding-outer)', gap: 'var(--space-lg)' }}>
              <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                 <h2 className="text-h1 text-text-main">Nueva Contraseña</h2>
                 <p className="text-secondary text-text-muted">Ingresa al menos 6 caracteres seguros.</p>
              </div>

              <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
                 <NexusInput 
                   label="Contraseña Segura"
                   type="password"
                   required
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   icon={Lock}
                   placeholder="••••••••"
                   autoFocus
                 />
                 
                 <NexusInput 
                   label="Confirmar Contraseña"
                   type="password"
                   required
                   value={confirmPassword}
                   onChange={(e) => setConfirmPassword(e.target.value)}
                   icon={CheckCircle2}
                   placeholder="••••••••"
                 />
              </div>

              <div style={{ marginTop: 'var(--space-xs)' }}>
                <NexusSectionButton 
                  type="submit" 
                  variant="brand" 
                  className="w-full"
                  isLoading={isSubmitting}
                  disabled={password.length < 6 || password !== confirmPassword}
                  icon={Save}
                >
                  Actualizar y Entrar al Sistema
                </NexusSectionButton>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
