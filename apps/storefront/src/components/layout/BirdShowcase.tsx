"use client";

import { ArrowRight, Bird, Dna, ShieldCheck, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Product } from '../../types';
import { ProductCard } from '../product/ProductCard';
import { Button } from '../ui/Button';
import { StorefrontIcon } from '../ui/Icon';

interface BirdShowcaseProps {
  combatBirds: Product[];
  breedingBirds: Product[];
}

export function BirdShowcase({ combatBirds, breedingBirds }: BirdShowcaseProps) {
  return (
    <div className="flex flex-col" style={{ gap: 'var(--sf-space-xl)' }}>
      <section className="relative overflow-hidden bg-stone-950" style={{ paddingBlock: 'clamp(5rem, 12vw, 12rem)' }}>
        <div className="absolute right-0 top-0 h-[600px] w-[600px] rounded-full bg-brand-500/5 blur-[150px]" />

        <div className="relative z-10 mx-auto max-w-[1440px] px-6 lg:px-12">
          <div className="flex flex-col" style={{ gap: 'var(--sf-space-xl)' }}>
            <ShowcaseHeader
              dark
              icon={ShieldCheck}
              eyebrow="Poderio & Caracter"
              title={<>Aves de <span className="text-brand-500">Combate</span></>}
              description="Ejemplares seleccionados por su casta, velocidad y corte. Genetica probada en los niveles mas exigentes."
              href="/store?type=BIRD&purpose=COMBAT"
              cta="Explorar Linajes"
            />

            {combatBirds.length > 0 ? (
              <ProductGrid products={combatBirds} dark />
            ) : (
              <EmptyShowcase dark icon={Bird} text="Nuevos ejemplares en preparacion" />
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 py-12 lg:px-12">
        <div className="flex flex-col" style={{ gap: 'var(--sf-space-xl)' }}>
          <ShowcaseHeader
            icon={Dna}
            eyebrow="Pureza & Herencia"
            title={<>Aves de <span className="text-brand-500/80">Cria</span></>}
            description="Sementales y reproductoras de registro. El corazon de nuestra excelencia genetica para tu propio rancho."
            href="/store?type=BIRD&purpose=BREEDING"
            cta="Ver Reproductoras"
          />

          {breedingBirds.length > 0 ? (
            <ProductGrid products={breedingBirds} />
          ) : (
            <EmptyShowcase icon={Dna} text="Seleccion de sementales en curso" />
          )}
        </div>
      </section>
    </div>
  );
}

function ShowcaseHeader({
  dark = false,
  icon,
  eyebrow,
  title,
  description,
  href,
  cta,
}: {
  dark?: boolean;
  icon: LucideIcon;
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div
      className={`flex flex-col justify-between border-b pb-[var(--sf-space-lg)] lg:flex-row lg:items-end ${
        dark ? 'border-white/10' : 'border-stone-200'
      }`}
      style={{ gap: 'var(--sf-space-lg)' }}
    >
      <div className="flex max-w-3xl flex-col" style={{ gap: 'var(--sf-space-md)' }}>
        <div className={`inline-flex items-center sf-text-label ${dark ? 'text-brand-400' : 'text-brand-500'}`} style={{ gap: 'var(--sf-space-sm)' }}>
          <StorefrontIcon
            icon={icon}
            context="card"
            variant={dark ? 'dark' : 'brand'}
            className={dark ? 'border-white/10 bg-white/5 text-brand-400' : ''}
          />
          {eyebrow}
        </div>
        <h2 className={`sf-text-hero uppercase italic ${dark ? 'text-white' : 'text-stone-950'}`}>
          {title}
        </h2>
        <p className={`sf-text-body max-w-lg ${dark ? 'text-stone-400' : 'text-stone-500'}`}>
          {description}
        </p>
      </div>

      <Button asChild variant={dark ? 'outline' : 'ghost'} context="card" className={dark ? 'border-white/10 text-white hover:bg-white hover:text-stone-950' : 'hover:bg-transparent hover:text-brand-500'}>
        <Link href={href}>
          {cta}
          <ArrowRight size={14} className="ml-2 transition-transform group-hover:translate-x-1" />
        </Link>
      </Button>
    </div>
  );
}

function ProductGrid({ products, dark = false }: { products: Product[]; dark?: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 'var(--sf-space-md)' }}>
      {products.map((product) => (
        <div key={product.id} className={dark ? 'dark-card' : ''}>
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}

function EmptyShowcase({ icon: Icon, text, dark = false }: { icon: LucideIcon; text: string; dark?: boolean }) {
  return (
    <div
      className={`col-span-full border border-dashed text-center ${dark ? 'border-white/10' : 'border-stone-200'}`}
      style={{ borderRadius: 'var(--sf-radius-outer)', padding: 'var(--sf-space-xl)' }}
    >
      <Icon className={`mx-auto mb-4 ${dark ? 'text-stone-700' : 'text-stone-300'}`} size={48} />
      <p className={`sf-text-label ${dark ? 'text-stone-500' : 'text-stone-400'}`}>{text}</p>
    </div>
  );
}
