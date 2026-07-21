"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { MoveHorizontal, Video } from "lucide-react";
import { StorefrontRevealGroup } from "./Reveal";

interface StorefrontMediaRailProps {
  ariaLabel: string;
  children: ReactNode;
  itemCount: number;
  title?: string;
}

export function StorefrontMediaRail({
  ariaLabel,
  children,
  itemCount,
  title = "Galería",
}: StorefrontMediaRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const updateOverflow = () => {
      setHasOverflow(rail.scrollWidth > rail.clientWidth + 1);
    };

    const frame = window.requestAnimationFrame(updateOverflow);
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateOverflow);

    observer?.observe(rail);
    window.addEventListener("resize", updateOverflow);

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", updateOverflow);
    };
  }, [itemCount]);

  return (
    <section
      className="flex flex-col"
      style={{ gap: "var(--sf-space-md)" }}
      aria-label={ariaLabel}
    >
      <div
        className="flex items-center justify-between"
        style={{ gap: "var(--sf-space-md)" }}
      >
        <h2 className="sf-text-h2 text-stone-950">{title}</h2>
        <div
          className={`flex items-center text-stone-500 transition-opacity ${
            hasOverflow ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          style={{ gap: "var(--sf-space-sm)" }}
          aria-hidden={!hasOverflow}
        >
          <MoveHorizontal
            aria-hidden="true"
            style={{
              width: "var(--sf-size-inner-icon-badge)",
              height: "var(--sf-size-inner-icon-badge)",
            }}
          />
          <span className="sf-text-secondary md:hidden">
            Desliza hacia la izquierda
          </span>
          <span className="sf-text-secondary hidden md:inline">
            Arrastra hacia la izquierda
          </span>
        </div>
      </div>

      <div
        ref={railRef}
        className="-mx-[var(--sf-inset-page)] snap-x snap-mandatory overflow-x-auto scrollbar-hide [scroll-padding-inline:var(--sf-inset-page)]"
      >
        <StorefrontRevealGroup
          cadence="compact"
          className="flex w-max min-w-full px-[var(--sf-inset-page)] pb-[var(--sf-space-xs)]"
          style={{ gap: "var(--sf-space-base)" }}
          amount={0.25}
        >
          {children}
        </StorefrontRevealGroup>
      </div>
    </section>
  );
}

export function StorefrontVideoThumbnailIndicator() {
  return (
    <span
      className="absolute right-[var(--sf-padding-inner)] top-[var(--sf-padding-inner)] flex items-center justify-center border border-white/20 bg-stone-950/45 text-white shadow-sm backdrop-blur-sm"
      style={{
        width: "var(--sf-h-button-card)",
        height: "var(--sf-h-button-card)",
        borderRadius: "var(--sf-radius-card-inner)",
      }}
      aria-hidden="true"
    >
      <Video
        style={{
          width: "var(--sf-size-inner-icon-card)",
          height: "var(--sf-size-inner-icon-card)",
        }}
      />
    </span>
  );
}
