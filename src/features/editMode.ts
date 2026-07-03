import { reloadDashboard } from "./lovelaceApi";

/**
 * De bewerkmodus. Standaard uit: het dashboard toont enkel bediening. Aan:
 * de plusjes op de kamerbalken, de plus-chip en de opruim-chip verschijnen.
 * De stand wordt per browser onthouden in localStorage.
 *
 * De potlood-chip tikt met een fire-dom-event (`ll-custom`) dat de globale
 * listener hieronder opvangt; die toggelt de stand en herlaadt het dashboard,
 * waarna generate() de editor-affordances wel of niet meebouwt.
 */
const KEY = "glowify_edit_mode";
const EVENT_FLAG = "glowify_edit_toggle";

/** Leest de bewerkmodus veilig (buiten de browser = uit). */
export function isEditMode(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Zet de bewerkmodus expliciet aan of uit. */
export function setEditMode(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* geen localStorage beschikbaar */
  }
}

/** Toggelt de bewerkmodus en herlaadt het dashboard. */
export function toggleEditMode(): void {
  setEditMode(!isEditMode());
  reloadDashboard();
}

/** De tap_action voor de potlood-chip. */
export function editToggleAction(): Record<string, unknown> {
  return { action: "fire-dom-event", [EVENT_FLAG]: true };
}

/**
 * Installeert (één keer) de globale listener die het fire-dom-event van de
 * potlood-chip opvangt.
 */
export function installEditModeListener(): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { __glowifyEditListener?: boolean };
  if (w.__glowifyEditListener) return;
  w.__glowifyEditListener = true;
  window.addEventListener("ll-custom", (ev: Event) => {
    const detail = (ev as CustomEvent).detail;
    if (detail && detail[EVENT_FLAG]) toggleEditMode();
  });
}
