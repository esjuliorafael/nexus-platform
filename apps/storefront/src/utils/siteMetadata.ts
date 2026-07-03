export function getClientName() {
  return (
    process.env.CLIENT_NAME ||
    process.env.NEXT_PUBLIC_CLIENT_NAME ||
    process.env.VITE_CLIENT_NAME ||
    'Nexus Store'
  );
}

function getServerApiUrl() {
  return (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.VITE_API_URL ||
    'http://localhost:3001/api/v1'
  );
}

export async function getClientNameForMetadata() {
  try {
    const response = await fetch(`${getServerApiUrl()}/admin/settings`, {
      cache: 'no-store',
    });

    if (!response.ok) return getClientName();

    const settings = await response.json();
    const branding = settings?.branding;
    return (
      branding?.brand_name ||
      branding?.branding_brand_name ||
      getClientName()
    );
  } catch {
    return getClientName();
  }
}

export function getSiteTitle(title?: string, clientName = getClientName()) {
  return title ? `${title} | ${clientName}` : clientName;
}
