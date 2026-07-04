/**
 * Smoke-test: draait GlowifyStrategy.generate() tegen een nagemaakte hass en
 * controleert de Thuis-view-structuur en de kamerbalk-opbouw. Geen framework;
 * pure asserts zodat het met `node build-test/test/smoke.js` draait.
 */
import { GlowifyStrategy } from "../src/strategy";
import { addExtraChip, addExtraSubButton, toggleVerbergLabel } from "../src/features/pure";
import {
  buildAction,
  buildChipItem,
  buildSubItem,
  entityDomainFor,
  entityForItem,
  targetFieldFor,
} from "../src/features/editorLogic";
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

/**
 * Reproduceert de demo-bug: de strategy-config bevat rooms.woonkamer, maar de
 * echte area_id van "Woonkamer" is een andere slug/id. De generator moet de
 * per-kamer opties tóch matchen (via de naam-slug) en de extra_sub_buttons
 * renderen — ook met bewerkmodus uit.
 */
async function keyMatchScenario(): Promise<void> {
  console.log("== Renderbug: sleutel-matching met letterlijke config (Fase 9) ==");
  _ls["glowify_edit_mode"] = "0";

  const kmFloors: FloorRegistryEntry[] = [
    { floor_id: "begane", name: "Gelijkvloers", level: 0, icon: null, aliases: [] },
  ];
  // De echte area_id verschilt bewust van de naam-slug "woonkamer".
  const kmAreas: AreaRegistryEntry[] = [
    { area_id: "a1b2c3d4", name: "Woonkamer", floor_id: "begane", icon: "mdi:sofa", picture: null, labels: [], aliases: [] },
  ];
  const kmHass: HomeAssistant = {
    states: {},
    async callWS<T>(msg: Record<string, unknown>): Promise<T> {
      switch (msg.type) {
        case "config/area_registry/list": return kmAreas as unknown as T;
        case "config/floor_registry/list": return kmFloors as unknown as T;
        default: return [] as unknown as T;
      }
    },
  };

  // Exact de vorm zoals in het demo-dashboard opgeslagen.
  const kmConfig = {
    type: "custom:glowify",
    options: {
      rooms: {
        woonkamer: {
          extra_sub_buttons: [
            {
              entity: "cover.rolluik_slaapkamer",
              icon: "mdi:window-shutter-open",
              tap_action: { action: "call-service", service: "cover.open_cover", target: { entity_id: "cover.rolluik_slaapkamer" } },
            },
            {
              entity: "cover.rolluik_slaapkamer",
              icon: "mdi:window-shutter",
              tap_action: { action: "call-service", service: "cover.close_cover", target: { entity_id: "cover.rolluik_slaapkamer" } },
            },
          ],
        },
      },
    },
  };

  const res = await GlowifyStrategy.generate(kmConfig, kmHass);
  const stack = (res.views[0].cards!.find((c: any) => c.type === "vertical-stack") as any);
  const bar = stack.cards.find((c: any) => c.name === "Woonkamer");
  ok(Boolean(bar), "Woonkamer-balk bestaat");
  const services = (bar.sub_button ?? []).map((b: any) => b.tap_action?.service).filter(Boolean);
  ok(services.includes("cover.open_cover"), "extra sub-knop 'openen' rendert (rooms.woonkamer matcht via naam-slug)");
  ok(services.includes("cover.close_cover"), "extra sub-knop 'sluiten' rendert");
  ok((bar.sub_button ?? []).length === 2, "beide extra sub-knopjes staan op de balk, bewerkmodus uit");
}

/**
 * Verifieert exact dat de styles-indices dynamisch meeschuiven met het aantal
 * extra_sub_buttons: drie extras + beweging + zonwering + lampenpaar. De
 * display-none-regels van het lampenpaar mogen NOOIT de extras (of de cover)
 * raken; de cover-icoonwissel moet op de juiste subButtonIcon-index staan.
 */
async function indexShiftScenario(): Promise<void> {
  console.log("== Index-verschuiving met 3 extras + cover + lampenpaar (Fase 12) ==");
  _ls["glowify_edit_mode"] = "0";

  const flr: FloorRegistryEntry[] = [
    { floor_id: "begane", name: "Gelijkvloers", level: 0, icon: null, aliases: [] },
  ];
  const ar: AreaRegistryEntry[] = [
    { area_id: "testkamer", name: "Testkamer", floor_id: "begane", icon: "mdi:test-tube", picture: null, labels: [], aliases: [] },
  ];
  const es: EntityRegistryEntry[] = [
    ent({ entity_id: "light.verlichting_testkamer", area_id: "testkamer" }),
    ent({ entity_id: "cover.test_rolluik", area_id: "testkamer" }),
    ent({ entity_id: "binary_sensor.test_beweging", area_id: "testkamer", device_class: "motion" }),
  ];
  const st: Record<string, HassEntity> = {
    "light.verlichting_testkamer": { entity_id: "light.verlichting_testkamer", state: "on", attributes: { rgb_color: [255, 170, 60] } },
    "cover.test_rolluik": { entity_id: "cover.test_rolluik", state: "open", attributes: {} },
    "binary_sensor.test_beweging": { entity_id: "binary_sensor.test_beweging", state: "off", attributes: {} },
  };
  const h: HomeAssistant = {
    states: st,
    async callWS<T>(msg: Record<string, unknown>): Promise<T> {
      switch (msg.type) {
        case "config/area_registry/list": return ar as unknown as T;
        case "config/floor_registry/list": return flr as unknown as T;
        case "config/entity_registry/list": return es as unknown as T;
        default: return [] as unknown as T;
      }
    },
  };

  const cfg = {
    type: "custom:glowify",
    options: {
      rooms: {
        testkamer: {
          extra_sub_buttons: [
            { entity: "input_button.a", icon: "mdi:cat", color_when_active: "rgb(142, 47, 137)" },
            { entity: "input_button.b", icon: "mdi:star", color_when_active: "rgb(76, 128, 201)" },
            { entity: "input_button.c", icon: "mdi:heart", color_when_active: "rgb(46, 125, 50)" },
          ],
        },
      },
    },
  };

  const res = await GlowifyStrategy.generate(cfg, h);
  const stack = res.views[0].cards!.find((c: any) => c.type === "vertical-stack") as any;
  const bar = stack.cards.find((c: any) => c.name === "Testkamer");
  const sb: any[] = bar.sub_button;
  const styles: string = bar.styles;

  // Verwachte volgorde: beweging(1), extra a(2), extra b(3), extra c(4),
  // zonwering(5, subButtonIcon[4]), lamp-trigger(6), lamp-uit(7).
  ok(sb.length === 7, "zeven sub-knopjes (beweging + 3 extras + cover + lampenpaar)");
  ok(sb[0].entity === "binary_sensor.test_beweging", "beweging op index 0");
  ok(sb[1].entity === "input_button.a" && sb[2].entity === "input_button.b" && sb[3].entity === "input_button.c", "drie extras op index 1-3");
  ok(sb[4].entity === "cover.test_rolluik", "zonwering op index 4");
  ok(sb[5].icon === "mdi:lightbulb" && sb[6].icon === "mdi:lightbulb-on", "lampenpaar op index 5-6");

  // Exacte styles-indices.
  ok(styles.includes(".bubble-sub-button-1 { display:"), "beweging-style op .bubble-sub-button-1");
  ok(styles.includes(".bubble-sub-button-2 { color: rgb(142, 47, 137)"), "extra a op .bubble-sub-button-2");
  ok(styles.includes(".bubble-sub-button-3 { color: rgb(76, 128, 201)"), "extra b op .bubble-sub-button-3");
  ok(styles.includes(".bubble-sub-button-4 { color: rgb(46, 125, 50)"), "extra c op .bubble-sub-button-4");
  ok(styles.includes(".bubble-sub-button-5 { background-color"), "zonwering-achtergrond op .bubble-sub-button-5");
  ok(styles.includes(".bubble-sub-button-6 { display: none"), "lamp-trigger display op .bubble-sub-button-6");
  ok(styles.includes(".bubble-sub-button-7 { display: none"), "lamp-uit display op .bubble-sub-button-7");
  ok(styles.includes(".bubble-sub-button-7 { background-color"), "lamp-kleur op .bubble-sub-button-7");

  // Kritiek: de cover-icoonwissel gebruikt subButtonIcon[4] en niets anders.
  const iconRefs = styles.match(/subButtonIcon\[(\d+)\]/g) ?? [];
  ok(iconRefs.length === 1 && iconRefs[0] === "subButtonIcon[4]", "enige subButtonIcon-verwijzing is [4] (de cover)");

  // Kritiek: geen enkele display-none-regel raakt de extras (index 2-4).
  ok(
    !styles.includes(".bubble-sub-button-2 { display: none") &&
      !styles.includes(".bubble-sub-button-3 { display: none") &&
      !styles.includes(".bubble-sub-button-4 { display: none"),
    "display-none van het lampenpaar verbergt de extras niet",
  );
}

/**
 * Gebruikt de LETTERLIJKE afgeplatte config-vorm uit de demo-console
 * ({type, debug, rooms}) — zonder options-sleutel — en verifieert dat de
 * opties tóch doorkomen: debug logt en de extra_sub_buttons renderen.
 */
async function flattenedFormScenario(): Promise<void> {
  console.log("== Afgeplatte HA-config-vorm (Fase 14) ==");
  _ls["glowify_edit_mode"] = "0";

  // Exact zoals HA aanroept: opties afgeplat op top-level, geen options-sleutel.
  const flatConfig = {
    type: "custom:glowify",
    debug: true,
    rooms: {
      woonkamer: {
        extra_sub_buttons: [
          { entity: "cover.rolluik_slaapkamer", icon: "mdi:window-shutter-open", tap_action: { action: "call-service", service: "cover.open_cover", target: { entity_id: "cover.rolluik_slaapkamer" } } },
          { entity: "cover.rolluik_slaapkamer", icon: "mdi:window-shutter", tap_action: { action: "call-service", service: "cover.close_cover", target: { entity_id: "cover.rolluik_slaapkamer" } } },
        ],
      },
    },
  };

  // Console.log opvangen om te bewijzen dat debug:true werkt.
  const logs: string[] = [];
  const orig = console.log;
  console.log = (...a: unknown[]) => {
    logs.push(a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "));
  };
  let res;
  try {
    res = await GlowifyStrategy.generate(flatConfig, hass);
  } finally {
    console.log = orig;
  }

  ok(
    logs.some((l) => l.includes("Kamerbalk") && l.includes("Woonkamer")),
    "debug:true uit de afgeplatte vorm werkt (kamerbalk wordt gelogd)",
  );

  const stacks = res.views[0].cards!.filter((c: any) => c.type === "vertical-stack");
  let bar: any;
  for (const s of stacks as any[]) {
    const b = s.cards.find((c: any) => c.name === "Woonkamer");
    if (b) bar = b;
  }
  ok(Boolean(bar), "Woonkamer-balk bestaat");
  const services = (bar.sub_button ?? []).map((b: any) => b.tap_action?.service).filter(Boolean);
  ok(services.includes("cover.open_cover"), "extra sub-knop 'openen' rendert uit de afgeplatte vorm");
  ok(services.includes("cover.close_cover"), "extra sub-knop 'sluiten' rendert uit de afgeplatte vorm");
}

async function main(): Promise<void> {
  // Bewerkmodus standaard uit → geen plus/opruim, zuivere sub-knop-volgorde.
  _ls["glowify_edit_mode"] = "0";
  const baseOptions: GlowifyStrategyOptions = { title: "Glowify" };
  // Exact zoals HA de strategie aanroept: het strategy-config-object zelf,
  // met de opties op `options` (niet genest onder `strategy`).
  const config = { type: "custom:glowify", options: baseOptions };
  const result = await GlowifyStrategy.generate(config, hass);

  console.log("== Structuur ==");
  ok(result.views.length >= 1, "views gegenereerd");
  const view = result.views[0];
  ok(view.path === "glowify-thuis", "eerste view path = glowify-thuis");
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

  console.log("== Per-kamer subviews (Fase 5) ==");
  const subviews = result.views.filter((v: any) => v.subview === true);
  ok(subviews.length === 3, "één subview per kamer (woonkamer, badkamer, berging)");
  const wkSub = subviews.find((v: any) => v.path === "woonkamer") as any;
  ok(Boolean(wkSub) && wkSub.title === "Woonkamer", "subview met path=woonkamer en juiste titel");
  ok(wkSub.cards.some((c: any) => c.type === "picture-entity"), "subview toont dezelfde domeininhoud (camera)");
  ok(
    woonkamer.hold_action.navigation_path === "/lovelace/woonkamer",
    "lang indrukken navigeert naar de kamerpagina",
  );
  const bergingSub = subviews.find((v: any) => v.path === "berging") as any;
  ok(bergingSub.cards[0].type === "markdown", "lege kamer krijgt een nette placeholder");

  console.log("== Domein-views (Fase 10) ==");
  const domainPaths = ["lampen", "ventilatie", "zonwering", "schakelaars", "sloten"];
  ok(result.views[0].path === "glowify-thuis", "Thuis blijft de eerste view");
  ok(domainPaths.every((p) => result.views.some((v: any) => v.path === p)), "vijf domein-views aanwezig");
  const firstSubIdx = result.views.findIndex((v: any) => v.subview === true);
  const lampenIdx = result.views.findIndex((v: any) => v.path === "lampen");
  ok(lampenIdx > 0 && lampenIdx < firstSubIdx, "domein-views staan na Thuis en vóór de subviews");
  ok(result.views.filter((v: any) => domainPaths.includes(v.path)).every((v: any) => v.subview !== true), "domein-views zijn zichtbaar (geen subview)");

  const lampen = result.views.find((v: any) => v.path === "lampen") as any;
  ok(lampen.cards.some((c: any) => c.type === "custom:mushroom-title-card" && c.title === "Woonkamer"), "Lampen groepeert per kamer met een titeltje");
  const lampenJson = JSON.stringify(lampen.cards);
  ok(lampenJson.includes("light.woonkamer_leeslamp"), "individuele lamp in de Lampen-view");
  ok(!lampenJson.includes("light.verlichting_woonkamer"), "lichtgroep niet in de Lampen-view");

  const schak = result.views.find((v: any) => v.path === "schakelaars") as any;
  const schakJson = JSON.stringify(schak.cards);
  ok(schakJson.includes("switch.woonkamer_stopcontact"), "gewone schakelaar in de Schakelaars-view");
  ok(
    !schakJson.includes("cam_privacy") && !schakJson.includes("child_lock") && !schakJson.includes("geheim"),
    "camera-switch, werkregel en verberg gefilterd in de Schakelaars-view",
  );

  const sloten = result.views.find((v: any) => v.path === "sloten") as any;
  ok(JSON.stringify(sloten.cards).includes("lock.voordeur"), "slot in de Sloten-view");
  const venti = result.views.find((v: any) => v.path === "ventilatie") as any;
  ok(JSON.stringify(venti.cards).includes("fan.badkamer_ventilatie"), "ventilator in de Ventilatie-view");

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
    { type: "custom:glowify", options: { title: "Glowify" } },
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

  console.log("== Editor-dialoog logica (UX-2) ==");
  ok(
    JSON.stringify(buildAction({ action_type: "room_popup", room: "keuken" })) ===
      '{"action":"navigate","navigation_path":"#keuken"}',
    "room_popup → navigeer naar #kamer",
  );
  ok(buildAction({ action_type: "toggle" }).action === "toggle", "toggle → toggle-actie");
  ok(
    JSON.stringify(buildAction({ action_type: "script", entity: "script.foo" })) ===
      '{"action":"call-service","service":"script.foo"}',
    "script → roept het script als dienst aan",
  );
  const sceneAct = buildAction({ action_type: "scene", entity: "scene.avond" });
  ok(
    sceneAct.service === "scene.turn_on" && (sceneAct as any).target.entity_id === "scene.avond",
    "scene → scene.turn_on met de scene",
  );
  ok(buildAction({ action_type: "cover_open", entity: "cover.x" }).service === "cover.open_cover", "zonwering openen");
  ok(buildAction({ action_type: "cover_close", entity: "cover.x" }).service === "cover.close_cover", "zonwering sluiten");
  ok(buildAction({ action_type: "more_info" }).action === "more-info", "more-info-actie");
  ok(buildAction({ action_type: "navigate", path: "/lovelace/0" }).navigation_path === "/lovelace/0", "navigeer naar eigen pad");

  const chipItem = buildChipItem({ action_type: "toggle", entity: "light.x", icon: "mdi:lamp", color: "orange", text: "Licht" });
  ok(chipItem.entity === "light.x" && chipItem.icon_color === "orange" && chipItem.content === "Licht", "chip krijgt entiteit, kleur en tekst");
  const subItem = buildSubItem({ action_type: "toggle", entity: "fan.x", icon: "mdi:fan", color: "blue" });
  ok(subItem.entity === "fan.x" && subItem.color_when_active === "rgb(76, 128, 201)", "sub-knop krijgt entiteit en kleurtaal-rgb");
  ok(entityForItem({ action_type: "script", entity: "script.x" }) === undefined, "script-entiteit hangt niet op het item zelf");
  ok(targetFieldFor("room_popup") === "room" && targetFieldFor("navigate") === "path", "doelveld per actietype");
  ok(entityDomainFor("scene") === "scene" && entityDomainFor("toggle") === undefined, "entiteitkiezer-domeinfilter per actietype");

  console.log("== Opties worden echt gelezen (bugfix) ==");
  // Regressie: HA geeft {type, options}; de opties MOETEN doorwerken.
  const titled = await GlowifyStrategy.generate(
    { type: "custom:glowify", options: { title: "Mijn Huis" } },
    hass,
  );
  ok(titled.title === "Mijn Huis", "title-optie uit config.options wordt toegepast");
  // Legacy generateDashboard: opties genest onder config.strategy.options.
  const legacy = await GlowifyStrategy.generateDashboard({
    config: { strategy: { type: "custom:glowify", options: { title: "Legacy Huis" } } },
    hass,
  });
  ok(legacy.title === "Legacy Huis", "legacy generateDashboard leest de opties ook");

  console.log("== extra_chips en extra_sub_buttons in de output (bugfix) ==");
  _ls["glowify_edit_mode"] = "0";
  const withExtras = await GlowifyStrategy.generate(
    {
      type: "custom:glowify",
      options: {
        title: "Glowify",
        extra_chips: [{ icon: "mdi:cat", icon_color: "purple", content: "Kat" }],
        rooms: {
          woonkamer: {
            extra_sub_buttons: [
              { entity: "input_button.kat", icon: "mdi:cat", color_when_active: "purple" },
            ],
          },
        },
      },
    },
    hass,
  );
  const exChips = (withExtras.views[0].cards![0] as any).chips;
  const catIdx = exChips.findIndex((c: any) => c.icon === "mdi:cat");
  const scenesIdx = exChips.findIndex((c: any) => c.content === "Scenes");
  ok(catIdx > scenesIdx, "extra chip staat achteraan (na de vaste chips)");
  ok(exChips[catIdx].content === "Kat", "extra chip behoudt zijn inhoud");

  const exStacks = withExtras.views[0].cards!.filter((c: any) => c.type === "vertical-stack");
  const exWk = (exStacks.find((s: any) => s.cards[0].name === "Gelijkvloers") as any).cards.find((c: any) => c.name === "Woonkamer");
  const exSb = exWk.sub_button.map((b: any) => b.entity);
  // Volgorde (bewerkmodus uit): beweging, special, slot, zonwering, licht, licht.
  ok(exSb[0] === "binary_sensor.woonkamer_beweging", "beweging blijft uiterst links");
  ok(exSb[1] === "input_button.kat", "extra sub-knop links van de vaste knopjes");
  ok(exSb[2] === "lock.voordeur" && exSb[3] === "cover.woonkamer_rolluik", "vaste knopjes volgen rechts van de special");
  ok(exWk.styles.includes(".bubble-sub-button-2 { color:"), "special krijgt zijn kleurtaal-styling op de juiste index");

  await keyMatchScenario();
  await indexShiftScenario();
  await flattenedFormScenario();

  console.log(failures === 0 ? "\nALLE CHECKS GESLAAGD" : `\n${failures} CHECK(S) GEFAALD`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
