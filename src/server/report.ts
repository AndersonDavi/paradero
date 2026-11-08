import { z } from "zod";

import { REPORT_KINDS, type ReportInput, type ReportResult } from "@/transit/report";

import { CromaError } from "./croma";

const REPO = process.env.REPORTS_REPO ?? "croma-labs/paradero";
const LABEL = "reporte ciudadano";

const id = z.string().regex(/^[A-Za-z0-9_.-]{1,40}$/);

export const reportInput = z.object({
  kind: z.enum(Object.keys(REPORT_KINDS) as [keyof typeof REPORT_KINDS, ...(keyof typeof REPORT_KINDS)[]]),
  message: z.string().trim().min(8).max(2000),
  context: z
    .object({ stopId: id.optional(), stopName: z.string().max(120).optional(), routeId: id.optional(), routeCode: z.string().max(40).optional() })
    .optional(),
  app: z.object({ version: z.string().max(20), platform: z.enum(["ios", "android", "web"]) }),
});

/** Reports are public, so anything that looks like a way to reach a person is removed before it leaves the server. */
export function scrub(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[correo oculto]")
    .replace(/(\+?57[\s-]?)?(3\d{2}|60\d)[\s-]?\d{3}[\s-]?\d{4}\b/g, "[teléfono oculto]")
    .replace(/\b\d{6,10}\b/g, "[número oculto]");
}

const WINDOW_MS = 60 * 60_000;
const PER_WINDOW = 5;
const recent = new Map<string, number[]>();

export function allow(client: string): boolean {
  const now = Date.now();
  const hits = (recent.get(client) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= PER_WINDOW) return false;
  recent.set(client, [...hits, now]);
  if (recent.size > 5_000) recent.delete(recent.keys().next().value as string);
  return true;
}

function issueBody(input: ReportInput): string {
  const c = input.context ?? {};
  const rows = [
    ["Tipo", REPORT_KINDS[input.kind]],
    c.stopId && ["Paradero", `${c.stopName ?? ""} \`${c.stopId}\``.trim()],
    c.routeId && ["Ruta", `${c.routeCode ?? ""} \`${c.routeId}\``.trim()],
    ["App", `${input.app.version} · ${input.app.platform}`],
  ].filter(Boolean) as string[][];

  return [
    scrub(input.message)
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n"),
    "",
    "| | |",
    "| --- | --- |",
    ...rows.map(([k, v]) => `| ${k} | ${v} |`),
    "",
    "_Enviado desde la app, sin cuenta. Los correos y teléfonos se ocultan antes de publicar._",
  ].join("\n");
}

export async function fileReport(input: ReportInput): Promise<ReportResult> {
  const token = process.env.GITHUB_REPORTS_TOKEN;
  if (!token) throw new CromaError("reports_unavailable", "Reports are not configured.", 503);

  const first = scrub(input.message).split("\n")[0].slice(0, 70);
  const where = input.context?.routeCode ?? input.context?.stopName;
  const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "paradero-reports", "X-GitHub-Api-Version": "2022-11-28" },
    body: JSON.stringify({ title: `${REPORT_KINDS[input.kind]}${where ? ` · ${where}` : ""}: ${first}`, body: issueBody(input), labels: [LABEL] }),
  });
  if (!res.ok) {
    console.error("[report]", res.status, await res.text().catch(() => ""));
    throw new CromaError("reports_failed", "Could not file the report.", 502);
  }
  const issue = (await res.json()) as { number: number; html_url: string };
  return { number: issue.number, url: issue.html_url };
}
