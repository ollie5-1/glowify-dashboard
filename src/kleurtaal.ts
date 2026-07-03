/**
 * De Glowify-kleurtaal op één plek.
 *
 * Eén vaste betekenis per kleur (zie docs/spec/Glowify kleurtaal dashboard.md):
 *   groen  = veilig / in orde
 *   rood   = aandacht nodig
 *   oranje = comfort actief (de merkgloed)
 *   blauw  = lucht & klimaat actief
 *   paars  = speciale stand / scène
 *   grijs  = uit / neutraal
 *
 * De kamerbalken kleuren dynamisch mee via Bubble Card `styles`. Die styles
 * zijn JS-templates: `${...}` wordt op de client geëvalueerd met `hass` en
 * `subButtonIcon` in scope. In de TypeScript-broncode escapen we die runtime-
 * expressies daarom als `\${...}` zodat ze letterlijk in de bundle belanden.
 */

// --- Basiskleuren (rgb-strings, exact zoals in het referentiebestand) ---
export const KLEUR = {
  /** Comfort actief. In het Glowify-thema is dit --primary-color. */
  comfort: "var(--primary-color)",
  comfortRgb: "rgb(236, 118, 34)", // #EC7622
  lucht: "rgb(76, 128, 201)", // #4C80C9 blauw
  stand: "rgb(142, 47, 137)", // #8E2F89 paars
  veiligBg: "rgba(76, 175, 80, 0.25)", // groen, zachte achtergrond
  veiligText: "rgb(46, 125, 50)",
  aandacht: "rgb(229, 57, 53)", // rood
} as const;

/**
 * Bewegingsindicator: klein, zonder achtergrondcirkel (show_background:false
 * op het sub-knopje zelf), rood, en enkel zichtbaar wanneer actief.
 */
export function motionStyle(entityId: string, cssIndex: number): string {
  return `.bubble-sub-button-${cssIndex} { display: \${hass.states['${entityId}'].state === 'on' ? 'inline-flex' : 'none'} !important; color: red !important; }`;
}

/**
 * Slot: groen wanneer vergrendeld (veilig), rood wanneer ontgrendeld
 * (aandacht), met bijpassende icoonwissel.
 */
export function lockStyle(
  entityId: string,
  cssIndex: number,
  zeroIndex: number,
): string {
  const bg = `\${hass.states['${entityId}'].state === 'locked' ? '.bubble-sub-button-${cssIndex} { background-color: ${KLEUR.veiligBg} !important; color: ${KLEUR.veiligText} !important; }' : '.bubble-sub-button-${cssIndex} { background-color: ${KLEUR.aandacht} !important; color: white !important; }'}`;
  const icon = `\${subButtonIcon[${zeroIndex}]?.setAttribute("icon", hass.states['${entityId}'].state === 'locked' ? 'mdi:lock' : 'mdi:lock-open-variant')}`;
  return `${bg}\n${icon}`;
}

/**
 * Zonwering: oranje (comfort) wanneer niet dicht, met open/dicht-icoonwissel.
 */
export function coverStyle(
  entityId: string,
  cssIndex: number,
  zeroIndex: number,
): string {
  const bg = `\${hass.states['${entityId}'].state !== 'closed' ? '.bubble-sub-button-${cssIndex} { background-color: ${KLEUR.comfort} !important; color: white !important; }' : ''}`;
  const icon = `\${subButtonIcon[${zeroIndex}]?.setAttribute("icon", hass.states['${entityId}'].state !== 'closed' ? 'mdi:window-shutter-open' : 'mdi:window-shutter')}`;
  return `${bg}\n${icon}`;
}

/** Ventilator: blauw (lucht & klimaat) wanneer aan. */
export function fanStyle(entityId: string, cssIndex: number): string {
  return `\${hass.states['${entityId}'].state === 'on' ? '.bubble-sub-button-${cssIndex} { background-color: ${KLEUR.lucht} !important; color: white !important; }' : ''}`;
}

/**
 * Verlichting: twee sub-knopjes op dezelfde plek. Bij licht UIT toont het
 * aan-knopje (trigger); bij licht AAN toont het uit-knopje, gekleurd met de
 * werkelijke lichtkleur (rgb_color) — de merkgloed die meekleurt met de lamp.
 */
export function lightStyle(
  entityId: string,
  triggerCssIndex: number,
  offCssIndex: number,
): string {
  const toggle = `\${hass.states['${entityId}'].state === 'on' ? '.bubble-sub-button-${triggerCssIndex} { display: none !important; }' : '.bubble-sub-button-${offCssIndex} { display: none !important; }'}`;
  const color = `\${hass.states['${entityId}'].state === 'on' ? '.bubble-sub-button-${offCssIndex} { background-color: ' + (hass.states['${entityId}'].attributes.rgb_color ? 'rgb(' + hass.states['${entityId}'].attributes.rgb_color.join(',') + ')' : '${KLEUR.comfort}') + ' !important; color: white !important; }' : ''}`;
  return `${toggle}\n${color}`;
}

/** Special (bv. kattenstand): statisch gekleurd icoon volgens de kleurtaal. */
export function specialColorStyle(cssIndex: number, color: string): string {
  return `.bubble-sub-button-${cssIndex} { color: ${color} !important; }`;
}
