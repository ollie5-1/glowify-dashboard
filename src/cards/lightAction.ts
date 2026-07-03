import type { GlowifyAction } from "../types/options";

/**
 * Uit-knopje van de kamerbalk: zet de lichtgroep uit.
 *
 * Het aan-/trigger-knopje gebruikt het browser_mod-snelpaneel
 * (zie scenes.ts, buildLightPanelAction).
 */
export function lightOffAction(lightGroup: string): GlowifyAction {
  return {
    action: "call-service",
    service: "light.turn_off",
    target: { entity_id: lightGroup },
  };
}
