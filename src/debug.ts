/** Hulpjes voor de debugmodus (options.debug). */

/** Diepe kloon zodat de console de waarde toont zoals op dat moment. */
export function safeClone(x: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(x));
  } catch {
    return x;
  }
}

/**
 * JSON-veilige structuurbeschrijving van een waarde: primitieven blijven
 * behouden, objecten worden tot `depth` niveaus uitgeklapt, arrays afgekapt,
 * circulaire verwijzingen gemarkeerd, en een hass-achtig object (te groot en
 * circulair) wordt niet uitgeklapt maar samengevat als sleutellijst.
 */
export function jsonSafe(value: unknown, depth: number, seen: WeakSet<object> = new WeakSet()): unknown {
  if (value === null || typeof value !== "object") return value;
  const obj = value as Record<string, unknown>;
  if (seen.has(obj)) return "<circular>";
  seen.add(obj);

  const keys = Object.keys(obj);
  const looksHass =
    ("states" in obj && ("callWS" in obj || "callService" in obj)) || "connection" in obj;
  if (looksHass) {
    return `<hass-achtig object: ${keys.length} sleutels: ${keys.slice(0, 20).join(", ")}${keys.length > 20 ? ", …" : ""}>`;
  }

  if (Array.isArray(value)) {
    if (depth <= 0) return `<array van ${value.length}>`;
    return (value as unknown[]).slice(0, 8).map((v) => jsonSafe(v, depth - 1, seen));
  }

  if (depth <= 0) return `{sleutels: ${keys.join(", ")}}`;
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = jsonSafe(obj[k], depth - 1, seen);
  return out;
}

let _diagDone = false;

/**
 * Eenmalige, onvoorwaardelijke diagnostiek op het instappunt van de strategie.
 * Logt welk entrypoint HA aanroept en de volledige structuur van elk argument,
 * zodat op de demo exact te zien is hoe HA de strategie aanroept.
 */
export function diagnoseEntrypoint(entrypoint: string, args: unknown[]): void {
  if (_diagDone) return;
  _diagDone = true;
  try {
    // eslint-disable-next-line no-console
    console.log(
      "%cGLOWIFY-DIAG",
      "color:#fff;background:#c62828;font-weight:700;padding:2px 6px;border-radius:4px;",
      `entrypoint = ${entrypoint} | aantal argumenten = ${args.length}`,
    );
    args.forEach((a, i) => {
      const t = a === null ? "null" : Array.isArray(a) ? "array" : typeof a;
      // eslint-disable-next-line no-console
      console.log(`GLOWIFY-DIAG arg[${i}] (type=${t}):`, jsonSafe(a, 5));
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log("GLOWIFY-DIAG log-fout:", e);
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
