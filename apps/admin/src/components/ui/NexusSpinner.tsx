import React from 'react';

interface NexusSpinnerProps {
  label?: string;
  fullPage?: boolean;
}

/**
 * NexusSpinner: Indicador de carga unificado bajo Geometría Recursiva.
 * Utiliza los radios y animaciones del sistema para una experiencia premium.
 */
export const NexusSpinner: React.FC<NexusSpinnerProps> = ({ 
  label = 'Cargando...', 
  fullPage = true 
}) => {
  return (
    <div className={`flex flex-col items-center justify-center animate-in fade-in duration-500 ${fullPage ? 'py-40' : 'py-10'}`}>
       <div className="relative w-20 h-20 mb-8">
          <div className="absolute inset-0 border-4 border-brand-100 rounded-[2rem]" />
          <div 
            className="absolute inset-0 border-4 border-brand-500 border-t-transparent rounded-[2rem] animate-spin" 
            style={{ animationDuration: '1s', animationTimingFunction: 'var(--ease-emil)' }} 
          />
       </div>
       {label && (
         <p className="text-label uppercase tracking-[0.15em] text-text-muted">
           {label}
         </p>
       )}
    </div>
  );
};
