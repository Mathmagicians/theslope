# Feature: Native feel on mobile — sprint investigation

**Status:** S1–S4 shipped, PRF spike run; S5 parked | **Date:** 2026-09-28 | **Archived:** 2026-10-06

Drivers: re-login on basically every use (D1), "where is the app?" (D2), not back in place after a timeout (D3), an
app icon and an app-list entry (D4), re-login only when the Heynabo session has expired (D5). Constraints kept
canonical here: no app stores (C1); desktop stays in the browser (C2); DRY, branch on capability only (C3); no
long-lived cookies for users deleted in Heynabo (C4); Heynabo is the authoritative user source and no auth decision
reads D1 (C5); a password prompt only on Heynabo write-back is unacceptable (C6); `make heynabo-*` probes the API,
local and dev share the demo Heynabo (C7); the session cookie's `maxAge` stays at or under 24 hours (C9); the design
is independent of the Heynabo token's lifetime — a 401 at any moment routes to re-auth (C10).

## Pointers

| Piece | Where |
|---|---|
| S1 24h session cookie, S2 login return path, S3 PWA manifest, S4 install guidance card | shipped on `chore/npm-dependencies` — `archived/npm-dependencies-nuxt4_5-upgrade.md`, "Done on the branch" |
| Facts verified (h3 session expiry, the Heynabo token as an opaque cache, `nuxt-auth-utils` 0.5.x) | `feature-proposal-relogin-faceid.md` § PRF spike findings |
| PRF spike (U2, run 2026-10-06): support matrix, library and crypto path, proposed model, consent, device protocol | `feature-proposal-relogin-faceid.md` |
| S5 re-login without typing — lightweight vs full comparison | `feature-proposal-relogin-faceid.md` (parked, no option chosen) |
