"use client";

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '../../utils/cn';

interface CountdownProps {
  expiresAt: string;
  onExpire?: () => void;
  className?: string;
}

export function Countdown({ expiresAt, onExpire, className = '' }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(expiresAt).getTime() - new Date().getTime();
      
      if (difference <= 0) {
        setTimeLeft('EXPIRADO');
        onExpire?.();
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  return (
    <div className={cn('sf-text-label inline-flex items-center text-stone-500', className)} style={{ gap: 'var(--sf-space-xs)' }}>
      <Clock size={14} className="text-brand-500" />
      <span>Libera en</span>
      <span className="tabular-nums text-brand-500">{timeLeft}</span>
    </div>
  );
}
