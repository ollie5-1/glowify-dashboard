import { GlowifyRegistry } from "./registry";
import type { LovelaceCardConfig } from "./types/homeassistant";
import type { GlowifyAction } from "./types/options";

/**
 * De vier kamerneutrale Glowify-scènes. Kleuren mee als paars (speciale
 * stand). Elke scène roept een script aan met het veld `doelgroep` gevuld
 * met de lichtgroep van de kamer, en leest zijn waarden uit de schuifjes.
 */
export interface SceneDef {
  key: string;
  label: string;
  icon: string;
  service: string;
}

export const SCENES: SceneDef[] = [
  { key: "gezellig", label: "Gezellig", icon: "mdi:candle", service: "script.glowify_scene_gezellig" },
  { key: "relax", label: "Relax", icon: "mdi:sofa", service: "script.glowify_scene_relax" },
  { key: "normaal", label: "Normaal", icon: "mdi:brightness-6", service: "script.glowify_scene_normaal" },
  { key: "fel", label: "Fel", icon: "mdi:white-balance-sunny", service: "script.glowify_scene_fel" },
];

/** De twee schuifjes (helderheid + kleurtemperatuur) per scène. */
export function sceneSliders(): string[] {
  const ids: string[] = [];
  for (const s of SCENES) {
    ids.push(`input_number.glowify_${s.key}_helderheid`);
    ids.push(`input_number.glowify_${s.key}_kleurtemperatuur`);
  }
  return ids;
}

/** Bouwt de vier scenechips voor een lichtgroep (doelgroep). */
export function buildSceneChips(lightGroup: string): LovelaceCardConfig {
  return {
    type: "custom:mushroom-chips-card",
    alignment: "center",
    chips: SCENES.map((s) => ({
      type: "template",
      icon: s.icon,
      icon_color: "purple",
      content: s.label,
      tap_action: {
        action: "call-service",
        service: s.service,
        data: { doelgroep: lightGroup },
      },
    })),
  };
}

/**
 * Het snelpaneel: tik op het lampknopje bij licht UIT zet het licht aan én
 * opent een browser_mod-pop-up van 13 seconden met de drie lichtregelaars
 * en de vier scenechips. Wordt als tap_action op het licht-trigger-knopje
 * gezet (fire-dom-event).
 */
export function buildLightPanelAction(lightGroup: string, roomName: string): GlowifyAction {
  return {
    action: "fire-dom-event",
    browser_mod: {
      service: "browser_mod.sequence",
      data: {
        sequence: [
          { service: "light.turn_on", data: { entity_id: lightGroup } },
          {
            service: "browser_mod.popup",
            data: {
              title: `Verlichting ${roomName}`,
              timeout: 13000,
              content: {
                type: "vertical-stack",
                cards: [
                  {
                    type: "tile",
                    entity: lightGroup,
                    features: [
                      { type: "light-brightness" },
                      { type: "light-color-temp" },
                      { type: "light-color-favorites" },
                    ],
                  },
                  buildSceneChips(lightGroup),
                ],
              },
            },
          },
        ],
      },
    },
  };
}

/**
 * De Scene-instellingen pop-up (#instellingen), aangesproken via de
 * Scenes-chip. Toont de acht schuifjes; ontbreken ze, dan een hint om de
 * Glowify backend-blokken te installeren.
 */
export function buildSceneSettingsPopup(reg: GlowifyRegistry): LovelaceCardConfig {
  const present = sceneSliders().filter((id) => reg.hass.states[id]);
  const inner: LovelaceCardConfig =
    present.length > 0
      ? { type: "entities", entities: present }
      : {
          type: "markdown",
          content:
            "De scene-schuifjes zijn niet gevonden. Installeer de Glowify " +
            "backend-blokken (input_number's `glowify_*_helderheid` en " +
            "`glowify_*_kleurtemperatuur`) in configuration.yaml.",
        };

  return {
    type: "custom:bubble-card",
    card_type: "pop-up",
    hash: "#instellingen",
    name: "Scene-instellingen",
    icon: "mdi:tune",
    show_header: true,
    cards: [inner],
  };
}
