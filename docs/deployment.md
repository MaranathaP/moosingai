# Deploy and roll back

## Hostinger configuration

- Existing order: Cloud Economy, account `u306307157`; PHP 8.3, cURL and PDO SQLite enabled.
- Production: `moosingai.com` (current static site preserved pending cutover approval).
- Isolated staging: `blueviolet-eagle-886185.hostingersite.com` (new free subdomain on the existing order).
- Public document root: `/home/u306307157/domains/DOMAIN/public_html`.
- Staging database: `/home/u306307157/domains/blueviolet-eagle-886185.hostingersite.com/.moosingai-stage/workspace.sqlite`.
- Production database must use its own domain directory and `.moosingai-production/workspace.sqlite` path. Never copy the staging database.
- Private config: `server/config.local.php`, not in Git. It stores environment, canonical base URL, absolute database path, owner password hash, sandbox restricted key and webhook signing secret. Keep the file mode restrictive. No secrets belong in HTML, JS or auto-deploy settings.

Install the locked dependencies with `composer install --no-dev --prefer-dist`. Run PHP lint and `php tests/critical.php`. Build with `python scripts/package.py OUTPUT.zip` and install private configuration separately, or pass a private staging config path as the optional second argument to create a private, uncommitted staging artifact. `scripts/upload.py` reads temporary TUS credentials from a local private file and prints no credentials. Use Hostinger's archive extraction deployment on a new staging website. Uploaded archives contain PHP source and must not remain publicly downloadable after extraction; verify their deletion or HTTP denial.

`.htaccess` sets `index.php` as the directory index and blocks source/config/storage/tests/Git paths and dotfiles. Only the public shell and application assets are served. All staging responses send `X-Robots-Tag: noindex, nofollow`; the private API requires login. Private cookie names are bound to the deployment directory. Tests verify source/config denial and app persistence after refresh.

## Jobs

An hourly staging cron was configured at minute 17:

```text
/opt/alt/php83/usr/bin/php /home/u306307157/domains/blueviolet-eagle-886185.hostingersite.com/public_html/server/worker.php >/dev/null 2>&1
```

Only profiles with `schedule=true` enqueue jobs. Daily caps and retry budgets apply to scheduled and manual runs. The worker also processes a pending bounded job. Failure never advances `last_success`. The cron registration is verified separately from observing its first scheduled run.

## Stripe setup (required before provider verification)

1. Authenticate the connected Stripe account and select an isolated sandbox. Never enable live selling to test the application.
2. Install a sandbox restricted key in the server's private config, with only the product/Checkout operations the SDK flow needs. MCP authentication does not supply this key.
3. Register `https://DOMAIN/?route=webhook` in the SAME sandbox, subscribing to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, and `charge.refunded`. Securely store its endpoint signing secret.
4. Create clearly labeled sandbox opportunity, experiment, product and offer fixtures. Use a positive integer cent amount. Open hosted Checkout from Products and complete a test purchase with a Stripe-documented test method.
5. Verify Stripe's successful delivery and the matching persisted paid checkout; replay the event and verify unchanged `fulfilled_at` and one checkout. Test unpaid and delayed outcomes and refunds. A browser return is never evidence of payment.

## GitHub and release controls

Work is on `feature/evidence-to-paid-pilot`. Feature pushes do not intentionally update production. No production Git deployment configuration was modified. Inspection of its auto-deployment settings was rejected by automatic review; do not claim the existing settings were verified. Prefer explicit reviewed releases until an independently verified production branch deployment is configured. Do not point production at the feature branch.

## Production cutover

Present the verified staging URL, known integration limitations, backup and rollback to the owner, then obtain any required overwrite approval. Back up all existing site files through Hostinger or download the known four static files using `scripts/backup-public.py`; record hashes. Preserve the original Git commit as a second recovery source. Back up any application database using SQLite's backup API before future migrations.

Create a separate production owner configuration/database. Deploy the tested application archive to `moosingai.com`; preserve unrelated hosting settings, environment variables, DNS, email and verification records. Verify the actual landing-page text, API access denial, owner login, persistent records, refresh, protected paths, valid jobs and Stripe sandbox delivery when credentials are configured. Do not call a 200 response alone a successful deployment.

## Rollback

For this first cutover, restore the four byte-for-byte static files from the local backup (or Git commit `7fbe4aa6440b44ce2b20b112e39332cafddb8966`). Remove or disable the new root `index.php` and `.htaccess` so the old index loads. Preserve the private new database for investigation; do not destroy it. Disable only the MoosingAI-specific cron if necessary. Clear the website cache and match the restored page content. DNS and email do not change.

For later application releases, restore the previous signed-off code artifact and a compatible pre-migration database backup. Config remains separate. SQLite version-1 schema creation is additive and idempotent; it does not delete existing records.
