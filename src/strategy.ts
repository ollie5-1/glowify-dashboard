import { GlowifyRegistry } from "./registry";
import { buildFloorModel } from "./model/floorModel";
import { buildHomeView } from "./views/homeView";
import { buildDomainViews } from "./views/domainViews";
import { buildRoomSubview } from "./views/roomSubview";
import { isEditMode } from "./features/editMode";
import { getDashboardBasePath } from "./features/lovelaceApi";
import { debugHeader, safeClone } from "./debug";
import type {
  DashboardStrategyInfo,
  HomeAssistant,
  LovelaceConfig,
  LovelaceViewConfig,
} from "./types/homeassistant";
import type { GlowifyStrategyOptions } from "./types/options";

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
    const realHass = hass ?? config?.hass ?? config?.config?.hass;
    return GlowifyStrategy.build(realHass, GlowifyStrategy.extractOptions(config));
  }

  /** Legacy API (achterwaartse compatibiliteit). info.config is de volledige config. */
  static async generateDashboard(
    info: DashboardStrategyInfo,
  ): Promise<LovelaceConfig> {
    return GlowifyStrategy.build(info.hass, GlowifyStrategy.extractOptions(info.config));
  }

  /**
   * Haalt de opties uit gelijk welke config-vorm die HA kan doorgeven:
   *  - modern: het strategy-object zelf → `config.options`
   *  - vol dashboard: `config.strategy.options`
   *  - info-vorm: `config.config.(strategy.)options`
   */
  private static extractOptions(
    config: StrategyGenerateConfig | undefined,
  ): GlowifyStrategyOptions | undefined {
    if (!config) return undefined;
    return (
      config.options ??
      config.strategy?.options ??
      config.config?.options ??
      config.config?.strategy?.options
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
