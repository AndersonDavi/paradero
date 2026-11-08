import { SYSTEMS, type RouteRef, type System } from "./types";

const VARIANTS = ["Ciclovía", "Festivo", "Nocturna", "Especial"] as const;
const SIDE = /^([A-Z]{1,2}\d{1,4}[A-Z]?)\s+(.+)$/;

export function asSystem(value: string | null | undefined): System {
  return SYSTEMS.find((s) => s === value) ?? "other";
}

function splitVariant(longName: string): { base: string; variant: string | null } {
  for (const variant of VARIANTS) {
    if (longName.endsWith(` ${variant}`)) {
      return { base: longName.slice(0, -variant.length - 1).trim(), variant };
    }
  }
  return { base: longName.trim(), variant: null };
}

/**
 * The feed files paired SITP routes under one joined code: `HK635` is the
 * K635 and the H635, and riders only know the halves. This reads the halves
 * back out of the long name so search, badges and voice labels use the codes
 * people actually see on the bus.
 */
export function describeRoute(input: {
  id: string;
  shortName: string | null;
  longName: string | null;
  system: string | null;
}): RouteRef {
  const shortName = input.shortName?.trim() || "?";
  const { base, variant } = splitVariant(input.longName ?? "");
  const aliases: string[] = [];
  const places = base
    .split("||")
    .map((side) => side.trim())
    .filter(Boolean)
    .map((side) => {
      const match = SIDE.exec(side);
      if (!match) return side;
      if (!aliases.includes(match[1])) aliases.push(match[1]);
      return match[2];
    });

  const unique = places.filter((place, i) => places.indexOf(place) === i);
  return {
    id: input.id,
    feedCode: shortName,
    code: aliases.length > 1 ? aliases.join(" · ") : (aliases[0] ?? shortName),
    aliases: aliases.length > 0 ? aliases : [shortName],
    name: unique.join(" – ") || shortName,
    system: asSystem(input.system),
    variant,
  };
}

/** One entry per code a rider would recognise, keeping the everyday service over its Sunday or holiday twin. */
export function dedupeRoutes(routes: RouteRef[]): RouteRef[] {
  const byCode = new Map<string, RouteRef>();
  for (const route of routes) {
    const seen = byCode.get(route.code);
    if (!seen || (seen.variant && !route.variant)) byCode.set(route.code, route);
  }
  return [...byCode.values()];
}

export function spokenCode(code: string): string {
  return code.replace(" · ", " o ").replace(/([A-Z]+)(\d+)/g, "$1 $2");
}
