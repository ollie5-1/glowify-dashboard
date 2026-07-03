import { GlowifyRegistry } from "../registry";
import { isWerkregel } from "../rommelfilter";
import type { EntityRegistryEntry, LovelaceCardConfig } from "../types/homeassistant";

/**
 * Gedeelde domein-logica voor de kamer-pop-ups, subviews én de domein-views:
 * dezelfde filters (rommelfilter, camera-schakelaar-regel, label verberg, geen
 * groepsentiteiten) en dezelfde kaarten per domein, zodat alles er identiek
 * uitziet en meekleurt met de kleurtaal.
 */

/** De domeinvolgorde en titeltjes van een kamer-pop-up. */
export const DOMAIN_GROUPS: { domain: string; title: string }[] = [
  { domain: "camera", title: "Camera" },
  { domain: "light", title: "Verlichting" },
  { domain: "cover", title: "Zonwering" },
  { domain: "fan", title: "Ventilatie" },
  { domain: "switch", title: "Schakelaars" },
  { domain: "lock", title: "Sloten" },
  { domain: "climate", title: "Verwarming" },
  { domain: "media_player", title: "Media" },
];

const COLOR_MODES = new Set(["hs", "rgb", "rgbw", "rgbww", "xy"]);

/**
 * Filtert de entiteiten van één domein in een area met de volledige
 * rommelfilter: geen groepsentiteiten (naamconventie-prefix), geen
 * werkregelpatronen, geen verborgen/uitgeschakelde entiteiten, geen label
 * "verberg", en schakelaars van camera-apparaten overgeslagen. Gesorteerd
 * op entity_id voor een stabiele volgorde.
 */
export function filterDomainEntities(
  reg: GlowifyRegistry,
  areaId: string,
  domain: string,
): EntityRegistryEntry[] {
  const prefix = reg.options.light_group_prefix ?? "verlichting_";
  return [...reg.entitiesInArea(areaId)]
    .filter((e) => {
      if (GlowifyRegistry.domainOf(e.entity_id) !== domain) return false;
      if (e.entity_id.includes(prefix)) return false; // groepsentiteit
      if (isWerkregel(e.entity_id)) return false;
      if (reg.isHiddenOrDisabled(e)) return false;
      if (reg.hasVerbergLabel(e)) return false;
      if (domain === "switch" && reg.deviceHasCamera(e)) return false;
      return true;
    })
    .sort((a, b) => a.entity_id.localeCompare(b.entity_id));
}

/** Bouwt de juiste kaart voor één entiteit binnen een domein. */
export function buildEntityCard(
  reg: GlowifyRegistry,
  domain: string,
  entityId: string,
): LovelaceCardConfig {
  switch (domain) {
    case "camera":
      return {
        type: "picture-entity",
        entity: entityId,
        camera_view: "live",
        show_name: false,
        show_state: false,
      };
    case "light":
      return { type: "tile", entity: entityId, features: lightFeatures(reg, entityId) };
    case "cover":
      return { type: "custom:mushroom-cover-card", entity: entityId, show_buttons_control: true };
    case "fan":
      return { type: "custom:mushroom-fan-card", entity: entityId };
    case "lock":
      return { type: "custom:mushroom-lock-card", entity: entityId };
    case "switch":
      return { type: "custom:mushroom-entity-card", entity: entityId, tap_action: { action: "toggle" } };
    case "climate":
      return { type: "custom:mushroom-climate-card", entity: entityId };
    case "media_player":
      return { type: "custom:mushroom-media-player-card", entity: entityId };
    default:
      return { type: "custom:mushroom-entity-card", entity: entityId };
  }
}

/**
 * Tile-features op maat van wat de lamp kan: altijd helderheid, kleurtemp
 * alleen als de lamp dat ondersteunt, kleur-favorieten alleen bij een echte
 * kleurmodus.
 */
export function lightFeatures(reg: GlowifyRegistry, entityId: string): LovelaceCardConfig[] {
  const modes = (reg.hass.states[entityId]?.attributes?.supported_color_modes ?? []) as string[];
  const features: LovelaceCardConfig[] = [{ type: "light-brightness" }];
  if (modes.includes("color_temp")) features.push({ type: "light-color-temp" });
  if (modes.some((m) => COLOR_MODES.has(m))) features.push({ type: "light-color-favorites" });
  return features;
}
