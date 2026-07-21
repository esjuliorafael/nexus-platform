"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn'; // Assuming a cn utility for classes

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export function SmartImage({ 
  src, 
  alt, 
  className, 
  wrapperClassName,
  priority = false,
  onLoad,
  onError,
}: SmartImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={cn("relative overflow-hidden bg-stone-900", wrapperClassName)}>
      {/* 1. SHIMMER / SKELETON LAYER */}
      <AnimatePresence>
        {!isLoaded && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-10"
          >
            {/* Shimmer Effect Animation */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_2s_infinite]" />
            <div className="w-full h-full bg-stone-850" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. ACTUAL IMAGE LAYER */}
      <motion.img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        onLoad={() => {
          setIsLoaded(true);
          onLoad?.();
        }}
        onError={onError}
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ 
          opacity: isLoaded ? 1 : 0, 
          scale: isLoaded ? 1 : 1.05 
        }}
        transition={{ 
          duration: 0.8, 
          ease: [0.16, 1, 0.3, 1] // Custom quintic ease-out for premium feel
        }}
        className={cn(
          "w-full h-full object-cover will-change-transform",
          className
        )}
      />
      
      {/* 3. INLINE STYLES FOR ANIMATION (if not in index.css) */}
      <style jsx>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
