"use client";

import { CSSProperties, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Package, Search, Sparkles } from 'lucide-react';
import { storeHeroApi } from '../../api/storeHeroes';
import { useProducts } from '../../hooks/useProducts';
import { Product, StoreHero, StoreHeroScope } from '../../types';
import { formatPrice, getAssetUrl } from '../../utils/formatters';
import { ProductGrid } from '../../components/product/ProductGrid';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { StorefrontAutonomousCard } from '../../components/ui/Card';
import { StorefrontPaginator } from '../../components/ui/Paginator';
import { StorefrontPillFilter } from '../../components/ui/PillFilter';
import { StorefrontCatalogToolbar } from '../../components/ui/CatalogToolbar';
import {
  CatalogFilterPanel,
  type CatalogFilters,
} from '../../components/product/CatalogFilterPanel';

const MOBILE_PRODUCTS_PER_PAGE = 8;
const DESKTOP_PRODUCTS_PER_PAGE = 12;

const typeOptions = [
  { value: 'ALL', label: 'Todo' },
  { value: 'BIRD', label: 'Aves' },
  { value: 'ITEM', label: 'Artículos' },
];

const purposeOptions = [
  { value: 'BREEDING', label: 'Cría' },
  { value: 'COMBAT', label: 'Combate' },
];

const DEFAULT_CATALOG_FILTERS: CatalogFilters = {
  type: 'ALL',
  purpose: 'ALL',
  status: 'ALL',
};

function StorePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const { products, loading } = useProducts();
  const [searchTerm, setSearchText] = useState('');
  const [heroes, setHeroes] = useState<StoreHero[]>([]);
  const [isHeroLoading, setIsHeroLoading] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<CatalogFilters>(DEFAULT_CATALOG_FILTERS);
  const [page, setPage] = useState(1);
  const productsPerPage = useResponsiveProductsPerPage();
  const catalogRef = useRef<HTMLDivElement>(null);

  const typeFilter = searchParams.get('type') || 'ALL';
  const statusFilter = searchParams.get('status') || 'ALL';
  const purposeFilter = searchParams.get('purpose') || 'ALL';
  const heroScope = typeFilter === 'ALL' ? 'ALL' : (typeFilter as StoreHeroScope);
  const showPurposeFilters = typeFilter === 'BIRD';
  const isSearchMode = searchTerm.trim().length > 0;

  const setQueryParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(newParams).forEach(([key, val]) => {
      if (val === 'ALL' || val === '') {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });

    if (newParams.type && newParams.type !== 'BIRD') {
      params.delete('purpose');
    }

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  useEffect(() => {
    let isMounted = true;
    setIsHeroLoading(true);

    const loadHeroes = async () => {
      try {
        const items = await storeHeroApi.getAll(heroScope);
        if (isMounted) setHeroes(items);
      } catch {
        if (isMounted) setHeroes([]);
      } finally {
        if (isMounted) setIsHeroLoading(false);
      }
    };

    loadHeroes();

    return () => {
      isMounted = false;
    };
  }, [heroScope]);

  const activeProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter((product) => product.active !== false);
  }, [products]);

  const typeProducts = useMemo(() => {
    return activeProducts.filter((product) => typeFilter === 'ALL' || product.type === typeFilter);
  }, [activeProducts, typeFilter]);

  const featuredProducts = useMemo(() => {
    return typeProducts
      .filter((product) => product.featured)
      .filter((product) => {
        if (!showPurposeFilters || purposeFilter === 'ALL') return true;
        return product.purpose === purposeFilter;
      })
      .sort((a, b) => {
        const orderA = a.featuredOrder ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.featuredOrder ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return b.id - a.id;
      })
      .slice(0, 10);
  }, [purposeFilter, showPurposeFilters, typeProducts]);

  const filteredProducts = useMemo(() => {
    return typeProducts.filter((product) => {
      const matchesStatus = statusFilter === 'ALL' || product.saleStatus === statusFilter;
      const matchesPurpose =
        !showPurposeFilters || purposeFilter === 'ALL' || product.purpose === purposeFilter;
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesPurpose && matchesSearch;
    });
  }, [purposeFilter, searchTerm, showPurposeFilters, statusFilter, typeProducts]);

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * productsPerPage;
    return filteredProducts.slice(start, start + productsPerPage);
  }, [filteredProducts, page, productsPerPage]);

  useEffect(() => {
    setPage(1);
  }, [purposeFilter, searchTerm, statusFilter, typeFilter]);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const clearFilters = () => {
    router.push(pathname);
    setSearchText('');
    setIsFilterSheetOpen(false);
  };

  const openFilters = () => {
    setDraftFilters({
      type: typeFilter,
      purpose: purposeFilter,
      status: statusFilter,
    });
    setIsFilterSheetOpen(true);
  };

  const applyFilters = () => {
    setQueryParams({
      type: draftFilters.type,
      purpose: draftFilters.purpose,
      status: draftFilters.status,
    });
    setIsFilterSheetOpen(false);
  };

  const resetDraftFilters = () => {
    setDraftFilters(DEFAULT_CATALOG_FILTERS);
  };

  const handlePurposeChange = (value: string) => {
    setQueryParams({ purpose: purposeFilter === value ? 'ALL' : value });
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    requestAnimationFrame(() => {
      catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const hasCatalogFilters =
    typeFilter !== 'ALL' || statusFilter !== 'ALL' || purposeFilter !== 'ALL';
  const hasActiveFilters = hasCatalogFilters || isSearchMode;
  const currentHero = typeProducts.length > 0 ? heroes[0] : null;

  return (
    <div
      className="mx-auto max-w-[var(--sf-max-width-content)] px-[var(--sf-inset-page)]"
      style={{
        paddingTop: 'var(--sf-store-content-padding-top)',
        paddingBottom: 'var(--sf-mobile-chrome-content-padding-bottom)',
      }}
    >
      <div className="flex flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
        <StorefrontCatalogToolbar
          searchTerm={searchTerm}
          searchLabel="Buscar productos"
          searchPlaceholder="Buscar producto..."
          filterLabel="Filtrar catálogo"
          onSearchChange={setSearchText}
          hasActiveFilters={hasCatalogFilters}
          onOpenFilters={openFilters}
        />

        <StorefrontPillFilter
          title="Tipo de producto"
          value={typeFilter}
          options={typeOptions}
          onChange={(value) => setQueryParams({ type: value })}
        />

        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <Spinner className="h-12 w-12" />
          </div>
        ) : typeProducts.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Sin productos"
            description="Todavía no hay productos disponibles para esta selección."
            actionText="Ver todo"
            onActionClick={clearFilters}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col"
            style={{ gap: 'var(--sf-space-lg)' }}
          >
            {!isSearchMode && (
              <>
                {isHeroLoading ? <StoreHeroSkeleton /> : currentHero && <StoreHeroBanner hero={currentHero} />}

            {showPurposeFilters && (
              <StorefrontPillFilter
                title="Propósito"
                value={purposeFilter}
                options={purposeOptions}
                onChange={handlePurposeChange}
              />
            )}

                {featuredProducts.length > 0 && <FeaturedProductRail products={featuredProducts} />}
              </>
            )}

            {filteredProducts.length === 0 ? (
              <EmptyState
                icon={Search}
                title="Sin resultados"
                description="No encontramos productos que coincidan con los filtros actuales."
                actionText="Limpiar búsqueda"
                onActionClick={clearFilters}
              />
            ) : (
              <div ref={catalogRef} className="flex flex-col scroll-mt-[var(--sf-mobile-chrome-content-padding-top)] md:scroll-mt-[var(--sf-space-xl)]">
                {isSearchMode && <SearchResultsHeader count={filteredProducts.length} />}
                <ProductGrid products={paginatedProducts} />
                <StorefrontPaginator
                  page={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  className="pt-[var(--sf-space-lg)]"
                />
              </div>
            )}
          </motion.div>
        )}

        <CatalogFilterPanel
          isOpen={isFilterSheetOpen}
          onClose={() => setIsFilterSheetOpen(false)}
          filters={draftFilters}
          onChange={setDraftFilters}
          onReset={resetDraftFilters}
          onApply={applyFilters}
        />
      </div>
    </div>
  );
}

function useResponsiveProductsPerPage() {
  const [productsPerPage, setProductsPerPage] = useState(MOBILE_PRODUCTS_PER_PAGE);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const updateProductsPerPage = () => {
      setProductsPerPage(mediaQuery.matches ? DESKTOP_PRODUCTS_PER_PAGE : MOBILE_PRODUCTS_PER_PAGE);
    };

    updateProductsPerPage();
    mediaQuery.addEventListener('change', updateProductsPerPage);

    return () => mediaQuery.removeEventListener('change', updateProductsPerPage);
  }, []);

  return productsPerPage;
}

function SearchResultsHeader({ count }: { count: number }) {
  return (
    <div
      className="flex items-center justify-between"
      style={{
        gap: 'var(--sf-space-md)',
        marginBottom: 'var(--sf-space-md)',
      }}
    >
      <h2 className="sf-text-h3 font-black text-stone-950">
        {count === 1 ? 'Resultado' : 'Resultados'}
      </h2>
      <span className="sf-text-button-card font-black text-stone-500 tabular-nums">
        {count} {count === 1 ? 'producto' : 'productos'}
      </span>
    </div>
  );
}

function StoreHeroBanner({ hero }: { hero: StoreHero }) {
  const mediaUrl = getAssetUrl(hero.mediaUrl);
  const posterUrl = getAssetUrl(hero.posterUrl);
  const heroPositionStyle = {
    '--sf-hero-mobile-object-position': hero.mobileObjectPosition || '50% 50%',
    '--sf-hero-desktop-object-position': hero.desktopObjectPosition || '50% 50%',
  } as CSSProperties;

  return (
    <StorefrontAutonomousCard
      density="none"
      className="relative aspect-[1.95/1] overflow-hidden shadow-[0_1.5rem_4rem_rgba(80,55,38,0.16)] md:aspect-[3.6/1]"
      style={heroPositionStyle}
    >
      {hero.type === 'VIDEO' ? (
        <video
          src={mediaUrl}
          poster={posterUrl || undefined}
          className="sf-hero-media h-full w-full object-cover"
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
        />
      ) : (
        <img
          src={mediaUrl}
          alt={hero.title}
          className="sf-hero-media h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-stone-950/48 via-stone-950/18 to-transparent" />
      <div
        className="absolute inset-y-0 left-0 flex max-w-xl flex-col justify-center text-white"
        style={{
          padding: 'var(--sf-padding-inner)',
          gap: 'var(--sf-space-xs)',
        }}
      >
        <h2 className="sf-text-h2 font-black leading-tight">{hero.title}</h2>
        {hero.description && <p className="sf-text-body hidden max-w-md text-white/82 sm:block">{hero.description}</p>}
      </div>
    </StorefrontAutonomousCard>
  );
}

function StoreHeroSkeleton() {
  return (
    <div
      className="animate-pulse bg-stone-100"
      style={{
        aspectRatio: '1.95 / 1',
        borderRadius: 'var(--sf-radius-outer)',
      }}
    />
  );
}

function FeaturedProductRail({ products }: { products: Product[] }) {
  return (
    <section className="flex flex-col" style={{ gap: 'var(--sf-space-sm)' }}>
      <div className="flex items-center" style={{ gap: 'var(--sf-space-xs)' }}>
        <Sparkles
          aria-hidden="true"
          className="text-brand-500"
          style={{
            width: 'var(--sf-size-inner-icon-card)',
            height: 'var(--sf-size-inner-icon-card)',
          }}
          strokeWidth={2.35}
        />
        <h2 className="sf-text-h3 font-black text-stone-950">Destacados</h2>
      </div>

      <div
        className="-mx-[var(--sf-inset-page-mobile)] flex snap-x snap-mandatory overflow-x-auto px-[var(--sf-inset-page-mobile)] pb-[var(--sf-space-md)] pt-[var(--sf-space-xs)] [-ms-overflow-style:none] [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden"
        style={{
          gap: 'var(--sf-space-md)',
          scrollPaddingInline: 'var(--sf-inset-page-mobile)',
        }}
      >
        {products.map((product) => (
          <FeaturedProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

function FeaturedProductCard({ product }: { product: Product }) {
  const mediaUrl = getAssetUrl(product.coverPosterUrl || product.coverMediaUrl || product.thumbnail);

  return (
    <Link
      href={`/store/${product.id}`}
      className="group block w-[min(72vw,20rem)] shrink-0 snap-start md:w-[22rem]"
      aria-label={`Ver ${product.name}`}
    >
      <StorefrontAutonomousCard
        density="none"
        interactive
        className="relative aspect-[3/4] overflow-hidden"
      >
        {mediaUrl ? (
          <img
            src={mediaUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-stone-100 text-stone-300">
            <Package
              style={{
                width: 'var(--sf-size-stage-icon-compact)',
                height: 'var(--sf-size-stage-icon-compact)',
              }}
              strokeWidth={1.5}
            />
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{
            height: '58%',
            background:
              'linear-gradient(to top, rgb(12 10 9 / 0.86) 0%, rgb(12 10 9 / 0.52) 42%, rgb(12 10 9 / 0) 100%)',
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 z-10 flex flex-col text-white"
          style={{
            padding: 'var(--sf-padding-inner)',
            gap: 'var(--sf-space-xs)',
          }}
        >
          <h3 className="sf-text-h2 line-clamp-1 font-black">{product.name}</h3>
          <p className="sf-text-body font-black tabular-nums text-white/82">${formatPrice(product.price)}</p>
        </div>
      </StorefrontAutonomousCard>
    </Link>
  );
}

export default function StorePage() {
  return (
    <Suspense
      fallback={
        <div
          className="mx-auto max-w-[var(--sf-max-width-content)] animate-pulse px-[var(--sf-inset-page)]"
          style={{ paddingBlock: 'var(--sf-space-xl)' }}
        >
          <div className="flex h-96 items-center justify-center">
            <Spinner className="h-12 w-12" />
          </div>
        </div>
      }
    >
      <StorePageContent />
    </Suspense>
  );
}
