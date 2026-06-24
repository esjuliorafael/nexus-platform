import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { CheckCircle2, Loader2, UploadCloud, XCircle } from "lucide-react";
import { apiUpload, MediaUploadResult } from "../../api";

type UploadTaskStatus = "uploading" | "finalizing" | "ready" | "failed";

interface UploadTask {
  id: string;
  fileName: string;
  label: string;
  progress: number;
  status: UploadTaskStatus;
  error?: string;
}

interface StartDirectVideoUploadOptions {
  label?: string;
}

interface UploadQueueContextValue {
  tasks: UploadTask[];
  startDirectVideoUpload: (
    file: File,
    options?: StartDirectVideoUploadOptions,
  ) => Promise<MediaUploadResult>;
}

const UploadQueueContext = createContext<UploadQueueContextValue | null>(null);

export function useUploadQueue() {
  const value = useContext(UploadQueueContext);
  if (!value) {
    throw new Error("useUploadQueue debe usarse dentro de UploadQueueProvider");
  }
  return value;
}

interface UploadQueueProviderProps {
  children: React.ReactNode;
  showToast: (message: string, type?: "success" | "error") => void;
}

export const UploadQueueProvider: React.FC<UploadQueueProviderProps> = ({
  children,
  showToast,
}) => {
  const [tasks, setTasks] = useState<UploadTask[]>([]);

  const patchTask = useCallback((id: string, patch: Partial<UploadTask>) => {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    );
  }, []);

  const startDirectVideoUpload = useCallback(
    async (file: File, options?: StartDirectVideoUploadOptions) => {
      const directUpload = await apiUpload.createDirectVideoUpload(file);
      const asset = directUpload.asset;
      const taskLabel = options?.label || "Video";

      setTasks((current) => [
        ...current,
        {
          id: asset.assetId,
          fileName: file.name,
          label: taskLabel,
          progress: 0,
          status: "uploading",
        },
      ]);

      void (async () => {
        try {
          await apiUpload.uploadToSignedUrl(directUpload.uploadUrl, file, (progress) => {
            patchTask(asset.assetId, { progress, status: "uploading" });
          });
          patchTask(asset.assetId, { progress: 100, status: "finalizing" });
          await apiUpload.completeDirectUpload(asset.assetId);
          patchTask(asset.assetId, { progress: 100, status: "ready" });
          showToast(`${taskLabel} subido correctamente`, "success");
          window.dispatchEvent(
            new CustomEvent("nexus:media-upload-complete", {
              detail: { assetId: asset.assetId },
            }),
          );
          window.setTimeout(() => {
            setTasks((current) => current.filter((task) => task.id !== asset.assetId));
          }, 5000);
        } catch (error) {
          await apiUpload.completeDirectUpload(asset.assetId).catch(() => undefined);
          const message =
            error instanceof Error ? error.message : "No se pudo subir el video.";
          patchTask(asset.assetId, {
            status: "failed",
            error: message,
          });
          showToast(`No se pudo subir ${taskLabel.toLowerCase()}`, "error");
          window.dispatchEvent(
            new CustomEvent("nexus:media-upload-failed", {
              detail: { assetId: asset.assetId },
            }),
          );
        }
      })();

      return asset;
    },
    [patchTask, showToast],
  );

  const value = useMemo(
    () => ({ tasks, startDirectVideoUpload }),
    [startDirectVideoUpload, tasks],
  );

  return (
    <UploadQueueContext.Provider value={value}>
      {children}
      <UploadQueueStatus tasks={tasks} />
    </UploadQueueContext.Provider>
  );
};

const UploadQueueStatus: React.FC<{ tasks: UploadTask[] }> = ({ tasks }) => {
  if (tasks.length === 0) return null;

  return (
    <div
      className="fixed right-[var(--space-md)] z-[95] w-[min(24rem,calc(100vw-var(--space-xl)))]"
      style={{
        bottom: "calc(var(--space-xl) + env(safe-area-inset-bottom))",
      }}
    >
      <div
        className="bg-surface border border-border shadow-2xl shadow-stone-900/10"
        style={{
          borderRadius: "var(--radius-card)",
          padding: "var(--space-base)",
        }}
      >
        <div className="flex flex-col" style={{ gap: "var(--space-sm)" }}>
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center"
              style={{ gap: "var(--space-sm)" }}
            >
              <div
                className="grid shrink-0 place-items-center bg-stone-100 text-stone-700"
                style={{
                  width: "var(--size-icon-card)",
                  height: "var(--size-icon-card)",
                  borderRadius: "var(--radius-card-nested-compact)",
                }}
              >
                {task.status === "ready" ? (
                  <CheckCircle2 size={18} className="text-emerald-600" />
                ) : task.status === "failed" ? (
                  <XCircle size={18} className="text-red-600" />
                ) : task.status === "finalizing" ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <UploadCloud size={18} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-label font-bold text-text-main">
                  {task.label}
                </p>
                <p className="truncate text-caption text-text-muted">
                  {task.status === "failed"
                    ? task.error || "Error de subida"
                    : task.status === "finalizing"
                      ? "Confirmando archivo"
                      : task.status === "ready"
                        ? "Listo"
                        : `${task.progress}%`}
                </p>
                <div
                  className="mt-[var(--space-xs)] h-1 overflow-hidden bg-stone-100"
                  style={{ borderRadius: "999px" }}
                >
                  <div
                    className={`h-full ${
                      task.status === "failed" ? "bg-red-500" : "bg-brand-500"
                    }`}
                    style={{
                      width: `${task.status === "failed" ? 100 : task.progress}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
