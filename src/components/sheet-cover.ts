import { createContext } from "react";

/**
 * How much of a map the sheet over it covers, in points: from the bottom on a phone, from the left where the sheet
 * is a side panel. The map stays full size behind it; it keeps what it frames in the part left to see, and glides
 * there when the sheet moves.
 */
export const SheetCover = createContext({ bottom: 0, left: 0 });
