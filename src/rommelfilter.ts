/**
 * De rommelfilter uit de Glowify dashboard-standaard: entiteiten die
 * technische ruis zijn (werkregelpatronen) en nooit in een pop-up horen.
 *
 * Exact overgenomen uit het referentiebestand (de reject-search-lijst in
 * de auto-entities-template), zodat de strategie dezelfde uitkomst geeft.
 */
export const WERKREGEL_PATRONEN: string[] = [
  "network_indicator",
  "turbo_mode",
  "detach_relay",
  "delayed_power",
  "child_lock",
  "led_enable",
  "led_indication",
  "led_night_mode",
  "do_not_disturb",
  "power_on_behavior",
  "open_window",
  "smart_temperature",
];

/** Naam van het label waarmee een entiteit overal verborgen wordt. */
export const VERBERG_LABEL = "verberg";

/** Regex die matcht op eender welk werkregelpatroon in een entity_id. */
const WERKREGEL_REGEX = new RegExp(WERKREGEL_PATRONEN.join("|"));

/** True wanneer de entity_id een werkregel-/ruispatroon bevat. */
export function isWerkregel(entityId: string): boolean {
  return WERKREGEL_REGEX.test(entityId);
}
