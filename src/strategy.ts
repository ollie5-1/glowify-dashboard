import { GlowifyRegistry } from "./registry";
import { buildFloorModel, type FloorModel } from "./model/floorModel";
import type {
  DashboardStrategyInfo,
  HomeAssistant,
  LovelaceCardConfig,
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

    const homeView = GlowifyStrategy.buildHomeView(reg, floors);

    return {
      title: reg.options.title ?? "Glowify",
      views: [homeView],
    };
  }

  /**
   * Fase 0-skeleton: bewijst end-to-end werking (registratie → registries
   * → floors → rendering). De kamerbalken komen in Fase 1.
   */
  private static buildHomeView(
    reg: GlowifyRegistry,
    floors: FloorModel[],
  ): LovelaceViewConfig {
    const cards: LovelaceCardConfig[] = [];

    const roomCount = floors.reduce((n, f) => n + f.rooms.length, 0);
    cards.push({
      type: "markdown",
      content: [
        "## 🌟 Glowify Dashboard",
        "",
        `De strategie draait. Gevonden: **${floors.length}** verdieping(en), **${roomCount}** kamer(s).`,
        "",
        "_Fase 0-skeleton — de kamerbalken volgen in Fase 1._",
      ].join("\n"),
    });

    for (const floor of floors) {
      cards.push({
        type: "custom:bubble-card",
        card_type: "separator",
        name: floor.name,
        icon: floor.icon,
      });
      cards.push({
        type: "markdown",
        content: floor.rooms
          .map((r) => `- ${r.icon ? "" : ""}**${r.name}** \`#${r.areaId}\``)
          .join("\n"),
      });
    }

    return {
      title: reg.options.title ?? "Thuis",
      path: "glowify-thuis",
      icon: "mdi:home-heart",
      badges: [],
      cards,
    };
  }
}
