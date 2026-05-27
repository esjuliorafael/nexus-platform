"use client";

import { useEffect, useState } from 'react';
import { Camera, LayoutGrid, PlayCircle, Video } from 'lucide-react';
import { mediaApi } from '../../api/settings';
import { Media } from '../../types';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { StorefrontCard } from '../../components/ui/Card';

type GalleryFilter = 'ALL' | 'PHOTO' | 'VIDEO';

const filters: Array<{ value: GalleryFilter; label: string; icon: typeof LayoutGrid }> = [
  { value: 'ALL', label: 'Todos', icon: LayoutGrid },
  { value: 'PHOTO', label: 'Fotos', icon: Camera },
  { value: 'VIDEO', label: 'Videos', icon: Video },
];

export default function GalleryPage() {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<GalleryFilter>('ALL');

  useEffect(() => {
    const loadMedia = async () => {
      try {
        const data = await mediaApi.getAll();
        setMedia(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    };

    loadMedia();
  }, []);

  const filteredMedia = Array.isArray(media)
    ? media.filter((item) => filter === 'ALL' || item.type === filter)
    : [];

  return (
    <div className="mx-auto max-w-7xl px-6" style={{ paddingBlock: 'var(--sf-space-xl)' }}>
      <div className="flex flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
        <header className="mx-auto flex max-w-2xl flex-col items-center text-center" style={{ gap: 'var(--sf-space-sm)' }}>
          <p className="sf-text-label text-brand-500">Archivo Visual</p>
          <h1 className="sf-text-display text-stone-850 uppercase italic">Galeria</h1>
          <p className="sf-text-body text-stone-500">Nuestros mejores ejemplares y momentos del rancho.</p>
        </header>

        <div className="flex flex-wrap justify-center" style={{ gap: 'var(--sf-space-sm)' }}>
          {filters.map((option) => {
            const Icon = option.icon;
            const isActive = filter === option.value;

            return (
              <Button
                key={option.value}
                type="button"
                variant={isActive ? 'secondary' : 'outline'}
                context="card"
                onClick={() => setFilter(option.value)}
              >
                <Icon size={18} className="mr-2" />
                {option.label}
              </Button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <Spinner className="h-12 w-12" />
          </div>
        ) : filteredMedia.length === 0 ? (
          <EmptyState
            icon={LayoutGrid}
            title="Sin Media"
            description="No se encontraron imagenes o videos para este filtro."
          />
        ) : (
          <div className="columns-1 space-y-6 gap-6 sm:columns-2 lg:columns-3">
            {filteredMedia.map((item) => (
              <StorefrontCard
                key={item.id}
                interactive
                className="group relative mb-6 break-inside-avoid overflow-hidden p-0"
              >
                <img
                  src={item.filePath}
                  className="h-auto w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                  alt={item.title}
                />

                {item.type === 'VIDEO' && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-stone-950/20 transition-colors group-hover:bg-stone-950/40">
                    <PlayCircle className="text-white drop-shadow-2xl" size={48} strokeWidth={1.5} />
                  </div>
                )}

                <div
                  className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-stone-950/85 via-stone-950/10 to-transparent text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ padding: 'var(--sf-padding-inner)', gap: 'var(--sf-space-xs)' }}
                >
                  <h4 className="sf-text-h2">{item.title}</h4>
                  {item.description && (
                    <p className="sf-text-secondary line-clamp-2 text-stone-300">{item.description}</p>
                  )}
                </div>
              </StorefrontCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
