/**
 * Het optieschema van de Glowify-strategie.
 * Bewust klein en doordacht (eis 5c): kamer verbergen, volgorde,
 * extra sub-knopje per kamer, extra chips. Plus de plusknop-editor
 * en opruimmodus schrijven hier hun toevoegingen naartoe (Fase 4).
 */

import type { LovelaceCardConfig } from "./homeassistant";

/** Een tap/hold-actie zoals Lovelace ze kent. */
export interface GlowifyAction {
  action: string;
  [key: string]: unknown;
}

/** Een extra sub-knopje op een kamerbalk (special). */
export interface ExtraSubButton {
  entity?: string;
  icon?: string;
  /** Kleur volgens de kleurtaal wanneer actief (bv. "purple"). */
  color_when_active?: string;
  tap_action?: GlowifyAction;
}

/** Een extra chip in de chips-rij bovenaan de Thuis-view. */
export interface ExtraChip {
  icon?: string;
  icon_color?: string;
  content?: string;
  tap_action?: GlowifyAction;
  /** Vrije doorvoer voor door de plusknop-editor gegenereerde velden. */
  [key: string]: unknown;
}

/** Per-kamer overrides. */
export interface RoomOptions {
  /** Verberg deze kamer volledig uit de Thuis-view en pop-ups. */
  hidden?: boolean;
  /** Handmatige volgorde binnen de verdieping (lager = eerder). */
  order?: number;
  /** Overschrijf het icoon van de kamerbalk. */
  icon?: string;
  /** Overschrijf de weergavenaam. */
  name?: string;
  /** Overschrijf de lichtgroep-entiteit (anders afgeleid via conventie). */
  light_group?: string;
  /** Overschrijf de status-sensor (temperatuur; anders auto). */
  temperature_sensor?: string;
  /** Extra sub-knopjes (specials), links van de vaste trio. */
  extra_sub_buttons?: ExtraSubButton[];
  /** Vrije extra kaarten onderaan de pop-up van deze kamer. */
  extra_popup_cards?: LovelaceCardConfig[];
}

/** Per-verdieping overrides. */
export interface FloorOptions {
  hidden?: boolean;
  order?: number;
  name?: string;
  icon?: string;
  /** Overschrijf het verdiepingsniveau (bepaalt de volgorde). */
  level?: number;
}

/**
 * Handmatige verdiepingsindeling voor installaties zónder HA-floors.
 * Elke sleutel is een verdiepingslabel; de waarde de lijst area_id's.
 */
export interface ManualFloor {
  name: string;
  icon?: string;
  level?: number;
  areas: string[];
}

export interface GlowifyStrategyOptions {
  /** Titel van het dashboard / de Thuis-view. */
  title?: string;
  /** Naamconventie-prefix voor lichtgroepen (default "verlichting_"). */
  light_group_prefix?: string;
  /** Extra chips in de chips-rij (plus wat de plusknop-editor toevoegt). */
  extra_chips?: ExtraChip[];
  /** Per-kamer instellingen, gesleuteld op area_id. */
  rooms?: Record<string, RoomOptions>;
  /** Per-verdieping instellingen, gesleuteld op floor_id of manueel label. */
  floors?: Record<string, FloorOptions>;
  /**
   * Handmatige verdiepingsindeling wanneer HA geen floors kent.
   * Aanwezig → deze indeling wint van de HA-floors.
   */
  manual_floors?: ManualFloor[];
  /** area_id's die volledig verborgen moeten blijven. */
  hidden_areas?: string[];
  /** Toon het plus-chip in de chips-rij (plusknop-editor). Default true. */
  show_plus_chip?: boolean;
  /** Toon het opruim-chip in de chips-rij (opruimmodus). Default true. */
  show_cleanup_chip?: boolean;
  /** Toon een plusknopje op elke kamerbalk. Default true. */
  plus_on_bars?: boolean;
  /**
   * Debugmodus: logt bij het genereren per kamer de volledige kamerbalk-config
   * (sub_button + styles) en de gelezen opties naar de browserconsole.
   */
  debug?: boolean;
}
