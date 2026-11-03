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

const width = 900;
const cardX = 24;
const cardWidth = width - cardX * 2;
const bodyX = 68;
const bodyWidth = width - bodyX * 2;
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

  const titleLines = wrapText(data.raffleName || "Rifa", 34);
  const drawDateLines = wrapText(data.drawDate || "Fecha por confirmar", 52);
  const note =
    "Si la rifa se reprograma, tu participación conserva la misma selección y condiciones.";
  const noteLines = wrapText(note, 58);
  const headerTitleY = 234;
  const titleHeight = titleLines.length * 42;
  const drawY = headerTitleY + titleHeight + 48;
  const noteY = drawY + drawDateLines.length * 30 + 42;
  const headerBottom = noteY + 42;
  const bodyTop = headerBottom + 46;

  const tickets = Array.from(new Set(data.ticketNumbers));
  const ticketRows = Math.ceil(tickets.length / 3);
  const ticketsCardHeight = 78 + ticketRows * 84;
  const opportunities = data.opportunities.filter((entry) => entry.numbers.length);
  const opportunitiesHeight = opportunities.length
    ? 86 + opportunities.reduce((sum, entry) => sum + Math.max(1, Math.ceil(entry.numbers.join(", ").length / 48)) * 46, 0)
    : 0;

  let y = bodyTop;
  const header = [
    svgText("MI PARTICIPACIÓN", 158, 93, { size: 18, weight: 700, fill: "#ffffffb8", letterSpacing: 3 }),
    svgText(data.brandName || "Rancho Las Trojes", 158, 124, { size: 25, weight: 700, fill: "#ffffff" }),
    `<rect x="620" y="58" width="220" height="54" rx="27" fill="${theme.soft}"/>`,
    svgText(statusLabel, 730, 93, { size: 18, weight: 700, fill: theme.accent, anchor: "middle", letterSpacing: 1 }),
    svgText("RIFA", bodyX, 188, { size: 17, weight: 700, fill: "#ffffffa8", letterSpacing: 4 }),
    ...titleLines.map((line, index) => svgText(line, bodyX, headerTitleY + index * 42, { size: 34, weight: 700, fill: "#ffffff", max: 100, lineHeight: 42 })),
    `<circle cx="94" cy="${drawY - 8}" r="13" fill="none" stroke="#ffffffd0" stroke-width="2.5"/><path d="M94 ${drawY - 22}v6m0 16v5m-14 -13h6m16 0h6" stroke="#ffffffd0" stroke-width="2.5" stroke-linecap="round"/>`,
    svgText("Fecha y hora de la rifa", 126, drawY, { size: 20, fill: "#ffffffd0", max: 26, lineHeight: 28 }),
    ...drawDateLines.map((line, index) => svgText(line, 346, drawY + index * 28, { size: 20, weight: 700, fill: "#ffffff", max: 60, lineHeight: 28 })),
    ...noteLines.map((line, index) => svgText(line, width / 2, noteY + index * 23, { size: 16, fill: "#ffffffa8", anchor: "middle", max: 100, lineHeight: 23 })),
  ].join("");

  const sections: string[] = [];
  const participantDateLabel =
    data.status === "RESERVED"
      ? "APARTADO"
      : data.status === "CONFIRMED"
        ? "CONFIRMACIÓN"
        : "LIBERACIÓN";
  sections.push(
    svgText("PARTICIPANTE", bodyX, y + 18, { size: 16, weight: 700, fill: "#8a8390", letterSpacing: 2 }),
    svgText(data.participantName || "Participante", bodyX, y + 52, { size: 23, weight: 700 }),
    `<line x1="565" y1="${y}" x2="565" y2="${y + 64}" stroke="#dedbe4" stroke-width="2"/>`,
    svgText(participantDateLabel, 592, y + 18, { size: 16, weight: 700, fill: "#8a8390", letterSpacing: 1.8 }),
    svgText(data.eventDate, 592, y + 52, { size: 20, weight: 700, max: 24, lineHeight: 26 }),
  );
  y += 96;
  sections.push(`<line x1="${bodyX}" y1="${y}" x2="${bodyX + bodyWidth}" y2="${y}" stroke="#d8d4dd" stroke-width="2" stroke-dasharray="7 7"/>`);
  y += 28;

  sections.push(`<rect x="${bodyX}" y="${y}" width="${bodyWidth}" height="${ticketsCardHeight}" rx="24" fill="#ffffff" stroke="#e8e5eb" stroke-width="2"/>`);
  sections.push(svgText(data.status === "RESERVED" ? "BOLETOS APARTADOS" : data.status === "CONFIRMED" ? "BOLETOS CONFIRMADOS" : "BOLETOS LIBERADOS", bodyX + 28, y + 36, { size: 16, weight: 700, fill: "#8a8390", letterSpacing: 1.8 }));
  sections.push(svgText(formatCount(tickets.length).toUpperCase(), bodyX + bodyWidth - 28, y + 36, { size: 15, weight: 700, fill: "#8a8390", anchor: "end", letterSpacing: 1 }));
  tickets.forEach((ticket, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const chipX = bodyX + 28 + column * 242;
    const chipY = y + 54 + row * 84;
    sections.push(`<rect x="${chipX}" y="${chipY}" width="224" height="64" rx="16" fill="${theme.pale}" stroke="${theme.edge}" stroke-width="2"/>`);
    sections.push(svgText(ticket, chipX + 112, chipY + 42, { size: 24, weight: 700, fill: theme.accent, anchor: "middle", letterSpacing: 1.5 }));
    if (data.status === "RELEASED") sections.push(`<line x1="${chipX + 65}" y1="${chipY + 33}" x2="${chipX + 159}" y2="${chipY + 33}" stroke="${theme.accent}" stroke-width="2" opacity=".65"/>`);
  });
  y += ticketsCardHeight + 24;

  if (opportunitiesHeight) {
    sections.push(`<rect x="${bodyX}" y="${y}" width="${bodyWidth}" height="${opportunitiesHeight}" rx="24" fill="#f8eee6" stroke="#ead3c3" stroke-width="2"/>`);
    sections.push(svgText("OPORTUNIDADES ADICIONALES", bodyX + 28, y + 34, { size: 16, weight: 700, fill: "#9a5a32", letterSpacing: 1.6 }));
    const opportunityCount = opportunities.reduce((sum, item) => sum + item.numbers.length, 0);
    sections.push(svgText(`${opportunityCount} EN TOTAL`, bodyX + bodyWidth - 28, y + 34, { size: 15, weight: 700, fill: "#a2765d", anchor: "end", letterSpacing: 1 }));
    let rowY = y + 72;
    for (const entry of opportunities) {
      const lineText = entry.numbers.join(", ");
      const lines = wrapText(lineText, 48);
      sections.push(svgText(entry.ticketNumber, bodyX + 28, rowY + 2, { size: 18, weight: 700, fill: theme.accent }));
      lines.forEach((line, index) => sections.push(svgText(line, bodyX + 196, rowY + 2 + index * 24, { size: 17, weight: 600, fill: "#6f5546", max: 100, lineHeight: 24 })));
      rowY += Math.max(1, lines.length) * 46;
      if (entry !== opportunities[opportunities.length - 1]) {
        sections.push(`<line x1="${bodyX + 28}" y1="${rowY - 10}" x2="${bodyX + bodyWidth - 28}" y2="${rowY - 10}" stroke="#e6d3c7" stroke-width="1.5"/>`);
      }
    }
    y += opportunitiesHeight + 24;
  }

  const detailLines = wrapText(detailCopy, 98);
  const paymentCardHeight = 184 + detailLines.length * 24;
  sections.push(`<rect x="${bodyX}" y="${y}" width="${bodyWidth}" height="${paymentCardHeight}" rx="24" fill="${theme.payment}"/>`);
  const paymentIconX = bodyX + 24;
  const paymentIconY = y + 24;
  sections.push(`<rect x="${paymentIconX}" y="${paymentIconY}" width="56" height="56" rx="18" fill="${theme.soft}"/>`);
  sections.push(`<rect x="${paymentIconX + 14}" y="${paymentIconY + 17}" width="29" height="25" rx="4" fill="none" stroke="${theme.accent}" stroke-width="3"/><path d="M${paymentIconX + 18} ${paymentIconY + 17}v-3a3 3 0 0 1 2.5-3l17-3v9m-7 8h12v9h-12a4.5 4.5 0 1 1 0-9Z" fill="none" stroke="${theme.accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`);
  const amountLabel = data.status === "RESERVED" ? "IMPORTE PENDIENTE DE PAGO" : data.status === "CONFIRMED" ? "IMPORTE PAGADO" : "SIN PAGO CONFIRMADO";
  sections.push(svgText(amountLabel, bodyX + bodyWidth - 28, y + 34, { size: 16, weight: 700, fill: "#ffffff80", anchor: "end", letterSpacing: 2 }));
  sections.push(svgText(data.status === "RELEASED" ? "Selección liberada" : `$${data.amount}`, bodyX + bodyWidth - 28, y + 73, { size: data.status === "RELEASED" ? 22 : 30, weight: 700, fill: "#ffffff", anchor: "end" }));
  if (data.status !== "RELEASED") sections.push(svgText("MXN", bodyX + bodyWidth - 28, y + 100, { size: 15, weight: 600, fill: "#ffffff80", anchor: "end" }));
  const dividerY = y + 120;
  sections.push(`<line x1="${bodyX + 24}" y1="${dividerY}" x2="${bodyX + bodyWidth - 24}" y2="${dividerY}" stroke="#ffffff24" stroke-width="2"/>`);
  sections.push(svgText(detailLabel, bodyX + 28, dividerY + 34, { size: 15, weight: 700, fill: "#ffffff78", letterSpacing: 1.6 }));
  sections.push(svgText(detailValue, bodyX + bodyWidth - 28, dividerY + 34, { size: 16, weight: 700, fill: "#ffffffde", anchor: "end", max: 39 }));
  detailLines.forEach((line, index) => sections.push(svgText(line, bodyX + 28, dividerY + 64 + index * 24, { size: 15, fill: "#ffffffa0", max: 110, lineHeight: 24 })));
  y += paymentCardHeight + 44;

  const fullHeight = y + 20;
  if (fullHeight > 14_000) {
    throw new Error("El ticket excede la altura admitida para una imagen de WhatsApp.");
  }
  const ticketSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${fullHeight}" viewBox="0 0 ${width} ${fullHeight}"><rect width="100%" height="100%" fill="#17151e"/><rect x="${cardX}" y="20" width="${cardWidth}" height="${fullHeight - 40}" rx="54" fill="#f8f7f4"/><path d="M${cardX + 54} 20H${cardX + cardWidth - 54}a54 54 0 0 1 54 54v${headerBottom - 54}H${cardX}V74a54 54 0 0 1 54-54Z" fill="${theme.header}"/><circle cx="${cardX}" cy="${headerBottom}" r="24" fill="#17151e"/><circle cx="${cardX + cardWidth}" cy="${headerBottom}" r="24" fill="#17151e"/>${header}${sections.join("")}</svg>`;
  return { svg: ticketSvg, width, height: fullHeight };
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
    .composite([{ input: mark, left: 70, top: 48 }])
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
