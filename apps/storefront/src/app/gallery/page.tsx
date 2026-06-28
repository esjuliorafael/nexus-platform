"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, Image as ImageIcon, Search, Video } from "lucide-react";
import { mediaApi } from "../../api/settings";
import { Media } from "../../types";
import { getAssetUrl } from "../../utils/formatters";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { MediaViewer } from "../../components/ui/MediaViewer";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { SmartImage } from "../../components/ui/SmartImage";
import { Spinner } from "../../components/ui/Spinner";

const filterOptions = [
  { value: "ALL", label: "Todo" },
  { value: "PHOTO", label: "Fotos" },
  { value: "VIDEO", label: "Videos" },
];

type PositionedMedia = {
  item: Media;
  index: number;
};

function GalleryTile({
  item,
  isTall,
  onOpen,
}: {
  item: Media;
  isTall: boolean;
  onOpen: () => void;
}) {
  const isVideo = item.mediaType === "VIDEO";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative w-full overflow-hidden border border-stone-200/60 bg-stone-950 text-left shadow-sm transition-all duration-300 hover:border-brand-500/25 hover:shadow-xl hover:shadow-brand-500/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20 ${
        isTall ? "aspect-[3/4]" : "aspect-square"
      }`}
      style={{
        borderRadius: "var(--sf-radius-card-inner)",
        transitionTimingFunction: "var(--sf-ease)",
      }}
    >
      {isVideo && !item.posterUrl ? (
        <video
          src={getAssetUrl(item.mediaUrl || item.filePath)}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <SmartImage
          src={getAssetUrl(item.posterUrl || item.mediaUrl || item.filePath)}
          alt={item.title}
          wrapperClassName="h-full w-full"
          className="transition-transform duration-700 group-hover:scale-110"
        />
      )}

      <div
        className="absolute z-10 transition-all duration-500 lg:opacity-0 lg:scale-95 lg:group-hover:opacity-100 lg:group-hover:scale-100 lg:group-focus-visible:opacity-100 lg:group-focus-visible:scale-100"
        style={{
          top: "var(--sf-padding-inner)",
          left: "var(--sf-padding-inner)",
        }}
      >
        <Badge
          variant="overlay"
          context="card"
          icon={isVideo ? Video : Camera}
          className="shadow-lg"
        >
          {isVideo ? "Video" : "Foto"}
        </Badge>
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/28 to-transparent opacity-100 transition-opacity duration-500 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-visible:opacity-100" />

      <div
        className="absolute inset-x-0 bottom-0 z-10 flex translate-y-0 flex-col opacity-100 transition-all duration-500 lg:translate-y-4 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100 lg:group-focus-visible:translate-y-0 lg:group-focus-visible:opacity-100"
        style={{
          gap: "var(--sf-space-xs)",
          padding: "var(--sf-padding-inner)",
        }}
      >
        <h2 className="sf-text-h2 line-clamp-2 text-white">{item.title}</h2>
        {item.description && (
          <p className="sf-text-secondary line-clamp-2 text-stone-300">
            {item.description}
          </p>
        )}
      </div>
    </button>
  );
}

export default function GalleryPage() {
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadMedia = async () => {
      try {
        const data = await mediaApi.getAll();
        if (isMounted) setItems(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching gallery media:", error);
        if (isMounted) setItems([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadMedia();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    if (filter === "ALL") return items;
    return items.filter((item) => item.mediaType === filter);
  }, [filter, items]);

  const selectedMedia = selectedIndex === null ? null : filteredItems[selectedIndex] ?? null;
  const canNavigate = filteredItems.length > 1;

  const desktopColumns = useMemo(() => {
    const columns: PositionedMedia[][] = [[], [], []];
    filteredItems.forEach((item, index) => {
      columns[index % 3].push({ item, index });
    });
    return columns;
  }, [filteredItems]);

  const mobileColumns = useMemo(() => {
    const columns: PositionedMedia[][] = [[], []];
    filteredItems.forEach((item, index) => {
      columns[index % 2].push({ item, index });
    });
    return columns;
  }, [filteredItems]);

  const renderTile = ({ item, index }: PositionedMedia, isMobile: boolean) => {
    const isTall = isMobile
      ? index % 4 === 1 || index % 4 === 2
      : index % 2 === 1;

    return (
      <GalleryTile
        key={item.id}
        item={item}
        isTall={isTall}
        onOpen={() => setSelectedIndex(index)}
      />
    );
  };

  return (
    <main
      className="mx-auto flex max-w-7xl flex-col px-[var(--sf-inset-page-mobile)] md:px-[var(--sf-padding-outer)]"
      style={{
        gap: "var(--sf-space-lg)",
        paddingTop: "var(--sf-space-xl)",
        paddingBottom: "var(--sf-mobile-chrome-content-padding-bottom)",
      }}
    >
      <header
        className="flex flex-col justify-between border-b border-stone-200/60 pb-[var(--sf-space-md)] md:flex-row md:items-end"
        style={{ gap: "var(--sf-space-md)" }}
      >
        <div className="flex max-w-2xl flex-col" style={{ gap: "var(--sf-space-xs)" }}>
          <Badge variant="brand" context="section" icon={ImageIcon} className="w-fit">
            Archivo Visual
          </Badge>
          <h1 className="sf-text-display uppercase italic text-stone-950">
            Galeria del Rancho
          </h1>
          <p className="sf-text-body text-stone-500">
            Fotografias y videos del entorno, linajes y momentos recientes.
          </p>
        </div>

        <SegmentedControl value={filter} options={filterOptions} onChange={setFilter} />
      </header>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Spinner className="h-12 w-12" />
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Sin medios"
          description="No hay medios publicados para este filtro."
          compact
        />
      ) : (
        <section>
          <div
            className="hidden grid-cols-3 lg:grid"
            style={{ gap: "var(--sf-space-md)" }}
          >
            {desktopColumns.map((column, columnIndex) => (
              <div
                key={`desktop-gallery-column-${columnIndex}`}
                className="flex flex-col"
                style={{ gap: "var(--sf-space-md)" }}
              >
                {column.map((positioned) => renderTile(positioned, false))}
              </div>
            ))}
          </div>

          <div
            className="grid grid-cols-2 lg:hidden"
            style={{ gap: "var(--sf-space-sm)" }}
          >
            {mobileColumns.map((column, columnIndex) => (
              <div
                key={`mobile-gallery-column-${columnIndex}`}
                className="flex flex-col"
                style={{ gap: "var(--sf-space-sm)" }}
              >
                {column.map((positioned) => renderTile(positioned, true))}
              </div>
            ))}
          </div>
        </section>
      )}

      <MediaViewer
        isOpen={selectedIndex !== null}
        media={selectedMedia}
        onClose={() => setSelectedIndex(null)}
        canNavigate={canNavigate}
        onPrevious={() => {
          if (!canNavigate) return;
          setSelectedIndex((current) =>
            current === null ? 0 : (current - 1 + filteredItems.length) % filteredItems.length,
          );
        }}
        onNext={() => {
          if (!canNavigate) return;
          setSelectedIndex((current) =>
            current === null ? 0 : (current + 1) % filteredItems.length,
          );
        }}
      />
    </main>
  );
}
