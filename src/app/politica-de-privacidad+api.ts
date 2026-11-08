import { privacyPage } from "@/server/privacy-page";

export function GET() {
  return new Response(privacyPage(), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
