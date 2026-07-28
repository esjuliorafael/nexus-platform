import type { RafflePrizeResultPreview } from "../types";

type RaffleResultImageInput = {
  brandName: string;
  logoUrl?: string | null;
  raffleTitle: string;
  drawDate?: string | null;
  digits: number;
  prize: RafflePrizeResultPreview;
};

type TextOptions = {
  align?: CanvasTextAlign;
  maxLines?: number;
};

const WIDTH = 1080;
const HEIGHT = 1920;
const FONT_FAMILY = '"Inter", Arial, sans-serif';
const RESULT_IMAGE_TOKENS = {
  space: {
    xs: 8,
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
    xxl: 64,
    safe: 88,
  },
  radius: {
    nested: 24,
    card: 32,
    surface: 48,
  },
  type: {
    label: 20,
    body: 24,
    secondary: 32,
    heading: 40,
    title: 56,
    result: 184,
  },
  line: {
    body: 32,
    secondary: 40,
    title: 64,
  },
  size: {
    logo: 112,
    metricHeight: 176,
    statusHeight: 192,
  },
} as const;

const RESULT_SURFACE_Y = 648;
const RESULT_SURFACE_HEIGHT = 424;
const METHODOLOGY_TITLE_Y =
  RESULT_SURFACE_Y +
  RESULT_SURFACE_HEIGHT +
  RESULT_IMAGE_TOKENS.space.xxl;
const METHODOLOGY_BODY_Y =
  METHODOLOGY_TITLE_Y + RESULT_IMAGE_TOKENS.space.xl;
const METRICS_Y =
  METHODOLOGY_BODY_Y +
  RESULT_IMAGE_TOKENS.line.body +
  RESULT_IMAGE_TOKENS.space.md;
const STATUS_Y =
  METRICS_Y +
  RESULT_IMAGE_TOKENS.size.metricHeight +
  RESULT_IMAGE_TOKENS.space.xl;
const NOTE_Y =
  STATUS_Y +
  RESULT_IMAGE_TOKENS.size.statusHeight +
  RESULT_IMAGE_TOKENS.space.lg;
const FOOTER_RULE_Y =
  NOTE_Y +
  RESULT_IMAGE_TOKENS.line.body * 2 +
  RESULT_IMAGE_TOKENS.space.md;

const RESULT_IMAGE_LAYOUT = {
  margin: RESULT_IMAGE_TOKENS.space.safe,
  logoTop: RESULT_IMAGE_TOKENS.space.safe,
  identityLabelY: 128,
  identityNameY: 176,
  placeY: 296,
  raffleTitleY: 368,
  resultSurfaceY: RESULT_SURFACE_Y,
  resultSurfaceHeight: RESULT_SURFACE_HEIGHT,
  resultLabelY: 744,
  resultValueY: 944,
  methodologyTitleY: METHODOLOGY_TITLE_Y,
  methodologyBodyY: METHODOLOGY_BODY_Y,
  metricsY: METRICS_Y,
  statusY: STATUS_Y,
  noteY: NOTE_Y,
  footerRuleY: FOOTER_RULE_Y,
  footerY: FOOTER_RULE_Y + RESULT_IMAGE_TOKENS.space.xl,
} as const;

const CONTENT_WIDTH = WIDTH - RESULT_IMAGE_LAYOUT.margin * 2;
const METRIC_GAP = RESULT_IMAGE_TOKENS.space.lg;
const METRIC_WIDTH = (CONTENT_WIDTH - METRIC_GAP * 2) / 3;
const RESULT_SOURCE_LABELS = {
  MAJOR_PRIZE: "Premio Mayor",
  SECOND_PRIZE: "Segundo Premio",
  THIRD_PRIZE: "Tercer Premio",
  CUSTOM: "Referencia Personalizada",
} as const;

const publicWinnerName = (name?: string | null) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).join(" ") || "Sin ganador elegible";
};

const placeLabel = (position: number) =>
  position === 1
    ? "Primer Lugar"
    : position === 2
      ? "Segundo Lugar"
      : position === 3
        ? "Tercer Lugar"
        : `Lugar ${position}`;

const formatDrawDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Mexico_City",
  });
};

const getCssColor = (property: string, fallback: string) => {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(property)
    .trim();
  return value || fallback;
};

const roundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
};

const fitLineWithEllipsis = (
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) => {
  if (context.measureText(text).width <= maxWidth) return text;
  let fitted = text;
  while (
    fitted.length > 1 &&
    context.measureText(`${fitted}…`).width > maxWidth
  ) {
    fitted = fitted.slice(0, -1);
  }
  return `${fitted.trim()}…`;
};

const drawWrappedText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  { align = "left", maxLines = 3 }: TextOptions = {},
) => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === maxLines - 1) break;
  }

  if (line && lines.length < maxLines) lines.push(line);
  if (lines.join(" ").split(/\s+/).length < words.length) {
    lines[lines.length - 1] = fitLineWithEllipsis(
      context,
      lines[lines.length - 1],
      maxWidth,
    );
  }

  context.textAlign = align;
  lines.forEach((value, index) => {
    context.fillText(value, x, startY + index * lineHeight);
  });
  return startY + lines.length * lineHeight;
};

const loadImage = async (url?: string | null) => {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await createImageBitmap(await response.blob());
  } catch {
    return null;
  }
};

const getSourceLabel = (prize: RafflePrizeResultPreview) =>
  prize.resultSource === "CUSTOM"
    ? prize.resultSourceLabel || RESULT_SOURCE_LABELS.CUSTOM
    : RESULT_SOURCE_LABELS[prize.resultSource];

const getMethodology = (
  prize: RafflePrizeResultPreview,
  digits: number,
) => {
  const source = getSourceLabel(prize);
  if (prize.resultSource === "CUSTOM") {
    return {
      explanation: `Se tomaron los últimos ${digits} dígitos de ${source}.`,
      note: `Esta rifa toma como referencia el resultado público de ${source} para definir el número ganador.`,
    };
  }
  return {
    explanation: `Se tomaron los últimos ${digits} dígitos del ${source} de la Lotería Nacional.`,
    note: `Esta rifa toma como referencia el resultado público del ${source} de la Lotería Nacional para definir el número ganador.`,
  };
};

const drawMetric = (
  context: CanvasRenderingContext2D,
  x: number,
  label: string,
  value: string,
  colors: { text: string; muted: string; surface: string; border: string },
) => {
  const centerX = x + METRIC_WIDTH / 2;
  roundedRect(
    context,
    x,
    RESULT_IMAGE_LAYOUT.metricsY,
    METRIC_WIDTH,
    RESULT_IMAGE_TOKENS.size.metricHeight,
    RESULT_IMAGE_TOKENS.radius.card,
  );
  context.fillStyle = colors.surface;
  context.fill();
  context.strokeStyle = colors.border;
  context.lineWidth = 2;
  context.stroke();

  context.textAlign = "center";
  context.fillStyle = colors.muted;
  context.font = `700 ${RESULT_IMAGE_TOKENS.type.label}px ${FONT_FAMILY}`;
  context.fillText(
    label,
    centerX,
    RESULT_IMAGE_LAYOUT.metricsY + RESULT_IMAGE_TOKENS.space.xxl,
  );

  context.fillStyle = colors.text;
  context.font = `700 ${RESULT_IMAGE_TOKENS.type.heading}px ${FONT_FAMILY}`;
  context.fillText(
    fitLineWithEllipsis(
      context,
      value,
      METRIC_WIDTH - RESULT_IMAGE_TOKENS.space.xxl,
    ),
    centerX,
    RESULT_IMAGE_LAYOUT.metricsY + 120,
  );
};

export async function downloadRaffleResultImage({
  brandName,
  logoUrl,
  raffleTitle,
  drawDate,
  digits,
  prize,
}: RaffleResultImageInput) {
  await document.fonts.ready;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo preparar la imagen.");

  const accent = getCssColor("--brand-600", "#9d635a");
  const colors = {
    background: "#f7f5f3",
    surface: "#ffffff",
    text: "#0f172a",
    muted: "#78716c",
    border: "#e7e5e4",
    successBackground: "#ecfdf5",
    successText: "#047857",
    warningBackground: "#fff7ed",
    warningText: "#9a3412",
  };

  context.fillStyle = colors.background;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = accent;
  context.fillRect(0, 0, WIDTH, RESULT_IMAGE_TOKENS.space.md);

  const logo = await loadImage(logoUrl);
  if (logo) {
    const logoSize = RESULT_IMAGE_TOKENS.size.logo;
    const logoCenterX =
      RESULT_IMAGE_LAYOUT.margin + RESULT_IMAGE_TOKENS.space.xl;
    const logoCenterY = RESULT_IMAGE_LAYOUT.logoTop + logoSize / 2;
    context.save();
    context.beginPath();
    context.arc(logoCenterX, logoCenterY, logoSize / 2, 0, Math.PI * 2);
    context.clip();
    context.drawImage(
      logo,
      logoCenterX - logoSize / 2,
      RESULT_IMAGE_LAYOUT.logoTop,
      logoSize,
      logoSize,
    );
    context.restore();
  }

  const identityX = logo
    ? RESULT_IMAGE_LAYOUT.margin +
      RESULT_IMAGE_TOKENS.size.logo +
      RESULT_IMAGE_TOKENS.space.md
    : RESULT_IMAGE_LAYOUT.margin;
  context.textAlign = "left";
  context.fillStyle = colors.muted;
  context.font = `700 ${RESULT_IMAGE_TOKENS.type.label}px ${FONT_FAMILY}`;
  context.fillText(
    "RESULTADO OFICIAL",
    identityX,
    RESULT_IMAGE_LAYOUT.identityLabelY,
  );
  context.fillStyle = colors.text;
  context.font = `700 ${RESULT_IMAGE_TOKENS.type.secondary}px ${FONT_FAMILY}`;
  context.fillText(
    fitLineWithEllipsis(
      context,
      brandName || "Nexus",
      WIDTH - RESULT_IMAGE_LAYOUT.margin - identityX,
    ),
    identityX,
    RESULT_IMAGE_LAYOUT.identityNameY,
  );

  context.fillStyle = accent;
  context.font = `700 ${RESULT_IMAGE_TOKENS.type.body}px ${FONT_FAMILY}`;
  context.fillText(
    placeLabel(prize.position).toUpperCase(),
    RESULT_IMAGE_LAYOUT.margin,
    RESULT_IMAGE_LAYOUT.placeY,
  );

  context.fillStyle = colors.text;
  context.font = `700 ${RESULT_IMAGE_TOKENS.type.title}px ${FONT_FAMILY}`;
  const raffleTitleEnd = drawWrappedText(
    context,
    raffleTitle,
    RESULT_IMAGE_LAYOUT.margin,
    RESULT_IMAGE_LAYOUT.raffleTitleY,
    CONTENT_WIDTH,
    RESULT_IMAGE_TOKENS.line.title,
    { maxLines: 2 },
  );

  context.fillStyle = colors.muted;
  context.font = `700 ${RESULT_IMAGE_TOKENS.type.label}px ${FONT_FAMILY}`;
  context.fillText(
    "PREMIO",
    RESULT_IMAGE_LAYOUT.margin,
    raffleTitleEnd + RESULT_IMAGE_TOKENS.space.lg,
  );
  context.fillStyle = colors.text;
  context.font = `600 ${RESULT_IMAGE_TOKENS.type.secondary}px ${FONT_FAMILY}`;
  drawWrappedText(
    context,
    prize.title,
    RESULT_IMAGE_LAYOUT.margin,
    raffleTitleEnd +
      RESULT_IMAGE_TOKENS.space.lg +
      RESULT_IMAGE_TOKENS.space.xl,
    CONTENT_WIDTH,
    RESULT_IMAGE_TOKENS.line.secondary,
    { maxLines: 2 },
  );

  roundedRect(
    context,
    RESULT_IMAGE_LAYOUT.margin,
    RESULT_IMAGE_LAYOUT.resultSurfaceY,
    CONTENT_WIDTH,
    RESULT_IMAGE_LAYOUT.resultSurfaceHeight,
    RESULT_IMAGE_TOKENS.radius.surface,
  );
  context.fillStyle = colors.surface;
  context.fill();
  context.strokeStyle = colors.border;
  context.lineWidth = 2;
  context.stroke();

  context.textAlign = "center";
  context.fillStyle = colors.muted;
  context.font = `700 ${RESULT_IMAGE_TOKENS.type.label}px ${FONT_FAMILY}`;
  context.fillText(
    "NÚMERO GANADOR",
    WIDTH / 2,
    RESULT_IMAGE_LAYOUT.resultLabelY,
  );
  context.fillStyle = accent;
  context.font = `700 ${RESULT_IMAGE_TOKENS.type.result}px ${FONT_FAMILY}`;
  context.fillText(
    prize.winningNumber,
    WIDTH / 2,
    RESULT_IMAGE_LAYOUT.resultValueY,
  );

  const methodology = getMethodology(prize, digits);
  context.fillStyle = colors.text;
  context.font = `700 ${RESULT_IMAGE_TOKENS.type.body}px ${FONT_FAMILY}`;
  context.fillText(
    "CÓMO SE DETERMINÓ",
    WIDTH / 2,
    RESULT_IMAGE_LAYOUT.methodologyTitleY,
  );

  context.fillStyle = colors.muted;
  context.font = `400 ${RESULT_IMAGE_TOKENS.type.body}px ${FONT_FAMILY}`;
  drawWrappedText(
    context,
    methodology.explanation,
    WIDTH / 2,
    RESULT_IMAGE_LAYOUT.methodologyBodyY,
    CONTENT_WIDTH - RESULT_IMAGE_TOKENS.space.xxl,
    RESULT_IMAGE_TOKENS.line.body,
    { align: "center", maxLines: 2 },
  );

  drawMetric(
    context,
    RESULT_IMAGE_LAYOUT.margin,
    "RESULTADO PÚBLICO",
    prize.referenceNumber,
    colors,
  );
  drawMetric(
    context,
    RESULT_IMAGE_LAYOUT.margin + METRIC_WIDTH + METRIC_GAP,
    `ÚLTIMOS ${digits} DÍGITOS`,
    prize.winningNumber,
    colors,
  );
  drawMetric(
    context,
    RESULT_IMAGE_LAYOUT.margin + (METRIC_WIDTH + METRIC_GAP) * 2,
    "BOLETO PRINCIPAL",
    prize.winningTicketNumber || "—",
    colors,
  );

  const eligible = prize.resolutionStatus === "ELIGIBLE_WINNER";
  roundedRect(
    context,
    RESULT_IMAGE_LAYOUT.margin,
    RESULT_IMAGE_LAYOUT.statusY,
    CONTENT_WIDTH,
    RESULT_IMAGE_TOKENS.size.statusHeight,
    RESULT_IMAGE_TOKENS.radius.card,
  );
  context.fillStyle = eligible
    ? colors.successBackground
    : colors.warningBackground;
  context.fill();

  context.textAlign = "left";
  context.fillStyle = eligible ? colors.successText : colors.warningText;
  context.font = `700 ${RESULT_IMAGE_TOKENS.type.label}px ${FONT_FAMILY}`;
  context.fillText(
    eligible ? "GANADOR CONFIRMADO" : "PREMIO SIN GANADOR ELEGIBLE",
    RESULT_IMAGE_LAYOUT.margin + RESULT_IMAGE_TOKENS.space.xl,
    RESULT_IMAGE_LAYOUT.statusY + RESULT_IMAGE_TOKENS.space.xxl,
  );
  context.fillStyle = colors.text;
  context.font = `700 ${RESULT_IMAGE_TOKENS.type.heading}px ${FONT_FAMILY}`;
  context.fillText(
    fitLineWithEllipsis(
      context,
      eligible
        ? publicWinnerName(prize.participant?.name)
        : "Sin ganador elegible",
      CONTENT_WIDTH - RESULT_IMAGE_TOKENS.space.xxl * 2,
    ),
    RESULT_IMAGE_LAYOUT.margin + RESULT_IMAGE_TOKENS.space.xl,
    RESULT_IMAGE_LAYOUT.statusY + 132,
  );

  context.fillStyle = colors.muted;
  context.font = `400 ${RESULT_IMAGE_TOKENS.type.body}px ${FONT_FAMILY}`;
  drawWrappedText(
    context,
    methodology.note,
    RESULT_IMAGE_LAYOUT.margin,
    RESULT_IMAGE_LAYOUT.noteY,
    CONTENT_WIDTH,
    RESULT_IMAGE_TOKENS.line.body,
    { maxLines: 3 },
  );

  const formattedDate = formatDrawDate(drawDate);
  context.strokeStyle = colors.border;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(
    RESULT_IMAGE_LAYOUT.margin,
    RESULT_IMAGE_LAYOUT.footerRuleY,
  );
  context.lineTo(
    WIDTH - RESULT_IMAGE_LAYOUT.margin,
    RESULT_IMAGE_LAYOUT.footerRuleY,
  );
  context.stroke();

  context.fillStyle = colors.muted;
  context.font = `500 ${RESULT_IMAGE_TOKENS.type.label}px ${FONT_FAMILY}`;
  context.textAlign = "left";
  context.fillText(
    formattedDate ? `Rifa del ${formattedDate}` : "Resultado de la rifa",
    RESULT_IMAGE_LAYOUT.margin,
    RESULT_IMAGE_LAYOUT.footerY,
  );
  context.textAlign = "right";
  context.fillText(
    `Publicado por ${brandName || "Nexus"}`,
    WIDTH - RESULT_IMAGE_LAYOUT.margin,
    RESULT_IMAGE_LAYOUT.footerY,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) =>
        value
          ? resolve(value)
          : reject(new Error("No se pudo exportar la imagen.")),
      "image/png",
      1,
    );
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `resultado-lugar-${prize.position}.png`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
