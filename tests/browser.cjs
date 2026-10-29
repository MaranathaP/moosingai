const { chromium } = require(
  process.env.PLAYWRIGHT_PATH ||
    "C:/Users/Maranatha/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:8088";
const password = fs
  .readFileSync(
    path.resolve(__dirname, "../../.runtime/staging-owner-password.txt"),
    "utf8",
  )
  .trim();
(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.getByRole("heading", { name: /Small problems/ }).waitFor();
  const denied = await page.request.get(base + "/?route=snapshot");
  assert.equal(denied.status(), 401);
  await page
    .getByRole("button", { name: "Workspace sign in", exact: true })
    .click();
  await page.getByLabel("Owner password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("heading", { name: "Make the next move." }).waitFor();
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
  const blocked = await page.evaluate(async () => {
    const r = await fetch("?route=opportunity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"title":"unauthorized"}',
    });
    return r.status;
  });
  assert.equal(blocked, 400);
  let s = (await call("snapshot")).data;
  let opportunity = s.opportunities.find(
    (x) => x.title === "TEST FIXTURE — Export reconciliation",
  );
  if (!opportunity) {
    await page
      .getByRole("button", { name: "New opportunity", exact: true })
      .click();
    await page
      .getByLabel("Specific problem")
      .fill("TEST FIXTURE — Export reconciliation");
    await page.getByLabel("Target buyer").fill("Synthetic bookkeeper");
    await page.getByLabel("Recurring task").fill("Reconcile a weekly export");
    await page
      .getByLabel("Narrow proposed outcome")
      .fill("One checked import file");
    await page
      .getByLabel("Concrete acquisition route")
      .fill("Owner-reviewed interview with a consenting test participant");
    await page
      .getByLabel("Next action", { exact: true })
      .fill("Record an interview");
    await page
      .getByRole("button", { name: "Save record", exact: true })
      .click();
    await page.locator("#editor").waitFor({ state: "hidden" });
    s = (await call("snapshot")).data;
    opportunity = s.opportunities.find(
      (x) => x.title === "TEST FIXTURE — Export reconciliation",
    );
  }
  assert(opportunity);
  const ev = {
    opportunity_id: opportunity.id,
    source: "Owned synthetic acceptance fixture",
    note: 'TEST FIXTURE: <img src=x onerror="window.injected=true"> — owned researcher note, not buyer demand.',
    permission: "Synthetic data authored for application verification",
    verification: "direct account",
    buyer: "Synthetic bookkeeper",
  };
  const first = await call("evidence", ev);
  assert.equal(first.status, 200);
  const second = await call("evidence", ev);
  assert.equal(second.data.inserted, false);
  const imported = await call("import", { rows: [ev, ev] });
  assert.deepEqual(imported.data, { added: 0, duplicates: 2 });
  await call("record", {
    kind: "interview",
    opportunity_id: opportunity.id,
    data: {
      title: "TEST FIXTURE — Interview",
      notes: "Synthetic owned observation. No actual customer commitment.",
      spending: "Unknown",
    },
  });
  await call("stage", {
    id: opportunity.id,
    stage: "Talking to Buyers",
    reason: "TEST FIXTURE: verify persisted decision history",
  });
  await page.reload();
  await page.getByRole("heading", { name: "Make the next move." }).waitFor();
  await page
    .locator("nav")
    .getByRole("button", { name: "Opportunities", exact: true })
    .click();
  await page
    .getByRole("button", { name: opportunity.title, exact: true })
    .click();
  await page.getByRole("tab", { name: "Evidence", exact: true }).click();
  await page.getByText(ev.note, { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.injected), undefined);
  assert.equal(await page.locator("blockquote img").count(), 0);
  const after = (await call("snapshot")).data;
  assert.equal(after.evidence.filter((x) => x.data.note === ev.note).length, 1);
  assert(
    after.history.some(
      (x) => x.opportunity_id === opportunity.id && x.kind === "stage",
    ),
  );
  for (const item of ["Overview", "Alternatives", "Validation", "Build Brief"])
    await page.getByRole("tab", { name: item, exact: true }).click();
  await page
    .getByRole("button", { name: "Back to workspace", exact: false })
    .click();
  await page
    .locator("nav")
    .getByRole("button", { name: "Today", exact: true })
    .click();
  fs.mkdirSync(path.resolve(__dirname, "../artifacts"), { recursive: true });
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
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  for (const name of [
    "Opportunities",
    "Experiments",
    "Products",
    "Sources & Settings",
  ]) {
    await page
      .locator("nav")
      .getByRole("button", { name, exact: true })
      .click();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
  }
  await page.keyboard.press("Tab");
  assert(await page.evaluate(() => document.activeElement.tagName !== "BODY"));
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    "PASS browser: authentication, CSRF, UI persistence, deduplication, stage history, safe text, all screens, mobile width, keyboard and screenshots",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
