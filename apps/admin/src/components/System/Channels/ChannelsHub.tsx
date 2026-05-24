import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  LayoutGrid, 
  PlusCircle, 
  CreditCard, 
  MessageCircle,
  Activity,
  ArrowRight
} from 'lucide-react';
import { apiPayments, apiWhatsApp } from '../../../api';
import { SalesChannel, WhatsAppChannel } from '../../../types';
import { NexusHero } from '../../ui/NexusHero';
import { NexusButton } from '../../ui/NexusButton';
import { NexusSection } from '../../ui/NexusSection';
import { NexusSectionCard } from '../../ui/NexusCard';
import { EmptyState } from '../../ui/EmptyState';
import { GlobalSettingsPanel } from './GlobalSettingsPanel';

interface ChannelsHubProps {
  onEditChannel: (id: string) => void;
  onCreateChannel: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  setConfirmDialog: (dialog: any) => void;
}

export const ChannelsHub: React.FC<ChannelsHubProps> = ({ 
  onEditChannel, 
  onCreateChannel, 
  showToast, 
  setConfirmDialog 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [waChannels, setWaChannels] = useState<WhatsAppChannel[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [payments, whatsapp] = await Promise.all([
        apiPayments.getAll(),
        apiWhatsApp.getAll()
      ]);
      setChannels(payments);
      setWaChannels(whatsapp);
    } catch (error) {
      showToast('Error al cargar ecosistema', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 animate-in fade-in duration-500">
         <div className="relative w-20 h-20 mb-8">
            <div className="absolute inset-0 border-4 border-brand-100 rounded-[2rem]" />
            <div className="absolute inset-0 border-4 border-brand-500 border-t-transparent rounded-[2rem] animate-spin" style={{ animationDuration: '1s', animationTimingFunction: 'var(--ease-emil)' }} />
         </div>
         <p className="text-label text-text-muted">Sincronizando Ecosistema...</p>
      </div>
    );
  }

  const allPurposes = Array.from(new Set([
    ...channels.map(c => c.purpose),
    ...waChannels.map(c => c.purpose)
  ]));

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-700">
      
      <NexusHero 
        title="Canales de Venta"
        subtitle="Centro de Control"
        icon={LayoutGrid}
        variant="dark"
        badge="Departamentos"
        badgeValue={allPurposes.length.toString()}
      />

      {allPurposes.length === 0 ? (
        <EmptyState 
          icon={Briefcase}
          title="Sin Departamentos"
          description="Aún no has configurado ningún canal. Comienza creando uno para segmentar tus pagos y mensajería."
          action={
            <NexusButton onClick={onCreateChannel} icon={PlusCircle} className="shadow-lg shadow-brand-500/20">
              Crear Primer Canal
            </NexusButton>
          }
        />
      ) : (
        <NexusSection
          title="Estructura de Negocio"
          subtitle="Unidades operativas con identidad y pasarelas propias"
          icon={Activity}
          iconVariant="brand"
          action={
            <NexusButton onClick={onCreateChannel} icon={PlusCircle} size="sm" className="shadow-lg shadow-brand-500/20">
              Nuevo Departamento
            </NexusButton>
          }
        >
          <div className="grid grid-cols-1 gap-6">
            {allPurposes.map((purpose, idx) => {
              const payment = channels.find(c => c.purpose === purpose);
              const whatsapp = waChannels.find(c => c.purpose === purpose);
              const name = payment?.name || whatsapp?.name || purpose;
              const id = payment?.id || whatsapp?.id || '';
              const isHealthy = payment?.mpAccessToken && whatsapp?.active;

              return (
                <NexusSectionCard
                  key={purpose}
                  delay={`${idx * 70}ms`}
                  icon={Briefcase}
                  iconVariant={isHealthy ? 'brand' : 'muted'}
                  title={name}
                  subtitle={
                    <span className="flex items-center gap-2">
                      <span className="text-label text-text-muted/60">REF: {purpose}</span>
                      <span className="w-1 h-1 rounded-full bg-border-main" />
                      <span className={`text-[9px] font-black uppercase tracking-widest ${isHealthy ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {isHealthy ? '100% Operativo' : 'Configuración Pendiente'}
                      </span>
                    </span>
                  }
                  rightContent={
                    <div className="flex items-center gap-4">
                      {/* Health Matrix */}
                      <div className="flex gap-2 p-2 bg-bg-muted rounded-[1.5rem] border border-border-main">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 ${payment ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/10' : 'bg-white text-text-muted/10'}`}>
                          <CreditCard size={20} />
                        </div>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 ${whatsapp?.active ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/10' : 'bg-white text-text-muted/10'}`}>
                          <MessageCircle size={20} />
                        </div>
                      </div>
                      <NexusButton variant="ghost" size="icon" onClick={() => onEditChannel(id)} icon={ArrowRight} className="hover:bg-brand-50" />
                    </div>
                  }
                  onEdit={() => onEditChannel(id)}
                />
              );
            })}
          </div>
        </NexusSection>
      )}

      <GlobalSettingsPanel showToast={showToast} />
    </div>
  );
};
