import React from "react";
import { Edit2, Film, Image as ImageIcon } from "lucide-react";
import { NexusSectionCard } from "../../ui/NexusCard";
import { NexusCardButton } from "../../ui/NexusButton";
import {
  StorefrontTemplateConfig,
  storefrontTemplateMeta,
} from "./storefrontTemporaryTemplates";

interface StorefrontTemplateCardProps {
  template: StorefrontTemplateConfig;
  onEdit: () => void;
}

export const StorefrontTemplateCard: React.FC<StorefrontTemplateCardProps> = ({
  template,
  onEdit,
}) => {
  const meta = storefrontTemplateMeta[template.mode];
  const hasMedia = Boolean(template.mediaUrl);
  const hasCta = Boolean(template.primaryText && template.primaryHref);
  const MediaIcon = template.mediaType === "VIDEO" ? Film : ImageIcon;

  return (
    <NexusSectionCard
      icon={meta.icon}
      iconVariant={meta.iconVariant}
      title={meta.label}
      subtitle={template.title}
      actions={
        <NexusCardButton
          type="button"
          variant="secondary"
          icon={Edit2}
          onClick={onEdit}
        >
          Editar
        </NexusCardButton>
      }
      rightContent={
        <div className="flex flex-col items-start md:items-end" style={{ gap: "var(--space-xs)" }}>
          <span className="text-label uppercase tracking-[0.15em] text-text-muted">
            {hasMedia ? "Configurada" : "Sin medio"}
          </span>
          <span className="text-secondary text-text-muted/70">
            {hasMedia ? (
              <span className="inline-flex items-center" style={{ gap: "var(--space-xs)" }}>
                <MediaIcon size={14} />
                {template.mediaType === "VIDEO" ? "Video" : "Foto"}
              </span>
            ) : (
              "Fondo técnico"
            )}
          </span>
          {hasCta && (
            <span className="text-label uppercase tracking-[0.15em] text-brand-600">
              CTA activo
            </span>
          )}
        </div>
      }
    />
  );
};
