import { cmLineSvg } from "./cmLineSvg";
import type { Graphic } from "../types/graphic";

/** @deprecated Use cmLineSvg — linear targets share the 2525 line point icon. */
export function linearTargetSvg(
  graphic: Pick<Graphic, "headingDeg" | "symbol"> &
    Partial<Pick<Graphic, "dash">>,
  color: string,
  selected: boolean,
) {
  return cmLineSvg(graphic, color, selected);
}
