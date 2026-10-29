// @ts-check
/** @type {any} */
let data = {};
/** @type {any} */
let session = {};
let page = "Today";
let selected = "";
let tab = "Overview";
const app = /** @type {HTMLElement} */ (document.querySelector("#app"));
const dialog = /** @type {HTMLDialogElement} */ (
  document.querySelector("#editor")
);
const fields = /** @type {HTMLElement} */ (document.querySelector("#fields"));
const form = /** @type {HTMLFormElement} */ (
  document.querySelector("#edit-form")
);
/** @type {null | ((values:any)=>Promise<any>)} */ let save = null;
const escapeHtml = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] || c,
  );
const e = escapeHtml;
const money = (n, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    Number(n || 0) / 100,
  );
const date = (v) => (v ? new Date(v).toLocaleString() : "Never");
const pill = (v, style = "neutral") =>
  `<span class="pill ${style}">${e(v)}</span>`;
const action = (name, label, id = "", cls = "") =>
  `<button class="${cls}" data-action="${name}" data-id="${e(id)}">${e(label)}</button>`;
const empty = (title, description, button = "") =>
  `<div class="empty"><h3>${e(title)}</h3><p>${e(description)}</p>${button}</div>`;
const val = (label, value) =>
  `<div class="field-value"><small>${e(label)}</small>${e(value || "Unknown — needs investigation")}</div>`;
function notice(message) {
  const el = document.querySelector("#notice");
  if (el) el.textContent = message;
  setTimeout(() => {
    if (el) el.textContent = "";
  }, 6500);
}
async function api(route, body = undefined) {
  const response = await fetch(`?route=${route}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": session.csrf || "",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      session.authenticated = false;
      render();
    }
    throw new Error(result.error || "Request failed");
  }
  return result;
}
async function refresh() {
  data = await api("snapshot");
  render();
}
function publicPage() {
  app.innerHTML = `<main id="main" class="landing"><header><div class="brand"><span class="mark">m</span>MoosingAI</div>${action("signin", "Workspace sign in")}</header><section><div class="eyebrow">A small, deliberate venture studio</div><h1>Small problems.<br>Useful products.<br>Evidence first.</h1><p>We investigate recurring work, talk to the people doing it, and build focused tools when there’s a clear reason to.</p>${action("signin", "Open private workspace", "", "primary")}</section><div class="principles"><article><div class="eyebrow">01 / Discover</div><h2>Start with the work</h2><p>Understand a specific task, its current workaround, and who needs a better outcome.</p></article><article><div class="eyebrow">02 / Validate</div><h2>Make a concrete offer</h2><p>Learn from buyer conversations and paid pilots before expanding the scope.</p></article><article><div class="eyebrow">03 / Deliver</div><h2>Keep it focused</h2><p>Build a useful result, then measure delivery costs and whether customers return.</p></article></div><div class="section-space muted"><p>Products will be listed here after a verified launch. Research and customer records stay private.</p></div></main>`;
}
function loginPage() {
  app.innerHTML = `<main id="main" class="login"><div class="brand"><span class="mark">m</span>MoosingAI</div><h1 class="section-space">Your research workspace</h1><p class="muted">Sign in to continue from evidence to a paid pilot.</p>${!session.configured ? '<div class="warning">Owner access is not configured. Follow the server setup instructions; no private records are available.</div>' : ""}<form id="login"><label for="password">Owner password</label><input id="password" name="password" type="password" autocomplete="current-password" required><button class="primary" ${!session.configured ? "disabled" : ""}>Sign in</button><p id="login-error" role="alert"></p></form>${action("public", "Back to public page", "", "link")}</main>`;
}
function render() {
  if (!session.authenticated) {
    page === "Sign in" ? loginPage() : publicPage();
    return;
  }
  const names = [
    "Today",
    "Opportunities",
    "Experiments",
    "Products",
    "Sources & Settings",
  ];
  app.innerHTML = `<div class="layout"><aside class="sidebar"><div class="brand"><span class="mark">m</span>MoosingAI</div><div><div class="eyebrow">Your workspace</div><nav aria-label="Main navigation">${names.map((n, i) => `<button data-page="${e(n)}" ${page === n ? 'aria-current="page"' : ""}><span aria-hidden="true">${["◷", "◇", "▤", "▧", "⚙"][i]}</span> &nbsp; ${e(n)}</button>`).join("")}</nav></div><div class="sidebar-bottom"><div class="private">PRIVATE OWNER WORKSPACE</div><p class="muted"><small>Evidence before effort.<br>One useful product at a time.</small></p>${action("logout", "Sign out", "", "link")}</div></aside><main class="content" id="main"><div class="topbar"><p>Venture workspace <span class="muted"> / ${e(page)}</span></p><div>${pill(session.environment === "production" ? "Private workspace" : "Staging · isolated data", "warn")} ${action("logout", "Sign out", "", "link")}</div></div>${selected ? detail() : page === "Today" ? today() : page === "Opportunities" ? opportunities() : page === "Experiments" ? experiments() : page === "Products" ? products() : sources()}</main></div>`;
  if (page === "Opportunities" && !selected) filterRows();
}
function header(title, subtitle, button = "") {
  return `<div class="page-head"><div><div class="eyebrow">${e(page === "Today" ? "The next useful step" : page)}</div><h1>${e(title)}</h1><p>${e(subtitle)}</p></div>${button}</div>`;
}
function today() {
  const active = data.opportunities.filter(
    (o) => !["Archived", "Live"].includes(o.stage),
  );
  const qualified = active.filter((o) => o.evidence_count > 0);
  const source = data.sources[0];
  return (
    header(
      "Make the next move.",
      "A clear path from a recurring problem to your first customer.",
    ) +
    `<div class="hero"><div><div class="eyebrow">Recommended next action</div><h2>${active.length ? "Review the evidence, then test the offer." : "Choose a buyer you can reach."}</h2><p>${active.length ? "Separate what you observed from what you still need to learn. Record a conversation or a concrete offer." : "Create a research profile with a specific buyer, recurring task, and an acquisition route you can use this week."}</p></div>${active.length ? action("open", "Review opportunity", active[0].id) : action("profile", "Create research profile")}</div><div class="stats"><article class="stat"><small>Active investigations</small><strong>${active.length}</strong><span>One buyer and task per opportunity</span></article><article class="stat"><small>Independent verified reports</small><strong>${data.evidence.filter((x) => ["direct account", "verified original"].includes(x.data.verification)).length}</strong><span>Discovery leads excluded</span></article><article class="stat"><small>Verified live collections</small><strong>${money(data.payments.filter((p) => p.mode === "live" && p.state === "paid").reduce((s, p) => s + Number(p.amount) - Number(p.refunded), 0))}</strong><span>USD · sandbox always excluded</span></article><article class="stat"><small>Collection health</small><strong>${source.enabled ? (source.last_error ? "Attention" : source.last_success ? "Current" : "Ready") : "Off"}</strong><span>Last success: ${e(date(source.last_success))}</span></article></div><div class="split"><section class="panel"><div class="panel-head"><h2>Active validation</h2>${action("new", "New opportunity", "", "link")}</div>${
      active.length
        ? active
            .slice(0, 4)
            .map(
              (o) =>
                `<div class="row"><div><h3>${e(o.title)}</h3><p>${e(o.data.buyer || "Buyer unknown")} · ${e(o.stage)}</p><p>Next: ${e(o.data.next_action || "Review evidence")}</p></div>${action("open", "Open", o.id)}</div>`,
            )
            .join("")
        : empty(
            "Your first investigation starts here",
            "Record a recurring task and the buyer who owns it.",
            action("new", "Create opportunity"),
          )
    }</section><div><section class="panel"><div class="panel-head"><h2>Qualified shortlist</h2>${pill(qualified.length)}</div>${
      qualified.length
        ? qualified
            .slice(0, 3)
            .map(
              (o) =>
                `<div class="row"><div><h3>${e(o.title)}</h3><p>${o.evidence_count} verified reports · ${o.assessment.coverage}% assessed</p></div>${action("open", "Review", o.id)}</div>`,
            )
            .join("")
        : empty(
            "No supported shortlist yet",
            "Link verified original reports or direct buyer accounts. A seed or a search result alone is a hypothesis.",
          )
    }</section><section class="panel"><div class="panel-head"><h2>Source activity</h2>${pill(source.last_error ? "Needs attention" : source.enabled ? "Enabled" : "Disabled", source.last_error ? "warn" : "neutral")}</div><p class="muted">Stack Exchange · ${e(source.last_error || "Question titles are discovery leads, not proof of demand.")}</p><small>Last successful collection: ${e(date(source.last_success))}</small></section></div></div>`
  );
}
function opportunities() {
  return (
    header(
      "Find the problem worth solving.",
      "Compare the buyer, evidence, delivery effort, and the next test.",
      action("new", "+ New opportunity", "", "primary"),
    ) +
    `<div class="toolbar"><input id="search" type="search" aria-label="Search opportunities" placeholder="Search problems or buyers…"><select id="stage-filter" aria-label="Filter by stage"><option value="">All stages</option>${data.stages.map((s) => `<option>${e(s)}</option>`).join("")}</select><select id="confidence-filter" aria-label="Filter by confidence"><option value="">All confidence</option><option>Unverified</option><option>Supported</option></select><select id="source-filter" aria-label="Filter by source"><option value="">All sources</option>${[...new Set(data.evidence.map((x) => x.source))].map((s) => `<option>${e(s)}</option>`).join("")}</select><input id="effort-filter" type="search" aria-label="Filter effort" placeholder="Effort contains…"></div><div class="table-wrap"><table><thead><tr><th>Opportunity / Buyer</th><th>Evidence</th><th>Assessment</th><th>Effort / Price hypothesis</th><th>Stage / Next action</th></tr></thead><tbody id="opportunity-rows"></tbody></table></div>`
  );
}
function filterRows() {
  const value = (id) =>
    /** @type {HTMLInputElement} */ (document.getElementById(id))?.value || "";
  const search = value("search").toLowerCase();
  const stage = value("stage-filter");
  const confidence = value("confidence-filter");
  const source = value("source-filter");
  const effort = value("effort-filter").toLowerCase();
  const rows = data.opportunities.filter(
    (o) =>
      (o.title + " " + (o.data.buyer || "")).toLowerCase().includes(search) &&
      (!stage || o.stage === stage) &&
      (!confidence ||
        (o.evidence_count ? "Supported" : "Unverified") === confidence) &&
      (!source ||
        data.links.some(
          (l) =>
            l.opportunity_id === o.id &&
            data.evidence.some(
              (x) => x.id === l.evidence_id && x.source === source,
            ),
        )) &&
      (o.data.effort || "").toLowerCase().includes(effort),
  );
  const target = document.querySelector("#opportunity-rows");
  if (target)
    target.innerHTML =
      rows
        .map(
          (o) =>
            `<tr><td>${action("open", o.title, o.id)}<small>${e(o.data.buyer || "Buyer unknown")}</small></td><td>${o.evidence_count} verified<small>${pill(o.evidence_count ? "Supported" : "Unverified")}</small></td><td>${o.assessment.coverage}% complete<small>${o.assessment.score === null ? "Incomplete" : e(o.assessment.score) + "/100 attractiveness"}</small><div class="progress"><span style="width:${Number(o.assessment.coverage)}%"></span></div></td><td>${e(o.data.effort || "Unestimated")}<small>${e(o.data.price || "Untested price")}</small></td><td>${pill(o.stage)}<small>${e(o.data.next_action || "Review evidence")}</small></td></tr>`,
        )
        .join("") ||
      '<tr><td colspan="5">No opportunities match. Create a specific buyer and recurring task to begin.</td></tr>';
}
function detail() {
  const o = data.opportunities.find((x) => x.id === selected);
  if (!o) {
    selected = "";
    return opportunities();
  }
  const d = o.data;
  const linked = data.evidence.filter((x) =>
    data.links.some((l) => l.opportunity_id === o.id && l.evidence_id === x.id),
  );
  const records = data.records.filter((r) => r.opportunity_id === o.id);
  return `${action("back", "← Back to workspace", "", "link")}<div class="page-head section-space"><div><div class="eyebrow">${e(d.buyer || "Buyer to investigate")}</div><h1>${e(o.title)}</h1><p>${e(d.outcome || "Define a narrow outcome before building.")}</p></div><div class="list-actions">${action("edit", "Edit", o.id)}${action("stage", o.stage === "Archived" ? "Reopen" : "Change stage", o.id, "primary")}</div></div>${pill(o.stage)} ${pill(`${o.evidence_count} verified independent reports`)} ${pill(`${o.assessment.coverage}% assessed`)}<div class="tabs" role="tablist" aria-label="Opportunity sections">${["Overview", "Evidence", "Alternatives", "Validation", "Build Brief"].map((t) => `<button role="tab" aria-selected="${tab === t}" class="${tab === t ? "active" : ""}" data-tab="${t}">${t}</button>`).join("")}</div><section role="tabpanel">${
    tab === "Overview"
      ? `<div class="detail-grid"><div class="panel"><h2>Hypotheses to test</h2>${val("Recurring task", d.task)}${val("Current workaround", d.workaround)}${val("Narrow outcome", d.outcome)}${val("Price hypothesis", d.price)}${val("Acquisition route", d.acquisition)}${val("Next action", d.next_action)}</div><div class="panel"><div class="panel-head"><h2>Evidence & unknowns</h2>${action("assess", "Assess", o.id)}</div><p class="muted">Facts remain in the linked evidence records. Ratings require evidence IDs. Confidence is separate from attractiveness.</p>${Object.entries(
          data.weights,
        )
          .map(([k, w]) => {
            const a = d.assessment?.[k];
            return val(
              `${k.replaceAll("_", " ")} · ${w}%`,
              a?.rating !== undefined && a.rating !== ""
                ? `${a.rating}/4 · evidence ${a.evidence_ids.join(", ")}`
                : "Unknown",
            );
          })
          .join(
            "",
          )}<div class="warning">Changing a stage does not verify a payment or establish market validation.</div></div></div>`
      : tab === "Evidence"
        ? `<section class="panel"><div class="panel-head"><h2>Observed records</h2><div class="list-actions">${action("evidence", "+ Add evidence", o.id)}${action("link", "Link existing", o.id)}${action("import", "Import CSV / JSON", o.id)}</div></div>${linked.length ? linked.map(evidenceCard).join("") : empty("No linked evidence", "Add permissioned observations or link discovery leads for review.")}</section>`
        : tab === "Alternatives"
          ? `<section class="panel"><div class="panel-head"><h2>The current ways of solving it</h2>${action("record-alternative", "+ Add alternative", o.id)}</div>${recordCards(records.filter((r) => r.kind === "alternative"))}</section>`
          : tab === "Validation"
            ? `<section class="panel"><div class="panel-head"><h2>Test a concrete offer</h2></div><div class="list-actions">${["experiment", "interview", "offer", "decision", "cost"].map((k) => action("record-" + k, "+ " + k[0].toUpperCase() + k.slice(1), o.id)).join("")}</div><div class="warning">Offers are sandbox fixtures until a real scope and price are approved. Payment is verified only by signed webhooks.</div>${recordCards(records.filter((r) => ["experiment", "interview", "offer", "decision", "cost"].includes(r.kind)))}</section><section class="panel"><h2>Decision history</h2>${
                data.history
                  .filter((h) => h.opportunity_id === o.id)
                  .map(
                    (h) =>
                      `<div class="row"><div><small>${e(date(h.created_at))} · ${e(h.kind)}</small><p>${e(h.data.reason || h.data.title || "")} ${h.data.to ? "→ " + e(h.data.to) : ""}</p></div></div>`,
                  )
                  .join("") ||
                empty(
                  "No decisions yet",
                  "Record why you continue, narrow, or stop.",
                )
              }</section>`
            : `<section class="panel"><div class="panel-head"><h2>A bounded build brief</h2>${action("record-brief", "+ Write brief", o.id)}</div><p class="muted">Model generation is unavailable. Write and edit the scope, acceptance criteria, data handling, delivery process, and later list manually.</p>${recordCards(records.filter((r) => r.kind === "brief"))}</section>`
  }</section>`;
}
function evidenceCard(x) {
  const d = x.data;
  return `<article class="evidence"><div class="list-actions">${pill(d.verification)} ${pill(d.method)}<small class="mono">${e(x.id)}</small></div><blockquote>${e(d.note)}</blockquote><p>${d.url ? `<a href="${e(d.url)}" target="_blank" rel="noopener noreferrer">${e(x.source)} · Original source ↗</a>` : e(x.source)}</p><small>${d.author ? `By ${e(d.author)} · ` : ""}Published: ${e(d.published_at || "Unknown")} · Collected: ${e(date(x.collected_at))}</small>${d.author_url ? `<small><a href="${e(safeUrl(d.author_url))}" target="_blank" rel="noopener noreferrer">Author profile</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a> · Title unmodified</small>` : ""}<small>Permitted use: ${e(d.permission)}</small><p class="muted">${e([d.buyer, d.task, d.workaround, d.frequency, d.spending].filter(Boolean).join(" · ") || "Buyer, workaround, frequency, and spending remain unknown.")}</p>${action("verify", "Review verification", x.id, "link")}</article>`;
}
function safeUrl(v) {
  try {
    const u = new URL(v);
    return ["https:", "http:"].includes(u.protocol) ? u.href : "#";
  } catch {
    return "#";
  }
}
function recordCards(records) {
  return records.length
    ? records
        .map(
          (r) =>
            `<article class="evidence"><div class="panel-head"><h3>${e(r.data.title)}</h3>${pill(r.kind)}</div>${Object.entries(
              r.data,
            )
              .filter(([k]) => !["title", "approved"].includes(k))
              .map(([k, v]) =>
                val(
                  k.replaceAll("_", " "),
                  Array.isArray(v) ? v.join(", ") : v,
                ),
              )
              .join(
                "",
              )}${action("edit-record", "Edit record", r.id, "link")}</article>`,
        )
        .join("")
    : empty(
        "Nothing recorded yet",
        "Capture what happened, what you learned, and the next step.",
      );
}
function experiments() {
  return (
    header(
      "Learn before you build.",
      "Stage changes record your decision. They do not prove payment or market demand.",
    ) +
    `<div class="board">${data.stages
      .map(
        (s) =>
          `<section class="column"><h3>${e(s)} <small>${data.opportunities.filter((o) => o.stage === s).length}</small></h3>${
            data.opportunities
              .filter((o) => o.stage === s)
              .map(
                (o) =>
                  `<article class="card"><h3>${e(o.title)}</h3><p>${e(o.data.buyer || "Buyer unknown")}</p><p>${e(o.data.next_action || "Review evidence")}</p>${action("open", "Review", o.id)}</article>`,
              )
              .join("") || "<small>No opportunities in this stage</small>"
          }</section>`,
      )
      .join("")}</div>`
  );
}
function products() {
  const products = data.records.filter((r) => r.kind === "product");
  return (
    header(
      "Useful products, measured honestly.",
      "Track verified payments alongside the work required to deliver them.",
      action("product", "+ Add product", "", "primary"),
    ) +
    `<div class="warning">Live selling is disabled. Sandbox payments never count as collected revenue. Recurring revenue is unavailable until a recurring offer exists.</div>${
      products.length
        ? products
            .map((p) => {
              const payments = data.payments.filter(
                (x) => x.product_id === p.id,
              );
              const live = payments.filter(
                (x) => x.mode === "live" && x.state === "paid",
              );
              const costs = data.records.filter(
                (x) => x.kind === "cost" && x.data.product_id === p.id,
              );
              return `<section class="panel"><div class="panel-head"><div><h2>${e(p.data.title)}</h2><p class="muted">${e(p.data.deployment || "Not deployed")}</p></div>${action("open", "Originating opportunity", p.opportunity_id)}</div>${p.data.url ? `<a href="${e(safeUrl(p.data.url))}" rel="noopener noreferrer" target="_blank">Product website ↗</a>` : ""}<div class="stats"><div class="stat"><small>Collected</small><strong>${money(live.reduce((s, x) => s + Number(x.amount), 0))}</strong><span>Verified live USD only</span></div><div class="stat"><small>Refunded</small><strong>${money(live.reduce((s, x) => s + Number(x.refunded), 0))}</strong><span>Verified provider refunds</span></div><div class="stat"><small>Delivery costs</small><strong>${money(costs.reduce((s, x) => s + Number(x.data.amount || 0), 0))}</strong><span>Recorded USD costs</span></div><div class="stat"><small>Support time</small><strong>${costs.reduce((s, x) => s + Number(x.data.support_minutes || 0), 0)}m</strong><span>Recorded effort</span></div></div><p class="muted">${payments.filter((x) => x.mode === "sandbox" && x.state === "paid").length} paid sandbox checkouts · ${payments.filter((x) => x.state === "pending").length} pending · paid customer counts unavailable until live selling is enabled</p><div class="list-actions section-space">${action("checkout", "Create sandbox Checkout", p.id)}${action("edit-record", "Edit product", p.id)}</div></section>`;
            })
            .join("")
        : empty(
            "No products yet",
            "Create a product after defining the opportunity and validation experiment.",
          )
    }`
  );
}
function sources() {
  const s = data.sources[0];
  return (
    header(
      "Know where your evidence comes from.",
      "Connections, research constraints, and collection outcomes in one place.",
    ) +
    `<div class="split"><div><section class="panel"><div class="panel-head"><h2>Research profiles</h2>${action("profile", "+ New profile")}</div>${recordCards(data.records.filter((r) => r.kind === "profile"))}</section><section class="panel"><div class="panel-head"><h2>Stack Exchange</h2>${pill(s.enabled ? "Enabled" : "Disabled", s.enabled ? "" : "neutral")}</div><p class="muted">Attributed question titles from the official API. Discovery leads only; no body collection or model processing. Zero paid API spend.</p><div class="field-value"><a href="https://stackoverflow.com/legal/api-terms-of-use" target="_blank" rel="noopener noreferrer">API terms</a> · <a href="https://api.stackexchange.com/docs/throttle" target="_blank" rel="noopener noreferrer">Quota and backoff</a></div>${val("Last successful collection", date(s.last_success))}${val("Last failure", s.last_error || "None recorded")}${val("API quota remaining", s.quota_remaining ?? "Unknown until collection")}${val("Daily application cap", s.daily_limit + " jobs · 20 leads per job")}<div class="list-actions">${action("source", s.enabled ? "Collection controls" : "Enable permitted source")}${action("collect", "Queue collection")}${action("run", "Run queued job")}${action("import", "Import CSV / JSON")}</div></section><section class="panel"><h2>Evidence inbox</h2>${data.evidence.slice(0, 20).map(evidenceCard).join("") || empty("No evidence collected", "Add a permitted manual record or run a configured source.")}</section></div><div><section class="panel"><h2>Integration state</h2>${val("Stripe", data.integrations.stripe)}${val("Model generation", data.integrations.model)}${val("Reddit", "Disabled — commercial agreement required")}${val("LinkedIn", "Disabled — no unrestricted post search configured")}${val("X", "Disabled — no authorized API or budget")}${val("Google / web search", "Disabled — no available runtime connection configured")}${val("Scheduling", "Cron worker supported; see deployment report for activation state")}</section><section class="panel"><h2>Recent jobs</h2>${data.jobs.map((j) => `<div class="evidence">${pill(j.status, j.status === "failed" ? "warn" : "neutral")}<p>${j.added} added · attempt ${j.attempts}/3</p><small>${e(date(j.created_at))}</small><small>${e(j.error || "")}</small></div>`).join("") || empty("No scans claimed", "A successful timestamp appears only after a completed real collection.")}</section></div></div>`
  );
}
/** @param {string} name @param {string} label @param {string} type @param {any} value @param {string[]} options */
function field(name, label, type = "text", value = "", options = []) {
  return `<label for="f-${name}">${e(label)}</label>${type === "textarea" ? `<textarea id="f-${name}" name="${name}">${e(value)}</textarea>` : type === "select" ? `<select id="f-${name}" name="${name}">${options.map((v) => `<option value="${e(v)}" ${String(value) === String(v) ? "selected" : ""}>${e(data.records?.find((r) => r.id === v)?.data.title || data.evidence?.find((r) => r.id === v)?.data.note?.slice(0, 70) || v || "Unknown")}</option>`).join("")}</select>` : `<input id="f-${name}" name="${name}" type="${type}" value="${e(value)}">`}`;
}
function edit(title, html, callback) {
  fields.innerHTML = `<h2>${e(title)}</h2>${html}`;
  save = callback;
  document.querySelector("#form-error").textContent = "";
  dialog.showModal();
}
function opportunityForm(id = "") {
  const o = data.opportunities.find((x) => x.id === id);
  const d = o?.data || {};
  edit(
    o ? "Edit opportunity" : "New opportunity",
    [
      ["title", "Specific problem"],
      ["buyer", "Target buyer"],
      ["task", "Recurring task"],
      ["workaround", "Current workaround"],
      ["outcome", "Narrow proposed outcome"],
      ["price", "Price hypothesis (unverified)"],
      ["acquisition", "Concrete acquisition route"],
      ["effort", "Delivery effort estimate"],
      ["next_action", "Next action"],
    ]
      .map(([k, l]) => field(k, l, "text", d[k] || o?.[k] || ""))
      .join(""),
    (v) => api("opportunity", { ...d, ...v, ...(id ? { id } : {}) }),
  );
}
const recordFields = {
  profile: [
    ["title", "Profile name"],
    ["buyer", "Target buyer and niche"],
    ["phrases", "Search phrase (one bounded query)"],
    ["exclusions", "Excluded words (comma separated)"],
    ["domains", "Relevant communities and domains"],
    ["skills", "Available skills"],
    ["time", "Time available"],
    ["budget", "Research budget"],
    ["distribution", "Distribution access"],
    ["scope", "Preferred scope"],
    ["support", "Support constraints"],
    ["schedule", "Schedule hourly via cron? yes / blank"],
  ],
  experiment: [
    ["title", "Experiment name"],
    ["hypothesis", "Testable hypothesis"],
    ["success_criteria", "Success criteria"],
    ["next_step", "Next step"],
    ["due_date", "Due date"],
  ],
  interview: [
    ["title", "Interview reference (minimize personal information)"],
    ["date", "Interview date"],
    ["notes", "Consented interview notes"],
    ["workaround", "Current workaround"],
    ["frequency", "Frequency"],
    ["spending", "Explicit spending"],
    ["objections", "Objections"],
    ["next_step", "Next step"],
  ],
  offer: [
    ["title", "Sandbox offer fixture"],
    ["scope", "Included scope and exclusions"],
    ["amount", "Price in integer cents"],
    ["currency", "Currency (usd)"],
    ["terms", "Delivery and refund terms"],
    ["outcome", "Outcome"],
    ["objections", "Objections"],
  ],
  alternative: [
    ["title", "Alternative / workaround"],
    ["url", "Original URL"],
    ["strength", "What it solves"],
    ["gap", "Specific gap (hypothesis unless supported)"],
    ["evidence_ids", "Supporting evidence IDs"],
  ],
  brief: [
    ["title", "Brief name"],
    ["workflow", "One primary workflow"],
    ["acceptance", "Acceptance criteria"],
    ["data_handling", "Data handling"],
    ["delivery", "Delivery and support"],
    ["later", "Explicit later list"],
    ["evidence_ids", "Supporting evidence IDs"],
  ],
  decision: [
    ["title", "Continue / narrow / stop"],
    ["reason", "Reason and outcome"],
    ["evidence_ids", "Supporting evidence IDs"],
    ["next_step", "Next step"],
  ],
  product: [
    ["title", "Product name"],
    ["url", "Product URL"],
    ["deployment", "Actual deployment state"],
    ["experiment_id", "Origin experiment ID"],
  ],
  cost: [
    ["title", "Cost description"],
    ["product_id", "Product ID"],
    ["amount", "USD cents"],
    ["support_minutes", "Support minutes"],
    ["hourly_rate", "Internal hourly USD rate"],
  ],
};
function recordForm(kind, opportunity = "", id = "") {
  const r = data.records.find((x) => x.id === id);
  const d = r?.data || {};
  edit(
    `${id ? "Edit" : "Create"} ${kind}`,
    (!opportunity && kind !== "profile"
      ? field(
          "opportunity_id",
          "Origin opportunity",
          "select",
          "",
          data.opportunities.map((x) => x.id),
        )
      : "") +
      recordFields[kind]
        .map(([k, l]) =>
          field(
            k,
            l,
            [
              "notes",
              "scope",
              "workflow",
              "acceptance",
              "reason",
              "gap",
              "terms",
            ].includes(k)
              ? "textarea"
              : ["experiment_id", "product_id"].includes(k)
                ? "select"
                : "text",
            (k === "schedule" ? (d[k] ? "yes" : "") : d[k]) ??
              (k === "currency" ? "usd" : ""),
            ["experiment_id", "product_id"].includes(k)
              ? data.records
                  .filter(
                    (r) =>
                      r.kind ===
                        (k === "experiment_id" ? "experiment" : "product") &&
                      (!opportunity || r.opportunity_id === opportunity),
                  )
                  .map((r) => r.id)
              : [],
          ),
        )
        .join(""),
    (v) => {
      const opp = opportunity || v.opportunity_id;
      delete v.opportunity_id;
      if (kind === "offer") v.mode = "sandbox";
      if (kind === "profile") v.schedule = v.schedule?.toLowerCase() === "yes";
      return api("record", {
        kind,
        id,
        opportunity_id: opp,
        data: { ...d, ...v },
      });
    },
  );
}
async function doAction(name, id) {
  if (name === "signin") {
    page = "Sign in";
    render();
    return;
  }
  if (name === "public") {
    page = "Today";
    render();
    return;
  }
  if (name === "logout") {
    await api("logout", {});
    session = await api("session");
    selected = "";
    render();
    return;
  }
  if (name === "open") {
    selected = id;
    tab = "Overview";
    render();
    return;
  }
  if (name === "back") {
    selected = "";
    render();
    return;
  }
  if (name === "new" || name === "edit") {
    opportunityForm(id);
    return;
  }
  if (name === "profile") {
    recordForm("profile");
    return;
  }
  if (name === "product") {
    recordForm("product");
    return;
  }
  if (name.startsWith("record-")) {
    recordForm(name.slice(7), id);
    return;
  }
  if (name === "edit-record") {
    const r = data.records.find((x) => x.id === id);
    recordForm(r.kind, r.opportunity_id || "", id);
    return;
  }
  if (name === "stage") {
    const o = data.opportunities.find((x) => x.id === id);
    edit(
      "Record a stage decision",
      field(
        "stage",
        "Stage",
        "select",
        o.stage === "Archived" ? "Investigating" : o.stage,
        data.stages,
      ) +
        field("reason", "Why change the stage?", "textarea") +
        '<p class="muted">This records a decision, not payment verification.</p>',
      (v) => api("stage", { id, ...v }),
    );
    return;
  }
  if (name === "assess") {
    const o = data.opportunities.find((x) => x.id === id);
    edit(
      "Evidence-backed assessment",
      Object.entries(data.weights)
        .map(
          ([k, w]) =>
            field(
              k,
              `${k.replaceAll("_", " ")} · ${w}%`,
              "select",
              o.data.assessment?.[k]?.rating ?? "",
              ["", "0", "1", "2", "3", "4"],
            ) +
            field(
              k + "_ids",
              "Linked evidence IDs, comma separated",
              "text",
              o.data.assessment?.[k]?.evidence_ids?.join(", ") || "",
            ),
        )
        .join(""),
      (v) => {
        const assessment = {};
        for (const k of Object.keys(data.weights))
          assessment[k] = {
            rating: v[k] === "" ? "" : Number(v[k]),
            evidence_ids: v[k + "_ids"]
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean),
          };
        return api("opportunity", {
          ...o.data,
          id,
          title: o.title,
          assessment,
        });
      },
    );
    return;
  }
  if (name === "evidence") {
    edit(
      "Record permitted evidence",
      [
        ["note", "Permitted excerpt or researcher note"],
        ["source", "Source"],
        ["url", "Original URL (optional for first-party interview)"],
        ["published_at", "Publication date (leave unknown blank)"],
        ["permission", "Right to collect, retain and display this record"],
        ["buyer", "Buyer"],
        ["task", "Task"],
        ["workaround", "Workaround"],
        ["frequency", "Frequency"],
        ["spending", "Explicit spending signal"],
      ]
        .map(([k, l]) => field(k, l, k === "note" ? "textarea" : "text"))
        .join("") +
        field("verification", "Verification state", "select", "unverified", [
          "unverified",
          "discovery lead",
          "verified original",
          "direct account",
          "repost",
        ]),
      (v) => api("evidence", { ...v, opportunity_id: id }),
    );
    return;
  }
  if (name === "verify") {
    const x = data.evidence.find((x) => x.id === id);
    edit(
      "Review original evidence",
      field(
        "verification",
        "Verification status",
        "select",
        x.data.verification,
        [
          "unverified",
          "discovery lead",
          "verified original",
          "direct account",
          "repost",
        ],
      ) +
        field(
          "quality",
          "Verification notes",
          "textarea",
          x.data.quality || "",
        ),
      (v) => api("verify", { id, ...v }),
    );
    return;
  }
  if (name === "link") {
    edit(
      "Link existing evidence",
      field(
        "evidence_id",
        "Evidence ID",
        "select",
        "",
        data.evidence.map((x) => x.id),
      ),
      (v) => api("link", { opportunity_id: id, ...v }),
    );
    return;
  }
  if (name === "import") {
    edit(
      "Import permissioned evidence",
      '<p class="muted">JSON array or CSV with headers: note, source, url, permission, buyer, task, workaround, frequency, spending, verification. Max 200 rows. Permission is required per row.</p><label for="import-file">Select CSV or JSON</label><input type="file" id="import-file" accept=".csv,.json">' +
        field("rows", "Or paste JSON array", "textarea"),
      async (v) => {
        const f = /** @type {HTMLInputElement} */ (
          document.querySelector("#import-file")
        ).files?.[0];
        const content = f ? await f.text() : v.rows;
        const rows = content.trim().startsWith("[")
          ? JSON.parse(content)
          : parseCSV(content);
        const result = await api("import", {
          rows: rows.map((x) => ({
            ...x,
            ...(id ? { opportunity_id: id } : {}),
          })),
        });
        notice(
          `${result.added} added; ${result.duplicates} duplicates skipped`,
        );
        return result;
      },
    );
    return;
  }
  if (name === "source") {
    const s = data.sources[0];
    edit(
      "Collection controls",
      field(
        "enabled",
        "Enable permitted title collection",
        "select",
        s.enabled ? "yes" : "no",
        ["yes", "no"],
      ) +
        field("daily_limit", "Daily job cap (1–20)", "number", s.daily_limit) +
        '<p class="muted">20 leads per job; three bounded attempts. No paid API spend. Quotas and backoff can stop collection earlier.</p>',
      (v) =>
        api("source", {
          id: s.id,
          enabled: v.enabled === "yes",
          daily_limit: Number(v.daily_limit),
        }),
    );
    return;
  }
  if (name === "collect") {
    const profiles = data.records.filter((r) => r.kind === "profile");
    edit(
      "Queue bounded collection",
      field(
        "profile_id",
        "Research profile ID",
        "select",
        "",
        profiles.map((x) => x.id),
      ),
      (v) => api("collect", v),
    );
    return;
  }
  if (name === "run") {
    const result = await api("run", {});
    notice("Job outcome: " + result.status);
    await refresh();
    return;
  }
  if (name === "checkout") {
    const p = data.records.find((r) => r.id === id);
    const offers = data.records.filter(
      (r) => r.kind === "offer" && r.opportunity_id === p.opportunity_id,
    );
    const experiments = data.records.filter(
      (r) => r.kind === "experiment" && r.opportunity_id === p.opportunity_id,
    );
    const request_id = Array.from(
      crypto.getRandomValues(new Uint8Array(12)),
      (x) => x.toString(16).padStart(2, "0"),
    ).join("");
    edit(
      "Create a sandbox purchase",
      '<div class="warning">Test environment only. Hosted Checkout does not count as paid until a signed successful event arrives.</div>' +
        field(
          "offer_id",
          "Sandbox offer ID",
          "select",
          "",
          offers.map((x) => x.id),
        ) +
        field(
          "experiment_id",
          "Experiment ID",
          "select",
          p.data.experiment_id || "",
          experiments.map((x) => x.id),
        ),
      async (v) => {
        const result = await api("checkout", {
          ...v,
          product_id: id,
          request_id,
        });
        location.assign(result.url);
      },
    );
    return;
  }
}
function parseCSV(input) {
  const rows = [];
  let row = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      if (quoted && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" && !quoted) {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  const headers = rows.shift()?.map((x) => x.trim()) || [];
  if (!headers.includes("note") || !headers.includes("permission"))
    throw new Error("CSV needs note and permission headers");
  return rows
    .filter((r) => r.some(Boolean))
    .map((r) => {
      if (r.length !== headers.length)
        throw new Error("CSV column count mismatch");
      return Object.fromEntries(headers.map((h, i) => [h, r[i]]));
    });
}
document.addEventListener("click", async (event) => {
  const t = /** @type {HTMLElement} */ (event.target);
  const button = t.closest("button");
  if (!button) return;
  if (button.dataset.page) {
    page = button.dataset.page;
    selected = "";
    render();
  }
  if (button.dataset.tab) {
    tab = button.dataset.tab;
    render();
  }
  if (button.dataset.action) {
    try {
      await doAction(button.dataset.action, button.dataset.id || "");
    } catch (error) {
      notice(error.message);
    }
  }
});
document.addEventListener("input", (event) => {
  if (
    [
      "search",
      "stage-filter",
      "confidence-filter",
      "source-filter",
      "effort-filter",
    ].includes(/** @type {HTMLElement} */ (event.target).id)
  )
    filterRows();
});
document.addEventListener("submit", async (event) => {
  const target = /** @type {HTMLFormElement} */ (event.target);
  if (target.id !== "login") return;
  event.preventDefault();
  try {
    await api("login", Object.fromEntries(new FormData(target)));
    session = await api("session");
    page = "Today";
    await refresh();
  } catch (error) {
    document.querySelector("#login-error").textContent = error.message;
  }
});
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = /** @type {HTMLButtonElement} */ (
    form.querySelector("[type=submit]")
  );
  submit.disabled = true;
  try {
    if (save) await save(Object.fromEntries(new FormData(form)));
    dialog.close();
    await refresh();
    notice("Saved to the server");
  } catch (error) {
    document.querySelector("#form-error").textContent = error.message;
  } finally {
    submit.disabled = false;
  }
});
document
  .querySelector("#cancel")
  .addEventListener("click", () => dialog.close());
(async () => {
  try {
    session = await api("session");
    if (session.authenticated) await refresh();
    else render();
  } catch (error) {
    app.innerHTML =
      '<main id="main" class="login"><h1>Unable to load workspace</h1><p>Check the server connection, then refresh. No successful scan or payment is assumed.</p></main>';
  }
})();
