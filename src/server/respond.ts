import { CromaError } from "./croma";

const ID = /^[A-Za-z0-9_.-]{1,40}$/;

export function validId(value: string | undefined): value is string {
  return !!value && ID.test(value);
}

export function bad(message: string): Response {
  return Response.json({ error: { code: "bad_request", message } }, { status: 400 });
}

export function notFound(): Response {
  return Response.json({ error: { code: "not_found", message: "Not found." } }, { status: 404 });
}

export async function respond<T>(load: () => Promise<T | null>, maxAge: number): Promise<Response> {
  try {
    const data = await load();
    if (data === null) return notFound();
    return Response.json(data, { headers: { "Cache-Control": `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 4}` } });
  } catch (error) {
    const e = error instanceof CromaError ? error : new CromaError("internal", "Something went wrong.", 500);
    console.error("[api]", e.code, e.message);
    return Response.json({ error: { code: e.code, message: e.message } }, { status: e.status });
  }
}
