# Feature Proposal: Native feel on mobile — sprint investigation

**Status:** S1–S3 implemented, S4–S5 open | **Date:** 2026-09-28 | **Updated:** 2026-10-04

## Drivers

| # | Driver | Type |
|---|---|---|
| D1 | Re-login on basically every use | pain point |
| D2 | "Where is the app?" | pain point |
| D3 | After a timeout the user is not back where they were | pain point |
| D4 | App icon to tap, app in the app list, not a browser tab | goal |
| D5 | Phone passkey login; seamless Heynabo re-auth; re-login only when the Heynabo session has expired | goal |
| D6 | Notifications | future, outside this sprint |

## Constraints

| # | Constraint |
|---|---|
| C1 | No App Store / Play Store at this stage |
| C2 | Desktop stays supported in the browser |
| C3 | DRY code, no mobile-vs-desktop branches; branch on capability only |
| C4 | No long-lived cookies for users deleted in Heynabo |
| C5 | Heynabo is the authoritative user source; D1 is downstream and eventually consistent; no auth decision reads D1 |
| C6 | A password prompt only on Heynabo write-back is unacceptable |
| C7 | Heynabo API is poorly documented; probe it with `make heynabo-*`; local and dev share the demo Heynabo; test users need a unique e-mail |
| C8 | This sprint is investigation |
| C9 | The session cookie's `maxAge` stays at or under 24 hours; longevity comes from re-login (S5), Heynabo has no OIDC server |

## Causes found in code

| Driver | Cause |
|---|---|
| D1 | `nuxt.config.ts` has no `runtimeConfig.session`, so `nuxt-auth-utils` issues a browser-session cookie without `maxAge`; it dies when the browser or app process ends |
| D3 | `server/middleware/1.guard.ts:48` redirects to `/login` without a return path; after login the user lands on the dashboard; a mid-session 401 shows only the generic toast in `useApiHandler.ts:33` |
| D2 | No manifest and no service worker; `public/` holds favicon and images only |

## Facts verified

- `nuxt-auth-utils` latest is 0.5.30; lockfile pins 0.5.26; 0.5.27–0.5.30 change nothing in sessions or WebAuthn.
- h3 v1 sessions expire absolutely: `createdAt` is set on creation only, `update()` keeps it.
- The Heynabo token is a 32-hex opaque string, and the `/login` response carries no expiry field (verified
  `make heynabo-login-dev`, 2026-10-04); `login.post.ts` stores it in the session as `passwordHash`;
  `LoggedInHeynaboUserSchema` strips unknown keys from the `/login` response.
- ADR-006 keeps navigation state in the URL, so returning to the last URL restores the user's place.

## Solution elements

| # | Element | Serves | Status |
|---|---|---|---|
| S1 | Session cookie `maxAge: 24h` via `runtimeConfig.session` (C9; the token is opaque and the login response carries no expiry) | D1, D5, C4, C5 | ✅ |
| S2 | Guard redirect carries the original URL; login returns there; a 401 re-authenticates and returns in place | D3 | ✅ |
| S3 | PWA manifest, `display: standalone`, icon set from `public/app-icon.svg`; installable without a service worker | D4, D2 | ✅ |
| S4 | Install guidance driven by capability: standalone → nothing; `beforeinstallprompt` → install button; otherwise → Add to Home Screen instructions | D2 | open |
| S5 | Re-login at `exp`: passkey with PRF-wrapped Heynabo password (ciphertext in D1, key never on the server); password form where PRF is missing | D5 | open |

S1–S3 live on `chore/npm-dependencies`; the file-level detail sits in npm-dependencies-nuxt4_5-upgrade.md, "Done on the branch".

Accepted residual: a token Heynabo revokes before `exp` keeps the theslope session until `exp`; Heynabo write-backs fail with 401 in that window.

Rejected: a theslope session lifetime independent of Heynabo; a periodic Heynabo re-check; a server-side stored password; App Store wrapper.

## Unknowns

| # | Unknown | Resolves | Decides |
|---|---|---|---|
| U1 | The opaque token's TTL: when (and whether) Heynabo expires it | mint a token (`make heynabo-login-dev`), call a read endpoint with it after hours and days (`make heynabo-get-locations-dev` with the saved token) | the `maxAge` S1 sets, and the weight of S5: a long TTL → S1 + S2 carry D1; short → S5 carries D1 |
| U2 | PRF in the installed PWA on iOS 18+, Android, one desktop | spike after S3 | S5 coverage |

## Next

1. Run U1.
2. Plan S4 and S5 for sign-off; U2 spikes after S5 is planned.
