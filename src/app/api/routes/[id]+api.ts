import { bad, respond, validId } from "@/server/respond";
import { routeDetail } from "@/server/transit";

export function GET(_request: Request, { id }: Record<string, string>) {
  if (!validId(id)) return bad("Invalid route id.");
  return respond(() => routeDetail(id), 10);
}
