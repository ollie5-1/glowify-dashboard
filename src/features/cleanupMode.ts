import { toggleVerbergLabel } from "./pure";
import {
  ensureVerbergLabel,
  reloadDashboard,
  setEntityLabels,
} from "./lovelaceApi";
import { isWerkregel } from "../rommelfilter";
import { GlowifyRegistry } from "../registry";
import type {
  AreaRegistryEntry,
  EntityRegistryEntry,
  HomeAssistant,
} from "../types/homeassistant";

/** Domeinen die de opruimlijst toont (de zichtbare, bedienbare toestellen). */
const TOONBARE_DOMEINEN = new Set([
  "camera", "light", "cover", "fan", "switch", "lock", "climate", "media_player", "sensor", "binary_sensor",
]);

interface Row {
  entityId: string;
  naam: string;
  areaNaam: string;
  labels: string[];
}

/**
 * De opruimmodus: een bewerkstand die per toestel een wegklik-knopje geeft
 * dat de entiteit het label "verberg" toekent via de websocket-API, met een
 * beheerlijst om verborgen toestellen weer terug te halen.
 */
export class GlowifyCleanup extends HTMLElement {
  private _hass?: HomeAssistant;
  private _rendered = false;
  private _verbergId = "";
  private _rows: Row[] = [];
  private _filter = "";

  setConfig(): void {
    // Geen configuratie nodig.
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (!this._rendered) {
      this._rendered = true;
      void this.init();
    }
  }

  private async init(): Promise<void> {
    if (!this._hass) return;
    this.innerHTML = `<div style="padding:16px">Opruimlijst laden…</div>`;
    this._verbergId = await ensureVerbergLabel(this._hass);
    await this.loadRows();
    this.render();
  }

  private async loadRows(): Promise<void> {
    if (!this._hass) return;
    const [areas, entities] = await Promise.all([
      this._hass.callWS<AreaRegistryEntry[]>({ type: "config/area_registry/list" }),
      this._hass.callWS<EntityRegistryEntry[]>({ type: "config/entity_registry/list" }),
    ]);
    const devices = await this._hass.callWS<{ id: string; area_id: string | null }[]>({
      type: "config/device_registry/list",
    });
    const deviceArea = new Map(devices.map((d) => [d.id, d.area_id]));
    const areaName = new Map(areas.map((a) => [a.area_id, a.name]));

    this._rows = [];
    for (const e of entities) {
      const domain = GlowifyRegistry.domainOf(e.entity_id);
      if (!TOONBARE_DOMEINEN.has(domain)) continue;
      if (isWerkregel(e.entity_id)) continue;
      const areaId = e.area_id ?? (e.device_id ? deviceArea.get(e.device_id) ?? null : null);
      if (!areaId) continue;
      this._rows.push({
        entityId: e.entity_id,
        naam: this._hass.states[e.entity_id]?.attributes?.friendly_name ?? e.entity_id,
        areaNaam: areaName.get(areaId) ?? areaId,
        labels: e.labels ?? [],
      });
    }
    this._rows.sort((a, b) =>
      a.areaNaam.localeCompare(b.areaNaam, "nl") || a.naam.localeCompare(b.naam, "nl"),
    );
  }

  private isHidden(row: Row): boolean {
    return row.labels.includes(this._verbergId);
  }

  private render(): void {
    const filter = this._filter.toLowerCase();
    const zichtbaar = this._rows.filter(
      (r) => !filter || r.naam.toLowerCase().includes(filter) || r.entityId.includes(filter),
    );

    this.innerHTML = `
      <style>
        .gc { padding: 16px; display: grid; gap: 10px; max-width: 520px; }
        .gc h2 { margin: 0; font-size: 1.1rem; }
        .gc .hint { font-size: .8rem; color: var(--secondary-text-color, #666); }
        .gc input[type=text] { padding: 8px; border-radius: 8px; border: 1px solid var(--divider-color,#ccc);
          background: var(--card-background-color,#fff); color: var(--primary-text-color,#000); }
        .gc .list { max-height: 50vh; overflow: auto; display: grid; gap: 4px; }
        .gc .item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px;
          background: var(--secondary-background-color, #f2f2f2); }
        .gc .item.hidden { opacity: .55; }
        .gc .item .naam { flex: 1; font-size: .9rem; }
        .gc .item .area { font-size: .72rem; color: var(--secondary-text-color,#666); }
        .gc button.act { border: none; border-radius: 999px; padding: 5px 12px; cursor: pointer; font-weight: 600; font-size: .8rem; }
        .gc .verberg { background: var(--primary-color,#EC7622); color: #fff; }
        .gc .toon { background: transparent; color: var(--primary-color,#EC7622); border: 1px solid var(--primary-color,#EC7622) !important; }
        .gc .row { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; }
        .gc .refresh { background: var(--primary-color,#EC7622); color:#fff; border:none; border-radius:999px; padding:8px 16px; cursor:pointer; font-weight:600; }
      </style>
      <div class="gc">
        <h2>Opruimen</h2>
        <div class="hint">Verberg overbodige toestellen. Verborgen toestellen blijven onderaan staan zodat je ze kan terughalen.</div>
        <input type="text" id="gc-filter" placeholder="Zoeken…" value="${this._filter.replace(/"/g, "&quot;")}" />
        <div class="list">
          ${zichtbaar.map((r) => this.rowHtml(r)).join("")}
        </div>
        <div class="row">
          <span class="hint">${zichtbaar.filter((r) => this.isHidden(r)).length} verborgen</span>
          <button class="refresh" id="gc-refresh">Dashboard vernieuwen</button>
        </div>
      </div>`;

    const filterEl = this.querySelector("#gc-filter") as HTMLInputElement;
    filterEl.addEventListener("input", () => {
      this._filter = filterEl.value;
      const pos = filterEl.selectionStart;
      this.render();
      const nf = this.querySelector("#gc-filter") as HTMLInputElement;
      nf.focus();
      if (pos !== null) nf.setSelectionRange(pos, pos);
    });
    (this.querySelector("#gc-refresh") as HTMLButtonElement).addEventListener("click", () =>
      reloadDashboard(),
    );
    this.querySelectorAll<HTMLButtonElement>("button.act").forEach((btn) => {
      btn.addEventListener("click", () => this.toggle(btn.dataset.entity ?? ""));
    });
  }

  private rowHtml(r: Row): string {
    const hidden = this.isHidden(r);
    return `
      <div class="item ${hidden ? "hidden" : ""}">
        <div class="naam">${r.naam}<div class="area">${r.areaNaam}</div></div>
        <button class="act ${hidden ? "toon" : "verberg"}" data-entity="${r.entityId}">
          ${hidden ? "Toon" : "Verberg"}
        </button>
      </div>`;
  }

  private async toggle(entityId: string): Promise<void> {
    if (!this._hass) return;
    const row = this._rows.find((r) => r.entityId === entityId);
    if (!row) return;
    const hidden = !this.isHidden(row);
    const newLabels = toggleVerbergLabel(row.labels, this._verbergId, hidden);
    await setEntityLabels(this._hass, entityId, newLabels);
    row.labels = newLabels;
    this.render();
  }

  getCardSize(): number {
    return 10;
  }
}
