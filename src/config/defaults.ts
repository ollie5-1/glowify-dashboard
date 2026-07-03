import type { GlowifyStrategyOptions } from "../types/options";

/**
 * Standaardwaarden voor de strategie-opties. De gebruiker zijn opties
 * worden hier met deepmerge overheen gelegd (zelfde patroon als de
 * mushroom-strategy referentie).
 */
export const ConfigurationDefaults: GlowifyStrategyOptions = {
  title: "Glowify",
  light_group_prefix: "verlichting_",
  extra_chips: [],
  rooms: {},
  floors: {},
  manual_floors: [],
  hidden_areas: [],
};
