# MoosingAI

A private, single-owner workspace for taking recorded evidence through buyer conversations, concrete offers, and narrowly scoped paid pilots. MoosingAI itself has no subscription paywall. The public page explains the studio; private research and customer records require authentication.

## Run

Requires PHP 8.3+, PDO SQLite, cURL, mbstring, OpenSSL, and Composer. No Node.js server or paid infrastructure is needed.

```powershell
composer install --no-dev --prefer-dist
# Supply a strong owner password through stdin from a secure terminal prompt:
php scripts/setup.php server/config.local.php http://127.0.0.1:8088
php -S 127.0.0.1:8088
php tests/critical.php
```

Set `database` in the private config to an absolute path outside the public document root. Staging and production MUST use separate configuration, password hashes, database files, and Stripe sandbox/live modes. Configuration keys (without values) are listed in `environment.example`. Never place secret keys in JavaScript, Git, screenshots, logs, or chat.

## What works

- Session authentication, CSRF checks, bounded login attempts, private API, safe text rendering, restrictive content security policy.
- Server-persisted opportunities, evidence, alternative records, evidence-linked assessments, interviews, offers, experiments, decisions, stage history, build briefs, products, costs and support time.
- Canonical URL/source-ID and content-hash deduplication, atomic CSV/JSON import (200 rows maximum), manual verification review and evidence linking. Only verified originals/direct accounts count as independent reports; discovery leads and reposts do not.
- Weighted assessments keep unknown dimensions unknown. An overall attractiveness score appears only at 100% coverage; confidence stays separate.
- Real, attributed Stack Exchange question-title collection through its official API. Bounded jobs, three attempts maximum, database leases, daily job caps, provider quota/backoff, successful timestamps only after commit. No model processing of source content.
- Stripe-hosted sandbox Checkout foundation using server-held offer amounts and official StripeClient SDK. Raw-body signatures, mode/metadata/amount checks, immediate and delayed paid events, unpaid/failure handling, cumulative refunds, deduplicated events and fulfillment timestamps. A success page never grants anything.

## Deliberate limits

- Live offers, live Checkout, and live webhook events are disabled pending an actual approved offer and price. Recurring billing is not implemented because no recurring offer exists. A fulfilled sandbox row is a payment entitlement marker; delivery for a future product must consume it idempotently.
- Stripe application credentials are separate from the MCP account connection. Until a sandbox key and endpoint signing secret are securely installed, Checkout is disconnected. Unit tests use signed synthetic fixtures and do not prove Stripe delivered an event.
- No authorized model connection exists: extraction, clustering, AI summaries, offer generation and generated briefs are unavailable. All manual editing remains useful.
- Reddit, LinkedIn, X and Google/web-search collection are disabled. No unrestricted scraping, customer contact, invented source evidence, or simulated generation.
- SQLite is appropriate for this low-volume owner workspace on the inspected hosting plan. Back up using SQLite's backup API; do not copy only a live main database file while WAL is active.
- Legacy ideas remain in Git history, not in production research or revenue. Staging test records are explicitly marked synthetic and never copied to production.

## Verification

`php tests/critical.php` runs focused persistence, collection and payment checks against a temporary real SQLite database. `node tests/browser.cjs` runs browser acceptance checks against `TEST_BASE_URL`; set `PLAYWRIGHT_PATH` to an installed Playwright module. The private owner-password fixture is read from the task's local `.runtime` directory and is never printed. Browser tests write clearly named synthetic records; run them only against isolated staging/local databases.

`node scripts/verify-deployment.cjs` tests an actual Stack Exchange collection, private path denial, noindex headers and invalid webhook rejection. Screenshots are written under ignored `artifacts/`.

See [architecture](docs/architecture.md), [source permissions](docs/sources.md), [deployment and rollback](docs/deployment.md), and [release verification](docs/release.md).
