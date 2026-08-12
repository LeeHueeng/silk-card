import { HassEntity } from '../types';
import { domainOf } from './service';

/**
 * One accent per card, derived from what the device *is* — never a rainbow.
 * Theme variables win when the theme defines them; fallbacks are Silk's own
 * restrained palette (muted, similar lightness, no neon).
 */
const DOMAIN_ACCENTS: Record<string, string> = {
  light: 'var(--state-light-active-color, #e6a23c)',
  switch: 'var(--state-switch-active-color, #4aa8ff)',
  input_boolean: 'var(--state-switch-active-color, #4aa8ff)',
  fan: 'var(--state-fan-active-color, #35b5b1)',
  cover: 'var(--state-cover-active-color, #9d7ee8)',
  climate: 'var(--state-climate-auto-color, #57ad60)',
  media_player: 'var(--state-media_player-active-color, #6c8dd6)',
  lock: 'var(--state-lock-locked-color, #57ad60)',
  vacuum: 'var(--state-vacuum-active-color, #35b5b1)',
  humidifier: 'var(--state-humidifier-on-color, #4aa8ff)',
  scene: 'var(--primary-color, #4aa8ff)',
  script: 'var(--primary-color, #4aa8ff)',
  button: 'var(--primary-color, #4aa8ff)',
  input_button: 'var(--primary-color, #4aa8ff)',
  person: 'var(--state-person-home-color, #57ad60)',
  device_tracker: 'var(--state-person-home-color, #57ad60)',
  binary_sensor: 'var(--primary-color, #4aa8ff)',
  sensor: 'var(--primary-color, #4aa8ff)',
};

const CLIMATE_MODE_ACCENTS: Record<string, string> = {
  heat: 'var(--state-climate-heat-color, #e8734f)',
  cool: 'var(--state-climate-cool-color, #4aa8ff)',
  heat_cool: 'var(--state-climate-auto-color, #57ad60)',
  auto: 'var(--state-climate-auto-color, #57ad60)',
  dry: 'var(--state-climate-dry-color, #e6a23c)',
  fan_only: 'var(--state-climate-fan-only-color, #35b5b1)',
};

/** Accent color for an entity, sensitive to climate mode and lock state. */
export function accentFor(stateObj: HassEntity | undefined, override?: string): string {
  if (override) return override;
  if (!stateObj) return 'var(--primary-color, #4aa8ff)';
  const domain = domainOf(stateObj.entity_id);
  if (domain === 'climate' && CLIMATE_MODE_ACCENTS[stateObj.state]) {
    return CLIMATE_MODE_ACCENTS[stateObj.state];
  }
  if (domain === 'lock' && stateObj.state !== 'locked') {
    return 'var(--state-lock-unlocked-color, #e8734f)';
  }
  return DOMAIN_ACCENTS[domain] ?? 'var(--primary-color, #4aa8ff)';
}
