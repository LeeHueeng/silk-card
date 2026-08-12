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

const VERSION = '0.2.0';

const CARDS = [GRAPH, TOGGLE, LIGHT, TILE, GAUGE, CLIMATE, COVER, FAN, BUTTON, MEDIA, ROOM];

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
