import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Check,
  ChevronDown,
  Film,
  Image as ImageIcon,
  ListChecks,
  MapPin,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { apiCategories, apiGallery, apiUpload } from "../../api";
import { Category, Media } from "../../types";
import { NexusInput, NexusSelect, NexusTextarea } from "../ui/NexusInputs";
import { NexusAutonomousButton, NexusSectionButton } from "../ui/NexusButton";
import { NexusSection } from "../ui/NexusSection";
import { NexusSpinner } from "../ui/NexusSpinner";
import { InteractionStage } from "../ui/InteractionStage";
import { UploadPreviewOverlay } from "../ui/UploadPreviewOverlay";
import { NexusModal, NexusModalActions } from "../ui/NexusModal";
import { NexusSectionBadge } from "../ui/NexusBadge";
import { NexusCheckboxRow } from "../ui/NexusCheckboxRow";
import { useUploadQueue } from "../uploads/UploadQueueProvider";

interface MediaFormProps {
  initialData?: Media;
  onCancel: () => void;
  onSave: () => void;
  onValidationChange?: (isValid: boolean) => void;
  showToast: (message: string, type?: "success" | "error") => void;
}

export const MediaForm = forwardRef<{ handleSave: () => void }, MediaFormProps>(
  ({ initialData, onSave, onValidationChange, showToast }, ref) => {
    const { startDirectVideoUpload } = useUploadQueue();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);

    const [title, setTitle] = useState(initialData?.title || "");
    const [description, setDescription] = useState(
      initialData?.description || "",
    );
    const [category, setCategory] = useState(
      initialData?.categoryId?.toString() || "",
    );
    const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<
      string[]
    >(
      initialData?.subcategoryIds?.map(String) ||
        initialData?.subcategories?.map((subcategory) =>
          subcategory.id.toString(),
        ) ||
        (initialData?.subcategoryId
          ? [initialData.subcategoryId.toString()]
          : []),
    );
    const [location, setLocation] = useState(initialData?.location || "");

    const [file, setFile] = useState<File | null>(null);
    const [assetId, setAssetId] = useState<string | null>(
      initialData?.assetId || null,
    );
    const [previewUrl, setPreviewUrl] = useState<string | null>(
      initialData?.url || null,
    );

    const [categories, setCategories] = useState<Category[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [isSubcategoryPickerOpen, setIsSubcategoryPickerOpen] =
      useState(false);
    const [subcategoryDraft, setSubcategoryDraft] = useState<string[]>([]);
    const [newSubName, setNewSubName] = useState("");
    const [isSavingSub, setIsSavingSub] = useState(false);

    useImperativeHandle(ref, () => ({
      handleSave: () => {
        handleSubmit();
      },
    }));

    const availableSubcategories = useMemo(() => {
      if (!category) return [];
      const selectedCat = categories.find(
        (cat) => cat.id.toString() === category,
      );
      return selectedCat?.subcategories || [];
    }, [category, categories]);

    const selectedSubcategories = useMemo(
      () =>
        availableSubcategories.filter((subcategory) =>
          selectedSubcategoryIds.includes(subcategory.id.toString()),
        ),
      [availableSubcategories, selectedSubcategoryIds],
    );

    const openSubcategoryPicker = () => {
      setSubcategoryDraft(selectedSubcategoryIds);
      setIsSubcategoryPickerOpen(true);
    };

    const toggleDraftSubcategory = (id: string) => {
      setSubcategoryDraft((current) =>
        current.includes(id)
          ? current.filter((subcategoryId) => subcategoryId !== id)
          : [...current, id],
      );
    };

    const loadCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const data = await apiCategories.getAll();
        setCategories(data);
        if (!category && initialData?.categoryId) {
          setCategory(initialData.categoryId.toString());
        }
      } catch (error) {
        console.error("Error cargando categorias", error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    useEffect(() => {
      loadCategories();
    }, [initialData]);

    const isVideo = useMemo(() => {
      if (file) return file.type.startsWith("video/");
      return initialData?.mediaType === "VIDEO";
    }, [file, initialData?.mediaType]);

    const isFormValid =
      (!!file || !!assetId) &&
      title.trim().length > 0 &&
      category !== "" &&
      !isProcessing;

    useEffect(() => {
      onValidationChange?.(isFormValid);
    }, [isFormValid, onValidationChange]);

    useEffect(() => {
      return () => onValidationChange?.(false);
    }, [onValidationChange]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (!selectedFile) return;

      setIsProcessing(true);
      setTimeout(() => {
        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
        setIsProcessing(false);
      }, 400);
    };

    const uploadMediaFile = async (selectedFile: File) => {
      if (selectedFile.type.startsWith("video/")) {
        return startDirectVideoUpload(selectedFile, { label: "Video de galeria" });
      }
      return apiUpload.upload(selectedFile);
    };

    const handleQuickSaveSubcategory = async (event: React.FormEvent) => {
      event.preventDefault();
      if (!newSubName.trim() || !category) return;
      setIsSavingSub(true);

      try {
        const selectedCat = categories.find(
          (cat) => cat.id.toString() === category,
        );
        if (!selectedCat) return;

        const currentSubs = selectedCat.subcategories
          ? selectedCat.subcategories.map((sub) => sub.name)
          : [];
        await apiCategories.update(selectedCat.id, {
          name: selectedCat.name,
          icon: selectedCat.icon,
          subcategories: [...currentSubs, newSubName.trim()],
        });

        const data = await apiCategories.getAll();
        setCategories(data);

        const refreshedCat = data.find((cat) => cat.id === selectedCat.id);
        const createdSub = refreshedCat?.subcategories?.find(
          (sub) => sub.name.toLowerCase() === newSubName.trim().toLowerCase(),
        );

        if (createdSub) {
          setSelectedSubcategoryIds((current) => [
            ...Array.from(new Set([...current, createdSub.id.toString()])),
          ]);
        }
        setIsSubModalOpen(false);
        setNewSubName("");
      } finally {
        setIsSavingSub(false);
      }
    };

    const handleSubmit = async (event?: React.FormEvent) => {
      event?.preventDefault();
      if (!isFormValid || isSubmitting) return;
      setIsSubmitting(true);

      try {
        let finalAssetId = assetId;
        if (file) {
          const uploadRes = await uploadMediaFile(file);
          finalAssetId = uploadRes.assetId;
          setAssetId(uploadRes.assetId);
        }
        if (!finalAssetId) throw new Error("Selecciona un medio.");

        const mediaData = {
          title,
          description,
          categoryId: parseInt(category),
          subcategoryIds: selectedSubcategoryIds.map((id) => parseInt(id)),
          location,
          assetId: finalAssetId,
        };

        if (initialData?.id) {
          await apiGallery.update(initialData.id, mediaData);
        } else {
          await apiGallery.create(mediaData);
        }

        onSave();
      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "No se pudo guardar el medio.";
        showToast(message, "error");
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <>
        <form
          id="media-form"
          onSubmit={handleSubmit}
          className="flex flex-col animate-in fade-in duration-700"
          style={{ gap: "var(--space-lg)", paddingBottom: "var(--space-lg)" }}
        >
          <div
            className="grid grid-cols-1 items-start lg:grid-cols-12"
            style={{ gap: "var(--space-lg)" }}
          >
            <div
              className="flex flex-col lg:col-span-7"
              style={{ gap: "var(--space-lg)" }}
            >
              <div className="w-full">
                {!previewUrl ? (
                  <InteractionStage
                    level={1}
                    size="normal"
                    className="aspect-video w-full shadow-sm"
                    icon={Upload}
                    title="Medio de la Galería"
                    description="Imagen o video para la galería."
                    onClick={() =>
                      !isProcessing && fileInputRef.current?.click()
                    }
                  />
                ) : (
                  <div
                    className="group relative flex aspect-video w-full cursor-pointer flex-col items-center justify-center overflow-hidden shadow-xl shadow-stone-200/40 transition-all duration-500 active:scale-[0.995]"
                    style={{ borderRadius: "var(--radius-outer)" }}
                    onClick={() =>
                      !isProcessing && fileInputRef.current?.click()
                    }
                  >
                    {isVideo ? (
                      <video
                        src={previewUrl}
                        className="h-full w-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    ) : (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    )}

                    <UploadPreviewOverlay label="Cambiar Medio" />

                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between"
                      style={{ padding: "var(--padding-inner)" }}
                    >
                      <div className="pointer-events-auto">
                        <NexusAutonomousButton
                          type="button"
                          variant="ghost"
                          icon={isVideo ? Film : ImageIcon}
                          className="pointer-events-none border border-white/10 bg-black/40 text-white shadow-none backdrop-blur-md"
                        >
                          {isVideo ? "Video" : "Foto"}
                        </NexusAutonomousButton>
                      </div>

                      <div className="pointer-events-auto">
                        <NexusAutonomousButton
                          type="button"
                          variant="ghost"
                          isIconOnly
                          icon={X}
                          onClick={(event) => {
                            event.stopPropagation();
                            setFile(null);
                            setPreviewUrl(null);
                            setAssetId(null);
                            if (fileInputRef.current)
                              fileInputRef.current.value = "";
                          }}
                          className="border border-white/10 bg-black/40 text-white shadow-none backdrop-blur-md hover:bg-rose-500"
                        />
                      </div>
                    </div>

                    {isProcessing && (
                      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-bg-card/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <NexusSpinner
                          label="Procesando archivo..."
                          fullPage={false}
                        />
                      </div>
                    )}
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <div className="lg:col-span-5">
              <NexusSection
                title="Detalles del Medio"
                subtitle="Informacion y clasificacion"
                icon={isVideo ? Film : ImageIcon}
                iconVariant="brand"
              >
                <div
                  className="flex flex-col"
                  style={{ gap: "var(--space-md)" }}
                >
                  <NexusInput
                    label="Titulo *"
                    placeholder="Ej. Atardecer en los Agaves"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />

                  <div
                    className="grid grid-cols-1"
                    style={{ gap: "var(--space-md)" }}
                  >
                    <NexusSelect
                      label="Categoria *"
                      value={category}
                      disabled={isLoadingCategories}
                      onChange={(event) => {
                        setCategory(event.target.value);
                        setSelectedSubcategoryIds([]);
                      }}
                    >
                      <option value="">Seleccionar...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </NexusSelect>

                    <div
                      className="grid min-w-0 items-end"
                      style={{
                        gridTemplateColumns:
                          "minmax(0, 1fr) var(--h-button-section)",
                        gap: "var(--space-sm)",
                      }}
                    >
                      <div
                        className="group flex min-w-0 flex-col"
                        style={{ gap: "var(--space-xs)" }}
                      >
                        <span
                          id="media-subcategories-label"
                          className="text-label uppercase tracking-[0.15em] text-text-muted"
                          style={{ marginLeft: "var(--space-xs)" }}
                        >
                          Subcategorias
                        </span>
                        <button
                          type="button"
                          aria-labelledby="media-subcategories-label"
                          aria-haspopup="dialog"
                          onClick={openSubcategoryPicker}
                          className="flex w-full min-w-0 items-center justify-between border border-border-main bg-bg-muted pl-5 pr-5 font-medium text-text-main transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                          style={{
                            height: "var(--h-input)",
                            borderRadius: "var(--radius-inner-visual)",
                            gap: "var(--space-sm)",
                          }}
                          disabled={
                            !category || availableSubcategories.length === 0
                          }
                        >
                          <span className="truncate">
                            {!category || availableSubcategories.length === 0
                              ? "Sin definir"
                              : selectedSubcategoryIds.length === 0
                                ? "Seleccionar..."
                                : `${selectedSubcategoryIds.length} seleccionada${selectedSubcategoryIds.length === 1 ? "" : "s"}`}
                          </span>
                          <ChevronDown
                            className="shrink-0 text-text-muted"
                            style={{
                              width: "var(--size-inner-icon-metadata)",
                              height: "var(--size-inner-icon-metadata)",
                            }}
                          />
                        </button>
                      </div>
                      <NexusSectionButton
                        type="button"
                        variant="secondary"
                        onClick={() => setIsSubModalOpen(true)}
                        disabled={!category}
                        isIconOnly
                        icon={Plus}
                        aria-label="Crear subcategoria"
                      />
                    </div>

                    {selectedSubcategories.length > 0 && (
                      <div
                        className="flex flex-wrap items-center"
                        style={{ gap: "var(--space-sm)" }}
                      >
                        {selectedSubcategories.map((subcategory) => (
                          <NexusSectionBadge
                            key={subcategory.id}
                            variant="brand"
                          >
                            {subcategory.name}
                          </NexusSectionBadge>
                        ))}
                      </div>
                    )}
                  </div>

                  <NexusInput
                    label="Ubicacion"
                    placeholder="Ej. Sector Sur"
                    icon={MapPin}
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                  />

                  <NexusTextarea
                    label="Descripcion"
                    placeholder="Cuentanos mas sobre este medio..."
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={6}
                  />

                  {isSubmitting && (
                    <div
                      className="flex items-center justify-center border border-brand-100 bg-brand-50 animate-pulse"
                      style={{
                        gap: "var(--space-sm)",
                        paddingBlock: "var(--space-md)",
                        borderRadius: "var(--radius-nested-simple)",
                      }}
                    >
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                      <span className="text-label uppercase tracking-widest text-brand-700">
                        Guardando medio...
                      </span>
                    </div>
                  )}
                </div>
              </NexusSection>
            </div>
          </div>
        </form>

        <NexusModal
          isOpen={isSubcategoryPickerOpen}
          title="Seleccionar Subcategorias"
          eyebrow={
            categories.find((cat) => cat.id.toString() === category)?.name
          }
          icon={ListChecks}
          onClose={() => setIsSubcategoryPickerOpen(false)}
          zIndex={200}
        >
          <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
            <div
              className="flex max-h-[min(50vh,24rem)] flex-col overflow-y-auto"
              role="group"
              aria-label="Subcategorias disponibles"
              style={{ gap: "var(--space-sm)" }}
            >
              {availableSubcategories.map((subcategory) => {
                const id = subcategory.id.toString();
                const isChecked = subcategoryDraft.includes(id);
                return (
                  <NexusCheckboxRow
                    key={subcategory.id}
                    checked={isChecked}
                    onChange={() => toggleDraftSubcategory(id)}
                    label={subcategory.name}
                  />
                );
              })}
            </div>

            <NexusModalActions>
              <NexusAutonomousButton
                type="button"
                variant="secondary"
                onClick={() => setIsSubcategoryPickerOpen(false)}
                className="flex-1"
              >
                Cancelar
              </NexusAutonomousButton>
              <NexusAutonomousButton
                type="button"
                variant="brand"
                icon={Check}
                onClick={() => {
                  setSelectedSubcategoryIds(subcategoryDraft);
                  setIsSubcategoryPickerOpen(false);
                }}
                className="flex-[2]"
              >
                Aplicar Seleccion
              </NexusAutonomousButton>
            </NexusModalActions>
          </div>
        </NexusModal>

        <NexusModal
          isOpen={isSubModalOpen}
          title={
            <>
              En{" "}
              {categories.find((cat) => cat.id.toString() === category)?.name}
            </>
          }
          eyebrow="Nueva Subcategoria"
          icon={Plus}
          onClose={() => setIsSubModalOpen(false)}
          zIndex={200}
        >
          <form
            onSubmit={handleQuickSaveSubcategory}
            className="flex flex-col"
            style={{ gap: "var(--space-lg)" }}
          >
            <NexusInput
              label="Nombre de la Subcategoria *"
              placeholder="Ej. Instalaciones, Equipo..."
              value={newSubName}
              autoFocus
              onChange={(event) => setNewSubName(event.target.value)}
            />

            <NexusModalActions>
              <NexusAutonomousButton
                type="button"
                variant="secondary"
                onClick={() => setIsSubModalOpen(false)}
                className="flex-1"
              >
                Cancelar
              </NexusAutonomousButton>
              <NexusAutonomousButton
                type="submit"
                disabled={!newSubName.trim() || isSavingSub}
                isLoading={isSavingSub}
                className="flex-[2]"
                variant="brand"
                icon={Check}
              >
                Crear y Seleccionar
              </NexusAutonomousButton>
            </NexusModalActions>
          </form>
        </NexusModal>
      </>
    );
  },
);
