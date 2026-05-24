"use client";

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownProps {
  expiresAt: string;
  onExpire?: () => void;
  className?: string;
}

export function Countdown({ expiresAt, onExpire, className = "" }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(expiresAt).getTime() - new Date().getTime();
      
      if (difference <= 0) {
        setTimeLeft('EXPIRADO');
        if (onExpire) onExpire();
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
  }, [expiresAt]);

  return (
    <div className={`flex items-center gap-1.5 font-mono text-[10px] font-bold ${className}`}>
      <Clock size={12} className="text-brand-500" />
      <span>LIBERA EN:</span>
      <span className="text-brand-500 tabular-nums">{timeLeft}</span>
    </div>
  );
}
