export const formatCustomerName = (value: string) =>
  value
    .toLocaleLowerCase("es-MX")
    .replace(
      /(^|[\s'-])(\p{L})/gu,
      (_, boundary: string, letter: string) =>
        `${boundary}${letter.toLocaleUpperCase("es-MX")}`,
    );

export const normalizeCustomerName = (value: string) =>
  formatCustomerName(value.trim().replace(/\s+/g, " "));
