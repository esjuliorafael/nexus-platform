import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Settings, MapPin, ChevronRight, Save, Truck, Info, AlertCircle, CheckCircle2, Package, Bird, Loader2 } from 'lucide-react';
import { ShippingConfig, StateZone, ShippingZone } from '../../../types';
import { apiSystem } from '../../../api'; // IMPORTAMOS LA API

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
            baseCostArticles: Number(configData['envio_costo_base_articulos'] || 250),
            freeShippingArticles: configData['envio_gratis_articulos'] === '1',
            costNormalZone: Number(configData['envio_costo_normal'] || 850),
            costExtendedZone: Number(configData['envio_costo_extendida'] || 1250),
            freeShippingBirds: configData['envio_gratis_aves'] === '1',
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
          'envio_costo_base_articulos': config.baseCostArticles,
          'envio_gratis_articulos': config.freeShippingArticles,
          'envio_costo_normal': config.costNormalZone,
          'envio_costo_extendida': config.costExtendedZone,
          'envio_gratis_aves': config.freeShippingBirds
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
        s.id === id ? { ...s, zone: s.zone === 'normal' ? 'extendida' : 'normal' } : s
      ));
    };

    const stats = {
      normal: localStates.filter(s => s.zone === 'normal').length,
      extended: localStates.filter(s => s.zone === 'extendida').length,
    };

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-32">
           <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
           <p className="text-stone-500 font-medium">Cargando configuración de envíos...</p>
        </div>
      );
    }

    if (subView === 'zones') {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 relative">
          {/* Tarjeta Oscura: REGLA 2 */}
          <div className="bg-stone-900 rounded-[2.5rem] p-6 md:p-8 text-white shadow-lg shadow-stone-900/20 border border-stone-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest">Zona Normal</p>
                  <p className="text-3xl font-black mt-1">{stats.normal}</p>
                </div>
                <div className="w-px h-10 bg-stone-700 hidden md:block" />
                <div>
                  <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest">Zona Extendida</p>
                  <p className="text-3xl font-black mt-1">{stats.extended}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => updateAllZones('normal')}
                  className="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 active:scale-95"
                >
                  Asignar todos como Normal
                </button>
                <button 
                  onClick={() => updateAllZones('extendida')}
                  className="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 active:scale-95"
                >
                  Asignar todos como Extendida
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {localStates.map((state, idx) => (
              <div 
                key={state.id}
                // Tarjetas hijas: Usamos rounded-3xl para que encajen mejor como hijas
                className={`animate-card-enter p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between gap-4 hover:shadow-md ${
                  state.zone === 'normal' 
                    ? 'bg-white border-stone-200 shadow-sm' 
                    : 'bg-amber-50 border-amber-200 shadow-sm'
                }`}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div className="flex items-start justify-between">
                  <h4 className="font-bold text-stone-800">{state.name}</h4>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    state.zone === 'normal' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {state.zone}
                  </span>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                  <span className="text-xs font-bold text-stone-500">Zona Extendida</span>
                  <button 
                    onClick={() => toggleStateZone(state.id)}
                    className={`w-12 h-6 rounded-full transition-all relative shadow-inner ${
                      state.zone === 'extendida' ? 'bg-brand-500' : 'bg-stone-200'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${
                      state.zone === 'extendida' ? 'left-7' : 'left-1'
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
      <div className="space-y-8 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Bloque: Envío de Artículos */}
          {/* REGLA 1: bg-white rounded-[2.5rem] p-8 shadow-sm border border-stone-200 hover:shadow-md transition-all duration-300 */}
          <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-stone-200 hover:shadow-md transition-all duration-300 flex flex-col h-full">
            <div className="flex items-center gap-4 mb-8">
              {/* REGLA 3: Icono bg-stone-50 border border-stone-200 */}
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-600">
                <Package size={24} />
              </div>
              <div>
                <h3 className="font-black text-stone-800 uppercase tracking-widest text-sm leading-tight">Envío de Artículos</h3>
                {/* REGLA 4: Labels text-[10px] font-black uppercase tracking-widest text-stone-400 */}
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-1">Costo Base Fijo</p>
              </div>
            </div>
            
            <div className="space-y-8 flex-1">
              <div className={`space-y-2 group transition-all duration-300 ${config.freeShippingArticles ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Costo base envío artículos</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-stone-400 group-focus-within:text-brand-500 transition-colors font-bold text-lg">
                    $
                  </div>
                  {/* REGLA 5: Input Burbuja */}
                  <input 
                    type="number"
                    value={config.baseCostArticles}
                    disabled={config.freeShippingArticles}
                    onChange={(e) => setConfig({ ...config, baseCostArticles: Number(e.target.value) })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 pl-10 pr-6 text-stone-800 font-bold placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  />
                </div>
                {config.freeShippingArticles && (
                  <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-brand-600 bg-brand-50 px-4 py-2 rounded-xl border border-brand-100 animate-in zoom-in duration-300">
                    <Info size={14} />
                    <span>EL COSTO BASE SE IGNORA (ENVÍO GRATIS ACTIVO)</span>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-stone-800 text-sm">Activar envío gratis</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-0.5">Aplica para todos los artículos</p>
                  </div>
                  <button 
                    onClick={() => setConfig({ ...config, freeShippingArticles: !config.freeShippingArticles })}
                    className={`flex-shrink-0 w-14 h-7 rounded-full transition-all relative shadow-inner ${
                      config.freeShippingArticles ? 'bg-brand-500' : 'bg-stone-200'
                    }`}
                  >
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${
                      config.freeShippingArticles ? 'left-8' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Bloque: Envío de Aves */}
          {/* REGLA 1: bg-white rounded-[2.5rem] p-8 shadow-sm border border-stone-200 hover:shadow-md transition-all duration-300 */}
          <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-stone-200 hover:shadow-md transition-all duration-300 flex flex-col h-full">
            <div className="flex items-center gap-4 mb-8">
              {/* REGLA 3: Icono bg-stone-50 border border-stone-200 */}
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-600">
                <Bird size={24} />
              </div>
              <div>
                <h3 className="font-black text-stone-800 uppercase tracking-widest text-sm leading-tight">Envío de Aves</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-1">Configurado por Zona</p>
              </div>
            </div>

            <div className="space-y-6 flex-1">
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 transition-all duration-300 ${config.freeShippingBirds ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                <div className="space-y-2 group">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Costo zona normal</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-stone-400 group-focus-within:text-brand-500 transition-colors font-bold text-lg">
                      $
                    </div>
                    {/* REGLA 5: Input Burbuja */}
                    <input 
                      type="number"
                      value={config.costNormalZone}
                      disabled={config.freeShippingBirds}
                      onChange={(e) => setConfig({ ...config, costNormalZone: Number(e.target.value) })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 pl-10 pr-6 text-stone-800 font-bold placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2 group">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Costo zona extendida</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-stone-400 group-focus-within:text-brand-500 transition-colors font-bold text-lg">
                      $
                    </div>
                    {/* REGLA 5: Input Burbuja */}
                    <input 
                      type="number"
                      value={config.costExtendedZone}
                      disabled={config.freeShippingBirds}
                      onChange={(e) => setConfig({ ...config, costExtendedZone: Number(e.target.value) })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 pl-10 pr-6 text-stone-800 font-bold placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {config.freeShippingBirds && (
                <div className="flex items-center gap-2 text-[10px] font-bold text-brand-600 bg-brand-50 px-4 py-2 rounded-xl border border-brand-100 animate-in zoom-in duration-300">
                  <Info size={14} />
                  <span>LOS COSTOS POR ZONA SE IGNORAN (ENVÍO GRATIS ACTIVO)</span>
                </div>
              )}

              <div className="pt-6 border-t border-stone-100 mt-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-stone-800 text-sm">Activar envío gratis</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-0.5">Aplica para todas las aves</p>
                  </div>
                  <button 
                    onClick={() => setConfig({ ...config, freeShippingBirds: !config.freeShippingBirds })}
                    className={`flex-shrink-0 w-14 h-7 rounded-full transition-all relative shadow-inner ${
                      config.freeShippingBirds ? 'bg-brand-500' : 'bg-stone-200'
                    }`}
                  >
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${
                      config.freeShippingBirds ? 'left-8' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Resumen de Zonificación */}
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-6">
            <h3 className="font-black text-stone-800 uppercase tracking-widest text-xs">Resumen de Zonificación</h3>
          </div>

          {/* Tarjeta Oscura: REGLA 2 */}
          <div className="bg-stone-900 rounded-[2.5rem] p-8 text-white shadow-lg shadow-stone-900/20 border border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-12">
              <div className="text-center sm:text-left">
                <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest">Zona Normal</p>
                <p className="text-5xl font-black mt-1 tracking-tighter">{stats.normal}</p>
              </div>
              <div className="w-px h-16 bg-stone-800 hidden sm:block" />
              <div className="text-center sm:text-left">
                <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest">Zona Extendida</p>
                <p className="text-5xl font-black mt-1 tracking-tighter">{stats.extended}</p>
              </div>
            </div>
            
            {/* REGLA 6: active:scale-95 transition-all */}
            <button 
              onClick={() => setSubView('zones')}
              className="w-full sm:w-auto px-10 py-5 bg-white text-stone-900 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-stone-100 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg"
            >
              Configurar Zonas
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }
);