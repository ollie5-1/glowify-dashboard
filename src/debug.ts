/** Hulpjes voor de debugmodus (options.debug). */

/** Diepe kloon zodat de console de waarde toont zoals op dat moment. */
export function safeClone(x: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(x));
  } catch {
    return x;
  }
}

/** Duidelijke debug-header met versienummer. */
export function debugHeader(): void {
  const v = typeof __GLOWIFY_VERSION__ !== "undefined" ? __GLOWIFY_VERSION__ : "dev";
  // eslint-disable-next-line no-console
  console.info(
    `%c🔍 GLOWIFY DEBUG %c v${v} `,
    "color:#fff;background:#8E2F89;font-weight:700;padding:2px 6px;border-radius:4px 0 0 4px;",
    "color:#8E2F89;background:#f2f2f2;font-weight:700;padding:2px 6px;border-radius:0 4px 4px 0;",
  );
}
