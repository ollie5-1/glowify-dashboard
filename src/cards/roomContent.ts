import { GlowifyRegistry } from "../registry";
import type { RoomModel } from "../model/floorModel";
import { DOMAIN_GROUPS, buildEntityCard, filterDomainEntities } from "./domainCards";
import type { LovelaceCardConfig } from "../types/homeassistant";

/**
 * Bouwt de inhoud van een kamer-pop-up (en subview): per domein een
 * titelkaartje gevolgd door één kaart per entiteit, op maat van het domein.
 * Native gegenereerd, dus zonder auto-entities. De filters en kaarten komen
 * uit domainCards.ts, gedeeld met de domein-views.
 */
export function buildRoomContent(
  reg: GlowifyRegistry,
  room: RoomModel,
): LovelaceCardConfig[] {
  const cards: LovelaceCardConfig[] = [];

  for (const group of DOMAIN_GROUPS) {
    const matches = filterDomainEntities(reg, room.areaId, group.domain);
    if (matches.length === 0) continue;

    cards.push({ type: "custom:mushroom-title-card", subtitle: group.title });
    for (const entity of matches) {
      cards.push(buildEntityCard(reg, group.domain, entity.entity_id));
    }
  }

  return cards;
}
