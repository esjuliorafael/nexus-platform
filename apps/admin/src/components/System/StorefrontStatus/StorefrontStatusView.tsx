import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { MonitorPause, MonitorPlay, Sparkles } from "lucide-react";
import { apiSystem } from "../../../api";
import { NexusSectionCard } from "../../ui/NexusCard";
import { NexusHero } from "../../ui/NexusHero";
import { NexusSection } from "../../ui/NexusSection";
import { NexusSegmentedControl } from "../../ui/NexusSegmentedControl";
import { StorefrontTemplateCard } from "./StorefrontTemplateCard";
import { StorefrontTemplateForm } from "./StorefrontTemplateForm";
import {
  StorefrontTemplateConfig,
  StorefrontTemplateMode,
  getDefaultStorefrontTemplate,
  readStorefrontTemplateFromSettings,
} from "./storefrontTemporaryTemplates";

type StorefrontStatus = "LIVE" | "MAINTENANCE" | "COMING_SOON";

export interface StorefrontStatusViewRef {
  handleSave: () => void;
}

interface StorefrontStatusViewProps {
  showToast: (message: string, type?: "success" | "error") => void;
}

const statusCopy: Record<
  StorefrontStatus,
  { label: string; title: string; description: string }
> = {
  LIVE: {
    label: "Publicado",
    title: "Storefront Publicado",
    description: "La tienda pública funciona con normalidad.",
  },
  MAINTENANCE: {
    label: "Mantenimiento",
    title: "Modo Mantenimiento",
    description: "El Storefront mostrará una pantalla temporal para visitantes.",
  },
  COMING_SOON: {
    label: "Próximamente",
    title: "Modo Lanzamiento",
    description: "Ideal para preparar una temporada, colección o reapertura.",
  },
};

const statusOptions: Array<{
  value: StorefrontStatus;
  label: string;
  activeClassName: string;
}> = [
  {
    value: "LIVE",
    label: "Publicado",
    activeClassName: "bg-white text-emerald-600 shadow-sm",
  },
  {
    value: "MAINTENANCE",
    label: "Mantto.",
    activeClassName: "bg-white text-orange-600 shadow-sm",
  },
  {
    value: "COMING_SOON",
    label: "Próximo",
    activeClassName: "bg-white text-brand-600 shadow-sm",
  },
];

export const StorefrontStatusView = forwardRef<
  StorefrontStatusViewRef,
  StorefrontStatusViewProps
>(({ showToast }, ref) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<StorefrontTemplateMode | null>(null);
  const templateFormRef = useRef<{ handleSave: () => void }>(null);
  const [config, setConfig] = useState({
    status: "LIVE" as StorefrontStatus,
  });
  const [templates, setTemplates] = useState<
    Record<StorefrontTemplateMode, StorefrontTemplateConfig>
  >({
    maintenance: getDefaultStorefrontTemplate("maintenance"),
    comingSoon: getDefaultStorefrontTemplate("comingSoon"),
  });

  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      try {
        const data = await apiSystem.getConfig();
        const rawStatus = data.storefront_status as StorefrontStatus | undefined;
        setConfig({
          status:
            rawStatus === "MAINTENANCE" || rawStatus === "COMING_SOON"
              ? rawStatus
              : "LIVE",
        });
        setTemplates({
          maintenance: readStorefrontTemplateFromSettings(data, "maintenance"),
          comingSoon: readStorefrontTemplateFromSettings(data, "comingSoon"),
        });
      } catch (error) {
        console.error("Error loading storefront status:", error);
        showToast("Error al cargar el estado del Storefront", "error");
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [showToast]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await apiSystem.updateConfig({
        storefront_status: config.status,
      });
      showToast("Estado del Storefront actualizado", "success");
    } catch (error) {
      showToast("Error al guardar el estado del Storefront", "error");
    } finally {
      setIsSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    handleSave: () => {
      if (editingTemplate) {
        templateFormRef.current?.handleSave();
        return;
      }

      handleSave();
    },
  }));

  const selectedStatus = statusCopy[config.status];
  const isUnavailable = config.status !== "LIVE";

  if (isLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center animate-in fade-in duration-500"
        style={{ gap: "var(--space-md)", paddingBlock: "var(--space-3xl)" }}
      >
        <div
          className="border-4 border-brand-500 border-t-transparent animate-spin"
          style={{
            width: "var(--size-stage-container-compact)",
            height: "var(--size-stage-container-compact)",
            borderRadius: "var(--radius-inner-visual)",
            animationTimingFunction: "var(--ease-emil)",
          }}
        />
        <p className="text-label text-text-muted">Cargando disponibilidad...</p>
      </div>
    );
  }

  if (editingTemplate) {
    return (
      <StorefrontTemplateForm
        ref={templateFormRef}
        template={templates[editingTemplate]}
        onBack={() => setEditingTemplate(null)}
        onSave={(template) => {
          setTemplates((current) => ({
            ...current,
            [template.mode]: template,
          }));
          setEditingTemplate(null);
        }}
        showToast={showToast}
      />
    );
  }

  return (
    <div
      key="storefront-status-content"
      className="flex flex-col animate-in fade-in duration-300"
      style={{ gap: "var(--space-lg)", paddingBottom: "var(--space-xl)" }}
    >
      <NexusHero
        title="Estado del Storefront"
        subtitle="Disponibilidad pública"
        icon={isUnavailable ? MonitorPause : MonitorPlay}
        variant="dark"
        badge={selectedStatus.label}
        badgeValue={isUnavailable ? "Pantalla temporal activa" : "Operación normal"}
      />

      <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
        <NexusSection
          title="Disponibilidad"
          subtitle="Controla qué ve el visitante al entrar al Storefront"
          icon={MonitorPause}
          iconVariant={isUnavailable ? "orange" : "emerald"}
        >
          <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
            <NexusSectionCard
              icon={isUnavailable ? MonitorPause : MonitorPlay}
              iconVariant={isUnavailable ? "orange" : "emerald"}
              title={selectedStatus.title}
              subtitle={selectedStatus.description}
              rightContent={
                <NexusSegmentedControl
                  value={config.status}
                  ariaLabel="Modo de disponibilidad del Storefront"
                  options={statusOptions}
                  onChange={(status) => setConfig({ ...config, status })}
                />
              }
            />
          </div>
        </NexusSection>

        <NexusSection
          title="Pantallas Temporales"
          subtitle="Plantillas editoriales para mantenimiento y próximamente"
          icon={Sparkles}
          iconVariant="brand"
        >
          <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
            <StorefrontTemplateCard
              template={templates.maintenance}
              onEdit={() => setEditingTemplate("maintenance")}
            />
            <StorefrontTemplateCard
              template={templates.comingSoon}
              onEdit={() => setEditingTemplate("comingSoon")}
            />
          </div>
        </NexusSection>
      </div>

    </div>
  );
});
