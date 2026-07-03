import { editToggleAction } from "./editMode";
import type { GlowifyAction } from "../types/options";
import type { LovelaceCardConfig } from "../types/homeassistant";

/**
 * Opent een custom-element (plusknop-editor of opruimmodus) in een
 * browser_mod-pop-up. Gebruikt als tap_action op de editor-chips en de
 * plus-sub-knopjes.
 */
export function openCardPopupAction(
  title: string,
  card: LovelaceCardConfig,
): GlowifyAction {
  return {
    action: "fire-dom-event",
    browser_mod: {
      service: "browser_mod.popup",
      data: { title, content: card },
    },
  };
}

/**
 * Potlood-chip: subtiel grijs, tik zet de bewerkmodus aan/uit. Kleurt paars
 * wanneer de bewerkmodus actief is.
 */
export function buildPencilChip(editMode: boolean): LovelaceCardConfig {
  return {
    type: "template",
    icon: "mdi:pencil",
    icon_color: editMode ? "purple" : "grey",
    content: "",
    tap_action: editToggleAction(),
  };
}

/** Plus-chip in de chips-rij: opent de editor om een chip toe te voegen. */
export function buildPlusChip(): LovelaceCardConfig {
  return {
    type: "template",
    icon: "mdi:plus",
    icon_color: "grey",
    content: "",
    tap_action: openCardPopupAction("Chip toevoegen", {
      type: "custom:glowify-plus-editor",
      mode: "chip",
    }),
  };
}

/** Opruim-chip in de chips-rij: opent de opruimmodus (beheerlijst). */
export function buildCleanupChip(): LovelaceCardConfig {
  return {
    type: "template",
    icon: "mdi:broom",
    icon_color: "grey",
    content: "Opruimen",
    tap_action: openCardPopupAction("Opruimen", {
      type: "custom:glowify-cleanup",
    }),
  };
}

/** Plus-sub-knopje op een kamerbalk: voegt een knopje aan díe kamer toe. */
export function buildPlusSubButton(areaId: string, areaName: string): {
  icon: string;
  tap_action: Record<string, unknown>;
} {
  return {
    icon: "mdi:plus",
    tap_action: openCardPopupAction(`Knopje toevoegen — ${areaName}`, {
      type: "custom:glowify-plus-editor",
      mode: "sub_button",
      area: areaId,
      area_name: areaName,
    }),
  };
}
