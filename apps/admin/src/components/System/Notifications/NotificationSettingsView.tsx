import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Bell, Info, Mail, Loader2 } from 'lucide-react';
import { apiUsers } from '../../../api';
import { NexusInput } from '../../ui/NexusInputs';

export interface NotificationSettingsViewRef {
  handleSave: () => void;
}

interface NotificationSettingsViewProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const NotificationSettingsView = forwardRef<NotificationSettingsViewRef, NotificationSettingsViewProps>(
  ({ showToast }, ref) => {
    
    const [isLoading, setIsLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string>('1'); // ID simulado hasta tener Login

    const [config, setConfig] = useState({
      active: true,
      email: '' 
    });

    // 1. Cargar el usuario actual al montar
    useEffect(() => {
      const loadUserPreferences = async () => {
        setIsLoading(true);
        try {
          const user = await apiUsers.getCurrentUser();
          setCurrentUserId(user.id);
          setConfig({
            active: user.receiveNotifications ?? true,
            email: user.notificationEmail || user.email || ''
          });
        } catch (error) {
          console.error("Error cargando preferencias de usuario", error);
          showToast('Error al cargar la configuración de usuario', 'error');
        } finally {
          setIsLoading(false);
        }
      };
      
      loadUserPreferences();
    }, []);

    // 2. Guardar datos de notificación del usuario
    useImperativeHandle(ref, () => ({
      handleSave: async () => {
        if (config.active && !/^\S+@\S+\.\S+$/.test(config.email)) {
          showToast('Por favor ingresa un correo electrónico válido.', 'error');
          return;
        }

        try {
          await apiUsers.updateNotifications(currentUserId, config.active, config.email);
          showToast('Preferencias de notificación actualizadas', 'success');
        } catch (error) {
          showToast('Error al actualizar las preferencias', 'error');
        }
      }
    }));

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-40 animate-in fade-in duration-500">
           <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 border-4 border-brand-100 rounded-full" />
              <div className="absolute inset-0 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
           </div>
           <p className="text-stone-400 font-black uppercase tracking-[0.2em] text-[10px]">Cargando Preferencias...</p>
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-in fade-in duration-700">

        {/* Banner de Información */}
        <div className="bg-brand-50 border border-brand-100 p-6 rounded-[2rem] flex gap-4 items-start shadow-sm dark:shadow-none">
          <div className="text-brand-500 mt-1 shrink-0"><Info size={24} /></div>
          <div>
            <h4 className="font-bold text-brand-900 tracking-tight">Avisos de Nuevas Órdenes</h4>
            <p className="text-sm text-brand-800 mt-1 leading-relaxed font-medium">
              Mantente al tanto de tu negocio. Si activas esta opción, el sistema te enviará automáticamente un correo electrónico con el resumen del pedido cada vez que un cliente complete una compra en la tienda.
            </p>
          </div>
        </div>

        {/* Tarjeta Principal Homologada: rounded-[2.5rem], border-border-main */}
        <div className="bg-bg-card border border-border-main rounded-[2.5rem] p-8 shadow-sm dark:shadow-none hover:shadow-md transition-all duration-300">

          {/* Cabecera con Toggle */}
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-border-main gap-4">
            <div className="flex items-center gap-3">
              {/* Icono: rounded-2xl */}
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-bg-muted border border-border-main flex items-center justify-center text-stone-600">
                <Bell size={20} />
              </div>
              <div>
                <h3 className="font-black text-text-main uppercase tracking-widest text-sm leading-tight">Alertas por Correo</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-1">Tus preferencias personales</p>
              </div>
            </div>

            <button 
              onClick={() => setConfig({ ...config, active: !config.active })}
              className={`flex-shrink-0 w-14 h-7 rounded-full transition-all relative ${config.active ? 'bg-brand-500' : 'bg-stone-300'}`}
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-bg-card shadow-sm dark:shadow-none transition-all ${config.active ? 'left-8' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex flex-col gap-6 transition-all duration-300" style={{ opacity: config.active ? 1 : 0.5, pointerEvents: config.active ? 'auto' : 'none' }}>

            <div className="space-y-2 group">
              <NexusInput 
                label="Correo Electrónico de Recepción"
                type="email" 
                name="email" 
                value={config.email} 
                onChange={(e) => setConfig({ ...config, email: e.target.value })} 
                placeholder="ejemplo@correo.com" 
                icon={Mail}
                helperText="Por defecto es el correo de tu usuario actual. Si lo cambias aquí, solo afectará adónde llegan los avisos, tus credenciales para iniciar sesión seguirán siendo las mismas."
              />
            </div>

          </div>
        </div>

      </div>
    );
    }
    );