import { bad } from "@/server/respond";
import { allow, fileReport, reportInput } from "@/server/report";
import { CromaError } from "@/server/croma";

export async function POST(request: Request) {
  const parsed = reportInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return bad("Send a kind, a message of 8 to 2000 characters and the app version.");

  const client = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "local";
  if (!allow(client)) return Response.json({ error: { code: "too_many", message: "Try again in a while." } }, { status: 429 });

  try {
    return Response.json(await fileReport(parsed.data), { status: 201 });
  } catch (error) {
    const e = error instanceof CromaError ? error : new CromaError("internal", "Something went wrong.", 500);
    return Response.json({ error: { code: e.code, message: e.message } }, { status: e.status });
  }
}
