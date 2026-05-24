"use client";

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useProducts } from '../../hooks/useProducts';
import { ProductGrid } from '../../components/product/ProductGrid';
import { Spinner } from '../../components/ui/Spinner';
import { Search, X, SlidersHorizontal, Package, Bird } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { EmptyState } from '../../components/ui/EmptyState';
import { motion } from 'framer-motion';

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

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      {/* Header and Desktop Search bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-stone-255/10">
        <div className="space-y-1">
          <h1 className="text-4xl md:text-5xl font-black text-stone-850 uppercase italic lora tracking-tight">Tienda Oficial</h1>
          <p className="text-xs text-stone-400 font-bold uppercase tracking-wider">Granja La Manzana</p>
        </div>
        
        {/* Desktop Search */}
        <div className="hidden md:flex flex-1 max-w-md relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-12 pr-4 h-12 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all font-semibold text-sm"
          />
        </div>

        {/* Mobile Search & Filter Button */}
        <div className="flex items-center gap-3 md:hidden">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 h-12 bg-white border border-stone-200 rounded-2xl focus:outline-none font-semibold text-xs"
            />
          </div>
          <Button 
            onClick={() => setIsFilterSheetOpen(true)}
            className="h-12 w-12 rounded-2xl bg-stone-900 text-white shrink-0 p-0 flex items-center justify-center shadow-lg"
          >
            <SlidersHorizontal size={18} />
          </Button>
        </div>
      </div>

      {/* Desktop Filters Row */}
      <div className="hidden md:flex flex-wrap items-center justify-between gap-4 bg-stone-100/50 border border-stone-200/40 p-4 rounded-3xl">
        <div className="flex items-center gap-4">
          {/* Type Filter */}
          <div className="flex bg-stone-100 p-1 rounded-xl">
            {['ALL', 'BIRD', 'ITEM'].map((t) => (
              <button
                key={t}
                onClick={() => setQueryParams({ type: t })}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                  typeFilter === t ? 'bg-white text-brand-500 shadow-sm' : 'text-stone-500 hover:text-stone-850'
                }`}
              >
                {t === 'ALL' ? 'Todo' : t === 'BIRD' ? 'Aves' : 'Insumos'}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex bg-stone-100 p-1 rounded-xl">
            {['ALL', 'AVAILABLE', 'RESERVED', 'SOLD'].map((s) => (
              <button
                key={s}
                onClick={() => setQueryParams({ status: s })}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                  statusFilter === s ? 'bg-white text-brand-500 shadow-sm' : 'text-stone-500 hover:text-stone-850'
                }`}
              >
                {s === 'ALL' ? 'Todos' : s === 'AVAILABLE' ? 'Disponibles' : s === 'RESERVED' ? 'Reservados' : 'Vendidos'}
              </button>
            ))}
          </div>
        </div>

        {(typeFilter !== 'ALL' || statusFilter !== 'ALL' || searchTerm) && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-stone-400 font-bold uppercase tracking-wider text-xs hover:text-brand-500 hover:bg-transparent"
            onClick={clearFilters}
          >
            <X size={14} className="mr-2 animate-spin-once" /> Limpiar Filtros
          </Button>
        )}
      </div>

      {/* Products Content */}
      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <Spinner className="w-12 h-12" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <EmptyState 
          icon={Search} 
          title="Sin Resultados" 
          description="No encontramos productos que coincidan exactamente con tus criterios de búsqueda en Granja La Manzana."
          actionText="Limpiar Búsqueda"
          onActionClick={clearFilters}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <ProductGrid products={filteredProducts} />
        </motion.div>
      )}

      {/* Mobile Filters Bottom Sheet */}
      <BottomSheet 
        isOpen={isFilterSheetOpen} 
        onClose={() => setIsFilterSheetOpen(false)}
        title="Filtrar Catálogo"
      >
        <div className="space-y-8 font-medium">
          {/* Filter by Category */}
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Tipo de Producto</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'ALL', label: 'Todos' },
                { value: 'BIRD', label: 'Aves' },
                { value: 'ITEM', label: 'Insumos' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setQueryParams({ type: opt.value });
                  }}
                  className={`h-12 rounded-xl text-xs font-bold transition-all border ${
                    typeFilter === opt.value 
                      ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/20' 
                      : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filter by Availability */}
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Disponibilidad</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'ALL', label: 'Todos los estados' },
                { value: 'AVAILABLE', label: 'Disponibles' },
                { value: 'RESERVED', label: 'Reservados' },
                { value: 'SOLD', label: 'Vendidos' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setQueryParams({ status: opt.value });
                  }}
                  className={`h-12 rounded-xl text-xs font-bold transition-all border ${
                    statusFilter === opt.value 
                      ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/20' 
                      : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons inside sheet */}
          <div className="pt-6 border-t border-stone-100 flex gap-4">
            {(typeFilter !== 'ALL' || statusFilter !== 'ALL' || searchTerm) && (
              <Button 
                variant="outline" 
                className="flex-1 h-14 rounded-2xl border-stone-200 font-bold"
                onClick={clearFilters}
              >
                Limpiar Todo
              </Button>
            )}
            <Button 
              className="flex-1 h-14 rounded-2xl font-bold bg-stone-900 text-white"
              onClick={() => setIsFilterSheetOpen(false)}
            >
              Aplicar Filtros
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

export default function StorePage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-12 animate-pulse">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <h1 className="text-4xl font-black text-stone-800 tracking-tight">Tienda Oficial</h1>
        </div>
        <div className="h-96 flex items-center justify-center">
          <Spinner className="w-12 h-12" />
        </div>
      </div>
    }>
      <StorePageContent />
    </Suspense>
  );
}
