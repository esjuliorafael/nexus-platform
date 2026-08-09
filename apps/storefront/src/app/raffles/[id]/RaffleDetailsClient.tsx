"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Award,
  BellRing,
  Calendar,
  CheckCircle2,
  CircleSlash2,
  Clock3,
  Gift,
  PackageCheck,
  Sparkles,
  Ticket,
  Timer,
  Trophy,
  Truck,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import { raffleApi } from "../../../api/raffles";
import { RaffleCouponValidationResponse } from "../../../api/raffle-coupons";
import { Media, Raffle, RaffleTicketAvailability } from "../../../types";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import {
  StorefrontAutonomousCard,
  StorefrontCard,
} from "../../../components/ui/Card";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { MediaViewer } from "../../../components/ui/MediaViewer";
import {
  StorefrontMediaRail,
  StorefrontVideoThumbnailIndicator,
} from "../../../components/ui/MediaRail";
import { StorefrontNote } from "../../../components/ui/Note";
import {
  StorefrontReveal,
  StorefrontRevealItem,
} from "../../../components/ui/Reveal";
import { TicketSelectionGrid } from "../../../components/raffle/TicketSelectionGrid";
import {
  RaffleMobileTopBar,
  RaffleOpeningReminderBar,
  RaffleSelectionBar,
} from "../../../components/raffle/RaffleMobileChrome";
import { RaffleOpportunityPeek } from "../../../components/raffle/RaffleOpportunityPeek";
import { RaffleParticipationGate } from "../../../components/raffle/RaffleParticipationGate";
import { RaffleParticipationLookupCard } from "../../../components/raffle/RaffleParticipationLookupCard";
import {
  RaffleOpeningReminderCard,
  RaffleOpeningReminderContent,
  useRaffleOpeningReminder,
} from "../../../components/raffle/RaffleOpeningReminderCard";
import { useToastStore } from "../../../store/toast.store";
import { useRaffleSelectionUiStore } from "../../../store/raffle-selection-ui.store";
import { formatPrice } from "../../../utils/formatters";
import {
  clearRaffleCheckoutDraft,
  getRaffleCheckoutDraft,
  saveRaffleCheckoutDraft,
} from "../../../lib/raffle-checkout-draft";
import { getRaffleEarlyAccessToken } from "../../../lib/raffle-early-access";
import {
  STOREFRONT_DETAIL_MOTION_SEQUENCE_MS,
  STOREFRONT_EASING,
  STOREFRONT_MOTION_MS,
  toMotionSeconds,
} from "../../../lib/motion";

const formatRaffleDrawDate = (value: string | null) => {
  if (!value) return "Por definir";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Por definir";

  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Mexico_City",
  }).format(date);
};

interface RaffleDetailsClientProps {
  raffle: Raffle;
  initialTicketAvailability: RaffleTicketAvailability[];
  reservationHours: number | null;
}

export function RaffleDetailsClient({
  raffle,
  initialTicketAvailability,
  reservationHours,
}: RaffleDetailsClientProps) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [ticketAvailability, setTicketAvailability] = useState<
    RaffleTicketAvailability[]
  >(initialTicketAvailability);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [isOpportunityPeekOpen, setIsOpportunityPeekOpen] = useState(false);
  const [coupon, setCoupon] = useState<RaffleCouponValidationResponse | null>(
    null,
  );
  const [showTopTitle, setShowTopTitle] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    getRaffleEarlyAccessToken(raffle.id),
  );
  const [participationClock, setParticipationClock] = useState(() =>
    Date.now(),
  );
  const [isOpeningReminderSheetOpen, setIsOpeningReminderSheetOpen] =
    useState(false);
  const [isCoverReady, setIsCoverReady] = useState(!raffle.image);
  const openingReminder = useRaffleOpeningReminder(raffle.id);
  const raffleTitleRef = useRef<HTMLHeadingElement | null>(null);
  const showToast = useToastStore((state) => state.showToast);
  const openSelection = useRaffleSelectionUiStore(
    (state) => state.openSelection,
  );
  const syncSelection = useRaffleSelectionUiStore(
    (state) => state.syncSelection,
  );
  const digitLabel = raffle.digits === 1 ? "dígito" : "dígitos";
  const additionalOpportunities = raffle.opportunities - 1;
  const distributionLabel =
    raffle.distribution === "RANDOM" ? "aleatoria" : "lineal";
  const reservationHoursLabel =
    reservationHours === 1 ? "1 hora" : `${reservationHours} horas`;
  const raffleMediaItems = useMemo<Media[]>(() => {
    const coverItem: Media[] = raffle.image
      ? [
          {
            id: raffle.id * -1,
            title: raffle.title,
            description: null,
            type: raffle.imageType,
            filePath: raffle.image,
            assetId: `raffle-cover-${raffle.id}`,
            mediaUrl: raffle.image,
            posterUrl: raffle.imagePoster,
            mediaType: raffle.imageType,
            categoryId: null,
            subcategoryId: null,
            subcategoryIds: [],
            subcategories: [],
            location: null,
            mediaDate: null,
          },
        ]
      : [];

    const galleryItems = (raffle.gallery ?? []).map<Media>((item) => ({
      id: item.id,
      title: raffle.title,
      description: null,
      type: item.fileType,
      filePath: item.filePath,
      assetId: `raffle-gallery-${item.id}`,
      mediaUrl: item.filePath,
      posterUrl: item.posterPath,
      mediaType: item.fileType,
      categoryId: null,
      subcategoryId: null,
      subcategoryIds: [],
      subcategories: [],
      location: null,
      mediaDate: null,
    }));

    return [...coverItem, ...galleryItems];
  }, [raffle]);
  const selectedViewerMedia =
    viewerIndex === null ? null : (raffleMediaItems[viewerIndex] ?? null);
  const galleryStartIndex = raffle.image ? 1 : 0;
  const canNavigateRaffleMedia = raffleMediaItems.length > 1;
  const participationState = useMemo(() => {
    if (raffle.status !== "ACTIVE") return "CLOSED" as const;
    const startsAt = raffle.participationStartsAt
      ? new Date(raffle.participationStartsAt).getTime()
      : null;
    const endsAt = raffle.participationEndsAt
      ? new Date(raffle.participationEndsAt).getTime()
      : null;
    if (endsAt && participationClock >= endsAt) return "CLOSED" as const;
    if (startsAt && participationClock < startsAt) {
      if (raffle.earlyAccessEnabled && accessToken) return "OPEN" as const;
      return raffle.earlyAccessEnabled
        ? ("EARLY_ACCESS" as const)
        : ("UPCOMING" as const);
    }
    return "OPEN" as const;
  }, [
    accessToken,
    participationClock,
    raffle.earlyAccessEnabled,
    raffle.participationEndsAt,
    raffle.participationStartsAt,
    raffle.status,
  ]);
  const canParticipate = participationState === "OPEN";
  const isFinalized = raffle.status === "FINISHED";
  const hasPublishedResults =
    raffle.status === "FINISHED" &&
    Boolean(
      raffle.winningNumber ||
      (raffle.prizes || []).some(
        (prize) => prize.resultPublishedAt && prize.winningNumber,
      ),
    );
  const isBeforePublicOpening = Boolean(
    raffle.participationStartsAt &&
    participationClock < new Date(raffle.participationStartsAt).getTime(),
  );
  const statusBadge =
    raffle.status === "FINISHED"
      ? { label: "Finalizada", variant: "muted" as const }
      : raffle.status === "CANCELLED"
        ? { label: "Cancelada", variant: "danger" as const }
        : participationState === "CLOSED"
          ? { label: "Participación cerrada", variant: "warning" as const }
          : isBeforePublicOpening && raffle.earlyAccessEnabled
            ? { label: "Acceso anticipado", variant: "brand" as const }
            : isBeforePublicOpening
              ? { label: "Próximamente", variant: "info" as const }
              : { label: "Abierta", variant: "success" as const };

  useEffect(() => {
    if (canParticipate || participationState === "CLOSED") {
      setIsOpeningReminderSheetOpen(false);
    }
  }, [canParticipate, participationState]);

  useEffect(() => {
    if (canParticipate || participationState === "CLOSED") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("aviso") !== "1") return;

    const frame = window.requestAnimationFrame(() => {
      if (window.matchMedia("(max-width: 767px)").matches) {
        setIsOpeningReminderSheetOpen(true);
      } else {
        document
          .getElementById("raffle-opening-reminder")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [canParticipate, participationState]);

  const scrollTo = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const selectedTotal = selectedTickets.length * Number(raffle.ticketPrice);
  const introTransition = (
    delayMs: number,
    durationMs: number = STOREFRONT_DETAIL_MOTION_SEQUENCE_MS.contentDurationMs,
  ) => ({
    duration: prefersReducedMotion ? 0 : toMotionSeconds(durationMs),
    delay: prefersReducedMotion ? 0 : toMotionSeconds(delayMs),
    ease: STOREFRONT_EASING.reveal,
  });

  useEffect(() => {
    if (
      isFinalized ||
      (!raffle.participationStartsAt && !raffle.participationEndsAt)
    )
      return;
    const timer = window.setInterval(
      () => setParticipationClock(Date.now()),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [isFinalized, raffle.participationEndsAt, raffle.participationStartsAt]);

  const handleSelectedTicketsChange = useCallback((tickets: string[]) => {
    setCoupon(null);
    setSelectedTickets(tickets);
  }, []);

  const handleCouponChange = useCallback(
    (nextCoupon: RaffleCouponValidationResponse | null) => {
      setCoupon(nextCoupon);
    },
    [],
  );

  const handleSelectionBarAction = () => {
    if (selectedTickets.length === 0) {
      scrollTo("raffle-ticket-selection");
      return;
    }

    openSelection({
      raffleId: raffle.id,
      selectedTickets,
      ticketOpportunities: raffle.extraOpportunities ?? [],
      ticketPrice: raffle.ticketPrice,
      coupon,
      onSelectedTicketsChange: handleSelectedTicketsChange,
      onCouponChange: handleCouponChange,
    });
  };

  useEffect(() => {
    if (isFinalized) {
      clearRaffleCheckoutDraft();
      setSelectedTickets([]);
      setCoupon(null);
      return;
    }

    const checkoutDraft = getRaffleCheckoutDraft(raffle.id);
    if (!checkoutDraft) return;

    const unavailableTickets = new Set(
      initialTicketAvailability.map((ticket) => ticket.ticketNumber),
    );
    const availableTickets = checkoutDraft.tickets.filter(
      (ticket) => !unavailableTickets.has(ticket),
    );
    const restoredCoupon =
      availableTickets.length === checkoutDraft.tickets.length
        ? checkoutDraft.coupon
        : null;

    setSelectedTickets(availableTickets);
    setCoupon(restoredCoupon);

    if (availableTickets.length > 0) {
      saveRaffleCheckoutDraft({
        raffleId: raffle.id,
        tickets: availableTickets,
        coupon: restoredCoupon,
      });
    } else {
      clearRaffleCheckoutDraft();
    }
  }, [initialTicketAvailability, isFinalized, raffle.id]);

  useEffect(() => {
    syncSelection(raffle.id, selectedTickets, coupon);
  }, [coupon, raffle.id, selectedTickets, syncSelection]);

  useEffect(() => {
    const titleElement = raffleTitleRef.current;
    if (!titleElement) return;

    if (!window.IntersectionObserver) {
      const handleScroll = () => setShowTopTitle(window.scrollY > 160);
      handleScroll();
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }

    const observer = new IntersectionObserver(
      ([entry]) => setShowTopTitle(!entry.isIntersecting),
      { root: null, threshold: 0, rootMargin: "-88px 0px 0px 0px" },
    );

    observer.observe(titleElement);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isFinalized) return;

    let refreshTimer: number | undefined;
    let disposed = false;

    const refreshAvailability = () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(async () => {
        try {
          const nextAvailability = await raffleApi.getTicketAvailability(
            raffle.id,
          );
          if (disposed) return;

          const unavailable = new Set(
            nextAvailability.map((ticket) => ticket.ticketNumber),
          );
          setTicketAvailability(nextAvailability);
          setSelectedTickets((current) => {
            const displaced = current.filter((ticket) =>
              unavailable.has(ticket),
            );
            if (displaced.length > 0) {
              setCoupon(null);
              window.setTimeout(() => {
                showToast(
                  displaced.length === 1
                    ? `El boleto ${displaced[0]} fue apartado por otro participante.`
                    : "Algunos boletos de tu selección ya no están disponibles.",
                  { type: "info", title: "Disponibilidad actualizada" },
                );
              }, 0);
            }
            return current.filter((ticket) => !unavailable.has(ticket));
          });
        } catch {
          // EventSource reconnects by itself; the next event or focus refresh will reconcile state.
        }
      }, 120);
    };

    const eventSource = new EventSource(
      raffleApi.getTicketAvailabilityEventsUrl(raffle.id),
    );
    eventSource.addEventListener("availability-changed", refreshAvailability);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshAvailability();
    };

    window.addEventListener("focus", refreshAvailability);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      disposed = true;
      if (refreshTimer) window.clearTimeout(refreshTimer);
      eventSource.close();
      window.removeEventListener("focus", refreshAvailability);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isFinalized, raffle.id, showToast]);

  return (
    <div className="mx-auto max-w-[var(--sf-max-width-content)] px-[var(--sf-inset-page)] pb-[var(--sf-mobile-chrome-content-padding-bottom)] pt-[var(--sf-mobile-chrome-content-padding-top)] md:py-[var(--sf-space-xl)]">
      <RaffleMobileTopBar
        title={raffle.title}
        showTitle={showTopTitle}
        selectedCount={selectedTickets.length}
        selectionAvailable={!isFinalized}
        onBack={() => router.push("/raffles")}
        onOpenSelection={handleSelectionBarAction}
      />
      <div className="flex flex-col" style={{ gap: "var(--sf-space-lg)" }}>
        <motion.button
          onClick={() => router.push("/raffles")}
          initial={prefersReducedMotion ? false : { opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={introTransition(
            STOREFRONT_DETAIL_MOTION_SEQUENCE_MS.chromeDelayMs,
          )}
          className="hidden w-fit items-center text-stone-500 transition-colors hover:text-stone-850 sf-text-label md:flex"
          style={{ gap: "var(--sf-space-sm)" }}
        >
          <ArrowLeft size={14} />
          Volver a Rifas
        </motion.button>

        <div className="flex flex-col gap-[var(--sf-space-lg)] lg:gap-[var(--sf-space-xl)]">
          <div className="grid grid-cols-1 items-start gap-[var(--sf-space-lg)] lg:grid-cols-2 lg:gap-[var(--sf-space-xl)]">
            <motion.div
              initial={
                prefersReducedMotion ? false : { opacity: 0, scale: 0.985 }
              }
              animate={{ opacity: 1, scale: 1 }}
              transition={introTransition(
                STOREFRONT_DETAIL_MOTION_SEQUENCE_MS.coverDelayMs,
                STOREFRONT_DETAIL_MOTION_SEQUENCE_MS.coverDurationMs,
              )}
            >
              <StorefrontCard
                density="none"
                role={raffle.image ? "button" : undefined}
                tabIndex={raffle.image ? 0 : -1}
                aria-label={
                  raffle.image ? "Abrir portada de la rifa" : undefined
                }
                onClick={() => {
                  if (raffle.image) setViewerIndex(0);
                }}
                onKeyDown={(event) => {
                  if (
                    !raffle.image ||
                    (event.key !== "Enter" && event.key !== " ")
                  )
                    return;
                  event.preventDefault();
                  setViewerIndex(0);
                }}
                className={`aspect-square overflow-hidden shadow-2xl shadow-stone-200/50 ${
                  raffle.image
                    ? "cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20"
                    : ""
                }`}
              >
                {raffle.image ? (
                  raffle.imageType === "VIDEO" ? (
                    <motion.video
                      src={raffle.image}
                      poster={raffle.imagePoster || undefined}
                      className="h-full w-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                      initial={prefersReducedMotion ? false : { opacity: 0 }}
                      animate={{ opacity: isCoverReady ? 1 : 0 }}
                      transition={{
                        duration: prefersReducedMotion
                          ? 0
                          : toMotionSeconds(
                              STOREFRONT_MOTION_MS.duration.standard,
                            ),
                        ease: STOREFRONT_EASING.standard,
                      }}
                      onLoadedData={() => setIsCoverReady(true)}
                      onError={() => setIsCoverReady(true)}
                    />
                  ) : (
                    <motion.img
                      src={raffle.image}
                      className="h-full w-full object-cover"
                      alt={raffle.title}
                      initial={prefersReducedMotion ? false : { opacity: 0 }}
                      animate={{ opacity: isCoverReady ? 1 : 0 }}
                      transition={{
                        duration: prefersReducedMotion
                          ? 0
                          : toMotionSeconds(
                              STOREFRONT_MOTION_MS.duration.standard,
                            ),
                        ease: STOREFRONT_EASING.standard,
                      }}
                      onLoad={() => setIsCoverReady(true)}
                      onError={() => setIsCoverReady(true)}
                    />
                  )
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-stone-100/50 text-stone-300">
                    <Ticket size={80} strokeWidth={1.2} />
                  </div>
                )}
              </StorefrontCard>
            </motion.div>

            <section
              className="flex flex-col"
              style={{ gap: "var(--sf-space-lg)" }}
            >
              <div
                className="flex flex-col"
                style={{ gap: "var(--sf-space-md)" }}
              >
                <motion.div
                  className="flex items-center justify-between md:flex-wrap md:justify-start"
                  style={{ gap: "var(--sf-space-sm)" }}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={introTransition(
                    STOREFRONT_DETAIL_MOTION_SEQUENCE_MS.badgesDelayMs,
                  )}
                >
                  <Badge variant="default">
                    {raffle.opportunities > 1 ? "Oportunidades" : "Simple"}
                  </Badge>
                  <Badge variant={statusBadge.variant}>
                    {statusBadge.label}
                  </Badge>
                </motion.div>
                <div
                  className="flex flex-col"
                  style={{ gap: "var(--sf-space-sm)" }}
                >
                  <motion.h1
                    ref={raffleTitleRef}
                    className="sf-text-hero text-stone-850"
                    initial={
                      prefersReducedMotion ? false : { opacity: 0, y: 16 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    transition={introTransition(
                      STOREFRONT_DETAIL_MOTION_SEQUENCE_MS.titleDelayMs,
                    )}
                  >
                    {raffle.title}
                  </motion.h1>
                  {!isFinalized && (
                    <motion.div
                      className="flex items-baseline gap-[var(--sf-space-xs)]"
                      initial={
                        prefersReducedMotion ? false : { opacity: 0, y: 12 }
                      }
                      animate={{ opacity: 1, y: 0 }}
                      transition={introTransition(
                        STOREFRONT_DETAIL_MOTION_SEQUENCE_MS.priceDelayMs,
                      )}
                    >
                      <p className="sf-text-display text-brand-500">
                        ${formatPrice(raffle.ticketPrice)}
                      </p>
                      <p className="sf-text-secondary text-stone-500">
                        por boleto
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>

              <div
                className="flex flex-col"
                style={{ gap: "var(--sf-space-md)" }}
              >
                <motion.div
                  className="flex flex-col"
                  style={{ gap: "var(--sf-space-xs)" }}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={introTransition(
                    STOREFRONT_DETAIL_MOTION_SEQUENCE_MS.descriptionDelayMs,
                  )}
                >
                  <h2 className="sf-text-h2 text-stone-950">Descripción</h2>
                  <p className="sf-text-body max-w-xl text-stone-500">
                    {raffle.description ||
                      (isFinalized
                        ? "Consulta los detalles y resultados oficiales de esta rifa."
                        : "Consulta los detalles de la rifa y elige tus boletos disponibles.")}
                  </p>
                </motion.div>
              </div>
            </section>
          </div>

          {hasPublishedResults && (
            <StorefrontReveal cadence="editorial" amount={0.2}>
              <RafflePublishedResult raffle={raffle} />
            </StorefrontReveal>
          )}

          {((raffle.prizes?.length ?? 0) > 0 || raffle.prizeShippingPolicy) && (
            <StorefrontReveal cadence="editorial" amount={0.25}>
              <section
                className="flex flex-col"
                style={{ gap: "var(--sf-space-md)" }}
                aria-label="Premios de la rifa"
              >
                {(raffle.prizes?.length ?? 0) > 0 && (
                  <>
                    <div
                      className="flex items-center"
                      style={{ gap: "var(--sf-space-sm)" }}
                    >
                      <div
                        className="flex shrink-0 items-center justify-center bg-brand-50 text-brand-500"
                        style={{
                          width: "var(--sf-size-icon-section)",
                          height: "var(--sf-size-icon-section)",
                          borderRadius: "var(--sf-radius-inner)",
                        }}
                      >
                        <Gift size={22} strokeWidth={2.1} />
                      </div>
                      <div
                        className="flex min-w-0 flex-col"
                        style={{ gap: "var(--sf-space-xs)" }}
                      >
                        <h2 className="sf-text-h2 text-stone-950">Premios</h2>
                        <p className="sf-text-secondary text-stone-500">
                          {raffle.prizes!.length === 1
                            ? "Consulta el premio definido para esta rifa."
                            : "Consulta qué recibe cada lugar de esta rifa."}
                        </p>
                      </div>
                    </div>

                    <div
                      className="flex flex-col"
                      style={{ gap: "var(--sf-space-md)" }}
                    >
                      {raffle.prizes!.map((prize, index) => (
                        <StorefrontAutonomousCard
                          key={prize.id}
                          density="compact"
                        >
                          <div
                            className="flex flex-col"
                            style={{ gap: "var(--sf-space-md)" }}
                          >
                            <div
                              className="flex items-center"
                              style={{ gap: "var(--sf-space-md)" }}
                            >
                              <div
                                className="flex shrink-0 items-center justify-center border border-brand-100 bg-brand-50 text-brand-600"
                                style={{
                                  width: "var(--sf-h-button-section)",
                                  height: "var(--sf-h-button-section)",
                                  borderRadius: "var(--sf-radius-card-inner)",
                                }}
                              >
                                <Trophy size={22} strokeWidth={2.1} />
                              </div>
                              <div
                                className="flex min-w-0 flex-col"
                                style={{ gap: "var(--sf-space-xs)" }}
                              >
                                <span className="sf-text-label text-brand-500">
                                  {formatPrizePosition(index)}
                                </span>
                                <h3 className="sf-text-h2 text-stone-950">
                                  {prize.title}
                                </h3>
                              </div>
                            </div>

                            <p className="sf-text-secondary max-w-3xl text-stone-600">
                              {prize.description}
                            </p>

                            {prize.winnerRule && (
                              <div
                                className="flex items-start border-t border-stone-200/70"
                                style={{
                                  gap: "var(--sf-space-sm)",
                                  paddingTop: "var(--sf-space-md)",
                                }}
                              >
                                <Award
                                  className="mt-[0.125rem] shrink-0 text-stone-500"
                                  size={18}
                                  strokeWidth={2}
                                />
                                <div
                                  className="flex min-w-0 flex-col"
                                  style={{ gap: "var(--sf-space-xs)" }}
                                >
                                  <span className="sf-text-label text-stone-500">
                                    Criterio de asignación
                                  </span>
                                  <p className="sf-text-secondary text-stone-600">
                                    {prize.winnerRule}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </StorefrontAutonomousCard>
                      ))}
                    </div>
                  </>
                )}

                {raffle.prizeShippingPolicy && (
                  <RafflePrizeShippingNote
                    policy={raffle.prizeShippingPolicy}
                  />
                )}
              </section>
            </StorefrontReveal>
          )}

          {raffle.gallery && raffle.gallery.length > 0 && (
            <StorefrontReveal cadence="editorial" amount={0.3}>
              <StorefrontMediaRail
                ariaLabel="Galería adicional de la rifa"
                itemCount={raffle.gallery.length}
              >
                {raffle.gallery.map((item, index) => (
                  <StorefrontRevealItem
                    key={item.id}
                    className="aspect-[7/5] w-[10rem] shrink-0 snap-start sm:w-[12rem]"
                  >
                    <button
                      type="button"
                      onClick={() => setViewerIndex(galleryStartIndex + index)}
                      aria-label={`Abrir ${item.fileType === "VIDEO" ? "video" : "fotografía"} de la rifa`}
                      className="relative h-full w-full overflow-hidden border border-stone-300 transition-colors hover:border-stone-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20"
                      style={{ borderRadius: "var(--sf-radius-media-tile)" }}
                    >
                      {item.fileType === "VIDEO" ? (
                        <>
                          {item.posterPath ? (
                            <img
                              src={item.posterPath}
                              className="h-full w-full object-cover"
                              alt="Miniatura del video"
                            />
                          ) : (
                            <video
                              src={item.filePath}
                              className="h-full w-full object-cover"
                              preload="metadata"
                              playsInline
                            />
                          )}
                          <StorefrontVideoThumbnailIndicator />
                        </>
                      ) : (
                        <img
                          src={item.filePath}
                          className="h-full w-full object-cover"
                          alt="Galería de la rifa"
                        />
                      )}
                    </button>
                  </StorefrontRevealItem>
                ))}
              </StorefrontMediaRail>
            </StorefrontReveal>
          )}

          <div className="grid grid-cols-1 items-start gap-[var(--sf-space-lg)] lg:grid-cols-2 lg:gap-[var(--sf-space-xl)]">
            <StorefrontReveal cadence="editorial">
              <div
                className="flex flex-col"
                style={{ gap: "var(--sf-space-md)" }}
              >
                <StorefrontCard
                  density="compact"
                  className="border-brand-500/20 bg-brand-500 text-white shadow-xl shadow-brand-500/15"
                >
                  <div
                    className="flex flex-col"
                    style={{ gap: "var(--sf-space-md)" }}
                  >
                    <h2 className="sf-text-h2">Información</h2>
                    <div
                      className="flex flex-col"
                      style={{ gap: "var(--sf-space-md)" }}
                    >
                      <RaffleInfoItem
                        icon={Calendar}
                        label="Fecha y hora de la rifa"
                        value={formatRaffleDrawDate(raffle.drawDate)}
                      />
                      <RaffleInfoItem
                        icon={Ticket}
                        label="Número de boletos"
                        value={raffle.ticketQuantity.toLocaleString("es-MX")}
                      />
                      {raffle.opportunities > 1 && (
                        <RaffleInfoItem
                          icon={Sparkles}
                          label="Números por boleto"
                          value={raffle.opportunities.toLocaleString("es-MX")}
                        />
                      )}
                    </div>
                  </div>
                </StorefrontCard>
                <RaffleCountdown
                  drawDate={raffle.drawDate}
                  participationStartsAt={raffle.participationStartsAt}
                  status={raffle.status}
                  resultPublishedAt={raffle.resultPublishedAt}
                  hasPublishedResults={hasPublishedResults}
                />
              </div>
            </StorefrontReveal>

            <StorefrontReveal
              cadence="editorial"
              delayMs={STOREFRONT_MOTION_MS.pulse.full * 2}
            >
              <section
                className="flex flex-col"
                style={{ gap: "var(--sf-space-md)" }}
                aria-label="Qué debes saber"
              >
                <h2 className="sf-text-h2 text-stone-950">Qué debes saber</h2>
                <div
                  className="flex flex-col"
                  style={{ gap: "var(--sf-space-md)" }}
                >
                  <RaffleKnowledgeItem
                    icon={Ticket}
                    title={
                      isFinalized
                        ? "Cómo participaba tu boleto"
                        : "Cómo participa tu boleto"
                    }
                    description={
                      raffle.opportunities > 1
                        ? isFinalized
                          ? `Cada boleto participó con ${raffle.opportunities} números: el número elegido y ${additionalOpportunities} oportunidades adicionales.`
                          : `Tu boleto participa con ${raffle.opportunities} números: el número que eliges y ${additionalOpportunities} oportunidades adicionales.`
                        : isFinalized
                          ? "Cada boleto participó con el número elegido."
                          : "Tu boleto participa con el número que eliges."
                    }
                  />
                  {raffle.opportunities > 1 && (
                    <RaffleKnowledgeItem
                      icon={Waypoints}
                      title="Asignación de oportunidades"
                      description={`Las oportunidades adicionales se asignan de forma ${distributionLabel}.`}
                    />
                  )}
                  <RaffleKnowledgeItem
                    icon={Trophy}
                    title="Resultado de la rifa"
                    description={`El número ganador se determina con los últimos ${raffle.digits} ${digitLabel} del Premio Mayor de la Lotería Nacional.`}
                  />
                  {!isFinalized && (
                    <RaffleKnowledgeItem
                      icon={Clock3}
                      title="Tiempo de apartado"
                      description={
                        reservationHours
                          ? `El apartado es temporal. Tienes ${reservationHoursLabel} para confirmar tu pago; si el plazo vence, tu selección se libera automáticamente.`
                          : "El apartado es temporal. Si el pago no se confirma dentro del plazo indicado, tu selección se libera automáticamente."
                      }
                    />
                  )}
                </div>
                <RaffleReferenceNote />
              </section>
            </StorefrontReveal>
          </div>

          <StorefrontReveal cadence="editorial" amount={0.2}>
            <RaffleParticipationLookupCard raffleId={raffle.id} />
          </StorefrontReveal>

          {!hasPublishedResults && (
            <StorefrontReveal cadence="editorial" amount={0.2}>
              <div
                id="raffle-ticket-selection"
                className="scroll-mt-[var(--sf-mobile-chrome-content-padding-top)]"
              >
                {canParticipate ? (
                  <TicketSelectionGrid
                    raffle={raffle}
                    ticketAvailability={ticketAvailability}
                    selectedTickets={selectedTickets}
                    onSelectedTicketsChange={(tickets) => {
                      setCoupon(null);
                      setSelectedTickets(tickets);
                    }}
                    onOpenSelection={handleSelectionBarAction}
                  />
                ) : participationState !== "CLOSED" ? (
                  <div
                    className={
                      participationState === "EARLY_ACCESS"
                        ? "grid grid-cols-1 items-start gap-[var(--sf-space-lg)] lg:grid-cols-2 lg:gap-[var(--sf-space-xl)]"
                        : "flex flex-col gap-[var(--sf-space-lg)]"
                    }
                  >
                    <RaffleParticipationGate
                      raffle={raffle}
                      state={participationState}
                      onUnlocked={setAccessToken}
                    />
                    <RaffleOpeningReminderCard
                      id="raffle-opening-reminder"
                      reminder={openingReminder}
                      className="hidden md:block"
                    />
                  </div>
                ) : (
                  <RaffleParticipationGate
                    raffle={raffle}
                    state={participationState}
                    onUnlocked={setAccessToken}
                  />
                )}
              </div>
            </StorefrontReveal>
          )}
        </div>
      </div>
      {canParticipate ? (
        <RaffleSelectionBar
          selectedCount={selectedTickets.length}
          total={selectedTotal}
          onAction={handleSelectionBarAction}
        />
      ) : participationState !== "CLOSED" ? (
        <RaffleOpeningReminderBar
          isRegistered={openingReminder.isRegistered}
          onAction={() => setIsOpeningReminderSheetOpen(true)}
        />
      ) : null}
      <BottomSheet
        isOpen={
          isOpeningReminderSheetOpen &&
          !canParticipate &&
          participationState !== "CLOSED"
        }
        onClose={() => setIsOpeningReminderSheetOpen(false)}
        title="Aviso de apertura"
        icon={BellRing}
      >
        <RaffleOpeningReminderContent reminder={openingReminder} />
      </BottomSheet>
      <RaffleOpportunityPeek
        selectedTickets={raffle.opportunities > 1 ? selectedTickets : []}
        ticketOpportunities={raffle.extraOpportunities ?? []}
        isOpen={isOpportunityPeekOpen}
        onOpen={() => setIsOpportunityPeekOpen(true)}
        onClose={() => setIsOpportunityPeekOpen(false)}
        onRemoveTicket={(ticket) => {
          setCoupon(null);
          setSelectedTickets((current) =>
            current.filter((selected) => selected !== ticket),
          );
        }}
      />
      <MediaViewer
        isOpen={viewerIndex !== null}
        media={selectedViewerMedia}
        showDetails={false}
        onClose={() => setViewerIndex(null)}
        canNavigate={canNavigateRaffleMedia}
        onPrevious={() => {
          if (!canNavigateRaffleMedia) return;
          setViewerIndex((current) =>
            current === null
              ? 0
              : (current - 1 + raffleMediaItems.length) %
                raffleMediaItems.length,
          );
        }}
        onNext={() => {
          if (!canNavigateRaffleMedia) return;
          setViewerIndex((current) =>
            current === null ? 0 : (current + 1) % raffleMediaItems.length,
          );
        }}
      />
    </div>
  );
}

function getRaffleResultStatusCopy(status?: string | null) {
  if (status === "ELIGIBLE_WINNER") {
    return "El boleto ganador cuenta con pago confirmado.";
  }
  if (status === "UNPAID_RESERVED") {
    return "El boleto asociado no tenía un pago confirmado al resolver la rifa.";
  }
  if (status === "PAYMENT_REVIEW") {
    return "El boleto ganador pertenece a una participación cuyo pago continúa en revisión.";
  }
  if (status === "UNASSIGNED_NUMBER") {
    return "El número ganador no corresponde a un boleto asignado.";
  }
  if (status === "OUTSIDE_UNIVERSE") {
    return "El resultado no corresponde a un número del universo de esta rifa.";
  }
  return "No existe una participación pagada asociada con este resultado.";
}

function getRaffleResultStatusMeta(status?: string | null) {
  if (status === "ELIGIBLE_WINNER") {
    return {
      label: "Ganador confirmado",
      variant: "success" as const,
      icon: CheckCircle2,
    };
  }
  if (status === "PAYMENT_REVIEW") {
    return {
      label: "Pago en revisión",
      variant: "warning" as const,
      icon: Clock3,
    };
  }
  return {
    label: "Sin ganador elegible",
    variant: "muted" as const,
    icon: CircleSlash2,
  };
}

function getRafflePlaceLabel(position?: number) {
  if (position === 1) return "Primer lugar";
  if (position === 2) return "Segundo lugar";
  if (position === 3) return "Tercer lugar";
  return `Lugar ${position || 1}`;
}

function RafflePublishedResult({ raffle }: { raffle: Raffle }) {
  const publishedPrizes = (raffle.prizes || []).filter(
    (prize) => prize.resultPublishedAt && prize.winningNumber,
  );

  const results =
    publishedPrizes.length > 0
      ? publishedPrizes
      : [
          {
            id: -1,
            position: 1,
            title: raffle.title,
            description: "",
            winnerRule: null,
            resultSource: "MAJOR_PRIZE" as const,
            resultSourceLabel: null,
            resultReferenceNumber: raffle.resultReferenceNumber,
            winningNumber: raffle.winningNumber,
            winningTicketNumber: raffle.winningTicketNumber,
            winningParticipationId: raffle.winningParticipationId,
            resultResolutionStatus: raffle.resultResolutionStatus,
            resultPublishedAt: raffle.resultPublishedAt,
          },
        ];

  return (
    <StorefrontAutonomousCard>
      <section
        className="flex flex-col"
        style={{ gap: "var(--sf-space-lg)" }}
        aria-label="Resultados oficiales"
      >
        <header
          className="flex items-start justify-between"
          style={{ gap: "var(--sf-space-md)" }}
        >
          <div
            className="flex min-w-0 items-center"
            style={{ gap: "var(--sf-space-md)" }}
          >
            <div
              className="flex shrink-0 items-center justify-center border border-brand-100 bg-brand-50 text-brand-600"
              style={{
                width: "var(--sf-h-button-section)",
                height: "var(--sf-h-button-section)",
                borderRadius: "var(--sf-radius-card-inner)",
              }}
            >
              <Trophy size={22} strokeWidth={2.1} />
            </div>
            <div
              className="flex min-w-0 flex-col"
              style={{ gap: "var(--sf-space-xs)" }}
            >
              <p className="sf-text-label text-brand-600">Rifa finalizada</p>
              <h2 className="sf-text-h2 text-stone-950">
                Resultados oficiales
              </h2>
            </div>
          </div>
          <Badge
            variant="success"
            context="autonomous"
            icon={CheckCircle2}
            className="shrink-0"
          >
            Publicados
          </Badge>
        </header>

        <p className="sf-text-secondary max-w-2xl text-stone-600">
          Consulta los números ganadores y la resolución oficial de cada premio.
        </p>

        <div className="flex flex-col">
          <div className="flex flex-col border-t border-stone-200">
            {results.map((prize, index) => {
              const resultStatus = getRaffleResultStatusMeta(
                prize.resultResolutionStatus,
              );
              const resultReference =
                prize.resultReferenceNumber || prize.winningNumber;

              return (
                <article
                  key={prize.id}
                  className={
                    index > 0
                      ? "flex flex-col border-t border-stone-200"
                      : "flex flex-col"
                  }
                  style={{
                    gap: "var(--sf-space-md)",
                    paddingBlock: "var(--sf-padding-inner)",
                  }}
                >
                  <div
                    className="flex flex-wrap items-start justify-between"
                    style={{ gap: "var(--sf-space-md)" }}
                  >
                    <div
                      className="flex min-w-0 items-center"
                      style={{ gap: "var(--sf-space-sm)" }}
                    >
                      <div
                        className="flex shrink-0 items-center justify-center bg-stone-100 text-stone-600"
                        style={{
                          width: "var(--sf-h-button-card)",
                          height: "var(--sf-h-button-card)",
                          borderRadius: "var(--sf-radius-card-nested)",
                        }}
                      >
                        <Trophy size={18} strokeWidth={2.1} />
                      </div>
                      <div
                        className="flex min-w-0 flex-col"
                        style={{ gap: "var(--sf-space-2xs)" }}
                      >
                        <span className="sf-text-label text-stone-500">
                          {getRafflePlaceLabel(prize.position)}
                        </span>
                        <h3 className="sf-text-body font-semibold text-stone-950">
                          {prize.title}
                        </h3>
                      </div>
                    </div>
                    <Badge
                      variant={resultStatus.variant}
                      context="autonomous"
                      icon={resultStatus.icon}
                    >
                      {resultStatus.label}
                    </Badge>
                  </div>

                  <dl
                    className="grid grid-cols-3"
                    style={{ gap: "var(--sf-space-sm)" }}
                  >
                    <RaffleResultFact
                      label="Resultado oficial"
                      value={resultReference || "—"}
                    />
                    <RaffleResultFact
                      label="Número ganador"
                      value={prize.winningNumber || "—"}
                    />
                    <RaffleResultFact
                      label="Boleto principal"
                      value={prize.winningTicketNumber || "No aplica"}
                    />
                  </dl>

                  <p className="sf-text-secondary text-stone-600">
                    {getRaffleResultStatusCopy(prize.resultResolutionStatus)}
                  </p>
                </article>
              );
            })}
          </div>

          <div
            className="flex items-start border-t border-stone-200"
            style={{
              gap: "var(--sf-space-sm)",
              paddingTop: "var(--sf-space-md)",
            }}
          >
            <Award
              className="mt-[0.125rem] shrink-0 text-stone-500"
              size={18}
              strokeWidth={2}
            />
            <div
              className="flex min-w-0 flex-col"
              style={{ gap: "var(--sf-space-xs)" }}
            >
              <span className="sf-text-label text-stone-500">
                Referencia oficial
              </span>
              <p className="sf-text-secondary text-stone-600">
                El resultado se determinó con los últimos {raffle.digits}{" "}
                {raffle.digits === 1 ? "dígito" : "dígitos"} del Premio Mayor de
                la Lotería Nacional.
              </p>
            </div>
          </div>
        </div>
      </section>
    </StorefrontAutonomousCard>
  );
}

function RaffleResultFact({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex min-w-0 flex-col"
      style={{ gap: "var(--sf-space-2xs)" }}
    >
      <dt className="sf-text-label text-stone-500">{label}</dt>
      <dd className="sf-text-h2 truncate tabular-nums text-stone-950">
        {value}
      </dd>
    </div>
  );
}

function formatPrizePosition(index: number) {
  return index === 0 ? "1.er lugar" : `${index + 1}.º lugar`;
}

function RaffleInfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center" style={{ gap: "var(--sf-space-sm)" }}>
      <div
        className="flex shrink-0 items-center justify-center border border-white/85 text-white"
        style={{
          width: "var(--sf-h-button-card)",
          height: "var(--sf-h-button-card)",
          borderRadius: "var(--sf-radius-card-inner)",
        }}
      >
        <Icon size={20} strokeWidth={2.1} />
      </div>
      <div className="min-w-0">
        <span className="sf-text-label text-white/90">{label}</span>
        <p
          className="sf-text-h2 leading-tight text-white"
          suppressHydrationWarning
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function RaffleKnowledgeItem({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div
      className="grid grid-cols-[auto_minmax(0,1fr)]"
      style={{ gap: "var(--sf-space-sm)" }}
    >
      <Icon
        className="mt-[0.125rem] text-stone-950"
        size={20}
        strokeWidth={2}
      />
      <div
        className="flex min-w-0 flex-col"
        style={{ gap: "var(--sf-space-xs)" }}
      >
        <h3 className="sf-text-secondary-strong text-stone-950">{title}</h3>
        <p className="sf-text-secondary max-w-xl text-stone-600">
          {description}
        </p>
      </div>
    </div>
  );
}

function RaffleReferenceNote() {
  return (
    <StorefrontNote>
      <p>
        Esta rifa toma como referencia el resultado público del Premio Mayor de
        la Lotería Nacional para definir el número ganador.
      </p>
    </StorefrontNote>
  );
}

function RafflePrizeShippingNote({
  policy,
}: {
  policy: Raffle["prizeShippingPolicy"];
}) {
  if (!policy) return null;

  const isIncluded = policy === "INCLUDED";

  return (
    <StorefrontNote
      icon={isIncluded ? PackageCheck : Truck}
      tone={isIncluded ? "default" : "warning"}
    >
      <div className="flex flex-col" style={{ gap: "var(--sf-space-xs)" }}>
        <h3 className="sf-text-secondary-strong text-stone-950">
          {isIncluded ? "Envío incluido" : "Envío a cargo del ganador"}
        </h3>
        <p>
          {isIncluded
            ? "El envío del premio está incluido. Coordinaremos directamente con el ganador la entrega más conveniente."
            : "El costo del envío será cubierto por el ganador. El método y los detalles de entrega se coordinarán después de la rifa."}
        </p>
      </div>
    </StorefrontNote>
  );
}

function RaffleCountdown({
  drawDate,
  participationStartsAt,
  status,
  resultPublishedAt,
  hasPublishedResults,
}: {
  drawDate: string | null;
  participationStartsAt: string | null;
  status: Raffle["status"];
  resultPublishedAt: string | null;
  hasPublishedResults: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  const drawTargetDate = drawDate ? new Date(drawDate) : null;
  const publicStartDate = participationStartsAt
    ? new Date(participationStartsAt)
    : null;
  const hasValidDrawDate = Boolean(
    drawTargetDate && !Number.isNaN(drawTargetDate.getTime()),
  );
  const hasValidPublicStart = Boolean(
    publicStartDate && !Number.isNaN(publicStartDate.getTime()),
  );
  const isWaitingForPublicOpening =
    status === "ACTIVE" &&
    hasValidPublicStart &&
    now < publicStartDate!.getTime();
  const targetDate = isWaitingForPublicOpening
    ? publicStartDate
    : drawTargetDate;
  const hasValidTargetDate = Boolean(
    targetDate && !Number.isNaN(targetDate.getTime()),
  );

  useEffect(() => {
    if ((!hasValidDrawDate && !hasValidPublicStart) || status !== "ACTIVE")
      return;

    const intervalId = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(intervalId);
  }, [hasValidDrawDate, hasValidPublicStart, status]);

  if ((!hasValidTargetDate || !targetDate) && !hasPublishedResults) return null;

  const remainingMs = targetDate ? Math.max(0, targetDate.getTime() - now) : 0;
  const hasReachedDrawTime = remainingMs === 0;
  const totalMinutes = Math.floor(remainingMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const stateLabel =
    status === "FINISHED"
      ? hasPublishedResults
        ? "Resultados publicados"
        : "La rifa finalizó"
      : status === "CANCELLED"
        ? "La rifa fue cancelada"
        : isWaitingForPublicOpening
          ? "La participación pública comienza en"
          : hasReachedDrawTime
            ? "Resultado pendiente de publicar"
            : "El resultado se define en";

  return (
    <StorefrontAutonomousCard
      density="compact"
      className="border-brand-500/20 bg-brand-50 text-stone-950"
    >
      <div className="flex flex-col" style={{ gap: "var(--sf-space-md)" }}>
        <div
          className="flex items-center"
          style={{ gap: "var(--sf-space-md)" }}
        >
          {hasPublishedResults ? (
            <Trophy
              className="shrink-0 text-brand-500"
              size={20}
              strokeWidth={2.2}
            />
          ) : (
            <Timer
              className="shrink-0 text-brand-500"
              size={20}
              strokeWidth={2.2}
            />
          )}
          <h3 className="sf-text-secondary-strong">{stateLabel}</h3>
        </div>

        {status === "FINISHED" && hasPublishedResults && (
          <p className="sf-text-secondary text-stone-600">
            La rifa concluyó
            {resultPublishedAt
              ? ` y sus resultados se publicaron el ${formatRaffleDrawDate(resultPublishedAt)}.`
              : "."}
          </p>
        )}

        {status === "ACTIVE" && !hasReachedDrawTime && (
          <div
            className="grid grid-cols-3"
            style={{ gap: "var(--sf-space-md)" }}
          >
            <CountdownUnit value={days} label="Días" />
            <CountdownUnit value={hours} label="Horas" />
            <CountdownUnit value={minutes} label="Minutos" />
          </div>
        )}
      </div>
    </StorefrontAutonomousCard>
  );
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="flex min-w-0 flex-col"
      style={{ gap: "var(--sf-space-xs)" }}
    >
      <span
        className="sf-text-display leading-none text-brand-500"
        suppressHydrationWarning
      >
        {value}
      </span>
      <span className="sf-text-label text-stone-500">{label}</span>
    </div>
  );
}
