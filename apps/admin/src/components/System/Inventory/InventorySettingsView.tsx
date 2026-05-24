import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Timer, Info, RotateCcw } from 'lucide-react';
import { apiSystem } from '../../../api';
import { NexusInput } from '../../ui/NexusInputs';

export interface InventorySettingsViewRef {
  handleSaveConfig: () => void;
}

interface InventorySettingsViewProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const InventorySettingsView = forwardRef<InventorySettingsViewRef, InventorySettingsViewProps>(
  ({ showToast }, ref) => {
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Estado local para los valores del formulario
    const [config, setConfig] = useState({
      storeActive: true,
      storeHours: 24,
      raffleActive: true,
      raffleHours: 24
    });

    // 1. Cargar datos al montar el componente
    useEffect(() => {
      const loadConfig = async () => {
        setIsLoading(true);
        try {
          const data = await apiSystem.getConfig();
          setConfig({
            storeActive: data['inventory_release_active'] === '1',
            storeHours: Number(data['inventory_release_hours'] || 24),
            raffleActive: data['raffle_release_active'] === '1',
            raffleHours: Number(data['raffle_release_hours'] || 24)
          });
        } catch (error) {
          console.error("Error cargando configuración de inventario", error);
          showToast('Error al cargar la configuración actual', 'error');
        } finally {
          setIsLoading(false);
        }
      };
      
      loadConfig();
    }, []);

    // 2. Guardar datos (expuesto al App.tsx)
    useImperativeHandle(ref, () => ({
      handleSaveConfig: async () => {
        // Validación local
        if (config.storeActive && (!config.storeHours || config.storeHours <= 0)) {
          showToast('Por favor ingresa un número de horas válido para la tienda.', 'error');
          return;
        }
        if (config.raffleActive && (!config.raffleHours || config.raffleHours <= 0)) {
          showToast('Por favor ingresa un número de horas válido para las rifas.', 'error');
          return;
        }

        if (isSaving) return;
        setIsSaving(true);

        try {
          await apiSystem.updateConfig({
            'inventory_release_active': config.storeActive ? '1' : '0',
            'inventory_release_hours': config.storeHours.toString(),
            'raffle_release_active': config.raffleActive ? '1' : '0',
            'raffle_release_hours': config.raffleHours.toString()
          });
          showToast('Configuración de liberación guardada correctamente', 'success');
        } catch (error) {
          showToast('Error al guardar la configuración', 'error');
        } finally {
          setIsSaving(false);
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
           <p className="text-stone-400 font-black uppercase tracking-[0.2em] text-[10px]">Cargando Ajustes...</p>
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        
        {/* Banner Info */}
        <div className="bg-brand-50 border border-brand-100 p-6 rounded-[2rem] flex gap-4 items-start shadow-sm dark:shadow-none">
          <div className="text-brand-500 mt-1 shrink-0"><Info size={24} /></div>
          <div>
            <h4 className="font-bold text-brand-900 tracking-tight">¿Cómo funciona la liberación automática?</h4>
            <p className="text-sm text-brand-800 mt-1 leading-relaxed font-medium">
              Cuando esta opción está activa, el sistema cancelará automáticamente los pedidos o apartados que superen el tiempo límite establecido. 
              <br/><br/>
              • <strong>Tienda:</strong> Las aves reservadas vuelven a estar disponibles y el stock se repone.
              <br/>
              • <strong>Rifas:</strong> Los boletos apartados se liberan para que otros participantes puedan comprarlos.
              <br/><br/>
              En ambos casos, el cliente recibirá una notificación por WhatsApp informando sobre la cancelación.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card Tienda */}
          <div className="bg-bg-card border border-border-main rounded-[2.5rem] p-8 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-border-main gap-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-bg-muted border border-border-main flex items-center justify-center text-stone-600">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 className="font-black text-text-main uppercase tracking-widest text-sm leading-tight">Órdenes (Tienda)</h3>
                  <p className="text-[10px] text-stone-400 font-bold uppercase mt-1">Cancela órdenes vencidas</p>
                </div>
              </div>

              <button 
                onClick={() => setConfig({ ...config, storeActive: !config.storeActive })}
                className={`flex-shrink-0 w-14 h-7 rounded-full transition-all relative ${config.storeActive ? 'bg-brand-500' : 'bg-stone-300'}`}
              >
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-bg-card shadow-sm dark:shadow-none transition-all ${config.storeActive ? 'left-8' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex flex-col gap-6 transition-all duration-300" style={{ opacity: config.storeActive ? 1 : 0.5, pointerEvents: config.storeActive ? 'auto' : 'none' }}>
              <div className="space-y-2 group">
                <div className="relative">
                  <NexusInput 
                    label="Tiempo Límite de Pago"
                    type="number" 
                    min="1"
                    value={config.storeHours} 
                    onChange={(e) => setConfig({ ...config, storeHours: parseInt(e.target.value) || 0 })} 
                    placeholder="Ej. 72" 
                    icon={Timer}
                    helperText="Después de este periodo, el sistema cancelará la orden de la tienda."
                  />
                  <div className="absolute top-[3.7rem] right-5 flex items-center pointer-events-none text-stone-400 font-black text-[9px] uppercase tracking-widest">
                    Horas
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card Rifas */}
          <div className="bg-bg-card border border-border-main rounded-[2.5rem] p-8 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-border-main gap-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-bg-muted border border-border-main flex items-center justify-center text-stone-600">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 className="font-black text-text-main uppercase tracking-widest text-sm leading-tight">Apartados (Rifas)</h3>
                  <p className="text-[10px] text-stone-400 font-bold uppercase mt-1">Libera boletos vencidos</p>
                </div>
              </div>

              <button 
                onClick={() => setConfig({ ...config, raffleActive: !config.raffleActive })}
                className={`flex-shrink-0 w-14 h-7 rounded-full transition-all relative ${config.raffleActive ? 'bg-brand-500' : 'bg-stone-300'}`}
              >
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-bg-card shadow-sm dark:shadow-none transition-all ${config.raffleActive ? 'left-8' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex flex-col gap-6 transition-all duration-300" style={{ opacity: config.raffleActive ? 1 : 0.5, pointerEvents: config.raffleActive ? 'auto' : 'none' }}>
              <div className="space-y-2 group">
                <div className="relative">
                  <NexusInput 
                    label="Tiempo Límite de Apartado"
                    type="number" 
                    min="1"
                    value={config.raffleHours} 
                    onChange={(e) => setConfig({ ...config, raffleHours: parseInt(e.target.value) || 0 })} 
                    placeholder="Ej. 24" 
                    icon={Timer}
                    helperText="Después de este periodo, los boletos se liberarán automáticamente."
                  />
                  <div className="absolute top-[3.7rem] right-5 flex items-center pointer-events-none text-stone-400 font-black text-[9px] uppercase tracking-widest">
                    Horas
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  }
);
