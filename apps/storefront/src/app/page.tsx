"use client";

import { useEffect, useState } from 'react';
import { HelpCircle, ShoppingBag, Sparkles } from 'lucide-react';
import { mediaApi } from '../api/settings';
import { ArticleShelf } from '../components/layout/ArticleShelf';
import { BentoArrivals } from '../components/layout/BentoArrivals';
import { BirdShowcase } from '../components/layout/BirdShowcase';
import { GalleryFeatured } from '../components/layout/GalleryFeatured';
import { HeroSlider } from '../components/layout/HeroSlider';
import { RaffleSection } from '../components/layout/RaffleSection';
import { EmptyState } from '../components/ui/EmptyState';
import { FAQAccordion } from '../components/ui/FAQAccordion';
import { SectionReveal, SkeletonBento } from '../components/ui/LayoutUtils';
import { StorefrontSection } from '../components/ui/Section';
import { useProducts } from '../hooks/useProducts';
import { useSettings } from '../hooks/useSettings';
import { Media } from '../types';

export default function HomePage() {
  const { products, loading } = useProducts();
  const { isModuleEnabled } = useSettings();
  const [media, setMedia] = useState<Media[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(true);

  const showRaffles = isModuleEnabled('raffle_enabled') || process.env.NEXT_PUBLIC_RAFFLE_ENABLED === 'true';

  const recentProducts = Array.isArray(products)
    ? products.filter((product) => product.saleStatus === 'AVAILABLE').slice(0, 5)
    : [];

  const articleProducts = Array.isArray(products)
    ? products.filter((product) => product.type === 'ITEM' && product.saleStatus === 'AVAILABLE')
    : [];

  const combatBirds = Array.isArray(products)
    ? products
        .filter((product) => product.type === 'BIRD' && product.purpose === 'COMBAT' && product.saleStatus === 'AVAILABLE')
        .slice(0, 6)
    : [];

  const breedingBirds = Array.isArray(products)
    ? products
        .filter((product) => product.type === 'BIRD' && product.purpose === 'BREEDING' && product.saleStatus === 'AVAILABLE')
        .slice(0, 6)
    : [];

  useEffect(() => {
    const loadMedia = async () => {
      try {
        const data = await mediaApi.getAll();
        const photos = Array.isArray(data)
          ? data.filter((item) => item.type === 'PHOTO').slice(0, 8)
          : [];
        setMedia(photos);
      } catch (err) {
        console.error('Error fetching media in home:', err);
      } finally {
        setLoadingMedia(false);
      }
    };

    loadMedia();
  }, []);

  return (
    <main className="w-full max-w-full overflow-x-hidden">
      <HeroSlider />

      <div className="space-y-[var(--sf-space-xl)] pb-[var(--sf-space-xl)] pt-[var(--sf-space-xl)]">
        <section className="mx-auto max-w-[1440px] px-[var(--sf-padding-outer)]">
          <SectionReveal>
            <div className="mb-[var(--sf-space-lg)] flex flex-col justify-between gap-[var(--sf-space-md)] border-b border-stone-200 pb-[var(--sf-space-md)] md:flex-row md:items-end">
              <div className="space-y-3">
                <div className="sf-text-label inline-flex items-center gap-2 text-brand-500">
                  <Sparkles size={14} /> Genetica & seleccion
                </div>
                <h2 className="sf-text-display uppercase text-stone-950">
                  Ultimas incorporaciones
                </h2>
              </div>
            </div>

            {loading ? (
              <SkeletonBento />
            ) : recentProducts.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="Catalogo en preparacion"
                description="Estamos registrando nuevos ejemplares. Vuelve pronto."
              />
            ) : (
              <BentoArrivals products={recentProducts} />
            )}
          </SectionReveal>
        </section>

        {!loadingMedia && media.length > 0 && (
          <SectionReveal>
            <GalleryFeatured items={media} />
          </SectionReveal>
        )}

        {!loading && articleProducts.length > 0 && (
          <SectionReveal>
            <ArticleShelf products={articleProducts} />
          </SectionReveal>
        )}

        {!loading && (
          <BirdShowcase
            combatBirds={combatBirds}
            breedingBirds={breedingBirds}
          />
        )}

        {showRaffles && (
          <SectionReveal>
            <RaffleSection />
          </SectionReveal>
        )}

        <SectionReveal>
          <StorefrontSection
            id="preguntas-frecuentes"
            icon={HelpCircle}
            eyebrow="Ayuda"
            title="Preguntas frecuentes"
            description="Respuestas operativas sobre envio, pagos, reservas y validacion de ejemplares."
            className="mx-auto max-w-7xl px-[var(--sf-padding-outer)]"
          >
            <FAQAccordion />
          </StorefrontSection>
        </SectionReveal>
      </div>
    </main>
  );
}
