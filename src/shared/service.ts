import { HassEntity, HomeAssistant } from '../types';

export function domainOf(entityId: string): string {
  return entityId.split('.')[0];
}

export function isUnavailable(stateObj?: HassEntity): boolean {
  return !stateObj || stateObj.state === 'unavailable' || stateObj.state === 'unknown';
}

/**
 * Mirrors HA frontend's stateActive() semantics (state_active.ts) so Silk
 * cards light up exactly when native cards would.
 */
export function isActive(stateObj?: HassEntity): boolean {
  if (!stateObj) return false;
  const state = stateObj.state;
  const domain = domainOf(stateObj.entity_id);
  if (domain === 'button' || domain === 'input_button' || domain === 'scene') {
    return state !== 'unavailable';
  }
  if (state === 'unavailable' || state === 'unknown') return false;
  if (state === 'off') return domain === 'alert';
  switch (domain) {
    case 'alarm_control_panel':
      return state !== 'disarmed';
    case 'alert':
      return state !== 'idle';
    case 'cover':
    case 'valve':
      return state !== 'closed';
    case 'device_tracker':
    case 'person':
      return state !== 'not_home';
    case 'lawn_mower':
      return state !== 'docked' && state !== 'paused';
    case 'lock':
      return state !== 'locked';
    case 'media_player':
      return state !== 'standby';
    case 'vacuum':
      return state !== 'idle' && state !== 'docked' && state !== 'paused';
    case 'plant':
      return state === 'problem';
    case 'timer':
      return state === 'active';
    case 'camera':
      return state === 'streaming' || state === 'recording';
    default:
      return true;
  }
}

const STATES_OFF = new Set(['closed', 'locked', 'off']);

/**
 * Mirrors HA's tap_action:toggle behavior (get_toggle_action.ts) — per-domain
 * special actions, never the literal `.toggle` service.
 */
export function toggleEntity(hass: HomeAssistant, entityId: string): Promise<unknown> {
  const domain = domainOf(entityId);
  const stateObj = hass.states[entityId];
  const turnOn = stateObj ? STATES_OFF.has(stateObj.state) : true;
  const data = { entity_id: entityId };
  switch (domain) {
    case 'button':
    case 'input_button':
      return hass.callService(domain, 'press', data);
    case 'lock':
      return hass.callService('lock', turnOn ? 'unlock' : 'lock', data);
    case 'cover':
      return hass.callService('cover', turnOn ? 'open_cover' : 'close_cover', data);
    case 'valve':
      return hass.callService('valve', turnOn ? 'open_valve' : 'close_valve', data);
    case 'scene':
      return hass.callService('scene', 'turn_on', data);
    case 'group':
      return hass.callService('homeassistant', turnOn ? 'turn_on' : 'turn_off', data);
    default:
      return hass.callService(domain, turnOn ? 'turn_on' : 'turn_off', data);
  }
}

/** Open the standard more-info dialog for an entity. */
export function moreInfo(node: HTMLElement, entityId: string): void {
  node.dispatchEvent(
    new CustomEvent('hass-more-info', { detail: { entityId }, bubbles: true, composed: true })
  );
}

/** Companion-app haptic feedback; bubbles composed up to the app listener. */
export function haptic(
  node: HTMLElement,
  type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'failure' = 'light'
): void {
  const ev = new Event('haptic', { bubbles: true, composed: true }) as Event & { detail: string };
  ev.detail = type;
  node.dispatchEvent(ev);
}

/** Localized state text when the hass object provides a formatter. */
export function stateText(hass: HomeAssistant | undefined, stateObj: HassEntity): string {
  if (hass?.formatEntityState) {
    try {
      return hass.formatEntityState(stateObj);
    } catch {
      /* fall through */
    }
  }
  return stateObj.state.replace(/_/g, ' ');
}

export function supportsFeature(stateObj: HassEntity, feature: number): boolean {
  return ((stateObj.attributes.supported_features ?? 0) & feature) !== 0;
}

export const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);
