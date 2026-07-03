import { GlowifyRegistry } from "../registry";
import type { RoomModel } from "../model/floorModel";
import { buildRoomContent } from "./roomContent";
import type { LovelaceCardConfig } from "../types/homeassistant";

/**
 * Bouwt de zelfvullende kamer-pop-up (Bubble Card pop-up) met hash `#<area>`,
 * die opengaat bij het tikken op de kamerbalk. De inhoud is native per domein
 * gegroepeerd; extra kaarten uit de opties komen onderaan.
 */
export function buildRoomPopup(
  reg: GlowifyRegistry,
  room: RoomModel,
): LovelaceCardConfig {
  const content = buildRoomContent(reg, room);
  const extra = room.options.extra_popup_cards ?? [];

  return {
    type: "custom:bubble-card",
    card_type: "pop-up",
    hash: `#${room.areaId}`,
    name: room.name,
    icon: room.icon ?? "mdi:home-outline",
    show_header: true,
    auto_close: 30000,
    cards: [...content, ...extra],
  };
}
