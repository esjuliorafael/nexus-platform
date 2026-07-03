import { useEffect } from 'react';

const ensureIconLink = (rel: string) => {
  let link = document.querySelector<HTMLLinkElement>(`link[rel='${rel}']`);

  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }

  return link;
};

export function useFavicon(url: string | null) {
  useEffect(() => {
    if (!url) return;

    ensureIconLink('icon').href = url;
    ensureIconLink('shortcut icon').href = url;
    ensureIconLink('apple-touch-icon').href = url;
  }, [url]);
}
