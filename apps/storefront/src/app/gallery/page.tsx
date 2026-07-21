"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { mediaApi } from "../../api/settings";
import { Media } from "../../types";
import { GalleryFilterPanel } from "../../components/media/GalleryFilterPanel";
import { MediaCard } from "../../components/media/MediaCard";
import { StorefrontCatalogToolbar } from "../../components/ui/CatalogToolbar";
import { EmptyState } from "../../components/ui/EmptyState";
import { MediaViewer } from "../../components/ui/MediaViewer";
import type { SegmentedControlOption } from "../../components/ui/SegmentedControl";
import { Spinner } from "../../components/ui/Spinner";

type PositionedMedia = {
  item: Media;
  index: number;
};

export default function GalleryPage() {
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
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

  const categoryOptions = useMemo<SegmentedControlOption[]>(() => {
    const categories = new Map<string, string>();

    items.forEach((item) => {
      if (!item.categoryId) return;
      categories.set(String(item.categoryId), item.category?.name || `Categoría ${item.categoryId}`);
    });

    return [
      { value: "ALL", label: "Todo" },
      ...Array.from(categories.entries())
        .sort(([, labelA], [, labelB]) => labelA.localeCompare(labelB))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return items.filter((item) => {
      const matchesType = typeFilter === "ALL" || item.mediaType === typeFilter;
      const matchesCategory = categoryFilter === "ALL" || String(item.categoryId) === categoryFilter;
      const searchableText = [
        item.title,
        item.description,
        item.location,
        item.category?.name,
        ...item.subcategories.map((subcategory) => subcategory.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);

      return matchesType && matchesCategory && matchesSearch;
    });
  }, [categoryFilter, items, searchTerm, typeFilter]);

  const selectedMedia = selectedIndex === null ? null : filteredItems[selectedIndex] ?? null;
  const canNavigate = filteredItems.length > 1;
  const hasActiveFilters = typeFilter !== "ALL" || categoryFilter !== "ALL";

  const resetFilters = () => {
    setTypeFilter("ALL");
    setCategoryFilter("ALL");
  };

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
      <MediaCard
        key={item.id}
        media={item}
        isTall={isTall}
        onOpen={() => setSelectedIndex(index)}
      />
    );
  };

  return (
    <main
      className="mx-auto flex max-w-[var(--sf-max-width-content)] flex-col px-[var(--sf-inset-page)] pt-[var(--sf-store-content-padding-top)] md:pt-[var(--sf-space-xl)]"
      style={{
        gap: "var(--sf-space-lg)",
        paddingBottom: "var(--sf-mobile-chrome-content-padding-bottom)",
      }}
    >
      <StorefrontCatalogToolbar
        searchTerm={searchTerm}
        searchLabel="Buscar medios"
        searchPlaceholder="Buscar medio..."
        filterLabel="Abrir filtros de la galería"
        hasActiveFilters={hasActiveFilters}
        onSearchChange={setSearchTerm}
        onOpenFilters={() => setIsFilterSheetOpen(true)}
      />

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

      <GalleryFilterPanel
        isOpen={isFilterSheetOpen}
        type={typeFilter}
        category={categoryFilter}
        categoryOptions={categoryOptions}
        onTypeChange={setTypeFilter}
        onCategoryChange={setCategoryFilter}
        onReset={resetFilters}
        onApply={() => setIsFilterSheetOpen(false)}
        onClose={() => setIsFilterSheetOpen(false)}
      />
    </main>
  );
}
