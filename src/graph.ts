import { Point } from './types';

/**
 * Resample history onto n evenly spaced samples using previous-value hold,
 * which matches Home Assistant state semantics (a state persists until the
 * next change). Samples before the first data point are NaN.
 */
export function resampleHold(points: Point[], start: number, end: number, n: number): Float64Array {
  const out = new Float64Array(n).fill(NaN);
  if (!points.length || end <= start) return out;
  let j = 0;
  for (let i = 0; i < n; i++) {
    const t = start + ((end - start) * i) / (n - 1);
    while (j < points.length && points[j].t <= t) j++;
    if (j > 0) out[i] = points[j - 1].v;
  }
  return out;
}

/** Combined y-domain over all series, padded, with optional fixed bounds. */
export function niceDomain(series: Float64Array[], yMin?: number, yMax?: number): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const arr of series) {
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      if (Number.isFinite(v)) {
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
  }
  if (!Number.isFinite(lo)) return [0, 1];
  if (lo === hi) {
    const pad = Math.max(Math.abs(lo) * 0.05, 0.5);
    lo -= pad;
    hi += pad;
  }
  const pad = (hi - lo) * 0.08;
  return [yMin ?? lo - pad, yMax ?? hi + pad];
}

/** Map values to pixel-space y coordinates. NaN passes through. */
export function toPxYs(
  vals: Float64Array,
  domain: [number, number],
  height: number,
  padTop: number,
  padBottom: number
): Float64Array {
  const [lo, hi] = domain;
  const span = hi - lo || 1;
  const usable = Math.max(height - padTop - padBottom, 1);
  const out = new Float64Array(vals.length);
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    out[i] = Number.isFinite(v) ? padTop + (1 - (v - lo) / span) * usable : NaN;
  }
  return out;
}

const fmt = (v: number): string => (Math.round(v * 100) / 100).toString();

/**
 * Monotone cubic tangents (Fritsch–Carlson, uniform spacing): harmonic mean
 * of adjacent slopes, zeroed at local extrema so the curve never overshoots.
 */
function tangents(ys: Float64Array, from: number, to: number, dx: number): Float64Array {
  const n = to - from;
  const m = new Float64Array(n);
  if (n === 1) return m;
  const d = new Float64Array(n - 1);
  for (let i = 0; i < n - 1; i++) d[i] = (ys[from + i + 1] - ys[from + i]) / dx;
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]);
  }
  return m;
}

function eachRun(ys: Float64Array, cb: (from: number, to: number) => void): void {
  let start = -1;
  for (let i = 0; i <= ys.length; i++) {
    const finite = i < ys.length && Number.isFinite(ys[i]);
    if (finite && start < 0) start = i;
    if (!finite && start >= 0) {
      cb(start, i);
      start = -1;
    }
  }
}

/** Smooth SVG path through pixel-space ys; NaN gaps split the line. */
export function buildLinePath(ys: Float64Array, width: number): string {
  const n = ys.length;
  if (n < 2) return '';
  const dx = width / (n - 1);
  const parts: string[] = [];
  eachRun(ys, (from, to) => {
    if (to - from === 1) {
      // Isolated sample: draw a zero-length segment so round linecaps show a dot.
      parts.push(`M ${fmt(from * dx)} ${fmt(ys[from])} l 0.01 0`);
      return;
    }
    const m = tangents(ys, from, to, dx);
    parts.push(`M ${fmt(from * dx)} ${fmt(ys[from])}`);
    for (let i = from; i < to - 1; i++) {
      const k = i - from;
      const x0 = i * dx;
      const x1 = (i + 1) * dx;
      const c1x = x0 + dx / 3;
      const c1y = ys[i] + (m[k] * dx) / 3;
      const c2x = x1 - dx / 3;
      const c2y = ys[i + 1] - (m[k + 1] * dx) / 3;
      parts.push(`C ${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(x1)} ${fmt(ys[i + 1])}`);
    }
  });
  return parts.join(' ');
}

/** Area under the line, closed to `baseY`, one subpath per finite run. */
export function buildAreaPath(ys: Float64Array, width: number, baseY: number): string {
  const n = ys.length;
  if (n < 2) return '';
  const dx = width / (n - 1);
  const parts: string[] = [];
  eachRun(ys, (from, to) => {
    if (to - from === 1) return;
    const m = tangents(ys, from, to, dx);
    parts.push(`M ${fmt(from * dx)} ${fmt(baseY)} L ${fmt(from * dx)} ${fmt(ys[from])}`);
    for (let i = from; i < to - 1; i++) {
      const k = i - from;
      const x0 = i * dx;
      const x1 = (i + 1) * dx;
      parts.push(
        `C ${fmt(x0 + dx / 3)} ${fmt(ys[i] + (m[k] * dx) / 3)} ${fmt(x1 - dx / 3)} ${fmt(
          ys[i + 1] - (m[k + 1] * dx) / 3
        )} ${fmt(x1)} ${fmt(ys[i + 1])}`
      );
    }
    parts.push(`L ${fmt((to - 1) * dx)} ${fmt(baseY)} Z`);
  });
  return parts.join(' ');
}

export function firstFiniteIndex(arr: Float64Array): number {
  for (let i = 0; i < arr.length; i++) if (Number.isFinite(arr[i])) return i;
  return -1;
}

export function lastFiniteIndex(arr: Float64Array): number {
  for (let i = arr.length - 1; i >= 0; i--) if (Number.isFinite(arr[i])) return i;
  return -1;
}

export function extremeIndices(arr: Float64Array): { min: number; max: number } {
  let min = -1;
  let max = -1;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (!Number.isFinite(v)) continue;
    if (min < 0 || v < arr[min]) min = i;
    if (max < 0 || v > arr[max]) max = i;
  }
  return { min, max };
}

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
export const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);
