# Source policy

Reviewed October 28, 2026. Public availability is not permission for arbitrary scraping, retention, model processing, or redistribution.

## Enabled adapter: Stack Exchange

- Official `/2.3/search/advanced`, site=stackoverflow, creation sort, a bounded phrase from the profile, 20 results maximum. Only post-2018-05-02 question titles and provenance metadata are retained.
- Store original URL, question ID, author name/profile, publication/collection times, title, collection method, license/permission note and discovery-lead status. Attribute Stack Exchange, the original, and the author in private evidence views; show CC BY-SA 4.0 and that titles are unmodified. No answer/body content is collected.
- No source content goes to a model or training process. Titles are discovery leads, not verified buyer accounts or spending evidence. An owner must inspect the original and explain any verification change.
- Default application cap: 5 jobs/day, configurable server-side up to 20; at most 3 attempts/job; minimum 60 seconds between calls; API `backoff` and `quota_remaining` honored. Shared hosting IP quotas are not assumed to belong exclusively to MoosingAI. No paid API use.
- The owner can disable collection immediately. Evidence should be reviewed for continued relevance and original availability; source requests and retention/deletion obligations require owner action. No automatic retention/deletion schedule is claimed in this release.

References: [API terms](https://stackoverflow.com/legal/api-terms-of-use), [advanced search](https://api.stackexchange.com/docs/advanced-search), [throttles](https://api.stackexchange.com/docs/throttle), [content licensing](https://stackoverflow.com/help/licensing).

## Disabled integrations

Reddit requires commercial access approval/agreement. LinkedIn has no configured unrestricted search access. X requires verified runtime API access, processing rights and a budget before use. Google/web-search has no configured runtime connection. A browser research tool available to the developer is not an application credential. The unavailable connectors make no network requests and display no scan timestamps.

Manual imports require a per-record permitted-use explanation. CSV/JSON is not a workaround for source restrictions. Store consented first-party notes or content the owner is entitled to retain. Avoid unnecessary personal details. Reposting an existing note or canonical URL does not create new demand. A changed URL with identical normalized content also deduplicates.
