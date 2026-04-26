import { useEffect, useState } from 'react';
import { ProductGrid } from '../components/product/ProductGrid';
import { useProducts } from '../hooks/useProducts';
import { useSettings } from '../hooks/useSettings';
import { Button } from '../components/ui/Button';
import { ArrowRight, Bird, Package, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Spinner } from '../components/ui/Spinner';
import { raffleApi } from '../api/raffles';
import { Raffle } from '../types';

export function HomePage() {
  const { products, loading } = useProducts();
  const { getBranding, getSetting } = useSettings();
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loadingRaffles, setLoadingRaffles] = useState(false);

  useEffect(() => {
    if (import.meta.env.VITE_RAFFLE_ENABLED === 'true') {
      setLoadingRaffles(true);
      raffleApi.getAll()
        .then(setRaffles)
        .finally(() => setLoadingRaffles(false));
    }
  }, []);

  const branding = getBranding();
  const heroTitle = getSetting('branding', 'hero_title', 'Rancho Las Trojes');
  const heroSubtitle = getSetting('branding', 'hero_subtitle', 'Excelencia en Aves de Combate');

  const featuredProducts = Array.isArray(products) ? products.slice(0, 8) : [];

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden bg-stone-900">
        <div className="absolute inset-0 opacity-50">
          <img 
            src="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?q=80&w=2000&auto=format&fit=crop" 
            className="w-full h-full object-cover"
            alt="Hero background"
          />
        </div>
        <div className="relative text-center space-y-8 px-4 max-w-4xl">
          <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter uppercase italic lora">
            {heroTitle}
          </h1>
          <p className="text-xl md:text-2xl text-stone-300 font-medium">
            {heroSubtitle}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" className="h-14 px-8 rounded-2xl" asChild>
              <Link to="/store">Ver Catálogo</Link>
            </Button>
            <Button variant="outline" size="lg" className="h-14 px-8 rounded-2xl border-white text-white hover:bg-white hover:text-stone-900">
              Conoce más
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8">
        <Link to="/store?type=BIRD" className="group relative h-80 rounded-[2.5rem] overflow-hidden bg-brand-500">
          <div className="absolute inset-0 opacity-40 group-hover:scale-110 transition-transform duration-700">
             <img src="https://images.unsplash.com/photo-1582562124811-c09040d0a901?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 p-10 flex flex-col justify-end">
            <Bird className="text-white mb-4" size={48} strokeWidth={1.5} />
            <h3 className="text-4xl font-black text-white uppercase italic lora">Aves de Combate</h3>
            <p className="text-brand-100 font-medium">Genética superior para competencia</p>
          </div>
        </Link>
        <Link to="/store?type=ARTICLE" className="group relative h-80 rounded-[2.5rem] overflow-hidden bg-stone-800">
          <div className="absolute inset-0 opacity-40 group-hover:scale-110 transition-transform duration-700">
             <img src="https://images.unsplash.com/photo-1444491741275-3747c53c99b4?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 p-10 flex flex-col justify-end">
            <Package className="text-white mb-4" size={48} strokeWidth={1.5} />
            <h3 className="text-4xl font-black text-white uppercase italic lora">Artículos y Equipos</h3>
            <p className="text-stone-300 font-medium">Todo para el cuidado de tus aves</p>
          </div>
        </Link>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 space-y-12">
        <div className="flex items-end justify-between border-b border-stone-200 pb-8">
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-stone-800 tracking-tight flex items-center gap-4">
              <ShoppingBag className="text-brand-500" /> Novedades
            </h2>
            <p className="text-stone-500 font-medium">Explora lo último en nuestro catálogo</p>
          </div>
          <Link to="/store" className="text-brand-500 font-bold hover:underline inline-flex items-center gap-2">
            Ver todo <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Spinner className="w-10 h-10" />
          </div>
        ) : (
          <ProductGrid products={featuredProducts} />
        )}
      </section>

      {/* Raffles Section */}
      {import.meta.env.VITE_RAFFLE_ENABLED === 'true' && raffles.length > 0 && (
        <section className="bg-brand-500 py-24">
          <div className="max-w-7xl mx-auto px-4 space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic lora">Participa en nuestras Rifas</h2>
              <p className="text-brand-100 text-xl font-medium">Gana ejemplares exclusivos y artículos de primera</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {raffles.map(raffle => (
                <div key={raffle.id} className="bg-white rounded-3xl p-6 shadow-xl space-y-6">
                  <div className="aspect-video rounded-2xl overflow-hidden bg-stone-100">
                    {raffle.image && <img src={raffle.image} className="w-full h-full object-cover" />}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-stone-800">{raffle.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-brand-500 font-black text-xl">${Number(raffle.ticketPrice).toLocaleString()}</span>
                      <Button size="sm" asChild>
                        <Link to={`/raffles/${raffle.id}`}>Participar</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
