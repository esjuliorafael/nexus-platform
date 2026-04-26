import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { ProductGrid } from '../components/product/ProductGrid';
import { Spinner } from '../components/ui/Spinner';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function StorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { products, loading } = useProducts();
  const [searchTerm, setSearchText] = useState('');
  
  const typeFilter = searchParams.get('type') || 'ALL';
  const statusFilter = searchParams.get('status') || 'AVAILABLE';

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter((p) => {
      const matchesType = typeFilter === 'ALL' || p.type === typeFilter;
      const matchesStatus = statusFilter === 'ALL' || p.saleStatus === statusFilter;
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesStatus && matchesSearch;
    });
  }, [products, typeFilter, statusFilter, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <h1 className="text-4xl font-black text-stone-800 tracking-tight">Catálogo</h1>
        
        <div className="flex flex-1 max-w-md relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-12 pr-4 h-12 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all font-medium"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex bg-stone-100 p-1 rounded-xl">
          {['ALL', 'BIRD', 'ARTICLE'].map((t) => (
            <button
              key={t}
              onClick={() => setSearchParams({ type: t, status: statusFilter })}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                typeFilter === t ? 'bg-white text-brand-500 shadow-sm' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {t === 'ALL' ? 'Todo' : t === 'BIRD' ? 'Aves' : 'Artículos'}
            </button>
          ))}
        </div>

        <div className="flex bg-stone-100 p-1 rounded-xl">
          {['ALL', 'AVAILABLE', 'RESERVED', 'SOLD'].map((s) => (
            <button
              key={s}
              onClick={() => setSearchParams({ type: typeFilter, status: s })}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                statusFilter === s ? 'bg-white text-brand-500 shadow-sm' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {s === 'ALL' ? 'Todos los estados' : s === 'AVAILABLE' ? 'Disponibles' : s === 'RESERVED' ? 'Reservados' : 'Vendidos'}
            </button>
          ))}
        </div>

        {(typeFilter !== 'ALL' || statusFilter !== 'AVAILABLE' || searchTerm) && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-stone-400"
            onClick={() => {
              setSearchParams({});
              setSearchText('');
            }}
          >
            <X size={14} className="mr-2" /> Limpiar
          </Button>
        )}
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <Spinner className="w-12 h-12" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="h-96 flex flex-col items-center justify-center text-stone-400 space-y-4">
          <Search size={48} strokeWidth={1} />
          <p className="text-lg font-medium">No se encontraron productos</p>
        </div>
      ) : (
        <ProductGrid products={filteredProducts} />
      )}
    </div>
  );
}
