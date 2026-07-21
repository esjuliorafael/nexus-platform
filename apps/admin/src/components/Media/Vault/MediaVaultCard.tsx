import React, { useRef, useState } from "react";
import { CalendarClock, Download, FileImage, Film, RefreshCw, Trash2 } from "lucide-react";
import { MediaVaultItem } from "../../../api";
import { NexusAutonomousBadge } from "../../ui/NexusBadge";
import { NexusAutonomousButton } from "../../ui/NexusButton";
import { NexusAutonomousCard } from "../../ui/NexusCard";
import { NexusMediaViewer } from "../../ui/NexusMediaViewer";

interface MediaVaultCardProps {
  item: MediaVaultItem;
  onDownload: () => void;
  onExtend: () => void;
  onDelete: () => void;
  isBusy?: boolean;
}

const formatBytes = (value: number | null) => {
  if (!value) return "Tamaño pendiente";
  if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(1)} GB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
};

export const MediaVaultCard: React.FC<MediaVaultCardProps> = ({
  item,
  onDownload,
  onExtend,
  onDelete,
  isBusy = false,
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = item.mediaType === "VIDEO";
  const preview = item.posterUrl || item.mediaUrl || "";
  const expires = new Date(item.expiresAt);

  return (
    <>
      <NexusAutonomousCard swipeable onDelete={onDelete} isMuted={item.status !== "READY"}>
        <div className="flex h-full flex-col" style={{ gap: "var(--space-md)" }}>
          <button
            type="button"
            onClick={() => item.status === "READY" && setIsPreviewOpen(true)}
            onMouseEnter={() => isVideo && videoRef.current?.play().catch(() => undefined)}
            onMouseLeave={() => {
              if (!videoRef.current) return;
              videoRef.current.pause();
              videoRef.current.currentTime = 0;
            }}
            className="relative aspect-[4/3] w-full overflow-hidden bg-bg-muted text-left"
            style={{ borderRadius: "var(--radius-card-inner)" }}
          >
            {preview ? (
              isVideo ? (
                <video ref={videoRef} src={item.mediaUrl || undefined} poster={item.posterUrl || undefined} muted loop playsInline className="h-full w-full object-cover" />
              ) : (
                <img src={preview} alt="Archivo de la bóveda" className="h-full w-full object-cover" />
              )
            ) : (
              <span className="flex h-full items-center justify-center text-text-muted">
                {isVideo ? <Film size={36} /> : <FileImage size={36} />}
              </span>
            )}
            <div className="absolute left-[var(--space-md)] top-[var(--space-md)]">
              <NexusAutonomousBadge variant="overlay">
                {isVideo ? "Video" : "Fotografía"}
              </NexusAutonomousBadge>
            </div>
          </button>

          <div className="flex min-w-0 flex-1 flex-col" style={{ gap: "var(--space-sm)" }}>
            <p className="truncate text-h2 text-text-main">{item.downloadName}</p>
            <div className="grid grid-cols-2 text-secondary text-text-muted" style={{ gap: "var(--space-sm)" }}>
              <span>{formatBytes(item.sizeBytes)}</span>
              <span className="text-right">{item.downloadCount} descargas</span>
              <span className="col-span-2 flex items-center" style={{ gap: "var(--space-xs)" }}>
                <CalendarClock size={16} /> Expira el {expires.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              <span className="col-span-2 truncate">Subido por {item.uploadedByName}</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border-main pt-[var(--space-md)]" style={{ gap: "var(--space-sm)" }}>
            <NexusAutonomousButton density="compact" variant="brand" icon={Download} onClick={onDownload} disabled={isBusy || item.status !== "READY"}>
              Descargar
            </NexusAutonomousButton>
            <div className="flex items-center" style={{ gap: "var(--space-sm)" }}>
              <NexusAutonomousButton density="compact" variant="secondary" isIconOnly icon={RefreshCw} onClick={onExtend} disabled={isBusy} aria-label="Extender 30 días" />
              <NexusAutonomousButton density="compact" variant="secondary" isIconOnly icon={Trash2} onClick={onDelete} disabled={isBusy} aria-label="Eliminar archivo" className="hidden sm:inline-flex hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600" />
            </div>
          </div>
        </div>
      </NexusAutonomousCard>

      {item.mediaUrl && (
        <NexusMediaViewer
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          mediaType={item.mediaType}
          src={item.mediaUrl}
          poster={item.posterUrl || undefined}
          alt="Vista previa del archivo"
          presentation="gallery"
          gallery={{ category: "Bóveda", title: item.downloadName }}
        />
      )}
    </>
  );
};
