/**
 * Smoke-test: draait GlowifyStrategy.generate() tegen een nagemaakte hass en
 * controleert de Thuis-view-structuur en de kamerbalk-opbouw. Geen framework;
 * pure asserts zodat het met `node build-test/test/smoke.js` draait.
 */
import { GlowifyStrategy } from "../src/strategy";
import type {
  AreaRegistryEntry,
  DeviceRegistryEntry,
  EntityRegistryEntry,
  FloorRegistryEntry,
  HassEntity,
  HomeAssistant,
  LabelRegistryEntry,
} from "../src/types/homeassistant";

let failures = 0;
function ok(cond: boolean, msg: string): void {
  if (cond) {
    console.log(`  ✓ ${msg}`);
  } else {
    failures++;
    console.error(`  ✗ ${msg}`);
  }
}

function ent(
  partial: Partial<EntityRegistryEntry> & { entity_id: string },
): EntityRegistryEntry {
  return {
    area_id: null,
    device_id: null,
    labels: [],
    platform: "test",
    name: null,
    original_name: null,
    device_class: null,
    original_device_class: null,
    hidden_by: null,
    disabled_by: null,
    entity_category: null,
    has_entity_name: true,
    ...partial,
  };
}

const floors: FloorRegistryEntry[] = [
  { floor_id: "begane", name: "Gelijkvloers", level: 0, icon: null, aliases: [] },
  { floor_id: "boven", name: "Eerste verdieping", level: 1, icon: null, aliases: [] },
];

const areas: AreaRegistryEntry[] = [
  { area_id: "woonkamer", name: "Woonkamer", floor_id: "begane", icon: "mdi:sofa", picture: null, labels: [], aliases: [] },
  { area_id: "badkamer", name: "Badkamer", floor_id: "boven", icon: "mdi:shower", picture: null, labels: [], aliases: [] },
  { area_id: "berging", name: "Berging", floor_id: "begane", icon: null, picture: null, labels: [], aliases: [] },
];

const devices: DeviceRegistryEntry[] = [
  { id: "dev_cam", area_id: "woonkamer", name: "Camera", name_by_user: null, labels: [], manufacturer: null, model: null },
];

const entities: EntityRegistryEntry[] = [
  ent({ entity_id: "light.verlichting_woonkamer", area_id: "woonkamer" }),
  ent({ entity_id: "sensor.woonkamer_temp", area_id: "woonkamer", device_class: "temperature" }),
  ent({ entity_id: "binary_sensor.woonkamer_beweging", area_id: "woonkamer", device_class: "motion" }),
  ent({ entity_id: "cover.woonkamer_rolluik", area_id: "woonkamer" }),
  ent({ entity_id: "lock.voordeur", area_id: "woonkamer" }),
  // Camera + bijhorende instel-switch (moet in pop-up overgeslagen worden — Fase 2).
  ent({ entity_id: "camera.woonkamer_cam", area_id: "woonkamer", device_id: "dev_cam" }),
  ent({ entity_id: "switch.woonkamer_cam_privacy", area_id: "woonkamer", device_id: "dev_cam" }),
  // Badkamer: geen temperatuur, wel vocht (terugval) + ventilator + licht.
  ent({ entity_id: "light.verlichting_badkamer", area_id: "badkamer" }),
  ent({ entity_id: "sensor.badkamer_vocht", area_id: "badkamer", device_class: "humidity" }),
  ent({ entity_id: "fan.badkamer_ventilatie", area_id: "badkamer" }),
];

const states: Record<string, HassEntity> = {};
for (const e of entities) {
  states[e.entity_id] = {
    entity_id: e.entity_id,
    state: e.entity_id === "light.verlichting_woonkamer" ? "on" : "off",
    attributes: e.entity_id === "light.verlichting_woonkamer" ? { rgb_color: [255, 180, 80] } : {},
  };
}

const hass: HomeAssistant = {
  states,
  async callWS<T>(msg: Record<string, unknown>): Promise<T> {
    switch (msg.type) {
      case "config/area_registry/list": return areas as unknown as T;
      case "config/floor_registry/list": return floors as unknown as T;
      case "config/device_registry/list": return devices as unknown as T;
      case "config/entity_registry/list": return entities as unknown as T;
      case "config/label_registry/list": return [] as unknown as LabelRegistryEntry[] as unknown as T;
      default: return [] as unknown as T;
    }
  },
};

async function main(): Promise<void> {
  const config = { strategy: { type: "custom:glowify", options: { title: "Glowify" } } };
  const result = await GlowifyStrategy.generate(config, hass);

  console.log("== Structuur ==");
  ok(result.views.length === 1, "één view gegenereerd");
  const view = result.views[0];
  ok(view.path === "glowify-thuis", "view path = glowify-thuis");
  const cards = view.cards ?? [];
  ok(cards[0]?.type === "custom:mushroom-chips-card", "eerste kaart is de chips-rij");

  const chips = (cards[0] as any).chips;
  ok(chips[0].icon === "mdi:lightbulb-group", "lampenteller-chip aanwezig");
  ok(
    JSON.stringify(chips[0].tap_action?.target?.entity_id ?? []).includes("light.verlichting_woonkamer"),
    "lampenteller schakelt de lichtgroepen uit",
  );
  ok(chips[1].content === "Scenes", "Scenes-chip aanwezig");

  // Twee verdiepingsblokken (vertical-stack), elk met een separator.
  const stacks = cards.filter((c: any) => c.type === "vertical-stack");
  ok(stacks.length === 2, "twee verdiepingsblokken");
  const separators = stacks.map((s: any) => s.cards[0]);
  ok(separators.every((s: any) => s.card_type === "separator"), "elk blok start met een separator");
  ok(
    separators.some((s: any) => s.name === "Gelijkvloers") && separators.some((s: any) => s.name === "Eerste verdieping"),
    "verdiepingsnamen kloppen",
  );

  console.log("== Woonkamer-balk ==");
  const beganeStack = stacks.find((s: any) => s.cards[0].name === "Gelijkvloers") as any;
  const woonkamer = beganeStack.cards.find((c: any) => c.name === "Woonkamer");
  ok(woonkamer.button_type === "state" && woonkamer.entity === "sensor.woonkamer_temp", "temperatuur als status");
  const sb = woonkamer.sub_button.map((b: any) => b.entity);
  // Volgorde links→rechts: beweging, slot, zonwering, licht-trigger, licht-uit.
  ok(sb[0] === "binary_sensor.woonkamer_beweging", "beweging uiterst links");
  ok(sb[1] === "lock.voordeur", "slot als special na beweging");
  ok(sb[2] === "cover.woonkamer_rolluik", "zonwering na de specials");
  ok(sb[3] === "light.verlichting_woonkamer" && sb[4] === "light.verlichting_woonkamer", "twee licht-knopjes rechts");
  ok(woonkamer.sub_button[0].show_background === false, "bewegingsindicator zonder achtergrond");
  const styles: string = woonkamer.styles;
  ok(styles.includes(".bubble-sub-button-1 { display:"), "bewegings-style op index 1");
  ok(styles.includes("mdi:lock-open-variant"), "slot-style met icoonwissel");
  ok(styles.includes("rgb_color"), "licht kleurt mee met de lamp");

  console.log("== Badkamer-balk (terugval) ==");
  const bovenStack = stacks.find((s: any) => s.cards[0].name === "Eerste verdieping") as any;
  const badkamer = bovenStack.cards.find((c: any) => c.name === "Badkamer");
  ok(badkamer.entity === "sensor.badkamer_vocht", "terugval op luchtvochtigheid");
  const bsb = badkamer.sub_button.map((b: any) => b.entity);
  ok(bsb[0] === "fan.badkamer_ventilatie", "ventilator vóór de verlichting");

  console.log("== Berging (kaal) ==");
  const berging = beganeStack.cards.find((c: any) => c.name === "Berging");
  ok(berging.button_type === "name", "berging zonder status = name-type");
  ok(berging.sub_button === undefined, "berging zonder sub-knopjes");

  console.log(failures === 0 ? "\nALLE CHECKS GESLAAGD" : `\n${failures} CHECK(S) GEFAALD`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
