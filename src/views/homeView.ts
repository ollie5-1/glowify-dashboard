import { GlowifyRegistry } from "../registry";
import type { FloorModel } from "../model/floorModel";
import { detectRoomEntities } from "../model/roomEntities";
import { buildChipsCard } from "../cards/chips";
import { buildRoomBar } from "../cards/roomBar";
import type { LovelaceCardConfig, LovelaceViewConfig } from "../types/homeassistant";

/**
 * Bouwt de Thuis-view: de chips-rij, en per verdieping een blok met een
 * Bubble Card separator gevolgd door de kamerbalken van die verdieping.
 *
 * De kamer-pop-ups (Fase 2) worden hier later als extra kaarten toegevoegd.
 */
export function buildHomeView(
  reg: GlowifyRegistry,
  floors: FloorModel[],
): LovelaceViewConfig {
  const cards: LovelaceCardConfig[] = [];
  const lightGroups: string[] = [];

  // Verdiepingsblokken. Detectie wordt per kamer één keer gedaan en gedeeld
  // met de kamerbalk, en levert meteen de lichtgroepen voor de lampenteller.
  const floorBlocks: LovelaceCardConfig[] = [];
  for (const floor of floors) {
    const stack: LovelaceCardConfig[] = [
      {
        type: "custom:bubble-card",
        card_type: "separator",
        name: floor.name,
        icon: floor.icon,
      },
    ];
    for (const room of floor.rooms) {
      const ent = detectRoomEntities(reg, room);
      if (ent.lightGroup) lightGroups.push(ent.lightGroup);
      stack.push(buildRoomBar(reg, room, ent));
    }
    floorBlocks.push({ type: "vertical-stack", cards: stack });
  }

  // Chips-rij vooraan (heeft de verzamelde lichtgroepen nodig).
  cards.push(buildChipsCard(reg, lightGroups));
  cards.push(...floorBlocks);

  return {
    title: reg.options.title ?? "Thuis",
    path: "glowify-thuis",
    icon: "mdi:home-heart",
    badges: [],
    cards,
  };
}
