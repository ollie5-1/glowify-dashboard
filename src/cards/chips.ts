import { GlowifyRegistry } from "../registry";
import { buildCleanupChip, buildPlusChip } from "../features/editorChips";
import type { ExtraChip } from "../types/options";
import type { LovelaceCardConfig } from "../types/homeassistant";

/**
 * Bouwt de chips-rij bovenaan de Thuis-view: een lampenteller (hoeveel
 * kamers verlicht, tik = alles uit) en de Scenes-chip. Extra chips uit de
 * opties (en later de plusknop-editor) worden achteraan toegevoegd.
 */
export function buildChipsCard(
  reg: GlowifyRegistry,
  lightGroups: string[],
): LovelaceCardConfig {
  const prefix = reg.options.light_group_prefix ?? "verlichting_";
  const chips: LovelaceCardConfig[] = [];

  // Lampenteller-chip: telt de brandende lichtgroepen, kleurt oranje bij aan.
  const countExpr = `states.light | selectattr('entity_id', 'search', '${prefix}') | selectattr('state', 'eq', 'on') | list | count`;
  const lampChip: LovelaceCardConfig = {
    type: "template",
    icon: "mdi:lightbulb-group",
    icon_color: `{{ 'orange' if ${countExpr} > 0 else 'grey' }}`,
    content: `{{ ${countExpr} }} kamers verlicht`,
  };
  if (lightGroups.length > 0) {
    lampChip.tap_action = {
      action: "call-service",
      service: "light.turn_off",
      target: { entity_id: lightGroups },
    };
  }
  chips.push(lampChip);

  // Scenes-chip: opent de scene-instellingen pop-up.
  chips.push({
    type: "template",
    icon: "mdi:tune",
    icon_color: "purple",
    content: "Scenes",
    tap_action: { action: "navigate", navigation_path: "#instellingen" },
  });

  // Extra chips uit de opties.
  for (const extra of reg.options.extra_chips ?? []) {
    chips.push(buildExtraChip(extra));
  }

  // Editor-chips: plusknop-editor en opruimmodus.
  if (reg.options.show_plus_chip !== false) chips.push(buildPlusChip());
  if (reg.options.show_cleanup_chip !== false) chips.push(buildCleanupChip());

  return {
    type: "custom:mushroom-chips-card",
    alignment: "center",
    chips,
  };
}

function buildExtraChip(extra: ExtraChip): LovelaceCardConfig {
  const chip: LovelaceCardConfig = { type: "template" };
  if (extra.icon) chip.icon = extra.icon;
  if (extra.icon_color) chip.icon_color = extra.icon_color;
  if (extra.content) chip.content = extra.content;
  if (extra.tap_action) chip.tap_action = extra.tap_action;
  // Vrije doorvoer van eventuele overige velden (plusknop-editor).
  for (const [k, v] of Object.entries(extra)) {
    if (!(k in chip)) chip[k] = v;
  }
  return chip;
}
