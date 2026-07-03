"use client";

import { CSSProperties, ReactNode, useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { mediaApi } from "../../api/settings";
import { Media } from "../../types";
import { MediaCard } from "../../components/media/MediaCard";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { MediaViewer } from "../../components/ui/MediaViewer";
import { StorefrontPillFilter } from "../../components/ui/PillFilter";
import { SegmentedControl, type SegmentedControlOption } from "../../components/ui/SegmentedControl";
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
  const hasActiveFilters = typeFilter !== "ALL" || categoryFilter !== "ALL" || searchTerm.trim().length > 0;

  const clearFilters = () => {
    setSearchTerm("");
    setTypeFilter("ALL");
    setCategoryFilter("ALL");
    setIsFilterSheetOpen(false);
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
      className="mx-auto flex max-w-7xl flex-col px-[var(--sf-inset-page-mobile)] pt-[var(--sf-store-content-padding-top)] md:px-[var(--sf-padding-outer)] md:pt-[var(--sf-space-xl)]"
      style={{
        gap: "var(--sf-space-lg)",
        paddingBottom: "var(--sf-mobile-chrome-content-padding-bottom)",
      }}
    >
      <GalleryMobileTopBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        hasActiveFilters={hasActiveFilters}
        onOpenFilters={() => setIsFilterSheetOpen(true)}
      />

      <GalleryDesktopToolbar
        searchTerm={searchTerm}
        typeFilter={typeFilter}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={setSearchTerm}
        onTypeChange={setTypeFilter}
        onClearFilters={clearFilters}
      />

      <StorefrontPillFilter
        title="Categorías"
        value={categoryFilter}
        options={categoryOptions}
        onChange={setCategoryFilter}
        fullBleedMobile
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

      <BottomSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title="Filtrar galería"
      >
        <div className="flex flex-col font-medium" style={{ gap: "var(--sf-space-lg)" }}>
          <MobileFilterGroup
            label="Tipo de medio"
            value={typeFilter}
            options={filterOptions}
            columns="grid-cols-3"
            onChange={setTypeFilter}
          />

          {hasActiveFilters && (
            <Button variant="outline" context="section" icon={X} onClick={clearFilters}>
              Limpiar filtros
            </Button>
          )}

          <Button variant="secondary" context="section" onClick={() => setIsFilterSheetOpen(false)}>
            Aplicar filtros
          </Button>
        </div>
      </BottomSheet>
    </main>
  );
}

function GalleryMobileTopBar({
  searchTerm,
  onSearchChange,
  hasActiveFilters,
  onOpenFilters,
}: {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  hasActiveFilters: boolean;
  onOpenFilters: () => void;
}) {
  const mobileActionStyle = {
    width: "var(--sf-size-mobile-chrome-action)",
    height: "var(--sf-size-mobile-chrome-action)",
    borderRadius: "var(--sf-radius-mobile-chrome-action)",
    "--sf-button-icon-size": "var(--sf-size-mobile-chrome-icon)",
  } as CSSProperties;

  return (
    <div
      className="fixed z-40 grid grid-cols-[minmax(0,1fr)_auto] items-center md:hidden"
      style={{
        top: "var(--sf-inset-mobile-chrome-block)",
        left: "var(--sf-inset-mobile-chrome)",
        right: "var(--sf-inset-mobile-chrome)",
        gap: "var(--sf-space-md)",
      }}
    >
      <GalleryMobileSearchRail value={searchTerm} onChange={onSearchChange} />

      <GalleryMobileActionRail>
        <Button
          size="icon"
          variant={hasActiveFilters ? "brand" : "ghost"}
          icon={SlidersHorizontal}
          isIconOnly
          onClick={onOpenFilters}
          aria-label="Abrir filtros"
          style={mobileActionStyle}
        />
        {hasActiveFilters && (
          <span
            className="absolute rounded-full bg-brand-500 ring-2 ring-white"
            style={{
              top: "var(--sf-space-sm)",
              right: "var(--sf-space-sm)",
              width: "var(--sf-size-inner-icon-badge)",
              height: "var(--sf-size-inner-icon-badge)",
            }}
          />
        )}
      </GalleryMobileActionRail>
    </div>
  );
}

function GalleryMobileSearchRail({
  value,
  onChange,
  placeholder = "Buscar...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label
      className="flex min-w-0 items-center border border-stone-200/90 bg-white shadow-[0_18px_48px_rgba(87,68,55,0.14)]"
      style={{
        height: "var(--sf-h-mobile-nav)",
        borderRadius: "var(--sf-radius-outer)",
        padding: "var(--sf-space-sm)",
        gap: "var(--sf-space-sm)",
      }}
    >
      <span
        className="flex shrink-0 items-center justify-center bg-stone-50 text-stone-500"
        style={{
          width: "var(--sf-size-mobile-nav-item)",
          height: "var(--sf-size-mobile-nav-item)",
          borderRadius: "var(--sf-radius-mobile-nav-item)",
        }}
      >
        <Search
          aria-hidden="true"
          style={{
            width: "var(--sf-size-mobile-nav-icon)",
            height: "var(--sf-size-mobile-nav-icon)",
          }}
          strokeWidth={2.5}
        />
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label="Buscar medios"
        className="sf-text-body min-w-0 flex-1 bg-transparent text-stone-850 outline-none placeholder:text-stone-400"
      />
    </label>
  );
}

function GalleryMobileActionRail({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative flex shrink-0 items-center justify-center border border-stone-200/90 bg-white shadow-[0_18px_48px_rgba(87,68,55,0.14)]"
      style={{
        height: "var(--sf-h-mobile-nav)",
        borderRadius: "var(--sf-radius-outer)",
        padding: "var(--sf-space-sm)",
      }}
    >
      {children}
    </div>
  );
}

function GalleryDesktopToolbar({
  searchTerm,
  typeFilter,
  hasActiveFilters,
  onSearchChange,
  onTypeChange,
  onClearFilters,
}: {
  searchTerm: string;
  typeFilter: string;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onClearFilters: () => void;
}) {
  return (
    <div
      className="hidden flex-wrap items-center border border-stone-200 bg-white shadow-[0_1rem_2rem_rgba(31,24,17,0.05)] md:flex xl:flex-nowrap"
      style={{
        borderRadius: "var(--sf-radius-outer)",
        padding: "var(--sf-space-sm)",
        gap: "var(--sf-space-md)",
      }}
    >
      <GalleryDesktopSearchField value={searchTerm} onChange={onSearchChange} />
      <SegmentedControl value={typeFilter} options={filterOptions} onChange={onTypeChange} />

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          icon={X}
          onClick={onClearFilters}
          className="text-stone-400 hover:bg-transparent hover:text-brand-500"
        >
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}

function GalleryDesktopSearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label
      className="flex min-w-[18rem] flex-1 items-center bg-stone-50 text-stone-500"
      style={{
        height: "var(--sf-h-input)",
        borderRadius: "var(--sf-radius-inner)",
        paddingInline: "var(--sf-space-md)",
        gap: "var(--sf-space-sm)",
      }}
    >
      <Search
        aria-hidden="true"
        style={{
          width: "var(--sf-size-inner-icon-section)",
          height: "var(--sf-size-inner-icon-section)",
        }}
        strokeWidth={2.35}
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar medio..."
        aria-label="Buscar medios"
        className="sf-text-body min-w-0 flex-1 bg-transparent text-stone-850 outline-none placeholder:text-stone-400"
      />
    </label>
  );
}

function MobileFilterGroup({
  label,
  value,
  options,
  columns,
  onChange,
}: {
  label: string;
  value: string;
  options: SegmentedControlOption[];
  columns: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col" style={{ gap: "var(--sf-space-sm)" }}>
      <span className="sf-text-label text-stone-400">{label}</span>
      <SegmentedControl value={value} options={options} columns={columns} onChange={onChange} />
    </div>
  );
}
