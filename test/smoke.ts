/**
 * Smoke-test: draait GlowifyStrategy.generate() tegen een nagemaakte hass en
 * controleert de Thuis-view-structuur en de kamerbalk-opbouw. Geen framework;
 * pure asserts zodat het met `node build-test/test/smoke.js` draait.
 */
import { GlowifyStrategy } from "../src/strategy";
import { addExtraChip, addExtraSubButton, toggleVerbergLabel } from "../src/features/pure";
import type { GlowifyStrategyOptions } from "../src/types/options";
import type {
  AreaRegistryEntry,
  DeviceRegistryEntry,
  EntityRegistryEntry,
  FloorRegistryEntry,
  HassEntity,
  HomeAssistant,
  LabelRegistryEntry,
} from "../src/types/homeassistant";

// localStorage-stub zodat de bewerkmodus (editMode) getest kan worden in node.
const _ls: Record<string, string> = {};
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (k in _ls ? _ls[k] : null),
  setItem: (k: string, v: string) => {
    _ls[k] = String(v);
  },
  removeItem: (k: string) => {
    delete _ls[k];
  },
};

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
  // Individuele lamp (geen groep) → verschijnt in de pop-up met features op maat.
  ent({ entity_id: "light.woonkamer_leeslamp", area_id: "woonkamer" }),
  // Gewone schakelaar → verschijnt; werkregel + verberg → gefilterd.
  ent({ entity_id: "switch.woonkamer_stopcontact", area_id: "woonkamer" }),
  ent({ entity_id: "switch.woonkamer_child_lock", area_id: "woonkamer" }),
  ent({ entity_id: "switch.woonkamer_geheim", area_id: "woonkamer", labels: ["verberg_id"] }),
  // Badkamer: geen temperatuur, wel vocht (terugval) + ventilator + licht.
  ent({ entity_id: "light.verlichting_badkamer", area_id: "badkamer" }),
  ent({ entity_id: "sensor.badkamer_vocht", area_id: "badkamer", device_class: "humidity" }),
  ent({ entity_id: "fan.badkamer_ventilatie", area_id: "badkamer" }),
];

const labels: LabelRegistryEntry[] = [
  { label_id: "verberg_id", name: "verberg", color: null, icon: null, description: null },
];

const states: Record<string, HassEntity> = {};
for (const e of entities) {
  states[e.entity_id] = {
    entity_id: e.entity_id,
    state: e.entity_id === "light.verlichting_woonkamer" ? "on" : "off",
    attributes: e.entity_id === "light.verlichting_woonkamer" ? { rgb_color: [255, 180, 80] } : {},
  };
}
states["light.woonkamer_leeslamp"].attributes.supported_color_modes = ["color_temp", "rgb"];
// Scene-schuifjes aanwezig maken (Fase 3).
for (const scene of ["gezellig", "relax", "normaal", "fel"]) {
  for (const veld of ["helderheid", "kleurtemperatuur"]) {
    const id = `input_number.glowify_${scene}_${veld}`;
    states[id] = { entity_id: id, state: "50", attributes: {} };
  }
}

const hass: HomeAssistant = {
  states,
  async callWS<T>(msg: Record<string, unknown>): Promise<T> {
    switch (msg.type) {
      case "config/area_registry/list": return areas as unknown as T;
      case "config/floor_registry/list": return floors as unknown as T;
      case "config/device_registry/list": return devices as unknown as T;
      case "config/entity_registry/list": return entities as unknown as T;
      case "config/label_registry/list": return labels as unknown as T;
      default: return [] as unknown as T;
    }
  },
};

async function main(): Promise<void> {
  // Bewerkmodus standaard uit → geen plus/opruim, zuivere sub-knop-volgorde.
  _ls["glowify_edit_mode"] = "0";
  const baseOptions: GlowifyStrategyOptions = { title: "Glowify" };
  const config = { strategy: { type: "custom:glowify", options: baseOptions } };
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

  console.log("== Kamer-pop-up Woonkamer (Fase 2) ==");
  const popup = cards.find((c: any) => c.card_type === "pop-up" && c.hash === "#woonkamer") as any;
  ok(Boolean(popup), "pop-up met hash #woonkamer bestaat");
  const pc: any[] = popup.cards;
  const titles = pc.filter((c) => c.type === "custom:mushroom-title-card").map((c) => c.subtitle);
  ok(titles[0] === "Camera", "camera-sectie staat bovenaan");
  const cam = pc.find((c) => c.type === "picture-entity");
  ok(cam?.entity === "camera.woonkamer_cam" && cam.camera_view === "live", "camera als live picture-entity");
  ok(pc.some((c) => c.type === "custom:mushroom-cover-card" && c.entity === "cover.woonkamer_rolluik"), "zonwering-kaart");
  ok(pc.some((c) => c.type === "custom:mushroom-lock-card" && c.entity === "lock.voordeur"), "slot-kaart");

  const leeslamp = pc.find((c) => c.type === "tile" && c.entity === "light.woonkamer_leeslamp");
  ok(Boolean(leeslamp), "individuele lamp verschijnt");
  const featTypes = (leeslamp?.features ?? []).map((f: any) => f.type);
  ok(
    featTypes.includes("light-brightness") && featTypes.includes("light-color-temp") && featTypes.includes("light-color-favorites"),
    "tile-features op maat van de lamp (helderheid + kleurtemp + kleur)",
  );

  const popupEntities = JSON.stringify(pc);
  ok(!popupEntities.includes("light.verlichting_woonkamer"), "lichtgroep zelf niet in de pop-up");
  ok(!popupEntities.includes("switch.woonkamer_cam_privacy"), "camera-instelschakelaar overgeslagen");
  ok(!popupEntities.includes("switch.woonkamer_child_lock"), "werkregel (child_lock) gefilterd");
  ok(!popupEntities.includes("switch.woonkamer_geheim"), "label 'verberg' gefilterd");
  ok(popupEntities.includes("switch.woonkamer_stopcontact"), "gewone schakelaar verschijnt wel");

  console.log("== Snelpaneel + scenes (Fase 3) ==");
  const lightTrigger = woonkamer.sub_button.find((b: any) => b.icon === "mdi:lightbulb");
  const trigTap = lightTrigger.tap_action;
  ok(trigTap.action === "fire-dom-event", "licht-trigger is fire-dom-event");
  ok(trigTap.browser_mod?.service === "browser_mod.sequence", "roept browser_mod.sequence aan");
  const seq: any[] = trigTap.browser_mod.data.sequence;
  ok(seq[0].service === "light.turn_on" && seq[0].data.entity_id === "light.verlichting_woonkamer", "eerst licht aan");
  const popupStep = seq[1];
  ok(popupStep.service === "browser_mod.popup" && popupStep.data.timeout === 13000, "pop-up van 13 seconden");
  const panelCards: any[] = popupStep.data.content.cards;
  const panelTile = panelCards.find((c) => c.type === "tile");
  ok((panelTile?.features ?? []).length === 3, "drie lichtregelaars in het paneel");
  const sceneChips = panelCards.find((c) => c.type === "custom:mushroom-chips-card")?.chips ?? [];
  ok(sceneChips.length === 4, "vier scenechips");
  ok(
    sceneChips.map((c: any) => c.content).join(",") === "Gezellig,Relax,Normaal,Fel",
    "scenes: Gezellig, Relax, Normaal, Fel",
  );
  ok(
    sceneChips.every((c: any) => c.tap_action.service.startsWith("script.glowify_scene_")),
    "scenechips roepen script.glowify_scene_* aan",
  );
  ok(
    sceneChips.every((c: any) => c.tap_action.data.doelgroep === "light.verlichting_woonkamer"),
    "doelgroep gevuld met de lichtgroep van de kamer",
  );

  const instel = cards.find((c: any) => c.card_type === "pop-up" && c.hash === "#instellingen") as any;
  ok(Boolean(instel), "scene-instellingen pop-up bestaat");
  const instelEntities = instel.cards[0].entities;
  ok(instelEntities?.length === 8, "acht scene-schuifjes in de instellingen");

  console.log("== Pure editor-logica (Fase 4) ==");
  const o1 = addExtraChip({}, { icon: "mdi:cat", content: "Kat" });
  ok(o1.extra_chips?.length === 1 && o1.extra_chips[0].icon === "mdi:cat", "addExtraChip voegt chip toe");
  const o2 = addExtraSubButton({}, "zolder", { entity: "input_button.velux", icon: "mdi:cat" });
  ok(o2.rooms?.zolder?.extra_sub_buttons?.[0].entity === "input_button.velux", "addExtraSubButton in juiste kamer");
  const o3 = addExtraSubButton(o2, "zolder", { icon: "mdi:star" });
  ok(o3.rooms?.zolder?.extra_sub_buttons?.length === 2, "sub-knopjes stapelen per kamer");
  ok(JSON.stringify(o2).length > 0 && o2.rooms?.zolder?.extra_sub_buttons?.length === 1, "originele opties onaangetast (immutabel)");
  ok(JSON.stringify(toggleVerbergLabel(["x"], "vb", true)) === '["x","vb"]', "verberg-label toevoegen");
  ok(JSON.stringify(toggleVerbergLabel(["x", "vb"], "vb", false)) === '["x"]', "verberg-label verwijderen");

  console.log("== Bewerkmodus UIT (UX-1) ==");
  const chips1 = (cards[0] as any).chips;
  ok(chips1.some((c: any) => c.icon === "mdi:pencil"), "potlood-chip altijd zichtbaar");
  const pencilOff = chips1.find((c: any) => c.icon === "mdi:pencil");
  ok(pencilOff.icon_color === "grey", "potlood grijs wanneer bewerkmodus uit");
  ok(!chips1.some((c: any) => c.icon === "mdi:plus"), "geen plus-chip wanneer bewerkmodus uit");
  ok(!chips1.some((c: any) => c.icon === "mdi:broom"), "geen opruim-chip wanneer bewerkmodus uit");
  ok(woonkamer.sub_button[0].entity === "binary_sensor.woonkamer_beweging", "geen plus-sub-knop wanneer bewerkmodus uit");

  console.log("== Bewerkmodus AAN (UX-1) ==");
  _ls["glowify_edit_mode"] = "1";
  const res2 = await GlowifyStrategy.generate(
    { strategy: { options: { title: "Glowify" } } },
    hass,
  );
  const chips2 = (res2.views[0].cards![0] as any).chips;
  const pencilOn = chips2.find((c: any) => c.icon === "mdi:pencil");
  ok(pencilOn.icon_color === "purple", "potlood paars wanneer bewerkmodus aan");
  ok(chips2.some((c: any) => c.icon === "mdi:plus"), "plus-chip verschijnt in bewerkmodus");
  ok(chips2.some((c: any) => c.icon === "mdi:broom"), "opruim-chip verschijnt in bewerkmodus");
  const plusChip = chips2.find((c: any) => c.icon === "mdi:plus");
  ok(
    plusChip.tap_action.action === "fire-dom-event" &&
      plusChip.tap_action.browser_mod.data.content.type === "custom:glowify-plus-editor",
    "plus-chip opent de plusknop-editor",
  );
  ok(
    pencilOn.tap_action.action === "fire-dom-event" && pencilOn.tap_action.glowify_edit_toggle === true,
    "potlood-chip toggelt via fire-dom-event",
  );
  const stacks2 = res2.views[0].cards!.filter((c: any) => c.type === "vertical-stack");
  const wk2 = (stacks2.find((s: any) => s.cards[0].name === "Gelijkvloers") as any).cards.find((c: any) => c.name === "Woonkamer");
  const plusSub = wk2.sub_button[0];
  ok(plusSub.icon === "mdi:plus" && plusSub.entity === undefined, "plus-sub-knop uiterst links op de kamerbalk");
  ok(
    plusSub.tap_action.browser_mod.data.content.mode === "sub_button" &&
      plusSub.tap_action.browser_mod.data.content.area === "woonkamer",
    "plus-sub-knop richt zich op de juiste kamer",
  );
  // Beweging is nu doorgeschoven naar index 2 (achter de plus).
  ok(wk2.styles.includes(".bubble-sub-button-2 { display:"), "styles-indices verschuiven correct mee met de plus");
  _ls["glowify_edit_mode"] = "0";

  console.log(failures === 0 ? "\nALLE CHECKS GESLAAGD" : `\n${failures} CHECK(S) GEFAALD`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
