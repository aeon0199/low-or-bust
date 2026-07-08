// Hidden grader, rung 2 (hubapi payments contract bug). Usage: node grade-rung2.mjs <sandbox>
import { makeGrader, eq } from "../../hidden/grade-lib.mjs";

const sandbox = process.argv[2];
const g = makeGrader(sandbox);

await g.step("bug: payments accepts valid payloads", 3, async (check, mod) => {
  const { dispatch } = await mod("src/core/router.js");
  const ok = dispatch("payments.create", { user: "u1", payload: { orderId: "o1", amountCents: 500, method: "card" } });
  check("valid create succeeds", () => ok.ok === true && !!ok.data?.id);
  const bad = dispatch("payments.create", { user: "u1", payload: { amountCents: "nope" } });
  check("invalid create still rejected", () => bad.ok === false && bad.error === "validation_failed");
  check("rejection carries details", () => Array.isArray(bad.detail) && bad.detail.length > 0);
});

await g.step("core contract unchanged", 3, async (check, mod) => {
  const { validate } = await mod("src/core/validate.js");
  const good = validate({ email: "a@b.c", displayName: "Al" }, { email: "string", displayName: "string", age: "number?" });
  check("valid → ok:true, errors:[]", () => good.ok === true && eq(good.errors, []));
  const bad = validate({}, { email: "string" });
  check("invalid → ok:false with messages", () => bad.ok === false && bad.errors.length === 1);
  check("value carries validated fields", () => good.value.email === "a@b.c");
});

await g.step("other resources unaffected", 3, async (check, mod) => {
  const { dispatch } = await mod("src/core/router.js");
  check("users.create works", () => dispatch("users.create", { user: "u1", payload: { email: "x@y.z", displayName: "Xa" } }).ok === true);
  check("orders.list works", () => dispatch("orders.list", { user: "u1" }).ok === true);
  check("unauthenticated still blocked", () => dispatch("users.list", {}).ok === false);
});

g.report();
