"use client";

import { CSSProperties, ReactNode, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Package, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { storeHeroApi } from '../../api/storeHeroes';
import { useProducts } from '../../hooks/useProducts';
import { Product, StoreHero, StoreHeroScope } from '../../types';
import { formatPrice, getAssetUrl } from '../../utils/formatters';
import { ProductGrid } from '../../components/product/ProductGrid';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { EmptyState } from '../../components/ui/EmptyState';
import { SegmentedControl, type SegmentedControlOption } from '../../components/ui/SegmentedControl';
import { StorefrontAutonomousCard } from '../../components/ui/Card';
import { StorefrontPaginator } from '../../components/ui/Paginator';
import { StorefrontPillFilter } from '../../components/ui/PillFilter';

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

const statusOptions = [
  { value: 'ALL', label: 'Todos' },
  { value: 'AVAILABLE', label: 'Disponibles' },
  { value: 'RESERVED', label: 'Reservados' },
  { value: 'SOLD', label: 'Vendidos' },
];

function StorePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const { products, loading } = useProducts();
  const [searchTerm, setSearchText] = useState('');
  const [heroes, setHeroes] = useState<StoreHero[]>([]);
  const [isHeroLoading, setIsHeroLoading] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
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

  const handlePurposeChange = (value: string) => {
    setQueryParams({ purpose: purposeFilter === value ? 'ALL' : value });
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    requestAnimationFrame(() => {
      catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const hasActiveFilters =
    typeFilter !== 'ALL' || statusFilter !== 'ALL' || purposeFilter !== 'ALL' || isSearchMode;
  const currentHero = typeProducts.length > 0 ? heroes[0] : null;

  return (
    <div
      className="mx-auto max-w-7xl px-[var(--sf-inset-page-mobile)]"
      style={{
        paddingTop: 'var(--sf-store-content-padding-top)',
        paddingBottom: 'var(--sf-mobile-chrome-content-padding-bottom)',
      }}
    >
      <div className="flex flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
        <StoreMobileTopBar
          searchTerm={searchTerm}
          onSearchChange={setSearchText}
          hasActiveFilters={hasActiveFilters}
          onOpenFilters={() => setIsFilterSheetOpen(true)}
        />

        <StoreDesktopToolbar
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          hasActiveFilters={hasActiveFilters}
          onSearchChange={setSearchText}
          onStatusChange={(value) => setQueryParams({ status: value })}
          onClearFilters={clearFilters}
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
                <StorefrontPaginator page={page} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            )}
          </motion.div>
        )}

        <BottomSheet
          isOpen={isFilterSheetOpen}
          onClose={() => setIsFilterSheetOpen(false)}
          title="Filtrar catálogo"
        >
          <div className="flex flex-col font-medium" style={{ gap: 'var(--sf-space-lg)' }}>
            <MobileFilterGroup
              label="Tipo de producto"
              value={typeFilter}
              options={typeOptions}
              columns="grid-cols-3"
              onChange={(value) => setQueryParams({ type: value })}
            />

            {showPurposeFilters && (
              <MobileFilterGroup
                label="Propósito"
                value={purposeFilter}
                options={[{ value: 'ALL', label: 'Todos' }, ...purposeOptions]}
                columns="grid-cols-3"
                onChange={(value) => setQueryParams({ purpose: value })}
              />
            )}

            <MobileFilterGroup
              label="Disponibilidad"
              value={statusFilter}
              options={[
                { value: 'ALL', label: 'Todos los estados' },
                { value: 'AVAILABLE', label: 'Disponibles' },
                { value: 'RESERVED', label: 'Reservados' },
                { value: 'SOLD', label: 'Vendidos' },
              ]}
              columns="grid-cols-2"
              onChange={(value) => setQueryParams({ status: value })}
            />

            <div className="flex border-t border-stone-100 pt-[var(--sf-space-md)]" style={{ gap: 'var(--sf-space-sm)' }}>
              {hasActiveFilters && (
                <Button variant="outline" context="section" className="flex-1" onClick={clearFilters}>
                  Limpiar todo
                </Button>
              )}
              <Button
                variant="secondary"
                context="section"
                className="flex-1"
                onClick={() => setIsFilterSheetOpen(false)}
              >
                Aplicar filtros
              </Button>
            </div>
          </div>
        </BottomSheet>
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

function StoreMobileTopBar({
  searchTerm,
  onSearchChange,
  hasActiveFilters,
  onOpenFilters,
}: {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  hasActiveFilters: boolean;
  onOpenFilters: () => void;
}) {
  const mobileActionStyle = {
    width: 'var(--sf-size-mobile-chrome-action)',
    height: 'var(--sf-size-mobile-chrome-action)',
    borderRadius: 'var(--sf-radius-mobile-chrome-action)',
    '--sf-button-icon-size': 'var(--sf-size-mobile-chrome-icon)',
  } as CSSProperties;

  return (
    <div
      className="fixed z-40 grid grid-cols-[minmax(0,1fr)_auto] items-center md:hidden"
      style={{
        top: 'var(--sf-inset-mobile-chrome-block)',
        left: 'var(--sf-inset-mobile-chrome)',
        right: 'var(--sf-inset-mobile-chrome)',
        gap: 'var(--sf-space-md)',
      }}
    >
      <StoreMobileSearchRail value={searchTerm} onChange={onSearchChange} />

      <StoreMobileActionRail>
        <Button
          size="icon"
          variant={hasActiveFilters ? 'brand' : 'ghost'}
          icon={SlidersHorizontal}
          isIconOnly
          onClick={onOpenFilters}
          aria-label="Abrir filtros"
          style={mobileActionStyle}
        />
        {hasActiveFilters && (
          <span
            className="absolute rounded-full bg-brand-500 ring-2 ring-white"
            style={{
              top: 'var(--sf-space-sm)',
              right: 'var(--sf-space-sm)',
              width: 'var(--sf-size-inner-icon-badge)',
              height: 'var(--sf-size-inner-icon-badge)',
            }}
          />
        )}
      </StoreMobileActionRail>
    </div>
  );
}

function StoreMobileSearchRail({
  value,
  onChange,
  placeholder = 'Buscar...',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label
      className="flex min-w-0 items-center border border-stone-200/90 bg-white shadow-[0_18px_48px_rgba(87,68,55,0.14)]"
      style={{
        height: 'var(--sf-h-mobile-nav)',
        borderRadius: 'var(--sf-radius-outer)',
        padding: 'var(--sf-space-sm)',
        gap: 'var(--sf-space-sm)',
      }}
    >
      <span
        className="flex shrink-0 items-center justify-center bg-stone-50 text-stone-500"
        style={{
          width: 'var(--sf-size-mobile-nav-item)',
          height: 'var(--sf-size-mobile-nav-item)',
          borderRadius: 'var(--sf-radius-mobile-nav-item)',
        }}
      >
        <Search
          aria-hidden="true"
          style={{
            width: 'var(--sf-size-mobile-nav-icon)',
            height: 'var(--sf-size-mobile-nav-icon)',
          }}
          strokeWidth={2.5}
        />
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label="Buscar productos"
        className="min-w-0 flex-1 bg-transparent text-stone-850 outline-none placeholder:text-stone-400 sf-text-body"
      />
    </label>
  );
}

function StoreMobileActionRail({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative flex shrink-0 items-center justify-center border border-stone-200/90 bg-white shadow-[0_18px_48px_rgba(87,68,55,0.14)]"
      style={{
        height: 'var(--sf-h-mobile-nav)',
        borderRadius: 'var(--sf-radius-outer)',
        padding: 'var(--sf-space-sm)',
      }}
    >
      {children}
    </div>
  );
}

function StoreDesktopToolbar({
  searchTerm,
  statusFilter,
  hasActiveFilters,
  onSearchChange,
  onStatusChange,
  onClearFilters,
}: {
  searchTerm: string;
  statusFilter: string;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onClearFilters: () => void;
}) {
  return (
    <div
      className="hidden flex-wrap items-center border border-stone-200 bg-white shadow-[0_1rem_2rem_rgba(31,24,17,0.05)] xl:flex-nowrap md:flex"
      style={{
        borderRadius: 'var(--sf-radius-outer)',
        padding: 'var(--sf-space-sm)',
        gap: 'var(--sf-space-md)',
      }}
    >
      <StoreDesktopSearchField value={searchTerm} onChange={onSearchChange} />

      <div className="flex shrink-0 flex-wrap items-center" style={{ gap: 'var(--sf-space-sm)' }}>
        <SegmentedFilter value={statusFilter} options={statusOptions} onChange={onStatusChange} />
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          icon={X}
          onClick={onClearFilters}
          className="text-stone-400 hover:bg-transparent hover:text-brand-500"
        >
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}

function StoreDesktopSearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label
      className="flex min-w-[18rem] flex-1 items-center bg-stone-50 text-stone-500"
      style={{
        height: 'var(--sf-h-input)',
        borderRadius: 'var(--sf-radius-inner)',
        paddingInline: 'var(--sf-space-md)',
        gap: 'var(--sf-space-sm)',
      }}
    >
      <Search
        aria-hidden="true"
        style={{
          width: 'var(--sf-size-inner-icon-section)',
          height: 'var(--sf-size-inner-icon-section)',
        }}
        strokeWidth={2.35}
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar producto..."
        aria-label="Buscar productos"
        className="min-w-0 flex-1 bg-transparent text-stone-850 outline-none placeholder:text-stone-400 sf-text-body"
      />
    </label>
  );
}

function SegmentedFilter({
  value,
  options,
  onChange,
}: {
  value: string;
  options: SegmentedControlOption[];
  onChange: (value: string) => void;
}) {
  return <SegmentedControl value={value} options={options} onChange={onChange} />;
}

function MobileFilterGroup({
  label,
  value,
  options,
  columns,
  onChange,
}: {
  label: string;
  value: string;
  options: SegmentedControlOption[];
  columns: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col" style={{ gap: 'var(--sf-space-sm)' }}>
      <span className="sf-text-label text-stone-400">{label}</span>
      <SegmentedControl value={value} options={options} columns={columns} onChange={onChange} />
    </div>
  );
}

export default function StorePage() {
  return (
    <Suspense
      fallback={
        <div
          className="mx-auto max-w-7xl animate-pulse px-[var(--sf-inset-page-mobile)]"
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
