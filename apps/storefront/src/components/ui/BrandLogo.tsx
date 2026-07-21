"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "../../utils/cn";
import { StorefrontBrandSurface } from "./BrandSurface";

type BrandLogoSize = "mobile" | "desktop";
type BrandLogoStatus = "idle" | "loading" | "ready" | "error";

interface StorefrontBrandLogoProps {
  src?: string | null;
  alt: string;
  size: BrandLogoSize;
  className?: string;
}

const dimensionsBySize: Record<
  BrandLogoSize,
  { maxHeight: string; maxWidth: string }
> = {
  mobile: {
    maxHeight: "var(--sf-h-brand-logo-mobile)",
    maxWidth: "var(--sf-w-brand-logo-mobile-max)",
  },
  desktop: {
    maxHeight: "var(--sf-h-brand-logo-desktop)",
    maxWidth: "var(--sf-w-brand-logo-desktop-max)",
  },
};

export function useBrandImageReady(src?: string | null) {
  const [status, setStatus] = useState<BrandLogoStatus>("idle");

  useEffect(() => {
    setStatus(src ? "loading" : "idle");

    if (!src) return;

    let active = true;
    const image = new Image();

    const markReady = () => {
      if (active) setStatus("ready");
    };
    const markError = () => {
      if (active) setStatus("error");
    };

    image.onload = markReady;
    image.onerror = markError;
    image.src = src;

    if (image.complete) {
      if (image.naturalWidth > 0) markReady();
      else markError();
    }

    return () => {
      active = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [src]);

  return status === "ready";
}

export function StorefrontBrandLogo({
  src,
  alt,
  size,
  className,
}: StorefrontBrandLogoProps) {
  const isReady = useBrandImageReady(src);

  if (!src || !isReady) return null;

  const dimensions = dimensionsBySize[size];

  return (
    <Link
      href="/"
      className={cn(
        "sf-brand-logo-reveal inline-flex items-center justify-center",
        className,
      )}
      aria-label={`Ir al inicio de ${alt}`}
      style={{ transitionTimingFunction: "var(--sf-ease)" }}
    >
      <StorefrontBrandSurface>
        <img
          src={src}
          alt={alt}
          className="w-auto shrink-0 object-contain"
          style={dimensions}
        />
      </StorefrontBrandSurface>
    </Link>
  );
}
