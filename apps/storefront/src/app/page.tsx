"use client";

import { useEffect, useState } from 'react';
import { HeroSlider } from '../components/layout/HeroSlider';
import { useProducts } from '../hooks/useProducts';
import { ShoppingBag, Sparkles } from 'lucide-react';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ProductCard } from '../components/product/ProductCard';

import { BentoArrivals } from '../components/layout/BentoArrivals';
import { GalleryFeatured } from '../components/layout/GalleryFeatured';
import { ArticleShelf } from '../components/layout/ArticleShelf';
import { BirdShowcase } from '../components/layout/BirdShowcase';
import { RaffleSection } from '../components/layout/RaffleSection';
import { SectionReveal, SkeletonBento } from '../components/ui/LayoutUtils';
import { useSettings } from '../hooks/useSettings';
import { mediaApi } from '../api/settings';
import { Media } from '../types';

export default function HomePage() {
  const { products, loading } = useProducts();
  const { isModuleEnabled } = useSettings();
  const [media, setMedia] = useState<Media[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(true);

  // Feature Flag for Raffles
  const showRaffles = isModuleEnabled('raffle_enabled') || process.env.NEXT_PUBLIC_RAFFLE_ENABLED === 'true';

  // Filter products for dynamic sections
  const recentProducts = Array.isArray(products)
    ? products.filter(p => p.saleStatus === 'AVAILABLE').slice(0, 5)
    : [];

  const articleProducts = Array.isArray(products)
    ? products.filter(p => p.type === 'ITEM' && p.saleStatus === 'AVAILABLE')
    : [];

  const combatBirds = Array.isArray(products)
    ? products.filter(p => p.type === 'BIRD' && p.purpose === 'COMBAT' && p.saleStatus === 'AVAILABLE').slice(0, 6)
    : [];

  const breedingBirds = Array.isArray(products)
    ? products.filter(p => p.type === 'BIRD' && p.purpose === 'BREEDING' && p.saleStatus === 'AVAILABLE').slice(0, 6)
    : [];

  // Fetch gallery items
  useEffect(() => {
    mediaApi.getAll()
      .then(data => {
        const photos = Array.isArray(data) 
          ? data.filter(m => m.type === 'PHOTO').slice(0, 8) 
          : [];
        setMedia(photos);
      })
      .catch(err => console.error("Error fetching media in home:", err))
      .finally(() => setLoadingMedia(false));
  }, []);

  return (
    <main className="overflow-x-hidden w-full max-w-full">
      {/* PHASE 2: HERO SLIDER */}
      <HeroSlider />

      <div className="space-y-40 pb-40">
        {/* PHASE 3: ASYMMETRIC GRID (ARRIVALS) */}
        <section className="max-w-[1440px] mx-auto px-6 lg:px-12 mt-32">
          <SectionReveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 border-b border-stone-200 pb-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 text-brand-500 font-black uppercase text-[10px] tracking-[0.2em]">
                  <Sparkles size={12} /> Genética & Selección
                </div>
                <h2 className="text-4xl md:text-6xl font-display font-black text-stone-950 tracking-tight uppercase leading-[0.9]">
                  Últimas Incorporaciones
                </h2>
              </div>
            </div>

            {loading ? (
              <SkeletonBento />
            ) : recentProducts.length === 0 ? (
              <EmptyState 
                icon={ShoppingBag} 
                title="Catálogo en Preparación" 
                description="Estamos registrando nuevos ejemplares. Vuelve pronto." 
              />
            ) : (
              <BentoArrivals products={recentProducts} />
            )}
          </SectionReveal>
        </section>

        {/* PHASE 4: DARKROOM GALLERY */}
        {!loadingMedia && media.length > 0 && (
          <SectionReveal>
            <GalleryFeatured items={media} />
          </SectionReveal>
        )}

        {/* PHASE 5: ARTICLES SHELF */}
        {!loading && articleProducts.length > 0 && (
          <SectionReveal>
            <ArticleShelf products={articleProducts} />
          </SectionReveal>
        )}

        {/* PHASE 6 & 7: BIRD SHOWCASE (COMBAT & BREEDING) */}
        {!loading && (
          <BirdShowcase 
            combatBirds={combatBirds} 
            breedingBirds={breedingBirds} 
          />
        )}

        {/* PHASE 8: RAFFLE SECTION (CONDITIONAL) */}
        {showRaffles && (
          <SectionReveal>
            <RaffleSection />
          </SectionReveal>
        )}
      </div>
    </main>
  );
}
