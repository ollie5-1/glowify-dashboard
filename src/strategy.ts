import deepmerge from "deepmerge";
import { GlowifyRegistry } from "./registry";
import { buildFloorModel } from "./model/floorModel";
import { buildHomeView } from "./views/homeView";
import { buildDomainViews } from "./views/domainViews";
import { buildRoomSubview } from "./views/roomSubview";
import { isEditMode } from "./features/editMode";
import { getDashboardBasePath } from "./features/lovelaceApi";
import { debugHeader, diagnoseEntrypoint, safeClone } from "./debug";
import type {
  DashboardStrategyInfo,
  HomeAssistant,
  LovelaceConfig,
  LovelaceViewConfig,
} from "./types/homeassistant";
import type { GlowifyStrategyOptions } from "./types/options";

/**
 * Sleutels die géén Glowify-optie zijn maar de config-structuur vormen; die
 * horen niet mee in de afgeplatte optie-extractie.
 */
const STRUCTURAL_KEYS = new Set(["type", "options", "strategy", "hass", "config", "views"]);

/** De strategy-config zoals HA ze aan generate() kan doorgeven. */
interface StrategyGenerateConfig {
  type?: string;
  options?: GlowifyStrategyOptions;
  strategy?: { options?: GlowifyStrategyOptions };
  hass?: HomeAssistant;
  config?: StrategyGenerateConfig;
  [key: string]: unknown;
}

/**
 * De Glowify dashboard-strategie.
 *
 * `generate(config, hass)` is de moderne 2026.5-API; `generateDashboard(info)`
 * is de legacy-vorm die HA nog aanroept. Beide leiden naar dezelfde bouwer.
 */
export class GlowifyStrategy {
  /**
   * Moderne API (HA 2026.5+). HA geeft het strategy-config-object zelf door,
   * dus de opties staan op `config.options`. We accepteren ook de geneste
   * vorm `config.strategy.options` als extra vangnet.
   */
  static async generate(
    config: StrategyGenerateConfig,
    hass: HomeAssistant,
  ): Promise<LovelaceConfig> {
    diagnoseEntrypoint("generate(config, hass)", [config, hass]);
    const realHass = hass ?? config?.hass ?? config?.config?.hass;
    return GlowifyStrategy.build(realHass, GlowifyStrategy.extractOptions(config));
  }

  /** Legacy API (achterwaartse compatibiliteit). info.config is de volledige config. */
  static async generateDashboard(
    info: DashboardStrategyInfo,
  ): Promise<LovelaceConfig> {
    diagnoseEntrypoint("generateDashboard(info)", [info]);
    return GlowifyStrategy.build(info.hass, GlowifyStrategy.extractOptions(info.config));
  }

  /**
   * Haalt de opties vorm-onafhankelijk uit de config. HA geeft de opties in
   * de praktijk AFGEPLAT door: `generate({type, ...opties}, hass)` — dus zonder
   * `options`-sleutel (bevestigd via de entrypoint-diagnostiek). We mergen over
   * de drie mogelijke bronnen, in oplopende voorrang zodat de afgeplatte vorm
   * wint:
   *   (3) legacy genest: config.strategy.options (of via config.config)
   *   (2) modern genest: config.options
   *   (1) afgeplat: alle top-level sleutels behalve de structurele
   */
  private static extractOptions(
    config: StrategyGenerateConfig | undefined,
  ): GlowifyStrategyOptions | undefined {
    if (!config || typeof config !== "object") return undefined;

    const sources: GlowifyStrategyOptions[] = [];

    // (3) legacy genest — laagste voorrang.
    const legacy =
      config.strategy?.options ??
      config.config?.strategy?.options ??
      config.config?.options;
    if (legacy && typeof legacy === "object") sources.push(legacy);

    // (2) modern genest onder options.
    if (config.options && typeof config.options === "object") {
      sources.push(config.options);
    }

    // (1) afgeplatte top-level sleutels (de vorm die HA werkelijk gebruikt),
    //     behalve de structurele sleutels — hoogste voorrang.
    const flat: Record<string, unknown> = {};
    let hasFlat = false;
    for (const key of Object.keys(config)) {
      if (STRUCTURAL_KEYS.has(key)) continue;
      flat[key] = (config as Record<string, unknown>)[key];
      hasFlat = true;
    }
    if (hasFlat) sources.push(flat as GlowifyStrategyOptions);

    if (sources.length === 0) return undefined;
    // Merge met stijgende voorrang: latere bron overschrijft de vorige.
    return sources.reduce(
      (acc, src) => deepmerge(acc, src) as GlowifyStrategyOptions,
      {} as GlowifyStrategyOptions,
    );
  }

  private static async build(
    hass: HomeAssistant,
    rawOptions: GlowifyStrategyOptions | undefined,
  ): Promise<LovelaceConfig> {
    const reg = await GlowifyRegistry.create(hass, rawOptions);

    if (reg.options.debug) {
      debugHeader();
      // eslint-disable-next-line no-console
      console.log("Ruwe opties die generate() ontving:", safeClone(rawOptions));
      // eslint-disable-next-line no-console
      console.log("Opties na merge met defaults:", safeClone(reg.options));
      // eslint-disable-next-line no-console
      console.log("rooms-sleutels in de opties:", Object.keys(reg.options.rooms ?? {}));
    }

    const floors = buildFloorModel(reg);
    const basePath = getDashboardBasePath();
    const homeView = buildHomeView(reg, floors, isEditMode(), basePath);

    // Domein-tabbladen (Lampen, Ventilatie, Zonwering, Schakelaars, Sloten).
    const domainViews = buildDomainViews(reg, floors);

    // Per kamer een subview (lang indrukken op de kamerbalk), verborgen uit
    // de tabbladbalk.
    const subviews: LovelaceViewConfig[] = [];
    for (const floor of floors) {
      for (const room of floor.rooms) {
        subviews.push(buildRoomSubview(reg, room));
      }
    }

    return {
      title: reg.options.title ?? "Glowify",
      views: [homeView, ...domainViews, ...subviews],
    };
  }
}
