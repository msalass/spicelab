"use strict";
// --wait-on-429 / --no-retry / --stop-at en scripts/live-test.js (lógica pura, sin llamadas).
const test = require("node:test");
const assert = require("node:assert/strict");

delete process.env.GROQ_API_KEY;
delete process.env.OPENAI_API_KEY;
const { decide429, parseRetryAfter, stopAtMs } = require("../scripts/live-test.js");

const at = (hh, mm) => { const d = new Date(2026, 9, 2, hh, mm, 0, 0); return d.getTime(); };

test("parseRetryAfter: header en segundos o texto «try again in …»", () => {
  assert.equal(parseRetryAfter("1433", ""), 1433);
  assert.equal(parseRetryAfter(null, "Please try again in 23m52.512s. Need more tokens?"), 23 * 60 + 52.512);
  assert.equal(parseRetryAfter(null, "try again in 1h2m3s"), 3723);
  assert.equal(parseRetryAfter(null, "try again in 4.2s"), 4.2);
  assert.equal(parseRetryAfter(null, "no hint"), null);
});

test("--wait-on-429: espera el retry-after (+5 s) y sigue si cabe antes de --stop-at", () => {
  assert.deepEqual(decide429({ wait: true, retryAfterSec: 1433, now: at(15, 40), stopAt: "19:30", waitsSoFar: 0 }), { action: "wait", ms: 1438000 });
});

test("--wait-on-429: para si el reintento caería después de --stop-at", () => {
  const d = decide429({ wait: true, retryAfterSec: 1500, now: at(19, 10), stopAt: "19:30", waitsSoFar: 0 });
  assert.equal(d.action, "stop");
  assert.match(d.reason, /stop-at 19:30/);
});

test("--wait-on-429: para sin retry-after o tras demasiadas esperas", () => {
  assert.equal(decide429({ wait: true, retryAfterSec: null, now: at(15, 0), stopAt: "19:30" }).action, "stop");
  assert.equal(decide429({ wait: true, retryAfterSec: 10, now: at(15, 0), stopAt: "19:30", waitsSoFar: 8 }).action, "stop");
});

test("--no-retry para; sin flags se usa el reintento corto de siempre", () => {
  assert.equal(decide429({ noRetry: true, retryAfterSec: 10, now: at(15, 0), stopAt: "19:30" }).action, "stop");
  assert.equal(decide429({ retryAfterSec: 10, now: at(15, 0), stopAt: "" }).action, "default");
  assert.equal(stopAtMs("", at(15, 0)), Infinity);
  assert.equal(stopAtMs("19:30", at(15, 0)), at(19, 30));
});
