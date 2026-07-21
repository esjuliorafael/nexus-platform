"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowRight } from "lucide-react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { SmartImage } from "../ui/SmartImage";
import { homeSlidesApi } from "../../api/homeSlides";
import {
  HERO_MOTION_SEQUENCE_MS,
  STOREFRONT_EASING,
  STOREFRONT_MOTION_MS,
  toMotionSeconds,
} from "../../lib/motion";
import { HomeSlide } from "../../types";
import { getAssetUrl } from "../../utils/formatters";

interface HeroSlide {
  image: string;
  type?: "PHOTO" | "VIDEO";
  title: string;
  subtitle: string;
  badge: string;
  displayDurationMs: number;
  primaryText?: string | null;
  primaryHref?: string | null;
  secondaryText?: string | null;
  secondaryHref?: string | null;
  desktopObjectPosition?: string | null;
  mobileObjectPosition?: string | null;
  posterUrl?: string | null;
}

const getSlideDuration = (durationMs?: number | null) => {
  if (!durationMs || Number.isNaN(durationMs)) return 8000;
  return Math.min(Math.max(durationMs, 3000), 60000);
};

type HeroRevealMode = "initial" | "transition";

interface HeroRevealSequence {
  slideIndex: number;
  mode: HeroRevealMode;
}

export function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [dynamicSlides, setDynamicSlides] = useState<HeroSlide[]>([]);
  const [isLoadingSlides, setIsLoadingSlides] = useState(true);
  const [revealSequence, setRevealSequence] =
    useState<HeroRevealSequence | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const mobileTitleRef = useRef<HTMLHeadingElement>(null);
  const hasRevealedRef = useRef(false);
  const currentRef = useRef(current);
  const reduceMotion = useReducedMotion();
  const isEditorialReady = revealSequence?.slideIndex === current;
  const revealMode: HeroRevealMode = isEditorialReady
    ? revealSequence.mode
    : hasRevealedRef.current
      ? "transition"
      : "initial";
  const choreography = HERO_MOTION_SEQUENCE_MS[revealMode];
  currentRef.current = current;

  const markMediaReady = (slideIndex: number) => {
    if (slideIndex !== currentRef.current) return;

    setRevealSequence((previous) => {
      if (previous?.slideIndex === slideIndex) return previous;

      const mode: HeroRevealMode = hasRevealedRef.current
        ? "transition"
        : "initial";
      hasRevealedRef.current = true;
      return { slideIndex, mode };
    });
  };

  useGSAP(
    () => {
      const words = [
        ...(titleRef.current?.querySelectorAll(".word") ?? []),
        ...(mobileTitleRef.current?.querySelectorAll(".word") ?? []),
      ];
      if (words.length === 0) return;

      if (!isEditorialReady) {
        gsap.set(words, { y: reduceMotion ? 0 : 48, opacity: 0 });
        return;
      }

      if (reduceMotion) {
        gsap.set(words, { y: 0, opacity: 1 });
        return;
      }

      gsap.fromTo(
        words,
        { y: 48, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          delay: toMotionSeconds(choreography.titleDelayMs),
          duration: toMotionSeconds(choreography.titleDurationMs),
          stagger: toMotionSeconds(choreography.titleStaggerMs),
          ease: "power4.out",
        },
      );
    },
    {
      dependencies: [
        current,
        dynamicSlides.length,
        isEditorialReady,
        revealMode,
        reduceMotion,
      ],
      scope: containerRef,
    },
  );

  useEffect(() => {
    const loadSlides = async () => {
      try {
        const slides = await homeSlidesApi.getAll();
        setDynamicSlides(slides.map(mapHomeSlide));
        setCurrent(0);
      } catch (error) {
        console.error("Error loading home slides:", error);
        setDynamicSlides([]);
      } finally {
        setIsLoadingSlides(false);
      }
    };

    loadSlides();
  }, []);

  const slides = dynamicSlides;

  useEffect(() => {
    if (slides.length <= 1 || !isEditorialReady) return;

    const timer = window.setTimeout(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, getSlideDuration(slides[current]?.displayDurationMs));
    return () => window.clearTimeout(timer);
  }, [current, isEditorialReady, slides]);

  if (isLoadingSlides) {
    return (
      <section
        className="h-[100dvh] min-h-[100svh] w-full bg-stone-950"
        style={{ backgroundColor: "#0c0a09" }}
        aria-busy="true"
        aria-label="Cargando contenido principal"
      />
    );
  }

  if (slides.length === 0) return null;

  const slide = slides[current] || slides[0];
  const slideDuration = getSlideDuration(slide.displayDurationMs);
  const primaryText = slide.primaryText || "Ver Catalogo";
  const primaryHref = slide.primaryHref || "/store";
  const secondaryText = slide.secondaryText?.trim() || null;
  const secondaryHref = slide.secondaryHref?.trim() || null;
  const hasSecondaryCta = Boolean(secondaryText && secondaryHref);
  const isVideo = slide.type === "VIDEO";

  return (
    <section
      ref={containerRef}
      className="relative flex h-[100dvh] min-h-[100svh] w-full items-center overflow-hidden bg-stone-950"
    >
      <div className="sf-hero-media-stage absolute inset-0 z-0">
        <AnimatePresence mode="sync">
          <motion.div
            key={current}
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 1.08 }}
            animate={{ opacity: 0.5, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: reduceMotion
                ? 0
                : toMotionSeconds(choreography.mediaDurationMs),
              ease: STOREFRONT_EASING.standard,
            }}
            className="absolute inset-0"
            style={
              {
                "--sf-hero-mobile-object-position":
                  slide.mobileObjectPosition || "50% 44%",
                "--sf-hero-desktop-object-position":
                  slide.desktopObjectPosition || "50% 50%",
              } as CSSProperties
            }
          >
            {isVideo ? (
              <video
                src={slide.image}
                poster={getAssetUrl(slide.posterUrl)}
                className="sf-hero-media h-full w-full animate-slow-pan object-cover"
                autoPlay
                muted
                loop
                playsInline
                onLoadedData={() => markMediaReady(current)}
                onError={() => markMediaReady(current)}
              />
            ) : (
              <SmartImage
                src={slide.image}
                alt={slide.title}
                className="sf-hero-media animate-slow-pan"
                wrapperClassName="h-full w-full"
                priority
                onLoad={() => markMediaReady(current)}
                onError={() => markMediaReady(current)}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/45 to-transparent" />
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        className="relative z-10 mx-auto hidden w-full max-w-[1440px] px-[var(--sf-inset-page-mobile)] md:block lg:px-12"
        style={{ gap: "var(--sf-space-xl)" }}
      >
        <div
          className="flex max-w-4xl flex-col"
          style={{ gap: "var(--sf-space-lg)" }}
        >
          <motion.div
            key={`desktop-badge-${current}`}
            initial={{ opacity: 0, x: -16 }}
            animate={
              isEditorialReady
                ? { opacity: 1, x: 0 }
                : { opacity: 0, x: -16 }
            }
            transition={{
              delay: reduceMotion
                ? 0
                : toMotionSeconds(choreography.badgeDelayMs),
              duration: reduceMotion
                ? 0
                : toMotionSeconds(STOREFRONT_MOTION_MS.duration.deliberate),
              ease: STOREFRONT_EASING.standard,
            }}
          >
            <Badge className="border-brand-500/20 bg-brand-500/10 text-brand-400">
              {slide.badge}
            </Badge>
          </motion.div>

          <h1
            ref={titleRef}
            className="sf-text-hero max-w-4xl tracking-normal text-white"
          >
            {slide.title.split(" ").map((word, index) => (
              <span key={index} className="word mr-[0.2em] inline-block">
                {word}
              </span>
            ))}
          </h1>

          <motion.p
            key={`p-${current}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: isEditorialReady ? 1 : 0 }}
            transition={{
              delay: reduceMotion
                ? 0
                : toMotionSeconds(choreography.descriptionDelayMs),
              duration: reduceMotion
                ? 0
                : toMotionSeconds(STOREFRONT_MOTION_MS.duration.deliberate),
              ease: STOREFRONT_EASING.standard,
            }}
            className="sf-text-body max-w-xl text-stone-400"
          >
            {slide.subtitle}
          </motion.p>

          <motion.div
            key={`desktop-actions-${current}`}
            initial={{ opacity: 0, y: 16 }}
            animate={
              isEditorialReady
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 16 }
            }
            transition={{
              delay: reduceMotion
                ? 0
                : toMotionSeconds(choreography.actionsDelayMs),
              duration: reduceMotion
                ? 0
                : toMotionSeconds(STOREFRONT_MOTION_MS.duration.deliberate),
              ease: STOREFRONT_EASING.standard,
            }}
            className="hidden flex-wrap items-center pt-2 md:flex"
            style={{ gap: "var(--sf-space-sm)" }}
          >
            <HeroActions
              primaryText={primaryText}
              primaryHref={primaryHref}
              secondaryText={secondaryText}
              secondaryHref={secondaryHref}
            />
          </motion.div>
        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-12 left-6 z-10 hidden md:block lg:left-12">
          <SlideProgress
            current={current}
            total={slides.length}
            duration={slideDuration}
            ready={isEditorialReady}
            delayMs={choreography.progressDelayMs}
            reduceMotion={Boolean(reduceMotion)}
          />
        </div>
      )}

      <div
        className="absolute left-[var(--sf-inset-mobile-chrome)] right-[var(--sf-inset-mobile-chrome)] z-10 flex flex-col md:hidden"
        style={{
          bottom: 'calc(var(--sf-inset-mobile-chrome-block) + env(safe-area-inset-bottom, 0px))',
          gap: 'var(--sf-space-lg)',
        }}
      >
        <div className="flex min-w-0 flex-col" style={{ gap: 'var(--sf-space-md)' }}>
          <motion.div
            key={`mobile-badge-${current}`}
            initial={{ opacity: 0, x: -16 }}
            animate={
              isEditorialReady
                ? { opacity: 1, x: 0 }
                : { opacity: 0, x: -16 }
            }
            transition={{
              delay: reduceMotion
                ? 0
                : toMotionSeconds(choreography.badgeDelayMs),
              duration: reduceMotion
                ? 0
                : toMotionSeconds(STOREFRONT_MOTION_MS.duration.deliberate),
              ease: STOREFRONT_EASING.standard,
            }}
          >
            <Badge className="border-brand-500/20 bg-brand-500/10 text-brand-400">
              {slide.badge}
            </Badge>
          </motion.div>

          <div className="flex min-w-0 flex-col" style={{ gap: 'var(--sf-space-sm)' }}>
            <h1
              ref={mobileTitleRef}
              className="sf-text-hero max-w-full tracking-normal text-white"
            >
              {slide.title.split(" ").map((word, index) => (
                <span key={index} className="word mr-[0.2em] inline-block">
                  {word}
                </span>
              ))}
            </h1>

            <motion.p
              key={`mobile-p-${current}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: isEditorialReady ? 1 : 0 }}
              transition={{
                delay: reduceMotion
                  ? 0
                  : toMotionSeconds(choreography.descriptionDelayMs),
                duration: reduceMotion
                  ? 0
                  : toMotionSeconds(STOREFRONT_MOTION_MS.duration.deliberate),
                ease: STOREFRONT_EASING.standard,
              }}
              className="sf-text-body line-clamp-3 max-w-xl text-stone-300"
            >
              {slide.subtitle}
            </motion.p>
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: 'var(--sf-space-md)' }}>
          {slides.length > 1 && (
            <SlideProgress
              current={current}
              total={slides.length}
              duration={slideDuration}
              fullWidth
              ready={isEditorialReady}
              delayMs={choreography.progressDelayMs}
              reduceMotion={Boolean(reduceMotion)}
            />
          )}
          <motion.div
            key={`mobile-actions-${current}`}
            initial={{ opacity: 0, y: 16 }}
            animate={
              isEditorialReady
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 16 }
            }
            transition={{
              delay: reduceMotion
                ? 0
                : toMotionSeconds(choreography.actionsDelayMs),
              duration: reduceMotion
                ? 0
                : toMotionSeconds(STOREFRONT_MOTION_MS.duration.deliberate),
              ease: STOREFRONT_EASING.standard,
            }}
            className={`grid ${hasSecondaryCta ? "grid-cols-2" : "grid-cols-1"}`}
            style={{ gap: 'var(--sf-space-sm)' }}
          >
            <HeroActions
              primaryText={primaryText}
              primaryHref={primaryHref}
              secondaryText={secondaryText}
              secondaryHref={secondaryHref}
              mobile
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function HeroActions({
  primaryText,
  primaryHref,
  secondaryText,
  secondaryHref,
  mobile = false,
}: {
  primaryText: string;
  primaryHref: string;
  secondaryText?: string | null;
  secondaryHref?: string | null;
  mobile?: boolean;
}) {
  return (
    <>
      <Button
        asChild
        context="section"
        className={`${mobile ? 'w-full min-w-0' : ''} bg-brand-500 hover:bg-brand-600`}
        style={mobile ? { paddingInline: 'var(--sf-space-base)' } : undefined}
      >
        <Link href={primaryHref} className="flex min-w-0 items-center justify-center">
          <span className="truncate">{primaryText}</span>
          <ArrowRight className="ml-2 shrink-0 transition-transform group-hover:translate-x-1" />
        </Link>
      </Button>
      {secondaryText && secondaryHref && (
        <Button
          asChild
          variant="outline"
          context="section"
          className={`${mobile ? 'w-full min-w-0 bg-stone-950/20 backdrop-blur-md' : ''} border-white/10 text-white hover:bg-white hover:text-stone-950`}
          style={mobile ? { paddingInline: 'var(--sf-space-base)' } : undefined}
        >
          <Link href={secondaryHref} className="flex min-w-0 items-center justify-center">
            <span className="truncate">{secondaryText}</span>
          </Link>
        </Button>
      )}
    </>
  );
}

function SlideProgress({
  current,
  total,
  duration,
  fullWidth = false,
  ready,
  delayMs,
  reduceMotion,
}: {
  current: number;
  total: number;
  duration: number;
  fullWidth?: boolean;
  ready: boolean;
  delayMs: number;
  reduceMotion: boolean;
}) {
  return (
    <motion.div
      key={`slide-progress-${current}-${total}`}
      initial={{ opacity: 0, y: 4 }}
      animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
      transition={{
        delay: reduceMotion ? 0 : toMotionSeconds(delayMs),
        duration: reduceMotion
          ? 0
          : toMotionSeconds(STOREFRONT_MOTION_MS.duration.standard),
        ease: STOREFRONT_EASING.standard,
      }}
      className={`flex items-center ${fullWidth ? 'w-full' : ''}`}
      style={{ gap: 'var(--sf-space-sm)' }}
    >
      <span className="sf-text-label text-brand-500">
        {String(current + 1).padStart(2, '0')}
      </span>
      <div className={`relative h-px ${fullWidth ? 'min-w-0 flex-1' : 'w-32'} bg-white/20`}>
        <motion.div
          key={`${current}-${duration}`}
          initial={{ width: 0 }}
          animate={{ width: ready ? '100%' : 0 }}
          transition={{
            delay: reduceMotion ? 0 : toMotionSeconds(delayMs),
            duration: reduceMotion
              ? 0
              : Math.max(
                  toMotionSeconds(duration - delayMs),
                  toMotionSeconds(STOREFRONT_MOTION_MS.duration.instant),
                ),
            ease: STOREFRONT_EASING.linear,
          }}
          className="absolute inset-0 bg-brand-500"
        />
      </div>
      <span className={`sf-text-label ${fullWidth ? 'text-white/60' : 'text-stone-600'}`}>
        {String(total).padStart(2, '0')}
      </span>
    </motion.div>
  );
}

function mapHomeSlide(slide: HomeSlide): HeroSlide {
  return {
    image: getAssetUrl(slide.mediaUrl),
    type: slide.type,
    title: slide.title,
    subtitle: slide.description || "",
    badge: slide.eyebrow || "Destacado",
    displayDurationMs: getSlideDuration(slide.displayDurationMs),
    primaryText: slide.primaryText,
    primaryHref: slide.primaryHref,
    secondaryText: slide.secondaryText,
    secondaryHref: slide.secondaryHref,
    desktopObjectPosition: slide.desktopObjectPosition,
    mobileObjectPosition: slide.mobileObjectPosition,
    posterUrl: slide.posterUrl,
  };
}
