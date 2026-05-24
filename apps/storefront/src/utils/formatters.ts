export const formatBirdAge = (age: string | null): string => {
  if (!age) return 'N/A';
  const mapping: Record<string, string> = {
    'COCK': 'Gallo',
    'STAG': 'Pollo',
    'HEN': 'Gallina',
    'PULLET': 'Polla'
  };
  return mapping[age.toUpperCase()] || age;
};

export const formatBirdPurpose = (purpose: string | null): string => {
  if (!purpose) return 'N/A';
  const mapping: Record<string, string> = {
    'COMBAT': 'Combate',
    'BREEDING': 'Cría'
  };
  return mapping[purpose.toUpperCase()] || purpose;
};

export const formatSaleStatus = (status: string): string => {
  const mapping: Record<string, string> = {
    'AVAILABLE': 'Disponible',
    'RESERVED': 'Reservado',
    'SOLD': 'Vendido'
  };
  return mapping[status.toUpperCase()] || status;
};

export const formatPrice = (price: number | string | null | undefined): string => {
  if (price === null || price === undefined) return '0';
  const num = Number(price);
  if (isNaN(num)) return '0';
  
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(num);
};

