const { chromium } = require(
  process.env.PLAYWRIGHT_PATH ||
    "C:/Users/Maranatha/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const base =
  process.env.TEST_BASE_URL ||
  "https://blueviolet-eagle-886185.hostingersite.com";
(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(base);
  const call = async (route, body) =>
    page.evaluate(
      async ({ route, body }) => {
        const s = await (await fetch("?route=session")).json();
        const r = await fetch("?route=" + route, {
          method: body === undefined ? "GET" : "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": s.csrf,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        return { status: r.status, data: await r.json() };
      },
      { route, body },
    );
  const pw = fs
    .readFileSync(
      path.resolve(__dirname, "../../.runtime/staging-owner-password.txt"),
      "utf8",
    )
    .trim();
  assert.equal((await call("login", { password: pw })).status, 200);
  let data = (await call("snapshot")).data;
  let profile = data.records.find(
    (x) =>
      x.kind === "profile" &&
      x.data.title === "Staging verification — developer CSV workflows",
  );
  if (!profile) {
    const r = await call("record", {
      kind: "profile",
      data: {
        title: "Staging verification — developer CSV workflows",
        buyer: "Developers who maintain file imports",
        phrases: "csv import",
        exclusions: "",
        skills: "PHP and small workflow tools",
        time: "Bounded research",
        budget: "No paid APIs",
        distribution: "Unverified; identify a reachable niche",
        scope: "One recurring file workflow",
        support: "Low-touch delivery",
        schedule: true,
      },
    });
    assert.equal(r.status, 200);
    profile = { id: r.data.id };
  }
  assert.equal(
    (
      await call("source", {
        id: "stackexchange",
        enabled: true,
        daily_limit: 5,
      })
    ).status,
    200,
  );
  data = (await call("snapshot")).data;
  const before = data.sources[0].last_success;
  if (!before) {
    const queued = await call("collect", { profile_id: profile.id });
    assert.equal(queued.status, 200);
    const run = await call("run", {});
    console.log("Real API collection:", JSON.stringify(run.data));
    assert.equal(run.data.status, "succeeded");
  }
  data = (await call("snapshot")).data;
  assert(data.sources[0].last_success);
  assert(data.evidence.some((x) => x.data.method === "api"));
  console.log(
    "PASS real Stack Exchange collection: persisted leads=" +
      data.evidence.filter((x) => x.data.method === "api").length +
      "; quota=" +
      data.sources[0].quota_remaining +
      "; successful jobs=" +
      data.jobs.filter((x) => x.status === "succeeded").length,
  );
  for (const resource of [
    "server/schema.sql",
    "server/config.local.php",
    ".git/config",
  ]) {
    const r = await context.request.get(base + "/" + resource);
    assert([403, 404].includes(r.status()), resource + " must be private");
  }
  const response = await context.request.get(base);
  assert.equal(response.status(), 200);
  assert(response.headers()["x-robots-tag"].includes("noindex"));
  const invalid = await context.request.post(base + "/?route=webhook", {
    data: '{"id":"not-stripe"}',
    headers: { "Stripe-Signature": "invalid" },
  });
  assert.equal(invalid.status(), 400);
  await page.reload();
  await page.getByRole("heading", { name: "Make the next move." }).waitFor();
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.screenshot({
    path: path.resolve(__dirname, "../artifacts/desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.resolve(__dirname, "../artifacts/mobile.png"),
    fullPage: true,
  });
  await page
    .locator("nav")
    .getByRole("button", { name: "Sources & Settings", exact: true })
    .click();
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.screenshot({
    path: path.resolve(__dirname, "../artifacts/sources.png"),
    fullPage: true,
  });
  console.log(
    "PASS deployed private paths, noindex header, invalid webhook rejection, authenticated refresh and screenshots",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
