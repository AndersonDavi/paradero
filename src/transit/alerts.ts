const EFFECTS: Record<string, string> = {
  detour: "Desvío",
  no_service: "Sin servicio",
  reduced_service: "Servicio reducido",
  significant_delays: "Retrasos",
  stop_moved: "Paradero trasladado",
  modified_service: "Cambio en el servicio",
  additional_service: "Servicio adicional",
};

const STOP_REF = /^\d{3}[A-Z]\d{2}_/;

/**
 * TransMilenio writes alerts for its own control room: a header like
 * `EMCONTRAVIACR20ACONCL72A` and stops as `313A00_Br. San Felipe`. Riders get
 * one plain sentence instead.
 */
export function humanizeAlert(input: { effect: string | null; description: string | null; routes: string[] }) {
  const title = EFFECTS[input.effect ?? ""] ?? "Novedad en la operación";
  const parts = (input.description ?? "")
    .split("\\")
    .map((part) => part.trim())
    .filter(Boolean);

  const places = parts.filter((p) => STOP_REF.test(p)).map((p) => p.replace(STOP_REF, "").trim());
  const lead = parts.find((p) => !STOP_REF.test(p));

  let detail: string;
  if (places.length >= 2) {
    detail = `Entre ${places[0]} y ${places[places.length - 1]}.`;
  } else if (places.length === 1) {
    detail = `Cerca de ${places[0]}.`;
  } else if (lead) {
    detail = lead.replace(/operacion/gi, "operación").replace(/\s+/g, " ");
    if (!/[.!?]$/.test(detail)) detail += ".";
  } else {
    detail = "TransMilenio reporta una novedad en esta ruta.";
  }
  return { title, detail };
}
