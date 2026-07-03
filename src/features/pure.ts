import type { ExtraChip, ExtraSubButton, GlowifyStrategyOptions } from "../types/options";

/**
 * Pure, testbare mutaties op de strategie-opties en op label-lijsten.
 * De browser-only kant (WS-calls, DOM-dialoog) leeft in de andere
 * features-bestanden en leunt op deze functies.
 */

/** Voegt een chip toe aan de chips-rij (plusknop-editor, modus 'chip'). */
export function addExtraChip(
  options: GlowifyStrategyOptions,
  chip: ExtraChip,
): GlowifyStrategyOptions {
  return {
    ...options,
    extra_chips: [...(options.extra_chips ?? []), chip],
  };
}

/**
 * Voegt een extra sub-knopje toe aan een specifieke kamer
 * (plusknop-editor, modus 'sub_button').
 */
export function addExtraSubButton(
  options: GlowifyStrategyOptions,
  areaId: string,
  sub: ExtraSubButton,
): GlowifyStrategyOptions {
  const rooms = { ...(options.rooms ?? {}) };
  const room = { ...(rooms[areaId] ?? {}) };
  room.extra_sub_buttons = [...(room.extra_sub_buttons ?? []), sub];
  rooms[areaId] = room;
  return { ...options, rooms };
}

/**
 * Berekent de nieuwe labels-lijst van een entiteit voor de opruimmodus:
 * verberg toevoegen (hidden = true) of verwijderen (hidden = false).
 */
export function toggleVerbergLabel(
  currentLabels: string[],
  verbergLabelId: string,
  hidden: boolean,
): string[] {
  const without = currentLabels.filter((l) => l !== verbergLabelId);
  return hidden ? [...without, verbergLabelId] : without;
}
