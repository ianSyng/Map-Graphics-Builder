import assert from "node:assert/strict";
import { test } from "node:test";
import { makeSymbol } from "../domain/sidc";
import { renderMilSymbolSvg } from "./milSymbol";

test("Unspecified control point is an empty pennant, Checkpoint adds CKP", () => {
  const ucp = renderMilSymbolSvg(makeSymbol({ standard: "2525D", entity: "130100" }), 48);
  const ckp = renderMilSymbolSvg(makeSymbol({ standard: "2525D", entity: "130300" }), 48);
  assert.match(ucp, /<svg /);
  assert.match(ckp, /<svg /);
  assert.match(ucp, /m 60,45 80,0/);
  assert.match(ckp, /m 60,45 80,0/);
  assert.doesNotMatch(ucp, />CKP</);
  assert.match(ckp, />CKP</);
  assert.match(ucp, /fill="none"/);
  assert.notEqual(ucp, ckp);
});

test("distinct C2 points are not the same graphic", () => {
  const names = ["130100", "130300", "130800", "131800", "160100"] as const;
  const svgs = names.map((entity) =>
    renderMilSymbolSvg(makeSymbol({ standard: "2525D", entity }), 48),
  );
  for (const svg of svgs) assert.match(svg, /<path /);
  const unique = new Set(svgs);
  assert.equal(unique.size, svgs.length);
});

test("empty uniqueDesignation does not crash render", () => {
  const svg = renderMilSymbolSvg(
    makeSymbol({
      standard: "2525D",
      entity: "130100",
      uniqueDesignation: "",
    }),
    48,
  );
  assert.match(svg, /<svg /);
});
