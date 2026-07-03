import { addExtraChip, addExtraSubButton } from "./pure";
import { reloadDashboard, updateStrategyOptions } from "./lovelaceApi";
import {
  ACTION_TYPES,
  GLOWIFY_COLORS,
  buildChipItem,
  buildSubItem,
  entityDomainFor,
  targetFieldFor,
  type EditorData,
} from "./editorLogic";
import type { AreaRegistryEntry, HomeAssistant } from "../types/homeassistant";

interface PlusEditorConfig {
  type: string;
  mode: "chip" | "sub_button";
  area?: string;
  area_name?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyEl = HTMLElement & Record<string, any>;

const LABELS: Record<string, string> = {
  text: "Tekst",
  icon: "Icoon",
  color: "Kleur",
  action_type: "Actie",
  room: "Kamer",
  entity: "Toestel",
  path: "Pad",
};

/**
 * De plusknop-editor-dialoog. Gebruikt de native HA-formuliercomponenten
 * (ha-form met entity- en icon-selectors) voor een echte entiteiten- en
 * icoonkiezer, een Glowify-kleurkeuze en een actiekeuzelijst. Onderaan toont
 * ze een live voorbeeld van het knopje. Bij bevestigen wordt de toevoeging via
 * de lovelace-API in de strategie-opties bewaard en vernieuwt het dashboard.
 */
export class GlowifyPlusEditor extends HTMLElement {
  private _config?: PlusEditorConfig;
  private _hass?: HomeAssistant;
  private _data: EditorData = { icon: "mdi:star", color: "orange", action_type: "room_popup" };
  private _rooms: { value: string; label: string }[] = [];
  private _initialized = false;
  private _form?: AnyEl;
  private _preview?: HTMLElement;
  private _lastActionType?: string;

  setConfig(config: PlusEditorConfig): void {
    this._config = config;
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
    if (!this._initialized) {
      this._initialized = true;
      void this.init();
    }
  }

  private async init(): Promise<void> {
    if (!this._hass) return;
    try {
      const areas = await this._hass.callWS<AreaRegistryEntry[]>({
        type: "config/area_registry/list",
      });
      this._rooms = areas
        .map((a) => ({ value: a.area_id, label: a.name }))
        .sort((a, b) => a.label.localeCompare(b.label, "nl"));
    } catch {
      this._rooms = [];
    }
    this.build();
  }

  private isChip(): boolean {
    return this._config?.mode === "chip";
  }

  /** Bouwt het ha-form-schema op basis van modus en gekozen actie. */
  private schema(): any[] {
    const schema: any[] = [];
    if (this.isChip()) {
      schema.push({ name: "text", selector: { text: {} } });
    }
    schema.push({ name: "icon", selector: { icon: {} } });
    schema.push({
      name: "color",
      selector: { select: { mode: "dropdown", options: GLOWIFY_COLORS.map((c) => ({ value: c.value, label: c.label })) } },
    });
    schema.push({
      name: "action_type",
      selector: { select: { mode: "dropdown", options: ACTION_TYPES } },
    });

    const target = targetFieldFor(this._data.action_type);
    if (target === "room") {
      schema.push({ name: "room", selector: { select: { mode: "dropdown", options: this._rooms } } });
    } else if (target === "entity") {
      const domain = entityDomainFor(this._data.action_type);
      schema.push({ name: "entity", selector: { entity: domain ? { domain } : {} } });
    } else if (target === "path") {
      schema.push({ name: "path", selector: { text: {} } });
    }
    return schema;
  }

  private build(): void {
    if (!this._config) return;
    const titel = this.isChip()
      ? "Chip toevoegen"
      : `Knopje toevoegen — ${this._config.area_name ?? this._config.area ?? ""}`;

    this.innerHTML = `
      <style>
        .gpe { padding: 16px; display: grid; gap: 14px; max-width: 460px; }
        .gpe h2 { margin: 0; font-size: 1.15rem; }
        .gpe .preview-wrap { display: grid; gap: 6px; }
        .gpe .preview-label { font-size: .75rem; color: var(--secondary-text-color, #777); }
        .gpe .preview { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px;
          border-radius: 999px; background: var(--secondary-background-color, #f2f2f2); width: max-content; }
        .gpe .preview ha-icon { --mdc-icon-size: 22px; }
        .gpe .preview span { font-size: .9rem; }
        .gpe .row { display: flex; gap: 8px; justify-content: flex-end; }
        .gpe button { padding: 9px 18px; border-radius: 999px; border: none; cursor: pointer; font-weight: 600; }
        .gpe .save { background: var(--primary-color, #EC7622); color: #fff; }
        .gpe .cancel { background: transparent; color: var(--primary-text-color, #000); }
        .gpe .err { color: #c62828; font-size: .85rem; min-height: 1em; }
      </style>
      <div class="gpe">
        <h2>${titel}</h2>
        <div id="gpe-form"></div>
        <div class="preview-wrap">
          <div class="preview-label">Voorbeeld</div>
          <div class="preview" id="gpe-preview"></div>
        </div>
        <div class="err" id="gpe-err"></div>
        <div class="row">
          <button class="cancel" id="gpe-cancel">Annuleren</button>
          <button class="save" id="gpe-save">Toevoegen</button>
        </div>
      </div>`;

    const form = document.createElement("ha-form") as AnyEl;
    form.hass = this._hass;
    form.schema = this.schema();
    form.data = this._data;
    form.computeLabel = (s: { name: string }) => LABELS[s.name] ?? s.name;
    form.addEventListener("value-changed", (e: Event) => this.onChange(e));
    (this.querySelector("#gpe-form") as HTMLElement).appendChild(form);
    this._form = form;
    this._lastActionType = this._data.action_type;

    this._preview = this.querySelector("#gpe-preview") as HTMLElement;
    this.updatePreview();

    (this.querySelector("#gpe-cancel") as HTMLButtonElement).addEventListener("click", () => this.close());
    (this.querySelector("#gpe-save") as HTMLButtonElement).addEventListener("click", () => this.save());
  }

  private onChange(e: Event): void {
    this._data = (e as CustomEvent).detail.value as EditorData;
    if (this._data.action_type !== this._lastActionType) {
      this._lastActionType = this._data.action_type;
      if (this._form) this._form.schema = this.schema();
    }
    this.updatePreview();
  }

  private updatePreview(): void {
    if (!this._preview) return;
    const color = GLOWIFY_COLORS.find((c) => c.value === this._data.color) ?? GLOWIFY_COLORS[0];
    const icon = this._data.icon || "mdi:star";
    const text = this.isChip() ? this._data.text ?? "" : "";
    this._preview.innerHTML = `<ha-icon icon="${icon}" style="color:${color.rgb}"></ha-icon>${text ? `<span>${this.escape(text)}</span>` : ""}`;
  }

  private async save(): Promise<void> {
    if (!this._hass || !this._config) return;
    const errEl = this.querySelector("#gpe-err") as HTMLElement;
    try {
      if (this.isChip()) {
        const chip = buildChipItem(this._data);
        await updateStrategyOptions(this._hass, (opts) => addExtraChip(opts, chip));
      } else {
        const area = this._config.area;
        if (!area) throw new Error("Geen kamer opgegeven.");
        const sub = buildSubItem(this._data);
        await updateStrategyOptions(this._hass, (opts) => addExtraSubButton(opts, area, sub));
      }
      reloadDashboard();
    } catch (e) {
      errEl.textContent = e instanceof Error ? e.message : String(e);
    }
  }

  private escape(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  private close(): void {
    const dialog = this.closest("ha-dialog") as (HTMLElement & { close?: () => void }) | null;
    dialog?.close?.();
  }

  getCardSize(): number {
    return 8;
  }
}
