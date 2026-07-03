import { GlowifyRegistry } from "../registry";
import type { RoomModel } from "../model/floorModel";
import { buildRoomContent } from "../cards/roomContent";
import type { LovelaceViewConfig } from "../types/homeassistant";

/**
 * Bouwt de volledige kamerpagina (subview) waar lang indrukken op een
 * kamerbalk naartoe navigeert. Dezelfde domeingroepen, filters en kleurtaal
 * als de pop-up, maar als eigen pagina met een terugknop.
 */
export function buildRoomSubview(
  reg: GlowifyRegistry,
  room: RoomModel,
): LovelaceViewConfig {
  const content = buildRoomContent(reg, room);
  const extra = room.options.extra_popup_cards ?? [];
  const cards = [...content, ...extra];

  if (cards.length === 0) {
    cards.push({
      type: "markdown",
      content: "Geen bedienbare toestellen in deze kamer.",
    });
  }

  return {
    title: room.name,
    path: room.areaId,
    icon: room.icon ?? "mdi:home-outline",
    subview: true,
    cards,
  };
}
