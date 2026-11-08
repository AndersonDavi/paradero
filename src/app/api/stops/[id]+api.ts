import { bad, respond, validId } from "@/server/respond";
import { stopDetail } from "@/server/transit";

export function GET(_request: Request, { id }: Record<string, string>) {
  if (!validId(id)) return bad("Invalid stop id.");
  return respond(() => stopDetail(id), 10);
}
