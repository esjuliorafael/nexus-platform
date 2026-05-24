/**
 * Sanitiza un nombre de archivo para que sea seguro para URLs y consistente.
 * Convierte a minúsculas, elimina acentos, reemplaza caracteres especiales por guiones
 * y añade un timestamp para evitar colisiones.
 */
export function sanitizeFileName(fileName: string): string {
  const parts = fileName.split('.');
  const extension = parts.pop()?.toLowerCase() || '';
  const name = parts.join('.');

  const sanitized = name
    .toLowerCase()
    .normalize('NFD') // Descompone caracteres con acentos
    .replace(/[\u0300-\u036f]/g, '') // Elimina los acentos
    .replace(/[^a-z0-9]/g, '-') // Reemplaza cualquier cosa que no sea letra o número por un guion
    .replace(/-+/g, '-') // Reemplaza múltiples guiones seguidos por uno solo
    .replace(/^-|-$/g, ''); // Elimina guiones al principio o al final

  // Si el nombre quedó vacío después de la sanitización, usamos 'file'
  const finalName = sanitized || 'file';

  return `${finalName}-${Date.now()}.${extension}`;
}
