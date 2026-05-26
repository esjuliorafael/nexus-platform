import React, { useEffect, useMemo, useState } from 'react';
import {
  Brain,
  Download,
  Filter,
  Phone,
  Search,
  ShieldAlert,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import {
  RaffleIntelligenceOverview,
  RaffleIntelligenceSegment,
  RaffleParticipantIntelligence,
  RaffleParticipantSegment,
} from '../../../types';
import { apiRaffleIntelligence } from '../../../api';
import { NexusHero } from '../../ui/NexusHero';
import { NexusSection } from '../../ui/NexusSection';
import { NexusAutonomousCard, NexusSectionCard } from '../../ui/NexusCard';
import { NexusHeader } from '../../ui/NexusHeader';
import { NexusInput, NexusSelect } from '../../ui/NexusInputs';
import { NexusSectionButton } from '../../ui/NexusButton';
import { NexusPaginator } from '../../ui/NexusPaginator';
import { NexusSpinner } from '../../ui/NexusSpinner';
import { EmptyState } from '../../ui/EmptyState';

interface RaffleIntelligenceViewProps {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const SEGMENT_LABELS: Record<RaffleParticipantSegment, string> = {
  VIP_PAYERS: 'VIP pagadores',
  REPEAT_ACTIVE: 'Recurrentes activos',
  HIGH_VOLUME: 'Alto volumen',
  PROMISING_NEW: 'Prometedores nuevos',
  DORMANT: 'Dormidos',
  NON_PAYER: 'No pagadores',
  LOW_ACTIVITY: 'Baja actividad',
};

const SEGMENT_DESCRIPTIONS: Record<RaffleParticipantSegment, string> = {
  VIP_PAYERS: 'Participan en varias rifas y pagan con alta consistencia.',
  REPEAT_ACTIVE: 'Repiten participacion y sostienen actividad reciente.',
  HIGH_VOLUME: 'Concentran volumen alto de boletos o ingreso pagado.',
  PROMISING_NEW: 'Primeras participaciones con pago confirmado.',
  DORMANT: 'Tuvieron buen historial, pero llevan tiempo sin participar.',
  NON_PAYER: 'Apartan boletos, pero rara vez terminan pagando.',
  LOW_ACTIVITY: 'Participacion ocasional o informacion aun insuficiente.',
};

const formatMoney = (value: number) => (
  value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
);

const formatRate = (value: number) => `${Math.round(value * 100)}%`;

const formatDate = (value?: string | null) => {
  if (!value) return 'Sin actividad';
  return new Date(value).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getSegmentVariant = (segment: RaffleParticipantSegment) => {
  if (segment === 'VIP_PAYERS') return 'emerald';
  if (segment === 'NON_PAYER') return 'muted';
  if (segment === 'HIGH_VOLUME') return 'blue';
  return 'brand';
};

const MetricCard: React.FC<{
  label: string;
  value: string | number;
  detail: string;
  icon: any;
}> = ({ label, value, detail, icon }) => (
  <NexusAutonomousCard className="h-full">
    <NexusHeader title={label} subtitle={detail} icon={icon} iconVariant="brand" />
    <div className="text-display text-text-main tabular-nums">{value}</div>
  </NexusAutonomousCard>
);

export const RaffleIntelligenceView: React.FC<RaffleIntelligenceViewProps> = ({ showToast }) => {
  const [overview, setOverview] = useState<RaffleIntelligenceOverview | null>(null);
  const [segments, setSegments] = useState<RaffleIntelligenceSegment[]>([]);
  const [participants, setParticipants] = useState<RaffleParticipantIntelligence[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 10, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<RaffleParticipantSegment | ''>('');
  const [state, setState] = useState('');

  const query = useMemo(() => {
    const params: Record<string, any> = { page: meta.page, pageSize: meta.pageSize };
    if (search.trim()) params.search = search.trim();
    if (segment) params.segment = segment;
    if (state) params.state = state;
    return params;
  }, [meta.page, meta.pageSize, search, segment, state]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [overviewData, segmentData, participantData] = await Promise.all([
        apiRaffleIntelligence.getOverview(),
        apiRaffleIntelligence.getSegments(),
        apiRaffleIntelligence.getParticipants(query),
      ]);
      setOverview(overviewData);
      setSegments(segmentData);
      setParticipants(participantData.data);
      setMeta(participantData.meta);
    } catch (error: any) {
      if (error.response?.status === 403) {
        showToast('Solo Superadmin puede consultar inteligencia de rifas', 'error');
      } else {
        showToast('No se pudo cargar la inteligencia de rifas', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [query.search, query.segment, query.state, query.page, query.pageSize]);

  useEffect(() => {
    setMeta((current) => ({ ...current, page: 1 }));
  }, [search, segment, state]);

  const states = useMemo(() => {
    const all = new Set<string>();
    overview?.topStates.forEach((item) => all.add(item.state));
    participants.forEach((item) => all.add(item.state));
    return Array.from(all).filter(Boolean).sort();
  }, [overview, participants]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await apiRaffleIntelligence.exportParticipants({
        search: search.trim() || undefined,
        segment: segment || undefined,
        state: state || undefined,
      });
      showToast('Exportacion generada correctamente');
    } catch (error) {
      showToast('No se pudo exportar la audiencia', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading && !overview) {
    return <NexusSpinner label="Calculando inteligencia de rifas..." />;
  }

  if (!overview) {
    return (
      <EmptyState
        icon={Brain}
        title="Sin inteligencia disponible"
        description="Todavia no hay datos suficientes para calcular segmentos de participantes."
      />
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      <NexusHero
        title={overview.uniqueParticipants.toLocaleString('es-MX')}
        subtitle="Participantes Unicos"
        icon={Brain}
        variant="dark"
        badge="Conversion Global"
        badgeValue={formatRate(overview.paymentConversionRate)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4" style={{ gap: 'var(--space-md)' }}>
        <MetricCard
          label="Ingreso pagado"
          detail="Estimado por boletos liquidados"
          value={formatMoney(overview.estimatedRevenue)}
          icon={Wallet}
        />
        <MetricCard
          label="Boletos pagados"
          detail={`${overview.totalReservedTickets} apartados totales`}
          value={overview.totalPaidTickets.toLocaleString('es-MX')}
          icon={Ticket}
        />
        <MetricCard
          label="Recurrentes"
          detail="Participan en mas de una rifa"
          value={overview.repeatParticipants.toLocaleString('es-MX')}
          icon={TrendingUp}
        />
        <MetricCard
          label="No pagadores"
          detail="Riesgo por abandono de boletos"
          value={overview.nonPayers.toLocaleString('es-MX')}
          icon={ShieldAlert}
        />
      </div>

      <NexusSection
        title="Segmentos de Audiencia"
        subtitle="Grupos automaticos segun comportamiento de pago y recurrencia"
        icon={Sparkles}
        iconVariant="brand"
        action={
          <NexusSectionButton onClick={handleExport} icon={Download} isLoading={isExporting}>
            Exportar Audiencia
          </NexusSectionButton>
        }
      >
        <div className="flex flex-col gap-5">
          {segments.length === 0 ? (
            <EmptyState icon={Users} title="Sin segmentos" description="Cuando existan participantes, se agruparan automaticamente." />
          ) : (
            segments.map((item, idx) => (
              <NexusSectionCard
                key={item.segment}
                delay={`${idx * 60}ms`}
                icon={Users}
                iconVariant={getSegmentVariant(item.segment) as any}
                title={SEGMENT_LABELS[item.segment]}
                subtitle={SEGMENT_DESCRIPTIONS[item.segment]}
                rightContent={
                  <>
                    <p className="text-label text-text-muted/60">Conversion</p>
                    <p className="text-h1 text-brand-600 tabular-nums">{formatRate(item.paymentRate)}</p>
                  </>
                }
                actions={
                  <button
                    onClick={() => setSegment(item.segment)}
                    className="text-label text-text-muted hover:text-brand-600 transition-colors"
                  >
                    Filtrar {item.size}
                  </button>
                }
              />
            ))
          )}
        </div>
      </NexusSection>

      <div className="grid grid-cols-1 xl:grid-cols-2" style={{ gap: 'var(--space-md)' }}>
        <NexusSection title="Estados Fuertes" subtitle="Regiones con mayor valor pagado" icon={TrendingUp} iconVariant="emerald">
          <div className="flex flex-col gap-3">
            {overview.topStates.map((item, idx) => (
              <div key={item.state} className="flex items-center justify-between border border-border-main bg-bg-muted px-5 py-4 rounded-[1.5rem]">
                <div>
                  <p className="text-h2 text-text-main">{idx + 1}. {item.state}</p>
                  <p className="text-label text-text-muted">{item.participants} participantes / {item.paidTickets} boletos pagados</p>
                </div>
                <p className="text-h2 text-brand-600 tabular-nums">{formatMoney(item.revenue)}</p>
              </div>
            ))}
          </div>
        </NexusSection>

        <NexusSection title="Rifas con Mayor Valor" subtitle="Ranking por ingreso confirmado" icon={Ticket} iconVariant="blue">
          <div className="flex flex-col gap-3">
            {overview.topRaffles.map((item, idx) => (
              <div key={item.id} className="flex items-center justify-between border border-border-main bg-bg-muted px-5 py-4 rounded-[1.5rem] gap-4">
                <div className="min-w-0">
                  <p className="text-h2 text-text-main truncate">{idx + 1}. {item.title}</p>
                  <p className="text-label text-text-muted">{item.paidTickets}/{item.reservedTickets} boletos pagados</p>
                </div>
                <p className="text-h2 text-brand-600 tabular-nums shrink-0">{formatMoney(item.revenue)}</p>
              </div>
            ))}
          </div>
        </NexusSection>
      </div>

      <NexusSection
        title="Explorador de Participantes"
        subtitle="Filtro fino para encontrar audiencias exportables"
        icon={Filter}
        iconVariant="muted"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 mb-8" style={{ gap: 'var(--space-md)' }}>
          <NexusInput
            label="Buscar"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            icon={Search}
            placeholder="Nombre, telefono, estado..."
          />
          <NexusSelect label="Segmento" value={segment} onChange={(event) => setSegment(event.target.value as any)}>
            <option value="">Todos los segmentos</option>
            {Object.entries(SEGMENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </NexusSelect>
          <NexusSelect label="Estado" value={state} onChange={(event) => setState(event.target.value)}>
            <option value="">Todos los estados</option>
            {states.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </NexusSelect>
        </div>

        <div className="flex flex-col gap-4">
          {participants.length === 0 ? (
            <EmptyState icon={Users} title="Sin participantes" description="No hay participantes que coincidan con los filtros actuales." />
          ) : (
            participants.map((participant, idx) => (
              <NexusSectionCard
                key={`${participant.phone}-${participant.displayName}`}
                delay={`${idx * 40}ms`}
                icon={Phone}
                iconVariant={getSegmentVariant(participant.segment) as any}
                title={participant.displayName}
                subtitle={
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{participant.phone}</span>
                    <span>/</span>
                    <span>{participant.state}</span>
                    <span>/</span>
                    <span>{SEGMENT_LABELS[participant.segment]}</span>
                  </div>
                }
                rightContent={
                  <>
                    <p className="text-label text-text-muted/60">Score {participant.score}</p>
                    <p className="text-h1 text-brand-600 tabular-nums">{formatMoney(participant.estimatedRevenue)}</p>
                  </>
                }
                actions={
                  <div className="text-right">
                    <p className="text-label text-text-muted">{participant.ticketsPaid}/{participant.ticketsReserved} pagados</p>
                    <p className="text-label text-text-muted/60">{formatRate(participant.paymentRate)} / {formatDate(participant.lastSeenAt)}</p>
                  </div>
                }
              />
            ))
          )}
        </div>

        <NexusPaginator
          currentPage={meta.page}
          totalPages={meta.totalPages}
          onPageChange={(page) => setMeta((current) => ({ ...current, page }))}
        />
      </NexusSection>
    </div>
  );
};
