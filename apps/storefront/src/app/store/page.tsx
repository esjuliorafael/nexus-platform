"use client";

import { useMemo, useState, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useProducts } from '../../hooks/useProducts';
import { ProductGrid } from '../../components/product/ProductGrid';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { EmptyState } from '../../components/ui/EmptyState';
import { StorefrontField } from '../../components/ui/Field';
import { SegmentedControl, type SegmentedControlOption } from '../../components/ui/SegmentedControl';

const typeOptions = [
  { value: 'ALL', label: 'Todo' },
  { value: 'BIRD', label: 'Aves' },
  { value: 'ITEM', label: 'Insumos' },
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
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const typeFilter = searchParams.get('type') || 'ALL';
  const statusFilter = searchParams.get('status') || 'ALL';

  const setQueryParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === 'ALL') {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter((p) => {
      const matchesType = typeFilter === 'ALL' || p.type === typeFilter;
      const matchesStatus = statusFilter === 'ALL' || p.saleStatus === statusFilter;
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesStatus && matchesSearch;
    });
  }, [products, typeFilter, statusFilter, searchTerm]);

  const clearFilters = () => {
    router.push(pathname);
    setSearchText('');
    setIsFilterSheetOpen(false);
  };

  const hasActiveFilters = typeFilter !== 'ALL' || statusFilter !== 'ALL' || Boolean(searchTerm);

  return (
    <div className="mx-auto max-w-7xl px-[var(--sf-inset-page-mobile)]" style={{ paddingBlock: 'var(--sf-space-xl)' }}>
      <div className="flex flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
        <div className="flex flex-col justify-between border-b border-stone-200/60 pb-[var(--sf-space-md)] md:flex-row md:items-end" style={{ gap: 'var(--sf-space-md)' }}>
          <div className="flex flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
            <h1 className="sf-text-display text-stone-850 uppercase italic">Tienda Oficial</h1>
            <p className="sf-text-label text-stone-400">Genética de Excelencia</p>
          </div>

          <div className="hidden w-full max-w-md md:block">
            <StorefrontField
              icon={Search}
              type="text"
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div className="flex items-center md:hidden" style={{ gap: 'var(--sf-space-sm)' }}>
            <div className="flex-1">
              <StorefrontField
                icon={Search}
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <Button
              size="icon"
              variant="secondary"
              icon={SlidersHorizontal}
              isIconOnly
              onClick={() => setIsFilterSheetOpen(true)}
              aria-label="Abrir filtros"
            />
          </div>
        </div>

        <div
          className="hidden flex-wrap items-center justify-between border border-stone-200/50 bg-stone-100/50 md:flex"
          style={{
            borderRadius: 'var(--sf-radius-outer)',
            padding: 'var(--sf-space-sm)',
            gap: 'var(--sf-space-md)',
          }}
        >
          <div className="flex flex-wrap items-center" style={{ gap: 'var(--sf-space-sm)' }}>
            <SegmentedFilter
              value={typeFilter}
              options={typeOptions}
              onChange={(value) => setQueryParams({ type: value })}
            />
            <SegmentedFilter
              value={statusFilter}
              options={statusOptions}
              onChange={(value) => setQueryParams({ status: value })}
            />
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              icon={X}
              onClick={clearFilters}
              className="text-stone-400 hover:bg-transparent hover:text-brand-500"
            >
              Limpiar Filtros
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <Spinner className="h-12 w-12" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Sin Resultados"
            description="No encontramos productos que coincidan con los filtros actuales."

            actionText="Limpiar Busqueda"
            onActionClick={clearFilters}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          >
            <ProductGrid products={filteredProducts} />
          </motion.div>
        )}

        <BottomSheet
          isOpen={isFilterSheetOpen}
          onClose={() => setIsFilterSheetOpen(false)}
          title="Filtrar Catalogo"
        >
          <div className="flex flex-col font-medium" style={{ gap: 'var(--sf-space-lg)' }}>
            <MobileFilterGroup
              label="Tipo de Producto"
              value={typeFilter}
              options={typeOptions}
              columns="grid-cols-3"
              onChange={(value) => setQueryParams({ type: value })}
            />

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
                  Limpiar Todo
                </Button>
              )}
              <Button
                variant="secondary"
                context="section"
                className="flex-1"
                onClick={() => setIsFilterSheetOpen(false)}
              >
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </BottomSheet>
      </div>
    </div>
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
    <Suspense fallback={
      <div className="mx-auto max-w-7xl animate-pulse px-[var(--sf-inset-page-mobile)]" style={{ paddingBlock: 'var(--sf-space-xl)' }}>
        <div className="flex h-96 items-center justify-center">
          <Spinner className="h-12 w-12" />
        </div>
      </div>
    }>
      <StorePageContent />
    </Suspense>
  );
}
