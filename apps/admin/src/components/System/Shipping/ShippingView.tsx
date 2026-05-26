import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Settings, MapPin, ChevronRight, Save, Truck, Info, AlertCircle, CheckCircle2, Package, Bird, Loader2, Globe, ShieldCheck, Box, DollarSign, Wallet, History, FileText, ArrowRight } from 'lucide-react';
import { ShippingConfig, StateZone, ShippingZone } from '../../../types';
import { apiSystem } from '../../../api';
import { NexusSectionButton, NexusCardButton } from '../../ui/NexusButton';
import { NexusInput } from '../../ui/NexusInputs';
import { NexusHero } from '../../ui/NexusHero';
import { NexusSection } from '../../ui/NexusSection';
import { NexusSectionCard } from '../../ui/NexusCard';
import { EmptyState } from '../../ui/EmptyState';

interface ShippingViewProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
  subView: 'config' | 'zones';
  setSubView: (view: 'config' | 'zones') => void;
}

export const ShippingView = forwardRef<{ handleSaveConfig: () => void; handleSaveZones: () => void }, ShippingViewProps>(
  ({ showToast, subView, setSubView }, ref) => {
    
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

    const toggleStateZone = (id: string) => {
      setLocalStates(prev => prev.map(s => 
        s.id === id ? { ...s, zone: s.zone === 'STANDARD' ? 'EXTENDED' : 'STANDARD' } : s
      ));
    };

    const toggleStateActive = (id: string) => {
      setLocalStates(prev => prev.map(s => 
        s.id === id ? { ...s, active: !s.active } : s
      ));
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
                <NexusSectionButton onClick={() => updateAllZones('STANDARD')} variant="secondary" className="hidden sm:flex">
                  Habilitar Todos (Normal)
                </NexusSectionButton>
                <NexusSectionButton onClick={() => setSubView('config')} variant="brand">
                  Volver
                </NexusSectionButton>
              </div>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {localStates.map((state, idx) => (
                <NexusSectionCard
                  key={state.id}
                  delay={`${idx * 40}ms`}
                  icon={MapPin}
                  iconVariant={!state.active ? 'muted' : state.zone === 'STANDARD' ? 'emerald' : 'orange'}
                  isMuted={!state.active}
                  title={state.name || `Estado #${state.id}`}
                  subtitle={
                    <span className={`text-secondary font-bold ${!state.active ? 'text-text-muted' : state.zone === 'STANDARD' ? 'text-emerald-600' : 'text-orange-600'}`}>
                      {!state.active ? 'Sin Cobertura' : state.zone === 'STANDARD' ? 'Zona Normal' : 'Zona Extendida'}
                    </span>
                  }
                  actions={
                    <div className="flex items-center gap-4">
                      {/* Toggle para Tipo de Zona */}
                      {state.active && (
                        <NexusCardButton 
                          onClick={() => toggleStateZone(state.id)}
                          variant={state.zone === 'STANDARD' ? 'secondary' : 'brand'}
                        >
                          {state.zone === 'STANDARD' ? 'Normal' : 'Extendida'}
                        </NexusCardButton>
                      )}
                      
                      {/* Switch para Activo/Inactivo */}
                      <div className="flex items-center gap-3 pl-4 border-l border-border-main">
                        <span className="text-[10px] font-black uppercase text-stone-400 tracking-widest hidden sm:inline">Visible</span>
                        <button 
                          onClick={() => toggleStateActive(state.id)}
                          className={`w-12 h-6 rounded-full transition-all relative active:scale-90 ${
                            state.active ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30' : 'bg-stone-200'
                          }`}
                          style={{ transitionTimingFunction: 'var(--ease-emil)' }}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-bg-card shadow-sm transition-all ${
                            state.active ? 'left-7' : 'left-1'
                          }`} />
                        </button>
                      </div>
                    </div>
                  }
                />
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
            title="Artículos y Productos"
            subtitle="Gestión de costos base para paquetería"
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
                  helperText="Tarifa fija por envío de accesorios o productos generales."
                />
              </div>

              <div className="pt-8 border-t border-border-main">
                <div className="flex items-center justify-between bg-bg-muted p-6 rounded-[2rem] border border-border-main transition-all duration-300 hover:border-brand-200 group">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 ${config.freeShippingArticles ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'bg-bg-card text-text-muted border border-border-main'}`}>
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <h4 className="text-h2 text-text-main">Envío Gratis</h4>
                      <p className="text-secondary text-text-muted">Habilitar gratuidad en productos de paquetería</p>
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
            title="Ejemplares y Aves"
            subtitle="Tarifas territoriales especializadas"
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
                  helperText="Tarifa estándar para regiones de cobertura base."
                />
                <NexusInput 
                  label="Costo Zona Extendida"
                  type="number"
                  value={config.costExtendedZone.toString()}
                  disabled={config.freeShippingBirds}
                  onChange={(e) => setConfig({ ...config, costExtendedZone: Number(e.target.value) })}
                  icon={DollarSign}
                  helperText="Costo para zonas de difícil acceso."
                />
              </div>

              <div className="pt-8 border-t border-border-main">
                <div className="flex items-center justify-between bg-bg-muted p-6 rounded-[2rem] border border-border-main transition-all duration-300 hover:border-brand-200 group">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 ${config.freeShippingBirds ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'bg-bg-card text-text-muted border border-border-main'}`}>
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <h4 className="text-h2 text-text-main">Envío Gratis</h4>
                      <p className="text-secondary text-text-muted">Habilitar gratuidad en envíos de ejemplares</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setConfig({ ...config, freeShippingBirds: !config.freeShippingBirds })}
                    className={`flex-shrink-0 w-14 h-7 rounded-full transition-all relative active:scale-90 ${
                      config.freeShippingBirds ? 'bg-brand-500 shadow-lg shadow-brand-500/20' : 'bg-stone-300'
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
          subtitle="Distribución de estados por zona"
          icon={MapPin}
          iconVariant="emerald"
          delay="600ms"
          action={
            <NexusSectionButton onClick={() => setSubView('zones')} icon={ArrowRight} variant="brand">
              Configurar Zonas
            </NexusSectionButton>
          }
        >
          <div className="bg-stone-900 rounded-[var(--radius-outer)] p-8 sm:p-12 text-white relative overflow-hidden group/hero shadow-2xl shadow-stone-900/40">
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full -mr-32 -mt-32 blur-[100px] pointer-events-none group-hover/hero:scale-125 transition-transform duration-1000" />
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-12 relative z-10">
              <div className="flex items-center gap-12 sm:gap-20">
                <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <span className="text-label uppercase tracking-[0.3em] text-text-muted">Zona Normal</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-hero tabular-nums">{stats.standard}</span>
                    <span className="text-secondary text-text-muted font-bold">Estados</span>
                  </div>
                </div>
                
                <div className="w-[1px] h-16 bg-white/10 hidden sm:block" />
                
                <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <span className="text-label uppercase tracking-[0.3em] text-text-muted">Zona Extendida</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-hero tabular-nums text-orange-400">{stats.extended}</span>
                    <span className="text-secondary text-text-muted font-bold">Estados</span>
                  </div>
                </div>

                <div className="w-[1px] h-16 bg-white/10 hidden sm:block" />

                <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <span className="text-label uppercase tracking-[0.3em] text-text-muted">Inactivos</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-hero tabular-nums text-stone-500">{stats.inactive}</span>
                    <span className="text-secondary text-text-muted font-bold">Estados</span>
                  </div>
                </div>
              </div>

              <div className="w-full sm:w-auto">
                <NexusSectionButton 
                  onClick={() => setSubView('zones')}
                  variant="brand"
                  className="w-full sm:px-12 bg-white text-stone-900 hover:bg-stone-100 border-none h-16 text-lg"
                >
                  Gestionar Cobertura
                </NexusSectionButton>
              </div>
            </div>
          </div>
        </NexusSection>
      </div>
    );
  }
);
