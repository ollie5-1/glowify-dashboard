import { VERBERG_LABEL } from "../rommelfilter";
import type {
  EntityRegistryEntry,
  HomeAssistant,
  LabelRegistryEntry,
} from "../types/homeassistant";
import type { GlowifyStrategyOptions } from "../types/options";

/** De ruwe, opgeslagen dashboard-config (het strategy-blok). */
export interface StoredLovelaceConfig {
  strategy?: { type?: string; options?: GlowifyStrategyOptions };
  [key: string]: unknown;
}

/**
 * Leidt het url_path van het huidige dashboard af uit de URL. Het standaard-
 * dashboard ("lovelace") vertaalt naar null, zoals de lovelace-WS-API verwacht.
 */
export function getDashboardUrlPath(): string | null {
  const seg = window.location.pathname.split("/").filter(Boolean)[0];
  if (!seg || seg === "lovelace") return null;
  return seg;
}

/** Leest de ruwe (opgeslagen) dashboard-config. */
export function loadConfig(
  hass: HomeAssistant,
  urlPath: string | null,
): Promise<StoredLovelaceConfig> {
  return hass.callWS<StoredLovelaceConfig>({
    type: "lovelace/config",
    url_path: urlPath,
    force: false,
  });
}

/** Schrijft de volledige dashboard-config terug (vereist admin). */
export function saveConfig(
  hass: HomeAssistant,
  urlPath: string | null,
  config: StoredLovelaceConfig,
): Promise<void> {
  return hass.callWS<void>({
    type: "lovelace/config/save",
    url_path: urlPath,
    config,
  });
}

/**
 * Past de strategie-opties van het huidige dashboard aan en slaat op. De
 * mutator krijgt de huidige opties en geeft de nieuwe terug. Werkt enkel op
 * een strategie-dashboard.
 */
export async function updateStrategyOptions(
  hass: HomeAssistant,
  mutate: (options: GlowifyStrategyOptions) => GlowifyStrategyOptions,
): Promise<void> {
  const urlPath = getDashboardUrlPath();
  const config = await loadConfig(hass, urlPath);
  if (!config.strategy) {
    throw new Error(
      "Dit dashboard is geen Glowify-strategie-dashboard; opties kunnen niet worden opgeslagen.",
    );
  }
  config.strategy.options = mutate(config.strategy.options ?? {});
  await saveConfig(hass, urlPath, config);
}

/**
 * Zoekt het "verberg"-label, of maakt het aan wanneer het nog niet bestaat.
 * Geeft het label_id terug.
 */
export async function ensureVerbergLabel(hass: HomeAssistant): Promise<string> {
  const labels = await hass.callWS<LabelRegistryEntry[]>({
    type: "config/label_registry/list",
  });
  const existing = labels.find((l) => l.name.toLowerCase() === VERBERG_LABEL);
  if (existing) return existing.label_id;

  const created = await hass.callWS<LabelRegistryEntry>({
    type: "config/label_registry/create",
    name: "verberg",
    icon: "mdi:eye-off",
    color: "grey",
  });
  return created.label_id;
}

/** Haalt de huidige labels van een entiteit op. */
export async function getEntityLabels(
  hass: HomeAssistant,
  entityId: string,
): Promise<string[]> {
  const entities = await hass.callWS<EntityRegistryEntry[]>({
    type: "config/entity_registry/list",
  });
  const entry = entities.find((e) => e.entity_id === entityId);
  return entry?.labels ?? [];
}

/** Schrijft een nieuwe labels-lijst naar een entiteit. */
export function setEntityLabels(
  hass: HomeAssistant,
  entityId: string,
  labels: string[],
): Promise<unknown> {
  return hass.callWS({
    type: "config/entity_registry/update",
    entity_id: entityId,
    labels,
  });
}

/** Vernieuwt het dashboard zodat de strategie opnieuw draait. */
export function reloadDashboard(): void {
  window.location.reload();
}

/**
 * Het basispad van het huidige dashboard (het eerste URL-segment), voor het
 * bouwen van absolute navigatiepaden naar subviews. Buiten de browser (tests)
 * valt het terug op "lovelace".
 */
export function getDashboardBasePath(): string {
  if (typeof window === "undefined") return "lovelace";
  return window.location.pathname.split("/").filter(Boolean)[0] ?? "lovelace";
}
