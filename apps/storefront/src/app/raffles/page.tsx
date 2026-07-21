"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Activity,
  Banknote,
  BellRing,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Compass,
  CreditCard,
  Hash,
  Layers3,
  ListChecks,
  Search,
  Share2,
  Ticket,
  TicketCheck,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { raffleApi } from "../../api/raffles";
import { Raffle, RaffleRecentResult } from "../../types";
import { Spinner } from "../../components/ui/Spinner";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";
import { StorefrontCard } from "../../components/ui/Card";
import { StorefrontIcon } from "../../components/ui/Icon";
import { StorefrontPaginator } from "../../components/ui/Paginator";
import { StorefrontCatalogToolbar } from "../../components/ui/CatalogToolbar";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { StorefrontModal } from "../../components/ui/Modal";
import {
  StorefrontReveal,
  StorefrontRevealGroup,
  StorefrontRevealItem,
} from "../../components/ui/Reveal";
import {
  RaffleCatalogFilterPanel,
  type RaffleCatalogType,
} from "../../components/raffle/RaffleCatalogFilterPanel";
import {
  RaffleOpeningReminderContent,
  useRaffleOpeningReminder,
} from "../../components/raffle/RaffleOpeningReminderCard";
import { useSettings } from "../../hooks/useSettings";
import { useToastStore } from "../../store/toast.store";
import {
  useStorefrontRouteReadiness,
  useStorefrontRouteRevealEpoch,
} from "../../components/layout/StorefrontRouteMotionContext";
import { formatPrice } from "../../utils/formatters";
import { formatCalendarDate } from "../../utils/calendarDate";
import {
  HERO_MOTION_SEQUENCE_MS,
  STOREFRONT_EASING,
  STOREFRONT_MOTION_MS,
  toMotionSeconds,
} from "../../lib/motion";

const RAFFLES_PER_PAGE = 6;
const MAX_FEATURED_RAFFLES = 3;
const FEATURED_ROTATION_MS = 8_000;
const DEFAULT_RAFFLE_TYPE: RaffleCatalogType = "ALL";

export default function RafflesPage() {
  const { isModuleEnabled } = useSettings();
  const routeRevealEpoch = useStorefrontRouteRevealEpoch();
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [recentResults, setRecentResults] = useState<RaffleRecentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [raffleType, setRaffleType] = useState<RaffleCatalogType>(DEFAULT_RAFFLE_TYPE);
  const [draftRaffleType, setDraftRaffleType] = useState<RaffleCatalogType>(DEFAULT_RAFFLE_TYPE);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [participationClock, setParticipationClock] = useState(() => Date.now());
  const showToast = useToastStore((state) => state.showToast);
  useStorefrontRouteReadiness("/raffles", !loading);

  useEffect(() => {
    const timer = window.setInterval(() => setParticipationClock(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const isRaffleEnabled =
    isModuleEnabled("raffle_enabled") || process.env.NEXT_PUBLIC_RAFFLE_ENABLED === "true";

  useEffect(() => {
    const loadRaffles = async () => {
      if (!isRaffleEnabled) {
        setLoading(false);
        return;
      }

      try {
        const [data, results] = await Promise.all([
          raffleApi.getAll(),
          raffleApi.getRecentResults().catch(() => []),
        ]);
        setRaffles(Array.isArray(data) ? data : []);
        setRecentResults(Array.isArray(results) ? results : []);
      } catch (error) {
        console.error("Error loading raffles:", error);
      } finally {
        setLoading(false);
      }
    };

    void loadRaffles();
  }, [isRaffleEnabled]);

  useEffect(() => {
    if (!isRaffleEnabled || typeof EventSource === "undefined") return;

    let refreshTimer: number | undefined;
    const refreshCatalog = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        void raffleApi.getAll().then((data) => {
          if (Array.isArray(data)) setRaffles(data);
        });
      }, 240);
    };

    const eventSource = new EventSource(raffleApi.getCatalogAvailabilityEventsUrl());
    eventSource.addEventListener("availability-changed", refreshCatalog);

    return () => {
      window.clearTimeout(refreshTimer);
      eventSource.removeEventListener("availability-changed", refreshCatalog);
      eventSource.close();
    };
  }, [isRaffleEnabled]);

  const upcomingRaffles = useMemo(
    () =>
      raffles
        .filter((raffle) => isUpcomingRaffle(raffle, participationClock))
        .sort((left, right) => {
          const leftStart = left.participationStartsAt
            ? new Date(left.participationStartsAt).getTime()
            : Number.MAX_SAFE_INTEGER;
          const rightStart = right.participationStartsAt
            ? new Date(right.participationStartsAt).getTime()
            : Number.MAX_SAFE_INTEGER;
          return leftStart - rightStart;
        }),
    [participationClock, raffles],
  );

  const featuredRaffles = useMemo(
    () =>
      raffles
        .filter((raffle) => raffle.featured && raffle.status === "ACTIVE")
        .sort(
          (left, right) =>
            (left.featuredOrder ?? Number.MAX_SAFE_INTEGER) -
            (right.featuredOrder ?? Number.MAX_SAFE_INTEGER),
        )
        .slice(0, MAX_FEATURED_RAFFLES),
    [raffles],
  );

  const normalizedQuery = normalizeSearch(searchTerm);
  const isExploringCatalog = normalizedQuery.length > 0 || raffleType !== DEFAULT_RAFFLE_TYPE;
  const filteredRaffles = useMemo(() => {
    return raffles.filter((raffle) => {
      const isOpportunityRaffle = raffle.opportunities > 1;
      const matchesType =
        raffleType === "ALL" ||
        (raffleType === "SIMPLE" && !isOpportunityRaffle) ||
        (raffleType === "OPPORTUNITIES" && isOpportunityRaffle);
      const matchesSearch =
        normalizedQuery.length === 0 ||
        normalizeSearch(`${raffle.title} ${raffle.description ?? ""}`).includes(normalizedQuery);

      return matchesType && matchesSearch;
    });
  }, [normalizedQuery, raffleType, raffles]);

  const totalPages = Math.max(1, Math.ceil(filteredRaffles.length / RAFFLES_PER_PAGE));
  const visibleRaffles = useMemo(
    () => filteredRaffles.slice((page - 1) * RAFFLES_PER_PAGE, page * RAFFLES_PER_PAGE),
    [filteredRaffles, page],
  );
  const hasActiveFilters = raffleType !== DEFAULT_RAFFLE_TYPE;
  const showFeaturedStage = featuredRaffles.length > 0 && !isExploringCatalog;

  useEffect(() => {
    setPage(1);
  }, [raffleType, searchTerm]);

  useEffect(() => {
    if (featuredIndex >= featuredRaffles.length) setFeaturedIndex(0);
  }, [featuredIndex, featuredRaffles.length]);

  useEffect(() => {
    if (!showFeaturedStage || featuredRaffles.length < 2) return;
    const timer = window.setInterval(
      () => setFeaturedIndex((current) => (current + 1) % featuredRaffles.length),
      FEATURED_ROTATION_MS,
    );
    return () => window.clearInterval(timer);
  }, [featuredRaffles.length, showFeaturedStage]);

  const openFilters = () => {
    setDraftRaffleType(raffleType);
    setIsFilterPanelOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setRaffleType(DEFAULT_RAFFLE_TYPE);
    setDraftRaffleType(DEFAULT_RAFFLE_TYPE);
    setIsFilterPanelOpen(false);
  };

  const shareRaffle = async (raffle: Raffle) => {
    const url = `${window.location.origin}/raffles/${raffle.id}`;
    const shareData = {
      title: raffle.title,
      text: `Consulta la rifa “${raffle.title}”.`,
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error: any) {
        if (error?.name === "AbortError") return;
      }
    }

    try {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareData.text} ${url}`)}`;
      const whatsappWindow = window.open(whatsappUrl, "_blank");
      if (whatsappWindow) {
        whatsappWindow.opener = null;
        showToast("Abrimos WhatsApp con el enlace de la rifa.", {
          type: "success",
          title: "Listo para compartir",
          durationMs: 2800,
        });
        return;
      }

      await copyTextToClipboard(url);
      showToast("El enlace de la rifa está listo para compartir.", {
        type: "success",
        title: "Enlace copiado",
        durationMs: 2800,
      });
    } catch (error: any) {
      showToast("No pudimos compartir la rifa. Inténtalo nuevamente.", {
        type: "error",
        title: "No se pudo compartir",
      });
    }
  };

  if (!isRaffleEnabled) {
    return (
      <main
        className="flex min-h-[60vh] items-center justify-center px-[var(--sf-inset-page)]"
        style={{
          paddingTop: "var(--sf-space-xl)",
          paddingBottom: "var(--sf-mobile-chrome-content-padding-bottom)",
        }}
      >
        <div className="mx-auto max-w-2xl text-center">
          <div className="flex flex-col items-center" style={{ gap: "var(--sf-space-md)" }}>
            <StorefrontIcon icon={Ticket} context="section" variant="muted" />
            <h1 className="sf-text-display text-stone-850">Módulo desactivado</h1>
            <p className="sf-text-body max-w-md text-stone-500">
              El módulo de rifas no está activo en este momento. Vuelve pronto para conocer
              nuestros próximos sorteos.
            </p>
            <Button asChild variant="outline" context="section">
              <Link href="/">Volver al inicio</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div
      key={routeRevealEpoch}
      className="mx-auto max-w-[var(--sf-max-width-content)] px-[var(--sf-inset-page)]"
      style={{
        paddingTop: "var(--sf-store-content-padding-top)",
        paddingBottom: "var(--sf-mobile-chrome-content-padding-bottom)",
      }}
    >
      {loading ? (
        <div
          className="fixed inset-0 z-[290] bg-[var(--sf-bg-app)] md:static md:flex md:h-[70svh] md:items-center md:justify-center md:bg-transparent"
          aria-busy="true"
          aria-label="Preparando cartelera de rifas"
        >
          <Spinner className="hidden h-12 w-12 md:block" />
        </div>
      ) : raffles.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Sin sorteos activos"
          description="Actualmente no tenemos ninguna rifa activa. Vuelve pronto para conocer nuestros próximos sorteos."
        />
      ) : (
        <div className="flex flex-col gap-[var(--sf-space-lg)] md:gap-[var(--sf-space-xl)]">
          {showFeaturedStage ? (
            <FeaturedRaffleStage
              raffles={featuredRaffles}
              activeIndex={featuredIndex}
              now={participationClock}
              onChange={setFeaturedIndex}
              onShare={shareRaffle}
            />
          ) : (
            <StorefrontReveal cadence="editorial">
              <header className="flex max-w-2xl flex-col" style={{ gap: "var(--sf-space-sm)" }}>
                <h1 className="sf-text-display text-stone-950">Rifas</h1>
                <p className="sf-text-body text-stone-500">
                  Consulta las participaciones disponibles y elige tus números.
                </p>
              </header>
            </StorefrontReveal>
          )}

          {upcomingRaffles.length > 0 && !isExploringCatalog && (
            <UpcomingRafflesShelf raffles={upcomingRaffles} now={participationClock} />
          )}

          <section className="flex flex-col" style={{ gap: "var(--sf-space-md)" }}>
            <RaffleSectionHeading
              icon={Compass}
              title="Explorar rifas"
              description="Consulta todas las rifas publicadas, busca por nombre o filtra por el tipo de participación."
            />

            <StorefrontCatalogToolbar
              searchTerm={searchTerm}
              searchLabel="Buscar rifas"
              searchPlaceholder="Buscar rifa..."
              filterLabel="Filtrar rifas"
              hasActiveFilters={hasActiveFilters}
              onSearchChange={setSearchTerm}
              onOpenFilters={openFilters}
            />

            {filteredRaffles.length === 0 ? (
              <EmptyState
                icon={Search}
                title={isExploringCatalog ? "Sin resultados" : "Sin más rifas"}
                description={
                  isExploringCatalog
                    ? "No encontramos rifas que coincidan con la búsqueda o los filtros actuales."
                    : "Actualmente no hay rifas publicadas en la cartelera."
                }
                actionText={isExploringCatalog ? "Limpiar filtros" : undefined}
                onActionClick={isExploringCatalog ? clearFilters : undefined}
              />
            ) : (
              <div className="flex flex-col">
                <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: "var(--sf-space-md)" }}>
                  {visibleRaffles.map((raffle, index) => (
                    <RaffleCatalogCard
                      key={raffle.id}
                      raffle={raffle}
                      now={participationClock}
                      index={index}
                    />
                  ))}
                </div>

                <StorefrontReveal
                  cadence="standard"
                  delayMs={STOREFRONT_MOTION_MS.pulse.full}
                  className="pt-[var(--sf-space-lg)]"
                >
                  <StorefrontPaginator
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                </StorefrontReveal>
              </div>
            )}
          </section>

          <HowRafflesWork />

          {recentResults.length > 0 && <RecentRaffleResults results={recentResults} />}
        </div>
      )}

      <RaffleCatalogFilterPanel
        isOpen={isFilterPanelOpen}
        value={draftRaffleType}
        onChange={setDraftRaffleType}
        onReset={() => setDraftRaffleType(DEFAULT_RAFFLE_TYPE)}
        onApply={() => {
          setRaffleType(draftRaffleType);
          setIsFilterPanelOpen(false);
        }}
        onClose={() => setIsFilterPanelOpen(false)}
      />
    </div>
  );
}

function RaffleSectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex max-w-2xl flex-col" style={{ gap: "var(--sf-space-sm)" }}>
      <StorefrontReveal cadence="editorial" amount={0.6}>
        <div className="flex items-center" style={{ gap: "var(--sf-space-sm)" }}>
          <Icon
            className="text-brand-500"
            aria-hidden="true"
            style={{
              width: "var(--sf-size-inner-icon-section)",
              height: "var(--sf-size-inner-icon-section)",
            }}
          />
          <h2 className="sf-text-h1 text-stone-950">{title}</h2>
        </div>
      </StorefrontReveal>
      <StorefrontReveal
        cadence="compact"
        delayMs={STOREFRONT_MOTION_MS.pulse.full}
        amount={0.6}
      >
        <p className="sf-text-secondary text-stone-500">{description}</p>
      </StorefrontReveal>
    </div>
  );
}

function FeaturedRaffleStage({
  raffles,
  activeIndex,
  now,
  onChange,
  onShare,
}: {
  raffles: Raffle[];
  activeIndex: number;
  now: number;
  onChange: (index: number) => void;
  onShare: (raffle: Raffle) => void;
}) {
  const raffle = raffles[activeIndex];
  const availability = getRaffleAvailability(raffle, now);
  const countdown = getRaffleCountdown(raffle, now);
  const prefersReducedMotion = useReducedMotion();
  const hasPresentedInitial = useRef(false);
  const choreography = hasPresentedInitial.current
    ? HERO_MOTION_SEQUENCE_MS.transition
    : HERO_MOTION_SEQUENCE_MS.initial;

  useEffect(() => {
    hasPresentedInitial.current = true;
  }, []);

  return (
    <section
      className="flex flex-col"
      aria-label="Cartelera de rifas destacadas"
      style={{ gap: "var(--sf-space-lg)" }}
    >
      <StorefrontCard
        level={1}
        density="none"
        className="relative min-h-[72svh] overflow-hidden bg-stone-950 md:min-h-[32rem]"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={raffle.id}
            className="absolute inset-0"
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 1.015 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: prefersReducedMotion
                ? 0
                : toMotionSeconds(choreography.mediaDurationMs),
              ease: STOREFRONT_EASING.standard,
            }}
          >
            {raffle.imagePoster || raffle.image ? (
              <img src={raffle.imagePoster || raffle.image || ""} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-stone-900 text-white/30">
                <Ticket size={72} strokeWidth={1.25} />
              </div>
            )}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(12,10,9,0.08) 20%, rgba(12,10,9,0.88) 100%)",
              }}
            />
          </motion.div>
        </AnimatePresence>

        <div
          className="relative z-10 flex min-h-[72svh] flex-col justify-end md:min-h-[32rem]"
          style={{ padding: "var(--sf-padding-outer)", gap: "var(--sf-space-md)" }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`content-${raffle.id}`}
              className="flex max-w-3xl flex-col"
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{
                duration: prefersReducedMotion
                  ? 0
                  : toMotionSeconds(STOREFRONT_MOTION_MS.duration.standard),
                ease: STOREFRONT_EASING.standard,
              }}
              style={{ gap: "var(--sf-space-md)" }}
            >
              <div className="flex flex-col" style={{ gap: "var(--sf-space-base)" }}>
                <motion.div
                  className="flex flex-wrap items-center"
                  style={{ gap: "var(--sf-space-sm)" }}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: prefersReducedMotion
                      ? 0
                      : toMotionSeconds(choreography.badgeDelayMs),
                    duration: prefersReducedMotion
                      ? 0
                      : toMotionSeconds(STOREFRONT_MOTION_MS.duration.deliberate),
                    ease: STOREFRONT_EASING.standard,
                  }}
                >
                  <Badge variant="overlay" context="autonomous">
                    {raffle.opportunities > 1 ? "Oportunidades" : "Simple"}
                  </Badge>
                  <Badge
                    variant={availability.overlayVariant}
                    context="autonomous"
                    className="text-white"
                  >
                    {availability.label}
                  </Badge>
                </motion.div>

                <div className="flex flex-col" style={{ gap: "var(--sf-space-sm)" }}>
                  <motion.h1
                    className="sf-text-hero max-w-3xl text-white"
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: prefersReducedMotion
                        ? 0
                        : toMotionSeconds(choreography.titleDelayMs),
                      duration: prefersReducedMotion
                        ? 0
                        : toMotionSeconds(choreography.titleDurationMs),
                      ease: STOREFRONT_EASING.standard,
                    }}
                  >
                    {raffle.title}
                  </motion.h1>
                  {raffle.description && (
                    <motion.p
                      className="sf-text-body line-clamp-2 max-w-2xl text-white/80"
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: prefersReducedMotion
                          ? 0
                          : toMotionSeconds(choreography.descriptionDelayMs),
                        duration: prefersReducedMotion
                          ? 0
                          : toMotionSeconds(STOREFRONT_MOTION_MS.duration.deliberate),
                        ease: STOREFRONT_EASING.standard,
                      }}
                    >
                      {raffle.description}
                    </motion.p>
                  )}
                </div>
              </div>

              <motion.div
                className="flex flex-wrap items-end"
                style={{ gap: "var(--sf-space-md)" }}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: prefersReducedMotion
                    ? 0
                    : toMotionSeconds(choreography.progressDelayMs),
                  duration: prefersReducedMotion
                    ? 0
                    : toMotionSeconds(STOREFRONT_MOTION_MS.duration.standard),
                  ease: STOREFRONT_EASING.standard,
                }}
              >
                <div className="flex flex-col" style={{ gap: "var(--sf-space-xs)" }}>
                  <p className="sf-text-label text-white/60">Precio</p>
                  <p className="sf-text-h1 font-black text-white">${formatPrice(raffle.ticketPrice)}</p>
                </div>
                {countdown && (
                  <div className="flex flex-col" style={{ gap: "var(--sf-space-xs)" }}>
                    <p className="sf-text-label text-white/60">{countdown.label}</p>
                    <p className="sf-text-h2 font-black tabular-nums text-white">{countdown.value}</p>
                  </div>
                )}
              </motion.div>

              <motion.div
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] sm:flex sm:w-auto"
                style={{ gap: "var(--sf-space-sm)" }}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: prefersReducedMotion
                    ? 0
                    : toMotionSeconds(choreography.actionsDelayMs),
                  duration: prefersReducedMotion
                    ? 0
                    : toMotionSeconds(STOREFRONT_MOTION_MS.duration.deliberate),
                  ease: STOREFRONT_EASING.standard,
                }}
              >
                <Button asChild context="section" variant="primary" className="w-full sm:w-fit">
                  <Link href={`/raffles/${raffle.id}`}>
                    {availability.cta}
                    <ArrowRight size={18} />
                  </Link>
                </Button>
                <Button
                  type="button"
                  context="section"
                  variant="outline"
                  icon={Share2}
                  isIconOnly
                  className="border-white/25 bg-black/25 text-white backdrop-blur-md hover:bg-black/40"
                  onClick={() => onShare(raffle)}
                  aria-label={`Compartir ${raffle.title}`}
                />
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {raffles.length > 1 && (
            <motion.div
              className="flex items-center justify-between"
              style={{ gap: "var(--sf-space-md)" }}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: prefersReducedMotion
                  ? 0
                  : toMotionSeconds(choreography.progressDelayMs),
                duration: prefersReducedMotion
                  ? 0
                  : toMotionSeconds(STOREFRONT_MOTION_MS.duration.standard),
                ease: STOREFRONT_EASING.standard,
              }}
            >
              <div className="flex items-center" style={{ gap: "var(--sf-space-xs)" }}>
                {raffles.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChange(index)}
                    className="h-2 transition-all"
                    style={{
                      width: index === activeIndex ? "var(--sf-space-xl)" : "var(--sf-space-sm)",
                      borderRadius: "var(--sf-radius-card-nested)",
                      background: index === activeIndex ? "white" : "rgba(255,255,255,.4)",
                      transitionDuration: "var(--sf-motion-duration-standard)",
                    }}
                    aria-label={`Mostrar rifa destacada ${index + 1}`}
                    aria-current={index === activeIndex ? "true" : undefined}
                  />
                ))}
              </div>
              <div className="hidden items-center sm:flex" style={{ gap: "var(--sf-space-sm)" }}>
                <FeaturedControl
                  icon={ChevronLeft}
                  label="Rifa anterior"
                  onClick={() => onChange((activeIndex - 1 + raffles.length) % raffles.length)}
                />
                <FeaturedControl
                  icon={ChevronRight}
                  label="Rifa siguiente"
                  onClick={() => onChange((activeIndex + 1) % raffles.length)}
                />
              </div>
            </motion.div>
          )}
        </div>
      </StorefrontCard>

      <div className="flex flex-col" style={{ gap: "var(--sf-space-md)" }}>
        <div
          className="grid grid-cols-2 md:grid-cols-4"
          style={{ gap: "var(--sf-space-md)" }}
        >
          {[
            {
              icon: Ticket,
              label: "Boletos",
              value: String(raffle.ticketQuantity),
            },
            {
              icon: Hash,
              label: "N.º por boleto",
              value: String(raffle.opportunities),
            },
            {
              icon: Calendar,
              label: "Fecha",
              value: formatCalendarDate(raffle.drawDate, { day: "numeric", month: "short" }),
            },
            {
              icon: Layers3,
              label: "Modalidad",
              value: raffle.opportunities > 1 ? "Oportunidades" : "Simple",
            },
          ].map((fact, index) => (
            <StorefrontReveal
              key={fact.label}
              cadence="compact"
              delayMs={index * STOREFRONT_MOTION_MS.stagger.compact}
              amount={0.5}
            >
              <FeaturedFact {...fact} />
            </StorefrontReveal>
          ))}
        </div>
        {raffle.opportunities > 1 && (
          <RaffleOpportunityPreview opportunities={raffle.opportunities} />
        )}
        {raffle.ticketStats && (
          <RaffleAvailabilityProgress
            stats={raffle.ticketStats}
            now={now}
          />
        )}
      </div>
    </section>
  );
}

function UpcomingRafflesShelf({ raffles, now }: { raffles: Raffle[]; now: number }) {
  return (
    <section className="flex flex-col" style={{ gap: "var(--sf-space-md)" }}>
      <RaffleSectionHeading
        icon={Clock3}
        title="Próximas aperturas"
        description="Consulta cuándo abre cada participación o solicita un aviso por WhatsApp."
      />

      <StorefrontRevealGroup
        cadence="editorial"
        className="-mx-[var(--sf-inset-page-mobile)] mb-[calc(-1*var(--sf-space-sm))] flex snap-x snap-mandatory overflow-x-auto px-[var(--sf-inset-page-mobile)] pb-[var(--sf-space-sm)] scrollbar-hide md:mx-0 md:mb-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-3"
        style={{
          gap: "var(--sf-space-md)",
          scrollPaddingInline: "var(--sf-inset-page-mobile)",
        }}
        delayMs={STOREFRONT_MOTION_MS.pulse.full * 2}
        amount={0.2}
      >
        {raffles.map((raffle) => (
          <StorefrontRevealItem
            key={raffle.id}
            className="w-[min(82vw,21rem)] shrink-0 snap-start md:w-auto"
          >
            <UpcomingRaffleCard raffle={raffle} now={now} />
          </StorefrontRevealItem>
        ))}
      </StorefrontRevealGroup>
    </section>
  );
}

function UpcomingRaffleCard({ raffle, now }: { raffle: Raffle; now: number }) {
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const reminder = useRaffleOpeningReminder(raffle.id);
  const availability = getRaffleAvailability(raffle, now);
  const countdown = getRaffleCountdown(raffle, now);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => setIsMobile(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);
    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  const closeReminder = () => setIsReminderOpen(false);

  return (
    <>
      <StorefrontCard
        level={1}
        density="none"
        className="group flex h-full w-full flex-col overflow-hidden"
      >
        <Link
          href={`/raffles/${raffle.id}`}
          aria-label={`Consultar ${raffle.title}`}
          className="relative block aspect-[16/10] overflow-hidden bg-stone-100"
        >
          {raffle.imagePoster || raffle.image ? (
            <img
              src={raffle.imagePoster || raffle.image || ""}
              alt=""
              className="h-full w-full object-cover transition-transform ease-out group-hover:scale-[1.04]"
              style={{ transitionDuration: "var(--sf-motion-duration-editorial)" }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-stone-300">
              <Ticket size={42} strokeWidth={1.5} aria-hidden="true" />
            </div>
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(12,10,9,0.02) 40%, rgba(12,10,9,0.62) 100%)",
            }}
          />
          <div
            className="absolute flex items-center"
            style={{
              left: "var(--sf-padding-inner)",
              right: "var(--sf-padding-inner)",
              bottom: "var(--sf-padding-inner)",
              gap: "var(--sf-space-sm)",
            }}
          >
            <Badge
              variant={availability.overlayVariant}
              context="card"
              className="text-white"
            >
              {availability.label}
            </Badge>
          </div>
        </Link>

        <div
          className="flex flex-1 flex-col"
          style={{ padding: "var(--sf-padding-inner)", gap: "var(--sf-space-md)" }}
        >
          <div className="flex flex-1 flex-col" style={{ gap: "var(--sf-space-sm)" }}>
            <Link href={`/raffles/${raffle.id}`} className="hover:text-brand-600">
              <h3 className="sf-text-h2 line-clamp-2 text-stone-950">{raffle.title}</h3>
            </Link>
            <p className="sf-text-secondary text-stone-500">
              {formatOpeningDate(raffle.participationStartsAt)}
            </p>
          </div>

          <div
            className="flex items-end justify-between border-t border-stone-100 pt-[var(--sf-space-md)]"
            style={{ gap: "var(--sf-space-md)" }}
          >
            <div className="flex flex-col" style={{ gap: "var(--sf-space-xs)" }}>
              <p className="sf-text-label text-stone-400">Precio por boleto</p>
              <p className="sf-text-h2 font-black text-stone-950">
                ${formatPrice(raffle.ticketPrice)}
              </p>
            </div>
            {countdown && (
              <div
                className="flex flex-col text-right"
                style={{ gap: "var(--sf-space-xs)" }}
              >
                <p className="sf-text-label text-stone-400">{countdown.label}</p>
                <p className="sf-text-secondary-strong tabular-nums text-brand-600">
                  {countdown.value}
                </p>
              </div>
            )}
          </div>

          <Button
            type="button"
            context="autonomous"
            variant="secondary"
            icon={BellRing}
            className="w-full"
            onClick={() => setIsReminderOpen(true)}
          >
            Quiero el aviso
          </Button>
        </div>
      </StorefrontCard>

      {isMobile ? (
        <BottomSheet
          isOpen={isReminderOpen}
          onClose={closeReminder}
          title="Aviso de apertura"
          icon={BellRing}
        >
          <RaffleOpeningReminderContent reminder={reminder} />
        </BottomSheet>
      ) : (
        <StorefrontModal
          isOpen={isReminderOpen}
          onClose={closeReminder}
          title="Aviso de apertura"
          icon={BellRing}
          width="compact"
          showDefaultActions={false}
        >
          <RaffleOpeningReminderContent reminder={reminder} />
        </StorefrontModal>
      )}
    </>
  );
}

function RaffleOpportunityPreview({ opportunities }: { opportunities: number }) {
  const visibleNumbers = Math.min(opportunities, 5);
  const remainingNumbers = Math.max(0, opportunities - visibleNumbers);
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="grid items-center border-y border-stone-100 py-[var(--sf-space-md)] sm:grid-cols-[minmax(0,1fr)_auto]"
      style={{
        gap: "var(--sf-space-md)",
      }}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.45 }}
      transition={{
        duration: prefersReducedMotion
          ? 0
          : toMotionSeconds(STOREFRONT_MOTION_MS.duration.deliberate),
        delay: prefersReducedMotion
          ? 0
          : toMotionSeconds(STOREFRONT_MOTION_MS.pulse.full),
        ease: STOREFRONT_EASING.reveal,
      }}
    >
      <div className="flex min-w-0 items-center" style={{ gap: "var(--sf-space-md)" }}>
        <StorefrontIcon icon={TicketCheck} context="card" variant="brand" />
        <div className="flex min-w-0 flex-col" style={{ gap: "var(--sf-space-xs)" }}>
          <p className="sf-text-label text-brand-600">Cómo participa tu boleto</p>
          <p className="sf-text-secondary-strong text-stone-850">
            1 boleto participa con {opportunities} números
          </p>
        </div>
      </div>

      <div
        className="flex items-center"
        style={{ gap: "var(--sf-space-xs)" }}
        aria-hidden="true"
      >
        {Array.from({ length: visibleNumbers }, (_, index) => (
          <motion.span
            key={index}
            className="flex items-center justify-center border border-brand-200 bg-brand-50 sf-text-caption font-black text-brand-700"
            style={{
              width: "var(--sf-h-button-card)",
              height: "var(--sf-h-button-card)",
              borderRadius: "var(--sf-radius-card-nested)",
            }}
            initial={prefersReducedMotion ? false : { opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{
              duration: prefersReducedMotion
                ? 0
                : toMotionSeconds(STOREFRONT_MOTION_MS.duration.standard),
              delay: prefersReducedMotion
                ? 0
                : toMotionSeconds(index * STOREFRONT_MOTION_MS.stagger.compact),
              ease: STOREFRONT_EASING.standard,
            }}
          >
            <Ticket
              aria-hidden="true"
              style={{
                width: "var(--sf-size-inner-icon-badge)",
                height: "var(--sf-size-inner-icon-badge)",
              }}
            />
          </motion.span>
        ))}
        {remainingNumbers > 0 && (
          <span className="sf-text-secondary-strong pl-[var(--sf-space-xs)] text-stone-500">
            +{remainingNumbers}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function RaffleCatalogCard({ raffle, now, index }: { raffle: Raffle; now: number; index: number }) {
  const availability = getRaffleAvailability(raffle, now);
  const inventorySignal = raffle.ticketStats ? getInventorySignal(raffle.ticketStats) : null;
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: prefersReducedMotion
          ? 0
          : toMotionSeconds(STOREFRONT_MOTION_MS.duration.deliberate),
        delay: prefersReducedMotion
          ? 0
          : toMotionSeconds(
              STOREFRONT_MOTION_MS.pulse.full * 2 +
                (index % 2) * STOREFRONT_MOTION_MS.stagger.standard,
            ),
        ease: STOREFRONT_EASING.reveal,
      }}
      whileHover={prefersReducedMotion ? undefined : { y: -4 }}
      className="h-full"
    >
      <Link
        href={`/raffles/${raffle.id}`}
        className="block h-full focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20"
        aria-label={`${availability.cta}: ${raffle.title}`}
      >
        <StorefrontCard
          interactive
          level={1}
          density="none"
          className="group flex h-full flex-col"
          style={{ padding: "var(--sf-padding-inner)", gap: "var(--sf-space-base)" }}
        >
          <div className="flex min-w-0 items-center" style={{ gap: "var(--sf-space-md)" }}>
            <div
              className="relative shrink-0 overflow-hidden bg-stone-50"
              style={{
                width: "var(--sf-size-stage-container)",
                height: "var(--sf-size-stage-container)",
                borderRadius: "var(--sf-radius-card-inner)",
              }}
            >
              {raffle.imagePoster || raffle.image ? (
                <img
                  src={raffle.imagePoster || raffle.image || ""}
                  className="h-full w-full object-cover transition-transform ease-out group-hover:scale-[1.05]"
                  style={{ transitionDuration: "var(--sf-motion-duration-editorial)" }}
                  alt={raffle.title}
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-stone-100/50 text-stone-300">
                  <Ticket
                    strokeWidth={1.5}
                    aria-hidden="true"
                    style={{
                      width: "var(--sf-size-stage-icon-compact)",
                      height: "var(--sf-size-stage-icon-compact)",
                    }}
                  />
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col" style={{ gap: "var(--sf-space-sm)" }}>
              <div className="flex flex-wrap items-center" style={{ gap: "var(--sf-space-xs)" }}>
                <Badge variant={availability.variant} context="card">
                  {availability.label}
                </Badge>
                {inventorySignal && (
                  <Badge variant={inventorySignal.variant} context="card">
                    {inventorySignal.label}
                  </Badge>
                )}
              </div>

              <h3
                className="sf-text-h2 line-clamp-2 text-stone-950 transition-colors group-hover:text-brand-600"
                style={{ transitionDuration: "var(--sf-motion-duration-standard)" }}
              >
                {raffle.title}
              </h3>
            </div>
          </div>

          <div
            className="grid grid-cols-2 border-t border-stone-100 pt-[var(--sf-space-base)]"
            style={{ gap: "var(--sf-space-md)" }}
          >
            <RaffleCatalogFact
              icon={Banknote}
              label="Precio"
              value={`$${formatPrice(raffle.ticketPrice)}`}
            />
            <RaffleCatalogFact
              icon={Calendar}
              label="Fecha"
              value={formatCalendarDate(raffle.drawDate, {
                day: "numeric",
                month: "short",
              })}
            />
          </div>

          {raffle.ticketStats && (
            <div className="border-t border-stone-100 pt-[var(--sf-space-base)]">
              <RaffleAvailabilityProgress
                stats={raffle.ticketStats}
                now={now}
                showActivity={false}
              />
            </div>
          )}
        </StorefrontCard>
      </Link>
    </motion.div>
  );
}

function RaffleCatalogFact({
  icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center" style={{ gap: "var(--sf-space-base)" }}>
      <StorefrontIcon icon={icon} context="card" variant="brand" />
      <div className="flex min-w-0 flex-col" style={{ gap: "var(--sf-space-xs)" }}>
        <p className="sf-text-label text-stone-400">{label}</p>
        <p className="sf-text-secondary-strong truncate text-stone-950">{value}</p>
      </div>
    </div>
  );
}

function FeaturedControl({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center border border-white/20 bg-black/25 text-white backdrop-blur-md transition-colors hover:bg-black/40"
      style={{
        width: "var(--sf-h-button-card)",
        height: "var(--sf-h-button-card)",
        borderRadius: "var(--sf-radius-card-inner)",
        transitionDuration: "var(--sf-motion-duration-standard)",
      }}
      aria-label={label}
    >
      <Icon size={20} />
    </button>
  );
}

function FeaturedFact({
  icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div
      className="flex min-w-0 items-center"
      style={{ gap: "var(--sf-space-md)" }}
    >
      <StorefrontIcon icon={icon} context="card" variant="brand" />
      <div className="flex min-w-0 flex-col" style={{ gap: "var(--sf-space-xs)" }}>
        <p className="sf-text-label text-stone-400">{label}</p>
        <p className="sf-text-secondary-strong truncate text-stone-850">{value}</p>
      </div>
    </div>
  );
}

function RaffleAvailabilityProgress({
  stats,
  now,
  showActivity = true,
}: {
  stats: NonNullable<Raffle["ticketStats"]>;
  now: number;
  showActivity?: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();
  const occupied = Math.max(0, stats.total - stats.available);
  const progress = stats.total > 0 ? Math.min(100, Math.max(0, (occupied / stats.total) * 100)) : 0;
  const relativeActivity = formatRelativeActivity(stats.lastParticipationAt, now);
  const activityCopy =
    stats.recentActivityCount > 0
      ? `${stats.recentActivityCount} ${
            stats.recentActivityCount === 1
            ? "boleto se apartó recientemente"
            : "boletos se apartaron recientemente"
        }`
      : null;

  return (
    <motion.div
      aria-label={`${stats.available} de ${stats.total} boletos disponibles`}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{
        duration: prefersReducedMotion
          ? 0
          : toMotionSeconds(STOREFRONT_MOTION_MS.duration.standard),
        delay: prefersReducedMotion
          ? 0
          : toMotionSeconds(STOREFRONT_MOTION_MS.pulse.full),
        ease: STOREFRONT_EASING.reveal,
      }}
    >
      <div className="flex flex-col" style={{ gap: "var(--sf-space-sm)" }}>
        <div
          className="flex items-end justify-between"
          style={{ gap: "var(--sf-space-md)" }}
        >
          <div className="flex min-w-0 flex-col" style={{ gap: "var(--sf-space-xs)" }}>
            <p className="sf-text-label text-stone-400">Disponibilidad</p>
            <p className="sf-text-secondary-strong text-stone-850">
              {stats.available} de {stats.total} boletos disponibles
            </p>
          </div>
          <p className="sf-text-label shrink-0 text-stone-400">
            {Math.round(progress)}% ocupado
          </p>
        </div>

        <div
          className="overflow-hidden bg-stone-100"
          style={{
            height: "var(--sf-space-sm)",
            borderRadius: "var(--sf-radius-card-nested)",
          }}
          aria-hidden="true"
        >
          <motion.div
            className="h-full bg-brand-500"
            style={{ borderRadius: "inherit" }}
            initial={prefersReducedMotion ? false : { width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{
              duration: prefersReducedMotion
                ? 0
                : toMotionSeconds(STOREFRONT_MOTION_MS.duration.editorial),
              ease: STOREFRONT_EASING.standard,
            }}
          />
        </div>

        {showActivity && activityCopy && (
          <motion.div
            className="flex items-center text-brand-700"
            style={{ gap: "var(--sf-space-xs)" }}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{
              duration: prefersReducedMotion
                ? 0
                : toMotionSeconds(STOREFRONT_MOTION_MS.duration.fast),
              delay: prefersReducedMotion
                ? 0
                : toMotionSeconds(STOREFRONT_MOTION_MS.pulse.full),
              ease: STOREFRONT_EASING.standard,
            }}
          >
            <Activity
              aria-hidden="true"
              style={{
                width: "var(--sf-size-inner-icon-badge)",
                height: "var(--sf-size-inner-icon-badge)",
              }}
            />
            <p className="sf-text-caption font-semibold normal-case">
              {activityCopy}
              {relativeActivity ? ` · ${relativeActivity}` : ""}
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function getInventorySignal(stats: NonNullable<Raffle["ticketStats"]>) {
  if (stats.available <= 0) {
    return { label: "Completa", variant: "muted" as const };
  }
  if (stats.available <= 10) {
    return {
      label: stats.available === 1 ? "Último boleto" : `Últimos ${stats.available}`,
      variant: "warning" as const,
    };
  }
  if (stats.total > 0 && stats.available / stats.total <= 0.2) {
    return { label: "Pocos boletos", variant: "warning" as const };
  }
  return null;
}

function HowRafflesWork() {
  const prefersReducedMotion = useReducedMotion();
  const steps = [
    {
      icon: TicketCheck,
      number: "01",
      title: "Elige tus boletos",
      description: "Consulta la disponibilidad en tiempo real y selecciona tus números.",
    },
    {
      icon: CreditCard,
      number: "02",
      title: "Aparta o paga",
      description: "Confirma tu participación mediante transferencia o tarjeta.",
    },
    {
      icon: Trophy,
      number: "03",
      title: "Consulta el resultado",
      description: "El número ganador se publica con referencia al Premio Mayor.",
    },
  ];
  const revealDuration = prefersReducedMotion
    ? 0
    : toMotionSeconds(STOREFRONT_MOTION_MS.duration.standard);
  const sequenceStep = STOREFRONT_MOTION_MS.stagger.standard;

  return (
    <section className="flex flex-col border-y border-stone-200 py-[var(--sf-space-lg)] md:py-[var(--sf-space-xl)]">
      <div className="flex max-w-2xl flex-col" style={{ gap: "var(--sf-space-sm)" }}>
        <motion.div
          className="flex items-center"
          style={{ gap: "var(--sf-space-sm)" }}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{
            duration: revealDuration,
            ease: STOREFRONT_EASING.reveal,
          }}
        >
          <ListChecks
            className="text-brand-500"
            aria-hidden="true"
            style={{
              width: "var(--sf-size-inner-icon-section)",
              height: "var(--sf-size-inner-icon-section)",
            }}
          />
          <h2 className="sf-text-h1 text-stone-950">Cómo funciona</h2>
        </motion.div>
        <motion.p
          className="sf-text-secondary text-stone-500"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{
            duration: revealDuration,
            delay: prefersReducedMotion ? 0 : toMotionSeconds(sequenceStep),
            ease: STOREFRONT_EASING.reveal,
          }}
        >
          Tres pasos para participar y consultar el resultado con claridad.
        </motion.p>
      </div>

      <ol
        className="grid grid-cols-1 pt-[var(--sf-space-lg)] md:grid-cols-3"
        style={{ gap: "var(--sf-space-lg)" }}
      >
        {steps.map((step, index) => (
          <motion.li
            key={step.number}
            className="flex items-start"
            style={{ gap: "var(--sf-space-md)" }}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{
              duration: revealDuration,
              delay: prefersReducedMotion
                ? 0
                : toMotionSeconds(sequenceStep * (index + 2)),
              ease: STOREFRONT_EASING.reveal,
            }}
          >
            <StorefrontIcon icon={step.icon} context="section" variant="brand" />
            <div className="flex min-w-0 flex-col" style={{ gap: "var(--sf-space-sm)" }}>
              <div className="flex min-w-0 flex-col" style={{ gap: "var(--sf-space-xs)" }}>
                <p className="sf-text-label text-brand-600">{step.number}</p>
                <h3 className="sf-text-h2 text-stone-950">{step.title}</h3>
              </div>
              <p className="sf-text-secondary max-w-sm text-stone-500">{step.description}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

function RecentRaffleResults({ results }: { results: RaffleRecentResult[] }) {
  return (
    <section className="flex flex-col" style={{ gap: "var(--sf-space-md)" }}>
      <RaffleSectionHeading
        icon={Trophy}
        title="Resultados recientes"
        description="Consulta los números ganadores publicados de los sorteos más recientes."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: "var(--sf-space-md)" }}>
        {results.map((result, index) => (
          <StorefrontReveal
            key={result.id}
            cadence="editorial"
            delayMs={
              STOREFRONT_MOTION_MS.pulse.full * 2 +
              index * STOREFRONT_MOTION_MS.stagger.standard
            }
            amount={0.35}
            className="h-full"
          >
            <Link href={`/raffles/${result.id}`} className="group block h-full">
              <StorefrontCard
                level={1}
                density="compact"
                interactive
                className="flex h-full items-center"
                style={{ gap: "var(--sf-space-md)" }}
              >
                <div
                  className="shrink-0 overflow-hidden bg-stone-100"
                  style={{
                    width: "var(--sf-h-button-section)",
                    height: "var(--sf-h-button-section)",
                    borderRadius: "var(--sf-radius-card-inner)",
                  }}
                >
                  {result.imagePoster || result.image ? (
                    <img
                      src={result.imagePoster || result.image || ""}
                      alt=""
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      style={{ transitionDuration: "var(--sf-motion-duration-standard)" }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-stone-400">
                      <Trophy size={22} aria-hidden="true" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="sf-text-label text-brand-600">Número ganador</p>
                  <p className="sf-text-h1 font-black tabular-nums text-stone-950">
                    {result.winningNumber}
                  </p>
                  <p className="sf-text-secondary-strong truncate text-stone-850">
                    {result.title}
                  </p>
                  <p className="sf-text-label text-stone-400">
                    {formatCalendarDate(result.drawDate, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <p className="sf-text-caption mt-[var(--sf-space-xs)] text-stone-500">
                    Referencia: Premio Mayor
                  </p>
                </div>

                <ArrowRight
                  className="shrink-0 text-stone-400 transition-transform group-hover:translate-x-1 group-hover:text-brand-500"
                  size={18}
                  style={{ transitionDuration: "var(--sf-motion-duration-standard)" }}
                  aria-hidden="true"
                />
              </StorefrontCard>
            </Link>
          </StorefrontReveal>
        ))}
      </div>
    </section>
  );
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX")
    .trim();
}

async function copyTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Continue with the legacy fallback for restrictive embedded browsers.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("COPY_FAILED");
}

function isUpcomingRaffle(raffle: Raffle, now: number) {
  if (!raffle.participationStartsAt) return false;
  return now < new Date(raffle.participationStartsAt).getTime();
}

function formatOpeningDate(value: string | null) {
  if (!value) return "Fecha por confirmar";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha por confirmar";

  const formatted = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  return formatted.charAt(0).toLocaleUpperCase("es-MX") + formatted.slice(1);
}

function formatRelativeActivity(value: string | null, now: number) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return null;

  const elapsedMinutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (elapsedMinutes < 1) return "Ahora";
  if (elapsedMinutes < 60) return `Hace ${elapsedMinutes} min`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `Hace ${elapsedHours} h`;

  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
  }).format(new Date(timestamp));
}

function getRaffleAvailability(raffle: Raffle, now: number) {
  const startsAt = raffle.participationStartsAt
    ? new Date(raffle.participationStartsAt).getTime()
    : null;
  const endsAt = raffle.participationEndsAt ? new Date(raffle.participationEndsAt).getTime() : null;
  const isClosed = Boolean(endsAt && now >= endsAt);
  const isUpcoming = Boolean(startsAt && now < startsAt);

  if (isClosed) {
    return {
      label: "Cerrada",
      variant: "muted" as const,
      overlayVariant: "overlay" as const,
      cta: "Ver rifa",
    };
  }
  if (isUpcoming && raffle.earlyAccessEnabled) {
    return {
      label: "Acceso anticipado",
      variant: "warning" as const,
      overlayVariant: "overlayWarning" as const,
      cta: "Ingresar con acceso",
    };
  }
  if (isUpcoming) {
    return {
      label: "Próximamente",
      variant: "info" as const,
      overlayVariant: "overlay" as const,
      cta: "Ver apertura",
    };
  }
  return {
    label: "Abierta",
    variant: "success" as const,
    overlayVariant: "overlaySuccess" as const,
    cta: "Participar",
  };
}

function getRaffleCountdown(raffle: Raffle, now: number) {
  const startsAt = raffle.participationStartsAt
    ? new Date(raffle.participationStartsAt).getTime()
    : null;
  const endsAt = raffle.participationEndsAt ? new Date(raffle.participationEndsAt).getTime() : null;
  const drawAt = raffle.drawDate ? new Date(raffle.drawDate).getTime() : null;

  if (startsAt && now < startsAt) {
    return {
      label: raffle.earlyAccessEnabled ? "Apertura pública en" : "Abre en",
      value: formatRemainingTime(startsAt - now),
    };
  }
  if (endsAt && now < endsAt) {
    return { label: "Cierra en", value: formatRemainingTime(endsAt - now) };
  }
  if (drawAt && now < drawAt) {
    return { label: "Sorteo en", value: formatRemainingTime(drawAt - now) };
  }
  return null;
}

function formatRemainingTime(milliseconds: number) {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60_000));
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}
