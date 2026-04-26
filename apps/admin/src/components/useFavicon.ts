import { useEffect } from 'react';

export const useFavicon = (url: string | null) => {
  useEffect(() => {
    if (!url) return;

    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    
    link.href = url;
  }, [url]);
};