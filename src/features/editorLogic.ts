import type { ExtraChip, ExtraSubButton, GlowifyAction } from "../types/options";

/**
 * Pure logica achter de editor-dialoog: de Glowify-kleurkeuzes, de
 * actietypes, en het omzetten van de formuliergegevens naar een chip of
 * sub-knopje. Geen DOM — zo blijft dit testbaar (zie test/smoke.ts).
 */

export interface GlowifyColor {
  value: string;
  label: string;
  /** HA-kleurnaam voor icon_color van een chip. */
  haColor: string;
  /** rgb/var voor color_when_active van een sub-knopje. */
  rgb: string;
}

/** De vaste Glowify-kleuren volgens de kleurtaal. */
export const GLOWIFY_COLORS: GlowifyColor[] = [
  { value: "orange", label: "Oranje (comfort)", haColor: "orange", rgb: "var(--primary-color)" },
  { value: "purple", label: "Paars (stand)", haColor: "purple", rgb: "rgb(142, 47, 137)" },
  { value: "blue", label: "Blauw (lucht)", haColor: "blue", rgb: "rgb(76, 128, 201)" },
  { value: "green", label: "Groen (veilig)", haColor: "green", rgb: "rgb(46, 125, 50)" },
  { value: "red", label: "Rood (aandacht)", haColor: "red", rgb: "rgb(229, 57, 53)" },
  { value: "grey", label: "Grijs (neutraal)", haColor: "grey", rgb: "grey" },
];

export interface ActionType {
  value: string;
  label: string;
}

export const ACTION_TYPES: ActionType[] = [
  { value: "room_popup", label: "Kamer-pop-up openen" },
  { value: "toggle", label: "Toestel aan/uit" },
  { value: "script", label: "Script uitvoeren" },
  { value: "scene", label: "Scene activeren" },
  { value: "more_info", label: "Detailvenster (more-info)" },
  { value: "cover_open", label: "Zonwering openen" },
  { value: "cover_close", label: "Zonwering sluiten" },
  { value: "navigate", label: "Navigeren naar pad" },
  { value: "none", label: "Geen actie" },
];

/** De formuliergegevens uit de editor-dialoog. */
export interface EditorData {
  text?: string;
  icon?: string;
  color?: string;
  action_type?: string;
  /** area_id voor 'room_popup'. */
  room?: string;
  /** entity_id voor toggle/more-info/script/scene/cover. */
  entity?: string;
  /** vrij pad voor 'navigate'. */
  path?: string;
}

/** Welk doelveld hoort bij een actietype. */
export function targetFieldFor(actionType: string | undefined): "room" | "entity" | "path" | "none" {
  switch (actionType) {
    case "room_popup":
      return "room";
    case "toggle":
    case "more_info":
    case "script":
    case "scene":
    case "cover_open":
    case "cover_close":
      return "entity";
    case "navigate":
      return "path";
    default:
      return "none";
  }
}

/** Domeinfilter voor de entiteitenkiezer per actietype. */
export function entityDomainFor(actionType: string | undefined): string | undefined {
  switch (actionType) {
    case "script":
      return "script";
    case "scene":
      return "scene";
    case "cover_open":
    case "cover_close":
      return "cover";
    default:
      return undefined; // toggle/more-info: alle domeinen
  }
}

/** Bouwt de Lovelace-actie uit de formuliergegevens. */
export function buildAction(data: EditorData): GlowifyAction {
  const entity = data.entity ?? "";
  switch (data.action_type) {
    case "room_popup":
      return { action: "navigate", navigation_path: `#${data.room ?? ""}` };
    case "toggle":
      return { action: "toggle" };
    case "more_info":
      return { action: "more-info" };
    case "script":
      return { action: "call-service", service: entity };
    case "scene":
      return { action: "call-service", service: "scene.turn_on", target: { entity_id: entity } };
    case "cover_open":
      return { action: "call-service", service: "cover.open_cover", target: { entity_id: entity } };
    case "cover_close":
      return { action: "call-service", service: "cover.close_cover", target: { entity_id: entity } };
    case "navigate":
      return { action: "navigate", navigation_path: data.path ?? "" };
    default:
      return { action: "none" };
  }
}

/**
 * De entiteit die op het item zelf hoort (voor toggle en more-info hangt de
 * actie aan de entiteit van de chip/sub-knop).
 */
export function entityForItem(data: EditorData): string | undefined {
  if (data.action_type === "toggle" || data.action_type === "more_info") {
    return data.entity || undefined;
  }
  return undefined;
}

function colorOf(value: string | undefined): GlowifyColor {
  return GLOWIFY_COLORS.find((c) => c.value === value) ?? GLOWIFY_COLORS[0];
}

/** Bouwt een chip voor de chips-rij. */
export function buildChipItem(data: EditorData): ExtraChip {
  const color = colorOf(data.color);
  const chip: ExtraChip = {
    icon: data.icon || "mdi:star",
    icon_color: color.haColor,
    content: data.text ?? "",
    tap_action: buildAction(data),
  };
  const entity = entityForItem(data);
  if (entity) chip.entity = entity;
  return chip;
}

/** Bouwt een sub-knopje voor een kamerbalk. */
export function buildSubItem(data: EditorData): ExtraSubButton {
  const color = colorOf(data.color);
  const sub: ExtraSubButton = {
    icon: data.icon || "mdi:star",
    tap_action: buildAction(data),
    color_when_active: color.rgb,
  };
  const entity = entityForItem(data);
  if (entity) sub.entity = entity;
  return sub;
}
