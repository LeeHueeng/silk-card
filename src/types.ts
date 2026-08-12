export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  entities?: Record<string, { display_precision?: number }>;
  locale?: { language: string };
  language?: string;
  callWS<T>(msg: Record<string, unknown>): Promise<T>;
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>
  ): Promise<unknown>;
  formatEntityState?(stateObj: HassEntity): string;
}

export interface LovelaceCardConfig {
  type: string;
  [key: string]: any;
}

export interface SeriesUserConfig {
  entity: string;
  name?: string;
  color?: string;
}

export interface SilkCardConfig extends LovelaceCardConfig {
  entity?: string;
  entities?: (string | SeriesUserConfig)[];
  name?: string;
  icon?: string;
  hours_to_show?: number;
  ranges?: string[];
  points?: number;
  line_width?: number;
  fill?: boolean;
  extremes?: boolean;
  range_selector?: boolean;
  delta?: boolean;
  color?: string;
  unit?: string;
  y_min?: number;
  y_max?: number;
}

export interface SeriesConfig {
  entity: string;
  name?: string;
  color: string;
}

/** A raw history sample. `v` is NaN across unavailable/unknown gaps. */
export interface Point {
  t: number; // unix seconds
  v: number;
}
