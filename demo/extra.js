// Wave-5 demo data: extra mock entities, extra websocket answers, and the
// gallery sections for the ~100 cards added in v0.6.0.
// demo/index.html imports EXTRA_STATES, EXTRA_SECTIONS and EXTRA_WS from here.
//
// Layout of this file
//   1. tiny helpers (time, entity literal, seeded noise, inline SVG art)
//   2. SERIES — numeric sensors that need history / long-term statistics
//   3. TRACKS — on/off (and enum) entities that need a history timeline
//   4. EXTRA_STATES — every new mock entity, grouped by what it feeds
//   5. mock backends — statistics, history, calendars, logbook, todo, registry
//   6. EXTRA_WS + the <silk-demo-bridge> hass hook that installs the backends
//   7. EXTRA_SECTIONS — the gallery, grouped by theme
//
// Nothing here imports anything: plain ES module, no build step.

/* ------------------------------------------------------------------ *
 * 1. helpers
 * ------------------------------------------------------------------ */

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

const NOW = Date.now();
const NOW_S = NOW / 1000;

const nowIso = () => new Date().toISOString();
const ago = (ms) => new Date(NOW - ms).toISOString();
const ahead = (ms) => new Date(NOW + ms).toISOString();
/** Local-midnight-anchored ISO date, `d` days from today. */
const dateOnly = (d = 0) => {
  const x = new Date(NOW + d * DAY);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
/** Local midnight (ms) `d` days from today. */
const midnight = (d = 0) => {
  const x = new Date(NOW + d * DAY);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};
/** Today at HH:MM local, as ISO. */
const at = (h, m = 0, d = 0) => new Date(midnight(d) + h * HOUR + m * MIN).toISOString();

/** `changedAgo` backdates last_changed so "for 2h 10m" reads like a real home. */
const E = (id, state, attributes = {}, changedAgo = 0) => [
  id,
  {
    entity_id: id,
    state: String(state),
    attributes,
    last_changed: changedAgo ? ago(changedAgo) : nowIso(),
    last_updated: changedAgo ? ago(changedAgo) : nowIso(),
  },
];

/** Deterministic 0..1 noise — screenshots must not drift between runs. */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Stable hash of a string, so an entity id alone can seed a generator. */
function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const svgURI = (w, h, body) =>
  'data:image/svg+xml;base64,' +
  btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);

/** Poster art for the library shelf — ASCII only, btoa is latin-1. */
const poster = (a, b, label) =>
  svgURI(
    120,
    180,
    `<rect width="120" height="180" fill="${a}"/><circle cx="76" cy="58" r="38" fill="${b}" opacity=".8"/>` +
      `<rect x="-10" y="120" width="140" height="60" fill="rgba(0,0,0,.34)"/>` +
      `<text x="9" y="152" fill="#fff" font-family="Helvetica,Arial" font-size="13" font-weight="700">${label}</text>`
  );

const CAM = (n) => `/demo/porch.svg?cam=${n}`;

/* ------------------------------------------------------------------ *
 * 2. SERIES — numeric sensors with history + statistics behind them
 *
 * base   midline of the daily wave
 * amp    daily swing (peaks mid-afternoon)
 * noise  jitter amplitude
 * week   slow multi-day drift
 * dp     decimals used for the live state
 * chg    per-day total for statistics `change` (energy-style sensors)
 * ------------------------------------------------------------------ */

const SERIES = {
  // --- rooms ------------------------------------------------------
  'sensor.kitchen_temp': { name: '주방', unit: '°C', base: 24.4, amp: 1.6, noise: 0.12, dp: 1, dc: 'temperature' },
  'sensor.bath_temp': { name: '욕실', unit: '°C', base: 25.6, amp: 1.2, noise: 0.1, dp: 1, dc: 'temperature' },
  'sensor.kids_temp': { name: '아이방', unit: '°C', base: 23.1, amp: 2.2, noise: 0.14, dp: 1, dc: 'temperature' },
  'sensor.balcony_temp_ok': { name: '베란다', unit: '°C', base: 28.6, amp: 4.4, noise: 0.2, dp: 1, dc: 'temperature' },
  'sensor.kitchen_humidity': { name: '주방 습도', unit: '%', base: 52, amp: 9, noise: 0.7, dp: 0, dc: 'humidity' },
  'sensor.bath_humidity': { name: '욕실 습도', unit: '%', base: 68, amp: 13, noise: 1.1, dp: 0, dc: 'humidity' },
  'sensor.kids_humidity': { name: '아이방 습도', unit: '%', base: 49, amp: 7, noise: 0.6, dp: 0, dc: 'humidity' },
  'sensor.outdoor_humidity': { name: '바깥 습도', unit: '%', base: 71, amp: 16, noise: 1.2, dp: 0, dc: 'humidity' },
  'sensor.pm25': { name: '초미세먼지', unit: 'µg/m³', base: 21, amp: 11, noise: 1.6, dp: 0, dc: 'pm25' },

  // --- energy -----------------------------------------------------
  'sensor.energy_today': { name: '오늘 사용량', unit: 'kWh', base: 12.6, amp: 6.4, noise: 0.1, dp: 1, dc: 'energy', sc: 'total_increasing', chg: 19.4 },
  'sensor.energy_month': { name: '이번 달 사용량', unit: 'kWh', base: 286, amp: 6, noise: 0.4, dp: 1, dc: 'energy', sc: 'total_increasing', chg: 19.4 },
  'sensor.solar_today_kwh': { name: '오늘 발전량', unit: 'kWh', base: 8.4, amp: 6.2, noise: 0.1, dp: 1, dc: 'energy', sc: 'total_increasing', chg: 14.8 },
  'sensor.grid_export_today': { name: '오늘 판매량', unit: 'kWh', base: 3.1, amp: 2.4, noise: 0.06, dp: 2, dc: 'energy', sc: 'total_increasing', chg: 5.6 },
  'sensor.grid_import_today': { name: '오늘 구매량', unit: 'kWh', base: 5.2, amp: 3.1, noise: 0.08, dp: 2, dc: 'energy', sc: 'total_increasing', chg: 9.2 },
  'sensor.fridge_energy_today': { name: '냉장고', unit: 'kWh', base: 1.14, amp: 0.5, noise: 0.02, dp: 2, dc: 'energy', sc: 'total_increasing', chg: 1.86 },
  'sensor.aircon_energy_today': { name: '에어컨', unit: 'kWh', base: 3.8, amp: 3.2, noise: 0.05, dp: 2, dc: 'energy', sc: 'total_increasing', chg: 6.42 },
  'sensor.washer_energy_today': { name: '세탁기', unit: 'kWh', base: 0.58, amp: 0.4, noise: 0.02, dp: 2, dc: 'energy', sc: 'total_increasing', chg: 0.92 },
  'sensor.tv_energy_today': { name: 'TV', unit: 'kWh', base: 0.74, amp: 0.5, noise: 0.02, dp: 2, dc: 'energy', sc: 'total_increasing', chg: 1.24 },
  'sensor.oven_energy_today': { name: '오븐', unit: 'kWh', base: 0.42, amp: 0.36, noise: 0.02, dp: 2, dc: 'energy', sc: 'total_increasing', chg: 0.74 },
  'sensor.server_energy_today': { name: '홈서버', unit: 'kWh', base: 1.74, amp: 0.3, noise: 0.02, dp: 2, dc: 'energy', sc: 'total_increasing', chg: 2.91 },
  'sensor.boiler_energy_today': { name: '보일러', unit: 'kWh', base: 1.9, amp: 1.4, noise: 0.03, dp: 2, dc: 'energy', sc: 'total_increasing', chg: 3.12 },
  // `attrs` rides along into the mock entity — here, the hourly forecast the
  // carbon card draws as a 24-bar strip.
  'sensor.grid_carbon': { name: '전력 탄소집약도', unit: 'gCO₂/kWh', base: 306, amp: 88, noise: 6, dp: 0, attrs: () => ({ forecast: CARBON_FORECAST }) },

  // --- standby power ----------------------------------------------
  'sensor.tv_standby_power': { name: 'TV 대기전력', unit: 'W', base: 11.8, amp: 3, noise: 0.4, dp: 1, dc: 'power' },
  'sensor.console_power': { name: '콘솔 대기전력', unit: 'W', base: 3.4, amp: 1.2, noise: 0.2, dp: 1, dc: 'power' },
  'sensor.soundbar_power': { name: '사운드바', unit: 'W', base: 6.6, amp: 2.2, noise: 0.3, dp: 1, dc: 'power' },
  'sensor.microwave_power': { name: '전자레인지', unit: 'W', base: 2.1, amp: 0.6, noise: 0.1, dp: 1, dc: 'power' },
  'sensor.router_power': { name: '공유기', unit: 'W', base: 14.2, amp: 1.4, noise: 0.2, dp: 1, dc: 'power' },
  'sensor.desk_power': { name: '책상 멀티탭', unit: 'W', base: 42, amp: 34, noise: 3, dp: 1, dc: 'power', spiky: true },

  // --- servers ----------------------------------------------------
  'sensor.nas_cpu': { name: 'NAS CPU', unit: '%', base: 26, amp: 17, noise: 3.4, dp: 1, icon: 'mdi:cpu-64-bit', spiky: true },
  'sensor.nas_memory': { name: 'NAS 메모리', unit: '%', base: 61, amp: 7, noise: 1.1, dp: 1, icon: 'mdi:cpu-64-bit' },
  'sensor.nas_disk': { name: 'NAS 디스크', unit: '%', base: 74, amp: 1.4, noise: 0.2, dp: 1, icon: 'mdi:harddisk' },
  'sensor.nas_swap': { name: 'NAS 스왑', unit: '%', base: 8.4, amp: 3, noise: 0.6, dp: 1 },
  'sensor.nas_load': { name: 'NAS 부하', unit: '', base: 0.42, amp: 0.3, noise: 0.05, dp: 2 },
  'sensor.db_size': { name: '레코더 DB', unit: 'MiB', base: 1840, amp: 18, noise: 4, dp: 0, week: 0, trend: 17, icon: 'mdi:harddisk' },
  'sensor.db_rows': { name: 'DB 행 수', unit: '', base: 18_420_000, amp: 240_000, noise: 8000, dp: 0 },

  // --- network ----------------------------------------------------
  'sensor.bw_tv': { name: '거실 TV', unit: 'Mbit/s', base: 4.1, amp: 3.4, noise: 0.6, dp: 1, spiky: true },
  'sensor.bw_laptop': { name: '노트북', unit: 'Mbit/s', base: 1.9, amp: 1.6, noise: 0.4, dp: 1 },
  'sensor.bw_phone': { name: '아이폰', unit: 'Mbit/s', base: 0.9, amp: 0.8, noise: 0.2, dp: 2 },
  'sensor.bw_nas': { name: 'NAS', unit: 'Mbit/s', base: 6.2, amp: 4.8, noise: 1.1, dp: 1, spiky: true },
  'sensor.bw_console': { name: '플스', unit: 'Mbit/s', base: 0.4, amp: 0.35, noise: 0.1, dp: 2 },
  'sensor.bw_total': { name: '전체 트래픽', unit: 'Mbit/s', base: 14.6, amp: 8, noise: 1.4, dp: 1 },
  'sensor.ping_proxmox_latency': { name: 'Proxmox 지연', unit: 'ms', base: 1.4, amp: 0.6, noise: 0.2, dp: 1 },
  'sensor.ping_cloudflare_latency': { name: 'Cloudflare 지연', unit: 'ms', base: 12.4, amp: 4, noise: 1.4, dp: 1 },

  // --- outside / prices -------------------------------------------
  'sensor.fuel_gs': { name: 'GS칼텍스 역삼', unit: 'KRW/L', base: 1712, amp: 9, noise: 2, dp: 0, week: 24 },
  'sensor.fuel_soil': { name: 'S-OIL 논현', unit: 'KRW/L', base: 1689, amp: 8, noise: 2, dp: 0, week: 21 },
  'sensor.fuel_hyundai': { name: '현대오일 삼성', unit: 'KRW/L', base: 1745, amp: 7, noise: 2, dp: 0, week: 18 },
  'sensor.commute_work_duration': { name: '출근 소요시간', unit: 'min', base: 34, amp: 12, noise: 1.6, dp: 0, icon: 'mdi:car' },
  'sensor.commute_alt_duration': { name: '우회로 소요시간', unit: 'min', base: 41, amp: 9, noise: 1.4, dp: 0, icon: 'mdi:car' },
  'sensor.commute_school_duration': { name: '학교 소요시간', unit: 'min', base: 14, amp: 5, noise: 0.8, dp: 0, icon: 'mdi:map-marker' },

  // --- wellbeing --------------------------------------------------
  'sensor.steps': { name: '걸음 수', unit: 'steps', base: 5400, amp: 4200, noise: 60, dp: 0, chg: 8420, icon: 'mdi:gesture-tap' },
  'sensor.exercise_minutes': { name: '운동', unit: 'min', base: 24, amp: 18, noise: 1, dp: 0, chg: 38, icon: 'mdi:speedometer' },
  'sensor.stand_hours': { name: '일어선 시간', unit: 'h', base: 6, amp: 4, noise: 0.2, dp: 0, chg: 9, icon: 'mdi:account' },
  'sensor.sleep_duration': { name: '수면 시간', unit: 'h', base: 7.1, amp: 0.7, noise: 0.08, dp: 1, icon: 'mdi:weather-night' },
  'sensor.sleep_score': { name: '수면 점수', unit: '', base: 81, amp: 9, noise: 1.2, dp: 0 },
  'sensor.tank_temp': { name: '어항 수온', unit: '°C', base: 25.7, amp: 0.7, noise: 0.06, dp: 1, dc: 'temperature' },
  'sensor.tank_ph': { name: '어항 pH', unit: '', base: 7.15, amp: 0.14, noise: 0.02, dp: 2 },
  'sensor.tank_tds': { name: '어항 TDS', unit: 'ppm', base: 186, amp: 14, noise: 2, dp: 0 },
  'sensor.tank_level': { name: '어항 수위', unit: '%', base: 84, amp: 5, noise: 0.6, dp: 0 },
};

/** Value of a SERIES sensor at unix-second `t`. */
function seriesAt(id, t) {
  const s = SERIES[id];
  if (!s) return NaN;
  const seed = s.seed ?? hashSeed(id);
  const rng = mulberry32(seed + Math.floor(t / 1800));
  const day = Math.sin(((t % 86400) / 86400) * Math.PI * 2 - Math.PI / 2);
  const slow = Math.sin(t / 190000 + (seed % 7)) * (s.week ?? s.amp * 0.3);
  // `trend` is a steady climb per day (a database that only ever grows).
  const trend = s.trend ? (s.trend * (t - NOW_S)) / 86400 : 0;
  let v = s.base + day * s.amp + slow + trend + (rng() - 0.5) * 2 * (s.noise ?? 0);
  if (s.spiky && rng() > 0.87) v += s.amp * (0.7 + rng());
  return v;
}

/** Live state string for a SERIES sensor, matching its own chart. */
const seriesState = (id) => seriesAt(id, NOW_S).toFixed(SERIES[id].dp ?? 1);

/** Per-bucket `change` for statistics: energy-style totals, never negative. */
function changeAt(id, t, stepSec) {
  const s = SERIES[id];
  const perDay = s?.chg ?? Math.abs(s?.base ?? 1) / 24;
  const rng = mulberry32(hashSeed(id) + Math.floor(t / 3600));
  const dayShape = 0.55 + 0.45 * Math.sin(((t % 86400) / 86400) * Math.PI * 2 - Math.PI / 2);
  const weekly = 0.82 + 0.36 * Math.abs(Math.sin(t / 121000 + (hashSeed(id) % 5)));
  return (perDay * (stepSec / 86400)) * dayShape * weekly * (0.86 + rng() * 0.3);
}

/* ------------------------------------------------------------------ *
 * 3. TRACKS — entities whose history is a timeline of states
 * ------------------------------------------------------------------ */

const TRACKS = {
  'binary_sensor.motion_living': { on: 'on', off: 'off', duty: 0.1, meanOn: 4 * MIN },
  'binary_sensor.motion_kitchen': { on: 'on', off: 'off', duty: 0.08, meanOn: 3 * MIN },
  'binary_sensor.motion_entrance': { on: 'on', off: 'off', duty: 0.05, meanOn: 2 * MIN },
  'binary_sensor.motion_corridor': { on: 'on', off: 'off', duty: 0.12, meanOn: 3 * MIN },
  'binary_sensor.occupancy_office': { on: 'on', off: 'off', duty: 0.34, meanOn: 46 * MIN },
  'binary_sensor.occupancy_bed': { on: 'on', off: 'off', duty: 0.3, meanOn: 90 * MIN },
  'binary_sensor.door_front': { on: 'on', off: 'off', duty: 0.03, meanOn: 40_000 },
  'binary_sensor.window_kitchen': { on: 'on', off: 'off', duty: 0.2, meanOn: 40 * MIN },
  'binary_sensor.window_bedroom': { on: 'on', off: 'off', duty: 0.16, meanOn: 55 * MIN },
  'binary_sensor.doorbell': { on: 'on', off: 'off', duty: 0.006, meanOn: 20_000 },
  'binary_sensor.wan_online': { on: 'on', off: 'off', duty: 0.987, meanOn: 9 * HOUR, invertGaps: true },
  'binary_sensor.ping_router': { on: 'on', off: 'off', duty: 0.995, meanOn: 12 * HOUR },
  'binary_sensor.ping_nas': { on: 'on', off: 'off', duty: 0.98, meanOn: 8 * HOUR },
  'binary_sensor.ping_printer': { on: 'off', off: 'on', duty: 0.6, meanOn: 3 * HOUR },
  'binary_sensor.wg_laptop': { on: 'on', off: 'off', duty: 0.45, meanOn: 2 * HOUR },
  'binary_sensor.wg_phone': { on: 'on', off: 'off', duty: 0.8, meanOn: 5 * HOUR },
  'binary_sensor.wg_tablet': { on: 'off', off: 'off', duty: 0.05, meanOn: 30 * MIN },
  'switch.fireplace': { on: 'on', off: 'off', duty: 0.22, meanOn: 70 * MIN },
  'switch.tank_pump': { on: 'on', off: 'off', duty: 0.85, meanOn: 4 * HOUR },
  'switch.dehumidifier': { on: 'on', off: 'off', duty: 0.3, meanOn: 45 * MIN },
  'climate.aircon_runtime': { on: 'cool', off: 'off', duty: 0.42, meanOn: 32 * MIN },
  'water_heater.boiler': { on: 'eco', off: 'off', duty: 0.36, meanOn: 26 * MIN },
};

/**
 * Deterministic on/off run list over [startSec, endSec]. Runs alternate,
 * their lengths seeded from the entity id so a reload draws the same day.
 */
function trackRows(id, startSec, endSec) {
  const spec = TRACKS[id];
  if (!spec) return [];
  const rng = mulberry32(hashSeed(id));
  const rows = [];
  const meanOnSec = spec.meanOn / 1000;
  const meanOffSec = (meanOnSec * (1 - spec.duty)) / Math.max(spec.duty, 0.001);
  // Start a little before the window so the first block is already running.
  let t = startSec - meanOffSec * rng();
  let on = rng() < spec.duty;
  let guard = 0;
  while (t < endSec && guard++ < 800) {
    rows.push({ s: on ? spec.on : spec.off, lu: Math.max(t, startSec) });
    const mean = on ? meanOnSec : meanOffSec;
    t += mean * (0.35 + rng() * 1.4);
    on = !on;
  }
  if (!rows.length) rows.push({ s: spec.off, lu: startSec });
  rows[0].lu = startSec;
  return rows;
}

/** Current state of a TRACK entity, read off the same generator. */
function trackState(id) {
  const rows = trackRows(id, NOW_S - 24 * 3600, NOW_S);
  return rows.length ? rows[rows.length - 1].s : TRACKS[id].off;
}

/** Milliseconds since that entity last flipped — keeps "for 2h 14m" honest. */
function trackChangedAgo(id) {
  const rows = trackRows(id, NOW_S - 24 * 3600, NOW_S);
  if (!rows.length) return 0;
  return Math.max(0, Math.round((NOW_S - rows[rows.length - 1].lu) * 1000));
}

/** Entity literal for a TRACK-backed entity: state and age both generated. */
const T = (id, attributes = {}) => E(id, trackState(id), attributes, trackChangedAgo(id));

/* ------------------------------------------------------------------ *
 * 4. EXTRA_STATES
 * ------------------------------------------------------------------ */

/** Hourly production curve for the solar-forecast card (Forecast.Solar shape). */
const SOLAR_WATTS = (() => {
  const out = {};
  for (let h = 4; h <= 20; h++) {
    const x = (h - 12.5) / 4.4;
    const w = Math.max(0, Math.round(2750 * Math.exp(-x * x)));
    const k = new Date(midnight(0) + h * HOUR);
    const key = `${k.getFullYear()}-${String(k.getMonth() + 1).padStart(2, '0')}-${String(k.getDate()).padStart(2, '0')} ${String(h).padStart(2, '0')}:00:00`;
    out[key] = w;
  }
  return out;
})();

/** 24 hourly points of grid carbon intensity, starting this hour. */
const CARBON_FORECAST = (() => {
  const startH = new Date(NOW);
  startH.setMinutes(0, 0, 0);
  return Array.from({ length: 24 }, (_, i) => {
    const t = startH.getTime() + i * HOUR;
    return { start: new Date(t).toISOString(), intensity: Math.round(seriesAt('sensor.grid_carbon', t / 1000)) };
  });
})();

const LIBRARY_ITEMS = [
  { title: 'Dune: Part Two', year: 2024, id: 'plex://1', thumbnail: poster('#2b3a67', '#e8734f', 'Dune II') },
  { title: 'Past Lives', year: 2023, id: 'plex://2', thumbnail: poster('#33324a', '#f0b357', 'Past Lives') },
  { title: 'The Bear', year: 2025, id: 'plex://3', thumbnail: poster('#1f3d33', '#5ec78d', 'The Bear') },
  { title: 'Oppenheimer', year: 2023, id: 'plex://4', thumbnail: poster('#3a2b2b', '#ef6c6c', 'Oppenheimer') },
  { title: 'Shogun', year: 2024, id: 'plex://5', thumbnail: poster('#232a38', '#9d7ee8', 'Shogun') },
  { title: 'Perfect Days', year: 2024, id: 'plex://6', thumbnail: poster('#1b2a3a', '#4aa8ff', 'Perfect Days') },
  { title: 'Poor Things', year: 2023, id: 'plex://7', thumbnail: poster('#3b2a44', '#e6a23c', 'Poor Things') },
  { title: 'Chef', year: 2014, id: 'plex://8', thumbnail: poster('#2a3326', '#c7d95e', 'Chef') },
];

const QUEUE_ITEMS = [
  { title: 'Midnight City', artist: 'M83', duration: 244, id: 'q1' },
  { title: 'Nightcall', artist: 'Kavinsky', duration: 258, id: 'q2' },
  { title: 'Instant Crush', artist: 'Daft Punk', duration: 337, id: 'q3' },
  { title: 'Rains Again', artist: 'Solji', duration: 212, id: 'q4' },
  { title: 'Palm Trees', artist: 'Flatbush', duration: 199, id: 'q5' },
  { title: 'Blue Monday', artist: 'New Order', duration: 448, id: 'q6' },
  { title: '밤편지', artist: 'IU', duration: 254, id: 'q7' },
];

const PACKAGE_LIST = [
  { name: '기계식 키보드', status: 'In transit', carrier: 'CJ대한통운', eta: dateOnly(1), tracking_number: '5512 8834 0021' },
  { name: 'PLA 필라멘트 3kg', status: 'Out for delivery', carrier: '롯데택배', eta: dateOnly(0), tracking_number: '3390 1180 7742' },
  { name: '커피 원두 1kg', status: 'Delivered', carrier: '우체국', eta: dateOnly(-1), tracking_number: '1102 5540 9931' },
  { name: 'NVMe 2TB', status: 'Delayed', carrier: 'DHL', eta: dateOnly(3), tracking_number: 'JJD0099 8172 33' },
  { name: '고양이 사료 5kg', status: 'In transit', carrier: '한진택배', eta: dateOnly(2), tracking_number: '7781 2200 4410' },
];

const BUS_DEPARTURES = (line, dir, offsets, color) =>
  offsets.map((m, i) => ({
    time: ahead(m * MIN),
    line,
    direction: dir,
    delay: i === 1 ? 2 : 0,
    line_color: color,
  }));

export const EXTRA_STATES = [
  /* ---- numeric sensors backed by SERIES ---- */
  ...Object.entries(SERIES).map(([id, s]) =>
    E(id, seriesState(id), {
      friendly_name: s.name,
      ...(s.unit ? { unit_of_measurement: s.unit } : {}),
      ...(s.dc ? { device_class: s.dc } : {}),
      ...(s.icon ? { icon: s.icon } : {}),
      state_class: s.sc ?? 'measurement',
      ...(s.attrs ? s.attrs() : {}),
    })
  ),

  /* ---- on/off entities backed by TRACKS ---- */
  T('binary_sensor.motion_living', { friendly_name: '거실 움직임', device_class: 'motion' }),
  T('binary_sensor.motion_kitchen', { friendly_name: '주방 움직임', device_class: 'motion' }),
  T('binary_sensor.motion_entrance', { friendly_name: '현관 움직임', device_class: 'motion' }),
  T('binary_sensor.motion_corridor', { friendly_name: '복도 움직임', device_class: 'motion' }),
  T('binary_sensor.occupancy_office', { friendly_name: '서재 재실', device_class: 'occupancy' }),
  T('binary_sensor.occupancy_bed', { friendly_name: '침대 재실', device_class: 'occupancy' }),
  T('binary_sensor.door_front', { friendly_name: '현관문', device_class: 'door' }),
  T('binary_sensor.window_kitchen', { friendly_name: '주방 창문', device_class: 'window' }),
  T('binary_sensor.window_bedroom', { friendly_name: '침실 창문', device_class: 'window' }),
  E('binary_sensor.doorbell', 'off', { friendly_name: '초인종', device_class: 'sound', icon: 'mdi:bell-outline' }, 34 * MIN),
  E('binary_sensor.wan_online', 'on', { friendly_name: '인터넷 연결', device_class: 'connectivity' }, 10 * HOUR + 9 * MIN),
  E('binary_sensor.ping_router', 'on', { friendly_name: '공유기', device_class: 'connectivity' }, 15 * DAY),
  E('binary_sensor.ping_nas', 'on', { friendly_name: 'TrueNAS', device_class: 'connectivity' }, 8 * HOUR),
  E('binary_sensor.ping_printer', 'off', { friendly_name: '프린터', device_class: 'connectivity' }, 3 * HOUR + 22 * MIN),
  E('binary_sensor.wg_laptop', 'on', { friendly_name: '맥북 (WireGuard)', device_class: 'connectivity' }, 2 * HOUR),
  E('binary_sensor.wg_phone', 'on', { friendly_name: '아이폰 (WireGuard)', device_class: 'connectivity' }, 5 * HOUR),
  E('binary_sensor.wg_tablet', 'off', { friendly_name: '아이패드 (WireGuard)', device_class: 'connectivity' }, 3 * DAY),
  T('switch.fireplace', { friendly_name: '벽난로', icon: 'mdi:fire' }),
  T('switch.dehumidifier', { friendly_name: '제습기', icon: 'mdi:air-humidifier' }),

  /* ---- niche domains -------------------------------------------- */
  E('water_heater.boiler', 'eco', {
    friendly_name: '온수 보일러', current_temperature: 47.4, temperature: 55, min_temp: 30, max_temp: 75,
    target_temp_step: 1, operation_list: ['eco', 'electric', 'performance', 'heat_pump', 'off'],
    operation_mode: 'eco', away_mode: 'off', supported_features: 11,
  }),
  E('water_heater.guest', 'off', {
    friendly_name: '별채 온수기', current_temperature: 22.1, temperature: 45, min_temp: 30, max_temp: 65,
    target_temp_step: 5, operation_list: ['eco', 'electric', 'off'], operation_mode: 'off', supported_features: 3,
  }),
  E('valve.main_water', 'open', { friendly_name: '수도 메인 밸브', device_class: 'water', current_position: 100, supported_features: 15 }),
  E('valve.gas_line', 'closed', { friendly_name: '가스 차단 밸브', device_class: 'gas', current_position: 0, supported_features: 3 }),
  E('siren.hallway', 'off', { friendly_name: '복도 사이렌', available_tones: ['alarm', 'chime', 'bark', 'siren'], supported_features: 23 }),
  E('siren.garden', 'on', { friendly_name: '정원 사이렌', supported_features: 3 }),
  E('input_text.guest_note', '문 앞 택배함에 넣어주세요', { friendly_name: '배송 메모', max: 80, min: 0, mode: 'text', icon: 'mdi:message-text' }),
  E('input_text.wifi_password', 'silkcard2026', { friendly_name: '게스트 와이파이 비번', max: 32, min: 8, mode: 'password' }),
  E('input_datetime.alarm', '06:30:00', { friendly_name: '기상 알람', has_date: false, has_time: true, timestamp: 23400 }),
  E('input_datetime.trip', `${dateOnly(42)} 09:00:00`, { friendly_name: '추석 출발', has_date: true, has_time: true }),
  E('date.filter_due', dateOnly(18), { friendly_name: '필터 교체일' }),
  E('time.quiet_start', '23:00:00', { friendly_name: '취침 모드 시작' }),
  E('counter.water_glasses', '5', { friendly_name: '오늘 마신 물', initial: 0, step: 1, minimum: 0, maximum: 12, icon: 'mdi:water' }),
  E('counter.coffee_cups', '2', { friendly_name: '오늘 마신 커피', initial: 0, step: 1, minimum: 0, maximum: 6, icon: 'mdi:coffee-maker' }),

  /* ---- household helpers ---------------------------------------- */
  E('input_boolean.med_morning', 'on', { friendly_name: '아침약', icon: 'mdi:check-circle-outline' }),
  E('input_boolean.med_lunch', 'off', { friendly_name: '점심약', icon: 'mdi:check-circle-outline' }),
  E('input_boolean.med_evening', 'off', { friendly_name: '저녁약', icon: 'mdi:check-circle-outline' }),
  E('input_boolean.wakeup_enabled', 'on', { friendly_name: '기상 조명 사용', icon: 'mdi:weather-sunset-up' }),
  E('input_button.walk_bori', ago(5 * HOUR), { friendly_name: '보리 산책', icon: 'mdi:map-marker' }),
  E('button.feed_bori_am', ago(9 * HOUR), { friendly_name: '아침 사료', icon: 'mdi:silverware-fork-knife' }),
  E('button.feed_bori_pm', ago(33 * HOUR), { friendly_name: '저녁 사료', icon: 'mdi:silverware-fork-knife' }),
  E('sensor.bori_weight', '6.4', { friendly_name: '보리 몸무게', unit_of_measurement: 'kg', device_class: 'weight' }),
  E('todo.meal_plan', '5', { friendly_name: '이번 주 식단' }),
  E('todo.house_chores', '4', { friendly_name: '집안일' }),
  E('calendar.birthdays', 'off', { friendly_name: '생일' }),
  E('calendar.holidays', 'on', { friendly_name: '공휴일' }),
  E('calendar.meals', 'on', { friendly_name: '식단표' }),
  E('binary_sensor.workday', 'on', { friendly_name: '평일 여부', icon: 'mdi:desk' }),
  E('sensor.holiday_today', '광복절', { friendly_name: '오늘의 기념일', icon: 'mdi:calendar-star' }),

  /* ---- solar forecast (Forecast.Solar attribute shape) ----------- */
  E('sensor.solar_forecast', '21.4', {
    friendly_name: '오늘 예상 발전량', unit_of_measurement: 'kWh', device_class: 'energy',
    watts: SOLAR_WATTS,
    icon: 'mdi:solar-power',
  }),

  /* ---- waste collection ----------------------------------------- */
  E('sensor.trash_general', '1', { friendly_name: '일반쓰레기', unit_of_measurement: 'days', icon: 'mdi:package-up' }),
  E('sensor.trash_recycle', '3', { friendly_name: '재활용', unit_of_measurement: 'days', icon: 'mdi:reload' }),
  E('sensor.trash_food', '0', { friendly_name: '음식물', unit_of_measurement: 'days', icon: 'mdi:sprout' }),
  E('sensor.trash_bulky', dateOnly(12), { friendly_name: '대형폐기물', icon: 'mdi:sofa' }),

  /* ---- sleep ----------------------------------------------------- */
  E('sensor.sleep_deep', '86', { friendly_name: '깊은 수면', unit_of_measurement: 'min' }),
  E('sensor.sleep_rem', '104', { friendly_name: 'REM 수면', unit_of_measurement: 'min' }),
  E('sensor.sleep_awake', '18', { friendly_name: '깬 시간', unit_of_measurement: 'min' }),
  E('sensor.bedtime', new Date(midnight(0) - 1.2 * HOUR).toISOString(), { friendly_name: '취침', device_class: 'timestamp' }),
  E('sensor.wake_time', new Date(midnight(0) + 6.6 * HOUR).toISOString(), { friendly_name: '기상', device_class: 'timestamp' }),

  /* ---- aquarium -------------------------------------------------- */
  E('switch.tank_light', 'on', { friendly_name: '어항 조명', icon: 'mdi:lightbulb' }),
  E('switch.tank_pump', 'on', { friendly_name: '어항 여과기', icon: 'mdi:water' }),
  E('button.tank_feed', ago(7 * HOUR), { friendly_name: '먹이주기', icon: 'mdi:silverware-fork-knife' }),

  /* ---- servers / homelab ---------------------------------------- */
  E('sensor.nas_uptime', ago(15 * DAY + 4 * HOUR), { friendly_name: 'NAS 부팅 시각', device_class: 'timestamp' }),
  E('sensor.ha_uptime', ago(6 * DAY + 9 * HOUR), { friendly_name: 'HA 부팅 시각', device_class: 'timestamp' }),
  E('sensor.db_oldest', ago(10 * DAY), { friendly_name: '가장 오래된 기록', device_class: 'timestamp' }),
  E('sensor.docker_hermes', 'running', { friendly_name: 'hermes' }),
  E('sensor.docker_hermes_cpu', '4.2', { friendly_name: 'hermes CPU', unit_of_measurement: '%' }),
  E('sensor.docker_hermes_mem', '212', { friendly_name: 'hermes 메모리', unit_of_measurement: 'MB' }),
  E('sensor.docker_supabase', 'running', { friendly_name: 'supabase' }),
  E('sensor.docker_supabase_cpu', '11.4', { friendly_name: 'supabase CPU', unit_of_measurement: '%' }),
  E('sensor.docker_supabase_mem', '784', { friendly_name: 'supabase 메모리', unit_of_measurement: 'MB' }),
  E('sensor.docker_omniroute', 'exited', { friendly_name: 'omniroute' }),
  E('sensor.docker_omniroute_cpu', '0', { friendly_name: 'omniroute CPU', unit_of_measurement: '%' }),
  E('sensor.docker_grafana', 'running', { friendly_name: 'grafana' }),
  E('sensor.docker_grafana_cpu', '2.1', { friendly_name: 'grafana CPU', unit_of_measurement: '%' }),
  E('sensor.docker_grafana_mem', '128', { friendly_name: 'grafana 메모리', unit_of_measurement: 'MB' }),
  E('button.restart_hermes', ago(3 * DAY), { friendly_name: 'hermes 재시작', icon: 'mdi:reload' }),
  E('button.restart_grafana', ago(9 * DAY), { friendly_name: 'grafana 재시작', icon: 'mdi:reload' }),
  E('sensor.addon_mosquitto', 'running', { friendly_name: 'Mosquitto broker' }),
  E('sensor.addon_mosquitto_version', '6.4.1', { friendly_name: 'Mosquitto 버전' }),
  E('update.addon_mosquitto', 'off', { friendly_name: 'Mosquitto', title: 'Mosquitto broker', installed_version: '6.4.1', latest_version: '6.4.1' }),
  E('sensor.addon_z2m', 'running', { friendly_name: 'Zigbee2MQTT' }),
  E('sensor.addon_z2m_version', '2.6.0', { friendly_name: 'Zigbee2MQTT 버전' }),
  E('update.addon_z2m', 'on', { friendly_name: 'Zigbee2MQTT', title: 'Zigbee2MQTT', installed_version: '2.6.0', latest_version: '2.7.1' }),
  E('sensor.addon_esphome', 'stopped', { friendly_name: 'ESPHome' }),
  E('sensor.addon_esphome_version', '2026.7.0', { friendly_name: 'ESPHome 버전' }),
  E('sensor.addon_nodered', 'running', { friendly_name: 'Node-RED' }),
  E('sensor.addon_nodered_version', '19.1.0', { friendly_name: 'Node-RED 버전' }),
  E('update.addon_nodered', 'on', { friendly_name: 'Node-RED', title: 'Node-RED', installed_version: '19.1.0', latest_version: '19.2.0' }),

  /* ---- network --------------------------------------------------- */
  E('sensor.wan_ip', '121.135.44.8', { friendly_name: '공인 IP', icon: 'mdi:earth' }),
  E('sensor.wan_isp', 'KT 기가인터넷', { friendly_name: 'ISP', icon: 'mdi:transmission-tower' }),
  E('switch.wireguard', 'on', { friendly_name: 'WireGuard 터널', icon: 'mdi:shield-lock' }),
  E('sensor.wg_laptop_ip', '100.84.2.11', { friendly_name: '맥북 주소' }),
  E('sensor.wg_phone_ip', '100.84.2.19', { friendly_name: '아이폰 주소' }),
  E('sensor.wg_tablet_ip', '100.84.2.27', { friendly_name: '아이패드 주소' }),
  E('sensor.wg_laptop_seen', ago(4 * MIN), { friendly_name: '맥북 핸드셰이크', device_class: 'timestamp' }),
  E('sensor.wg_phone_seen', ago(38 * 1000), { friendly_name: '아이폰 핸드셰이크', device_class: 'timestamp' }),
  E('sensor.wg_tablet_seen', ago(3 * DAY), { friendly_name: '아이패드 핸드셰이크', device_class: 'timestamp' }),
  E('sensor.cert_hueeng', ahead(46 * DAY), { friendly_name: 'hueeng.com', device_class: 'timestamp' }),
  E('sensor.cert_grafana', ahead(9 * DAY), { friendly_name: 'grafana.hueeng.com', device_class: 'timestamp' }),
  E('sensor.cert_supabase', ahead(3 * DAY), { friendly_name: 'db.hueeng.com', device_class: 'timestamp' }),
  E('sensor.cert_wildcard', ahead(71 * DAY), { friendly_name: '*.hueeng.com', device_class: 'timestamp' }),

  /* ---- backups --------------------------------------------------- */
  E('sensor.backup_nas', 'ok', { friendly_name: 'NAS 스냅샷' }),
  E('sensor.backup_nas_last', ago(7 * HOUR), { friendly_name: 'NAS 마지막 백업', device_class: 'timestamp' }),
  E('sensor.backup_nas_size', '42.6', { friendly_name: 'NAS 백업 크기', unit_of_measurement: 'GB' }),
  E('sensor.backup_nas_duration', '38', { friendly_name: 'NAS 백업 소요', unit_of_measurement: 'min' }),
  E('script.run_nas_backup', 'off', { friendly_name: 'NAS 백업 실행', icon: 'mdi:backup-restore' }),
  E('sensor.backup_ha', 'running', { friendly_name: 'HA 백업' }),
  E('sensor.backup_ha_last', ago(23 * HOUR), { friendly_name: 'HA 마지막 백업', device_class: 'timestamp' }),
  E('sensor.backup_ha_size', '1.2', { friendly_name: 'HA 백업 크기', unit_of_measurement: 'GB' }),
  E('sensor.backup_photos', 'failed', { friendly_name: '사진 백업' }),
  E('sensor.backup_photos_last', ago(4 * DAY), { friendly_name: '사진 마지막 백업', device_class: 'timestamp' }),
  E('script.run_photo_backup', 'off', { friendly_name: '사진 백업 실행' }),

  /* ---- automations for the audit card ---------------------------- */
  E('automation.away_lights', 'on', { friendly_name: '외출 시 소등', last_triggered: ago(47 * DAY) }),
  E('automation.rain_alert', 'on', { friendly_name: '빨래 비 알림', last_triggered: null }),
  E('automation.old_test', 'off', { friendly_name: '(구) 테스트 자동화', last_triggered: ago(126 * DAY) }),
  E('automation.night_lock', 'on', { friendly_name: '취침 시 문단속', last_triggered: ago(9 * HOUR) }),
  E('automation.co2_vent', 'off', { friendly_name: 'CO₂ 환기', last_triggered: ago(2 * DAY) }),

  /* ---- broken entities for the doctor card ----------------------- */
  E('sensor.balcony_lux', 'unavailable', { friendly_name: '베란다 조도' }, 6 * DAY),
  E('light.attic', 'unavailable', { friendly_name: '다락 조명' }, 31 * HOUR),
  E('binary_sensor.gate_contact', 'unavailable', { friendly_name: '대문 접점', device_class: 'door' }, 4 * HOUR),
  E('sensor.old_zigbee_lqi', 'unknown', { friendly_name: '(구) 지그비 LQI' }, 92 * DAY),
  E('switch.garden_relay', 'unavailable', { friendly_name: '정원 릴레이' }, 2 * DAY + 3 * HOUR),

  /* ---- climate loops for the floor-heating card ------------------ */
  E('climate.floor_living', 'heat', { friendly_name: '거실 바닥', current_temperature: 23.2, temperature: 24, min_temp: 15, max_temp: 30, target_temp_step: 0.5, hvac_modes: ['heat', 'off'], hvac_action: 'heating', supported_features: 385 }),
  E('climate.floor_bedroom', 'heat', { friendly_name: '침실 바닥', current_temperature: 21.6, temperature: 22.5, min_temp: 15, max_temp: 30, target_temp_step: 0.5, hvac_modes: ['heat', 'off'], hvac_action: 'idle', supported_features: 385 }),
  E('climate.floor_kids', 'heat', { friendly_name: '아이방 바닥', current_temperature: 22.9, temperature: 23, min_temp: 15, max_temp: 30, target_temp_step: 0.5, hvac_modes: ['heat', 'off'], hvac_action: 'heating', supported_features: 385 }),
  E('climate.floor_bath', 'off', { friendly_name: '욕실 바닥', current_temperature: 24.8, temperature: 26, min_temp: 15, max_temp: 30, target_temp_step: 0.5, hvac_modes: ['heat', 'off'], hvac_action: 'off', supported_features: 385 }),
  E('climate.aircon_runtime', 'cool', { friendly_name: '거실 에어컨 (가동 이력)', current_temperature: 26.4, temperature: 24, min_temp: 16, max_temp: 30, hvac_modes: ['cool', 'off'], hvac_action: 'cooling', supported_features: 385, icon: 'mdi:air-conditioner' }),

  /* ---- media ----------------------------------------------------- */
  E('media_player.plex', 'playing', {
    friendly_name: 'Plex 거실', media_title: 'Midnight City', media_artist: 'M83',
    volume_level: 0.42, supported_features: 609725, queue: QUEUE_ITEMS,
  }),
  E('media_player.bathroom', 'off', { friendly_name: '욕실 스피커', volume_level: 0.18, supported_features: 609725 }),
  E('media_player.office_speaker', 'playing', { friendly_name: '서재 스피커', media_title: 'Focus Beats', media_artist: 'Various', volume_level: 0.3, supported_features: 609725 }),
  E('sensor.plex_recent', String(LIBRARY_ITEMS.length), { friendly_name: 'Plex 최근 추가', data: LIBRARY_ITEMS, icon: 'mdi:video' }),

  /* ---- cameras --------------------------------------------------- */
  E('camera.garage', 'streaming', { friendly_name: '차고', entity_picture: CAM('garage') }),
  E('camera.gate', 'streaming', { friendly_name: '대문', entity_picture: CAM('gate') }),
  E('camera.living', 'streaming', { friendly_name: '거실', entity_picture: CAM('living') }),
  E('camera.doorbell', 'streaming', { friendly_name: '초인종 카메라', entity_picture: CAM('doorbell') }),
  E('light.porch', 'off', { friendly_name: '현관등', supported_color_modes: ['brightness'] }),
  E('switch.door_chime', 'off', { friendly_name: '현관 차임', icon: 'mdi:bell-outline' }),

  /* ---- transit, commute, flights, parcels ------------------------ */
  E('sensor.bus_146', ahead(4 * MIN), {
    friendly_name: '146번 (강남역 방면)', device_class: 'timestamp',
    departures: BUS_DEPARTURES('146', '강남역', [4, 13, 26, 41], '#2b6cd4'),
  }),
  E('sensor.bus_402', ahead(7 * MIN), {
    friendly_name: '402번 (서울역 방면)', device_class: 'timestamp',
    departures: BUS_DEPARTURES('402', '서울역', [7, 19, 34], '#3aa655'),
  }),
  E('sensor.subway_line2', ahead(2 * MIN), {
    friendly_name: '2호선 (내선순환)', device_class: 'timestamp',
    next_departures: BUS_DEPARTURES('2', '내선순환', [2, 8, 14, 21, 29], '#00a84d'),
  }),
  E('sensor.subway_bundang', ahead(11 * MIN), { friendly_name: '분당선 (왕십리)', device_class: 'timestamp' }),
  E('sensor.commute_work_distance', '18.4', { friendly_name: '출근 거리', unit_of_measurement: 'km' }),
  E('sensor.commute_school_distance', '3.2', { friendly_name: '학교 거리', unit_of_measurement: 'km' }),
  E('sensor.flight_ke703', 'On time', {
    friendly_name: 'KE703', airline: 'Korean Air', flight_number: 'KE703',
    origin: 'ICN', destination: 'NRT', gate: '42', terminal: '2',
    departure: ahead(5 * HOUR), arrival: ahead(7 * HOUR + 25 * MIN), status: 'On time',
  }),
  E('sensor.flight_oz102', 'Delayed', {
    friendly_name: 'OZ102', airline: 'Asiana', flight_number: 'OZ102',
    origin: 'GMP', destination: 'CJU', gate: '11', terminal: '1',
    departure: ahead(2 * HOUR + 40 * MIN), arrival: ahead(3 * HOUR + 55 * MIN), status: 'Delayed 35m',
  }),
  E('sensor.packages', '4', { friendly_name: '배송 중', packages: PACKAGE_LIST, icon: 'mdi:package-up' }),
  E('sensor.pkg_keyboard', 'In transit', { friendly_name: '기계식 키보드', carrier: 'CJ대한통운', eta: dateOnly(1), tracking_number: '5512 8834 0021' }),
  E('sensor.pkg_filament', 'Out for delivery', { friendly_name: 'PLA 필라멘트', carrier: '롯데택배', eta: dateOnly(0), tracking_number: '3390 1180 7742' }),
  E('sensor.pkg_beans', 'Delivered', { friendly_name: '커피 원두', carrier: '우체국', eta: dateOnly(-1), tracking_number: '1102 5540 9931' }),
  E('sensor.car_location', '서울 강남구 테헤란로 152', { friendly_name: '주차 위치', icon: 'mdi:map-marker' }),
  E('sensor.parked_since', ago(2 * HOUR + 14 * MIN), { friendly_name: '주차 시각', device_class: 'timestamp' }),

  /* ---- zones & people -------------------------------------------- */
  E('zone.home', '2', { friendly_name: '집', icon: 'mdi:home', latitude: 37.4979, longitude: 127.0276, radius: 90 }),
  E('zone.work', '1', { friendly_name: '회사', icon: 'mdi:desk', latitude: 37.5045, longitude: 127.0489, radius: 120 }),
  E('zone.school', '1', { friendly_name: '학교', icon: 'mdi:account-multiple', latitude: 37.4901, longitude: 127.0141, radius: 100 }),
  E('zone.gym', '0', { friendly_name: '헬스장', icon: 'mdi:speedometer', latitude: 37.5012, longitude: 127.0331, radius: 60 }),
  E('person.jiwon', '회사', { friendly_name: '지원' }),
  E('person.minji', '학교', { friendly_name: '민지' }),
  E('device_tracker.phone_hueeng', 'home', { friendly_name: '휭 아이폰', source_type: 'gps' }),
  E('device_tracker.phone_jiwon', '회사', { friendly_name: '지원 아이폰', source_type: 'gps' }),

  /* ---- assorted ---------------------------------------------------- */
  E('sensor.espresso_shots', '3', { friendly_name: '오늘 내린 잔', unit_of_measurement: 'shots', icon: 'mdi:coffee-maker' }),
  E('input_boolean.night_mode', 'off', { friendly_name: '취침 모드', icon: 'mdi:weather-night' }),
];

/* ------------------------------------------------------------------ *
 * 5. mock backends
 * ------------------------------------------------------------------ */

/** Raw history rows for anything this module owns; null when it does not. */
function historyFor(id, startSec, endSec) {
  if (TRACKS[id]) return trackRows(id, startSec, endSec);
  if (SERIES[id]) {
    const step = Math.max((endSec - startSec) / 260, 30);
    const rows = [];
    for (let t = startSec; t <= endSec; t += step) rows.push({ s: seriesAt(id, t).toFixed(3), lu: t });
    return rows;
  }
  return null;
}

/** Floor a ms timestamp to the start of its statistics bucket. */
function bucketStart(ms, period) {
  const d = new Date(ms);
  if (period === 'day' || period === 'week' || period === 'month') {
    d.setHours(0, 0, 0, 0);
    if (period === 'week') d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    if (period === 'month') d.setDate(1);
    return d.getTime();
  }
  if (period === '5minute') {
    d.setSeconds(0, 0);
    d.setMinutes(Math.floor(d.getMinutes() / 5) * 5);
    return d.getTime();
  }
  d.setMinutes(0, 0, 0);
  return d.getTime();
}

function bucketNext(ms, period) {
  const d = new Date(ms);
  if (period === 'day') d.setDate(d.getDate() + 1);
  else if (period === 'week') d.setDate(d.getDate() + 7);
  else if (period === 'month') d.setMonth(d.getMonth() + 1);
  else if (period === '5minute') d.setMinutes(d.getMinutes() + 5);
  else d.setHours(d.getHours() + 1);
  return d.getTime();
}

/** Long-term statistics rows for a SERIES sensor, honouring period + types. */
function statisticsFor(id, startMs, endMs, period, types) {
  if (!SERIES[id]) return null;
  const want = new Set(types && types.length ? types : ['mean']);
  const rows = [];
  let t = bucketStart(startMs, period);
  let guard = 0;
  while (t < endMs && guard++ < 500) {
    const next = bucketNext(t, period);
    const stepSec = (next - t) / 1000;
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    const samples = period === 'hour' || period === '5minute' ? 6 : 24;
    for (let k = 0; k < samples; k++) {
      const v = seriesAt(id, (t + ((k + 0.5) / samples) * (next - t)) / 1000);
      min = Math.min(min, v);
      max = Math.max(max, v);
      sum += v;
    }
    const mean = sum / samples;
    const row = { start: t, end: next, statistic_id: id };
    if (want.has('mean')) row.mean = mean;
    if (want.has('min')) row.min = min;
    if (want.has('max')) row.max = max;
    if (want.has('state')) row.state = seriesAt(id, (next - 1) / 1000);
    if (want.has('sum')) row.sum = changeAt(id, t / 1000, stepSec) * 8;
    if (want.has('change')) row.change = changeAt(id, t / 1000, stepSec);
    rows.push(row);
    t = next;
  }
  return rows;
}

/* ---- calendars ---------------------------------------------------- */

const BIRTHDAY_EVENTS = [
  { summary: '지원 birthday', d: 6 },
  { summary: '민지 birthday', d: 21 },
  { summary: '어머니 birthday', d: 48 },
  { summary: '휭 birthday', d: 96 },
];

const MEAL_EVENTS = ['김치찌개', '제육볶음', '된장국과 생선구이', '파스타', '치킨 (배달)', '비빔밥', '스테이크'];

function calendarEvents(entityId, startIso, endIso) {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  const within = (ms) => !Number.isFinite(start) || (ms >= start - DAY && ms <= end + DAY);
  if (entityId === 'calendar.birthdays') {
    return BIRTHDAY_EVENTS.filter((b) => within(midnight(b.d))).map((b) => ({
      summary: b.summary,
      start: { date: dateOnly(b.d) },
      end: { date: dateOnly(b.d + 1) },
    }));
  }
  if (entityId === 'calendar.holidays') {
    return [
      { summary: '광복절', start: { date: dateOnly(0) }, end: { date: dateOnly(1) } },
      { summary: '추석 연휴', start: { date: dateOnly(42) }, end: { date: dateOnly(45) } },
    ].filter((e) => within(Date.parse(e.start.date)));
  }
  if (entityId === 'calendar.meals') {
    return MEAL_EVENTS.map((title, i) => ({
      summary: title,
      start: { dateTime: at(19, 0, i) },
      end: { dateTime: at(20, 0, i) },
    })).filter((e) => within(Date.parse(e.start.dateTime)));
  }
  return undefined;
}

/* ---- todo lists ---------------------------------------------------- */

const TODO_LISTS = {
  'todo.meal_plan': [
    { uid: 'm1', summary: 'Monday: 김치찌개', status: 'needs_action' },
    { uid: 'm2', summary: 'Tuesday: 제육볶음', status: 'needs_action' },
    { uid: 'm3', summary: 'Wednesday: 된장국과 고등어구이', status: 'needs_action' },
    { uid: 'm4', summary: 'Thursday: 크림 파스타', status: 'needs_action' },
    { uid: 'm5', summary: 'Friday: 치킨 (배달)', status: 'needs_action' },
    { uid: 'm6', summary: 'Saturday: 비빔밥', status: 'needs_action' },
    { uid: 'm7', summary: 'Sunday: 등심 스테이크', status: 'needs_action' },
  ],
  'todo.house_chores': [
    { uid: 'c1', summary: '욕실 청소', status: 'needs_action' },
    { uid: 'c2', summary: '분리수거 내놓기', status: 'needs_action' },
    { uid: 'c3', summary: '침구 세탁', status: 'needs_action' },
    { uid: 'c4', summary: '냉장고 정리', status: 'needs_action' },
    { uid: 'c5', summary: '베란다 물청소', status: 'completed' },
  ],
};

/* ---- logbook -------------------------------------------------------- */

const VISITOR_EVENTS = {
  'binary_sensor.doorbell': [{ m: 34, s: 'on', n: '초인종' }, { m: 208, s: 'on', n: '초인종' }, { m: 1490, s: 'on', n: '초인종' }],
  'binary_sensor.door_front': [{ m: 31, s: 'on', n: '현관문' }, { m: 96, s: 'on', n: '현관문' }, { m: 470, s: 'on', n: '현관문' }, { m: 1512, s: 'on', n: '현관문' }],
  'binary_sensor.motion_entrance': [{ m: 30, s: 'on', n: '현관 움직임' }, { m: 205, s: 'on', n: '현관 움직임' }, { m: 640, s: 'on', n: '현관 움직임' }, { m: 1488, s: 'on', n: '현관 움직임' }],
  'binary_sensor.motion_living': [{ m: 12, s: 'on', n: '거실 움직임' }, { m: 150, s: 'on', n: '거실 움직임' }, { m: 720, s: 'on', n: '거실 움직임' }],
};

function logbookFor(path) {
  const entity = /entity=([^&]+)/.exec(path)?.[1];
  if (!entity) return undefined;
  const id = decodeURIComponent(entity);
  const rows = VISITOR_EVENTS[id];
  if (!rows) return undefined;
  return rows.map((r) => ({ when: ago(r.m * MIN), state: r.s, name: r.n, entity_id: id }));
}

/* ---- error log ------------------------------------------------------ */

const ERROR_LOG = (() => {
  const stamp = (m) => {
    const d = new Date(NOW - m * MIN);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.114`;
  };
  const lines = [
    [4, 'ERROR', 'homeassistant.components.zha', 'Failed to write attribute on 0x84f3: device did not respond'],
    [17, 'WARNING', 'homeassistant.helpers.template', "Template loop detected while processing event 'state_changed'"],
    [46, 'ERROR', 'homeassistant.components.mqtt', 'Unable to connect to the MQTT broker: [Errno 111] Connection refused'],
    [92, 'WARNING', 'homeassistant.components.sensor', 'Entity sensor.balcony_lux is taking over 10 seconds to update'],
    [148, 'ERROR', 'custom_components.supabase', "Health check failed: HTTP 502 from 'http://192.168.0.31:8000'"],
    [265, 'ERROR', 'homeassistant.components.recorder', 'Error executing query: database is locked'],
    [410, 'WARNING', 'homeassistant.components.hue', 'Bridge 192.168.0.14 unreachable, retrying in 30s'],
    [905, 'ERROR', 'homeassistant.components.camera', 'Timeout fetching still image from camera.gate'],
  ];
  return lines.map(([m, lvl, logger, msg]) => `${stamp(m)} ${lvl} (MainThread) [${logger}] ${msg}`).join('\n') + '\n';
})();

/* ---- entity registry ------------------------------------------------ */

const PLATFORMS = ['zha', 'hue', 'mqtt', 'esphome', 'sonoff', 'shelly', 'tuya', 'homekit_controller', 'template', 'sun', 'recorder'];

function entityRegistry(states) {
  // Falls back to the wave-5 entities when the caller has no state machine to
  // hand over, so the registry never comes back empty.
  const ids = Object.keys(states ?? {});
  if (!ids.length) ids.push(...EXTRA_STATES.map(([id]) => id));
  return ids.map((entity_id, i) => ({
    entity_id,
    platform: PLATFORMS[hashSeed(entity_id) % PLATFORMS.length],
    device_id: i % 7 === 3 ? null : `dev_${hashSeed(entity_id) % 41}`,
    area_id: null,
    disabled_by: null,
  }));
}

/* ------------------------------------------------------------------ *
 * 6. EXTRA_WS + the hass bridge
 * ------------------------------------------------------------------ */

/**
 * Answers websocket calls the base demo does not mock. `undefined` means
 * "not mine" so the caller falls through to its own handling.
 *
 * `passthrough` (used by the bridge below) forwards the entity ids this
 * module does not own back to the demo's own generator, so a single request
 * can mix base and wave-5 entities.
 */
export async function EXTRA_WS(msg, ctx = {}, passthrough) {
  const type = msg?.type;

  if (type === 'history/history_during_period') {
    const ids = msg.entity_ids ?? [];
    const startSec = Date.parse(msg.start_time) / 1000;
    const endSec = Date.parse(msg.end_time) / 1000;
    const mine = ids.filter((id) => TRACKS[id] || SERIES[id]);
    if (!mine.length) return undefined;
    const rest = ids.filter((id) => !mine.includes(id));
    const out = rest.length && passthrough ? { ...(await passthrough({ ...msg, entity_ids: rest })) } : {};
    for (const id of mine) out[id] = historyFor(id, startSec, endSec);
    for (const id of rest) out[id] ??= [];
    return out;
  }

  if (type === 'recorder/statistics_during_period') {
    const ids = msg.statistic_ids ?? [];
    const mine = ids.filter((id) => SERIES[id]);
    if (!mine.length) return undefined;
    const rest = ids.filter((id) => !mine.includes(id));
    const startMs = Date.parse(msg.start_time);
    const endMs = msg.end_time ? Date.parse(msg.end_time) : NOW;
    const out = rest.length && passthrough ? { ...(await passthrough({ ...msg, statistic_ids: rest })) } : {};
    for (const id of mine) out[id] = statisticsFor(id, startMs, endMs, msg.period ?? 'hour', msg.types);
    for (const id of rest) out[id] ??= [];
    return out;
  }

  if (type === 'todo/item/list') {
    const list = TODO_LISTS[msg.entity_id];
    if (!list) return undefined;
    return { items: list.map((item) => ({ ...item })) };
  }

  if (type === 'config/entity_registry/list') {
    return entityRegistry(ctx.states);
  }

  if (type === 'config/device_registry/list') {
    return Array.from({ length: 34 }, (_, i) => ({ id: `dev_${i}`, name: `Device ${i}`, area_id: null }));
  }

  if (type === 'config/area_registry/list') {
    return ['거실', '침실', '주방', '욕실', '서재', '베란다'].map((name, i) => ({ area_id: `area_${i}`, name }));
  }

  return undefined;
}

/**
 * `demo/index.html` answers history and statistics itself before it ever
 * reaches EXTRA_WS, and its mock `hass` carries neither `config`, `themes`
 * nor a `connection.addEventListener`. Rather than fork the page, wave-5
 * ships a zero-pixel card: it is handed the same shared `hass` object every
 * other card gets — synchronously, before any of them run their first
 * fetch — and decorates it in place. Everything above stays a pure data
 * module; this is the only piece that touches the host.
 */
const BRIDGE_TAG = 'silk-demo-bridge';

function decorateHass(hass) {
  if (!hass || hass.__silkWave5) return;
  hass.__silkWave5 = true;

  hass.config ??= {
    version: '2026.8.2',
    location_name: '휭네 집',
    time_zone: 'Asia/Seoul',
    currency: 'KRW',
    country: 'KR',
    unit_system: { temperature: '°C', length: 'km', mass: 'g', volume: 'L' },
  };
  hass.themes ??= {
    themes: { silk: {}, noctis: {}, 'ios-dark-mode': {}, midnight: {} },
    default_theme: 'default',
    darkMode: true,
  };
  hass.language ??= 'en';
  hass.selectedTheme ??= null;
  hass.user ??= { name: 'Hueeng', is_admin: true };

  // Statistics/history helpers on the connection object (heatmap, week,
  // boxplot, candle, sparkbar … all listen for a reconnect).
  const conn = hass.connection;
  if (conn && typeof conn.addEventListener !== 'function') {
    conn.addEventListener = () => {};
    conn.removeEventListener = () => {};
  }
  if (conn && typeof conn.subscribeEvents !== 'function') {
    conn.subscribeEvents = async () => () => {};
  }
  if (conn && typeof conn.subscribeMessage === 'function' && !conn.__silkWave5) {
    conn.__silkWave5 = true;
    const origSub = conn.subscribeMessage.bind(conn);
    conn.subscribeMessage = async (cb, sub) => {
      if (sub?.type === 'subscribe_events') return () => {};
      return origSub(cb, sub);
    };
  }

  const origWS = hass.callWS.bind(hass);
  hass.callWS = async (msg) => {
    const mine = await EXTRA_WS(msg, { states: hass.states }, origWS);
    return mine !== undefined ? mine : origWS(msg);
  };

  const origApi = hass.callApi.bind(hass);
  hass.callApi = async (method, path, ...rest) => {
    const p = String(path);
    if (p === 'error_log' || p.startsWith('error_log')) return ERROR_LOG;
    if (p.startsWith('logbook/')) {
      const rows = logbookFor(p);
      if (rows) return rows;
    }
    if (p.startsWith('calendars/')) {
      const entity = p.slice('calendars/'.length).split('?')[0];
      const q = p.split('?')[1] ?? '';
      const startIso = decodeURIComponent(/start=([^&]*)/.exec(q)?.[1] ?? '');
      const endIso = decodeURIComponent(/end=([^&]*)/.exec(q)?.[1] ?? '');
      const events = calendarEvents(entity, startIso, endIso);
      if (events) return events;
    }
    return origApi(method, path, ...rest);
  };
}

if (!customElements.get(BRIDGE_TAG)) {
  customElements.define(
    BRIDGE_TAG,
    class extends HTMLElement {
      setConfig() {}
      getCardSize() {
        return 1;
      }
      connectedCallback() {
        this.style.display = 'none';
        // The gallery wraps every card in a fixed-height .slot; this one holds
        // no pixels, so its slot is folded away too.
        const slot = this.parentElement;
        if (slot && slot.classList?.contains('slot')) slot.style.display = 'none';
      }
      set hass(value) {
        this._hass = value;
        decorateHass(value);
        // A pop-up card is invisible until its hash opens it, which would leave
        // an empty slot in a gallery. Its own edit-mode ghost is the honest
        // stand-in, so the demo turns that on once every card exists.
        if (!this._ghosted) {
          this._ghosted = true;
          for (const el of document.querySelectorAll('silk-popup-card')) el.preview = true;
        }
      }
      get hass() {
        return this._hass;
      }
    }
  );
}

/* ------------------------------------------------------------------ *
 * 7. EXTRA_SECTIONS
 * ------------------------------------------------------------------ */

const MOTION_SENSORS = [
  'binary_sensor.motion_living',
  'binary_sensor.motion_kitchen',
  'binary_sensor.motion_entrance',
  'binary_sensor.motion_corridor',
  'binary_sensor.occupancy_office',
  'binary_sensor.occupancy_bed',
];

export const EXTRA_SECTIONS = [
  ['Charts — distribution & shape', [
    // The bridge decorates the shared mock hass; it renders nothing.
    ['', { type: `custom:${BRIDGE_TAG}` }],
    ['h3x', { type: 'custom:silk-box-card', entity: 'sensor.kitchen_temp', name: '주방 온도 분포', days: 7 }],
    ['h3x', { type: 'custom:silk-box-card', entity: 'sensor.nas_cpu', name: 'NAS CPU 분포', days: 14, color: '#9d7ee8' }],
    ['h3x', { type: 'custom:silk-candle-card', entity: 'sensor.balcony_temp_ok', name: '베란다 일교차', days: 7 }],
    ['h3x', { type: 'custom:silk-candle-card', entity: 'sensor.fuel_gs', name: '휘발유 시세', days: 12, color: '#e6a23c' }],
    ['h3x', { type: 'custom:silk-histogram-card', entity: 'sensor.kids_temp', name: '아이방 온도', days: 7, bins: 12 }],
    ['h3x', { type: 'custom:silk-histogram-card', entity: 'sensor.pm25', name: '초미세먼지', days: 14, bins: 16, color: '#5ec78d' }],
    ['h3x', { type: 'custom:silk-scatter-card', entity: 'sensor.outdoor_humidity', entity2: 'sensor.pm25', name: '습도 대 미세먼지', trend: true }],
    ['h3x', { type: 'custom:silk-scatter-card', entity: 'sensor.kitchen_temp', entity2: 'sensor.kitchen_humidity', name: '주방 온·습도', hours_to_show: 24 }],
    ['h4x', { type: 'custom:silk-radar-card', name: '집 상태 한눈에', compare: true, metrics: [
      { entity: 'sensor.kitchen_temp', label: '온도', min: 15, max: 32 },
      { entity: 'sensor.kitchen_humidity', label: '습도', min: 20, max: 90 },
      { entity: 'sensor.pm25', label: 'PM2.5', min: 0, max: 60 },
      { entity: 'sensor.nas_cpu', label: 'CPU', min: 0, max: 100 },
      { entity: 'sensor.bw_total', label: '트래픽', min: 0, max: 40 },
      { entity: 'sensor.tank_level', label: '어항', min: 0, max: 100 },
    ] }],
    ['h4x', { type: 'custom:silk-year-card', entity: 'sensor.energy_today', name: '연간 전력 히트맵', weeks: 53 }],
  ]],

  ['Charts — composition & flow', [
    ['h3x', { type: 'custom:silk-donut-card', name: '오늘 기기별 전력', unit: 'kWh', decimals: 2, entities: [
      { entity: 'sensor.aircon_energy_today', name: '에어컨', color: '#4aa8ff' },
      { entity: 'sensor.boiler_energy_today', name: '보일러', color: '#e8734f' },
      { entity: 'sensor.server_energy_today', name: '홈서버', color: '#5ec78d' },
      { entity: 'sensor.fridge_energy_today', name: '냉장고', color: '#e6a23c' },
      { entity: 'sensor.tv_energy_today', name: 'TV', color: '#9d7ee8' },
      { entity: 'sensor.washer_energy_today', name: '세탁기', color: '#6c8dd6' },
    ] }],
    ['h3x', { type: 'custom:silk-treemap-card', name: '전력 점유율', unit: 'kWh', entities: [
      { entity: 'sensor.aircon_energy_today', name: '에어컨' },
      { entity: 'sensor.boiler_energy_today', name: '보일러' },
      { entity: 'sensor.server_energy_today', name: '홈서버' },
      { entity: 'sensor.fridge_energy_today', name: '냉장고' },
      { entity: 'sensor.tv_energy_today', name: 'TV' },
      { entity: 'sensor.oven_energy_today', name: '오븐' },
      { entity: 'sensor.washer_energy_today', name: '세탁기' },
    ] }],
    ['h4x', { type: 'custom:silk-sankey-card', name: '오늘 에너지 흐름', unit: 'kWh',
      sources: [{ entity: 'sensor.solar_today_kwh', name: '태양광' }, { entity: 'sensor.grid_import_today', name: '한전' }],
      sinks: [
        { entity: 'sensor.aircon_energy_today', name: '에어컨' },
        { entity: 'sensor.boiler_energy_today', name: '보일러' },
        { entity: 'sensor.server_energy_today', name: '홈서버' },
        { entity: 'sensor.fridge_energy_today', name: '냉장고' },
        { entity: 'sensor.grid_export_today', name: '판매' },
      ] }],
    ['h3x', { type: 'custom:silk-stacked-card', name: '방별 온도 누적', hours_to_show: 24, entities: [
      { entity: 'sensor.kitchen_temp', name: '주방' },
      { entity: 'sensor.bath_temp', name: '욕실' },
      { entity: 'sensor.kids_temp', name: '아이방' },
    ] }],
    ['h3x', { type: 'custom:silk-waterfall-card', name: '이번 달 요금 구성', unit: 'KRW', start: 0, items: [
      { name: '기본요금', value: 1600 },
      { name: '전력량요금', value: 34200 },
      { name: '심야 할인', value: -4200 },
      { name: '태양광 상계', value: -6800 },
      { name: '부가세', value: 2480 },
    ] }],
    ['h3x', { type: 'custom:silk-multiples-card', name: '집 안 온도 스몰멀티플', hours_to_show: 24, columns: 3, entities: [
      { entity: 'sensor.kitchen_temp', name: '주방' },
      { entity: 'sensor.bath_temp', name: '욕실' },
      { entity: 'sensor.kids_temp', name: '아이방' },
      { entity: 'sensor.balcony_temp_ok', name: '베란다' },
      { entity: 'sensor.kitchen_humidity', name: '주방 습도' },
      { entity: 'sensor.pm25', name: 'PM2.5' },
    ] }],
    ['h3x', { type: 'custom:silk-sparkbar-card', entity: 'sensor.energy_today', name: '시간별 사용량', mode: 'change', hours: 24, color: '#e6a23c' }],
    ['h3x', { type: 'custom:silk-sparkbar-card', entity: 'sensor.nas_cpu', name: 'NAS CPU 평균', mode: 'mean', hours: 18 }],
    ['h3x', { type: 'custom:silk-delta-card', name: '어제 대비', metric: 'change', entities: [
      { entity: 'sensor.energy_today', name: '전기' },
      { entity: 'sensor.aircon_energy_today', name: '에어컨' },
      { entity: 'sensor.boiler_energy_today', name: '보일러' },
      { entity: 'sensor.server_energy_today', name: '홈서버' },
    ] }],
    ['h3x', { type: 'custom:silk-delta-card', name: '평균값 변화', metric: 'mean', invert: true, entities: ['sensor.kitchen_temp', 'sensor.kids_temp', 'sensor.tank_temp', 'sensor.nas_memory'] }],
  ]],

  ['Timelines — when things ran', [
    ['h3x', { type: 'custom:silk-gantt-card', name: '오늘 가동 이력', hours_to_show: 24, entities: [
      { entity: 'switch.fireplace', name: '벽난로' },
      { entity: 'switch.dehumidifier', name: '제습기' },
      { entity: 'switch.tank_pump', name: '여과기' },
      { entity: 'binary_sensor.occupancy_office', name: '서재 재실' },
    ] }],
    ['h3x', { type: 'custom:silk-motion-card', name: '움직임 타임라인', hours_to_show: 24, sensors: MOTION_SENSORS }],
    ['h3x', { type: 'custom:silk-motion-card', name: '지난 12시간', hours_to_show: 12, sensors: MOTION_SENSORS.slice(0, 4), color: '#e6a23c' }],
    ['h2x', { type: 'custom:silk-runtime-card', entity: 'climate.aircon_runtime', name: '에어컨 가동시간', hours_to_show: 24, compare_yesterday: true }],
    ['h2x', { type: 'custom:silk-runtime-card', entity: 'water_heater.boiler', name: '보일러 가동시간', hours_to_show: 48, icon: 'mdi:water' }],
    ['h2x', { type: 'custom:silk-binary-card', entity: 'binary_sensor.door_front', name: '현관문' }],
    ['h2x', { type: 'custom:silk-binary-card', entity: 'binary_sensor.window_bedroom', name: '침실 창문', invert: true, color: '#5ec78d' }],
    ['h3x', { type: 'custom:silk-peak-card', entity: 'sensor.desk_power', name: '책상 피크', threshold: 120 }],
    ['h3x', { type: 'custom:silk-peak-card', entity: 'sensor.bw_total', name: '트래픽 피크', threshold: 22, hours_to_show: 12, color: '#9d7ee8' }],
    ['h2x', { type: 'custom:silk-trend-card', entity: 'sensor.pm25', name: '초미세먼지', invert: true, hours_to_show: 24 }],
    ['h2x', { type: 'custom:silk-trend-card', entity: 'sensor.tank_ph', name: '어항 pH', decimals: 2, hours_to_show: 48 }],
  ]],

  ['Energy — deeper', [
    ['h2x', { type: 'custom:silk-goal-card', entity: 'sensor.energy_month', goal: 350, name: '이번 달 목표' }],
    ['h2x', { type: 'custom:silk-goal-card', entity: 'sensor.energy_month', goal: 260, name: '빡센 목표', color: '#ef6c6c' }],
    ['h2x', { type: 'custom:silk-cost-card', month_energy: 'sensor.energy_month', rate: 128.4, budget: 60000, currency: 'KRW', name: '이번 달 요금 예상' }],
    ['h2x', { type: 'custom:silk-cost-card', month_energy: 'sensor.energy_month', price_entity: 'sensor.price_now', currency: 'KRW', name: '실시간 단가 기준' }],
    ['h2x', { type: 'custom:silk-self-card', solar_total: 'sensor.solar_today_kwh', exported: 'sensor.grid_export_today', name: '자가소비율', period_label: '오늘' }],
    ['h2x', { type: 'custom:silk-self-card', solar_total: 'sensor.solar_today_kwh', imported: 'sensor.grid_import_today', consumed: 'sensor.energy_today', name: '자가소비율 (역산)', period_label: '오늘' }],
    ['h3x', { type: 'custom:silk-breakdown-card', name: '오늘 소비 랭킹', unaccounted: 'sensor.energy_today', devices: [
      { entity: 'sensor.aircon_energy_today', name: '에어컨', icon: 'mdi:air-conditioner' },
      { entity: 'sensor.boiler_energy_today', name: '보일러', icon: 'mdi:water' },
      { entity: 'sensor.server_energy_today', name: '홈서버', icon: 'mdi:server-network' },
      { entity: 'sensor.fridge_energy_today', name: '냉장고', icon: 'mdi:snowflake' },
      { entity: 'sensor.tv_energy_today', name: 'TV', icon: 'mdi:television' },
    ] }],
    ['h3x', { type: 'custom:silk-standby-card', name: '대기전력', min: 0.5, max: 15, rate: 128.4, currency: '₩', devices: [
      { entity: 'sensor.tv_standby_power', name: 'TV', switch: 'switch.heater_plug' },
      { entity: 'sensor.console_power', name: '플레이스테이션' },
      { entity: 'sensor.soundbar_power', name: '사운드바' },
      { entity: 'sensor.microwave_power', name: '전자레인지' },
      { entity: 'sensor.router_power', name: '공유기' },
      { entity: 'sensor.desk_power', name: '책상 멀티탭' },
    ] }],
    ['h4x', { type: 'custom:silk-solar-forecast-card', entity: 'sensor.solar_forecast', actual: 'sensor.solar', name: '오늘 발전 예보' }],
    ['h3x', { type: 'custom:silk-carbon-card', entity: 'sensor.grid_carbon', name: '전력 탄소집약도' }],
    ['h3x', { type: 'custom:silk-fuel-card', name: '주변 주유소', unit: 'L', currency: '₩', stations: [
      { entity: 'sensor.fuel_gs', name: 'GS 역삼', brand: 'GS', distance: '1.2 km' },
      { entity: 'sensor.fuel_soil', name: 'S-OIL 논현', brand: 'S-OIL', distance: '2.8 km' },
      { entity: 'sensor.fuel_hyundai', name: '현대 삼성', brand: 'HD', distance: '3.4 km' },
    ] }],
  ]],

  ['Network & servers', [
    ['h3x', { type: 'custom:silk-server-card', name: 'TrueNAS', host: 'truenas', cpu: 'sensor.nas_cpu', memory: 'sensor.nas_memory', disk: 'sensor.nas_disk', swap: 'sensor.nas_swap', uptime: 'sensor.nas_uptime', load: 'sensor.nas_load' }],
    ['h2x', { type: 'custom:silk-server-card', name: 'Proxmox', cpu: 'sensor.cpu', disk: 'sensor.disk' }],
    ['h4x', { type: 'custom:silk-docker-card', name: 'LXC 101 컨테이너', limit: 6, containers: [
      { entity: 'sensor.docker_hermes', name: 'hermes', cpu: 'sensor.docker_hermes_cpu', memory: 'sensor.docker_hermes_mem', restart: 'button.restart_hermes' },
      { entity: 'sensor.docker_supabase', name: 'supabase', cpu: 'sensor.docker_supabase_cpu', memory: 'sensor.docker_supabase_mem' },
      { entity: 'sensor.docker_grafana', name: 'grafana', cpu: 'sensor.docker_grafana_cpu', memory: 'sensor.docker_grafana_mem', restart: 'button.restart_grafana' },
      { entity: 'sensor.docker_omniroute', name: 'omniroute', cpu: 'sensor.docker_omniroute_cpu' },
    ] }],
    ['h4x', { type: 'custom:silk-addons-card', name: 'HA 애드온', addons: [
      { entity: 'sensor.addon_mosquitto', name: 'Mosquitto', version: 'sensor.addon_mosquitto_version', update: 'update.addon_mosquitto' },
      { entity: 'sensor.addon_z2m', name: 'Zigbee2MQTT', version: 'sensor.addon_z2m_version', update: 'update.addon_z2m' },
      { entity: 'sensor.addon_nodered', name: 'Node-RED', version: 'sensor.addon_nodered_version', update: 'update.addon_nodered' },
      { entity: 'sensor.addon_esphome', name: 'ESPHome', version: 'sensor.addon_esphome_version' },
    ] }],
    ['h3x', { type: 'custom:silk-ping-card', name: '핑 그리드', hosts: [
      { entity: 'binary_sensor.ping_router', name: '공유기', url: 'http://192.168.0.1' },
      { entity: 'binary_sensor.ping_nas', name: 'TrueNAS' },
      { entity: 'sensor.ping_proxmox_latency', name: 'Proxmox' },
      { entity: 'sensor.ping_cloudflare_latency', name: 'Cloudflare' },
      { entity: 'binary_sensor.ping_printer', name: '프린터' },
      { entity: 'binary_sensor.server_ok', name: '홈랩' },
    ] }],
    ['h3x', { type: 'custom:silk-bandwidth-card', name: '누가 쓰고 있나', total: 'sensor.bw_total', unit: 'Mbit/s', clients: [
      { entity: 'sensor.bw_nas', name: 'TrueNAS' },
      { entity: 'sensor.bw_tv', name: '거실 TV' },
      { entity: 'sensor.bw_laptop', name: '맥북' },
      { entity: 'sensor.bw_phone', name: '아이폰' },
      { entity: 'sensor.bw_console', name: '플스' },
    ] }],
    ['h4x', { type: 'custom:silk-vpn-card', name: 'WireGuard', toggle: 'switch.wireguard', peers: [
      { entity: 'binary_sensor.wg_laptop', name: '맥북', ip: 'sensor.wg_laptop_ip', last_seen: 'sensor.wg_laptop_seen' },
      { entity: 'binary_sensor.wg_phone', name: '아이폰', ip: 'sensor.wg_phone_ip', last_seen: 'sensor.wg_phone_seen' },
      { entity: 'binary_sensor.wg_tablet', name: '아이패드', ip: 'sensor.wg_tablet_ip', last_seen: 'sensor.wg_tablet_seen' },
    ] }],
    ['h2x', { type: 'custom:silk-wan-card', entity: 'binary_sensor.wan_online', ip: 'sensor.wan_ip', isp: 'sensor.wan_isp', name: '인터넷' }],
    ['h2x', { type: 'custom:silk-wan-card', entity: 'binary_sensor.ping_nas', name: 'NAS 링크', color: '#9d7ee8' }],
    ['h3x', { type: 'custom:silk-cert-card', name: 'TLS 인증서', warn_days: 14, critical_days: 7, certs: [
      { entity: 'sensor.cert_hueeng', name: 'hueeng.com' },
      { entity: 'sensor.cert_wildcard', name: '*.hueeng.com' },
      { entity: 'sensor.cert_grafana', name: 'grafana' },
      { entity: 'sensor.cert_supabase', name: 'db' },
    ] }],
    ['h3x', { type: 'custom:silk-database-card', size: 'sensor.db_size', rows: 'sensor.db_rows', oldest: 'sensor.db_oldest', purge_days: 10, max_size: 8, purge: true, name: '레코더 DB' }],
  ]],

  ['HA system', [
    ['h2x', { type: 'custom:silk-ha-card', name: 'Home Assistant', uptime: 'sensor.ha_uptime' }],
    ['h4x', { type: 'custom:silk-integrations-card', name: '통합 구성요소', limit: 8 }],
    ['h4x', { type: 'custom:silk-integrations-card', name: '전체 보기', show_all: true, limit: 6 }],
    ['h4x', { type: 'custom:silk-doctor-card', name: '죽은 엔티티', limit: 10 }],
    ['h4x', { type: 'custom:silk-doctor-card', name: 'unavailable만', include_unknown: false, limit: 6, ignore: ['switch.aquarium'] }],
    ['h4x', { type: 'custom:silk-audit-card', name: '자동화 점검', stale_days: 30, limit: 8 }],
    ['h4x', { type: 'custom:silk-errors-card', name: '오류 로그', limit: 4 }],
    ['h4x', { type: 'custom:silk-errors-card', name: '경고 포함', level: 'WARNING', limit: 4, color: '#e6a23c' }],
    ['h4x', { type: 'custom:silk-backup-card', name: '백업 작업', stale_hours: 36, jobs: [
      { name: 'NAS 스냅샷', state: 'sensor.backup_nas', last: 'sensor.backup_nas_last', size: 'sensor.backup_nas_size', duration: 'sensor.backup_nas_duration', run: 'script.run_nas_backup' },
      { name: 'HA 전체 백업', state: 'sensor.backup_ha', last: 'sensor.backup_ha_last', size: 'sensor.backup_ha_size' },
      { name: '사진 동기화', state: 'sensor.backup_photos', last: 'sensor.backup_photos_last', run: 'script.run_photo_backup' },
    ] }],
    ['h2x', { type: 'custom:silk-restart-card', name: '재시작' }],
    ['h2x', { type: 'custom:silk-restart-card', name: '홈랩 재시작', actions: [
      { name: 'hermes', service: 'button.press', data: { entity_id: 'button.restart_hermes' }, icon: 'mdi:devices' },
      { name: 'grafana', service: 'button.press', data: { entity_id: 'button.restart_grafana' }, icon: 'mdi:chart-box-outline' },
      { name: '공유기', service: 'button.press', data: { entity_id: 'button.restart_router' }, icon: 'mdi:router-wireless', danger: true },
    ] }],
    ['h2x', { type: 'custom:silk-theme-card', name: '테마' }],
    ['h2x', { type: 'custom:silk-theme-card', name: '설치된 테마', themes: ['silk', 'noctis', 'midnight'] }],
  ]],

  ['Household', [
    ['h4x', { type: 'custom:silk-chores-card', name: '집안일 당번', done_service: 'input_boolean.toggle', chores: [
      { name: '분리수거', people: ['휭', '지원'], interval_days: 7, icon: 'mdi:reload' },
      { name: '욕실 청소', people: ['지원', '휭', '민지'], interval_days: 14, icon: 'mdi:water' },
      { name: '고양이 화장실', people: ['민지', '휭'], interval_days: 2, icon: 'mdi:account' },
      { name: '차 세차', people: ['휭'], interval_days: 30, icon: 'mdi:car' },
    ] }],
    ['h4x', { type: 'custom:silk-meals-card', entity: 'todo.meal_plan', name: '이번 주 저녁', days: 7 }],
    ['h4x', { type: 'custom:silk-meals-card', entity: 'calendar.meals', name: '식단 캘린더', days: 5 }],
    ['h4x', { type: 'custom:silk-shopping-card', entity: 'todo.groceries', name: '장보기', limit: 8 }],
    ['h3x', { type: 'custom:silk-meds-card', name: '오늘 복약', meds: [
      { name: '혈압약', time: '08:00', entity: 'input_boolean.med_morning', icon: 'mdi:check-circle-outline' },
      { name: '비타민 D', time: '13:00', entity: 'input_boolean.med_lunch' },
      { name: '오메가3', time: '21:00', entity: 'input_boolean.med_evening' },
    ] }],
    ['h2x', { type: 'custom:silk-hydration-card', entity: 'counter.water_glasses', goal: 8, name: '오늘 마신 물' }],
    ['h2x', { type: 'custom:silk-hydration-card', entity: 'counter.coffee_cups', goal: 4, name: '오늘 마신 커피', icon: 'mdi:coffee-maker', color: '#e8734f' }],
    ['h3x', { type: 'custom:silk-pet-card', name: '반려동물', pets: [
      { name: '보리', icon: 'mdi:account', weight: 'sensor.bori_weight', walk: 'input_button.walk_bori', meals: [
        { entity: 'button.feed_bori_am', label: '아침' },
        { entity: 'button.feed_bori_pm', label: '저녁' },
      ] },
    ] }],
    ['h3x', { type: 'custom:silk-trash-card', name: '분리배출', bins: [
      { name: '일반쓰레기', entity: 'sensor.trash_general', color: '#6c8dd6', icon: 'mdi:package-up' },
      { name: '음식물', entity: 'sensor.trash_food', color: '#5ec78d', icon: 'mdi:sprout' },
      { name: '재활용', entity: 'sensor.trash_recycle', color: '#e6a23c', icon: 'mdi:reload' },
      { name: '대형폐기물', entity: 'sensor.trash_bulky', color: '#9d7ee8', icon: 'mdi:sofa' },
    ] }],
    ['h3x', { type: 'custom:silk-birthday-card', name: '생일', limit: 5, people: [
      { name: '지원', date: dateOnly(6).slice(5) },
      { name: '민지', date: dateOnly(21).slice(5) },
      { name: '어머니', date: '1959-11-03' },
      { name: '휭', date: '1990-03-18' },
    ] }],
    ['h3x', { type: 'custom:silk-birthday-card', name: '캘린더 생일', calendar: 'calendar.birthdays', keyword: 'birthday', limit: 4 }],
    ['h2x', { type: 'custom:silk-holiday-card', entity: 'calendar.holidays', workday: 'binary_sensor.workday', show_details: true, name: '오늘' }],
    ['h2x', { type: 'custom:silk-holiday-card', entity: 'sensor.holiday_today', name: '기념일', color: '#e8734f' }],
  ]],

  ['Body & focus', [
    ['h3x', { type: 'custom:silk-fitness-card', steps: { entity: 'sensor.steps', goal: 10000 }, exercise: { entity: 'sensor.exercise_minutes', goal: 30 }, stand: { entity: 'sensor.stand_hours', goal: 12 }, name: '오늘의 활동' }],
    ['h3x', { type: 'custom:silk-fitness-card', steps: 'sensor.steps', name: '걸음만' }],
    ['h3x', { type: 'custom:silk-sleep-card', duration: 'sensor.sleep_duration', score: 'sensor.sleep_score', deep: 'sensor.sleep_deep', rem: 'sensor.sleep_rem', awake: 'sensor.sleep_awake', bedtime: 'sensor.bedtime', wake: 'sensor.wake_time', name: '어젯밤' }],
    ['h2x', { type: 'custom:silk-sleep-card', duration: 'sensor.sleep_duration', score: 'sensor.sleep_score', name: '수면 요약' }],
    ['h4x', { type: 'custom:silk-pomodoro-card', name: '뽀모도로', work: 25, short_break: 5, long_break: 15, rounds: 4 }],
    ['h3x', { type: 'custom:silk-quote-card', name: '오늘의 문장', daily: true, quotes: [
      { text: '단순함은 궁극의 정교함이다.', author: '레오나르도 다 빈치' },
      { text: '완벽함은 더 보탤 것이 없을 때가 아니라, 더 뺄 것이 없을 때 이루어진다.', author: '생텍쥐페리' },
      { text: '천천히, 그러나 멈추지 않고.', author: '괴테' },
    ] }],
    ['h3x', { type: 'custom:silk-quote-card', name: '메모', entity: 'input_text.guest_note', interval: 60 }],
  ]],

  ['Comfort & climate', [
    ['h3x', { type: 'custom:silk-comfort-card', temperature: 'sensor.living_temp', humidity: 'sensor.humidity', name: '거실 쾌적도' }],
    ['h3x', { type: 'custom:silk-comfort-card', temperature: 'sensor.kids_temp', humidity: 'sensor.kids_humidity', name: '아이방 (좁은 존)', zone: { t_min: 21, t_max: 25, h_min: 40, h_max: 60 } }],
    ['h2x', { type: 'custom:silk-dewpoint-card', temperature: 'sensor.living_temp', humidity: 'sensor.humidity', name: '거실 이슬점' }],
    ['h2x', { type: 'custom:silk-dewpoint-card', temperature: 'sensor.bath_temp', humidity: 'sensor.bath_humidity', name: '욕실 이슬점', color: '#4aa8ff' }],
    ['h3x', { type: 'custom:silk-mold-card', indoor_temp: 'sensor.bath_temp', indoor_humidity: 'sensor.bath_humidity', outdoor_temp: 'sensor.outdoor_temp', name: '욕실 곰팡이 위험' }],
    ['h3x', { type: 'custom:silk-mold-card', indoor_temp: 'sensor.living_temp', indoor_humidity: 'sensor.humidity', outdoor_temp: 'sensor.outdoor_temp', insulation: 0.85, name: '거실 (단열 양호)' }],
    ['h3x', { type: 'custom:silk-ventilate-card', co2: 'sensor.co2', outdoor_temp: 'sensor.outdoor_temp', fan: 'fan.air_purifier', name: '환기 조언' }],
    ['h2x', { type: 'custom:silk-window-advisor-card', indoor: 'sensor.living_temp', outdoor: 'sensor.outdoor_temp', pm25: 'sensor.pm25', openings: ['binary_sensor.window_kitchen', 'binary_sensor.window_bedroom', 'binary_sensor.window_living'], name: '창문 열까?' }],
    ['h2x', { type: 'custom:silk-window-advisor-card', indoor: 'sensor.kids_temp', outdoor: 'sensor.outdoor_temp', name: '아이방' }],
    ['h4x', { type: 'custom:silk-floor-card', name: '바닥 난방', zones: [
      { entity: 'climate.floor_living', name: '거실' },
      { entity: 'climate.floor_bedroom', name: '침실' },
      { entity: 'climate.floor_kids', name: '아이방' },
      { entity: 'climate.floor_bath', name: '욕실' },
    ] }],
    ['h4x', { type: 'custom:silk-room-rank-card', name: '방별 온도 순위', target: 23, rooms: [
      { name: '거실', temperature: 'sensor.living_temp', humidity: 'sensor.humidity' },
      { name: '침실', temperature: 'sensor.bedroom_temp' },
      { name: '주방', temperature: 'sensor.kitchen_temp', humidity: 'sensor.kitchen_humidity' },
      { name: '아이방', temperature: 'sensor.kids_temp', humidity: 'sensor.kids_humidity' },
      { name: '욕실', temperature: 'sensor.bath_temp', humidity: 'sensor.bath_humidity' },
      { name: '서재', temperature: 'sensor.office_temp' },
    ] }],
    ['h3x', { type: 'custom:silk-water-heater-card', entity: 'water_heater.boiler', name: '온수 보일러' }],
    ['h3x', { type: 'custom:silk-water-heater-card', entity: 'water_heater.guest', name: '별채 온수기', color: '#6c8dd6' }],
  ]],

  ['Security & openings', [
    ['h4x', { type: 'custom:silk-doorbell-card', camera: 'camera.doorbell', ring: 'binary_sensor.doorbell', unlock: 'lock.front', light: 'light.porch', chime: 'switch.door_chime', recent_minutes: 60, name: '현관' }],
    ['h4x', { type: 'custom:silk-camera-grid-card', name: '카메라 월', cameras: ['camera.porch', 'camera.garage', 'camera.gate', 'camera.living'], refresh_interval: 30 }],
    ['h3x', { type: 'custom:silk-camera-grid-card', cameras: ['camera.gate', 'camera.doorbell'], refresh_interval: 20 }],
    ['h4x', { type: 'custom:silk-visitor-card', name: '방문 기록', hours_to_show: 48, limit: 6, entities: ['binary_sensor.doorbell', 'binary_sensor.door_front', 'binary_sensor.motion_entrance', 'binary_sensor.motion_living'] }],
    ['h4x', { type: 'custom:silk-panic-card', name: '비상', hold_time: 1200, actions: [
      { name: '사이렌', icon: 'mdi:bullhorn', service: 'siren.turn_on', data: { entity_id: 'siren.hallway' }, color: 'error' },
      { name: '전부 잠금', icon: 'mdi:lock', service: 'lock.lock', data: { entity_id: 'lock.front' } },
      { name: '전등 전부 켜기', icon: 'mdi:lightbulb', service: 'light.turn_on', data: { entity_id: 'light.hallway' }, color: 'warning' },
      { name: '가스 차단', icon: 'mdi:alert-circle-outline', service: 'valve.close_valve', data: { entity_id: 'valve.gas_line' }, color: 'error' },
    ] }],
    ['h3x', { type: 'custom:silk-siren-card', entity: 'siren.hallway', name: '복도 사이렌', durations: [10, 30, 60, 300] }],
    ['h2x', { type: 'custom:silk-siren-card', entity: 'siren.garden', name: '정원 사이렌' }],
    ['h2x', { type: 'custom:silk-valve-card', entity: 'valve.main_water', name: '수도 메인' }],
    ['h2x', { type: 'custom:silk-valve-card', entity: 'valve.gas_line', name: '가스 밸브', show_buttons: true, color: '#e8734f' }],
  ]],

  ['Transit & outside', [
    ['h4x', { type: 'custom:silk-transit-card', name: '집 앞 정류장', limit: 5, lines: [
      { entity: 'sensor.bus_146', line: '146', name: '강남역', color: '#2b6cd4' },
      { entity: 'sensor.bus_402', line: '402', name: '서울역', color: '#3aa655' },
      { entity: 'sensor.subway_line2', line: '2', name: '내선순환', color: '#00a84d' },
    ] }],
    ['h2x', { type: 'custom:silk-transit-card', name: '', limit: 3, lines: [
      { entity: 'sensor.subway_line2', line: '2', color: '#00a84d' },
      { entity: 'sensor.subway_bundang', line: 'B', name: '왕십리', color: '#f5a200' },
    ] }],
    ['h3x', { type: 'custom:silk-commute-card', name: '출근길', depart_by: '09:00', routes: [
      { name: '강남 사무실', duration: 'sensor.commute_work_duration', typical: 32, distance: 'sensor.commute_work_distance' },
      { name: '우회 (강변북로)', duration: 'sensor.commute_alt_duration', typical: 44 },
      { name: '학교 데려다주기', duration: 'sensor.commute_school_duration', typical: 12, distance: 'sensor.commute_school_distance' },
    ] }],
    ['h2x', { type: 'custom:silk-commute-card', name: '', routes: [{ duration: 'sensor.commute_work_duration', typical: 'sensor.commute_alt_duration' }] }],
    ['h3x', { type: 'custom:silk-flight-card', entity: 'sensor.flight_ke703', name: '도쿄행' }],
    ['h3x', { type: 'custom:silk-flight-card', entity: 'sensor.flight_oz102', name: '제주행' }],
    ['h4x', { type: 'custom:silk-package-card', entity: 'sensor.packages', name: '배송 현황', limit: 6, keep_days: 2 }],
    ['h4x', { type: 'custom:silk-package-card', name: '개별 추적', packages: [
      { entity: 'sensor.pkg_keyboard' },
      { entity: 'sensor.pkg_filament' },
      { entity: 'sensor.pkg_beans' },
    ] }],
    ['h2x', { type: 'custom:silk-parking-card', location: 'sensor.car_location', since: 'sensor.parked_since', limit_minutes: 240, cost_per_hour: 3000, map_url: 'https://map.kakao.com', name: '주차' }],
    ['h2x', { type: 'custom:silk-parking-card', location: 'device_tracker.car', name: '차 위치', icon: 'mdi:car' }],
    ['h4x', { type: 'custom:silk-zones-card', name: '어디 있나', zones: ['zone.home', 'zone.work'], people: ['person.hueeng', 'person.guest'] }],
    ['h4x', { type: 'custom:silk-zones-card', name: '아이 동선', zones: ['zone.school', 'zone.gym'], people: ['person.minji', 'person.jiwon'], color: '#9d7ee8' }],
  ]],

  ['Media — deeper', [
    ['h4x', { type: 'custom:silk-library-card', entity: 'sensor.plex_recent', name: '최근 추가', limit: 8, tap_service: { service: 'media_player.play_media', data: { entity_id: 'media_player.tv', media_content_id: '{id}', media_content_type: 'movie' } } }],
    ['h4x', { type: 'custom:silk-queue-card', entity: 'media_player.plex', name: '재생 대기열', limit: 5, play_action: { service: 'media_player.play_media', data: { entity_id: 'media_player.plex', media_content_id: '{id}', media_content_type: 'music' } } }],
    ['h3x', { type: 'custom:silk-queue-card', entity: 'media_player.plex', name: '짧게', limit: 3 }],
    ['h4x', { type: 'custom:silk-channels-card', entity: 'media_player.tv', name: '채널', channels: [
      { name: 'Netflix', number: 1, source: 'Netflix', icon: 'mdi:television' },
      { name: 'YouTube', number: 2, source: 'YouTube', icon: 'mdi:television' },
      { name: 'Plex', number: 3, source: 'Plex', icon: 'mdi:video' },
      { name: 'HDMI 1', number: 4, source: 'HDMI 1', icon: 'mdi:television' },
      { name: 'KBS1', number: 9, media_id: 'tv:kbs1', icon: 'mdi:television' },
      { name: 'MBC', number: 11, media_id: 'tv:mbc', icon: 'mdi:television' },
      { name: 'SBS', number: 6, media_id: 'tv:sbs', icon: 'mdi:television' },
      { name: 'tvN', number: 17, media_id: 'tv:tvn', icon: 'mdi:television' },
    ] }],
    ['h4x', { type: 'custom:silk-mixer-card', name: '스피커 볼륨', players: ['media_player.living_speaker', 'media_player.kitchen_speaker', 'media_player.office_speaker', 'media_player.bathroom', 'media_player.plex'] }],
    ['h2x', { type: 'custom:silk-mixer-card', name: '거실만', players: ['media_player.living_speaker', 'media_player.tv'], color: '#e6a23c' }],
    ['h2x', { type: 'custom:silk-sleep-timer-card', entity: 'media_player.living_speaker', name: '취침 타이머', presets: [15, 30, 45, 60, 90] }],
    ['h2x', { type: 'custom:silk-sleep-timer-card', entity: 'media_player.plex', name: '영화 끝나면', presets: [30, 60, 120], action: 'media_player.media_pause' }],
  ]],

  ['Ambient & routines', [
    ['h4x', { type: 'custom:silk-mood-card', name: '무드 조명', lights: ['light.tv_ambient', 'light.living_spot'] }],
    ['h4x', { type: 'custom:silk-mood-card', name: '직접 만든 프리셋', lights: ['light.tv_ambient'], moods: [
      { name: '독서', kelvin: 4000, brightness_pct: 85, icon: 'mdi:clipboard-list-outline' },
      { name: '영화', hs: [265, 70], brightness_pct: 22, icon: 'mdi:movie-open' },
      { name: '노을', hs: [24, 78], brightness_pct: 55, icon: 'mdi:weather-sunset-down' },
      { name: '집중', kelvin: 5600, brightness_pct: 100, icon: 'mdi:radiobox-marked' },
    ] }],
    ['h3x', { type: 'custom:silk-fireplace-card', entity: 'switch.fireplace', name: '벽난로' }],
    ['h3x', { type: 'custom:silk-fireplace-card', entity: 'light.tv_ambient', name: 'TV 앰비언트', color: '#4aa8ff' }],
    ['h4x', { type: 'custom:silk-aquarium-card', name: '수조', temperature: 'sensor.tank_temp', ph: 'sensor.tank_ph', tds: 'sensor.tank_tds', water_level: 'sensor.tank_level', light: 'switch.tank_light', pump: 'switch.tank_pump', feeder: 'button.tank_feed' }],
    ['h3x', { type: 'custom:silk-aquarium-card', name: '수온만', temperature: 'sensor.tank_temp', light: 'switch.tank_light' }],
    ['h3x', { type: 'custom:silk-wakeup-card', light: 'light.bedroom_main', alarm_entity: 'input_datetime.alarm', enabled: 'input_boolean.wakeup_enabled', duration_minutes: 20, preview_seconds: 8, name: '기상 조명' }],
    ['h3x', { type: 'custom:silk-wakeup-card', light: 'light.hallway', time: '05:45', duration_minutes: 30, name: '주말 기상', color: '#e6a23c' }],
    ['h4x', { type: 'custom:silk-night-card', name: '취침 점검', steps: [
      { name: '현관문 잠금', entity: 'lock.front', desired: 'locked' },
      { name: '거실 소등', entity: 'light.living_spot', desired: 'off' },
      { name: '복도 소등', entity: 'light.hallway', desired: 'off' },
      { name: '커튼 닫기', entity: 'cover.bedroom_curtain', desired: 'closed' },
      { name: '취침 모드', entity: 'input_boolean.night_mode', desired: 'on' },
    ] }],
    ['h3x', { type: 'custom:silk-activity-card', name: '한 번에 실행', activities: [
      { name: '영화 시간', icon: 'mdi:movie-open', state_entity: 'light.tv_ambient', steps: [
        { service: 'light.turn_off', data: { entity_id: 'light.living_spot' } },
        { service: 'light.turn_on', data: { entity_id: 'light.tv_ambient', brightness_pct: 20 }, delay: 1 },
        { service: 'media_player.turn_on', data: { entity_id: 'media_player.tv' } },
      ] },
      { name: '아침 루틴', icon: 'mdi:weather-sunset-up', steps: [
        { service: 'light.turn_on', data: { entity_id: 'light.hallway' } },
        { service: 'switch.turn_on', data: { entity_id: 'switch.espresso' }, delay: 2 },
      ] },
      { name: '외출', icon: 'mdi:door-open', steps: [
        { service: 'light.turn_off', data: { entity_id: 'light.hallway' } },
        { service: 'lock.lock', data: { entity_id: 'lock.front' } },
      ] },
    ] }],
  ]],

  ['Niche domains — input helpers', [
    ['h2x', { type: 'custom:silk-text-card', entity: 'input_text.guest_note', name: '배송 메모', placeholder: '문 앞에 두세요' }],
    ['h2x', { type: 'custom:silk-text-card', entity: 'input_text.wifi_password', name: '게스트 와이파이', icon: 'mdi:shield-lock' }],
    ['h2x', { type: 'custom:silk-datetime-card', entity: 'input_datetime.alarm', name: '기상 알람' }],
    ['h2x', { type: 'custom:silk-datetime-card', entity: 'input_datetime.trip', name: '추석 출발' }],
    ['h2x', { type: 'custom:silk-datetime-card', entity: 'date.filter_due', name: '필터 교체일', icon: 'mdi:air-filter' }],
    ['h2x', { type: 'custom:silk-datetime-card', entity: 'time.quiet_start', name: '취침 모드 시작' }],
  ]],

  ['Layout & containers', [
    ['h4x', { type: 'custom:silk-grid-card', name: '타일 월', columns: 3, gap: 8, cards: [
      { type: 'custom:silk-toggle-card', entity: 'switch.espresso' },
      { type: 'custom:silk-toggle-card', entity: 'light.closet' },
      { type: 'custom:silk-toggle-card', entity: 'switch.fireplace' },
      { type: 'custom:silk-tile-card', entity: 'sensor.kitchen_temp', column_span: 2 },
      { type: 'custom:silk-ring-card', entity: 'sensor.nas_disk', name: 'NAS' },
    ] }],
    ['h2x', { type: 'custom:silk-grid-card', name: '정사각 그리드', columns: 4, square: true, cards: [
      { type: 'custom:silk-ring-card', entity: 'sensor.phone_battery' },
      { type: 'custom:silk-ring-card', entity: 'sensor.nas_memory', name: 'RAM' },
      { type: 'custom:silk-ring-card', entity: 'sensor.tank_level', name: '어항' },
      { type: 'custom:silk-ring-card', entity: 'sensor.nas_cpu', name: 'CPU' },
    ] }],
    ['h4x', { type: 'custom:silk-group-card', title: '서재', icon: 'mdi:desk', entities: [
      { entity: 'light.desk_lamp', name: '스탠드' },
      { entity: 'switch.heater_plug', name: '히터' },
      { entity: 'media_player.office_speaker', name: '스피커', secondary: 'state' },
      { entity: 'binary_sensor.occupancy_office', name: '재실', secondary: 'last-changed' },
    ] }],
    ['h4x', { type: 'custom:silk-group-card', name: '집 전체', icon: 'mdi:home', columns: 2, toggles: false, entities: ['light.living_spot', 'light.hallway', 'switch.fireplace', 'lock.front'] }],
    ['h2x', { type: 'custom:silk-conditional-card', name: '조건부', conditions: [{ entity: 'sensor.co2', above: 400 }], card: { type: 'custom:silk-tile-card', entity: 'sensor.co2' } }],
    ['h2x', { type: 'custom:silk-conditional-card', name: '충족 안 됨', preview: true, conditions: [{ entity: 'light.desk_lamp', state: 'on' }], card: { type: 'custom:silk-light-card', entity: 'light.desk_lamp' } }],
    ['', { type: 'custom:silk-drawer-card', title: '빠른 제어', icon: 'mdi:format-list-bulleted', side: 'right', width: 340, cards: [
      { type: 'custom:silk-light-card', entity: 'light.living_spot' },
      { type: 'custom:silk-fan-card', entity: 'fan.bedroom' },
      { type: 'custom:silk-toggle-card', entity: 'switch.fireplace' },
    ] }],
    ['', { type: 'custom:silk-drawer-card', title: '왼쪽에서', icon: 'mdi:format-list-bulleted', side: 'left', cards: [{ type: 'custom:silk-tile-card', entity: 'sensor.kitchen_temp' }] }],
    ['', { type: 'custom:silk-popup-card', hash: '#garage', title: '차고', icon: 'mdi:garage', cards: [
      { type: 'custom:silk-cover-card', entity: 'cover.garage' },
      { type: 'custom:silk-toggle-card', entity: 'light.closet' },
    ] }],
    ['', { type: 'custom:silk-popup-card', hash: '#tank', title: '수조', icon: 'mdi:water', cards: [{ type: 'custom:silk-tile-card', entity: 'sensor.tank_temp' }] }],
    ['h3x', { type: 'custom:silk-hero-card', title: '거실', subtitle: '지금 이 방', image: '/demo/porch.svg', entity: 'sensor.living_temp', height: 180, align: 'left', action: '/lovelace/living' }],
    ['h3x', { type: 'custom:silk-hero-card', title: '우리 집', subtitle: '사진 없이도 표지가 된다', entity: 'sensor.energy_today', height: 180, align: 'center', color: '#9d7ee8' }],
    ['h2x', { type: 'custom:silk-banner-card', level: 'warning', title: '인증서 만료 임박', message: 'db.hueeng.com 인증서가 3일 뒤 만료됩니다.', icon: 'mdi:shield-check', dismissible: false, action: { label: '갱신', navigation_path: '/lovelace/system' } }],
    ['h2x', { type: 'custom:silk-banner-card', level: 'success', message: '어젯밤 NAS 백업이 38분 만에 끝났습니다.', icon: 'mdi:check-circle-outline', dismissible: true }],
    ['h2x', { type: 'custom:silk-banner-card', level: 'error', title: 'CO₂ 높음', message: '환기가 필요합니다.', condition: { entity: 'sensor.co2', above: 300 }, dismissible: false, action: { label: '환기팬', service: 'fan.turn_on' } }],
    ['', { type: 'custom:silk-breadcrumb-card', items: [{ label: '홈', path: '/lovelace/home' }, { label: '시스템', path: '/lovelace/system' }, { label: '홈랩' }] }],
    ['', { type: 'custom:silk-breadcrumb-card', auto: true, name: '현재 위치' }],
    ['h2x', { type: 'custom:silk-footer-card', align: 'center', show_updated: true, watch_entity: ['sensor.living_temp', 'sensor.house_power'], text: 'Silk · 191 cards · mock data', links: [
      { label: 'GitHub', url: 'https://github.com/LeeHueeng/silk-card', icon: 'mdi:earth' },
      { label: '문서', path: '/lovelace/docs', icon: 'mdi:clipboard-list-outline' },
      { label: '설정', path: '/config/dashboard', icon: 'mdi:cog' },
    ] }],
    ['', { type: 'custom:silk-footer-card', align: 'left', text: '© 2026 hueeng.com' }],
    ['', { type: 'custom:silk-spacer-card', height: 40, line: true }],
    ['', { type: 'custom:silk-spacer-card', height: 24 }],
  ]],
];
