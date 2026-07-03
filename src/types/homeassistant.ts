/**
 * Minimale Home Assistant-types die de strategie nodig heeft.
 * Bewust lokaal gedefinieerd om geen zware runtime-afhankelijkheid
 * (custom-card-helpers) mee te bundelen.
 */

import type { GlowifyStrategyOptions } from "./options";

export interface HassEntityAttributes {
  friendly_name?: string;
  device_class?: string;
  supported_color_modes?: string[];
  rgb_color?: [number, number, number];
  unit_of_measurement?: string;
  [key: string]: unknown;
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: HassEntityAttributes;
  last_changed?: string;
  last_updated?: string;
}

export type HassEntities = Record<string, HassEntity>;

/** Entry uit `config/area_registry/list`. */
export interface AreaRegistryEntry {
  area_id: string;
  name: string;
  floor_id: string | null;
  icon: string | null;
  picture: string | null;
  labels: string[];
  aliases: string[];
}

/** Entry uit `config/floor_registry/list`. */
export interface FloorRegistryEntry {
  floor_id: string;
  name: string;
  level: number | null;
  icon: string | null;
  aliases: string[];
}

/** Entry uit `config/device_registry/list`. */
export interface DeviceRegistryEntry {
  id: string;
  area_id: string | null;
  name: string | null;
  name_by_user: string | null;
  labels: string[];
  manufacturer: string | null;
  model: string | null;
}

/** Entry uit `config/entity_registry/list`. */
export interface EntityRegistryEntry {
  entity_id: string;
  area_id: string | null;
  device_id: string | null;
  labels: string[];
  platform: string | null;
  name: string | null;
  original_name: string | null;
  device_class: string | null;
  original_device_class: string | null;
  hidden_by: string | null;
  disabled_by: string | null;
  entity_category: string | null;
  has_entity_name: boolean;
}

/** Entry uit `config/label_registry/list`. */
export interface LabelRegistryEntry {
  label_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  description: string | null;
}

/** Het deel van het HA-object dat de strategie gebruikt. */
export interface HomeAssistant {
  states: HassEntities;
  callWS<T>(msg: Record<string, unknown>): Promise<T>;
  language?: string;
  user?: { is_admin?: boolean };
}

/** Een Lovelace-kaartconfig; bewust losjes getypeerd. */
export type LovelaceCardConfig = {
  type: string;
  [key: string]: unknown;
};

export interface LovelaceBadgeConfig {
  type?: string;
  [key: string]: unknown;
}

export interface LovelaceViewConfig {
  title?: string;
  path?: string;
  icon?: string;
  subview?: boolean;
  badges?: LovelaceBadgeConfig[];
  cards?: LovelaceCardConfig[];
  strategy?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface LovelaceConfig {
  title?: string;
  views: LovelaceViewConfig[];
}

/** Info-object dat HA aan de legacy generate-methoden meegeeft. */
export interface DashboardStrategyInfo {
  config: {
    strategy?: {
      type?: string;
      options?: GlowifyStrategyOptions;
    };
    [key: string]: unknown;
  };
  hass: HomeAssistant;
}
