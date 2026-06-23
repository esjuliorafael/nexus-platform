"use client";

import { useCallback, useEffect, useState, useMemo } from 'react';
import { Camera, LayoutGrid, PlayCircle, Video, Image as ImageIcon } from 'lucide-react';
import { mediaApi } from '../../api/settings';
import { Media } from '../../types';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { StorefrontIcon } from '../../components/ui/Icon';
import { MediaViewer } from '../../components/ui/MediaViewer';
import { motion, AnimatePresence } from 'framer-motion';
import { getAssetUrl } from '../../utils/formatters';

type GalleryFilter = 'ALL' | 'PHOTO' | 'VIDEO';
type PositionedMedia = { item: Media; index: number };

export default function GalleryPage() {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<GalleryFilter>('ALL');
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);

  useEffect(() => {
    const loadMedia = async () => {
      try {
        const data = await mediaApi.getAll();
        setMedia(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading gallery:", err);
      } finally {
        setLoading(false);
      }
    };
    loadMedia();
  }, []);

  const filteredMedia = useMemo(() => {
    return media.filter((item) => filter === 'ALL' || item.mediaType === filter);
  }, [media, filter]);

  const selectedMediaIndex = selectedMedia
    ? filteredMedia.findIndex((item) => item.id === selectedMedia.id)
    : -1;
  const canNavigateMedia = filteredMedia.length > 1 && selectedMediaIndex >= 0;

  const closeMediaViewer = useCallback(() => {
    setSelectedMedia(null);
  }, []);

  const showRelativeMedia = useCallback(
    (offset: number) => {
      if (filteredMedia.length <= 1 || selectedMediaIndex < 0) return;
      const nextIndex =
        (selectedMediaIndex + offset + filteredMedia.length) %
        filteredMedia.length;
      setSelectedMedia(filteredMedia[nextIndex]);
    },
    [filteredMedia, selectedMediaIndex],
  );
  const showPreviousMedia = useCallback(() => {
    showRelativeMedia(-1);
  }, [showRelativeMedia]);
  const showNextMedia = useCallback(() => {
    showRelativeMedia(1);
  }, [showRelativeMedia]);

  const desktopColumns = useMemo(() => {
    const columns: PositionedMedia[][] = [[], [], []];
    filteredMedia.forEach((item, index) => {
      columns[index % 3].push({ item, index });
    });
    return columns;
  }, [filteredMedia]);

  const mobileColumns = useMemo(() => {
    const columns: PositionedMedia[][] = [[], []];
    filteredMedia.forEach((item, index) => {
      columns[index % 2].push({ item, index });
    });
    return columns;
  }, [filteredMedia]);

  const renderMediaCard = (item: Media, index: number, mobile: boolean) => {
    const isTall = mobile
      ? index % 4 === 1 || index % 4 === 2
      : index % 2 === 1;

    return (
      <MediaCard
        key={item.id}
        item={item}
        isTall={isTall}
        onOpen={() => setSelectedMedia(item)}
      />
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-6" style={{ paddingBlock: 'var(--sf-space-xl)' }}>
      <div className="flex flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
        
        {/* Header: Instagram Profile Style */}
        <header className="flex flex-col md:flex-row items-center md:items-end justify-between border-b border-stone-100 pb-12" style={{ gap: 'var(--sf-space-lg)' }}>
          <div className="flex items-center" style={{ gap: 'var(--sf-space-md)' }}>
            <StorefrontIcon icon={ImageIcon} context="section" variant="brand" />
            <div className="flex flex-col">
              <p className="sf-text-label text-brand-500 uppercase tracking-[0.2em] font-black">Archivo Visual</p>
              <h1 className="sf-text-display text-stone-850 uppercase leading-none">Galería</h1>
            </div>
          </div>
          
          <div className="flex bg-stone-100 p-1.5 rounded-[2rem] border border-stone-200/60 shadow-inner">
            <FilterButton active={filter === 'ALL'} onClick={() => setFilter('ALL')} icon={LayoutGrid} label="Todos" />
            <FilterButton active={filter === 'PHOTO'} onClick={() => setFilter('PHOTO')} icon={Camera} label="Fotos" />
            <FilterButton active={filter === 'VIDEO'} onClick={() => setFilter('VIDEO')} icon={Video} label="Videos" />
          </div>
        </header>

        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <Spinner className="h-12 w-12" />
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="py-20">
            <EmptyState
              icon={LayoutGrid}
              title="Sin Contenido"
              description="No se encontraron imágenes o vídeos para este filtro."
            />
          </div>
        ) : (
          <div>
            <motion.div
              layout
              className="hidden grid-cols-3 lg:grid"
              style={{ gap: 'var(--sf-space-md)' }}
            >
              {desktopColumns.map((column, columnIndex) => (
                <div
                  key={`desktop-column-${columnIndex}`}
                  className="flex flex-col"
                  style={{ gap: 'var(--sf-space-md)' }}
                >
                  <AnimatePresence mode="popLayout">
                    {column.map(({ item, index }) =>
                      renderMediaCard(item, index, false),
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </motion.div>

            <motion.div
              layout
              className="grid grid-cols-2 lg:hidden"
              style={{ gap: 'var(--sf-space-sm)' }}
            >
              {mobileColumns.map((column, columnIndex) => (
                <div
                  key={`mobile-column-${columnIndex}`}
                  className="flex flex-col"
                  style={{ gap: 'var(--sf-space-sm)' }}
                >
                  <AnimatePresence mode="popLayout">
                    {column.map(({ item, index }) =>
                      renderMediaCard(item, index, true),
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </motion.div>
          </div>
        )}
      </div>

      <MediaViewer
        isOpen={Boolean(selectedMedia)}
        media={selectedMedia}
        onClose={closeMediaViewer}
        onPrevious={showPreviousMedia}
        onNext={showNextMedia}
        canNavigate={canNavigateMedia}
      />
    </div>
  );
}

function FilterButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${
        active ? 'bg-white text-stone-900 shadow-md shadow-stone-200/50' : 'text-stone-400 hover:text-stone-600'
      }`}
    >
      <Icon size={14} strokeWidth={active ? 2.5 : 2} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function MediaCard({
  item,
  isTall,
  onOpen,
}: {
  item: Media;
  isTall: boolean;
  onOpen: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative w-full cursor-pointer overflow-hidden border border-stone-200/50 bg-stone-100 text-left outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20 ${
        isTall ? 'aspect-[3/4]' : 'aspect-square'
      }`}
      style={{ borderRadius: 'var(--sf-radius-inner)' }}
      aria-label={`Ver ${item.title}`}
    >
      {item.mediaType === 'VIDEO' && !item.posterUrl ? (
        <video
          src={getAssetUrl(item.mediaUrl)}
          className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.15]"
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <img
          src={getAssetUrl(item.posterUrl || item.mediaUrl || item.filePath)}
          className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.15]"
          alt={item.title}
          loading="lazy"
        />
      )}

      {/* Type Indicator (Video) */}
      {item.mediaType === 'VIDEO' && (
        <div className="absolute top-4 right-4 z-10 text-white drop-shadow-lg opacity-90 group-hover:opacity-0 transition-opacity">
          <PlayCircle size={20} strokeWidth={2} />
        </div>
      )}

      {/* Instagram Style Overlay */}
      <div
        className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent p-6 opacity-0 transition-all duration-500 group-hover:opacity-100"
      >
        <div className="translate-y-4 transition-transform duration-500 ease-emil group-hover:translate-y-0">
          <div className="flex items-center gap-2 mb-1">
             {item.mediaType === 'VIDEO' ? <Video size={12} className="text-brand-400" /> : <Camera size={12} className="text-brand-400" />}
             <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">
               {item.mediaType === 'VIDEO' ? 'Reel / Video' : 'Fotografía'}
             </span>
          </div>
          <h4 className="sf-text-h2 text-white line-clamp-2 leading-tight uppercase tracking-tight">{item.title}</h4>
          {item.description && (
            <p className="sf-text-secondary line-clamp-2 text-white/70 mt-2 font-medium leading-relaxed">{item.description}</p>
          )}
        </div>
      </div>
      
      {/* Subtle Border Overlay */}
      <div className="pointer-events-none absolute inset-0 border border-black/5 rounded-[var(--sf-radius-inner)]" />
    </motion.button>
  );
}
