export function getClientName() {
  return (
    process.env.CLIENT_NAME ||
    process.env.NEXT_PUBLIC_CLIENT_NAME ||
    process.env.VITE_CLIENT_NAME ||
    'Nexus Store'
  );
}

export function getSiteTitle(title?: string) {
  const clientName = getClientName();
  return title ? `${title} | ${clientName}` : clientName;
}
