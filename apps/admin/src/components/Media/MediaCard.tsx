import React, { useState, useRef } from 'react';
import { Play, Heart, Edit2, Trash2 } from 'lucide-react';
import { Media } from '../../types';
import { ASSET_BASE_URL } from '../../api';
import { NexusAutonomousButton } from '../ui/NexusButton';
import { NexusMediaViewer } from '../ui/NexusMediaViewer';

interface MediaCardProps {
  media: Media;
  isTall?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({ media, isTall, onEdit, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Referencia para controlar el video en la miniatura
  const videoRef = useRef<HTMLVideoElement>(null);

  // Utilidad para asegurar que la URL sea absoluta
  const getFullUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${ASSET_BASE_URL}${cleanPath}`;
  };

  const mediaUrl = getFullUrl(media.url);
  const isVideo = media.mediaType === 'VIDEO';

  // Bloquear scroll cuando el preview está abierto
  // Manejadores para el efecto "Hover to Play"
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (isVideo && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => console.log("Autoplay prevented:", error));
      }
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (isVideo && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0; // Resetear al primer frame
    }
  };

  return (
    <>
      {/* --- TARJETA DEL GRID --- */}
      <div 
        role="button"
        tabIndex={0}
        aria-label={`Previsualizar medio ${media.title}`}
        onClick={() => setShowPreview(true)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          setShowPreview(true);
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`relative group cursor-pointer break-inside-avoid overflow-hidden transition-all duration-500 shadow-sm dark:shadow-none hover:shadow-xl border border-border-main bg-bg-card outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20 ${
          isTall ? 'aspect-[3/4]' : 'aspect-square'
        }`}
        style={{ borderRadius: 'var(--radius-outer)' }}
      >
        {/* Icono de Play Indicador */}
        {isVideo && (
          <div 
            className={`absolute z-10 bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-lg pointer-events-none transition-opacity duration-500 ${isHovered ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}
            style={{
              top: 'var(--space-md)',
              right: 'var(--space-md)',
              width: 'var(--size-button-card)',
              height: 'var(--size-button-card)',
              borderRadius: 'var(--radius-card-inner)'
            }}
          >
            <Play size={20} fill="currentColor" style={{ marginLeft: 'var(--space-xs)' }} />
          </div>
        )}

        {/* Renderizado Condicional: Video vs Imagen */}
        {isVideo ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            poster={getFullUrl(media.posterUrl || media.thumbnail)}
            muted
            loop
            playsInline
            preload="metadata"
            className={`w-full h-full object-cover transition-transform duration-700 ${
              isHovered ? 'scale-110' : 'scale-100'
            }`}
          />
        ) : (
          <img 
            src={mediaUrl} 
            alt={media.title} 
            className={`w-full h-full object-cover transition-transform duration-700 ${
              isHovered ? 'scale-110' : 'scale-100'
            }`}
          />
        )}

        {/* --- CAPA DE INFORMACIÓN (SOLO ESCRITORIO - HOVER) --- */}
        <div className={`hidden lg:flex absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent transition-opacity duration-500 flex-col justify-end p-[var(--padding-inner)] ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="transform transition-transform duration-500 translate-y-4 group-hover:translate-y-0 flex flex-col" style={{ gap: 'var(--space-md)' }}>
            
            <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
              <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
                <span 
                  className="bg-brand-500 text-white text-label uppercase tracking-[0.15em] shadow-lg shadow-brand-500/20"
                  style={{
                    borderRadius: 'var(--radius-card-nested)',
                    padding: 'var(--space-xs) var(--space-base)'
                  }}
                >
                  {media.category}
                </span>
                {media.subcategory && (
                  <span 
                    className="bg-white/20 text-white text-label uppercase tracking-[0.15em] backdrop-blur-sm border border-white/20"
                    style={{
                      borderRadius: 'var(--radius-card-nested)',
                      padding: 'var(--space-xs) var(--space-base)'
                    }}
                  >
                    {media.subcategory}
                  </span>
                )}
              </div>
              
              <h3 className="text-white text-h2 truncate drop-shadow-md">{media.title}</h3>
              {media.description && (
                <p className="text-stone-300 text-secondary line-clamp-2">{media.description}</p>
              )}
            </div>
            
            <div
              className="flex items-center justify-between"
              style={{ marginTop: 'var(--space-sm)' }}
            >
              <div className="flex items-center" style={{ gap: 'var(--space-md)' }}>
                <div className="flex items-center" style={{ gap: 'var(--space-xs)' }}>
                  <Heart size={16} className={media.isFavorite ? "fill-brand-500 text-brand-500" : "text-white/80"} />
                  <span className="text-secondary text-white font-bold">{media.likes}</span>
                </div>
              </div>

              <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
                <NexusAutonomousButton
                  density="compact"
                  variant="ghost"
                  isIconOnly
                  icon={Edit2}
                  onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                  className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20"
                  title="Editar"
                />
                <NexusAutonomousButton
                  density="compact"
                  variant="ghost"
                  isIconOnly
                  icon={Trash2}
                  onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                  className="bg-white/10 hover:bg-rose-500/80 backdrop-blur-md text-white border border-white/20 hover:border-rose-500"
                  title="Eliminar"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- MODAL PREVIEW TIPO INSTAGRAM (MÓVIL Y CLICK DESKTOP) --- */}
      <NexusMediaViewer
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        mediaType={isVideo ? 'VIDEO' : 'PHOTO'}
        src={mediaUrl}
        poster={getFullUrl(media.posterUrl || media.thumbnail) || undefined}
        alt={media.title}
        presentation="gallery"
        onEdit={onEdit}
        onDelete={onDelete}
        editLabel="Editar medio"
        deleteLabel="Eliminar medio"
        gallery={{
          category: media.category,
          subcategory: media.subcategory,
          title: media.title,
          description: media.description || undefined,
          metadata: {
            icon: (
              <Heart
                className={media.isFavorite ? 'fill-brand-500 text-brand-500' : ''}
                style={{
                  width: 'var(--size-inner-icon-metadata)',
                  height: 'var(--size-inner-icon-metadata)',
                }}
              />
            ),
            value: media.likes,
            label: 'Me gusta',
          },
        }}
      />
    </>
  );
};
