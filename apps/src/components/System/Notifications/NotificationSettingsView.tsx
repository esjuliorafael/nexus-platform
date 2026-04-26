import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Bell, Info, Mail, Loader2 } from 'lucide-react';
import { apiUsers } from '../../../api';

export interface NotificationSettingsViewRef {
  handleSaveConfig: () => void;
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
      handleSaveConfig: async () => {
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
        <div className="flex flex-col items-center justify-center py-32">
           <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
           <p className="text-stone-500 font-medium">Cargando tus preferencias...</p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        
        {/* Banner de Información */}
        <div className="bg-brand-50 border border-brand-100 p-6 rounded-[2rem] flex gap-4 items-start shadow-sm">
          <div className="text-brand-500 mt-1 shrink-0"><Info size={24} /></div>
          <div>
            <h4 className="font-bold text-brand-900">Avisos de Nuevas Órdenes</h4>
            <p className="text-sm text-brand-800 mt-1 leading-relaxed">
              Mantente al tanto de tu negocio. Si activas esta opción, el sistema te enviará automáticamente un correo electrónico con el resumen del pedido cada vez que un cliente complete una compra en la tienda.
            </p>
          </div>
        </div>

        {/* Tarjeta Principal Homologada: rounded-[2.5rem], border-stone-200 */}
        <div className="bg-white border border-stone-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-md transition-all duration-300">
          
          {/* Cabecera con Toggle */}
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-stone-100 gap-4">
            <div className="flex items-center gap-3">
              {/* Icono: rounded-2xl */}
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-600">
                <Bell size={20} />
              </div>
              <div>
                <h3 className="font-black text-stone-800 uppercase tracking-widest text-sm leading-tight">Alertas por Correo</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-1">Tus preferencias personales</p>
              </div>
            </div>

            <button 
              onClick={() => setConfig({ ...config, active: !config.active })}
              className={`flex-shrink-0 w-14 h-7 rounded-full transition-all relative ${config.active ? 'bg-brand-500' : 'bg-stone-300'}`}
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${config.active ? 'left-8' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex flex-col gap-6 transition-all duration-300" style={{ opacity: config.active ? 1 : 0.5, pointerEvents: config.active ? 'auto' : 'none' }}>
            
            <div className="space-y-2 group">
              <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">
                Correo Electrónico de Recepción
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-stone-400 group-focus-within:text-brand-500 transition-colors">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  name="email" 
                  value={config.email} 
                  onChange={(e) => setConfig({ ...config, email: e.target.value })} 
                  placeholder="ejemplo@correo.com" 
                  // ESTÁNDAR: Input homologado (burbuja)
                  className="w-full bg-stone-50 border border-stone-200 p-4 pl-12 pr-6 rounded-2xl text-stone-800 font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm" 
                />
              </div>
              <p className="text-[10px] text-stone-400 font-medium ml-1 leading-relaxed">
                Por defecto es el correo de tu usuario actual. Si lo cambias aquí, <strong className="text-stone-500">solo afectará adónde llegan los avisos</strong>, tus credenciales para iniciar sesión seguirán siendo las mismas.
              </p>
            </div>

          </div>
        </div>

      </div>
    );
  }
);