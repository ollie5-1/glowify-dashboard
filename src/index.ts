import { GlowifyStrategy } from "./strategy";

/**
 * Registratie van de Glowify dashboard-strategie.
 *
 * 1. `customElements.define` levert de logica. HA leidt uit een dashboard
 *    met `strategy: { type: "custom:glowify" }` het element
 *    `ll-strategy-dashboard-glowify` af en roept daar generate() op.
 * 2. `window.customStrategies` (nieuw in HA 2026.5) laat de strategie
 *    verschijnen onder "Communitydashboards" in de "Dashboard toevoegen"-
 *    dialoog, zodat de klant ze zonder YAML kan kiezen.
 */

const STRATEGY_TYPE = "glowify";
const ELEMENT_NAME = `ll-strategy-dashboard-${STRATEGY_TYPE}`;

if (!customElements.get(ELEMENT_NAME)) {
  // De basisklasse is functioneel irrelevant; enkel de statische
  // generate-methoden tellen. HTMLElement volstaat.
  class GlowifyDashboardStrategyElement extends HTMLElement {
    static generate = GlowifyStrategy.generate;
    static generateDashboard = GlowifyStrategy.generateDashboard;
  }
  customElements.define(ELEMENT_NAME, GlowifyDashboardStrategyElement);
}

interface CustomStrategyRegistration {
  type: string;
  strategyType: "dashboard" | "view";
  name?: string;
  description?: string;
  documentationURL?: string;
}

declare global {
  interface Window {
    customStrategies?: CustomStrategyRegistration[];
  }
}

window.customStrategies = window.customStrategies || [];
if (!window.customStrategies.some((s) => s.type === STRATEGY_TYPE)) {
  window.customStrategies.push({
    type: STRATEGY_TYPE,
    strategyType: "dashboard",
    name: "Glowify Dashboard",
    description:
      "Genereert automatisch een Glowify Thuis-view, kamerbalken en pop-ups uit je Areas, floors en entiteiten.",
    documentationURL: "https://github.com/Glowify/glowify-dashboard",
  });
}

// Vriendelijke console-melding, zoals gangbaar bij HA frontend-resources.
const version = "0.1.0";
// eslint-disable-next-line no-console
console.info(
  `%c GLOWIFY-DASHBOARD %c ${version} `,
  "color: white; background: #EC7622; font-weight: 700;",
  "color: #EC7622; background: #1c1c1c; font-weight: 700;",
);

export { GlowifyStrategy };
