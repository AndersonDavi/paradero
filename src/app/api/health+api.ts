import { respond } from "@/server/respond";
import { health } from "@/server/transit";

export function GET() {
  return respond(health, 15);
}
