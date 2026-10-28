const IDEAS = [
  {
    id: "invoice-chase",
    title: "Late Invoice Chase Automation",
    score: 9.5,
    sources: "Reddit r/smallbusiness, X, multiple AR automation write-ups",
    problem: "Small business owners spend ~14 hours a month chasing unpaid invoices. They feel awkward following up, so cash sits unpaid. Average small business is owed thousands in overdue invoices.",
    oneLiner: "AI drafts timed, polite-to-firm reminder emails (or SMS) for overdue invoices. Owner approves before anything is sent.",
    price: "$150–300 setup + $300–500/mo per client",
    revenueRange: "5 clients ≈ $2,000/mo",
    speedReason: "Clear pain, immediate ROI (faster cash), can be sold as a service or simple tool with existing LLMs + email/SMS."
  },
  {
    id: "missed-calls",
    title: "Missed Call + Lead Follow-up for Home Services",
    score: 9.2,
    sources: "X posts on missed calls for trades, Reddit service business threads",
    problem: "Plumbers, HVAC, electricians, and realtors lose jobs because they miss calls while on site and fail to follow up on quotes. Leads go cold within hours.",
    oneLiner: "AI answers missed calls or instantly texts back, qualifies the lead, books a slot or sends a quote template. Optional bilingual support.",
    price: "$200–400 setup + $200–400/mo per business",
    revenueRange: "6–8 clients ≈ $1,800–3,200/mo",
    speedReason: "High willingness to pay in trades; simple SMS/voice flows can be built fast with existing AI tools."
  },
  {
    id: "faq-agent",
    title: "Approval-First FAQ / Support Agent",
    score: 8.7,
    sources: "r/smallbusiness, r/SideProject, X on AI agents",
    problem: "Owners answer the same 5–10 customer questions daily. They distrust fully autonomous AI that might send wrong info or damage relationships.",
    oneLiner: "AI drafts replies to common questions (orders, hours, pricing, returns). Owner reviews and approves in one click before send.",
    price: "$100–250 setup + $150–300/mo",
    revenueRange: "8 clients ≈ $1,600–2,400/mo",
    speedReason: "Low technical bar, high trust model (approval-first), easy to demo with any LLM."
  },
  {
    id: "local-visibility",
    title: "Local Shop Visibility Pack",
    score: 8.4,
    sources: "Reddit local business threads, X on Google Business & AI visibility",
    problem: "Small local shops (salons, tire shops, restaurants, contractors) have weak Google Business profiles, slow review responses, and no consistent content. They lose local search traffic.",
    oneLiner: "Done-with-you pack: optimized Google Business Profile, review response templates, and 30 days of social/content posts generated with AI.",
    price: "$99–199 one-time or $99/mo retainer",
    revenueRange: "20 packs/mo ≈ $2,000+",
    speedReason: "Productized service; can be delivered with Claude/ChatGPT + free Google tools. Easy to post in local groups."
  },
  {
    id: "doc-extraction",
    title: "Vendor Invoice & Document Data Extraction",
    score: 8.0,
    sources: "r/smallbusiness (SKU/invoice complaints), contractor case studies",
    problem: "Businesses drown in messy vendor invoices, paper catalogs, and emails. Manual entry into accounting systems takes hours and introduces errors.",
    oneLiner: "AI + OCR extracts line items, amounts, tax IDs, and job numbers from invoices/PDFs and drops structured data into a sheet or accounting tool.",
    price: "$250–500 setup + $150–300/mo",
    revenueRange: "5–6 clients ≈ $1,200–1,800/mo",
    speedReason: "Proven time savings (5–6 hrs/week reported); can start with Claude vision or simple scripts."
  },
  {
    id: "niche-packs",
    title: "Vertical Workflow & Prompt Packs",
    score: 7.5,
    sources: "Reddit creator/coach threads, previous MoosingAI ideas",
    problem: "Realtors, coaches, and local service providers waste hours writing the same follow-ups, listing descriptions, or content from scratch.",
    oneLiner: "Ready-to-use prompt packs + short workflow guides for one niche (e.g., realtor follow-up sequence, coach content calendar).",
    price: "$29–79 per pack",
    revenueRange: "50–100 packs/mo ≈ $1,500–4,000",
    speedReason: "Digital product; can be created in a day with existing LLMs and sold via Stripe/Gumroad."
  }
];

const PLANS = {
  "invoice-chase": {
    solution: "Build a simple workflow: client pastes or uploads open invoices (CSV/PDF). AI classifies by days overdue, selects tone (friendly → firm), and drafts a personalized reminder email or SMS with a payment link. Owner reviews the batch once a week and hits approve/send. Can run via email forwarding + Claude/ChatGPT or a lightweight n8n/Zapier flow.",
    expectedRevenue: "Setup $150–300 + $300–500/month per client. Target 5 clients in 30 days = ~$2,000 recurring. Upsell to voice follow-ups or QuickBooks/Xero integration later.",
    pathToMarket: "Productize as a 'Monday Invoice Chase' service. Offer a 15-minute free audit of their current AR process. Deliver the first week of drafts as a paid pilot ($150).",
    clientAcquisition: "Post in r/smallbusiness, Facebook groups for freelancers/contractors, and local Chambers. Cold DM or email bookkeepers and virtual assistants who already serve multiple clients. Offer white-label to agencies. LinkedIn: 'I help trades and agencies get paid 5–7 days faster without awkward calls.'",
    timeline: "Day 1–2: Build template prompts and a Google Sheet intake form. Day 3–5: Run pilot with 1–2 friendly businesses. Day 6–10: Package offer, create Stripe Payment Link, post in 3 communities. Day 11–30: Close 4–5 clients.",
    tools: "Claude Pro or ChatGPT Plus for drafting, Google Sheets or Airtable for tracking, Stripe for payments, optional n8n/Zapier for automation.",
    first7Days: "1. Write 4 reminder templates (due date, 7 days late, 14 days, 30 days). 2. Create a simple intake form. 3. Offer free 'invoice health check' to 10 people in relevant groups. 4. Close first paid pilot.",
    risks: "Clients may already have basic reminders in QuickBooks. Differentiate with AI-personalized tone + approval workflow + weekly summary. Some owners still want to handle high-value clients manually."
  },
  "missed-calls": {
    solution: "For home-service businesses: when a call is missed, an AI instantly sends an SMS ('Sorry I missed you — what's the job and when works?') and qualifies the lead. Optionally connect a simple AI voice agent or just a callback scheduling link. For realtors: same for inbound leads.",
    expectedRevenue: "$200–400 setup + $200–400/mo. 6–8 clients = $1,800–3,200/mo. High retention because lost jobs are visible and painful.",
    pathToMarket: "Sell as 'Never Miss a Lead Again' package. Start with SMS-only (easiest), add voice later. Partner with local marketing agencies that already serve trades.",
    clientAcquisition: "Target Facebook groups and Nextdoor for local trades. Offer free missed-call audit. Post case-style content on X and LinkedIn. Door-to-door or in-person at contractor breakfasts if local. Use Reddit r/Plumbing, r/HVAC, etc.",
    timeline: "Week 1: Build SMS flow with Twilio or simple Make.com + Claude. Week 2: Pilot with 1–2 businesses. Week 3–4: Scale outreach and close 5+.",
    tools: "Claude/ChatGPT for message logic, Twilio or similar for SMS, Stripe, optional Calendly.",
    first7Days: "1. Draft the SMS sequence. 2. Find 5 local trades on Google and message them. 3. Offer a free 7-day trial of the SMS reply system.",
    risks: "Regulatory (TCPA for SMS). Keep it opt-in and business-related. Competition from existing answering services; emphasize AI speed + lower cost."
  },
  "faq-agent": {
    solution: "Collect the 10 most common customer questions. AI drafts replies in the brand voice. Owner gets a daily or real-time queue to approve/edit/send. Can start as a shared inbox + Claude and evolve into a lightweight web dashboard.",
    expectedRevenue: "$100–250 setup + $150–300/mo. Easy to reach 8 clients for ~$2k/mo. Low churn if it saves real time.",
    pathToMarket: "Position as 'AI that drafts, you approve.' Sell to e-commerce stores, service businesses, and coaches. Start with email/SMS only.",
    clientAcquisition: "Reddit r/shopify, r/smallbusiness, Facebook ecom groups. Offer to audit their last 50 support emails for free and show the draft replies.",
    timeline: "Days 1–3: Build prompt templates and a simple approval sheet. Days 4–7: Pilot. Days 8–21: Outreach and close.",
    tools: "Claude Pro / ChatGPT Plus, Google Sheets or Notion for the approval queue, Stripe.",
    first7Days: "1. Create the approval workflow in a sheet. 2. Reach out to 10 small ecom or service owners. 3. Deliver one free sample day of drafts.",
    risks: "Owners may still prefer to answer personally. Emphasize time savings on repetitive questions only. Keep human in the loop to maintain trust."
  },
  "local-visibility": {
    solution: "Done-with-you or productized: optimize Google Business Profile (photos, services, posts), create review-response templates, and generate 30 days of social content tailored to the shop. Deliver as a PDF + live profile updates.",
    expectedRevenue: "$99–199 per pack or $99/mo retainer. 20 one-time packs = $2,000+. Retainers compound.",
    pathToMarket: "Productize hard. Create a simple landing page. Sell via local Facebook groups, Nextdoor, and direct outreach to shops with weak profiles.",
    clientAcquisition: "Search Google Maps for businesses with <10 reviews or incomplete profiles. Message owners. Post in city-specific Facebook groups. Partner with local web designers.",
    timeline: "Day 1: Build template. Days 2–5: Deliver 3 free or discounted pilots for testimonials. Days 6–30: Sell 15–20 packs.",
    tools: "Claude/ChatGPT/Gemini for content, free Google Business tools, Canva optional, Stripe.",
    first7Days: "1. Pick one city. 2. Find 20 shops with weak profiles. 3. Offer a free profile audit + sample posts. 4. Close first 3 paid.",
    risks: "Some owners ignore Google. Focus on those already complaining about slow business. Keep delivery fast so it feels effortless."
  },
  "doc-extraction": {
    solution: "Client forwards invoices or uploads PDFs. AI extracts vendor, amount, line items, dates, and job codes into a structured Google Sheet or CSV ready for QuickBooks/Xero import. Human reviews edge cases.",
    expectedRevenue: "$250–500 setup + $150–300/mo. 5–6 clients = solid $1,200–1,800/mo with room to grow.",
    pathToMarket: "Target contractors, agencies, and anyone with high invoice volume. Sell the time savings (5+ hours/week).",
    clientAcquisition: "Reddit contractor and bookkeeping communities. LinkedIn outreach to operations managers. Offer a free sample extraction of 10 invoices.",
    timeline: "Week 1: Build extraction prompts and sheet template. Week 2: Pilot. Weeks 3–4: Close clients.",
    tools: "Claude (vision) or ChatGPT, Google Sheets, optional simple script, Stripe.",
    first7Days: "1. Create the extraction prompt and output template. 2. Process 5 sample invoices publicly as proof. 3. Reach out to 10 contractors.",
    risks: "Accuracy on messy scans. Always include a human review step. Some accounting software already has basic OCR."
  },
  "niche-packs": {
    solution: "Pick one niche (realtors, coaches, local shops). Generate 20–40 high-quality prompts + a short workflow guide (PDF or Notion). Sell as a digital download with optional setup call.",
    expectedRevenue: "$29–79 per pack. 50–100 sales/mo is realistic with consistent posting = $1,500–4,000.",
    pathToMarket: "Create the pack in one day. List on Gumroad or own Stripe page. Drive traffic from Reddit, X, and niche Facebook groups.",
    clientAcquisition: "Post the first 5 prompts for free in relevant communities. Use the engagement to sell the full pack. Run simple X threads.",
    timeline: "Day 1: Choose niche and generate pack. Day 2: Package and set up Stripe. Days 3–30: Post daily and sell.",
    tools: "Claude + ChatGPT + Gemini for generation, Stripe or Gumroad, simple landing page on Hostinger.",
    first7Days: "1. Generate the pack. 2. Create payment link. 3. Post free samples in 3 communities. 4. Collect first sales.",
    risks: "Digital products require consistent distribution. Quality must be high or refunds rise. Start with one niche and iterate."
  }
};

let state = {
  view: "ideas",
  openPlan: null,
  saved: JSON.parse(localStorage.getItem("moosing_saved") || "[]")
};

function saveState() {
  localStorage.setItem("moosing_saved", JSON.stringify(state.saved));
}

function render() {
  const main = document.getElementById("app");
  document.querySelectorAll("nav button").forEach(b => {
    b.classList.toggle("active", b.dataset.view === state.view);
  });

  if (state.view === "ideas") main.innerHTML = renderIdeas();
  else if (state.view === "saved") main.innerHTML = renderSaved();
  else main.innerHTML = renderAbout();
}

function renderIdeas() {
  const sorted = [...IDEAS].sort((a, b) => b.score - a.score);
  return sorted.map(idea => {
    const isOpen = state.openPlan === idea.id;
    const plan = PLANS[idea.id];
    const scoreClass = idea.score >= 9 ? "" : "med";
    return `
      <div class="idea-card">
        <div class="idea-header">
          <div>
            <h2 class="idea-title">${idea.title}</h2>
            <div class="meta">${idea.sources}</div>
          </div>
          <span class="score ${scoreClass}">${idea.score.toFixed(1)} speed</span>
        </div>
        <p class="problem"><strong>Problem:</strong> ${idea.problem}</p>
        <p>${idea.oneLiner}</p>
        <p class="price">${idea.price} · ${idea.revenueRange}</p>
        <p class="meta">${idea.speedReason}</p>
        <div class="actions">
          <button class="primary" onclick="togglePlan('${idea.id}')">${isOpen ? "Hide Plan" : "Generate Plan"}</button>
          <button class="secondary" onclick="saveIdea('${idea.id}')">${state.saved.includes(idea.id) ? "Saved" : "Save"}</button>
        </div>
        ${isOpen && plan ? `
          <div class="plan-panel">
            <h3>Execution Plan</h3>
            <div class="plan-section"><strong>Possible Solution</strong>${plan.solution}</div>
            <div class="plan-section"><strong>Expected Revenue</strong>${plan.expectedRevenue}</div>
            <div class="plan-section"><strong>Path to Market</strong>${plan.pathToMarket}</div>
            <div class="plan-section"><strong>Client Acquisition</strong>${plan.clientAcquisition}</div>
            <div class="plan-section"><strong>Timeline</strong>${plan.timeline}</div>
            <div class="plan-section"><strong>Tools / Stack</strong>${plan.tools}</div>
            <div class="plan-section"><strong>First 7 Days</strong>${plan.first7Days}</div>
            <div class="plan-section"><strong>Risks</strong>${plan.risks}</div>
          </div>
        ` : ""}
      </div>
    `;
  }).join("");
}

function renderSaved() {
  if (!state.saved.length) return `<div class="empty">No plans saved yet. Generate and save ideas from the Top Ideas view.</div>`;
  const items = state.saved.map(id => IDEAS.find(i => i.id === id)).filter(Boolean);
  return items.map(idea => `
    <div class="idea-card">
      <h2 class="idea-title">${idea.title}</h2>
      <p>${idea.oneLiner}</p>
      <div class="actions">
        <button class="primary" onclick="state.view='ideas'; state.openPlan='${idea.id}'; render();">Open Full Plan</button>
        <button class="secondary" onclick="unsave('${idea.id}')">Remove</button>
      </div>
    </div>
  `).join("");
}

function renderAbout() {
  return `
    <div class="about">
      <h2>How MoosingAI Works</h2>
      <p>MoosingAI surfaces small, real problems people are actively discussing on Reddit and X, then ranks them by how quickly you can turn them into revenue with tools you already have.</p>
      <p>Ideas are scored on:</p>
      <ul>
        <li>Clarity and urgency of the pain</li>
        <li>Willingness to pay (money already being lost or time already being spent)</li>
        <li>Speed to first sale (can you offer something in days, not months?)</li>
        <li>Fit with existing AI tools (Claude, ChatGPT, Gemini, simple automation)</li>
      </ul>
      <p>Select any idea and hit <strong>Generate Plan</strong> for a concrete execution path: solution shape, revenue model, client acquisition channels, timeline, and first-week actions.</p>
      <p>All data stays in your browser. Saved plans are stored locally.</p>
      <p class="meta" style="margin-top:1.5rem;">Last public signal scan: 28 October 2026. Refresh ideas periodically by re-running scans of r/smallbusiness, trade subreddits, and relevant X searches.</p>
    </div>
  `;
}

function togglePlan(id) {
  state.openPlan = state.openPlan === id ? null : id;
  render();
}

function saveIdea(id) {
  if (!state.saved.includes(id)) {
    state.saved.push(id);
    saveState();
  }
  render();
}

function unsave(id) {
  state.saved = state.saved.filter(x => x !== id);
  saveState();
  render();
}

document.querySelectorAll("nav button").forEach(b => {
  b.onclick = () => {
    state.view = b.dataset.view;
    state.openPlan = null;
    render();
  };
});

render();
