import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Settings, MapPin, ChevronRight, Save, Truck, Info, AlertCircle, CheckCircle2, Package, Bird, Loader2, Globe, ShieldCheck, Box, DollarSign, Wallet, History, FileText, ArrowRight } from 'lucide-react';
import { ShippingConfig, StateZone, ShippingZone } from '../../../types';
import { apiSystem } from '../../../api';
import { NexusSectionButton, NexusCardButton } from '../../ui/NexusButton';
import { NexusInput } from '../../ui/NexusInputs';
import { NexusHero } from '../../ui/NexusHero';
import { NexusSection } from '../../ui/NexusSection';
import { NexusSectionCard, NexusControlRow } from '../../ui/NexusCard';
import { EmptyState } from '../../ui/EmptyState';
import { NexusCardIcon } from '../../ui/NexusIcon';

interface ShippingViewProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
  subView: 'config' | 'zones';
  setSubView: (view: 'config' | 'zones') => void;
  setConfirmDialog: (config: any) => void;
}

export const ShippingView = forwardRef<{ handleSaveConfig: () => void; handleSaveZones: () => void }, ShippingViewProps>(
  ({ showToast, subView, setSubView, setConfirmDialog }, ref) => {
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Estado para Costos
    const [config, setConfig] = useState<ShippingConfig>({
      baseCostArticles: 0,
      freeShippingArticles: false,
      costNormalZone: 0,
      costExtendedZone: 0,
      freeShippingBirds: false,
    });

    // Estado para Estados/Zonas
    const [states, setStates] = useState<StateZone[]>([]);
    const [localStates, setLocalStates] = useState<StateZone[]>([]);

    // Cargar datos reales al montar
    useEffect(() => {
      const loadData = async () => {
        setIsLoading(true);
        try {
          const [configData, zonesData] = await Promise.all([
            apiSystem.getConfig(),
            apiSystem.getShippingZones()
          ]);

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
      setLocalStates(prev => prev.map(s => ({ ...s, zone, active: true })));
    };

    const toggleStateZone = (id: string, zone: ShippingZone) => {
      setLocalStates(prev => prev.map(s => 
        s.id === id ? { ...s, zone } : s
      ));
    };

    const toggleStateActive = (id: string) => {
      setLocalStates(prev => prev.map(s => 
        s.id === id ? { ...s, active: !s.active } : s
      ));
    };

    const allAreStandard = localStates.every(s => s.zone === 'STANDARD');

    const handleMassiveAction = () => {
      const targetZone = allAreStandard ? 'EXTENDED' : 'STANDARD';
      const zoneLabel = targetZone === 'STANDARD' ? 'Normal' : 'Extendida';

      setConfirmDialog({
        isOpen: true,
        title: `¿Cambiar todos a Zona ${zoneLabel}?`,
        message: `Esta acción actualizará la zonificación de los 32 estados a la cobertura ${zoneLabel.toLowerCase()}.`,
        confirmLabel: `Sí, cambiar todos`,
        variant: 'warning',
        onConfirm: () => {
          updateAllZones(targetZone);
          showToast(`Zonificación masiva a ${zoneLabel} completada`, 'success');
          setConfirmDialog({ isOpen: false });
        }
      });
    };

    const stats = {
      standard: localStates.filter(s => s.zone === 'STANDARD' && s.active).length,
      extended: localStates.filter(s => s.zone === 'EXTENDED' && s.active).length,
      inactive: localStates.filter(s => !s.active).length
    };

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-40 animate-in fade-in duration-500">
           <div className="relative w-20 h-20 mb-8">
              <div className="absolute inset-0 border-4 border-brand-100 rounded-[2rem]" />
              <div className="absolute inset-0 border-4 border-brand-500 border-t-transparent rounded-[2rem] animate-spin" style={{ animationDuration: '1s', animationTimingFunction: 'var(--ease-emil)' }} />
           </div>
           <p className="text-label text-text-muted">Analizando Red de Logística...</p>
        </div>
      );
    }

    if (subView === 'zones') {
      return (
        <div key="shipping-zones-content" className="space-y-8 pb-12 animate-in fade-in duration-300">
          
          <NexusHero
            title="Cobertura Territorial"
            subtitle="Configuración de Zonas por Estado"
            icon={MapPin}
            variant="dark"
            badge="Actualización Masiva"
            badgeValue={`${localStates.length} Estados`}
          />

          <NexusSection
            title="Zonificación"
            subtitle="Asignación de costos por región"
            icon={MapPin}
            iconVariant="brand"
            delay="200ms"
            action={
              <div className="flex gap-2">
                <NexusSectionButton onClick={handleMassiveAction} variant="secondary" className="hidden sm:flex">
                  {allAreStandard ? 'Todos a Extendida' : 'Todos a Normal'}
                </NexusSectionButton>
                <NexusSectionButton onClick={() => setSubView('config')} variant="brand">
                  Volver
                </NexusSectionButton>
              </div>
            }
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {localStates.map((state, idx) => (
                <div 
                  key={state.id} 
                  className={`flex items-center justify-between p-4 bg-white border rounded-[1.5rem] transition-all duration-300 group hover:shadow-lg hover:shadow-stone-200/40 ${!state.active ? 'border-dashed border-stone-200 opacity-60' : 'border-border-main hover:border-brand-500/30'}`}
                  style={{ animationDelay: `${idx * 20}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${!state.active ? 'bg-stone-300 scale-75' : state.zone === 'STANDARD' ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-orange-500 shadow-sm shadow-orange-500/50'}`} />
                    <span className={`font-black text-xs uppercase tracking-tight ${!state.active ? 'text-stone-400' : 'text-stone-800'}`}>
                      {state.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6">
                    {/* Pill Selector */}
                    {state.active && (
                      <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 shadow-inner scale-90 sm:scale-100 origin-right">
                        <button 
                          onClick={() => toggleStateZone(state.id, 'STANDARD')}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${state.zone === 'STANDARD' ? 'bg-white text-emerald-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                        >
                          Normal
                        </button>
                        <button 
                          onClick={() => toggleStateZone(state.id, 'EXTENDED')}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${state.zone === 'EXTENDED' ? 'bg-white text-orange-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                        >
                          Extra
                        </button>
                      </div>
                    )}
                    
                    {/* Switch de Visibilidad */}
                    <div className="pl-3 sm:pl-4 border-l border-stone-100 flex items-center gap-3">
                      <button 
                        onClick={() => toggleStateActive(state.id)} 
                        className={`w-11 h-6 rounded-full transition-all relative active:scale-90 ${
                          state.active ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30' : 'bg-stone-200'
                        }`}
                        style={{ transitionTimingFunction: 'var(--ease-emil)' }}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${
                          state.active ? 'left-6' : 'left-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </NexusSection>
        </div>
      );
    }

    return (
      <div key="shipping-config-content" className="space-y-8 pb-12 animate-in fade-in duration-300">
        
        <NexusHero
          title="Logística y Envíos"
          subtitle="Configuración de Costos y Umbrales"
          icon={Truck}
          variant="dark"
          badge="Modo Activo"
          badgeValue="Tarifas Dinámicas"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* SECCIÓN ARTÍCULOS */}
          <NexusSection
            title="Envíos de Artículos"
            subtitle="Gestión de costo base de envío"
            icon={Package}
            iconVariant="brand"
            delay="200ms"
          >
            <div className="space-y-8">
              <div className={`transition-all duration-500 ${config.freeShippingArticles ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                <NexusInput 
                  label="Costo base envío artículos"
                  type="number"
                  value={config.baseCostArticles.toString()}
                  disabled={config.freeShippingArticles}
                  onChange={(e) => setConfig({ ...config, baseCostArticles: Number(e.target.value) })}
                  icon={DollarSign}
                  helperText="Costo fijo por envío de artículos."
                />
              </div>

              <div className="pt-8 border-t border-border-main">
                <div className="flex items-center justify-between bg-bg-muted p-6 rounded-[2rem] border border-border-main transition-all duration-300 hover:border-brand-200 group">
                  <div className="flex items-center gap-4">
                    <NexusCardIcon 
                      icon={CheckCircle2} 
                      variant={config.freeShippingArticles ? 'solid-brand' : 'muted'}
                      isMuted={!config.freeShippingArticles}
                    />
                    <div>
                      <h4 className="text-h2 text-text-main">Envío Gratis</h4>
                      <p className="text-secondary text-text-muted">Anula el costo base en la compra de artículos.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setConfig({ ...config, freeShippingArticles: !config.freeShippingArticles })}
                    className={`flex-shrink-0 w-14 h-7 rounded-full transition-all relative active:scale-90 ${
                      config.freeShippingArticles ? 'bg-brand-500 shadow-lg shadow-brand-500/20' : 'bg-stone-300'
                    }`}
                    style={{ transitionTimingFunction: 'var(--ease-emil)' }}
                  >
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-bg-card shadow-sm transition-all ${
                      config.freeShippingArticles ? 'left-8' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </NexusSection>

          {/* SECCIÓN AVES */}
          <NexusSection
            title="Envíos de Aves"
            subtitle="Costos territoriales por zona"
            icon={Bird}
            iconVariant="blue"
            delay="400ms"
          >
            <div className="space-y-8">
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 transition-all duration-500 ${config.freeShippingBirds ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                <NexusInput 
                  label="Costo Zona Normal"
                  type="number"
                  value={config.costNormalZone.toString()}
                  disabled={config.freeShippingBirds}
                  onChange={(e) => setConfig({ ...config, costNormalZone: Number(e.target.value) })}
                  icon={DollarSign}
                  helperText="Costo base para cobertura estándar."
                />
                <NexusInput 
                  label="Costo Zona Extendida"
                  type="number"
                  value={config.costExtendedZone.toString()}
                  disabled={config.freeShippingBirds}
                  onChange={(e) => setConfig({ ...config, costExtendedZone: Number(e.target.value) })}
                  icon={DollarSign}
                  helperText="Costo extra para zonas remotas."
                />
              </div>

              <div className="pt-8 border-t border-border-main">
                <div className="flex items-center justify-between bg-bg-muted p-6 rounded-[2rem] border border-border-main transition-all duration-300 hover:border-brand-200 group">
                  <div className="flex items-center gap-4">
                    <NexusCardIcon 
                      icon={CheckCircle2} 
                      variant={config.freeShippingBirds ? 'blue' : 'muted'}
                      isMuted={!config.freeShippingBirds}
                    />
                    <div>
                      <h4 className="text-h2 text-text-main">Envío Gratis</h4>
                      <p className="text-secondary text-text-muted">Anula los costos territoriales en la compra de aves.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setConfig({ ...config, freeShippingBirds: !config.freeShippingBirds })}
                    className={`flex-shrink-0 w-14 h-7 rounded-full transition-all relative active:scale-90 ${
                      config.freeShippingBirds ? 'bg-blue-500 shadow-lg shadow-blue-500/20' : 'bg-stone-300'
                    }`}
                    style={{ transitionTimingFunction: 'var(--ease-emil)' }}
                  >
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-bg-card shadow-sm transition-all ${
                      config.freeShippingBirds ? 'left-8' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </NexusSection>
        </div>

        {/* RESUMEN TERRITORIAL */}
        <NexusSection
          title="Resumen Territorial"
          subtitle="Distribución de estados por zona operativa"
          icon={MapPin}
          iconVariant="emerald"
          delay="600ms"
          action={
            <NexusSectionButton onClick={() => setSubView('zones')} icon={ArrowRight} variant="brand">
              Gestionar Cobertura
            </NexusSectionButton>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <NexusSectionCard
              icon={MapPin}
              iconVariant="emerald"
              title="Cobertura Normal"
              subtitle={`${stats.standard} Estados activos`}
              helperText="Zonas con logística estándar y costo base."
            />
            <NexusSectionCard
              icon={MapPin}
              iconVariant="orange"
              title="Zonas Extendidas"
              subtitle={`${stats.extended} Estados identificados`}
              helperText="Zonas con costos adicionales por difícil acceso."
            />
            <NexusSectionCard
              icon={MapPin}
              iconVariant="muted"
              isMuted={true}
              title="Sin Cobertura"
              subtitle={`${stats.inactive} Estados deshabilitados`}
              helperText="Regiones sin rutas de entrega activas."
            />
          </div>
        </NexusSection>
      </div>
    );
  }
);
