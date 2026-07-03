import { GlowifyRegistry } from "./registry";
import { buildFloorModel } from "./model/floorModel";
import { buildHomeView } from "./views/homeView";
import { buildRoomSubview } from "./views/roomSubview";
import { isEditMode } from "./features/editMode";
import { getDashboardBasePath } from "./features/lovelaceApi";
import type {
  DashboardStrategyInfo,
  HomeAssistant,
  LovelaceConfig,
  LovelaceViewConfig,
} from "./types/homeassistant";
import type { GlowifyStrategyOptions } from "./types/options";

/**
 * De Glowify dashboard-strategie.
 *
 * `generate(config, hass)` is de moderne 2026.5-API; `generateDashboard(info)`
 * is de legacy-vorm die HA nog aanroept. Beide leiden naar dezelfde bouwer.
 */
export class GlowifyStrategy {
  /** Moderne API (HA 2026.5+). */
  static async generate(
    config: { strategy?: { options?: GlowifyStrategyOptions } },
    hass: HomeAssistant,
  ): Promise<LovelaceConfig> {
    return GlowifyStrategy.build(hass, config?.strategy?.options);
  }

  /** Legacy API (achterwaartse compatibiliteit). */
  static async generateDashboard(
    info: DashboardStrategyInfo,
  ): Promise<LovelaceConfig> {
    return GlowifyStrategy.build(info.hass, info.config?.strategy?.options);
  }

  private static async build(
    hass: HomeAssistant,
    rawOptions: GlowifyStrategyOptions | undefined,
  ): Promise<LovelaceConfig> {
    const reg = await GlowifyRegistry.create(hass, rawOptions);
    const floors = buildFloorModel(reg);
    const basePath = getDashboardBasePath();
    const homeView = buildHomeView(reg, floors, isEditMode(), basePath);

    // Per kamer een subview (lang indrukken op de kamerbalk).
    const subviews: LovelaceViewConfig[] = [];
    for (const floor of floors) {
      for (const room of floor.rooms) {
        subviews.push(buildRoomSubview(reg, room));
      }
    }

    return {
      title: reg.options.title ?? "Glowify",
      views: [homeView, ...subviews],
    };
  }
}
