"use client";

import type { CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "./Button";
import { StorefrontField } from "./Field";
import {
  STOREFRONT_EASING,
  STOREFRONT_MOTION_MS,
  toMotionSeconds,
} from "../../lib/motion";

interface StorefrontCatalogToolbarProps {
  searchTerm: string;
  searchLabel: string;
  searchPlaceholder: string;
  filterLabel: string;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onOpenFilters: () => void;
}

export function StorefrontCatalogToolbar({
  searchTerm,
  searchLabel,
  searchPlaceholder,
  filterLabel,
  hasActiveFilters,
  onSearchChange,
  onOpenFilters,
}: StorefrontCatalogToolbarProps) {
  const prefersReducedMotion = useReducedMotion();
  const entrance = {
    duration: prefersReducedMotion
      ? 0
      : toMotionSeconds(STOREFRONT_MOTION_MS.duration.deliberate),
    delay: prefersReducedMotion
      ? 0
      : toMotionSeconds(STOREFRONT_MOTION_MS.pulse.full * 2),
    ease: STOREFRONT_EASING.reveal,
  };

  return (
    <>
      <StorefrontMobileCatalogToolbar
        searchTerm={searchTerm}
        searchLabel={searchLabel}
        searchPlaceholder={searchPlaceholder}
        filterLabel={filterLabel}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={onSearchChange}
        onOpenFilters={onOpenFilters}
      />

      <motion.div
        className="hidden w-full min-w-0 items-center md:flex"
        style={{ gap: "var(--sf-space-sm)" }}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={entrance}
      >
        <div className="min-w-0 flex-1">
          <StorefrontField
            icon={Search}
            type="search"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
            className="w-full"
          />
        </div>

        <Button
          type="button"
          variant={hasActiveFilters ? "brand" : "outline"}
          context="section"
          size="icon"
          icon={SlidersHorizontal}
          isIconOnly
          onClick={onOpenFilters}
          aria-label={filterLabel}
          className="shrink-0"
        />
      </motion.div>
    </>
  );
}

function StorefrontMobileCatalogToolbar({
  searchTerm,
  searchLabel,
  searchPlaceholder,
  filterLabel,
  hasActiveFilters,
  onSearchChange,
  onOpenFilters,
}: StorefrontCatalogToolbarProps) {
  const prefersReducedMotion = useReducedMotion();
  const mobileActionStyle = {
    width: "var(--sf-size-mobile-chrome-action)",
    height: "var(--sf-size-mobile-chrome-action)",
    borderRadius: "var(--sf-radius-mobile-chrome-action)",
    "--sf-button-icon-size": "var(--sf-size-mobile-chrome-icon)",
  } as CSSProperties;

  return (
    <motion.div
      className="fixed z-40 grid grid-cols-[minmax(0,1fr)_auto] items-center md:hidden"
      style={{
        top: "var(--sf-inset-mobile-chrome-block)",
        left: "var(--sf-inset-mobile-chrome)",
        right: "var(--sf-inset-mobile-chrome)",
        gap: "var(--sf-space-md)",
      }}
      initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: prefersReducedMotion
          ? 0
          : toMotionSeconds(STOREFRONT_MOTION_MS.duration.deliberate),
        delay: prefersReducedMotion
          ? 0
          : toMotionSeconds(STOREFRONT_MOTION_MS.pulse.full * 2),
        ease: STOREFRONT_EASING.reveal,
      }}
    >
      <label
        className="flex min-w-0 items-center border border-stone-200/90 bg-white shadow-[0_18px_48px_rgba(87,68,55,0.14)]"
        style={{
          height: "var(--sf-h-mobile-nav)",
          borderRadius: "var(--sf-radius-outer)",
          padding: "var(--sf-space-sm)",
          gap: "var(--sf-space-sm)",
        }}
      >
        <span
          className="flex shrink-0 items-center justify-center bg-stone-50 text-stone-500"
          style={{
            width: "var(--sf-size-mobile-nav-item)",
            height: "var(--sf-size-mobile-nav-item)",
            borderRadius: "var(--sf-radius-mobile-nav-item)",
          }}
        >
          <Search
            aria-hidden="true"
            style={{
              width: "var(--sf-size-mobile-nav-icon)",
              height: "var(--sf-size-mobile-nav-icon)",
            }}
            strokeWidth={2.5}
          />
        </span>

        <input
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchLabel}
          className="sf-text-body min-w-0 flex-1 bg-transparent text-stone-850 outline-none placeholder:text-stone-400"
        />
      </label>

      <div
        className="relative flex shrink-0 items-center justify-center border border-stone-200/90 bg-white shadow-[0_18px_48px_rgba(87,68,55,0.14)]"
        style={{
          height: "var(--sf-h-mobile-nav)",
          borderRadius: "var(--sf-radius-outer)",
          padding: "var(--sf-space-sm)",
        }}
      >
        <Button
          size="icon"
          variant={hasActiveFilters ? "brand" : "ghost"}
          icon={SlidersHorizontal}
          isIconOnly
          onClick={onOpenFilters}
          aria-label={filterLabel}
          style={mobileActionStyle}
        />

        {hasActiveFilters && (
          <span
            aria-hidden="true"
            className="absolute rounded-full bg-brand-500 ring-2 ring-white"
            style={{
              top: "var(--sf-space-sm)",
              right: "var(--sf-space-sm)",
              width: "var(--sf-size-inner-icon-badge)",
              height: "var(--sf-size-inner-icon-badge)",
            }}
          />
        )}
      </div>
    </motion.div>
  );
}
