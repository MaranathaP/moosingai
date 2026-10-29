# Release verification — October 28, 2026

## Implemented and verified

- One PHP 8.3 application deployed to isolated Hostinger staging: https://blueviolet-eagle-886185.hostingersite.com
- Authentication protects private data/admin routes; unauthenticated data reads return 401. Owner login, session regeneration, CSRF rejection, HttpOnly/SameSite cookies, authenticated refresh and isolated browser sessions were tested.
- 37 focused backend checks pass against a real temporary SQLite database: persistence across connections, URL/content/link deduplication, atomic reimport, evidence rights, unsafe URL rejection, evidence-linked incomplete assessment, interview and stage history, bounded retries, unchanged success timestamp on failure, quota/backoff, sandbox-only payment state, signed raw body, replay protection, unpaid/paid/delayed event handling, duplicate fulfillment and cumulative refunds.
- Real deployed browser workflow passes: create/edit opportunity, add evidence, duplicate/reimport, record interview, change stage, refresh, inspect evidence safely, visit every screen, mobile no-horizontal-page-overflow, keyboard focus and no uncaught page errors.
- Real Stack Exchange API collection from staging succeeded: 20 attributed question-title leads persisted; 299 provider quota remaining at verification. Leads are unverified discovery records and do not count as independent demand. No generated quotations, spending, dates or model output were added.
- Private source/config/Git paths return 403/404; deployment archive returns 404. Staging responses carry noindex/nofollow. Malformed/unsigned webhook requests are rejected.
- Official Stripe PHP SDK v22.0.1 installed from the lockfile; Composer audit reports no known vulnerability advisories.
- Hourly staging worker registered at minute 17, cron UID `ypo5jvQRTV`. Registration is confirmed; observing the first scheduled execution is a separate check. Manual worker execution performed real permitted collection successfully.
- Desktop, mobile and source-state screenshots captured from deployed staging under local ignored `artifacts/`. Synthetic acceptance records remain isolated in staging/local databases.
- Current production's four static files were backed up byte-for-byte with a SHA-256 manifest. No production files, DNS, email or unrelated environment settings were changed.

## Payment verification status

The user authorized access to MoosingAI sandbox and live accounts. The Stripe plugin reports installed/enabled, but no Stripe account tools are exposed to this active session. The user requires Stripe tools through Codex only; browser fallback has been stopped. Application runtime credentials and a sandbox endpoint signing secret have not yet been installed. Therefore provider account inspection, hosted sandbox purchase and actual Stripe-to-staging webhook delivery are NOT yet verified.

The payment foundation and synthetic signature/idempotency tests work. They are not a substitute for acceptance criteria 9 (real provider delivery). Checkout is honestly shown disconnected until runtime secrets exist. Live selling, live keys and live events remain disabled regardless of account-access authorization, because no real offer/price has been approved.

## Remaining configuration and limitations

- Expose the connected Stripe tools to this Codex session, install a least-privilege sandbox runtime key and signing secret securely, then run the documented hosted Checkout and real webhook/replay/refund tests.
- No authorized model runtime connection exists; all AI generation is explicitly unavailable. Manual research, offers and briefs work.
- No restricted social connector is enabled. Source permissions and retention limitations are documented.
- Production cutover requires presenting staging, backup and rollback and obtaining the Hostinger skill's required overwrite confirmation.
- Automatic approval review rejected the production Git auto-deployment-settings read as potentially changing deployment behavior. Those settings were left untouched; neither existing auto-deploy safety nor a newly configured Git auto-deploy is claimed. The implementation is pushed on a feature branch for review.
- This release is an MVP, not full feature parity with every aspirational plan item: no automatic semantic clustering, source-retention deletion workflow, recurring billing, password recovery, multi-user permissions or actual customer outreach. No demand or revenue is invented.
