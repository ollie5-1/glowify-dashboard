import type { GlowifyStrategyOptions } from "../types/options";

interface StrategyConfig {
  type: string;
  options?: GlowifyStrategyOptions;
}

/**
 * Lichte config-editor voor de strategie-opties (getConfigElement). Toont het
 * kleine optieschema als bewerkbare JSON en stuurt `config-changed` uit.
 * De rijkere bediening zit in de plusknop-editor en de opruimmodus.
 */
export class GlowifyStrategyEditor extends HTMLElement {
  private _config: StrategyConfig = { type: "custom:glowify" };
  private _rendered = false;

  setConfig(config: StrategyConfig): void {
    this._config = config;
    if (!this._rendered) this.render();
  }

  set hass(_hass: unknown) {
    // Niet nodig voor deze editor.
  }

  private render(): void {
    this._rendered = true;
    const optionsJson = JSON.stringify(this._config.options ?? {}, null, 2);
    this.innerHTML = `
      <style>
        .ge { padding: 12px; display: grid; gap: 8px; }
        .ge textarea { width: 100%; min-height: 260px; font-family: monospace; font-size: .85rem;
          padding: 8px; border-radius: 8px; border: 1px solid var(--divider-color,#ccc);
          background: var(--card-background-color,#fff); color: var(--primary-text-color,#000); box-sizing: border-box; }
        .ge .hint { font-size: .8rem; color: var(--secondary-text-color,#666); }
        .ge .err { color: #c62828; font-size: .8rem; min-height: 1em; }
      </style>
      <div class="ge">
        <div class="hint">Glowify-opties (JSON): title, light_group_prefix, rooms, floors, manual_floors, hidden_areas, extra_chips.</div>
        <textarea id="ge-opts" spellcheck="false">${this.escape(optionsJson)}</textarea>
        <div class="err" id="ge-err"></div>
      </div>`;

    const ta = this.querySelector("#ge-opts") as HTMLTextAreaElement;
    const err = this.querySelector("#ge-err") as HTMLElement;
    ta.addEventListener("input", () => {
      try {
        const options = JSON.parse(ta.value) as GlowifyStrategyOptions;
        err.textContent = "";
        this._config = { ...this._config, options };
        this.dispatchEvent(
          new CustomEvent("config-changed", {
            detail: { config: this._config },
            bubbles: true,
            composed: true,
          }),
        );
      } catch (e) {
        err.textContent = "Ongeldige JSON: " + (e instanceof Error ? e.message : String(e));
      }
    });
  }

  private escape(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}
