"use client";

import { LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onActionClick?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionText, onActionClick }: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center text-center p-12 bg-white rounded-[2.5rem] border border-stone-200/60 shadow-xl shadow-stone-100/50 max-w-lg mx-auto space-y-6"
    >
      <div className="w-20 h-20 bg-brand-50 rounded-[2rem] flex items-center justify-center text-brand-500 shadow-inner">
        <Icon size={36} strokeWidth={1.5} />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-2xl font-black text-stone-800 uppercase italic lora tracking-tight">
          {title}
        </h3>
        <p className="text-stone-500 font-medium text-sm leading-relaxed max-w-xs mx-auto">
          {description}
        </p>
      </div>

      {actionText && onActionClick && (
        <Button 
          onClick={onActionClick}
          className="h-12 px-6 rounded-xl font-bold bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20 text-sm transition-all duration-300"
        >
          {actionText}
        </Button>
      )}
    </motion.div>
  );
}
