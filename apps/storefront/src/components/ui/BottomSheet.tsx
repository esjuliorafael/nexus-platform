"use client";

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Prevent scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm"
          />

          {/* Bottom Sheet Container */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-white rounded-t-[2.5rem] border-t border-stone-200/80 shadow-[0_-20px_50px_rgba(0,0,0,0.15)] max-h-[90vh] overflow-hidden"
          >
            {/* Header/Handle */}
            <div className="flex flex-col items-center pt-4 pb-2 border-b border-stone-100 shrink-0">
              {/* Drag handle decoration */}
              <div className="w-12 h-1.5 bg-stone-200 rounded-full mb-4" />
              
              <div className="w-full px-6 flex items-center justify-between">
                {title ? (
                  <h3 className="text-xl font-black text-stone-800 uppercase italic lora tracking-tight">
                    {title}
                  </h3>
                ) : (
                  <div />
                )}
                <button
                  onClick={onClose}
                  className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-50 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 pb-20">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
