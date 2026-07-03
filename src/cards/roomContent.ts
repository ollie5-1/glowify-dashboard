import { GlowifyRegistry } from "../registry";
import type { RoomModel } from "../model/floorModel";
import { isWerkregel } from "../rommelfilter";
import type { LovelaceCardConfig } from "../types/homeassistant";

/**
 * De domeinvolgorde en titeltjes van een kamer-pop-up, exact zoals in het
 * referentiebestand: camera bovenaan, dan de bedienbare domeinen.
 */
const DOMAIN_GROUPS: { domain: string; title: string }[] = [
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
 * Bouwt de inhoud van een kamer-pop-up: per domein een titelkaartje gevolgd
 * door één kaart per entiteit, op maat van het domein. Native gegenereerd,
 * dus zonder auto-entities.
 *
 * Ingebouwde rommelfilter:
 *  - werkregelpatronen (network_indicator, child_lock, …) eruit;
 *  - de lichtgroep zelf (naamconventie-prefix) eruit — die zit al op de balk;
 *  - schakelaars van apparaten die óók een camera hebben zijn instellingen
 *    en worden overgeslagen;
 *  - entiteiten met het label "verberg" en verborgen/uitgeschakelde
 *    entiteiten blijven overal weg.
 */
export function buildRoomContent(
  reg: GlowifyRegistry,
  room: RoomModel,
): LovelaceCardConfig[] {
  const prefix = reg.options.light_group_prefix ?? "verlichting_";
  const areaEntities = [...reg.entitiesInArea(room.areaId)].sort((a, b) =>
    a.entity_id.localeCompare(b.entity_id),
  );

  const cards: LovelaceCardConfig[] = [];

  for (const group of DOMAIN_GROUPS) {
    const matches = areaEntities.filter((e) => {
      if (GlowifyRegistry.domainOf(e.entity_id) !== group.domain) return false;
      if (e.entity_id.includes(prefix)) return false; // lichtgroep e.d.
      if (isWerkregel(e.entity_id)) return false;
      if (reg.isHiddenOrDisabled(e)) return false;
      if (reg.hasVerbergLabel(e)) return false;
      if (group.domain === "switch" && reg.deviceHasCamera(e)) return false;
      return true;
    });

    if (matches.length === 0) continue;

    cards.push({ type: "custom:mushroom-title-card", subtitle: group.title });
    for (const entity of matches) {
      cards.push(buildEntityCard(reg, group.domain, entity.entity_id));
    }
  }

  return cards;
}

/** Bouwt de juiste kaart voor één entiteit binnen een domein. */
function buildEntityCard(
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
      return {
        type: "tile",
        entity: entityId,
        features: lightFeatures(reg, entityId),
      };
    case "cover":
      return {
        type: "custom:mushroom-cover-card",
        entity: entityId,
        show_buttons_control: true,
      };
    case "fan":
      return { type: "custom:mushroom-fan-card", entity: entityId };
    case "lock":
      return { type: "custom:mushroom-lock-card", entity: entityId };
    case "switch":
      return {
        type: "custom:mushroom-entity-card",
        entity: entityId,
        tap_action: { action: "toggle" },
      };
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
 * alleen als de lamp dat ondersteunt, en kleur-favorieten alleen bij een
 * echte kleurmodus.
 */
function lightFeatures(reg: GlowifyRegistry, entityId: string): LovelaceCardConfig[] {
  const modes = (reg.hass.states[entityId]?.attributes?.supported_color_modes ?? []) as string[];
  const features: LovelaceCardConfig[] = [{ type: "light-brightness" }];
  if (modes.includes("color_temp")) features.push({ type: "light-color-temp" });
  if (modes.some((m) => COLOR_MODES.has(m))) features.push({ type: "light-color-favorites" });
  return features;
}
