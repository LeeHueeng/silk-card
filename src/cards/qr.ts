import { LitElement, html, svg, css, nothing, TemplateResult, SVGTemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from '../types';
import { silkControlStyles } from '../shared/base';
import { isUnavailable, moreInfo } from '../shared/service';
import { accentFor } from '../shared/color';
import { registerEditor } from '../shared/editor';

export const META = {
  type: 'silk-qr-card',
  name: 'Silk QR',
  description: 'A scannable code, generated on the spot.',
};

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * Minimal QR encoder — ISO/IEC 18004 (2015), zero dependencies.
 *
 * Scope: byte mode, error-correction level M, symbol versions 1–10, data mask
 * pattern 0 fixed. Sections implemented here:
 *
 *   §6.4.4  / §7.4.4  byte-mode segment: mode indicator 0100 + character count
 *                     (8 bits for versions 1–9, 16 bits from version 10)
 *   §7.4.9  / §7.4.10 terminator (up to four 0 bits) and pad codewords
 *                     alternating 11101100 / 00010001
 *   §7.5.2            Reed–Solomon over GF(2^8), primitive polynomial
 *                     x^8+x^4+x^3+x^2+1 (0x11D), generator root α^0…α^(n-1)
 *   §7.6              block splitting and codeword interleaving (Table 9)
 *   §7.3.2 / §7.3.3   finder patterns and separators
 *   §7.3.4            timing patterns
 *   §7.3.5            alignment patterns (Table E.1 centres)
 *   §7.7              symbol character placement, two-module-wide zigzag,
 *                     skipping the vertical timing column
 *   §7.8.2            data mask pattern 000 — (i + j) mod 2 = 0
 *   §7.9.1            format information, BCH(15,5), generator 0x537,
 *                     masked with 101010000010010
 *   §7.9.2            version information, BCH(18,6), generator 0x1F25
 *                     (required from version 7 up)
 *   §7.3.7            quiet zone, 4 modules on every side
 *
 * Deliberately out of scope: numeric / alphanumeric / kanji modes, ECI, mask
 * penalty evaluation (§7.8.3), structured append and Micro QR.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Highest version this encoder builds; past it the text simply doesn't fit. */
const MAX_VERSION = 10;
/** §7.3.7 — four light modules on every side. */
const QUIET = 4;

/**
 * Per version (index = version − 1), error-correction level M:
 * [EC codewords per block, group-1 blocks, group-1 data codewords,
 *  group-2 blocks, group-2 data codewords] — ISO/IEC 18004 Tables 13–22.
 */
const VERSION_M: readonly (readonly [number, number, number, number, number])[] = [
  [10, 1, 16, 0, 0],
  [16, 1, 28, 0, 0],
  [26, 1, 44, 0, 0],
  [18, 2, 32, 0, 0],
  [24, 2, 43, 0, 0],
  [16, 4, 27, 0, 0],
  [18, 4, 31, 0, 0],
  [22, 2, 38, 2, 39],
  [22, 3, 36, 2, 37],
  [26, 4, 43, 1, 44],
];

/** §7.3.5 / Table E.1 — alignment pattern centre coordinates per version. */
const ALIGN_CENTRES: readonly (readonly number[])[] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

/** Format-information data bits: level M = 00, mask pattern 000. */
const FORMAT_DATA_M_MASK0 = 0b00_000;

// ---- GF(2^8) arithmetic, §7.5.2 ------------------------------------------

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d; // x^8 + x^4 + x^3 + x^2 + 1
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

/** Monic generator polynomial of degree `n`, leading term implied. */
function rsDivisor(degree: number): Uint8Array {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

/** Polynomial-division remainder — the block's error-correction codewords. */
function rsRemainder(data: Uint8Array, divisor: Uint8Array): Uint8Array {
  const n = divisor.length;
  const result = new Uint8Array(n);
  for (let d = 0; d < data.length; d++) {
    const factor = data[d] ^ result[0];
    result.copyWithin(0, 1);
    result[n - 1] = 0;
    for (let i = 0; i < n; i++) result[i] ^= gfMul(divisor[i], factor);
  }
  return result;
}

const bitAt = (value: number, i: number): boolean => ((value >>> i) & 1) !== 0;

// ---- Data encoding, §7.4 --------------------------------------------------

/** Smallest version 1–10 that fits `byteLength` bytes at level M, else 0. */
function pickVersion(byteLength: number): number {
  for (let v = 1; v <= MAX_VERSION; v++) {
    const [, g1, d1, g2, d2] = VERSION_M[v - 1];
    const countBits = v < 10 ? 8 : 16;
    if (4 + countBits + byteLength * 8 <= (g1 * d1 + g2 * d2) * 8) return v;
  }
  return 0;
}

/** Header + payload + terminator + padding, as `dataCw` codewords. */
function buildDataCodewords(bytes: Uint8Array, version: number, dataCw: number): Uint8Array {
  const bits: number[] = [];
  const push = (value: number, len: number): void => {
    for (let i = len - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  push(0b0100, 4); // §7.4.4 byte mode indicator
  push(bytes.length, version < 10 ? 8 : 16);
  for (let i = 0; i < bytes.length; i++) push(bytes[i], 8);

  const capacity = dataCw * 8;
  for (let i = 0; i < 4 && bits.length < capacity; i++) bits.push(0); // §7.4.9
  while (bits.length % 8 !== 0) bits.push(0);

  const out = new Uint8Array(dataCw);
  for (let i = 0; i < bits.length; i++) out[i >>> 3] |= bits[i] << (7 - (i & 7));
  // §7.4.10 — alternating pad codewords fill whatever capacity is left.
  let pad = 0xec;
  for (let i = bits.length / 8; i < dataCw; i++) {
    out[i] = pad;
    pad = pad === 0xec ? 0x11 : 0xec;
  }
  return out;
}

/** §7.6 — split into blocks, append EC codewords, interleave both runs. */
function interleave(data: Uint8Array, version: number): Uint8Array {
  const [ecPerBlock, g1, d1, g2, d2] = VERSION_M[version - 1];
  const divisor = rsDivisor(ecPerBlock);
  const blocks: Uint8Array[] = [];
  const eccs: Uint8Array[] = [];
  let offset = 0;
  for (let b = 0; b < g1 + g2; b++) {
    const len = b < g1 ? d1 : d2;
    const block = data.subarray(offset, offset + len);
    offset += len;
    blocks.push(block);
    eccs.push(rsRemainder(block, divisor));
  }

  const out = new Uint8Array(data.length + ecPerBlock * blocks.length);
  let k = 0;
  const widest = Math.max(d1, g2 > 0 ? d2 : 0);
  for (let i = 0; i < widest; i++) {
    for (const block of blocks) if (i < block.length) out[k++] = block[i];
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (const ecc of eccs) out[k++] = ecc[i];
  }
  return out;
}

// ---- Symbol construction, §7.3 / §7.7 / §7.8 / §7.9 -----------------------

function buildMatrix(version: number, codewords: Uint8Array): boolean[][] {
  const size = version * 4 + 17;
  const modules: boolean[][] = Array.from({ length: size }, () =>
    new Array<boolean>(size).fill(false)
  );
  // Function patterns are immune to masking and never carry data (§7.8.1).
  const reserved: boolean[][] = Array.from({ length: size }, () =>
    new Array<boolean>(size).fill(false)
  );

  /** Coordinates are (x = column, y = row); out-of-range writes are dropped. */
  const set = (x: number, y: number, dark: boolean): void => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    modules[y][x] = dark;
    reserved[y][x] = true;
  };

  // §7.3.4 timing patterns — laid first, then overdrawn by the finders.
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }

  // §7.3.2 finder patterns, with their §7.3.3 separators (the ring at d = 4).
  const finder = (cx: number, cy: number): void => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        set(cx + dx, cy + dy, d !== 2 && d !== 4);
      }
    }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);

  // §7.3.5 alignment patterns — the three finder corners are skipped.
  const centres = ALIGN_CENTRES[version - 1];
  for (let i = 0; i < centres.length; i++) {
    for (let j = 0; j < centres.length; j++) {
      const corner =
        (i === 0 && j === 0) ||
        (i === 0 && j === centres.length - 1) ||
        (i === centres.length - 1 && j === 0);
      if (corner) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          set(centres[i] + dx, centres[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }

  // §7.9.1 format information: BCH(15,5) over the 5 data bits, then masked.
  let rem = FORMAT_DATA_M_MASK0;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const format = ((FORMAT_DATA_M_MASK0 << 10) | rem) ^ 0x5412;
  for (let i = 0; i <= 5; i++) set(8, i, bitAt(format, i));
  set(8, 7, bitAt(format, 6));
  set(8, 8, bitAt(format, 7));
  set(7, 8, bitAt(format, 8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, bitAt(format, i));
  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bitAt(format, i));
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, bitAt(format, i));
  set(8, size - 8, true); // the always-dark module

  // §7.9.2 version information, two 3×6 blocks, versions 7 and up only.
  if (version >= 7) {
    let vrem = version;
    for (let i = 0; i < 12; i++) vrem = (vrem << 1) ^ ((vrem >>> 11) * 0x1f25);
    const versionBits = (version << 12) | vrem;
    for (let i = 0; i < 18; i++) {
      const dark = bitAt(versionBits, i);
      const far = size - 11 + (i % 3);
      const near = Math.floor(i / 3);
      set(far, near, dark);
      set(near, far, dark);
    }
  }

  // §7.7 placement: two-module columns, right to left, alternating direction.
  let bit = 0;
  const totalBits = codewords.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // step over the vertical timing pattern
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (reserved[y][x] || bit >= totalBits) continue;
        modules[y][x] = bitAt(codewords[bit >>> 3], 7 - (bit & 7));
        bit++;
      }
    }
  }

  // §7.8.2 data mask pattern 000.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!reserved[y][x] && (x + y) % 2 === 0) modules[y][x] = !modules[y][x];
    }
  }

  return modules;
}

/** Rows of dark/light modules, or null when the text exceeds version 10. */
function encodeQr(text: string): boolean[][] | null {
  const bytes = new TextEncoder().encode(text);
  const version = pickVersion(bytes.length);
  if (version === 0) return null;
  const [, g1, d1, g2, d2] = VERSION_M[version - 1];
  const data = buildDataCodewords(bytes, version, g1 * d1 + g2 * d2);
  return buildMatrix(version, interleave(data, version));
}

// ---- Card -----------------------------------------------------------------

export interface SilkQrWifi {
  ssid: string;
  password?: string;
  encryption?: 'WPA' | 'WEP' | 'nopass';
  hidden?: boolean;
}

export interface SilkQrCardConfig extends LovelaceCardConfig {
  /** Literal text to encode. */
  text?: string;
  /** Encode this entity's state instead. */
  entity?: string;
  /** Encode a Wi-Fi join string. YAML-only. */
  wifi?: SilkQrWifi;
  name?: string;
  color?: string;
}

const ENCRYPTIONS = ['WPA', 'WEP', 'nopass'];

/**
 * Wi-Fi Network config string, per the Wi-Fi Alliance / ZXing convention:
 * `WIFI:T:WPA;S:ssid;P:password;H:true;;` with `\ ; , :` and `"` backslashed.
 */
function wifiPayload(wifi: SilkQrWifi): string {
  const esc = (value: string): string => value.replace(/([\\;,:"])/g, '\\$1');
  const type = wifi.encryption ?? 'WPA';
  let out = `WIFI:T:${type};S:${esc(wifi.ssid)};`;
  if (type !== 'nopass' && wifi.password) out += `P:${esc(wifi.password)};`;
  if (wifi.hidden) out += 'H:true;';
  return `${out};`;
}

const EDITOR_TAG = 'silk-qr-card-editor';

registerEditor(
  EDITOR_TAG,
  [
    { name: 'name', selector: { text: {} } },
    { name: 'text', selector: { text: {} } },
    { name: 'entity', selector: { entity: {} } },
  ],
  { name: 'Caption', text: 'Text', entity: 'Entity (encodes its state)' }
);

@customElement('silk-qr-card')
export class SilkQrCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SilkQrCardConfig;

  /** The string the current matrix was built from — the memo key. */
  private _encoded = '';
  private _matrix: boolean[][] | null = null;
  /** True when the payload needs a symbol larger than version 10. */
  private _tooLong = false;

  public static getStubConfig(): Partial<SilkQrCardConfig> {
    return { type: 'custom:silk-qr-card', text: 'https://www.home-assistant.io' };
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: SilkQrCardConfig): void {
    // An empty string from the visual editor counts as "not set", so switching
    // between the text and entity fields never lands in the two-sources error.
    const hasText = typeof config.text === 'string' && config.text !== '';
    const hasEntity = typeof config.entity === 'string' && config.entity !== '';
    const hasWifi = config.wifi !== undefined;
    if (config.text !== undefined && typeof config.text !== 'string') {
      throw new Error('silk-qr-card: `text` must be a string');
    }
    if (config.entity !== undefined && typeof config.entity !== 'string') {
      throw new Error('silk-qr-card: `entity` must be an entity id');
    }
    if ([hasText, hasEntity, hasWifi].filter(Boolean).length !== 1) {
      throw new Error('silk-qr-card: set exactly one of `text`, `entity` or `wifi`');
    }
    if (hasWifi) {
      const wifi = config.wifi as Partial<SilkQrWifi> | null;
      if (typeof wifi !== 'object' || wifi === null || !wifi.ssid) {
        throw new Error('silk-qr-card: `wifi` needs an `ssid`');
      }
      if (wifi.encryption !== undefined && !ENCRYPTIONS.includes(wifi.encryption)) {
        throw new Error('silk-qr-card: `wifi.encryption` must be WPA, WEP or nopass');
      }
    }
    this._config = config;
  }

  public getCardSize(): number {
    return 3;
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 3, rows: 3, min_columns: 2, min_rows: 2 };
  }

  protected willUpdate(): void {
    this._sync(this._payload());
  }

  /** The string this card should encode right now ('' = nothing to encode). */
  private _payload(): string {
    const config = this._config;
    if (!config) return '';
    if (config.wifi) return wifiPayload(config.wifi);
    if (config.entity) {
      const stateObj = this.hass?.states[config.entity];
      if (!stateObj || isUnavailable(stateObj)) return '';
      return stateObj.state;
    }
    return config.text ?? '';
  }

  /** Re-encode only when the payload actually changed. */
  private _sync(payload: string): void {
    if (payload === this._encoded) return;
    this._encoded = payload;
    if (!payload) {
      this._matrix = null;
      this._tooLong = false;
      return;
    }
    let matrix: boolean[][] | null = null;
    try {
      matrix = encodeQr(payload);
    } catch (err) {
      console.warn('silk-qr-card: encoding failed', err);
    }
    this._matrix = matrix;
    this._tooLong = matrix === null;
  }

  private _onCardClick(): void {
    if (this._config?.entity) moreInfo(this, this._config.entity);
  }

  private _renderCode(matrix: boolean[][], label: string): TemplateResult {
    const size = matrix.length;
    const dim = size + QUIET * 2;
    const rects: SVGTemplateResult[] = [];
    // Horizontal runs collapse into one <rect>: a version-10 symbol drops from
    // ~1600 nodes to a few hundred, and seams between neighbours disappear.
    for (let y = 0; y < size; y++) {
      const row = matrix[y];
      let x = 0;
      while (x < size) {
        if (!row[x]) {
          x++;
          continue;
        }
        let run = 1;
        while (x + run < size && row[x + run]) run++;
        rects.push(
          svg`<rect x=${x + QUIET} y=${y + QUIET} width=${run} height="1"></rect>`
        );
        x += run;
      }
    }
    return html`
      <svg viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges" role="img" aria-label=${label}>
        <rect class="quiet" x="0" y="0" width=${dim} height=${dim}></rect>
        <g class="modules">${rects}</g>
      </svg>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    const stateObj = config.entity ? this.hass?.states[config.entity] : undefined;
    if (config.entity && this.hass && !stateObj) {
      return html`<ha-card><div class="warning">Entity not found: ${config.entity}</div></ha-card>`;
    }

    const unavailable = config.entity ? isUnavailable(stateObj) : false;
    const accent = accentFor(stateObj, config.color);
    const caption = config.name ?? config.wifi?.ssid;
    // The label never carries the payload itself — a Wi-Fi string holds a
    // password, and a URL read aloud is noise.
    const label = config.wifi
      ? `QR code for Wi-Fi network ${config.wifi.ssid}`
      : caption
        ? `QR code: ${caption}`
        : 'QR code';

    return html`
      <ha-card
        class=${unavailable ? 'unavailable' : ''}
        style="--silk-accent:${accent}"
        @click=${this._onCardClick}
      >
        <div class="code">
          ${this._matrix
            ? this._renderCode(this._matrix, label)
            : html`<div class="note">
                ${this._tooLong ? 'Text too long for a QR code' : 'Nothing to encode'}
              </div>`}
        </div>
        ${caption ? html`<div class="caption" title=${caption}>${caption}</div>` : nothing}
      </ha-card>
    `;
  }

  static styles = [
    silkControlStyles,
    css`
      /* Inert unless an entity is behind it — then the card opens more-info. */
      ha-card {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px;
        cursor: default;
      }
      .code {
        flex: 1;
        width: 100%;
        min-height: 0;
        display: grid;
        place-items: center;
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
        max-width: 100%;
        max-height: 100%;
        animation: silk-qr-in 250ms var(--silk-ease-out);
      }
      /* Light modules are the card surface; dark modules are the text color,
         so the symbol inverts with the theme — scanners read either polarity. */
      .quiet {
        fill: var(--ha-card-background, var(--card-background-color, #fff));
      }
      .modules rect {
        fill: var(--primary-text-color);
      }
      .caption {
        flex: none;
        max-width: 100%;
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .note {
        font-size: 12px;
        line-height: 1.3;
        color: var(--secondary-text-color);
        text-align: center;
        padding: 0 8px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .unavailable .code,
      .unavailable .caption {
        opacity: 0.45;
      }
      @keyframes silk-qr-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'silk-qr-card': SilkQrCard;
  }
}
