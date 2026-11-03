import { createHash } from "node:crypto";
import sharp from "sharp";
import { storageService } from "../../../services/storage.service";

export type ParticipationTicketStatus = "RESERVED" | "CONFIRMED" | "RELEASED";

export type ParticipationTicketData = {
  status: ParticipationTicketStatus;
  raffleName: string;
  drawDate: string;
  participantName: string;
  eventDate: string;
  ticketNumbers: string[];
  opportunities: Array<{ ticketNumber: string; numbers: string[] }>;
  amount: string;
  expiresAt?: string | null;
  reservedDuration?: string | null;
  releaseReason?: "DEADLINE" | "CANCELLED";
  brandName?: string;
};

const layoutWidth = 402;
const renderWidth = 900;
const renderScale = renderWidth / layoutWidth;
const bodyX = 24;
const bodyWidth = layoutWidth - bodyX * 2;
const colors = {
  reserved: { header: "#a64b16", accent: "#71320e", soft: "#ffe0bd", pale: "#faf5f1", edge: "#ead8cd", payment: "#1d1a23" },
  confirmed: { header: "#176b52", accent: "#135541", soft: "#d8f6e8", pale: "#f0faf6", edge: "#cce8dc", payment: "#153d33" },
  released: { header: "#684451", accent: "#653244", soft: "#f2dfe5", pale: "#f5f3f4", edge: "#ded9dc", payment: "#2b292e" },
};

const escapeXml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

function wrapText(value: string, maxCharacters: number) {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (!line) {
      line = word;
    } else if (`${line} ${word}`.length <= maxCharacters) {
      line += ` ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function svgText(
  value: string,
  x: number,
  y: number,
  options: { size?: number; weight?: number; fill?: string; anchor?: string; max?: number; lineHeight?: number; letterSpacing?: number } = {},
) {
  const {
    size = 24,
    weight = 400,
    fill = "#211d24",
    anchor = "start",
    max = 48,
    lineHeight = Math.ceil(size * 1.38),
    letterSpacing = 0,
  } = options;
  const lines = wrapText(value, max);
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" letter-spacing="${letterSpacing}" fill="${fill}">${lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join("")}</text>`;
}

function formatCount(value: number) {
  return `${value} ${value === 1 ? "número" : "números"}`;
}

function buildTicketSvg(data: ParticipationTicketData) {
  const theme =
    data.status === "RESERVED"
      ? colors.reserved
      : data.status === "CONFIRMED"
        ? colors.confirmed
        : colors.released;
  const statusLabel =
    data.status === "RESERVED"
      ? "APARTADA"
      : data.status === "CONFIRMED"
        ? "CONFIRMADA"
        : "LIBERADA";
  const detailLabel =
    data.status === "RESERVED"
      ? "TIEMPO DE APARTADO"
      : data.status === "CONFIRMED"
        ? "PAGO CONFIRMADO"
        : "CAUSA DE LIBERACIÓN";
  const detailValue =
    data.status === "RESERVED"
      ? data.expiresAt
        ? `Vence el ${data.expiresAt}`
        : "Sin límite automático"
      : data.status === "CONFIRMED"
        ? data.eventDate
        : data.releaseReason === "DEADLINE"
          ? "Plazo de pago vencido"
          : "Participación cancelada";
  const detailCopy =
    data.status === "RESERVED"
      ? data.expiresAt
        ? `El apartado es temporal. Tienes ${data.reservedDuration || "24 horas"} para confirmar tu pago; si el plazo vence, tu selección se libera automáticamente.`
        : "Tu selección permanece apartada y no tiene una liberación automática configurada."
      : data.status === "CONFIRMED"
        ? "Tu participación quedó registrada para la rifa. Por ahora, no necesitas realizar otra acción."
        : data.releaseReason === "DEADLINE"
          ? "El plazo para completar el pago venció. Tu selección se liberó y ya no está apartada a tu nombre."
          : "La participación se canceló. Tu selección ya no está apartada a tu nombre.";

  const titleLines = wrapText(data.raffleName || "Rifa", 27);
  const drawDateLines = wrapText(data.drawDate || "Fecha por confirmar", 31);
  const drawLabelLines = wrapText("Fecha y hora de la rifa", 15);
  const note =
    "Si fuera necesario reprogramar la rifa antes del evento de referencia, la nueva fecha se publicará y comunicará a los participantes.";
  const noteLines = wrapText(note, 68);
  const headerTitleY = 143;
  const drawY = headerTitleY + titleLines.length * 26 + 5;
  const drawRowLines = Math.max(drawDateLines.length, drawLabelLines.length);
  const noteY = drawY + drawRowLines * 14 + 20;
  const headerBottom = noteY + noteLines.length * 14 + 28;
  const bodyTop = headerBottom + 20;

  const tickets = Array.from(new Set(data.ticketNumbers));
  const ticketRows = Math.ceil(tickets.length / 3);
  const ticketsCardHeight = 16 + 12 + 12 + ticketRows * 40 + Math.max(0, ticketRows - 1) * 8 + 16;
  const opportunities = data.opportunities.filter((entry) => entry.numbers.length);
  const opportunityRows = opportunities.map((entry) => ({
    ...entry,
    lines: wrapText(entry.numbers.join(", "), 54),
  }));
  const opportunitiesHeight = opportunityRows.length
    ? 16 + 12 + 6 + opportunityRows.reduce((sum, entry) => sum + Math.max(28, entry.lines.length * 14 + 12), 0) + 16
    : 0;

  const participantNameLines = wrapText(data.participantName || "Participante", 24);
  const eventDateLines = wrapText(data.eventDate, 18);
  const metadataHeight = 34 + Math.max(participantNameLines.length * 20, eventDateLines.length * 18);
  let y = bodyTop;
  const header = [
    svgText("MI PARTICIPACIÓN", 70, 37, { size: 10, weight: 700, fill: "#ffffffb8", letterSpacing: 2.2 }),
    svgText(data.brandName || "Rancho Las Trojes", 70, 55, { size: 14, weight: 700, fill: "#ffffff" }),
    `<rect x="280" y="24" width="98" height="24" rx="12" fill="${theme.soft}"/>`,
    svgText(statusLabel, 329, 40, { size: 10, weight: 700, fill: theme.accent, anchor: "middle", letterSpacing: 0.8 }),
    svgText("RIFA", bodyX, 108, { size: 10, weight: 700, fill: "#ffffffa8", letterSpacing: 2 }),
    ...titleLines.map((line, index) => svgText(line, bodyX, headerTitleY + index * 26, { size: 24, weight: 700, fill: "#ffffff", max: 100, lineHeight: 26 })),
    `<circle cx="42" cy="${drawY - 4}" r="7" fill="none" stroke="#ffffffd0" stroke-width="1.5"/><path d="M42 ${drawY - 12}v3m0 10v3m-8 -8h3m10 0h3" stroke="#ffffffd0" stroke-width="1.5" stroke-linecap="round"/>`,
    ...drawLabelLines.map((line, index) => svgText(line, 56, drawY + index * 14, { size: 12, fill: "#ffffffd0", max: 15, lineHeight: 14 })),
    ...drawDateLines.map((line, index) => svgText(line, 164, drawY + index * 14, { size: 12, weight: 700, fill: "#ffffff", max: 31, lineHeight: 14 })),
    ...noteLines.map((line, index) => svgText(line, layoutWidth / 2, noteY + index * 14, { size: 10, fill: "#ffffffa8", anchor: "middle", max: 100, lineHeight: 14 })),
  ].join("");

  const sections: string[] = [];
  const participantDateLabel =
    data.status === "RESERVED"
      ? "APARTADO"
      : data.status === "CONFIRMED"
        ? "CONFIRMACIÓN"
        : "LIBERACIÓN";
  sections.push(
    svgText("PARTICIPANTE", bodyX + 8, y + 10, { size: 10, weight: 700, fill: "#8a8390", letterSpacing: 1.6 }),
    ...participantNameLines.map((line, index) => svgText(line, bodyX + 8, y + 34 + index * 20, { size: 16, weight: 700, max: 24, lineHeight: 20 })),
    `<line x1="212" y1="${y}" x2="212" y2="${y + Math.min(metadataHeight, 56)}" stroke="#dedbe4" stroke-width="1"/>`,
    svgText(participantDateLabel, 228, y + 10, { size: 10, weight: 700, fill: "#8a8390", letterSpacing: 1.2 }),
    ...eventDateLines.map((line, index) => svgText(line, 228, y + 34 + index * 18, { size: 14, weight: 700, max: 18, lineHeight: 18 })),
  );
  y += metadataHeight;
  sections.push(`<line x1="${bodyX}" y1="${y}" x2="${bodyX + bodyWidth}" y2="${y}" stroke="#d8d4dd" stroke-width="1" stroke-dasharray="3 3"/>`);
  y += 16;

  sections.push(`<rect x="${bodyX}" y="${y}" width="${bodyWidth}" height="${ticketsCardHeight}" rx="16" fill="#ffffff" stroke="#e8e5eb" stroke-width="1"/>`);
  sections.push(svgText(data.status === "RESERVED" ? "BOLETOS APARTADOS" : data.status === "CONFIRMED" ? "BOLETOS CONFIRMADOS" : "BOLETOS LIBERADOS", bodyX + 16, y + 27, { size: 10, weight: 700, fill: "#8a8390", letterSpacing: 1.2 }));
  sections.push(svgText(formatCount(tickets.length).toUpperCase(), bodyX + bodyWidth - 16, y + 27, { size: 10, weight: 700, fill: "#8a8390", anchor: "end", letterSpacing: 0.4 }));
  tickets.forEach((ticket, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const chipWidth = (bodyWidth - 32 - 16) / 3;
    const chipX = bodyX + 16 + column * (chipWidth + 8);
    const chipY = y + 46 + row * 48;
    sections.push(`<rect x="${chipX}" y="${chipY}" width="${chipWidth}" height="40" rx="8" fill="${theme.pale}" stroke="${theme.edge}" stroke-width="1"/>`);
    sections.push(svgText(ticket, chipX + chipWidth / 2, chipY + 26, { size: 16, weight: 700, fill: theme.accent, anchor: "middle", letterSpacing: 1 }));
    if (data.status === "RELEASED") sections.push(`<line x1="${chipX + 28}" y1="${chipY + 21}" x2="${chipX + chipWidth - 28}" y2="${chipY + 21}" stroke="${theme.accent}" stroke-width="1" opacity=".65"/>`);
  });
  y += ticketsCardHeight + 12;

  if (opportunitiesHeight) {
    sections.push(`<rect x="${bodyX}" y="${y}" width="${bodyWidth}" height="${opportunitiesHeight}" rx="16" fill="#f8eee6" stroke="#ead3c3" stroke-width="1"/>`);
    sections.push(svgText("OPORTUNIDADES ADICIONALES", bodyX + 16, y + 28, { size: 10, weight: 700, fill: "#9a5a32", letterSpacing: 1.2 }));
    const opportunityCount = opportunities.reduce((sum, item) => sum + item.numbers.length, 0);
    sections.push(svgText(`${opportunityCount} EN TOTAL`, bodyX + bodyWidth - 16, y + 28, { size: 10, weight: 700, fill: "#a2765d", anchor: "end", letterSpacing: 0.4 }));
    let rowY = y + 44;
    opportunityRows.forEach((entry, entryIndex) => {
      const rowHeight = Math.max(28, entry.lines.length * 14 + 12);
      sections.push(svgText(entry.ticketNumber, bodyX + 16, rowY + 17, { size: 10, weight: 700, fill: theme.accent }));
      entry.lines.forEach((line, index) => sections.push(svgText(line, bodyX + 62, rowY + 17 + index * 14, { size: 10, weight: 600, fill: "#6f5546", max: 54, lineHeight: 14 })));
      rowY += rowHeight;
      if (entryIndex < opportunityRows.length - 1) {
        sections.push(`<line x1="${bodyX + 16}" y1="${rowY}" x2="${bodyX + bodyWidth - 16}" y2="${rowY}" stroke="#e6d3c7" stroke-width="1"/>`);
      }
    });
    y += opportunitiesHeight + 16;
  }

  const detailValueLines = wrapText(detailValue, 34);
  const detailLines = wrapText(detailCopy, 68);
  const detailCopyY = 76 + 25 + Math.max(14, detailValueLines.length * 14) + 3;
  const paymentCardHeight = Math.max(
    156,
    detailCopyY + Math.max(0, detailLines.length - 1) * 14 + 18,
  );
  sections.push(`<rect x="${bodyX}" y="${y}" width="${bodyWidth}" height="${paymentCardHeight}" rx="16" fill="${theme.payment}"/>`);
  const paymentIconX = bodyX + 16;
  const paymentIconY = y + 16;
  sections.push(`<rect x="${paymentIconX}" y="${paymentIconY}" width="36" height="36" rx="8" fill="${theme.soft}"/>`);
  sections.push(`<rect x="${paymentIconX + 9}" y="${paymentIconY + 11}" width="19" height="16" rx="3" fill="none" stroke="${theme.accent}" stroke-width="1.5"/><path d="M${paymentIconX + 11} ${paymentIconY + 11}v-2a2 2 0 0 1 1.5-2l11-2v6m-4 5h8v6h-8a3 3 0 1 1 0-6Z" fill="none" stroke="${theme.accent}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`);
  const amountLabel = data.status === "RESERVED" ? "IMPORTE PENDIENTE DE PAGO" : data.status === "CONFIRMED" ? "IMPORTE PAGADO" : "SIN PAGO CONFIRMADO";
  sections.push(svgText(amountLabel, bodyX + bodyWidth - 16, y + 14, { size: 10, weight: 700, fill: "#ffffff80", anchor: "end", letterSpacing: 1.4 }));
  if (data.status === "RELEASED") {
    sections.push(svgText("Selección liberada", bodyX + bodyWidth - 16, y + 40, { size: 16, weight: 700, fill: "#ffffff", anchor: "end" }));
  } else {
    sections.push(svgText(`$${data.amount}`, bodyX + bodyWidth - 42, y + 40, { size: 20, weight: 700, fill: "#ffffff", anchor: "end" }));
    sections.push(svgText("MXN", bodyX + bodyWidth - 16, y + 40, { size: 10, weight: 600, fill: "#ffffff80", anchor: "end" }));
  }
  const dividerY = y + 76;
  sections.push(`<line x1="${bodyX + 16}" y1="${dividerY}" x2="${bodyX + bodyWidth - 16}" y2="${dividerY}" stroke="#ffffff24" stroke-width="1"/>`);
  sections.push(svgText(detailLabel, bodyX + 16, dividerY + 25, { size: 10, weight: 700, fill: "#ffffff78", letterSpacing: 1 }));
  detailValueLines.forEach((line, index) => sections.push(svgText(line, bodyX + bodyWidth - 16, dividerY + 25 + index * 14, { size: 10, weight: 700, fill: "#ffffffde", anchor: "end", max: 34, lineHeight: 14 })));
  detailLines.forEach((line, index) => sections.push(svgText(line, bodyX + 16, y + detailCopyY + index * 14, { size: 10, fill: "#ffffffa0", max: 68, lineHeight: 14 })));
  y += paymentCardHeight + 20;

  const fullHeight = y;
  if (fullHeight * renderScale > 14_000) {
    throw new Error("El ticket excede la altura admitida para una imagen de WhatsApp.");
  }
  const renderHeight = Math.ceil(fullHeight * renderScale);
  const cutoutTop = fullHeight * 0.314;
  const ticketSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${renderWidth}" height="${renderHeight}" viewBox="0 0 ${layoutWidth} ${fullHeight}"><rect width="100%" height="100%" fill="#17151e"/><rect width="${layoutWidth}" height="${fullHeight}" rx="34" fill="#f8f7f4"/><path d="M34 0H368a34 34 0 0 1 34 34v${headerBottom - 34}H0V34A34 34 0 0 1 34 0Z" fill="${theme.header}"/><circle cx="0" cy="${cutoutTop + 10}" r="10" fill="#17151e"/><circle cx="${layoutWidth}" cy="${cutoutTop + 10}" r="10" fill="#17151e"/>${header}${sections.join("")}</svg>`;
  return { svg: ticketSvg, width: renderWidth, height: renderHeight };
}

async function resolveLogoBuffer(url?: string | null) {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  try {
    const response = await fetch(parsed, { signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 5 * 1024 * 1024) return null;
    return await sharp(bytes).resize(68, 68, { fit: "contain" }).png().toBuffer();
  } catch {
    return null;
  }
}

function logoLayer(logo: Buffer | null) {
  const mark = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle cx="40" cy="40" r="39" fill="#fff" stroke="#ffffff66" stroke-width="2"/></svg>`,
  );
  const overlays = logo ? [{ input: logo, left: 6, top: 6 }] : [];
  return sharp(mark).composite(overlays).png().toBuffer();
}

export async function renderParticipationTicketJpeg(
  data: ParticipationTicketData,
  logoUrl?: string | null,
) {
  const layout = buildTicketSvg(data);
  const logo = await resolveLogoBuffer(logoUrl);
  const mark = await logoLayer(logo);
  const image = await sharp(Buffer.from(layout.svg))
    .composite([{ input: mark, left: Math.round(24 * renderScale), top: Math.round(24 * renderScale) }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  if (image.length > 5 * 1024 * 1024) {
    throw new Error("El ticket excede el límite de tamaño de imagen de WhatsApp.");
  }
  return { buffer: image, width: layout.width, height: layout.height };
}

export function getParticipationTicketStorageKey(jobId: string) {
  const digest = createHash("sha256").update(jobId).digest("hex").slice(0, 32);
  return `whatsapp/raffle-participation-tickets/${digest}.jpg`;
}

export function getParticipationTicketCleanupJobId(
  jobId: string,
  attempt: number,
) {
  const digest = createHash("sha256")
    .update(`${jobId}:${attempt}`)
    .digest("hex")
    .slice(0, 32);
  return `raffle-ticket-image-cleanup-${digest}`;
}

export async function uploadParticipationTicketImage(params: {
  data: ParticipationTicketData;
  jobId: string;
  logoUrl?: string | null;
}) {
  const rendered = await renderParticipationTicketJpeg(params.data, params.logoUrl);
  const key = getParticipationTicketStorageKey(params.jobId);
  await storageService.uploadPrivateObject(rendered.buffer, key, "image/jpeg");
  return {
    key,
    url: await storageService.createSignedReadUrl(key),
  };
}
