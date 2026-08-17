import React from "react";
import { Download, Image as ImageIcon, Palette, Ticket } from "lucide-react";
import { apiRaffles } from "../../api";
import { Raffle } from "../../types";
import { NexusSectionButton } from "../ui/NexusButton";
import { NexusAutonomousCard } from "../ui/NexusCard";
import { NexusAutonomousIcon } from "../ui/NexusIcon";
import { NexusSection } from "../ui/NexusSection";
import {
  buildRaffleTicketNumbers,
  type TicketOperationalStatus,
} from "./RaffleOverviewView";
import { useRaffleOperationalOverview } from "./useRaffleOperationalOverview";

interface RaffleMaterialsViewProps {
  raffle: Raffle;
  showToast: (message: string, type?: "success" | "error") => void;
}

type MaterialKind = "raffle-card" | "ticket-board";

const statusColors: Record<TicketOperationalStatus, string> = {
  available: "#b08968",
  reserved: "#f59e0b",
  paid: "#10b981",
  review: "#3b82f6",
};

const statusLabels: Record<TicketOperationalStatus, string> = {
  available: "Disponible",
  reserved: "Apartado",
  paid: "Pagado",
  review: "En revisión",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value?: string | null) => {
  if (!value) return "Fecha por confirmar";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
};

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const downloadFile = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const downloadSvgAsPng = async (svg: string, fileName: string) => {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = svgUrl;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar la imagen.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!png) throw new Error("No se pudo exportar el PNG.");
    downloadFile(png, fileName);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
};

const buildMaterialSvg = ({
  kind,
  raffle,
  ticketNumbers,
  statusByNumber,
}: {
  kind: MaterialKind;
  raffle: Raffle;
  ticketNumbers: string[];
  statusByNumber: Map<string, TicketOperationalStatus>;
}) => {
  const width = 1080;
  const height = 1920;
  const title = escapeXml(raffle.title);
  const available = ticketNumbers.filter(
    (number) => (statusByNumber.get(number) || "available") === "available",
  ).length;
  const background =
    raffle.imageType === "VIDEO"
      ? raffle.imagePoster || ""
      : raffle.image || raffle.imagePoster || "";
  const image = background
    ? `<image href="${escapeXml(background)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" opacity="0.46" />`
    : "";
  const overlay = `<rect width="${width}" height="${height}" fill="#22140f" opacity="0.74" />`;

  if (kind === "raffle-card") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="#2b1a13" />
      ${image}${overlay}
      <text x="72" y="150" fill="#f4eee9" font-family="Inter,Arial,sans-serif" font-size="28" font-weight="700" letter-spacing="3">MATERIALES DE LA RIFA</text>
      <text x="72" y="420" fill="#fffaf6" font-family="Inter,Arial,sans-serif" font-size="64" font-weight="800">${title}</text>
      <rect x="72" y="650" width="440" height="190" rx="32" fill="#6b4c38" opacity="0.94" />
      <rect x="568" y="650" width="440" height="190" rx="32" fill="#6b4c38" opacity="0.94" />
      <text x="104" y="715" fill="#f4eee9" font-family="Inter,Arial,sans-serif" font-size="24" font-weight="700">PRECIO POR BOLETO</text>
      <text x="104" y="795" fill="#fffaf6" font-family="Inter,Arial,sans-serif" font-size="58" font-weight="800">${escapeXml(formatCurrency(raffle.ticketPrice))}</text>
      <text x="600" y="715" fill="#f4eee9" font-family="Inter,Arial,sans-serif" font-size="24" font-weight="700">BOLETOS DISPONIBLES</text>
      <text x="600" y="795" fill="#fffaf6" font-family="Inter,Arial,sans-serif" font-size="58" font-weight="800">${available}</text>
      <text x="72" y="1010" fill="#f4eee9" font-family="Inter,Arial,sans-serif" font-size="30" font-weight="700">FECHA Y HORA</text>
      <text x="72" y="1070" fill="#fffaf6" font-family="Inter,Arial,sans-serif" font-size="36" font-weight="700">${escapeXml(formatDate(raffle.drawDate))}</text>
      <text x="72" y="1790" fill="#f4eee9" font-family="Inter,Arial,sans-serif" font-size="25" font-weight="600">Consulta la información completa en el Storefront.</text>
    </svg>`;
  }

  const columns = 5;
  const cell = 156;
  const gap = 24;
  const startX = 54;
  const startY = 410;
  const ticketCells = ticketNumbers
    .map((number, index) => {
      const x = startX + (index % columns) * (cell + gap);
      const y = startY + Math.floor(index / columns) * (cell + gap);
      const status = statusByNumber.get(number) || "available";
      return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="26" fill="${statusColors[status]}" opacity="0.95" />
        <text x="${x + cell / 2}" y="${y + 94}" text-anchor="middle" fill="#fffaf6" font-family="Inter,Arial,sans-serif" font-size="34" font-weight="800">${escapeXml(number)}</text>`;
    })
    .join("");
  const legend = (["available", "reserved", "paid", "review"] as TicketOperationalStatus[])
    .map((status, index) => {
      const x = 72 + (index % 2) * 490;
      const y = 1660 + Math.floor(index / 2) * 62;
      return `<circle cx="${x}" cy="${y - 8}" r="10" fill="${statusColors[status]}" /><text x="${x + 24}" y="${y}" fill="#f4eee9" font-family="Inter,Arial,sans-serif" font-size="25">${statusLabels[status]}</text>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#2b1a13" />
    ${image}${overlay}
    <text x="${width / 2}" y="150" text-anchor="middle" fill="#fffaf6" font-family="Inter,Arial,sans-serif" font-size="34" font-weight="800" letter-spacing="2">BOLETOS DISPONIBLES</text>
    <text x="${width / 2}" y="228" text-anchor="middle" fill="#f4eee9" font-family="Inter,Arial,sans-serif" font-size="27">${title}</text>
    ${ticketCells}
    ${legend}
  </svg>`;
};

export const RaffleMaterialsView: React.FC<RaffleMaterialsViewProps> = ({
  raffle,
  showToast,
}) => {
  const [kind, setKind] = React.useState<MaterialKind>("raffle-card");
  const [ticketAssignments, setTicketAssignments] = React.useState<
    Array<{ mainTicketNumber: string; extraOpportunities: string[] }>
  >([]);
  const { overview, isLoading } = useRaffleOperationalOverview(
    raffle.id,
    showToast,
  );
  const ticketNumbers = React.useMemo(
    () => buildRaffleTicketNumbers(raffle),
    [raffle],
  );
  const statusByNumber = React.useMemo(
    () =>
      new Map<string, TicketOperationalStatus>(
        (overview?.ticketStatuses || []).map((entry) => [
          entry.ticketNumber,
          entry.status,
        ]),
      ),
    [overview?.ticketStatuses],
  );

  React.useEffect(() => {
    if (raffle.opportunities <= 1) {
      setTicketAssignments([]);
      return;
    }
    void apiRaffles.getTicketAssignments(raffle.id).then(setTicketAssignments).catch(() => {
      setTicketAssignments([]);
    });
  }, [raffle.id, raffle.opportunities]);

  const download = async () => {
    try {
      const svg = buildMaterialSvg({ kind, raffle, ticketNumbers, statusByNumber });
      const fileName = `${kind === "raffle-card" ? "ficha" : "boletera"}-rifa-${raffle.id}.png`;
      try {
        await downloadSvgAsPng(svg, fileName);
      } catch {
        downloadFile(
          new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
          fileName.replace(/\.png$/, ".svg"),
        );
      }
      showToast("Material descargado correctamente.");
    } catch {
      showToast("No se pudo generar el material.", "error");
    }
  };

  const available = ticketNumbers.filter(
    (number) => (statusByNumber.get(number) || "available") === "available",
  ).length;

  return (
    <div className="flex flex-col" style={{ gap: "var(--space-lg)" }}>
      <NexusSection
        title="Materiales de la Rifa"
        subtitle="Genera piezas visuales controladas para comunicar esta rifa."
        icon={Palette}
        action={
          <NexusSectionButton variant="brand" icon={Download} onClick={download}>
            Descargar material
          </NexusSectionButton>
        }
      >
        <div className="grid min-w-0 gap-[var(--space-lg)] lg:grid-cols-[minmax(220px,0.32fr)_minmax(0,0.68fr)]">
          <div className="flex flex-col" style={{ gap: "var(--space-md)" }}>
            <div>
              <p className="text-label text-text-muted">FORMATO</p>
              <p className="text-secondary text-text-muted" style={{ marginTop: "var(--space-xs)" }}>
                Elige una plantilla antes de exportar.
              </p>
            </div>
            <div className="flex flex-col" style={{ gap: "var(--space-sm)" }}>
              <NexusSectionButton
                variant={kind === "raffle-card" ? "brand" : "secondary"}
                icon={ImageIcon}
                onClick={() => setKind("raffle-card")}
              >
                Ficha de la Rifa
              </NexusSectionButton>
              <NexusSectionButton
                variant={kind === "ticket-board" ? "brand" : "secondary"}
                icon={Ticket}
                onClick={() => setKind("ticket-board")}
              >
                Boletera Visual
              </NexusSectionButton>
            </div>
            <div className="text-secondary text-text-muted" style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
              <span>{raffle.ticketQuantity} boletos configurados</span>
              <span>{isLoading ? "Actualizando disponibilidad..." : `${available} disponibles`}</span>
              {raffle.opportunities > 1 && (
                <span>{ticketAssignments.length} asignaciones de oportunidades consultadas</span>
              )}
            </div>
          </div>

          <div className="flex justify-center rounded-[var(--sf-radius-card)] border border-border-subtle bg-surface-muted p-[var(--space-md)]">
            <div className="w-full max-w-[360px] overflow-hidden rounded-[var(--sf-radius-card-inner)] bg-[#2b1a13] shadow-sm">
              <div className="relative aspect-[9/16] w-full">
                {raffle.image || raffle.imagePoster ? (
                  <img
                    src={raffle.imagePoster || raffle.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-50"
                  />
                ) : null}
                <div className="absolute inset-0 bg-[#22140f]/75" />
                {kind === "raffle-card" ? (
                  <div className="relative flex h-full flex-col justify-between p-[var(--space-lg)] text-[#fffaf6]">
                    <div>
                      <p className="text-label tracking-[0.12em]">MATERIALES DE LA RIFA</p>
                      <h3 className="mt-[var(--space-xl)] text-h2">{raffle.title}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-[var(--space-sm)] text-center">
                      <div className="rounded-[var(--sf-radius-card-inner)] bg-[#6b4c38]/90 p-[var(--space-md)]">
                        <p className="text-label">PRECIO</p>
                        <strong className="text-h3">{formatCurrency(raffle.ticketPrice)}</strong>
                      </div>
                      <div className="rounded-[var(--sf-radius-card-inner)] bg-[#6b4c38]/90 p-[var(--space-md)]">
                        <p className="text-label">DISPONIBLES</p>
                        <strong className="text-h3">{available}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative h-full p-[var(--space-md)] text-[#fffaf6]">
                    <div className="mb-[var(--space-md)] text-center">
                      <p className="text-label tracking-[0.12em]">BOLETOS DISPONIBLES</p>
                      <p className="text-secondary mt-[var(--space-xs)] line-clamp-2">{raffle.title}</p>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {ticketNumbers.map((number) => {
                        const status = statusByNumber.get(number) || "available";
                        return (
                          <span
                            key={number}
                            className="flex aspect-square items-center justify-center rounded-[var(--sf-radius-card-inner)] text-[10px] font-bold"
                            style={{ backgroundColor: statusColors[status] }}
                          >
                            {number}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </NexusSection>

      <NexusAutonomousCard>
        <div className="flex items-start gap-[var(--space-md)]">
          <NexusAutonomousIcon icon={Ticket} variant="muted" />
          <div>
            <h3 className="text-h3 text-text-main">Datos operativos protegidos</h3>
            <p className="text-secondary text-text-muted" style={{ marginTop: "var(--space-xs)" }}>
              La boletera visual solo muestra números y estados. Nunca incluye nombres, teléfonos ni datos de pago.
            </p>
          </div>
        </div>
      </NexusAutonomousCard>
    </div>
  );
};
