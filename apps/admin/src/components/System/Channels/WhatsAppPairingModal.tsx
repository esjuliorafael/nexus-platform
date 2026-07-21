import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Copy, KeyRound, QrCode } from "lucide-react";
import { NexusAutonomousButton } from "../../ui/NexusButton";
import { NexusModal } from "../../ui/NexusModal";

export type WhatsAppPairingMethod = "qr" | "pairing_code";

export interface WhatsAppPairingData {
  method: WhatsAppPairingMethod;
  instanceName: string;
  base64?: string;
  pairingCode?: string;
  timeLeft: number;
}

interface WhatsAppPairingModalProps {
  data: WhatsAppPairingData | null;
  onClose: () => void;
  onRegenerate: (method: WhatsAppPairingMethod) => void;
  zIndex?: number;
}

export const WhatsAppPairingModal: React.FC<WhatsAppPairingModalProps> = ({
  data,
  onClose,
  onRegenerate,
  zIndex = 300,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => setCopied(false), [data?.pairingCode]);

  const displayCode = useMemo(() => {
    const value = data?.pairingCode?.replace(/\s|-/g, "").toUpperCase() || "";
    return value.length > 4 ? `${value.slice(0, 4)}-${value.slice(4)}` : value;
  }, [data?.pairingCode]);

  if (!data) return null;

  const isPairingCode = data.method === "pairing_code";
  const MethodIcon = isPairingCode ? KeyRound : QrCode;

  const copyCode = async () => {
    if (!data.pairingCode) return;
    await navigator.clipboard.writeText(data.pairingCode.replace(/\s|-/g, ""));
    setCopied(true);
  };

  return (
    <NexusModal
      isOpen
      title={isPairingCode ? "Código de emparejamiento" : "Vinculación por QR"}
      eyebrow="WhatsApp"
      icon={MethodIcon}
      onClose={onClose}
      size="compact"
      zIndex={zIndex}
    >
      <div className="flex w-full min-w-0 max-w-full flex-col items-center overflow-x-hidden text-center" style={{ gap: "var(--space-lg)" }}>
        {data.timeLeft === 0 ? (
          <div
            className="flex w-full flex-col items-center justify-center border border-border-main bg-bg-muted"
            style={{
              minHeight: "15rem",
              gap: "var(--space-md)",
              padding: "var(--padding-inner)",
              borderRadius: "var(--radius-inner-visual)",
            }}
          >
            <AlertCircle size={48} className="text-amber-500" />
            <p className="text-secondary text-text-muted">El código expiró.</p>
            <NexusAutonomousButton
              onClick={() => onRegenerate(data.method)}
              density="compact"
              variant="brand"
              icon={MethodIcon}
            >
              Generar nuevamente
            </NexusAutonomousButton>
          </div>
        ) : isPairingCode ? (
          <div className="flex w-full min-w-0 max-w-full flex-col" style={{ gap: "var(--space-md)" }}>
            <div
              className="relative flex min-h-36 items-center justify-center border border-border-main bg-bg-muted"
              style={{
                padding: "var(--padding-inner)",
                borderRadius: "var(--radius-inner-visual)",
              }}
            >
              <span className="break-all text-h1 font-black tabular-nums text-text-main sm:text-display">
                {displayCode}
              </span>
              <span
                className="absolute flex items-center justify-center bg-stone-950 text-label font-black tabular-nums text-white"
                style={{
                  top: "calc(var(--space-sm) * -1)",
                  right: "calc(var(--space-sm) * -1)",
                  width: "var(--size-icon-card)",
                  height: "var(--size-icon-card)",
                  border: "4px solid var(--bg-card)",
                  borderRadius: "var(--radius-card-inner)",
                }}
              >
                {data.timeLeft}
              </span>
            </div>
            <p className="text-secondary text-text-muted">
              En WhatsApp abre Dispositivos vinculados, elige Vincular con número de teléfono e ingresa este código.
            </p>
            <NexusAutonomousButton
              onClick={copyCode}
              density="compact"
              variant="secondary"
              icon={copied ? Check : Copy}
              className="w-full"
            >
              {copied ? "Código copiado" : "Copiar código"}
            </NexusAutonomousButton>
          </div>
        ) : (
          <div
            className="relative inline-block max-w-full border-8 border-bg-muted bg-white shadow-inner"
            style={{
              padding: "var(--padding-inner)",
              borderRadius: "var(--radius-inner-visual)",
            }}
          >
            <img
              src={data.base64}
              alt="Código QR de WhatsApp"
              className="aspect-square h-auto max-w-full"
              style={{
                width: "min(15rem, calc(100dvw - (var(--padding-inner) * 4) - 1rem))",
                borderRadius: "var(--radius-card-nested)",
              }}
            />
            <span
              className="absolute flex items-center justify-center bg-stone-950 text-h2 font-black tabular-nums text-white"
              style={{
                top: "calc(var(--space-md) * -1)",
                right: "calc(var(--space-md) * -1)",
                width: "var(--size-icon-autonomous)",
                height: "var(--size-icon-autonomous)",
                border: "6px solid var(--bg-card)",
                borderRadius: "var(--radius-card-inner)",
              }}
            >
              {data.timeLeft}
            </span>
          </div>
        )}

        <div
          className="inline-flex items-center justify-center bg-emerald-50/50 text-emerald-600"
          style={{
            gap: "var(--space-sm)",
            paddingBlock: "var(--space-sm)",
            paddingInline: "var(--space-md)",
            borderRadius: "var(--radius-card-inner)",
          }}
        >
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-current shadow-[0_0_10px_currentColor]" />
          <p className="text-label font-black">Esperando dispositivo...</p>
        </div>
      </div>
    </NexusModal>
  );
};
