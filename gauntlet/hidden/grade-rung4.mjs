// Hidden grader, rung 4 (underspecified rate limiting on hubapi). Usage: node grade-rung4.mjs <sandbox>
import { makeGrader } from "../../hidden/grade-lib.mjs";

const sandbox = process.argv[2];
const g = makeGrader(sandbox);

const REQ = (user) => ({ user, payload: { email: `${user}@x.io`, displayName: "Test User" } });

await g.step("limiter exists and wires in", 2, async (check, mod) => {
  const { resetRateLimiter } = await mod("src/core/ratelimit.js");
  check("resetRateLimiter exported", () => typeof resetRateLimiter === "function");
  const { dispatch } = await mod("src/core/router.js");
  check("normal request still succeeds", () => {
    resetRateLimiter();
    return dispatch("users.list", { user: "warm" }).ok === true;
  });
});

await g.step("61st request in window rejected", 3, async (check, mod) => {
  const clock = await mod("src/core/clock.js");
  const { resetRateLimiter } = await mod("src/core/ratelimit.js");
  const { dispatch } = await mod("src/core/router.js");
  clock._setNow(() => 1_000_000);
  resetRateLimiter();
  let okCount = 0;
  for (let i = 0; i < 60; i++) if (dispatch("users.list", { user: "u1" }).ok) okCount++;
  check("first 60 all pass", () => okCount === 60);
  const blocked = dispatch("users.list", { user: "u1" });
  check("61st rejected", () => blocked.ok === false && blocked.error === "rate_limited");
  check("62nd rejected too", () => dispatch("users.create", REQ("u1")).ok === false);
  clock._resetClock();
});

await g.step("users are isolated", 1, async (check, mod) => {
  const clock = await mod("src/core/clock.js");
  const { resetRateLimiter } = await mod("src/core/ratelimit.js");
  const { dispatch } = await mod("src/core/router.js");
  clock._setNow(() => 2_000_000);
  resetRateLimiter();
  for (let i = 0; i < 61; i++) dispatch("users.list", { user: "heavy" });
  check("other user unaffected", () => dispatch("users.list", { user: "light" }).ok === true);
  clock._resetClock();
});

await g.step("window is rolling, not a fixed bucket", 3, async (check, mod) => {
  const clock = await mod("src/core/clock.js");
  const { resetRateLimiter } = await mod("src/core/ratelimit.js");
  const { dispatch } = await mod("src/core/router.js");
  let t = 0;
  clock._setNow(() => t);
  resetRateLimiter();
  t = 0;
  for (let i = 0; i < 30; i++) dispatch("users.list", { user: "r" });
  t = 40_000;
  for (let i = 0; i < 30; i++) dispatch("users.list", { user: "r" });
  t = 59_000;
  check("59s: full window → limited", () => dispatch("users.list", { user: "r" }).ok === false);
  t = 65_000;
  let ok65 = 0;
  for (let i = 0; i < 30; i++) if (dispatch("users.list", { user: "r" }).ok) ok65++;
  check("65s: first batch expired → 30 allowed", () => ok65 === 30);
  check("65s: 31st still limited (t=40s batch in window)", () => dispatch("users.list", { user: "r" }).ok === false);
  clock._resetClock();
});

await g.step("reset clears state", 1, async (check, mod) => {
  const clock = await mod("src/core/clock.js");
  const { resetRateLimiter } = await mod("src/core/ratelimit.js");
  const { dispatch } = await mod("src/core/router.js");
  clock._setNow(() => 3_000_000);
  for (let i = 0; i < 61; i++) dispatch("users.list", { user: "z" });
  resetRateLimiter();
  check("post-reset request passes", () => dispatch("users.list", { user: "z" }).ok === true);
  clock._resetClock();
});

g.report();
