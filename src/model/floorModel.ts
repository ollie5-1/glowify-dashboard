import { GlowifyRegistry, UNDISCLOSED } from "../registry";
import type { AreaRegistryEntry } from "../types/homeassistant";
import type { FloorOptions, RoomOptions } from "../types/options";

/** Een kamer zoals de views ze gebruiken. */
export interface RoomModel {
  areaId: string;
  name: string;
  icon: string | null;
  order: number;
  options: RoomOptions;
  area: AreaRegistryEntry;
}

/** Een verdiepingsblok met zijn kamers, in weergavevolgorde. */
export interface FloorModel {
  key: string;
  name: string;
  icon: string;
  level: number;
  rooms: RoomModel[];
}

/** Standaard-verdiepingsiconen per niveau. */
function defaultFloorIcon(level: number): string {
  if (level < 0) return "mdi:home-floor-negative-1";
  if (level === 0) return "mdi:home-floor-0";
  if (level === 1) return "mdi:home-floor-1";
  if (level === 2) return "mdi:home-floor-2";
  if (level === 3) return "mdi:home-floor-3";
  return "mdi:home-floor-a";
}

/** Areas die de strategie altijd negeert (systeem/hulp-areas). */
const ALTIJD_VERBORGEN = new Set([UNDISCLOSED]);

/**
 * Bepaalt of een area getoond moet worden op de Thuis-view.
 */
function isAreaHidden(reg: GlowifyRegistry, area: AreaRegistryEntry): boolean {
  if (ALTIJD_VERBORGEN.has(area.area_id)) return true;
  if (reg.isAreaInHiddenList(area)) return true;
  return Boolean(reg.roomOptionsFor(area).hidden);
}

/** Bouwt een RoomModel uit een area + opties (robuust geresolveerd). */
function buildRoom(reg: GlowifyRegistry, area: AreaRegistryEntry, index: number): RoomModel {
  const opts = reg.roomOptionsFor(area);
  return {
    areaId: area.area_id,
    name: opts.name ?? area.name,
    icon: opts.icon ?? area.icon,
    order: opts.order ?? index,
    options: opts,
    area,
  };
}

function sortRooms(a: RoomModel, b: RoomModel): number {
  if (a.order !== b.order) return a.order - b.order;
  return a.name.localeCompare(b.name, "nl");
}

/**
 * Groepeert alle zichtbare areas in verdiepingsblokken.
 *
 * Bronvolgorde van waarheid:
 *  1. `manual_floors` in de opties (installaties zonder HA-floors);
 *  2. anders de HA floor_registry (area.floor_id → floor);
 *  3. areas zonder floor komen in een "Overige"-blok.
 */
export function buildFloorModel(reg: GlowifyRegistry): FloorModel[] {
  const manual = reg.options.manual_floors ?? [];
  if (manual.length > 0) {
    return buildFromManual(reg, manual);
  }
  return buildFromRegistry(reg);
}

function buildFromManual(
  reg: GlowifyRegistry,
  manual: NonNullable<GlowifyRegistry["options"]["manual_floors"]>,
): FloorModel[] {
  const floors: FloorModel[] = [];
  manual.forEach((mf, mfIndex) => {
    const rooms: RoomModel[] = [];
    mf.areas.forEach((areaId, i) => {
      const area = reg.getArea(areaId);
      if (!area || isAreaHidden(reg, area)) return;
      rooms.push(buildRoom(reg, area, i));
    });
    if (rooms.length === 0) return;
    rooms.sort(sortRooms);
    const level = mf.level ?? mfIndex;
    floors.push({
      key: `manual-${mfIndex}`,
      name: mf.name,
      icon: mf.icon ?? defaultFloorIcon(level),
      level,
      rooms,
    });
  });
  return floors;
}

function buildFromRegistry(reg: GlowifyRegistry): FloorModel[] {
  const byFloor = new Map<string, RoomModel[]>();
  const ungrouped: RoomModel[] = [];

  reg.areas.forEach((area, i) => {
    if (isAreaHidden(reg, area)) return;
    const room = buildRoom(reg, area, i);
    if (area.floor_id) {
      const list = byFloor.get(area.floor_id);
      if (list) list.push(room);
      else byFloor.set(area.floor_id, [room]);
    } else {
      ungrouped.push(room);
    }
  });

  const floors: FloorModel[] = [];
  for (const [floorId, rooms] of byFloor) {
    const floor = reg.getFloor(floorId);
    const floorOpts: FloorOptions = reg.options.floors?.[floorId] ?? {};
    if (floorOpts.hidden) continue;
    const level = floorOpts.level ?? floor?.level ?? 0;
    rooms.sort(sortRooms);
    floors.push({
      key: floorId,
      name: floorOpts.name ?? floor?.name ?? "Verdieping",
      icon: floorOpts.icon ?? floor?.icon ?? defaultFloorIcon(level),
      level,
      rooms,
    });
  }

  floors.sort((a, b) => a.level - b.level);

  if (ungrouped.length > 0) {
    ungrouped.sort(sortRooms);
    floors.push({
      key: "overige",
      name: floors.length > 0 ? "Overige" : "Woning",
      icon: "mdi:home",
      level: 999,
      rooms: ungrouped,
    });
  }

  return floors;
}
