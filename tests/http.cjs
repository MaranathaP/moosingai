const { chromium } = require(
  process.env.PLAYWRIGHT_PATH ||
    "C:/Users/Maranatha/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage();
  const base = process.env.TEST_BASE_URL || "http://127.0.0.1:8089";
  await page.goto(base);
  const password = fs
    .readFileSync(
      path.resolve(__dirname, "../../.runtime/staging-owner-password.txt"),
      "utf8",
    )
    .trim();
  const result = await page.evaluate(
    async ({ password }) => {
      const s = await (await fetch("?route=session")).json();
      const login = await fetch("?route=login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": s.csrf },
        body: JSON.stringify({ password }),
      });
      const session = await (await fetch("?route=session")).json();
      const snapshot = await fetch("?route=snapshot");
      const csrf = await fetch("?route=opportunity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": "wrong",
        },
        body: "{}",
      });
      return {
        login: login.status,
        snapshot: snapshot.status,
        csrf: csrf.status,
        session: session.authenticated,
      };
    },
    { password },
  );
  assert.deepEqual(result, {
    login: 200,
    snapshot: 200,
    csrf: 400,
    session: true,
  });
  const cookie = (await page.context().cookies()).find((x) =>
    x.name.startsWith("moosing_"),
  );
  assert(cookie.httpOnly);
  assert.equal(cookie.sameSite, "Strict");
  if (base.startsWith("https")) assert(cookie.secure);
  await page.context().clearCookies();
  assert.equal(
    (await page.request.get(base + "/?route=snapshot")).status(),
    401,
  );
  await browser.close();
  console.log(
    "PASS HTTP auth, CSRF, HttpOnly/SameSite cookie, session isolation",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
