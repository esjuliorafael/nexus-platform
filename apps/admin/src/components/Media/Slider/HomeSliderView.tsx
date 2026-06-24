import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { ImageIcon, Loader2, MonitorPlay } from "lucide-react";
import { apiHomeSlides } from "../../../api";
import { HomeSlide } from "../../../types";
import { EmptyState } from "../../ui/EmptyState";
import { NexusSectionButton } from "../../ui/NexusButton";
import { HomeSlideCard } from "./HomeSlideCard";
import { HomeSlideForm } from "./HomeSlideForm";

export type HomeSliderViewMode = "slider_list" | "slide_create" | "slide_edit";

interface HomeSliderViewProps {
  viewMode: HomeSliderViewMode;
  onSetViewMode: (mode: HomeSliderViewMode) => void;
  showToast: (message: string, type?: "success" | "error") => void;
  setConfirmDialog: (dialog: any) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export interface HomeSliderViewRef {
  handleSave: () => void;
}

export const HomeSliderView = forwardRef<
  HomeSliderViewRef,
  HomeSliderViewProps
>(
  (
    {
      viewMode,
      onSetViewMode,
      showToast,
      setConfirmDialog,
      onValidationChange,
    },
    ref,
  ) => {
    const [slides, setSlides] = useState<HomeSlide[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingSlide, setEditingSlide] = useState<HomeSlide | null>(null);
    const [togglingSlideIds, setTogglingSlideIds] = useState<Set<string>>(
      () => new Set(),
    );
    const [isReordering, setIsReordering] = useState(false);
    const formRef = useRef<{ handleSave: () => void }>(null);

    useImperativeHandle(ref, () => ({
      handleSave: () => {
        formRef.current?.handleSave();
      },
    }));

    const loadSlides = async () => {
      setIsLoading(true);
      try {
        const data = await apiHomeSlides.getAll();
        setSlides(data);
      } catch (error) {
        console.error(error);
        showToast("Error al cargar slides del inicio", "error");
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
      loadSlides();
    }, []);

    useEffect(() => {
      const handleMediaUploadChange = () => {
        void loadSlides();
      };
      window.addEventListener("nexus:media-upload-complete", handleMediaUploadChange);
      window.addEventListener("nexus:media-upload-failed", handleMediaUploadChange);
      return () => {
        window.removeEventListener("nexus:media-upload-complete", handleMediaUploadChange);
        window.removeEventListener("nexus:media-upload-failed", handleMediaUploadChange);
      };
    }, []);

    useEffect(() => {
      if (viewMode === "slide_create") setEditingSlide(null);
    }, [viewMode]);

    const orderedSlides = useMemo(() => {
      return [...slides].sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    }, [slides]);

    const handleSaveSuccess = () => {
      loadSlides();
      showToast(
        editingSlide
          ? "Slide actualizado correctamente"
          : "Slide creado correctamente",
      );
      setEditingSlide(null);
      onSetViewMode("slider_list");
    };

    const handleToggleActive = async (slide: HomeSlide) => {
      const nextActive = !slide.active;

      setTogglingSlideIds((prev) => {
        const next = new Set(prev);
        next.add(slide.id);
        return next;
      });
      setSlides((prev) =>
        prev.map((item) =>
          item.id === slide.id ? { ...item, active: nextActive } : item,
        ),
      );

      try {
        await apiHomeSlides.update(slide.id, { active: nextActive });
        showToast(nextActive ? "Slide publicado" : "Slide pausado");
      } catch (error) {
        console.error(error);
        setSlides((prev) =>
          prev.map((item) =>
            item.id === slide.id ? { ...item, active: slide.active } : item,
          ),
        );
        showToast("No se pudo cambiar el estado del slide", "error");
      } finally {
        setTogglingSlideIds((prev) => {
          const next = new Set(prev);
          next.delete(slide.id);
          return next;
        });
      }
    };

    const handleMoveSlide = async (slideId: string, direction: -1 | 1) => {
      if (isReordering) return;

      const currentIndex = orderedSlides.findIndex(
        (slide) => slide.id === slideId,
      );
      const nextIndex = currentIndex + direction;
      if (
        currentIndex < 0 ||
        nextIndex < 0 ||
        nextIndex >= orderedSlides.length
      )
        return;

      const reordered = [...orderedSlides];
      const [moved] = reordered.splice(currentIndex, 1);
      reordered.splice(nextIndex, 0, moved);

      const optimisticSlides = reordered.map((slide, index) => ({
        ...slide,
        sortOrder: index + 1,
      }));

      setIsReordering(true);
      setSlides(optimisticSlides);

      try {
        const updated = await apiHomeSlides.reorder(
          reordered.map((slide) => slide.id),
        );
        setSlides(updated);
        showToast("Orden actualizado correctamente");
      } catch (error: any) {
        console.error(error);
        setSlides(slides);
        showToast(
          error?.response?.data?.message || "No se pudo actualizar el orden",
          "error",
        );
      } finally {
        setIsReordering(false);
      }
    };

    const handleDelete = (slide: HomeSlide) => {
      setConfirmDialog({
        isOpen: true,
        title: "¿Eliminar slide?",
        message:
          "Esta accion eliminara el recurso del slider y su archivo asociado. No afecta la galeria.",
        confirmLabel: "Eliminar",
        variant: "danger",
        onConfirm: async () => {
          try {
            await apiHomeSlides.delete(slide.id);
            setSlides((prev) => prev.filter((item) => item.id !== slide.id));
            showToast("Slide eliminado correctamente");
          } catch (error) {
            console.error(error);
            showToast("No se pudo eliminar el slide", "error");
          }
          setConfirmDialog({ isOpen: false });
        },
      });
    };

    if (viewMode === "slide_create" || viewMode === "slide_edit") {
      return (
        <HomeSlideForm
          ref={formRef}
          key={editingSlide?.id || "new-slide"}
          initialData={editingSlide || undefined}
          existingSlides={slides}
          onCancel={() => onSetViewMode("slider_list")}
          onSave={handleSaveSuccess}
          showToast={showToast}
          onValidationChange={onValidationChange}
        />
      );
    }

    if (isLoading) {
      return (
        <div
          className="flex flex-col items-center justify-center"
          style={{
            gap: "var(--space-md)",
            paddingBlock: "var(--space-2xl)",
          }}
        >
          <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
          <p className="font-medium text-text-muted">
            Cargando slider principal...
          </p>
        </div>
      );
    }

    if (slides.length === 0) {
      return (
        <EmptyState
          icon={MonitorPlay}
          title="Sin slides configurados"
          description="Crea el primer slide para reemplazar el contenido estatico del inicio."
          action={
            <NexusSectionButton
              variant="brand"
              icon={ImageIcon}
              onClick={() => onSetViewMode("slide_create")}
            >
              Crear Slide
            </NexusSectionButton>
          }
        />
      );
    }

    return (
      <div
        className="mx-auto flex w-full max-w-6xl flex-col pb-[var(--space-2xl)] sm:pb-[var(--space-lg)]"
        style={{ gap: "var(--space-md)" }}
      >
        {orderedSlides.map((slide, index) => (
          <div
            key={slide.id}
            className="animate-card-enter"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <HomeSlideCard
              slide={slide}
              onEdit={() => {
                setEditingSlide(slide);
                onSetViewMode("slide_edit");
              }}
              onDelete={() => handleDelete(slide)}
              onToggleActive={() => handleToggleActive(slide)}
              onMoveUp={() => handleMoveSlide(slide.id, -1)}
              onMoveDown={() => handleMoveSlide(slide.id, 1)}
              canMoveUp={!isReordering && index > 0}
              canMoveDown={!isReordering && index < orderedSlides.length - 1}
              isToggling={togglingSlideIds.has(slide.id)}
            />
          </div>
        ))}
      </div>
    );
  },
);
