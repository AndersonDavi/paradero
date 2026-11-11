import { createContext } from "react";

/**
 * How much of a map the sheet over it covers, from the bottom, in points. The map stays full size behind the sheet;
 * it keeps what it frames above the sheet's edge, and glides there when the sheet moves.
 */
export const SheetCover = createContext(0);
