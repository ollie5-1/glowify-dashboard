import { GlowifyRegistry } from "../registry";
import type { RoomModel } from "../model/floorModel";
import { detectRoomEntities, type RoomEntities } from "../model/roomEntities";
import {
  KLEUR,
  coverStyle,
  fanStyle,
  lightStyle,
  lockStyle,
  motionStyle,
  specialColorStyle,
} from "../kleurtaal";
import { lightOffAction } from "./lightAction";
import { buildLightPanelAction } from "../scenes";
import { buildPlusSubButton } from "../features/editorChips";
import type { LovelaceCardConfig } from "../types/homeassistant";

interface SubButton {
  entity?: string;
  icon?: string;
  show_background?: boolean;
  tap_action?: Record<string, unknown>;
  hold_action?: Record<string, unknown>;
}

/**
 * Bouwt de kamerbalk (Bubble Card button) voor één kamer.
 *
 * Sub-knopjes staan in de vaste volgorde van rechts naar links:
 * verlichting (rechts), zonwering, ventilator, dan de specials, en de
 * bewegingsindicator uiterst links. In de array (die links→rechts rendert)
 * is dat dus: beweging, specials, ventilator, zonwering, verlichting.
 *
 * De `styles` verwijzen naar posities (`.bubble-sub-button-N`, `subButtonIcon[i]`),
 * dus de indices worden meegeteld terwijl de array wordt opgebouwd.
 */
export function buildRoomBar(
  reg: GlowifyRegistry,
  room: RoomModel,
  editMode: boolean,
  detected?: RoomEntities,
): LovelaceCardConfig {
  const ent = detected ?? detectRoomEntities(reg, room);
  const subButtons: SubButton[] = [];
  const styleLines: string[] = [];

  // 0. Plus-knopje (uiterst links): enkel in de bewerkmodus. Opent de
  //    plusknop-editor voor deze kamer.
  if (editMode && reg.options.plus_on_bars !== false) {
    subButtons.push(buildPlusSubButton(room.areaId, room.name));
  }

  // 1. Bewegingsindicator (uiterst links), zonder achtergrondcirkel.
  if (ent.motion) {
    const css = subButtons.length + 1;
    subButtons.push({
      entity: ent.motion,
      icon: "mdi:motion-sensor",
      show_background: false,
      tap_action: { action: "none" },
    });
    styleLines.push(motionStyle(ent.motion, css));
  }

  // 2. Specials uit de opties (bv. kattenstand), links van de vaste trio.
  for (const sb of room.options.extra_sub_buttons ?? []) {
    const css = subButtons.length + 1;
    const entry: SubButton = {};
    if (sb.entity) entry.entity = sb.entity;
    if (sb.icon) entry.icon = sb.icon;
    entry.tap_action = sb.tap_action ?? { action: "more-info" };
    subButtons.push(entry);
    styleLines.push(specialColorStyle(css, sb.color_when_active ?? KLEUR.stand));
  }

  // 3. Sloten als specials (groen vergrendeld / rood ontgrendeld).
  for (const lock of ent.locks) {
    const zero = subButtons.length;
    subButtons.push({
      entity: lock,
      icon: "mdi:lock",
      tap_action: { action: "toggle" },
    });
    styleLines.push(lockStyle(lock, zero + 1, zero));
  }

  // 4. Ventilator (blauw wanneer aan).
  if (ent.fan) {
    const css = subButtons.length + 1;
    subButtons.push({
      entity: ent.fan,
      icon: "mdi:fan",
      tap_action: { action: "toggle" },
    });
    styleLines.push(fanStyle(ent.fan, css));
  }

  // 5. Zonwering (oranje wanneer open, open/dicht-icoonwissel).
  if (ent.cover) {
    const zero = subButtons.length;
    subButtons.push({
      entity: ent.cover,
      icon: "mdi:window-shutter",
      tap_action: { action: "toggle" },
    });
    styleLines.push(coverStyle(ent.cover, zero + 1, zero));
  }

  // 6. Verlichting (uiterst rechts): trigger bij uit, uit-knopje bij aan.
  if (ent.lightGroup) {
    const triggerCss = subButtons.length + 1;
    subButtons.push({
      entity: ent.lightGroup,
      icon: "mdi:lightbulb",
      tap_action: buildLightPanelAction(ent.lightGroup, room.name),
      hold_action: { action: "more-info" },
    });
    const offCss = subButtons.length + 1;
    subButtons.push({
      entity: ent.lightGroup,
      icon: "mdi:lightbulb-on",
      tap_action: lightOffAction(ent.lightGroup),
      hold_action: { action: "more-info" },
    });
    styleLines.push(lightStyle(ent.lightGroup, triggerCss, offCss));
  }

  // Navigatie: tik opent de pop-up van deze kamer.
  const nav = { action: "navigate", navigation_path: `#${room.areaId}` };

  const bar: LovelaceCardConfig = {
    type: "custom:bubble-card",
    card_type: "button",
    button_type: ent.statusSensor ? "state" : "name",
    name: room.name,
    icon: room.icon ?? "mdi:home-outline",
    tap_action: nav,
    hold_action: nav,
    button_action: { tap_action: nav, hold_action: nav },
  };

  if (ent.statusSensor) {
    bar.entity = ent.statusSensor;
    bar.show_state = true;
  }
  if (subButtons.length > 0) bar.sub_button = subButtons;
  if (styleLines.length > 0) bar.styles = styleLines.join("\n") + "\n";

  return bar;
}
