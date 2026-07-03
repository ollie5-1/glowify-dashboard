import { GlowifyRegistry } from "../registry";
import type { FloorModel } from "../model/floorModel";
import { buildEntityCard, filterDomainEntities } from "../cards/domainCards";
import type { LovelaceCardConfig, LovelaceViewConfig } from "../types/homeassistant";

/**
 * De domein-tabbladen zoals in de mushroom-strategy referentie: per domein
 * één view met, per kamer, een titeltje en de toestellen van dat domein.
 * Dezelfde filters en kleurtaal als de pop-ups (via domainCards.ts).
 */
const DOMAIN_VIEWS: { domain: string; title: string; icon: string; path: string }[] = [
  { domain: "light", title: "Lampen", icon: "mdi:lightbulb-group", path: "lampen" },
  { domain: "fan", title: "Ventilatie", icon: "mdi:fan", path: "ventilatie" },
  { domain: "cover", title: "Zonwering", icon: "mdi:window-shutter", path: "zonwering" },
  { domain: "switch", title: "Schakelaars", icon: "mdi:toggle-switch-variant", path: "schakelaars" },
  { domain: "lock", title: "Sloten", icon: "mdi:lock", path: "sloten" },
];

/**
 * Bouwt de domein-views. Kamers in dezelfde volgorde als de Thuis-view
 * (per verdieping). Een domein zonder toestellen levert geen view op.
 */
export function buildDomainViews(
  reg: GlowifyRegistry,
  floors: FloorModel[],
): LovelaceViewConfig[] {
  const views: LovelaceViewConfig[] = [];

  for (const dv of DOMAIN_VIEWS) {
    const cards: LovelaceCardConfig[] = [];

    for (const floor of floors) {
      for (const room of floor.rooms) {
        const entities = filterDomainEntities(reg, room.areaId, dv.domain);
        if (entities.length === 0) continue;
        cards.push({ type: "custom:mushroom-title-card", title: room.name });
        for (const e of entities) {
          cards.push(buildEntityCard(reg, dv.domain, e.entity_id));
        }
      }
    }

    if (cards.length === 0) continue;
    views.push({ title: dv.title, path: dv.path, icon: dv.icon, cards });
  }

  return views;
}
