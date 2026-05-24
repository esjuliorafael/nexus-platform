import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Settings, MapPin, ChevronRight, Save, Truck, Info, AlertCircle, CheckCircle2, Package, Bird, Loader2 } from 'lucide-react';
import { ShippingConfig, StateZone, ShippingZone } from '../../../types';
import { apiSystem } from '../../../api';
import { NexusButton } from '../../ui/NexusButton';
import { NexusInput } from '../../ui/NexusInputs';

interface ShippingViewProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
  subView: 'config' | 'zones';
  setSubView: (view: 'config' | 'zones') => void;
}

export const ShippingView = forwardRef<{ handleSaveConfig: () => void; handleSaveZones: () => void }, ShippingViewProps>(
  ({ showToast, subView, setSubView }, ref) => {
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Estado para Costos (Viene de api/configuracion.php)
    const [config, setConfig] = useState<ShippingConfig>({
      baseCostArticles: 0,
      freeShippingArticles: false,
      costNormalZone: 0,
      costExtendedZone: 0,
      freeShippingBirds: false,
    });

    // Estado para Estados/Zonas (Viene de api/envios.php)
    const [states, setStates] = useState<StateZone[]>([]);
    const [localStates, setLocalStates] = useState<StateZone[]>([]);

    // Cargar datos reales al montar
    useEffect(() => {
      const loadData = async () => {
        setIsLoading(true);
        try {
          // Cargamos Configuración y Zonas en paralelo
          const [configData, zonesData] = await Promise.all([
            apiSystem.getConfig(),
            apiSystem.getShippingZones()
          ]);

          // Mapeamos el diccionario de PHP al estado de React
          setConfig({
            baseCostArticles: Number(configData['shipping_base_cost_items'] || 250),
            freeShippingArticles: configData['shipping_free_threshold_items'] === '1',
            costNormalZone: Number(configData['shipping_cost_standard'] || 850),
            costExtendedZone: Number(configData['shipping_cost_extended'] || 1250),
            freeShippingBirds: configData['shipping_free_threshold_birds'] === '1',
          });

          setStates(zonesData);
          setLocalStates(zonesData);

        } catch (error) {
          console.error("Error cargando datos de envíos", error);
          showToast('Error al cargar la configuración', 'error');
        } finally {
          setIsLoading(false);
        }
      };
      
      loadData();
    }, []);

    // GUARDAR CONFIGURACIÓN (Costos)
    const handleSaveConfig = async () => {
      if (isSaving) return;
      setIsSaving(true);
      try {
        await apiSystem.updateConfig({
          'shipping_base_cost_items': config.baseCostArticles,
          'shipping_free_threshold_items': config.freeShippingArticles ? '1' : '0',
          'shipping_cost_standard': config.costNormalZone,
          'shipping_cost_extended': config.costExtendedZone,
          'shipping_free_threshold_birds': config.freeShippingBirds ? '1' : '0'
        });
        showToast('Configuración de costos guardada correctamente', 'success');
      } catch (error) {
        showToast('Error al guardar la configuración', 'error');
      } finally {
        setIsSaving(false);
      }
    };

    // GUARDAR ZONAS (Los 32 estados)
    const handleSaveZones = async () => {
      if (isSaving) return;
      setIsSaving(true);
      try {
        await apiSystem.updateShippingZones(localStates);
        setStates(localStates);
        showToast('Zonificación territorial actualizada', 'success');
        setSubView('config');
      } catch (error) {
        showToast('Error al actualizar las zonas', 'error');
      } finally {
        setIsSaving(false);
      }
    };

    useImperativeHandle(ref, () => ({
      handleSaveConfig,
      handleSaveZones
    }));

    const updateAllZones = (zone: ShippingZone) => {
      setLocalStates(prev => prev.map(s => ({ ...s, zone })));
    };

    const toggleStateZone = (id: string) => {
      setLocalStates(prev => prev.map(s => 
        s.id === id ? { ...s, zone: s.zone === 'STANDARD' ? 'EXTENDED' : 'STANDARD' } : s
      ));
    };

    const stats = {
      standard: localStates.filter(s => s.zone === 'STANDARD').length,
      extended: localStates.filter(s => s.zone === 'EXTENDED').length,
    };

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-40 animate-in fade-in duration-500">
           <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 border-4 border-brand-100 rounded-full" />
              <div className="absolute inset-0 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
           </div>
           <p className="text-stone-400 font-black uppercase tracking-[0.2em] text-[10px]">Cargando Envíos...</p>
        </div>
      );
    }

    if (subView === 'zones') {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 relative" style={{ transitionTimingFunction: 'var(--ease-emil)' }}>
          {/* Tarjeta Oscura */}
          <div className="bg-stone-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-stone-900/20 border border-stone-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex items-center gap-10">
                <div className="space-y-1">
                  <p className="text-text-muted text-[9px] font-black uppercase tracking-[0.2em]">Zona Normal</p>
                  <p className="text-4xl font-black tabular-nums">{stats.standard}</p>
                </div>
                <div className="w-[1px] h-12 bg-bg-card/10 hidden md:block" />
                <div className="space-y-1">
                  <p className="text-text-muted text-[9px] font-black uppercase tracking-[0.2em]">Zona Extendida</p>
                  <p className="text-4xl font-black tabular-nums">{stats.extended}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <NexusButton 
                  onClick={() => updateAllZones('STANDARD')}
                  variant="secondary"
                  className="bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700"
                  size="sm"
                >
                  Todos Normal
                </NexusButton>
                <NexusButton 
                  onClick={() => updateAllZones('EXTENDED')}
                  variant="secondary"
                  className="bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700"
                  size="sm"
                >
                  Todos Extendida
                </NexusButton>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
            {localStates.map((state, idx) => (
              <div 
                key={state.id}
                className={`animate-card-enter p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between gap-4 hover:shadow-lg ${
                  state.zone === 'STANDARD' 
                    ? 'bg-bg-card border-border-main shadow-sm dark:shadow-none' 
                    : 'bg-amber-50/50 border-amber-200 shadow-sm dark:shadow-none'
                }`}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div className="flex items-start justify-between">
                  <h4 className="font-black text-text-main tracking-tight">{state.name}</h4>
                  <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                    state.zone === 'STANDARD' 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                      : 'bg-amber-100 text-amber-700 border-amber-200'
                  }`}>
                    {state.zone === 'STANDARD' ? 'Normal' : 'Extendida'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-border-main">
                  <span className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Extendida</span>
                  <button 
                    onClick={() => toggleStateZone(state.id)}
                    className={`w-12 h-6 rounded-full transition-all relative active:scale-90 ${
                      state.zone === 'EXTENDED' ? 'bg-brand-500 shadow-sm dark:shadow-none shadow-brand-500/30' : 'bg-stone-200'
                    }`}
                    style={{ transitionTimingFunction: 'var(--ease-emil)' }}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-bg-card shadow-sm dark:shadow-none transition-all ${
                      state.zone === 'EXTENDED' ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-in fade-in duration-500" style={{ transitionTimingFunction: 'var(--ease-emil)' }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Bloque: Envío de Artículos */}
          <section className="bg-bg-card rounded-[2.5rem] p-10 shadow-sm dark:shadow-none border border-border-main hover:shadow-md transition-all duration-300 flex flex-col h-full">
            <div className="flex items-center gap-5 mb-10 pb-6 border-b border-stone-50">
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 shadow-sm dark:shadow-none">
                <Package size={28} />
              </div>
              <div>
                <h3 className="font-black text-text-main uppercase tracking-tight text-lg leading-tight">Artículos</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mt-1">Gestión de costos base</p>
              </div>
            </div>
            
            <div className="space-y-8 flex-1">
              <div className={`transition-all duration-500 ${config.freeShippingArticles ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                <NexusInput 
                  label="Costo base envío artículos"
                  type="number"
                  inputMode="decimal"
                  value={config.baseCostArticles.toString()}
                  disabled={config.freeShippingArticles}
                  onChange={(e) => setConfig({ ...config, baseCostArticles: Number(e.target.value) })}
                  placeholder="0.00"
                  icon={() => <span className="font-black text-lg">$</span>}
                />
                
                {config.freeShippingArticles && (
                  <div className="mt-4 flex items-center gap-3 text-[10px] font-black text-brand-600 bg-brand-50/50 px-5 py-3 rounded-[1.25rem] border border-brand-100 animate-in zoom-in duration-300">
                    <Info size={16} />
                    <span className="uppercase tracking-widest">Envío gratis habilitado</span>
                  </div>
                )}
              </div>

              <div className="pt-8 border-t border-border-main mt-auto">
                <div className="flex items-center justify-between bg-bg-muted p-6 rounded-[2rem] border border-border-main">
                  <div>
                    <h4 className="font-black text-text-main text-xs uppercase tracking-widest">Envío gratis</h4>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Aplica a todo el catálogo</p>
                  </div>
                  <button 
                    onClick={() => setConfig({ ...config, freeShippingArticles: !config.freeShippingArticles })}
                    className={`flex-shrink-0 w-14 h-7 rounded-full transition-all relative active:scale-90 ${
                      config.freeShippingArticles ? 'bg-brand-500 shadow-lg shadow-brand-500/20' : 'bg-stone-300'
                    }`}
                    style={{ transitionTimingFunction: 'var(--ease-emil)' }}
                  >
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-bg-card shadow-sm dark:shadow-none transition-all ${
                      config.freeShippingArticles ? 'left-8' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Bloque: Envío de Aves */}
          <section className="bg-bg-card rounded-[2.5rem] p-10 shadow-sm dark:shadow-none border border-border-main hover:shadow-md transition-all duration-300 flex flex-col h-full">
            <div className="flex items-center gap-5 mb-10 pb-6 border-b border-stone-50">
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 shadow-sm dark:shadow-none">
                <Bird size={28} />
              </div>
              <div>
                <h3 className="font-black text-text-main uppercase tracking-tight text-lg leading-tight">Aves</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mt-1">Configuración territorial</p>
              </div>
            </div>

            <div className="space-y-8 flex-1">
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-8 transition-all duration-500 ${config.freeShippingBirds ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                <NexusInput 
                  label="Costo zona normal"
                  type="number"
                  inputMode="decimal"
                  value={config.costNormalZone.toString()}
                  disabled={config.freeShippingBirds}
                  onChange={(e) => setConfig({ ...config, costNormalZone: Number(e.target.value) })}
                  placeholder="0.00"
                  icon={() => <span className="font-black text-lg">$</span>}
                />
                <NexusInput 
                  label="Costo zona extendida"
                  type="number"
                  inputMode="decimal"
                  value={config.costExtendedZone.toString()}
                  disabled={config.freeShippingBirds}
                  onChange={(e) => setConfig({ ...config, costExtendedZone: Number(e.target.value) })}
                  placeholder="0.00"
                  icon={() => <span className="font-black text-lg">$</span>}
                />
              </div>

              {config.freeShippingBirds && (
                <div className="flex items-center gap-3 text-[10px] font-black text-brand-600 bg-brand-50/50 px-5 py-3 rounded-[1.25rem] border border-brand-100 animate-in zoom-in duration-300">
                  <Info size={16} />
                  <span className="uppercase tracking-widest">Costos por zona ignorados</span>
                </div>
              )}

              <div className="pt-8 border-t border-border-main mt-auto">
                <div className="flex items-center justify-between bg-bg-muted p-6 rounded-[2rem] border border-border-main">
                  <div>
                    <h4 className="font-black text-text-main text-xs uppercase tracking-widest">Envío gratis</h4>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Aplica para todos los ejemplares</p>
                  </div>
                  <button 
                    onClick={() => setConfig({ ...config, freeShippingBirds: !config.freeShippingBirds })}
                    className={`flex-shrink-0 w-14 h-7 rounded-full transition-all relative active:scale-90 ${
                      config.freeShippingBirds ? 'bg-brand-500 shadow-lg shadow-brand-500/20' : 'bg-stone-300'
                    }`}
                    style={{ transitionTimingFunction: 'var(--ease-emil)' }}
                  >
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-bg-card shadow-sm dark:shadow-none transition-all ${
                      config.freeShippingBirds ? 'left-8' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Resumen de Zonificación */}
        <div className="pt-8">
          <div className="flex items-center gap-3 mb-6 px-2">
            <MapPin size={18} className="text-brand-500" />
            <h3 className="font-black text-text-main uppercase tracking-[0.2em] text-xs">Resumen de Zonificación</h3>
          </div>

          <div className="bg-stone-900 rounded-[3rem] p-10 text-white shadow-2xl shadow-stone-900/20 border border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-10 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full -mr-20 -mt-20 blur-[80px] pointer-events-none" />
            
            <div className="flex items-center gap-16 relative z-10">
              <div className="text-center sm:text-left space-y-2">
                <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.3em]">Zona Normal</p>
                <p className="text-6xl font-black tracking-tighter tabular-nums">{stats.standard}</p>
              </div>
              <div className="w-[1px] h-20 bg-bg-card/10 hidden sm:block" />
              <div className="text-center sm:text-left space-y-2">
                <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.3em]">Zona Extendida</p>
                <p className="text-6xl font-black tracking-tighter tabular-nums">{stats.extended}</p>
              </div>
            </div>
            
            <NexusButton 
              onClick={() => setSubView('zones')}
              size="lg"
              className="w-full sm:w-auto px-12 bg-bg-card text-text-main hover:bg-stone-100 shadow-xl"
              icon={ChevronRight}
            >
              Configurar Zonas
            </NexusButton>
          </div>
        </div>
      </div>
    );
  }
);