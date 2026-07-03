import { addExtraChip, addExtraSubButton } from "./pure";
import { reloadDashboard, updateStrategyOptions } from "./lovelaceApi";
import type { HomeAssistant } from "../types/homeassistant";
import type { ExtraChip, ExtraSubButton, GlowifyAction } from "../types/options";

interface PlusEditorConfig {
  type: string;
  /** 'chip' voegt een chip toe aan de rij; 'sub_button' aan een kamerbalk. */
  mode: "chip" | "sub_button";
  /** Vereist bij mode 'sub_button': de area waaraan toegevoegd wordt. */
  area?: string;
  /** Weergavenaam van de kamer (voor de titel). */
  area_name?: string;
}

const KLEUR_KEUZES: { label: string; value: string }[] = [
  { label: "Oranje (comfort)", value: "orange" },
  { label: "Blauw (lucht)", value: "blue" },
  { label: "Paars (stand)", value: "purple" },
  { label: "Groen (veilig)", value: "green" },
  { label: "Rood (aandacht)", value: "red" },
  { label: "Grijs (neutraal)", value: "grey" },
];

/**
 * De plusknop-editor: een dialoog waarmee je een chip of een sub-knopje
 * samenstelt (icoon, kleur, tekst, actie) en dat via de lovelace-API in de
 * strategie-opties bewaart. Daarna vernieuwt het dashboard zichzelf.
 */
export class GlowifyPlusEditor extends HTMLElement {
  private _config?: PlusEditorConfig;
  private _hass?: HomeAssistant;
  private _rendered = false;

  setConfig(config: PlusEditorConfig): void {
    this._config = config;
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (!this._rendered) this.render();
  }

  private render(): void {
    if (!this._config) return;
    this._rendered = true;
    const isChip = this._config.mode === "chip";
    const titel = isChip
      ? "Chip toevoegen"
      : `Knopje toevoegen — ${this._config.area_name ?? this._config.area ?? ""}`;

    this.innerHTML = `
      <style>
        .glowify-editor { padding: 16px; display: grid; gap: 12px; max-width: 420px; }
        .glowify-editor h2 { margin: 0 0 4px; font-size: 1.1rem; }
        .glowify-editor label { display: grid; gap: 4px; font-size: .85rem; }
        .glowify-editor input, .glowify-editor select {
          padding: 8px; border-radius: 8px; border: 1px solid var(--divider-color, #ccc);
          background: var(--card-background-color, #fff); color: var(--primary-text-color, #000);
          font-size: .95rem;
        }
        .glowify-editor .row { display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px; }
        .glowify-editor button {
          padding: 8px 16px; border-radius: 999px; border: none; cursor: pointer; font-weight: 600;
        }
        .glowify-editor .save { background: var(--primary-color, #EC7622); color: #fff; }
        .glowify-editor .cancel { background: transparent; color: var(--primary-text-color, #000); }
        .glowify-editor .err { color: #c62828; font-size: .85rem; min-height: 1em; }
      </style>
      <div class="glowify-editor">
        <h2>${titel}</h2>
        <label>Tekst<input id="g-text" type="text" placeholder="Bijv. Kattenstand" /></label>
        <label>Icoon<input id="g-icon" type="text" value="mdi:star" placeholder="mdi:..." /></label>
        <label>Kleur
          <select id="g-color">
            ${KLEUR_KEUZES.map((k) => `<option value="${k.value}">${k.label}</option>`).join("")}
          </select>
        </label>
        <label>Actie
          <select id="g-action">
            <option value="navigate">Navigeren (pop-up/pad)</option>
            <option value="toggle">Aan/uit (entiteit)</option>
            <option value="call-service">Script/dienst aanroepen</option>
            <option value="none">Geen</option>
          </select>
        </label>
        <label id="g-target-wrap">Doel<input id="g-target" type="text" placeholder="#keuken / light.x / script.y" /></label>
        <div class="err" id="g-err"></div>
        <div class="row">
          <button class="cancel" id="g-cancel">Annuleren</button>
          <button class="save" id="g-save">Toevoegen</button>
        </div>
      </div>`;

    const q = <T extends HTMLElement>(id: string) => this.querySelector(id) as T;
    q<HTMLButtonElement>("#g-cancel").addEventListener("click", () => this.close());
    q<HTMLButtonElement>("#g-save").addEventListener("click", () => this.save());
  }

  private buildAction(actionType: string, target: string): GlowifyAction {
    switch (actionType) {
      case "navigate":
        return { action: "navigate", navigation_path: target };
      case "toggle":
        return { action: "toggle" };
      case "call-service":
        return { action: "call-service", service: target };
      default:
        return { action: "none" };
    }
  }

  private async save(): Promise<void> {
    if (!this._hass || !this._config) return;
    const errEl = this.querySelector("#g-err") as HTMLElement;
    const text = (this.querySelector("#g-text") as HTMLInputElement).value.trim();
    const icon = (this.querySelector("#g-icon") as HTMLInputElement).value.trim() || "mdi:star";
    const color = (this.querySelector("#g-color") as HTMLSelectElement).value;
    const actionType = (this.querySelector("#g-action") as HTMLSelectElement).value;
    const target = (this.querySelector("#g-target") as HTMLInputElement).value.trim();
    const action = this.buildAction(actionType, target);

    try {
      if (this._config.mode === "chip") {
        const chip: ExtraChip = { icon, icon_color: color, content: text, tap_action: action };
        if (actionType === "toggle" && target) chip.entity = target;
        await updateStrategyOptions(this._hass, (opts) => addExtraChip(opts, chip));
      } else {
        const area = this._config.area;
        if (!area) throw new Error("Geen kamer opgegeven.");
        const sub: ExtraSubButton = { icon, tap_action: action, color_when_active: this.rgbFor(color) };
        if (actionType === "toggle" && target) sub.entity = target;
        await updateStrategyOptions(this._hass, (opts) => addExtraSubButton(opts, area, sub));
      }
      reloadDashboard();
    } catch (e) {
      errEl.textContent = e instanceof Error ? e.message : String(e);
    }
  }

  /** Vertaalt een HA-kleurnaam naar de rgb voor een sub-knopje-kleur. */
  private rgbFor(color: string): string {
    const map: Record<string, string> = {
      orange: "var(--primary-color)",
      blue: "rgb(76, 128, 201)",
      purple: "rgb(142, 47, 137)",
      green: "rgb(46, 125, 50)",
      red: "rgb(229, 57, 53)",
      grey: "grey",
    };
    return map[color] ?? "var(--primary-color)";
  }

  private close(): void {
    const dialog = this.closest("ha-dialog") as (HTMLElement & { close?: () => void }) | null;
    dialog?.close?.();
  }

  /** Grootte-hint voor Lovelace. */
  getCardSize(): number {
    return 6;
  }
}
