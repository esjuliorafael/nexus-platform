import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Timer, Info, RotateCcw, Loader2 } from 'lucide-react';
import { apiSystem } from '../../../api';

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
      active: true,
      hours: 24
    });

    // 1. Cargar datos al montar el componente
    useEffect(() => {
      const loadConfig = async () => {
        setIsLoading(true);
        try {
          const data = await apiSystem.getConfig();
          setConfig({
            // El backend devuelve strings. Mapeamos a boolean y number
            active: data['inventario_liberacion_activa'] === '1',
            hours: Number(data['inventario_horas_limite'] || 24)
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
        if (config.active && (!config.hours || config.hours <= 0)) {
          showToast('Por favor ingresa un número de horas válido mayor a 0.', 'error');
          return;
        }

        if (isSaving) return;
        setIsSaving(true);

        try {
          await apiSystem.updateConfig({
            'inventario_liberacion_activa': config.active,
            'inventario_horas_limite': config.hours
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
        <div className="flex flex-col items-center justify-center py-32">
           <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
           <p className="text-stone-500 font-medium">Cargando ajustes de inventario...</p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        
        {/* Banner Info: rounded-[2rem], border-brand-100 */}
        <div className="bg-brand-50 border border-brand-100 p-6 rounded-[2rem] flex gap-4 items-start shadow-sm">
          <div className="text-brand-500 mt-1 shrink-0"><Info size={24} /></div>
          <div>
            <h4 className="font-bold text-brand-900">¿Cómo funciona la liberación automática?</h4>
            <p className="text-sm text-brand-800 mt-1 leading-relaxed">
              Cuando esta opción está activa, el sistema revisará periódicamente las órdenes con estado <strong>"Pendiente"</strong>. Si una orden supera el tiempo límite establecido desde su creación, se marcará automáticamente como <strong>"Cancelada"</strong>. Las aves reservadas volverán a estar disponibles y el stock de los artículos será reabastecido.
            </p>
          </div>
        </div>

        {/* Card Principal: rounded-[2.5rem], border-stone-200 */}
        <div className="bg-white border border-stone-200 rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-stone-100 gap-4">
            <div className="flex items-center gap-3">
              {/* Icono: rounded-2xl, border-stone-200 */}
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-600">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="font-black text-stone-800 uppercase tracking-widest text-sm leading-tight">Liberación de Apartados</h3>
                <p className="text-[10px] text-stone-400 font-bold uppercase mt-1">Cancela órdenes vencidas y recupera stock</p>
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
              <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Tiempo Límite de Pago</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-stone-400 group-focus-within:text-brand-500 transition-colors">
                  <Timer size={18} />
                </div>
                <input 
                  type="number" 
                  min="1"
                  name="hours" 
                  value={config.hours} 
                  onChange={(e) => setConfig({ ...config, hours: parseInt(e.target.value) || 0 })} 
                  placeholder="Ej. 24" 
                  // ESTÁNDAR: Input homologado (CategoryForm)
                  className="w-full bg-stone-50 border border-stone-200 p-4 pl-12 pr-16 rounded-2xl text-stone-800 font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm" 
                />
                <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-stone-400 font-bold text-[10px] uppercase tracking-widest">
                  Horas
                </div>
              </div>
              <p className="text-[10px] text-stone-400 font-medium ml-1 leading-relaxed">
                Después de este periodo, el sistema cancelará la orden de forma automática si no ha sido pagada.
              </p>
            </div>
          </div>
        </div>

      </div>
    );
  }
);