import './shared/slider';
import { META as GRAPH } from './cards/graph';
import { META as TOGGLE } from './cards/toggle';
import { META as LIGHT } from './cards/light';
import { META as TILE } from './cards/tile';
import { META as GAUGE } from './cards/gauge';
import { META as CLIMATE } from './cards/climate';
import { META as COVER } from './cards/cover';
import { META as FAN } from './cards/fan';
import { META as BUTTON } from './cards/action';
import { META as MEDIA } from './cards/media';
import { META as ROOM } from './cards/room';
import { META as ROCKER } from './cards/rocker';
import { META as PUSH } from './cards/push';
import { META as KNOB } from './cards/knob';
import { META as FADER } from './cards/fader';
import { META as WEATHER } from './cards/weather';
import { META as PERSON } from './cards/person';
import { META as LOCK } from './cards/lock';
import { META as ALARM } from './cards/alarm';
import { META as VACUUM } from './cards/vacuum';
import { META as CAMERA } from './cards/camera';
import { META as TIMER } from './cards/timer';
import { META as PROGRESS } from './cards/progress';
import { META as UPDATE } from './cards/update';
import { META as BATTERY } from './cards/battery';
import { META as STATUS } from './cards/status';
import { META as CHIPS } from './cards/chips';
import { META as BAR } from './cards/bar';
import { META as RING } from './cards/ring';
import { META as ENERGY } from './cards/energy';
import { META as TODO } from './cards/todo';

const VERSION = '0.3.0';

const CARDS = [
  GRAPH, TOGGLE, LIGHT, TILE, GAUGE, CLIMATE, COVER, FAN, BUTTON, MEDIA, ROOM,
  ROCKER, PUSH, KNOB, FADER, WEATHER, PERSON, LOCK, ALARM, VACUUM, CAMERA,
  TIMER, PROGRESS, UPDATE, BATTERY, STATUS, CHIPS, BAR, RING, ENERGY, TODO,
];

declare global {
  interface Window {
    customCards?: unknown[];
  }
}

window.customCards = window.customCards || [];
for (const card of CARDS) {
  window.customCards.push({
    ...card,
    preview: true,
    documentationURL: 'https://github.com/LeeHueeng/silk-card',
  });
}

console.info(
  `%c SILK %c v${VERSION} · ${CARDS.length} cards `,
  'background:#4aa8ff;color:#fff;border-radius:4px 0 0 4px;padding:2px 0 2px 4px;font-weight:700',
  'background:#333;color:#fff;border-radius:0 4px 4px 0;padding:2px 4px 2px 0'
);
