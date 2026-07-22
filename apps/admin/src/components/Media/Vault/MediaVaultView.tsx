import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Archive, FileImage, Film, Loader2, UploadCloud } from "lucide-react";
import { apiMediaVault, MediaVaultItem } from "../../../api";
import { EmptyState } from "../../ui/EmptyState";
import { NexusSectionButton } from "../../ui/NexusButton";
import { NexusPaginator } from "../../ui/NexusPaginator";
import { MediaVaultCard } from "./MediaVaultCard";
import {
  DEFAULT_MEDIA_VAULT_FILTER,
  type MediaVaultFilter,
} from "./MediaVaultFiltersModal";
import { MediaVaultForm } from "./MediaVaultForm";

export type MediaVaultViewMode = "vault_list" | "vault_upload";

interface MediaVaultViewProps {
  viewMode: MediaVaultViewMode;
  filter?: MediaVaultFilter;
  searchQuery?: string;
  onSetViewMode: (mode: MediaVaultViewMode) => void;
  showToast: (message: string, type?: "success" | "error") => void;
  setConfirmDialog: (dialog: any) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export interface MediaVaultViewRef {
  handleSave: () => void;
}

export const MediaVaultView = forwardRef<
  MediaVaultViewRef,
  MediaVaultViewProps
>(
  (
    {
      viewMode,
      filter = DEFAULT_MEDIA_VAULT_FILTER,
      searchQuery = "",
      onSetViewMode,
      showToast,
      setConfirmDialog,
      onValidationChange,
    },
    ref,
  ) => {
    const formRef = useRef<{ handleSave: () => void }>(null);
    const loadRequestIdRef = useRef(0);
    const [items, setItems] = useState<MediaVaultItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [busyIds, setBusyIds] = useState<Set<string>>(() => new Set());
    const [debouncedSearchQuery, setDebouncedSearchQuery] =
      useState(searchQuery);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useImperativeHandle(ref, () => ({
      handleSave: () => formRef.current?.handleSave(),
    }));

    const loadItems = async () => {
      const requestId = ++loadRequestIdRef.current;
      setIsLoading(true);
      try {
        const mediaType =
          filter === "PHOTO" || filter === "VIDEO" ? filter : undefined;
        const data = await apiMediaVault.list({
          page,
          pageSize: 12,
          type: mediaType,
          search: debouncedSearchQuery.trim() || undefined,
        });
        if (requestId !== loadRequestIdRef.current) return;
        setItems(data.items);
        setTotalPages(data.pagination.totalPages);
      } catch (error) {
        if (requestId !== loadRequestIdRef.current) return;
        console.error(error);
        showToast("No se pudo cargar la bóveda de medios", "error");
      } finally {
        if (requestId === loadRequestIdRef.current) setIsLoading(false);
      }
    };

    useEffect(() => {
      const timeoutId = window.setTimeout(
        () => setDebouncedSearchQuery(searchQuery),
        250,
      );
      return () => window.clearTimeout(timeoutId);
    }, [searchQuery]);

    useEffect(() => {
      void loadItems();
    }, [page, filter, debouncedSearchQuery]);
    useEffect(() => {
      setPage(1);
    }, [filter, debouncedSearchQuery]);

    const withBusy = async (id: string, task: () => Promise<void>) => {
      setBusyIds((current) => new Set(current).add(id));
      try {
        await task();
      } finally {
        setBusyIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }
    };

    const downloadItem = (item: MediaVaultItem) =>
      withBusy(item.id, async () => {
        try {
          const download = await apiMediaVault.getDownload(item.id);
          const anchor = document.createElement("a");
          anchor.href = download.url;
          anchor.download = download.fileName;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          setItems((current) =>
            current.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    downloadCount: entry.downloadCount + 1,
                    downloadedAt: new Date().toISOString(),
                  }
                : entry,
            ),
          );
        } catch (error) {
          console.error(error);
          showToast("No se pudo descargar el archivo", "error");
        }
      });

    const extendItem = (item: MediaVaultItem) =>
      withBusy(item.id, async () => {
        try {
          const updated = await apiMediaVault.extend(item.id);
          setItems((current) =>
            current.map((entry) => (entry.id === item.id ? updated : entry)),
          );
          showToast("Disponibilidad extendida 30 días");
        } catch (error) {
          console.error(error);
          showToast("No se pudo extender la disponibilidad", "error");
        }
      });

    const deleteItem = (item: MediaVaultItem) => {
      setConfirmDialog({
        isOpen: true,
        title: "¿Eliminar archivo?",
        message: "El original se eliminará de forma permanente de la bóveda.",
        confirmLabel: "Eliminar",
        variant: "danger",
        onConfirm: async () => {
          await withBusy(item.id, async () => {
            try {
              await apiMediaVault.delete(item.id);
              setItems((current) =>
                current.filter((entry) => entry.id !== item.id),
              );
              showToast("Archivo eliminado de la bóveda");
            } catch (error) {
              console.error(error);
              showToast("No se pudo eliminar el archivo", "error");
            }
          });
          setConfirmDialog({ isOpen: false });
        },
      });
    };

    if (viewMode === "vault_upload") {
      return (
        <MediaVaultForm
          ref={formRef}
          onSave={() => {
            onSetViewMode("vault_list");
            void loadItems();
          }}
          onValidationChange={onValidationChange}
          showToast={showToast}
        />
      );
    }

    return (
      <div
        className="flex flex-col pb-[var(--space-2xl)]"
        style={{ gap: "var(--space-lg)" }}
      >
        {isLoading ? (
          <div
            className="flex flex-col items-center justify-center py-[var(--space-2xl)] text-text-muted"
            style={{ gap: "var(--space-md)" }}
          >
            <Loader2 className="animate-spin text-brand-600" size={40} />
            <span className="text-secondary">Cargando bóveda...</span>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={
              filter === "PHOTO"
                ? FileImage
                : filter === "VIDEO"
                  ? Film
                  : Archive
            }
            title={
              filter !== "ALL" || debouncedSearchQuery.trim()
                ? "No encontramos archivos"
                : "La bóveda está vacía"
            }
            description={
              filter !== "ALL" || debouncedSearchQuery.trim()
                ? "Ajusta la búsqueda o cambia el filtro para ver otros archivos."
                : "Sube originales para compartirlos sin compresión ni pérdida de calidad."
            }
            action={
              filter === "ALL" && !debouncedSearchQuery.trim() ? (
                <NexusSectionButton
                  variant="brand"
                  icon={UploadCloud}
                  onClick={() => onSetViewMode("vault_upload")}
                >
                  Subir Archivos
                </NexusSectionButton>
              ) : undefined
            }
          />
        ) : (
          <>
            <div
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
              style={{ gap: "var(--space-md)" }}
            >
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="animate-card-enter"
                  style={{ animationDelay: `${index * 48}ms` }}
                >
                  <MediaVaultCard
                    item={item}
                    onDownload={() => void downloadItem(item)}
                    onExtend={() => void extendItem(item)}
                    onDelete={() => deleteItem(item)}
                    isBusy={busyIds.has(item.id)}
                  />
                </div>
              ))}
            </div>
            <NexusPaginator
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    );
  },
);
