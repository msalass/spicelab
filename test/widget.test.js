"use strict";
// Offline checks of public/spice-widget.js (no DOM needed).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const src = fs.readFileSync(path.join(__dirname, "..", "spice-widget.js"), "utf8");

test("widget: el panel cerrado ([hidden]) usa display:none !important (no se come los toques en móvil)", () => {
  assert.match(src, /\.panel\[hidden\]\{display:none !important;\}/);
  // The rule lives in the same CSS string array as .panel (scoped to the shadow root), outside any @media block.
  const css = src.slice(src.indexOf(".launcher,.panel"), src.indexOf("@media (max-width:640px)"));
  assert.ok(css.includes(".panel[hidden]{display:none !important;}"));
  assert.match(src, /panel\.hidden = !open;/);
  assert.match(src, /<section class="panel"[^>]* hidden>/);
});
