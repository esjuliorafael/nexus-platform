import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Ticket, Info, ShieldCheck } from 'lucide-react';
import { apiSystem } from '../../../api';

export interface RaffleSettingsViewRef {
  handleSaveConfig: () => void;
}

interface RaffleSettingsViewProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
  onStatusChange?: (enabled: boolean) => void;
}

export const RaffleSettingsView = forwardRef<RaffleSettingsViewRef, RaffleSettingsViewProps>(
  ({ showToast, onStatusChange }, ref) => {
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Estado local para la activación del módulo
    const [isEnabled, setEnabled] = useState(false);

    // 1. Cargar datos al montar el componente
    useEffect(() => {
      const loadConfig = async () => {
        setIsLoading(true);
        try {
          const data = await apiSystem.getConfig();
          const active = data['raffle_enabled'] === '1';
          setEnabled(active);
        } catch (error) {
          console.error("Error cargando configuración de rifas", error);
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
        if (isSaving) return;
        setIsSaving(true);

        try {
          await apiSystem.updateConfig({
            'raffle_enabled': isEnabled ? '1' : '0'
          });
          showToast(`Módulo de rifas ${isEnabled ? 'habilitado' : 'deshabilitado'} correctamente`, 'success');
          if (onStatusChange) onStatusChange(isEnabled);
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
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ transitionTimingFunction: 'var(--ease-emil)' }}>
        
        {/* Banner Info */}
        <div className="bg-brand-50 border border-brand-100 p-8 rounded-[2.5rem] flex gap-5 items-start shadow-sm dark:shadow-none">
          <div className="w-12 h-12 bg-bg-card text-brand-500 rounded-2xl flex items-center justify-center shrink-0 shadow-sm dark:shadow-none border border-brand-100">
            <Info size={24} />
          </div>
          <div>
            <h4 className="text-lg font-black text-brand-900 tracking-tight">Configuración Global de Rifas</h4>
            <p className="text-sm text-brand-800/80 mt-1.5 leading-relaxed font-medium">
              Este interruptor controla la visibilidad de la sección de rifas en toda la plataforma. Al desactivarlo, se ocultarán los accesos tanto en este panel administrativo como en la tienda pública para los clientes.
            </p>
          </div>
        </div>

        {/* Card Principal */}
        <div className="bg-bg-card border border-border-main rounded-[2.5rem] p-8 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-border-main gap-4">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-bg-muted border border-border-main flex items-center justify-center text-stone-600 shadow-inner">
                <Ticket size={24} />
              </div>
              <div>
                <h3 className="font-black text-text-main uppercase tracking-widest text-sm leading-tight">Estado del Módulo</h3>
                <p className="text-[10px] text-stone-400 font-bold uppercase mt-1">Activa o desactiva las rifas en el sistema</p>
              </div>
            </div>

            <button 
              onClick={() => setEnabled(!isEnabled)}
              className={`flex-shrink-0 w-14 h-7 rounded-full transition-all relative active:scale-90 ${isEnabled ? 'bg-brand-500 shadow-lg shadow-brand-500/20' : 'bg-stone-300'}`}
              style={{ transitionTimingFunction: 'var(--ease-emil)' }}
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-bg-card shadow-sm dark:shadow-none transition-all ${isEnabled ? 'left-8' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 px-4 py-3 bg-bg-muted rounded-2xl border border-border-main">
              <ShieldCheck size={18} className={isEnabled ? 'text-emerald-500' : 'text-stone-300'} />
              <p className="text-xs font-bold text-stone-600">
                {isEnabled 
                  ? 'El módulo de rifas está actualmente ACTIVO y es visible para los usuarios.' 
                  : 'El módulo de rifas está actualmente INACTIVO y oculto.'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-100 p-8 rounded-[2.5rem] flex gap-5 items-start shadow-sm dark:shadow-none">
          <div className="w-12 h-12 bg-bg-card text-amber-500 rounded-2xl flex items-center justify-center shrink-0 shadow-sm dark:shadow-none border border-amber-100">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h4 className="text-lg font-black text-amber-900 tracking-tight">Restricción de Seguridad</h4>
            <p className="text-sm text-amber-800/80 mt-1.5 leading-relaxed font-medium">
              Solo los usuarios con privilegio de <strong>Superadmin</strong> pueden modificar este ajuste. Asegúrate de que no haya sorteos activos antes de deshabilitar el módulo.
            </p>
          </div>
        </div>

      </div>
    );
  }
);
