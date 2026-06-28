"use client";

import { type CSSProperties, type ReactNode, type TouchEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type Media, Product } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { StorefrontCard } from '../../../components/ui/Card';
import { MediaViewer } from '../../../components/ui/MediaViewer';
import { useCartUiStore } from '../../../store/cart-ui.store';
import { useCartStore } from '../../../store/cart.store';
import { CalendarClock, ChevronLeft, Clock3, Hash, MessageCircle, PlayCircle, ShoppingCart, Tag, Target, Truck, type LucideIcon } from 'lucide-react';
import { formatBirdAge, formatBirdPurpose, formatPrice, formatSaleStatus, getAssetUrl } from '../../../utils/formatters';

interface ProductDetailsClientProps {
  product: Product;
}

const knowledgeItems = [
  {
    icon: Clock3,
    title: 'Tiempo de apartado',
    description:
      'El apartado es temporal. Si el pago no se confirma dentro del plazo indicado, el producto puede liberarse nuevamente.',
  },
  {
    icon: Truck,
    title: 'Envíos',
    description:
      'Coordinamos el envío contigo según tu ubicación. En aves, acordamos la central de autobuses o aeropuerto más conveniente antes de confirmar.',
  },
  {
    icon: MessageCircle,
    title: 'Atención y comunicación',
    description:
      'Te acompañamos por WhatsApp antes, durante y después de la compra para resolver dudas y dar seguimiento a tu pedido.',
  },
];

export function ProductDetailsClient({ product }: ProductDetailsClientProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showTopTitle, setShowTopTitle] = useState(false);
  const productTitleRef = useRef<HTMLHeadingElement | null>(null);
  const mediaTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const mediaSwipeHandledRef = useRef(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const addItem = useCartStore((state) => state.addItem);
  const totalItems = useCartStore((state) =>
    state.items.reduce((acc, item) => acc + item.quantity, 0),
  );
  const openCart = useCartUiStore((state) => state.openCart);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const titleElement = productTitleRef.current;

    if (!titleElement) return;

    const browserWindow = window;

    if (!browserWindow.IntersectionObserver) {
      const handleScroll = () => setShowTopTitle(browserWindow.scrollY > 160);

      handleScroll();
      browserWindow.addEventListener('scroll', handleScroll, { passive: true });
      return () => browserWindow.removeEventListener('scroll', handleScroll);
    }

    const observer = new browserWindow.IntersectionObserver(
      ([entry]) => {
        setShowTopTitle(!entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0,
        rootMargin: '-88px 0px 0px 0px',
      },
    );

    observer.observe(titleElement);
    return () => observer.disconnect();
  }, []);

  const isAvailable = product.saleStatus === 'AVAILABLE';
  const productMediaItems = useMemo<Media[]>(() => {
    const coverItem: Media[] = product.coverMediaUrl
      ? [
          {
            id: product.id * -1,
            title: product.name,
            description: product.description,
            type: product.coverMediaType || 'PHOTO',
            filePath: product.coverMediaUrl,
            assetId: product.coverAssetId || `product-cover-${product.id}`,
            mediaUrl: product.coverMediaUrl,
            posterUrl: product.coverPosterUrl,
            mediaType: product.coverMediaType || 'PHOTO',
            categoryId: null,
            subcategoryId: null,
            subcategoryIds: [],
            subcategories: [],
            location: null,
            mediaDate: null,
          },
        ]
      : [];

    const galleryItems = (product.gallery ?? []).map<Media>((item, index) => ({
      id: item.id,
      title: `${product.name} ${index + 1}`,
      description: product.description,
      type: item.mediaType,
      filePath: item.mediaUrl,
      assetId: item.assetId,
      mediaUrl: item.mediaUrl,
      posterUrl: item.posterUrl,
      mediaType: item.mediaType,
      categoryId: null,
      subcategoryId: null,
      subcategoryIds: [],
      subcategories: [],
      location: null,
      mediaDate: null,
    }));

    return [...coverItem, ...galleryItems];
  }, [product]);
  const activeMedia = productMediaItems[activeMediaIndex] ?? null;
  const selectedViewerMedia = viewerIndex === null ? null : productMediaItems[viewerIndex] ?? null;
  const galleryStartIndex = product.coverMediaUrl ? 1 : 0;
  const additionalGalleryItems = productMediaItems.slice(galleryStartIndex);
  const canNavigateProductMedia = productMediaItems.length > 1;
  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
      thumbnail: getAssetUrl(product.coverPosterUrl || product.coverMediaUrl || product.thumbnail),
      type: product.type.toLowerCase() as 'bird' | 'item',
    });
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push('/store');
  };

  const showPreviousProductMedia = () => {
    if (!canNavigateProductMedia) return;

    setActiveMediaIndex((current) =>
      (current - 1 + productMediaItems.length) % productMediaItems.length,
    );
  };

  const showNextProductMedia = () => {
    if (!canNavigateProductMedia) return;

    setActiveMediaIndex((current) => (current + 1) % productMediaItems.length);
  };

  const handleMediaTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (!canNavigateProductMedia || event.touches.length !== 1) return;

    const touch = event.touches[0];
    mediaTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleMediaTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = mediaTouchStartRef.current;
    mediaTouchStartRef.current = null;
    if (!start || event.changedTouches.length !== 1) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const threshold = Math.max(44, window.innerWidth * 0.12);

    if (
      Math.abs(deltaX) < threshold ||
      Math.abs(deltaX) <= Math.abs(deltaY) * 1.25
    ) {
      return;
    }

    mediaSwipeHandledRef.current = true;
    window.setTimeout(() => {
      mediaSwipeHandledRef.current = false;
    }, 350);

    if (deltaX < 0) showNextProductMedia();
    else showPreviousProductMedia();
  };

  const openProductMediaViewer = (index: number) => {
    if (!productMediaItems[index]) return;
    setViewerIndex(index);
  };

  return (
    <div
      className="mx-auto max-w-7xl px-[var(--sf-inset-page-mobile)] pb-[var(--sf-mobile-chrome-content-padding-bottom)] pt-[var(--sf-mobile-chrome-content-padding-top)] md:pb-[var(--sf-space-xl)] md:pt-[var(--sf-space-xl)]"
    >
      <ProductTopBar
        productName={product.name}
        showTitle={showTopTitle}
        mounted={mounted}
        totalItems={totalItems}
        onBack={handleBack}
        onOpenCart={openCart}
      />

      <div className="flex flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
        <Link
          href="/store"
          className="hidden w-fit items-center text-stone-500 transition-colors hover:text-brand-500 sf-text-label md:inline-flex"
          style={{ gap: 'var(--sf-space-sm)' }}
        >
          <ChevronLeft size={18} />
          Volver al catálogo
        </Link>

        <div className="grid grid-cols-1 gap-[var(--sf-space-lg)] lg:grid-cols-2 lg:gap-[var(--sf-space-xl)]">
          <div className="flex flex-col" style={{ gap: 'var(--sf-space-md)' }}>
            <StorefrontCard
              density="none"
              role="button"
              tabIndex={activeMedia ? 0 : -1}
              aria-label="Abrir medio del producto"
              onClick={() => {
                if (mediaSwipeHandledRef.current) return;
                openProductMediaViewer(activeMediaIndex);
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                openProductMediaViewer(activeMediaIndex);
              }}
              onTouchStart={handleMediaTouchStart}
              onTouchEnd={handleMediaTouchEnd}
              onTouchCancel={() => {
                mediaTouchStartRef.current = null;
              }}
              className="aspect-square cursor-pointer overflow-hidden shadow-xl shadow-stone-200/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20"
            >
              {activeMedia ? (
                activeMedia.mediaType === 'VIDEO' ? (
                  <video 
                    src={getAssetUrl(activeMedia.mediaUrl)}
                    poster={activeMedia.posterUrl ? getAssetUrl(activeMedia.posterUrl) : undefined}
                    className="h-full w-full object-cover" 
                    autoPlay 
                    muted 
                    loop 
                    playsInline 
                  />
                ) : (
                  <img src={getAssetUrl(activeMedia.mediaUrl)} className="h-full w-full object-cover animate-in fade-in duration-500" alt={product.name} />
                )
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-stone-100/50 text-stone-300" style={{ gap: 'var(--sf-space-sm)' }}>
                  <Tag size={40} strokeWidth={1.2} />
                  <span className="sf-text-label">Sin imagen</span>
                </div>
              )}
            </StorefrontCard>

          </div>

          <div className="flex flex-col" style={{ gap: 'var(--sf-space-lg)' }}>
            <div className="flex flex-col" style={{ gap: 'var(--sf-space-md)' }}>
              <div className="flex items-center justify-between md:justify-start" style={{ gap: 'var(--sf-space-sm)' }}>
                <Badge variant={product.type === 'BIRD' ? 'default' : 'outline'}>
                  {product.type === 'BIRD' ? 'Ave' : 'Artículo'}
                </Badge>
                <Badge variant={isAvailable ? 'success' : 'warning'}>
                  {formatSaleStatus(product.saleStatus)}
                </Badge>
              </div>

              <div className="flex flex-col" style={{ gap: 'var(--sf-space-sm)' }}>
                <h1 ref={productTitleRef} className="sf-text-hero text-stone-850">
                  {product.name}
                </h1>
                <p className="hidden sf-text-display text-brand-500 md:block">
                  ${formatPrice(product.price)}
                </p>
              </div>
            </div>

            <div className="flex flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
              <h2 className="sf-text-h2 text-stone-950">Descripción</h2>
              <p className="sf-text-body max-w-xl text-stone-500">
                {product.description || 'Sin descripción disponible.'}
              </p>
            </div>

            {additionalGalleryItems.length > 0 && (
              <section className="flex flex-col" style={{ gap: 'var(--sf-space-sm)' }} aria-label="Galería adicional del producto">
                <h2 className="sf-text-h2 text-stone-950">Galería</h2>
                <div
                  className="-mx-[var(--sf-inset-page-mobile)] flex snap-x snap-mandatory overflow-x-auto px-[var(--sf-inset-page-mobile)] pb-[var(--sf-space-xs)] scrollbar-hide"
                  style={{
                    gap: 'var(--sf-space-base)',
                    scrollPaddingInline: 'var(--sf-inset-page-mobile)',
                  }}
                >
                  {additionalGalleryItems.map((item, index) => {
                    const productMediaIndex = galleryStartIndex + index;

                    return (
                    <button
                      key={item.id}
                      onClick={() => openProductMediaViewer(productMediaIndex)}
                      className={`relative aspect-[7/5] w-[10rem] shrink-0 snap-start overflow-hidden border transition-all duration-300 sm:w-[12rem] ${
                        activeMediaIndex === productMediaIndex
                          ? 'border-brand-500 shadow-lg shadow-brand-500/10'
                          : 'border-stone-300 hover:border-stone-400'
                      }`}
                      style={{
                        borderRadius: 'var(--sf-radius-media-tile)',
                        transitionTimingFunction: 'var(--sf-ease)',
                      }}
                      aria-label="Cambiar imagen del producto"
                    >
                      {item.mediaType === 'VIDEO' ? (
                        <div className="relative h-full w-full">
                          {item.posterUrl ? (
                            <img src={getAssetUrl(item.posterUrl)} className="h-full w-full object-cover" alt="Miniatura del video" />
                          ) : (
                            <video src={getAssetUrl(item.mediaUrl)} className="h-full w-full object-cover" preload="metadata" playsInline />
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <PlayCircle className="text-white drop-shadow-md" size={24} fill="currentColor" />
                          </div>
                        </div>
                      ) : (
                        <img src={getAssetUrl(item.mediaUrl)} className="h-full w-full object-cover" alt="Imagen del producto" />
                      )}
                    </button>
                    );
                  })}
                </div>
              </section>
            )}

            {product.type === 'BIRD' && (
              <StorefrontCard
                density="compact"
                className="border-brand-500/20 bg-brand-500 text-white shadow-xl shadow-brand-500/15"
              >
                <div className="flex flex-col" style={{ gap: 'var(--sf-space-md)' }}>
                  <h2 className="sf-text-h2">Información</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1" style={{ gap: 'var(--sf-space-md)' }}>
                    <ProductInfoItem icon={Hash} label="No. anillo" value={product.ringNumber || 'N/A'} />
                    <ProductInfoItem icon={CalendarClock} label="Edad / etapa" value={formatBirdAge(product.age)} />
                    <ProductInfoItem icon={Target} label="Propósito" value={formatBirdPurpose(product.purpose)} />
                  </div>
                </div>
              </StorefrontCard>
            )}

            <section className="flex flex-col" style={{ gap: 'var(--sf-space-md)' }} aria-label="Que debes saber">
              <h2 className="sf-text-h2 text-stone-950">Qué debes saber</h2>
              <div className="flex flex-col" style={{ gap: 'var(--sf-space-md)' }}>
                {knowledgeItems.map((item) => (
                  <ProductKnowledgeItem
                    key={item.title}
                    icon={item.icon}
                    title={item.title}
                    description={item.description}
                  />
                ))}
              </div>
            </section>

            <div className="hidden md:block">
              {isAvailable ? (
                <Button
                  size="lg"
                  context="section"
                  className="w-full"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="mr-2" size={22} />
                  Agregar al Carrito
                </Button>
              ) : (
                <Button size="lg" context="section" className="w-full" disabled>
                  No disponible
                </Button>
              )}
            </div>

          </div>
        </div>
      </div>

      <ProductPurchaseBar
        price={product.price}
        isAvailable={isAvailable}
        onAddToCart={handleAddToCart}
      />

      <MediaViewer
        isOpen={viewerIndex !== null}
        media={selectedViewerMedia}
        onClose={() => setViewerIndex(null)}
        canNavigate={canNavigateProductMedia}
        onPrevious={() => {
          if (!canNavigateProductMedia) return;
          setViewerIndex((current) =>
            current === null
              ? 0
              : (current - 1 + productMediaItems.length) % productMediaItems.length,
          );
        }}
        onNext={() => {
          if (!canNavigateProductMedia) return;
          setViewerIndex((current) =>
            current === null ? 0 : (current + 1) % productMediaItems.length,
          );
        }}
      />
    </div>
  );
}

function ProductTopBar({
  productName,
  showTitle,
  mounted,
  totalItems,
  onBack,
  onOpenCart,
}: {
  productName: string;
  showTitle: boolean;
  mounted: boolean;
  totalItems: number;
  onBack: () => void;
  onOpenCart: () => void;
}) {
  return (
    <div className="fixed z-40 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center md:hidden" style={{ top: 'var(--sf-inset-mobile-chrome-block)', left: 'var(--sf-inset-mobile-chrome)', right: 'var(--sf-inset-mobile-chrome)', gap: 'var(--sf-space-md)' }}>
      <ProductTopRail>
        <button
          type="button"
          onClick={onBack}
          className="group flex shrink-0 items-center justify-center border border-transparent text-stone-500 transition-all duration-300 hover:bg-stone-100 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25"
          style={{
            width: 'var(--sf-size-mobile-nav-item)',
            height: 'var(--sf-size-mobile-nav-item)',
            borderRadius: 'var(--sf-radius-mobile-nav-item)',
            transitionTimingFunction: 'var(--sf-ease)',
          }}
          aria-label="Volver al catálogo"
        >
          <ChevronLeft
            style={{ width: 'var(--sf-size-mobile-nav-icon)', height: 'var(--sf-size-mobile-nav-icon)' }}
            strokeWidth={2.35}
          />
        </button>
      </ProductTopRail>

      <div
        className={`pointer-events-none flex min-w-0 items-center justify-center overflow-hidden border border-stone-200/90 bg-white shadow-[0_18px_48px_rgba(87,68,55,0.14)] transition-all duration-200 ${
          showTitle ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
        }`}
        style={{
          height: 'var(--sf-h-mobile-nav)',
          borderRadius: 'var(--sf-radius-outer)',
          paddingInline: 'var(--sf-space-md)',
          transitionTimingFunction: 'var(--sf-ease)',
        }}
        aria-hidden={!showTitle}
      >
        <p className="min-w-0 truncate text-center sf-text-secondary font-medium text-stone-600">
          {productName}
        </p>
      </div>

      <ProductTopRail>
        <button
          type="button"
          onClick={onOpenCart}
          className="group relative flex shrink-0 items-center justify-center border border-transparent text-stone-500 transition-all duration-300 hover:bg-stone-100 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25"
          style={{
            width: 'var(--sf-size-mobile-nav-item)',
            height: 'var(--sf-size-mobile-nav-item)',
            borderRadius: 'var(--sf-radius-mobile-nav-item)',
            transitionTimingFunction: 'var(--sf-ease)',
          }}
          aria-label="Carrito"
        >
          <ShoppingCart
            style={{ width: 'var(--sf-size-mobile-nav-icon)', height: 'var(--sf-size-mobile-nav-icon)' }}
            strokeWidth={2.35}
          />
          {mounted && totalItems > 0 && (
            <span className="absolute -right-[0.125rem] -top-[0.125rem] flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full border-2 border-white bg-brand-500 px-1 text-[8px] font-black leading-none text-white shadow-md">
              {totalItems}
            </span>
          )}
        </button>
      </ProductTopRail>
    </div>
  );
}

function ProductTopRail({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center border border-stone-200/90 bg-white shadow-[0_18px_48px_rgba(87,68,55,0.14)]"
      style={{
        height: 'var(--sf-h-mobile-nav)',
        borderRadius: 'var(--sf-radius-outer)',
        padding: 'var(--sf-space-sm)',
      }}
    >
      {children}
    </div>
  );
}

function ProductPurchaseBar({
  price,
  isAvailable,
  onAddToCart,
}: {
  price: Product['price'];
  isAvailable: boolean;
  onAddToCart: () => void;
}) {
  return (
    <div
      className="fixed z-40 md:hidden"
      style={{ bottom: 'var(--sf-inset-mobile-chrome-block)', left: 'var(--sf-inset-mobile-chrome)', right: 'var(--sf-inset-mobile-chrome)' }}
    >
      <div
        className="flex items-center justify-between border border-stone-200/90 bg-white shadow-[0_18px_48px_rgba(87,68,55,0.14)]"
        style={{
          height: 'var(--sf-h-mobile-nav)',
          borderRadius: 'var(--sf-radius-outer)',
          gap: 'var(--sf-space-sm)',
          padding: 'var(--sf-space-sm)',
        }}
      >
        <div className="min-w-0 shrink-0 pl-[var(--sf-space-sm)]">
          <span className="block sf-text-caption text-stone-400">Total</span>
          <p className="truncate sf-text-h2 font-black text-brand-500">
            ${formatPrice(price)}
          </p>
        </div>

        <Button
          type="button"
          context="autonomous"
          variant={isAvailable ? 'primary' : 'outline'}
          disabled={!isAvailable}
          icon={ShoppingCart}
          onClick={onAddToCart}
          className="shrink-0"
          style={{
            height: 'var(--sf-size-mobile-nav-item)',
            borderRadius: 'var(--sf-radius-mobile-nav-item)',
            '--sf-button-icon-size': 'var(--sf-size-mobile-nav-icon)',
          } as CSSProperties}
        >
          {isAvailable ? 'Agregar al Carrito' : 'No disponible'}
        </Button>
      </div>
    </div>
  );
}

function ProductInfoItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | null }) {
  return (
    <div className="flex items-center" style={{ gap: 'var(--sf-space-sm)' }}>
      <div
        className="flex shrink-0 items-center justify-center border border-white/85 text-white"
        style={{
          width: 'var(--sf-h-button-card)',
          height: 'var(--sf-h-button-card)',
          borderRadius: 'var(--sf-radius-card-inner)',
        }}
      >
        <Icon size={20} strokeWidth={2.1} />
      </div>
      <div className="min-w-0">
        <span className="sf-text-label text-white/90">{label}</span>
        <p className="sf-text-h2 leading-tight text-white">{value || 'N/A'}</p>
      </div>
    </div>
  );
}

function ProductKnowledgeItem({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)]" style={{ gap: 'var(--sf-space-sm)' }}>
      <Icon className="mt-[0.125rem] text-stone-950" size={20} strokeWidth={2} />
      <div className="flex min-w-0 flex-col" style={{ gap: 'var(--sf-space-xs)' }}>
        <h3 className="sf-text-secondary-strong text-stone-950">{title}</h3>
        <p className="sf-text-secondary max-w-xl text-stone-600">{description}</p>
      </div>
    </div>
  );
}
