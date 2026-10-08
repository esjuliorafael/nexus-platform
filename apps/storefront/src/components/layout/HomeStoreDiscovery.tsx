"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { storeHeroApi } from "../../api/storeHeroes";
import { useReducedMotion, motion } from "framer-motion";
import type { Product, StoreHero } from "../../types";
import { ProductGrid } from "../product/ProductGrid";
import { StoreHeroBanner, StoreHeroSkeleton } from "./StoreHeroBanner";
import { StorefrontCatalogToolbar } from "../ui/CatalogToolbar";
import { StorefrontPillFilter } from "../ui/PillFilter";
import { Spinner } from "../ui/Spinner";
import { EmptyState } from "../ui/EmptyState";
import { Button } from "../ui/Button";

const purposeOptions = [
  { value: "ALL", label: "Todos" },
  { value: "BREEDING", label: "Cría" },
  { value: "COMBAT", label: "Combate" },
];

const normalizeSearchValue = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

interface HomeStoreDiscoveryProps {
  products: Product[];
  loading: boolean;
}

export function HomeStoreDiscovery({
  products,
  loading,
}: HomeStoreDiscoveryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [purpose, setPurpose] = useState("ALL");
  const [hero, setHero] = useState<StoreHero | null>(null);
  const [isHeroLoading, setIsHeroLoading] = useState(true);
  const [isMobileToolbarPinned, setIsMobileToolbarPinned] = useState(false);
  const toolbarAnchorRef = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const anchor = toolbarAnchorRef.current;
    if (!anchor) return;

    const rawInset = getComputedStyle(document.documentElement)
      .getPropertyValue("--sf-inset-mobile-chrome-block")
      .trim();
    const inset = Number.parseFloat(rawInset) || 24;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;

        setIsMobileToolbarPinned(
          !entry.isIntersecting && entry.boundingClientRect.top <= inset,
        );
      },
      { rootMargin: `-${inset}px 0px 0px 0px` },
    );

    observer.observe(anchor);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadHero = async () => {
      try {
        const heroes = await storeHeroApi.getAll("BIRD");
        if (isMounted) setHero(heroes[0] || null);
      } catch {
        if (isMounted) setHero(null);
      } finally {
        if (isMounted) setIsHeroLoading(false);
      }
    };

    loadHero();

    return () => {
      isMounted = false;
    };
  }, []);

  const availableBirds = useMemo(
    () =>
      products.filter(
        (product) =>
          product.type === "BIRD" &&
          product.active !== false &&
          product.saleStatus === "AVAILABLE",
      ),
    [products],
  );

  const filteredBirds = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(searchTerm.trim());

    return availableBirds.filter((product) => {
      const matchesPurpose = purpose === "ALL" || product.purpose === purpose;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [product.name, product.ringNumber, product.description].some((value) =>
          normalizeSearchValue(value).includes(normalizedSearch),
        );
      return matchesPurpose && matchesSearch;
    });
  }, [availableBirds, purpose, searchTerm]);

  const visibleBirds = filteredBirds.slice(0, 6);

  return (
    <section aria-labelledby="home-store-discovery-title">
      <div className="flex flex-col" style={{ gap: "var(--sf-space-lg)" }}>
        <h2 id="home-store-discovery-title" className="sr-only">
          Explora los ejemplares
        </h2>

        <div
          className={isMobileToolbarPinned ? "relative min-h-[var(--sf-h-mobile-nav)] md:min-h-0" : "relative"}
        >
          <span
            ref={toolbarAnchorRef}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 h-px w-px"
          />
          <StorefrontCatalogToolbar
            searchTerm={searchTerm}
            searchLabel="Buscar ejemplares"
            searchPlaceholder="Buscar producto..."
            onSearchChange={setSearchTerm}
            hasActiveFilters={false}
            showFilters={false}
            mobilePosition={isMobileToolbarPinned ? "fixed" : "inline"}
          />
        </div>

        {isHeroLoading ? <StoreHeroSkeleton /> : hero && <StoreHeroBanner hero={hero} />}

        <div>
          <StorefrontPillFilter
            title="Propósito"
            value={purpose}
            options={purposeOptions}
            onChange={(value) => setPurpose(purpose === value ? "ALL" : value)}
          />
        </div>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          className="flex flex-col"
          style={{ gap: "var(--sf-space-md)" }}
        >
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner className="h-10 w-10" />
            </div>
          ) : filteredBirds.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Sin resultados"
              description="No encontramos ejemplares que coincidan con la búsqueda."
              actionText="Limpiar búsqueda"
              onActionClick={() => {
                setSearchTerm("");
                setPurpose("ALL");
              }}
            />
          ) : (
            <>
              <div className="flex items-center justify-between" style={{ gap: "var(--sf-space-md)" }}>
                <h3 className="sf-text-h2 font-black text-stone-950">
                  Ejemplares disponibles
                </h3>
                <span className="sf-text-button-card font-black text-stone-500 tabular-nums">
                  {filteredBirds.length} {filteredBirds.length === 1 ? "resultado" : "resultados"}
                </span>
              </div>
              <ProductGrid products={visibleBirds} />
              {filteredBirds.length > visibleBirds.length && (
                <div className="flex justify-center">
                  <Button asChild variant="outline" context="section">
                    <Link href={`/store?type=BIRD${purpose !== "ALL" ? `&purpose=${purpose}` : ""}`}>
                      Ver todos los ejemplares
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}
