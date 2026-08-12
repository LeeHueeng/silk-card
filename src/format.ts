import { HomeAssistant } from './types';

function lang(hass?: HomeAssistant): string {
  return hass?.locale?.language ?? hass?.language ?? 'en';
}

export function formatNumber(hass: HomeAssistant | undefined, entityId: string, value: number): string {
  if (!Number.isFinite(value)) return '—';
  const precision =
    hass?.entities?.[entityId]?.display_precision ?? (Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2);
  return new Intl.NumberFormat(lang(hass), {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value);
}

export function formatDelta(hass: HomeAssistant | undefined, entityId: string, delta: number): string {
  const arrow = delta >= 0 ? '↑' : '↓';
  return `${arrow} ${formatNumber(hass, entityId, Math.abs(delta))}`;
}

/** Format a timestamp for the scrub label, with detail scaled to the visible span. */
export function formatTime(hass: HomeAssistant | undefined, ts: number, spanHours: number): string {
  const date = new Date(ts * 1000);
  const locale = lang(hass);
  if (spanHours <= 26) {
    return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date);
  }
  if (spanHours <= 24 * 8) {
    return new Intl.DateTimeFormat(locale, { weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(date);
  }
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: 'numeric' }).format(date);
}
