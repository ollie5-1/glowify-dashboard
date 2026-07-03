import deepmerge from "deepmerge";
import { ConfigurationDefaults } from "./config/defaults";
import { VERBERG_LABEL } from "./rommelfilter";
import type {
  AreaRegistryEntry,
  DeviceRegistryEntry,
  EntityRegistryEntry,
  FloorRegistryEntry,
  HomeAssistant,
  LabelRegistryEntry,
} from "./types/homeassistant";
import type { GlowifyStrategyOptions, RoomOptions } from "./types/options";

/** area_id-fallback voor entiteiten zonder area. */
export const UNDISCLOSED = "undisclosed";

/**
 * Slugt een naam op dezelfde manier als HA area-id's opbouwt: kleine letters,
 * spaties en vreemde tekens naar underscores. "Woonkamer" → "woonkamer".
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Leest de HA-registries (areas, floors, devices, entities, labels) en
 * biedt de afgeleide lookups die alle views/kaarten nodig hebben.
 *
 * Één instantie per generate()-aanroep; geen globale state, zodat
 * meerdere dashboards en herbouwen elkaar niet in de weg zitten.
 */
export class GlowifyRegistry {
  readonly hass: HomeAssistant;
  readonly options: GlowifyStrategyOptions;

  areas: AreaRegistryEntry[] = [];
  floors: FloorRegistryEntry[] = [];
  devices: DeviceRegistryEntry[] = [];
  entities: EntityRegistryEntry[] = [];
  labels: LabelRegistryEntry[] = [];

  private areaById = new Map<string, AreaRegistryEntry>();
  private floorById = new Map<string, FloorRegistryEntry>();
  private deviceById = new Map<string, DeviceRegistryEntry>();
  private entityById = new Map<string, EntityRegistryEntry>();
  private entitiesByArea = new Map<string, EntityRegistryEntry[]>();
  private verbergLabelId: string | null = null;

  private constructor(hass: HomeAssistant, options: GlowifyStrategyOptions) {
    this.hass = hass;
    this.options = options;
  }

  /** Fabrieksmethode: leest de opties, haalt de registries op en indexeert. */
  static async create(
    hass: HomeAssistant,
    rawOptions: GlowifyStrategyOptions | undefined,
  ): Promise<GlowifyRegistry> {
    const options = deepmerge(
      ConfigurationDefaults,
      rawOptions ?? {},
    ) as GlowifyStrategyOptions;
    const registry = new GlowifyRegistry(hass, options);
    await registry.fetch();
    registry.index();
    return registry;
  }

  private async fetch(): Promise<void> {
    const [areas, floors, devices, entities, labels] = await Promise.all([
      this.hass.callWS<AreaRegistryEntry[]>({ type: "config/area_registry/list" }),
      this.hass
        .callWS<FloorRegistryEntry[]>({ type: "config/floor_registry/list" })
        .catch(() => [] as FloorRegistryEntry[]),
      this.hass.callWS<DeviceRegistryEntry[]>({ type: "config/device_registry/list" }),
      this.hass.callWS<EntityRegistryEntry[]>({ type: "config/entity_registry/list" }),
      this.hass
        .callWS<LabelRegistryEntry[]>({ type: "config/label_registry/list" })
        .catch(() => [] as LabelRegistryEntry[]),
    ]);
    this.areas = areas ?? [];
    this.floors = floors ?? [];
    this.devices = devices ?? [];
    this.entities = entities ?? [];
    this.labels = labels ?? [];
  }

  private index(): void {
    for (const area of this.areas) this.areaById.set(area.area_id, area);
    for (const floor of this.floors) this.floorById.set(floor.floor_id, floor);
    for (const device of this.devices) this.deviceById.set(device.id, device);
    for (const entity of this.entities) this.entityById.set(entity.entity_id, entity);

    const verberg = this.labels.find(
      (l) => l.name.toLowerCase() === VERBERG_LABEL,
    );
    this.verbergLabelId = verberg ? verberg.label_id : null;

    for (const entity of this.entities) {
      const areaId = this.effectiveAreaId(entity);
      if (!areaId) continue;
      const list = this.entitiesByArea.get(areaId);
      if (list) list.push(entity);
      else this.entitiesByArea.set(areaId, [entity]);
    }
  }

  // --- Lookups ---------------------------------------------------------

  getArea(areaId: string): AreaRegistryEntry | undefined {
    return this.areaById.get(areaId);
  }

  getFloor(floorId: string | null | undefined): FloorRegistryEntry | undefined {
    return floorId ? this.floorById.get(floorId) : undefined;
  }

  getEntity(entityId: string): EntityRegistryEntry | undefined {
    return this.entityById.get(entityId);
  }

  /**
   * Resolveert de per-kamer opties robuust: eerst op area_id (zoals de
   * plusknop-editor wegschrijft), dan op de slug van de naam, dan op de naam
   * zelf. Zo matcht bv. `rooms.woonkamer` ook wanneer de echte area_id anders
   * is dan de naam-slug.
   */
  roomOptionsFor(area: AreaRegistryEntry): RoomOptions {
    const rooms = this.options.rooms ?? {};
    return rooms[area.area_id] ?? rooms[slugify(area.name)] ?? rooms[area.name] ?? {};
  }

  /** True wanneer de area in hidden_areas staat (via id, slug of naam). */
  isAreaInHiddenList(area: AreaRegistryEntry): boolean {
    const list = this.options.hidden_areas ?? [];
    if (list.length === 0) return false;
    return (
      list.includes(area.area_id) ||
      list.includes(slugify(area.name)) ||
      list.includes(area.name)
    );
  }

  /**
   * Effectieve area van een entiteit: de area op de entiteit zelf, of
   * anders die van het gekoppelde device. Zoals HA het intern bepaalt.
   */
  effectiveAreaId(entity: EntityRegistryEntry): string | null {
    if (entity.area_id) return entity.area_id;
    if (entity.device_id) {
      const device = this.deviceById.get(entity.device_id);
      if (device?.area_id) return device.area_id;
    }
    return null;
  }

  /** Alle registry-entiteiten in een area (via effectieve area). */
  entitiesInArea(areaId: string): EntityRegistryEntry[] {
    return this.entitiesByArea.get(areaId) ?? [];
  }

  /**
   * device_class van een entiteit: registry-override wint, dan de
   * originele device_class, dan de runtime state-attribute.
   */
  deviceClassOf(entity: EntityRegistryEntry): string | undefined {
    if (entity.device_class) return entity.device_class;
    if (entity.original_device_class) return entity.original_device_class;
    const state = this.hass.states[entity.entity_id];
    const dc = state?.attributes?.device_class;
    return typeof dc === "string" ? dc : undefined;
  }

  /** Domein van een entity_id (deel vóór de punt). */
  static domainOf(entityId: string): string {
    return entityId.split(".")[0];
  }

  /** True wanneer de entiteit het label "verberg" draagt. */
  hasVerbergLabel(entity: EntityRegistryEntry): boolean {
    if (!this.verbergLabelId) return false;
    return entity.labels.includes(this.verbergLabelId);
  }

  /** True wanneer de entiteit verborgen/uitgeschakeld is in HA. */
  isHiddenOrDisabled(entity: EntityRegistryEntry): boolean {
    return Boolean(entity.hidden_by) || Boolean(entity.disabled_by);
  }

  /**
   * True wanneer het device van deze entiteit óók een camera-entiteit
   * heeft. Zulke schakelaars zijn camera-instellingen en worden overgeslagen.
   */
  deviceHasCamera(entity: EntityRegistryEntry): boolean {
    if (!entity.device_id) return false;
    return this.entities.some(
      (e) =>
        e.device_id === entity.device_id &&
        GlowifyRegistry.domainOf(e.entity_id) === "camera",
    );
  }
}
