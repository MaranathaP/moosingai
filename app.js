const DEFAULT_RESOURCES = [
  { id: 1, name: "Claude Pro", vendor: "Anthropic", category: "llm", kind: "subscription", monthlyCost: 20, renewal: "2026-11-15", usagePct: 45, capabilities: ["code-gen","chat-writing","research"], notes: "Primary reasoning & long context" },
  { id: 2, name: "ChatGPT Plus", vendor: "OpenAI", category: "llm", kind: "subscription", monthlyCost: 20, renewal: "2026-11-10", usagePct: 60, capabilities: ["chat-writing","research","image-gen"], notes: "Strong for everyday + DALL-E" },
  { id: 3, name: "Grok SuperGrok / X Premium", vendor: "xAI", category: "llm", kind: "subscription", monthlyCost: 30, renewal: "2026-11-20", usagePct: 30, capabilities: ["chat-writing","research","automation"], notes: "Includes Grok Bot" },
  { id: 4, name: "Gemini Pro", vendor: "Google", category: "llm", kind: "subscription", monthlyCost: 20, renewal: "2026-11-05", usagePct: 25, capabilities: ["research","chat-writing","multimodal"], notes: "Great for Google ecosystem" },
  { id: 5, name: "Suno AI Pro", vendor: "Suno", category: "audio", kind: "subscription", monthlyCost: 10, renewal: "2026-11-12", usagePct: 15, capabilities: ["audio"], notes: "Music generation" },
  { id: 6, name: "GitHub Free", vendor: "GitHub", category: "other", kind: "free-tier", monthlyCost: 0, usagePct: 40, capabilities: ["hosting","automation"], notes: "Repos & Actions" },
  { id: 7, name: "Hostinger Hosting", vendor: "Hostinger", category: "hosting", kind: "subscription", monthlyCost: 0, renewal: "2027-10-01", usagePct: 50, capabilities: ["hosting","domain","email"], notes: "Paid for year, multiple sites" },
  { id: 8, name: "Stripe", vendor: "Stripe", category: "payments", kind: "free-tier", monthlyCost: 0, usagePct: 0, capabilities: ["payments"], notes: "Connect for Payment Links" }
];

const IDEAS = [
  {
    title: "AI Multi-Model Content Packs for Niches",
    type: "digital-product",
    problem: "Creators and small businesses spend hours prompting across tools for consistent output.",
    offer: "Ready-to-use prompt packs + workflow guides for one niche (e.g. realtors, coaches, local shops). Produced with Claude + ChatGPT + Gemini.",
    price: 29,
    speed: 5,
    revenuePath: "Sell 140 packs = $4,060. Launch on Gumroad or own site with Stripe Payment Link.",
    tools: ["Claude Pro", "ChatGPT Plus", "Gemini Pro"],
    firstSteps: "Pick 1 niche today. Generate 20 prompts in Claude. Package PDF + Notion template. Stripe link. Post in 2 relevant communities."
  },
  {
    title: "Done-With-You AI Setup Session (30-min)",
    type: "service",
    problem: "Non-technical owners stall on choosing and configuring AI tools.",
    offer: "Live 30-min session + written playbook tailored to their business using your full stack.",
    price: 99,
    speed: 5,
    revenuePath: "40 sessions = $3,960. Book via Calendly + Stripe.",
    tools: ["All LLMs", "Grok Bot"],
    firstSteps: "Write session outline. Create Stripe Payment Link. Offer 5 free discovery calls in LinkedIn/local groups."
  },
  {
    title: "Agent-Ready Micro API / Data Utility",
    type: "api",
    problem: "Developers and agents need clean structured answers without scraping.",
    offer: "Simple pay-per-call JSON endpoint (e.g. niche research summary). Host on Hostinger Node.",
    price: 0.01,
    speed: 3,
    revenuePath: "400k calls = $4k (or prepaid credits). Start with one high-value endpoint.",
    tools: ["Claude Pro", "Hostinger", "Stripe"],
    firstSteps: "Define one endpoint. Build minimal Express route. Stripe meter or prepaid credits."
  },
  {
    title: "Suno-Powered Niche Audio Assets",
    type: "digital-product",
    problem: "Podcasters and video creators need custom intros, beds, and stings fast.",
    offer: "Pack of 10 commercial-ready tracks + stems for one vertical.",
    price: 49,
    speed: 4,
    revenuePath: "82 packs = $4,018. Check Suno commercial terms carefully.",
    tools: ["Suno AI Pro"],
    firstSteps: "Generate 5 test tracks. Confirm license. Package and list."
  }
];

let state = {
  resources: JSON.parse(localStorage.getItem("moosing_resources")) || DEFAULT_RESOURCES,
  ledger: JSON.parse(localStorage.getItem("moosing_ledger")) || [],
  activeTab: "dashboard"
};

function save() {
  localStorage.setItem("moosing_resources", JSON.stringify(state.resources));
  localStorage.setItem("moosing_ledger", JSON.stringify(state.ledger));
}

function render() {
  const main = document.getElementById("app");
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("active", b.dataset.tab === state.activeTab));
  if (state.activeTab === "dashboard") main.innerHTML = renderDashboard();
  else if (state.activeTab === "inventory") main.innerHTML = renderInventory();
  else if (state.activeTab === "ideas") main.innerHTML = renderIdeas();
  else if (state.activeTab === "sprints") main.innerHTML = renderSprints();
  else if (state.activeTab === "ledger") main.innerHTML = renderLedger();
}

function renderDashboard() {
  const totalCost = state.resources.reduce((s, r) => s + (r.monthlyCost || 0), 0);
  const avgUsage = Math.round(state.resources.reduce((s, r) => s + (r.usagePct || 0), 0) / state.resources.length);
  const revenue = state.ledger.filter(e => e.type === "revenue").reduce((s, e) => s + e.amount, 0);
  return `
    <div class="grid">
      <div class="card"><h3>Monthly AI Spend</h3><p style="font-size:2rem;margin:0">$${totalCost}</p></div>
      <div class="card"><h3>Avg Usage</h3><p style="font-size:2rem;margin:0">${avgUsage}%</p></div>
      <div class="card"><h3>Tracked Revenue</h3><p style="font-size:2rem;margin:0">$${revenue}</p></div>
      <div class="card"><h3>Goal</h3><p style="font-size:2rem;margin:0">$4,000 / 30d</p></div>
    </div>
    <div class="card">
      <h3>Top Actions</h3>
      <ol>
        <li>Pick the highest-speed idea below and launch a Stripe Payment Link today.</li>
        <li>Update usage % for each tool after this week's sessions.</li>
        <li>Log every sale in the Ledger so the dashboard stays honest.</li>
        <li>Use under-used tools (Suno, Grok) on the chosen venture this week.</li>
      </ol>
    </div>
  `;
}

function renderInventory() {
  let rows = state.resources.map(r => `
    <tr>
      <td>${r.name}</td>
      <td>${r.vendor}</td>
      <td>$${r.monthlyCost || 0}</td>
      <td>${r.renewal || "—"}</td>
      <td>${r.usagePct || 0}%</td>
      <td><button onclick="editResource(${r.id})">Edit</button></td>
    </tr>`).join("");
  return `
    <div class="card">
      <h3>AI & Hosting Resources</h3>
      <table><thead><tr><th>Name</th><th>Vendor</th><th>Cost</th><th>Renewal</th><th>Usage</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table>
      <button class="primary" onclick="addResource()">+ Add Resource</button>
    </div>
  `;
}

function renderIdeas() {
  return `<div class="grid">${IDEAS.map((idea, i) => `
    <div class="card">
      <h3>${idea.title}</h3>
      <span class="badge ${idea.speed >= 5 ? "high" : idea.speed >= 4 ? "med" : "low"}">Speed ${idea.speed}/5</span>
      <p><strong>Problem:</strong> ${idea.problem}</p>
      <p><strong>Offer:</strong> ${idea.offer}</p>
      <p><strong>Price:</strong> $${idea.price} &nbsp; <strong>Path:</strong> ${idea.revenuePath}</p>
      <p><strong>Tools:</strong> ${idea.tools.join(", ")}</p>
      <p><strong>First steps:</strong> ${idea.firstSteps}</p>
      <button class="primary" onclick="startSprint(${i})">Start 10-day Sprint</button>
    </div>`).join("")}</div>`;
}

function renderSprints() {
  return `<div class="card"><h3>10-Day Sprint Template</h3>
    <ol>
      <li><strong>Days 1-2 Validate:</strong> Talk to 10 potential buyers. Get 3 pre-orders or clear "I would pay" signals. Kill if none.</li>
      <li><strong>Days 3-6 Build:</strong> Use Claude/ChatGPT/Gemini to produce the asset or service materials. Host on Hostinger if needed.</li>
      <li><strong>Days 7-8 Launch:</strong> Stripe Payment Link + simple landing page. Post in 3 communities where buyers already are.</li>
      <li><strong>Days 9-10 Learn:</strong> Log results in Ledger. Double down or kill based on real sales.</li>
    </ol>
    <p>All work stays inside existing subscriptions. No new spend required.</p>
  </div>`;
}

function renderLedger() {
  let rows = state.ledger.map(e => `<tr><td>${e.date}</td><td>${e.type}</td><td>$${e.amount}</td><td>${e.note || ""}</td></tr>`).join("");
  return `<div class="card"><h3>Ledger</h3>
    <table><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table>
    <form onsubmit="addLedger(event)">
      <select name="type"><option>revenue</option><option>cost</option></select>
      <input name="amount" type="number" step="0.01" placeholder="Amount" required>
      <input name="note" placeholder="Note / source">
      <button class="primary">Add Entry</button>
    </form></div>`;
}

function addLedger(e) {
  e.preventDefault();
  const f = e.target;
  state.ledger.push({ date: new Date().toISOString().slice(0,10), type: f.type.value, amount: parseFloat(f.amount.value), note: f.note.value });
  save(); render();
}

function startSprint(i) {
  alert(`Sprint started for: ${IDEAS[i].title}\n\nOpen Inventory and mark the tools you'll use. Log pre-orders in Ledger. Ship the smallest version by day 7.`);
  state.activeTab = "sprints";
  render();
}

function addResource() {
  const name = prompt("Resource name");
  if (!name) return;
  state.resources.push({ id: Date.now(), name, vendor: "", monthlyCost: 0, usagePct: 0, capabilities: [] });
  save(); render();
}

function editResource(id) {
  const r = state.resources.find(x => x.id === id);
  if (!r) return;
  const usage = prompt("Usage % (0-100)", r.usagePct);
  if (usage !== null) r.usagePct = parseInt(usage) || 0;
  const cost = prompt("Monthly cost $", r.monthlyCost);
  if (cost !== null) r.monthlyCost = parseFloat(cost) || 0;
  save(); render();
}

document.querySelectorAll("nav button").forEach(b => {
  b.onclick = () => { state.activeTab = b.dataset.tab; render(); };
});

render();
