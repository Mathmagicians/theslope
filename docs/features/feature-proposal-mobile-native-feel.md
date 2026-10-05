# Feature Proposal: Native feel on mobile — sprint investigation

**Status:** S1–S4 implemented, S5 in the next PR | **Date:** 2026-09-28 | **Updated:** 2026-10-05 | **Branch:** chore/npm-dependencies

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
| C10 | The design is independent of the Heynabo token's lifetime: the token is a cache of a successful login, and a Heynabo 401 at any moment routes to re-auth |

## Facts verified

- `nuxt-auth-utils` latest is 0.5.30; lockfile pins 0.5.26; 0.5.27–0.5.30 change nothing in sessions or WebAuthn.
- h3 v1 sessions expire absolutely: `createdAt` is set on creation only, `update()` keeps it.
- The Heynabo token is a 32-hex opaque string, and the `/login` response carries no expiry field (verified
  `make heynabo-login-dev`, 2026-10-04); `login.post.ts` stores it in the session as `passwordHash`;
  `LoggedInHeynaboUserSchema` strips unknown keys from the `/login` response.
- ADR-006 keeps navigation state in the URL, so returning to the last URL restores the user's place.

## Solution elements

S1–S4 (24h session cookie, login return path, PWA manifest, install guidance card) shipped on `chore/npm-dependencies`; their record lives in archived/npm-dependencies-nuxt4_5-upgrade.md, "Done on the branch".

| # | Element | Serves | Status |
|---|---|---|---|
| S5 | Re-login at `exp` or on a Heynabo 401: passkey with PRF-wrapped Heynabo password (ciphertext in D1, key never on the server); password form where PRF is missing; consent to the stored ciphertext is given at passkey enrollment | D1, D5, C10 | next PR |

Residual: a token Heynabo revokes before `exp` keeps the theslope session until `exp`; S5 routes the resulting Heynabo 401 into re-auth, so the window costs one re-login.

Rejected: a theslope session lifetime independent of Heynabo; a periodic Heynabo re-check; a server-side stored password; App Store wrapper.

## Unknowns

| # | Unknown | Resolves | Decides |
|---|---|---|---|
| U2 | PRF in the installed PWA on iOS 18+, Android, one desktop | spike before S5 is planned in detail | S5 coverage: PRF as the primary face, or the password form carrying more weight |

## Decisions

**2026-10-04**
- The token-TTL probe is dropped: the token is a Heynabo-side session artifact whose lifetime Heynabo can change at any time, so the design is lifetime-independent (C10) and S5 carries D1 and D5 unconditionally. S5's trigger covers both the theslope session's `exp` and a Heynabo 401 mid-session; both converge on one re-auth flow that returns the user in place (S2).
- Robustness this buys: a Heynabo TTL change costs nothing; a changed Heynabo password makes the wrapped ciphertext stale, re-login falls back to the password form and re-wraps on success; a user deleted in Heynabo fails re-auth (C4), and the D1 ciphertext rides the User cascade on the nightly import delete.
- Consent to storing the PRF-wrapped Heynabo password is captured at passkey enrollment: registering the passkey is the opt-in act, and the enrollment dialog names what is stored and where.
- The PRF spike (U2) and S5 go to the PR after `chore/npm-dependencies`.

## Next

1. Next PR: the PRF spike (U2), then S5 planned for sign-off.
