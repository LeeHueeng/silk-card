import { HomeAssistant, Point } from './types';

const GAP_STATES = new Set(['unavailable', 'unknown', 'none', '']);

function toPoint(t: number, state: string | undefined): Point {
  const s = (state ?? '').toLowerCase();
  if (GAP_STATES.has(s)) return { t, v: NaN };
  const v = Number(state);
  return { t, v: Number.isFinite(v) ? v : NaN };
}

async function fetchHistory(
  hass: HomeAssistant,
  entityIds: string[],
  start: number,
  end: number
): Promise<Record<string, Point[]>> {
  const resp = await hass.callWS<Record<string, any[]>>({
    type: 'history/history_during_period',
    start_time: new Date(start * 1000).toISOString(),
    end_time: new Date(end * 1000).toISOString(),
    entity_ids: entityIds,
    minimal_response: true,
    no_attributes: true,
    significant_changes_only: false,
  });
  const out: Record<string, Point[]> = {};
  for (const id of entityIds) {
    const rows = resp?.[id] ?? [];
    out[id] = rows
      .map((row) => {
        const state = row.s ?? row.state;
        const raw = row.lu ?? row.last_updated ?? row.lc ?? row.last_changed;
        const t = typeof raw === 'number' ? raw : Date.parse(raw) / 1000;
        return toPoint(t, state);
      })
      .filter((p) => Number.isFinite(p.t))
      .sort((a, b) => a.t - b.t);
  }
  return out;
}

async function fetchStatistics(
  hass: HomeAssistant,
  entityIds: string[],
  start: number,
  end: number
): Promise<Record<string, Point[]>> {
  const resp = await hass.callWS<Record<string, any[]>>({
    type: 'recorder/statistics_during_period',
    start_time: new Date(start * 1000).toISOString(),
    end_time: new Date(end * 1000).toISOString(),
    statistic_ids: entityIds,
    period: 'hour',
    types: ['mean', 'state'],
  });
  const out: Record<string, Point[]> = {};
  for (const id of entityIds) {
    const rows = resp?.[id] ?? [];
    out[id] = rows
      .map((row) => {
        const raw = row.start;
        const t = typeof raw === 'number' ? raw / 1000 : Date.parse(raw) / 1000;
        const v = row.mean ?? row.state;
        return { t, v: typeof v === 'number' && Number.isFinite(v) ? v : NaN };
      })
      .filter((p) => Number.isFinite(p.t))
      .sort((a, b) => a.t - b.t);
  }
  return out;
}

/**
 * Fetch series data for the window. Short windows use raw history; longer
 * windows use hourly long-term statistics (which survive recorder purging),
 * falling back to history for entities without statistics.
 */
export async function fetchSeries(
  hass: HomeAssistant,
  entityIds: string[],
  start: number,
  end: number,
  hours: number
): Promise<Record<string, Point[]>> {
  if (hours <= 48) {
    return fetchHistory(hass, entityIds, start, end);
  }
  const stats = await fetchStatistics(hass, entityIds, start, end);
  const missing = entityIds.filter((id) => !stats[id]?.length);
  if (missing.length) {
    try {
      const hist = await fetchHistory(hass, missing, start, end);
      for (const id of missing) stats[id] = hist[id] ?? [];
    } catch {
      for (const id of missing) stats[id] = stats[id] ?? [];
    }
  }
  return stats;
}
