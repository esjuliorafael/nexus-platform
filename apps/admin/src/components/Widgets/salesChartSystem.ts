import type { CSSProperties } from 'react';

export const SALES_CHART_BAR_RADIUS = 8;
export const SALES_CHART_MIN_TICK_GAP = 16;
export const SALES_CHART_TOOLTIP_SEPARATOR = ': ';
export const SALES_CHART_MARGIN = {
  top: 8,
  right: 0,
  left: -8,
  bottom: 0,
} as const;

export const SALES_CHART_AXIS_TICK = {
  fill: 'var(--text-muted)',
  fontSize: 'var(--text-label)',
  fontWeight: 600,
} as const;

export const SALES_CHART_TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-main)',
  borderRadius: 'var(--radius-card-inner)',
  boxShadow: 'var(--shadow-chart-tooltip)',
  padding: 'var(--space-base)',
};

export const SALES_CHART_TOOLTIP_LABEL_STYLE: CSSProperties = {
  color: 'var(--text-main)',
  fontSize: 'var(--text-secondary)',
  fontWeight: 700,
};

export const SALES_CHART_TOOLTIP_ITEM_STYLE: CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: 'var(--text-secondary)',
  fontWeight: 600,
};

const compactNumber = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    maximumFractionDigits: 1,
  }).format(value);

export const compactMoneyAxis = (value: number) => {
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1_000_000) {
    return `$${compactNumber(value / 1_000_000)} M`;
  }

  if (absoluteValue >= 1_000) {
    return `$${compactNumber(value / 1_000)} mil`;
  }

  return `$${Math.round(value).toLocaleString('es-MX')}`;
};
