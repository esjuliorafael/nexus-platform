"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { SmartImage } from "../ui/SmartImage";
import { homeSlidesApi } from "../../api/homeSlides";
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

export function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [dynamicSlides, setDynamicSlides] = useState<HeroSlide[]>([]);
  const [isLoadingSlides, setIsLoadingSlides] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      if (!titleRef.current) return;

      gsap.fromTo(
        titleRef.current.querySelectorAll(".word"),
        { y: 48, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.75,
          stagger: 0.045,
          ease: "power4.out",
        },
      );
    },
    { dependencies: [current], scope: containerRef },
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
    if (slides.length <= 1) return;

    const timer = window.setTimeout(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, getSlideDuration(slides[current]?.displayDurationMs));
    return () => window.clearTimeout(timer);
  }, [current, slides]);

  if (isLoadingSlides || slides.length === 0) return null;

  const slide = slides[current] || slides[0];
  const slideDuration = getSlideDuration(slide.displayDurationMs);
  const primaryText = slide.primaryText || "Ver Catalogo";
  const primaryHref = slide.primaryHref || "/store";
  const secondaryText = slide.secondaryText || "Explorar Rancho";
  const secondaryHref = slide.secondaryHref || "/gallery";
  const isVideo = slide.type === "VIDEO";

  return (
    <section
      ref={containerRef}
      className="relative flex h-[100dvh] min-h-[100svh] w-full items-center overflow-hidden bg-stone-950"
    >
      <div className="sf-hero-media-stage absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 0.5, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
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
              />
            ) : (
              <SmartImage
                src={slide.image}
                alt={slide.title}
                className="sf-hero-media animate-slow-pan"
                wrapperClassName="h-full w-full"
                priority
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/45 to-transparent" />
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        className="relative z-10 mx-auto w-full max-w-[1440px] px-[var(--sf-inset-page-mobile)] lg:px-12"
        style={{ gap: "var(--sf-space-xl)" }}
      >
        <div
          className="flex max-w-4xl flex-col"
          style={{ gap: "var(--sf-space-lg)" }}
        >
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Badge className="border-brand-500/20 bg-brand-500/10 text-brand-400">
              <Sparkles size={10} className="mr-2" />
              {slide.badge}
            </Badge>
          </motion.div>

          <h1
            ref={titleRef}
            className="sf-text-hero max-w-4xl text-white uppercase"
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
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="sf-text-body max-w-xl text-stone-400"
          >
            {slide.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex flex-wrap items-center pt-2"
            style={{ gap: "var(--sf-space-sm)" }}
          >
            <Button
              asChild
              context="section"
              className="bg-brand-500 hover:bg-brand-600"
            >
              <Link href={primaryHref}>
                {primaryText}
                <ArrowRight className="ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              context="section"
              className="border-white/10 text-white hover:bg-white hover:text-stone-950"
            >
              <Link href={secondaryHref}>{secondaryText}</Link>
            </Button>
          </motion.div>
        </div>
      </div>

      <div
        className="absolute bottom-12 left-6 z-10 flex items-center lg:left-12"
        style={{ gap: "var(--sf-space-sm)" }}
      >
        <span className="sf-text-label text-brand-500">0{current + 1}</span>
        <div className="relative h-px w-32 bg-white/20">
          <motion.div
            key={`${current}-${slideDuration}`}
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: slideDuration / 1000, ease: "linear" }}
            className="absolute inset-0 bg-brand-500"
          />
        </div>
        <span className="sf-text-label text-stone-600">0{slides.length}</span>
      </div>
    </section>
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
