import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { FileImage, Film, Plus, Trash2, UploadCloud } from "lucide-react";
import { apiMediaVault, apiUpload } from "../../../api";
import { NexusCardButton, NexusSectionButton } from "../../ui/NexusButton";
import { NexusSectionCard } from "../../ui/NexusCard";
import { NexusSection } from "../../ui/NexusSection";

interface MediaVaultFormProps {
  onSave: () => void;
  onValidationChange?: (isValid: boolean) => void;
  showToast: (message: string, type?: "success" | "error") => void;
}

interface PendingFile {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: "READY" | "UPLOADING" | "DONE" | "FAILED";
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 500 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/", "video/"];

export const MediaVaultForm = forwardRef<
  { handleSave: () => void },
  MediaVaultFormProps
>(({ onSave, onValidationChange, showToast }, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<PendingFile[]>([]);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    onValidationChange?.(files.length > 0 && !isUploading);
  }, [files.length, isUploading, onValidationChange]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(
    () => () => filesRef.current.forEach((entry) => URL.revokeObjectURL(entry.previewUrl)),
    [],
  );

  const addFiles = (incoming: FileList | File[]) => {
    const candidates = Array.from(incoming);
    const available = Math.max(0, MAX_FILES - files.length);
    const accepted = candidates.slice(0, available).filter((file) => {
      if (!ACCEPTED_TYPES.some((type) => file.type.startsWith(type))) {
        showToast(`${file.name}: formato no compatible`, "error");
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        showToast(`${file.name}: supera el límite de 500 MB`, "error");
        return false;
      }
      return true;
    });

    if (candidates.length > available) {
      showToast(`Puedes subir hasta ${MAX_FILES} archivos por carga`, "error");
    }

    setFiles((current) => [
      ...current,
      ...accepted.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        progress: 0,
        status: "READY" as const,
      })),
    ]);
  };

  const removeFile = (id: string) => {
    setFiles((current) => {
      const removed = current.find((entry) => entry.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((entry) => entry.id !== id);
    });
  };

  const uploadAll = async () => {
    if (!files.length || isUploading) return;
    setIsUploading(true);
    let uploaded = 0;

    for (const entry of files) {
      let vaultId: string | null = null;
      setFiles((current) =>
        current.map((item) =>
          item.id === entry.id ? { ...item, status: "UPLOADING", progress: 1 } : item,
        ),
      );
      try {
        const direct = await apiMediaVault.beginUpload(entry.file);
        vaultId = direct.item.id;
        await apiUpload.uploadToSignedUrl(direct.uploadUrl, entry.file, (progress) => {
          setFiles((current) =>
            current.map((item) =>
              item.id === entry.id ? { ...item, progress } : item,
            ),
          );
        });
        await apiMediaVault.completeUpload(direct.item.id);
        uploaded += 1;
        setFiles((current) =>
          current.map((item) =>
            item.id === entry.id ? { ...item, status: "DONE", progress: 100 } : item,
          ),
        );
      } catch (error) {
        console.error(error);
        if (vaultId) await apiMediaVault.delete(vaultId).catch(() => undefined);
        setFiles((current) =>
          current.map((item) =>
            item.id === entry.id ? { ...item, status: "FAILED" } : item,
          ),
        );
      }
    }

    setIsUploading(false);
    if (uploaded === files.length) {
      showToast(`${uploaded} ${uploaded === 1 ? "archivo subido" : "archivos subidos"} a la bóveda`);
      onSave();
      return;
    }
    showToast(`${uploaded} de ${files.length} archivos se subieron correctamente`, "error");
  };

  useImperativeHandle(ref, () => ({ handleSave: uploadAll }));

  return (
    <div className="mx-auto w-full max-w-5xl">
      <NexusSection
        title="Archivos Originales"
        subtitle="Fotografías y videos sin compresión ni pérdida de calidad."
        icon={UploadCloud}
        action={
          <NexusSectionButton
            type="button"
            variant="secondary"
            icon={Plus}
            onClick={() => inputRef.current?.click()}
            disabled={isUploading || files.length >= MAX_FILES}
          >
            Seleccionar Archivos
          </NexusSectionButton>
        }
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = "";
          }}
        />

        {files.length === 0 ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              addFiles(event.dataTransfer.files);
            }}
            className="flex w-full flex-col items-center justify-center border border-dashed border-border-main bg-bg-muted text-center transition-colors hover:border-brand-400 hover:bg-brand-50/40"
            style={{
              minHeight: "18rem",
              gap: "var(--space-md)",
              padding: "var(--padding-inner)",
              borderRadius: "var(--radius-inner-visual)",
            }}
          >
            <span
              className="inline-flex items-center justify-center bg-bg-card text-brand-600 shadow-sm"
              style={{
                width: "var(--size-button-section)",
                height: "var(--size-button-section)",
                borderRadius: "var(--radius-nested-simple)",
              }}
            >
              <UploadCloud style={{ width: "var(--size-inner-icon-section)", height: "var(--size-inner-icon-section)" }} />
            </span>
            <span className="flex flex-col" style={{ gap: "var(--space-xs)" }}>
              <strong className="text-h2 text-text-main">Selecciona o arrastra tus archivos</strong>
              <span className="text-secondary text-text-muted">
                Hasta {MAX_FILES} fotografías o videos, máximo 500 MB por archivo.
              </span>
            </span>
          </button>
        ) : (
          <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
            {files.map((entry) => {
              const isVideo = entry.file.type.startsWith("video/");
              return (
                <NexusSectionCard
                  key={entry.id}
                  title={entry.file.name}
                  subtitle={`${(entry.file.size / 1024 / 1024).toFixed(1)} MB · ${entry.status === "FAILED" ? "Error de carga" : entry.status === "DONE" ? "Listo" : entry.status === "UPLOADING" ? `Subiendo ${entry.progress}%` : "Preparado"}`}
                  icon={isVideo ? Film : FileImage}
                  actions={
                    <NexusCardButton
                      type="button"
                      onClick={() => removeFile(entry.id)}
                      disabled={isUploading}
                      variant="secondary"
                      isIconOnly
                      icon={Trash2}
                      className="hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Quitar ${entry.file.name}`}
                    />
                  }
                />
              );
            })}
          </div>
        )}
      </NexusSection>
    </div>
  );
});
