import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Play, Heart, Edit2, Trash2, X } from 'lucide-react';
import { Media } from '../../types';
import { ASSET_BASE_URL } from '../../api';

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
  const isVideo = media.type === 'VIDEO' || mediaUrl.toLowerCase().split('?')[0].endsWith('.mp4');

  // Bloquear scroll cuando el preview está abierto
  useEffect(() => {
    if (showPreview) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => document.body.classList.remove('overflow-hidden');
  }, [showPreview]);

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
        onClick={() => setShowPreview(true)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`relative group cursor-pointer break-inside-avoid overflow-hidden transition-all duration-500 shadow-sm dark:shadow-none hover:shadow-xl border border-border-main bg-bg-card ${
          isTall ? 'aspect-[3/4]' : 'aspect-square'
        }`}
        style={{ borderRadius: 'var(--radius-outer)' }}
      >
        {/* Icono de Play Indicador */}
        {isVideo && (
          <div 
            className={`absolute top-4 right-4 z-10 w-12 h-12 bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-lg pointer-events-none transition-opacity duration-500 ${isHovered ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}
            style={{ borderRadius: 'var(--radius-inner-visual)' }}
          >
            <Play size={20} fill="currentColor" className="ml-1" />
          </div>
        )}

        {/* Renderizado Condicional: Video vs Imagen */}
        {isVideo ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            poster={getFullUrl(media.thumbnail)} 
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
                  className="px-3 py-1 bg-brand-500 text-white text-label uppercase tracking-[0.15em] shadow-lg shadow-brand-500/20"
                  style={{ borderRadius: 'var(--radius-card-nested)' }}
                >
                  {media.category}
                </span>
                {media.subcategory && (
                  <span 
                    className="px-3 py-1 bg-white/20 text-white text-label uppercase tracking-[0.15em] backdrop-blur-sm border border-white/20"
                    style={{ borderRadius: 'var(--radius-card-nested)' }}
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
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center" style={{ gap: 'var(--space-md)' }}>
                <div className="flex items-center" style={{ gap: 'var(--space-xs)' }}>
                  <Heart size={16} className={media.isFavorite ? "fill-brand-500 text-brand-500" : "text-white/80"} />
                  <span className="text-secondary text-white font-bold">{media.likes}</span>
                </div>
              </div>

              <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
                <button 
                  onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 transition-all active:scale-95"
                  title="Editar"
                  style={{ borderRadius: 'var(--radius-card-nested)' }}
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                  className="w-10 h-10 bg-white/10 hover:bg-rose-500/80 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:border-rose-500 transition-all active:scale-95"
                  title="Eliminar"
                  style={{ borderRadius: 'var(--radius-card-nested)' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- MODAL PREVIEW TIPO INSTAGRAM (MÓVIL Y CLICK DESKTOP) --- */}
      {showPreview && createPortal(
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
          
          {/* Header del Preview */}
          <div className="absolute top-0 left-0 right-0 p-[var(--padding-inner)] flex items-start justify-between z-20 bg-gradient-to-b from-black/80 to-transparent">
            <button 
              onClick={() => setShowPreview(false)}
              className="w-12 h-12 flex items-center justify-center bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20 active:scale-90 transition-all"
              style={{ borderRadius: 'var(--radius-card-inner)' }}
            >
              <X size={24} />
            </button>

            <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
              <button 
                onClick={() => { setShowPreview(false); onEdit?.(); }}
                className="px-5 h-12 bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20 active:scale-95 transition-all flex items-center gap-2"
                style={{ borderRadius: 'var(--radius-card-inner)' }}
              >
                <Edit2 size={16} />
                <span className="hidden sm:inline text-label uppercase tracking-[0.15em]">Editar</span>
              </button>
              <button 
                onClick={() => { setShowPreview(false); onDelete?.(); }}
                className="w-12 h-12 flex items-center justify-center bg-rose-500/20 backdrop-blur-md text-white border border-rose-500/30 hover:bg-rose-500/40 active:scale-90 transition-all"
                style={{ borderRadius: 'var(--radius-card-inner)' }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {/* Contenido Central (Imagen/Video) */}
          <div className="flex-1 flex items-center justify-center p-0 sm:p-[var(--padding-outer)] relative">
            {isVideo ? (
              <video 
                src={mediaUrl} 
                controls 
                autoPlay 
                className="w-full h-full object-contain max-h-[80vh]"
                style={{ borderRadius: 'var(--radius-outer)' }}
              />
            ) : (
              <img 
                src={mediaUrl} 
                alt={media.title} 
                className="w-full h-full object-contain max-h-[85vh]"
                style={{ borderRadius: 'var(--radius-outer)' }}
              />
            )}
          </div>

          {/* Footer con Información */}
          <div className="absolute bottom-0 left-0 right-0 p-[var(--padding-outer)] bg-gradient-to-t from-black via-black/90 to-transparent pt-20 z-20">
            <div className="max-w-3xl mx-auto flex flex-col" style={{ gap: 'var(--space-md)' }}>
              <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
                <div className="flex items-center" style={{ gap: 'var(--space-sm)' }}>
                  <span 
                    className="px-3 py-1 bg-brand-500 text-white text-label uppercase tracking-[0.15em] shadow-lg shadow-brand-500/20"
                    style={{ borderRadius: 'var(--radius-card-nested)' }}
                  >
                    {media.category}
                  </span>
                  {media.subcategory && (
                    <span 
                      className="px-3 py-1 bg-white/20 text-white text-label uppercase tracking-[0.15em] backdrop-blur-sm border border-white/20"
                      style={{ borderRadius: 'var(--radius-card-nested)' }}
                    >
                      {media.subcategory}
                    </span>
                  )}
                </div>
                
                <h2 className="text-white text-h1 drop-shadow-md">{media.title}</h2>
              </div>
              
              {media.description && (
                <p className="text-stone-300 text-secondary leading-relaxed max-w-2xl">
                  {media.description}
                </p>
              )}

              <div className="flex items-center text-stone-400 mt-2" style={{ gap: 'var(--space-xs)' }}>
                <Heart size={16} className={media.isFavorite ? "fill-brand-500 text-brand-500" : ""} />
                <span className="text-secondary text-white font-bold">{media.likes} Me gusta</span>
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
};
