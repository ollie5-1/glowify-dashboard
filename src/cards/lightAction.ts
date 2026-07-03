import type { GlowifyAction } from "../types/options";

/**
 * Acties voor de twee licht-sub-knopjes op een kamerbalk.
 *
 * Fase 1 houdt de trigger eenvoudig (licht aan). In Fase 3 wordt de trigger
 * vervangen door een browser_mod-sequence: licht aan + een pop-up van 13s met
 * drie lichtregelaars en vier scenechips. De aanroepende code hoeft dan enkel
 * deze functie te vervangen.
 */
export function lightTriggerAction(lightGroup: string): GlowifyAction {
  return {
    action: "call-service",
    service: "light.turn_on",
    target: { entity_id: lightGroup },
  };
}

/** Uit-knopje: zet de lichtgroep uit. */
export function lightOffAction(lightGroup: string): GlowifyAction {
  return {
    action: "call-service",
    service: "light.turn_off",
    target: { entity_id: lightGroup },
  };
}
