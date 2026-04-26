import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Play, Heart, Edit2, Trash2, X } from 'lucide-react';
import { Media } from '../../types';

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

  // Bloquear scroll cuando el preview está abierto
  useEffect(() => {
    if (showPreview) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => document.body.classList.remove('overflow-hidden');
  }, [showPreview]);

  // Manejadores para el efecto "Hover to Play" (Homologado con ProductCard)
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (media.type === 'video' && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => console.log("Autoplay prevented:", error));
      }
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (media.type === 'video' && videoRef.current) {
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
        className={`relative group cursor-pointer break-inside-avoid overflow-hidden transition-all duration-500 shadow-sm hover:shadow-md border border-stone-200 bg-white rounded-[2rem] ${
          isTall ? 'aspect-[3/4]' : 'aspect-square'
        }`}
      >
        {/* Icono de Play (Solo visual, desaparece o se mantiene según tu preferencia, aquí lo dejo fijo como indicador) */}
        {media.type === 'video' && (
          <div className={`absolute top-4 right-4 z-10 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30 shadow-lg pointer-events-none transition-opacity duration-300 ${isHovered ? 'opacity-0' : 'opacity-100'}`}>
            <Play size={16} fill="currentColor" />
          </div>
        )}

        {/* Renderizado Condicional: Video vs Imagen */}
        {media.type === 'video' ? (
          <video
            ref={videoRef}
            src={media.url}
            poster={media.thumbnail} // Usamos el thumbnail si existe como poster inicial
            muted
            loop
            playsInline
            preload="metadata" // Importante para cargar el primer frame
            className={`w-full h-full object-cover transition-transform duration-700 ${
              isHovered ? 'scale-110' : 'scale-100'
            }`}
          />
        ) : (
          <img 
            src={media.url} 
            alt={media.title} 
            className={`w-full h-full object-cover transition-transform duration-700 ${
              isHovered ? 'scale-110' : 'scale-100'
            }`}
          />
        )}

        {/* --- CAPA DE INFORMACIÓN (SOLO ESCRITORIO - HOVER) --- */}
        <div className={`hidden lg:flex absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 flex-col justify-end p-6 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="transform transition-transform duration-300 translate-y-4 group-hover:translate-y-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-brand-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-brand-500/20">
                {media.category}
              </span>
              {media.subcategory && (
                <span className="px-3 py-1 bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-full backdrop-blur-sm border border-white/20">
                  {media.subcategory}
                </span>
              )}
            </div>
            
            <h3 className="text-white font-bold text-lg leading-tight mb-1 line-clamp-2 drop-shadow-sm">{media.title}</h3>
            <p className="text-stone-300 text-xs line-clamp-2 mb-4 font-medium">{media.description}</p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-white/90">
                  <Heart size={18} className={media.isFavorite ? "fill-brand-500 text-brand-500" : ""} />
                  <span className="text-xs font-bold">{media.likes}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 transition-all active:scale-95"
                  title="Editar"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                  className="w-10 h-10 bg-white/10 hover:bg-rose-500/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 hover:border-rose-500/50 transition-all active:scale-95"
                  title="Eliminar"
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
        <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-in fade-in duration-300">
          
          {/* Header del Preview */}
          <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-start justify-between z-20 bg-gradient-to-b from-black/60 to-transparent">
            <button 
              onClick={() => setShowPreview(false)}
              className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white border border-white/10 hover:bg-white/20 active:scale-90 transition-all"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => { setShowPreview(false); onEdit?.(); }}
                className="p-3 sm:px-5 bg-white/10 backdrop-blur-md rounded-full text-white border border-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center gap-2 text-xs font-bold"
              >
                <Edit2 className="w-5 h-5" />
                <span className="hidden sm:inline">Editar</span>
              </button>
              <button 
                onClick={() => { setShowPreview(false); onDelete?.(); }}
                className="p-3 bg-rose-500/20 backdrop-blur-md rounded-full text-white border border-rose-500/30 hover:bg-rose-500/40 active:scale-90 transition-all"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>

          {/* Contenido Central (Imagen/Video) */}
          <div className="flex-1 flex items-center justify-center p-0 sm:p-10 relative">
            {media.type === 'video' ? (
              <video 
                src={media.url} 
                controls 
                autoPlay 
                className="w-full h-full object-contain max-h-[80vh]"
              />
            ) : (
              <img 
                src={media.url} 
                alt={media.title} 
                className="w-full h-full object-contain max-h-[85vh]"
              />
            )}
          </div>

          {/* Footer con Información */}
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 bg-gradient-to-t from-black via-black/80 to-transparent pt-20 z-20">
            <div className="max-w-3xl mx-auto space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-brand-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-brand-500/20">
                  {media.category}
                </span>
                {media.subcategory && (
                  <span className="px-3 py-1 bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-full backdrop-blur-sm border border-white/20">
                    {media.subcategory}
                  </span>
                )}
              </div>
              
              <h2 className="text-white text-2xl font-bold leading-tight">{media.title}</h2>
              
              {media.description && (
                <p className="text-stone-300 text-sm font-medium leading-relaxed max-w-2xl">
                  {media.description}
                </p>
              )}

              <div className="flex items-center gap-2 text-stone-400 text-xs font-bold pt-2">
                <Heart size={14} className={media.isFavorite ? "fill-brand-500 text-brand-500" : ""} />
                <span>{media.likes} Me gusta</span>
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
};