import { GlowifyRegistry } from "../registry";
import type { RoomModel } from "./floorModel";
import type { EntityRegistryEntry } from "../types/homeassistant";

/** De entiteiten die een kamerbalk aanstuurt. */
export interface RoomEntities {
  /** Lichtgroep-entiteit (light.<prefix><area>) als ze bestaat. */
  lightGroup?: string;
  /** Eerste zonwering in de kamer. */
  cover?: string;
  /** Eerste ventilator in de kamer. */
  fan?: string;
  /** Bewegings-/aanwezigheidssensor (device_class motion/occupancy/presence). */
  motion?: string;
  /** Sloten in de kamer (specials, kleurtaal groen/rood). */
  locks: string[];
  /** Status-sensor voor de balk: temperatuur, met terugval op vocht. */
  statusSensor?: string;
}

const MOTION_CLASSES = new Set(["motion", "occupancy", "presence"]);

/** Bestaat de entiteit als state in hass? */
function stateExists(reg: GlowifyRegistry, entityId: string): boolean {
  return Boolean(reg.hass.states[entityId]);
}

/** Zichtbaar = niet verborgen/uitgeschakeld en niet met label 'verberg'. */
function isVisible(reg: GlowifyRegistry, entity: EntityRegistryEntry): boolean {
  return !reg.isHiddenOrDisabled(entity) && !reg.hasVerbergLabel(entity);
}

/**
 * Bepaalt welke entiteiten de kamerbalk van deze kamer aanstuurt.
 *
 * De lichtgroep volgt de naamconventie `light.<prefix><area_id>` (default
 * prefix `verlichting_`), tenzij overschreven in de opties. Zonwering,
 * ventilator, beweging en sloten worden uit de area-entiteiten afgeleid.
 */
export function detectRoomEntities(
  reg: GlowifyRegistry,
  room: RoomModel,
): RoomEntities {
  const result: RoomEntities = { locks: [] };
  const prefix = reg.options.light_group_prefix ?? "verlichting_";

  // Lichtgroep via conventie of override.
  const lightOverride = room.options.light_group;
  const conventionLight = `light.${prefix}${room.areaId}`;
  if (lightOverride && stateExists(reg, lightOverride)) {
    result.lightGroup = lightOverride;
  } else if (stateExists(reg, conventionLight)) {
    result.lightGroup = conventionLight;
  }

  // Status-sensor override.
  if (room.options.temperature_sensor && stateExists(reg, room.options.temperature_sensor)) {
    result.statusSensor = room.options.temperature_sensor;
  }

  let humidityFallback: string | undefined;

  for (const entity of reg.entitiesInArea(room.areaId)) {
    if (!isVisible(reg, entity)) continue;
    const domain = GlowifyRegistry.domainOf(entity.entity_id);
    const dc = reg.deviceClassOf(entity);

    switch (domain) {
      case "cover":
        if (!result.cover) result.cover = entity.entity_id;
        break;
      case "fan":
        if (!result.fan) result.fan = entity.entity_id;
        break;
      case "lock":
        result.locks.push(entity.entity_id);
        break;
      case "binary_sensor":
        if (!result.motion && dc && MOTION_CLASSES.has(dc)) {
          result.motion = entity.entity_id;
        }
        break;
      case "sensor":
        if (!result.statusSensor && dc === "temperature") {
          result.statusSensor = entity.entity_id;
        } else if (!humidityFallback && dc === "humidity") {
          humidityFallback = entity.entity_id;
        }
        break;
    }
  }

  // Terugval op luchtvochtigheid wanneer er geen temperatuursensor is.
  if (!result.statusSensor && humidityFallback) {
    result.statusSensor = humidityFallback;
  }

  return result;
}
