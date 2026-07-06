import React, { useState, useImperativeHandle, forwardRef, useEffect, useMemo } from 'react';
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
import { NexusSwitch } from '../../ui/NexusSwitch';
import { NexusSegmentedControl } from '../../ui/NexusSegmentedControl';

interface ShippingViewProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
  subView: 'config' | 'zones';
  setSubView: (view: 'config' | 'zones') => void;
  setConfirmDialog: (config: any) => void;
}

const stateNameCollator = new Intl.Collator('es-MX', {
  sensitivity: 'base',
  numeric: true,
});

const sortStateZones = (zones: StateZone[]) =>
  [...zones].sort((a, b) => stateNameCollator.compare(a.name, b.name));

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

          const sortedZones = sortStateZones(zonesData);
          setStates(sortedZones);
          setLocalStates(sortedZones);

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
        const sortedStates = sortStateZones(localStates);
        setStates(sortedStates);
        setLocalStates(sortedStates);
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
    const sortedLocalStates = useMemo(() => sortStateZones(localStates), [localStates]);

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-40 animate-in fade-in duration-500">
           <div className="relative w-20 h-20 mb-8">
              <div className="absolute inset-0 border-4 border-brand-100" style={{ borderRadius: 'var(--radius-inner-visual)' }} />
              <div className="absolute inset-0 border-4 border-brand-500 border-t-transparent animate-spin" style={{ borderRadius: 'var(--radius-inner-visual)', animationDuration: '1s', animationTimingFunction: 'var(--ease-emil)' }} />
           </div>
           <p className="text-label text-text-muted">Analizando Red de Logística...</p>
        </div>
      );
    }

    if (subView === 'zones') {
      return (
        <div key="shipping-zones-content" className="flex flex-col animate-in fade-in duration-300" style={{ gap: 'var(--space-lg)', paddingBottom: 'var(--space-xl)' }}>
          
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
              <div className="flex" style={{ gap: 'var(--space-sm)' }}>
                <NexusSectionButton onClick={handleMassiveAction} variant="secondary" className="hidden sm:flex">
                  {allAreStandard ? 'Todos a Extendida' : 'Todos a Normal'}
                </NexusSectionButton>
                <NexusSectionButton onClick={() => setSubView('config')} variant="brand">
                  Volver
                </NexusSectionButton>
              </div>
            }
          >
            <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 'var(--space-md)' }}>
              {sortedLocalStates.map((state, idx) => (
                <NexusControlRow
                  key={state.id}
                  delay={`${idx * 20}ms`}
                  title={state.name}
                  isMuted={!state.active}
                  statusColor={!state.active ? 'bg-stone-300' : state.zone === 'STANDARD' ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-orange-500 shadow-sm shadow-orange-500/50'}
                  actions={
                    <>
                      {/* Pill Selector (Left side on mobile) */}
                      {state.active ? (
                        <NexusSegmentedControl
                          value={state.zone}
                          ariaLabel={`Tipo de cobertura para ${state.name}`}
                          onChange={(zone) => toggleStateZone(state.id, zone)}
                          options={[
                            { value: 'STANDARD', label: 'Normal', activeClassName: 'bg-white text-emerald-600 shadow-sm' },
                            { value: 'EXTENDED', label: 'Extra', activeClassName: 'bg-white text-orange-600 shadow-sm' },
                          ]}
                        />
                      ) : (
                        <span className="text-label font-black uppercase text-stone-300 tracking-widest">Sin Cobertura</span>
                      )}
                      
                      {/* Switch (Right side on mobile) */}
                      <NexusSwitch
                        checked={state.active}
                        onChange={() => toggleStateActive(state.id)}
                        activeClassName="bg-emerald-500 shadow-sm shadow-emerald-500/30"
                        aria-label={state.active ? `Desactivar cobertura para ${state.name}` : `Activar cobertura para ${state.name}`}
                      />
                    </>
                  }
                />
              ))}
            </div>
          </NexusSection>
        </div>
      );
    }

    return (
      <div key="shipping-config-content" className="flex flex-col animate-in fade-in duration-300" style={{ gap: 'var(--space-lg)', paddingBottom: 'var(--space-xl)' }}>
        
        <NexusHero
          title="Logística y Envíos"
          subtitle="Configuración de Costos y Umbrales"
          icon={Truck}
          variant="dark"
          badge="Modo Activo"
          badgeValue="Tarifas Dinámicas"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 'var(--space-lg)' }}>
          {/* SECCIÓN ARTÍCULOS */}
          <NexusSection
            title="Envíos de Artículos"
            subtitle="Gestión de costo base de envío"
            icon={Package}
            iconVariant="brand"
            delay="200ms"
          >
            <div className="flex flex-col" style={{ gap: 'var(--space-lg)' }}>
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

              <div className="border-t border-border-main" style={{ paddingTop: 'var(--space-lg)' }}>
                <div
                  className="bg-bg-muted border border-border-main transition-all duration-300 hover:border-brand-200 group"
                  style={{ borderRadius: 'var(--radius-inner-visual)', padding: 'var(--space-md)' }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between" style={{ gap: 'var(--space-md)' }}>
                    <div className="flex items-center" style={{ gap: 'var(--space-md)' }}>
                      <NexusCardIcon 
                        icon={CheckCircle2} 
                        variant={config.freeShippingArticles ? 'solid-brand' : 'muted'}
                        isMuted={!config.freeShippingArticles}
                      />
                      <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                        <h4 className="text-h2 text-text-main">Envío Gratis</h4>
                        <p className="text-secondary text-text-muted">Anula el costo base en la compra de artículos.</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-[var(--space-sm)] sm:pt-0 border-t sm:border-t-0 border-border-main/30 w-full sm:w-auto">
                      <span className="text-label font-black uppercase text-stone-400 tracking-widest sm:hidden">
                        Modo de Operación
                      </span>
                      <div className="flex flex-col items-center" style={{ gap: 'var(--space-xs)' }}>
                        <NexusSwitch
                          checked={config.freeShippingArticles}
                          onChange={() => setConfig({ ...config, freeShippingArticles: !config.freeShippingArticles })}
                          activeClassName="bg-brand-500 shadow-sm shadow-brand-500/30"
                          aria-label={config.freeShippingArticles ? 'Desactivar envio gratis de articulos' : 'Activar envio gratis de articulos'}
                        />
                        <span className={`text-label uppercase tracking-[0.15em] transition-colors duration-500 ${config.freeShippingArticles ? 'text-text-muted' : 'text-text-muted/40'}`}>
                          {config.freeShippingArticles ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>
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
            <div className="flex flex-col" style={{ gap: 'var(--space-lg)' }}>
              <div className={`grid grid-cols-1 sm:grid-cols-2 transition-all duration-500 ${config.freeShippingBirds ? 'opacity-40 grayscale pointer-events-none' : ''}`} style={{ gap: 'var(--space-md)' }}>
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

              <div className="border-t border-border-main" style={{ paddingTop: 'var(--space-lg)' }}>
                <div
                  className="bg-bg-muted border border-border-main transition-all duration-300 hover:border-brand-200 group"
                  style={{ borderRadius: 'var(--radius-inner-visual)', padding: 'var(--space-md)' }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between" style={{ gap: 'var(--space-md)' }}>
                    <div className="flex items-center" style={{ gap: 'var(--space-md)' }}>
                      <NexusCardIcon 
                        icon={CheckCircle2} 
                        variant={config.freeShippingBirds ? 'blue' : 'muted'}
                        isMuted={!config.freeShippingBirds}
                      />
                      <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                        <h4 className="text-h2 text-text-main">Envío Gratis</h4>
                        <p className="text-secondary text-text-muted">Anula los costos territoriales en la compra de aves.</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-[var(--space-sm)] sm:pt-0 border-t sm:border-t-0 border-border-main/30 w-full sm:w-auto">
                      <span className="text-label font-black uppercase text-stone-400 tracking-widest sm:hidden">
                        Modo de Operación
                      </span>
                      <div className="flex flex-col items-center" style={{ gap: 'var(--space-xs)' }}>
                        <NexusSwitch
                          checked={config.freeShippingBirds}
                          onChange={() => setConfig({ ...config, freeShippingBirds: !config.freeShippingBirds })}
                          activeClassName="bg-blue-500 shadow-sm shadow-blue-500/30"
                          aria-label={config.freeShippingBirds ? 'Desactivar envio gratis de aves' : 'Activar envio gratis de aves'}
                        />
                        <span className={`text-label uppercase tracking-[0.15em] transition-colors duration-500 ${config.freeShippingBirds ? 'text-text-muted' : 'text-text-muted/40'}`}>
                          {config.freeShippingBirds ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>
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
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 'var(--space-md)' }}>
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
