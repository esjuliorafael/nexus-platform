import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Banknote,
  Briefcase,
  CreditCard,
  LayoutGrid,
  MessageCircle,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { apiChannels } from '../../../api';
import { ChannelsOverview } from '../../../types';
import { NexusHero } from '../../ui/NexusHero';
import { NexusSectionButton, NexusCardButton } from '../../ui/NexusButton';
import { NexusSection } from '../../ui/NexusSection';
import { NexusAutonomousCard, NexusSectionCard } from '../../ui/NexusCard';
import { NexusHeader } from '../../ui/NexusHeader';
import { EmptyState } from '../../ui/EmptyState';

interface ChannelsHubProps {
  onEditPrincipal: () => void;
  onEditChannel: (id: string) => void;
  onCreateChannel: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  setConfirmDialog: (dialog: any) => void;
}

const StatusPill: React.FC<{ ready: boolean; label: string }> = ({ ready, label }) => (
  <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${
    ready
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : 'bg-bg-muted text-text-muted border-border-main'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${ready ? 'bg-emerald-500' : 'bg-text-muted/30'}`} />
    {label}
  </span>
);

const HealthTile: React.FC<{ icon: React.ElementType; label: string; ready: boolean; detail: string }> = ({
  icon: Icon,
  label,
  ready,
  detail,
}) => (
  <div className="bg-bg-muted border border-border-main p-5 rounded-[1.5rem]">
    <div className="flex items-center justify-between gap-4">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
        ready ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'bg-bg-card text-text-muted/30 border border-border-main'
      }`}>
        <Icon size={19} />
      </div>
      <StatusPill ready={ready} label={ready ? 'Listo' : 'Pendiente'} />
    </div>
    <p className="text-secondary text-text-main font-black mt-5">{label}</p>
    <p className="text-label text-text-muted/60 mt-1 truncate">{detail}</p>
  </div>
);

export const ChannelsHub: React.FC<ChannelsHubProps> = ({
  onEditPrincipal,
  onEditChannel,
  onCreateChannel,
  showToast,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<ChannelsOverview | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await apiChannels.getOverview();
      setOverview(data);
    } catch (error) {
      showToast('Error al cargar canales operativos', 'error');
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
        <p className="text-label text-text-muted">Sincronizando canales operativos...</p>
      </div>
    );
  }

  if (!overview) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="Sin overview de canales"
        description="No se pudo construir el mapa operativo de canales."
      />
    );
  }

  const readyCount = overview.principal.readyCount;

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <NexusHero
        title="Canales Operativos"
        subtitle="Cobro, Mensajeria y Fallback"
        icon={LayoutGrid}
        variant="dark"
        badge={readyCount === 4 ? 'Principal listo' : 'Principal incompleto'}
        badgeValue={`${readyCount}/4`}
      />

      <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 'var(--space-md)' }}>
        <NexusAutonomousCard>
          <NexusHeader title="Especializados" subtitle="Overrides activos" icon={Briefcase} iconVariant="brand" />
          <p className="text-display text-text-main tabular-nums">{overview.metrics.specializedCount}</p>
        </NexusAutonomousCard>
        <NexusAutonomousCard>
          <NexusHeader title="WhatsApp" subtitle="Rutas habilitadas" icon={MessageCircle} iconVariant="emerald" />
          <p className="text-display text-text-main tabular-nums">{overview.metrics.whatsappRoutes}</p>
        </NexusAutonomousCard>
        <NexusAutonomousCard>
          <NexusHeader title="Mercado Pago" subtitle="Pasarelas vinculadas" icon={CreditCard} iconVariant="blue" />
          <p className="text-display text-text-main tabular-nums">{overview.metrics.mercadoPagoRoutes}</p>
        </NexusAutonomousCard>
      </div>

      <NexusSection
        title="Canal Principal"
        subtitle="Fallback para tienda general, pedidos mixtos y flujos sin canal especializado"
        icon={ShieldCheck}
        iconVariant={readyCount === 4 ? 'emerald' : 'brand'}
        action={
          <NexusSectionButton onClick={onEditPrincipal} icon={ArrowRight}>
            Administrar
          </NexusSectionButton>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4" style={{ gap: 'var(--space-md)' }}>
          <HealthTile
            icon={Banknote}
            label="Informacion bancaria"
            ready={overview.principal.bank.ready}
            detail={overview.principal.bank.ready ? `${overview.principal.bank.bank} / ${overview.principal.bank.beneficiary}` : 'Banco principal pendiente'}
          />
          <HealthTile
            icon={CreditCard}
            label="Mercado Pago"
            ready={overview.principal.mercadoPago.ready}
            detail={overview.principal.mercadoPago.ready ? `Usuario ${overview.principal.mercadoPago.userId || 'vinculado'}` : 'Pasarela principal pendiente'}
          />
          <HealthTile
            icon={MessageCircle}
            label="WhatsApp"
            ready={overview.principal.whatsapp.ready}
            detail={overview.principal.whatsapp.ready ? (overview.principal.whatsapp.phone || overview.principal.whatsapp.instanceName) : 'Numero principal pendiente'}
          />
          <HealthTile
            icon={Sparkles}
            label="Plantillas"
            ready={overview.principal.templates.ready}
            detail={overview.principal.templates.ready ? 'Mensajes principales configurados' : 'Plantillas base pendientes'}
          />
        </div>
      </NexusSection>

      <NexusSection
        title="Canales Especializados"
        subtitle="Sobrescriben el Canal Principal cuando el flujo coincide con su proposito"
        icon={Activity}
        iconVariant="brand"
        action={
          <NexusSectionButton onClick={onCreateChannel} icon={PlusCircle} variant="brand">
            Nuevo Canal
          </NexusSectionButton>
        }
      >
        {overview.specialized.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="Sin canales especializados"
            description="El sistema usara el Canal Principal para todos los cobros y mensajes hasta que crees un canal por proposito."
            action={
              <NexusSectionButton onClick={onCreateChannel} icon={PlusCircle}>
                Crear Canal
              </NexusSectionButton>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {overview.specialized.map((channel, idx) => {
              return (
                <NexusSectionCard
                  key={channel.purpose}
                  delay={`${idx * 70}ms`}
                  icon={Briefcase}
                  iconVariant={channel.readyCount >= 3 ? 'brand' : 'muted'}
                  title={channel.name}
                  subtitle={
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-label text-text-muted/60">{channel.label}</span>
                      <span className="text-label text-brand-500">{channel.usesPrincipalFallback ? 'Usa principal donde falte configuracion' : 'Ruta especializada completa'}</span>
                    </span>
                  }
                  rightContent={
                    <div className="flex items-center gap-2">
                      <StatusPill ready={channel.bank.ready} label="Banco" />
                      <StatusPill ready={channel.mercadoPago.ready} label="MP" />
                      <StatusPill ready={channel.whatsapp.ready} label="WA" />
                      <StatusPill ready={channel.templates.ready} label="Tpl" />
                    </div>
                  }
                  actions={
                    <NexusCardButton onClick={() => onEditChannel(channel.id)} icon={ArrowRight} variant="secondary">
                      Administrar
                    </NexusCardButton>
                  }
                  onEdit={() => onEditChannel(channel.id)}
                />
              );
            })}
          </div>
        )}
      </NexusSection>

      <NexusSection
        title="Matriz de Entrega"
        subtitle="Mapa de fallback para cobros y notificaciones"
        icon={WalletCards}
        iconVariant="muted"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {overview.deliveryMatrix.map(({ flow, route, detail }) => (
            <div key={flow} className="border border-border-main bg-bg-muted rounded-[1.5rem] p-5 flex items-center justify-between gap-5">
              <div>
                <p className="text-h2 text-text-main">{flow}</p>
                <p className="text-label text-text-muted/60 mt-1">{detail}</p>
              </div>
              <div className="text-right">
                <p className="text-label text-brand-600">{route}</p>
                <p className="text-label text-text-muted/50 mt-1">Banco / WA / Plantilla</p>
              </div>
            </div>
          ))}
        </div>
      </NexusSection>

    </div>
  );
};
