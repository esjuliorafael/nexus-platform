import axios from 'axios';

// Derive API URL dynamically based on current domain if not explicitly provided
const getDynamicApiUrl = () => {
  // 1. Browser context
  if (typeof window !== 'undefined') {
    const { hostname, protocol, port } = window.location;
    
    // Local development fallback
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return process.env.NEXT_PUBLIC_API_URL || `http://${hostname}:3001/api/v1`;
    }

    // Multi-tenant production pattern: [client-domain] -> api.[client-domain]
    // Example: granjalamanzana.com -> api.granjalamanzana.com
    return `${protocol}//api.${hostname}/api/v1`;
  }

  // 2. Server context (SSR)
  // Use INTERNAL_API_URL if defined (e.g. http://manzana-api:8080/api/v1)
  // Otherwise fallback to external URL or localhost
  return process.env.INTERNAL_API_URL || 
         process.env.NEXT_PUBLIC_API_URL || 
         'http://localhost:3001/api/v1';
};

const client = axios.create({
  baseURL: getDynamicApiUrl(),
});

export default client;
