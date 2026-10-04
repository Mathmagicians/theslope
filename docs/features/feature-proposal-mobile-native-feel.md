# Feature Proposal: Native feel on mobile — sprint investigation

**Status:** S1–S3 implemented, S4 planned on this branch, S5 in the next PR | **Date:** 2026-09-28 | **Updated:** 2026-10-04 | **Branch:** chore/npm-dependencies

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
| S4 | Install guidance driven by capability: standalone → nothing; `beforeinstallprompt` → install button; `navigator.standalone` exposed and false (iOS browser) → Føj til hjemmeskærm instructions; dismissal persists in a cookie — see "Install guidance" below | D2 | implemented — visual check and the prompt-capture decision open |
| S5 | Re-login at `exp` or on a Heynabo 401: passkey with PRF-wrapped Heynabo password (ciphertext in D1, key never on the server); password form where PRF is missing; consent to the stored ciphertext is given at passkey enrollment | D1, D5, C10 | next PR |

S1–S3 live on `chore/npm-dependencies`; the file-level detail sits in npm-dependencies-nuxt4_5-upgrade.md, "Done on the branch".

Residual: a token Heynabo revokes before `exp` keeps the theslope session until `exp`; S5 routes the resulting Heynabo 401 into re-auth, so the window costs one re-login.

Rejected: a theslope session lifetime independent of Heynabo; a periodic Heynabo re-check; a server-side stored password; App Store wrapper.

## Unknowns

| # | Unknown | Resolves | Decides |
|---|---|---|---|
| U2 | PRF in the installed PWA on iOS 18+, Android, one desktop | spike before S5 is planned in detail | S5 coverage: PRF as the primary face, or the password form carrying more weight |

## Decisions

**2026-10-05**
- C3 holds in full: faces branch on capability only, instruction copy stays generic ("browserens menu"), no browser identification even for wording. The install card gains a fourth face: touch-first devices (`(pointer: coarse) and (hover: none)`) with no better signal get menu instructions — covers Firefox on Android; the share-sheet face drops "i Safari" so Firefox/Chrome on iOS read true instructions. Desktop without an install event stays empty (desktop Firefox cannot install). The dismissal cookie is 90 days.
- The native install bar stays: the plugin captures the install event without `preventDefault`, so Chrome's own mini-infobar and the dashboard card both offer the install — two offers raise the chance it happens. `appinstalled` hides the card whichever path installs.

**2026-10-04**
- The token-TTL probe is dropped: the token is a Heynabo-side session artifact whose lifetime Heynabo can change at any time, so the design is lifetime-independent (C10) and S5 carries D1 and D5 unconditionally. S5's trigger covers both the theslope session's `exp` and a Heynabo 401 mid-session; both converge on one re-auth flow that returns the user in place (S2).
- Robustness this buys: a Heynabo TTL change costs nothing; a changed Heynabo password makes the wrapped ciphertext stale, re-login falls back to the password form and re-wraps on success; a user deleted in Heynabo fails re-auth (C4), and the D1 ciphertext rides the User cascade on the nightly import delete.
- Consent to storing the PRF-wrapped Heynabo password is captured at passkey enrollment: registering the passkey is the opt-in act, and the enrollment dialog names what is stored and where.
- Install guidance (S4) ships on `chore/npm-dependencies`; the PRF spike (U2) and S5 go to the following PR.

## Install guidance

**Goal:** the dashboard answers "Where is the app?" (D2) with the strongest affordance the browser offers, branching on capability only (C3).

**Solution:** a client-only `InstallPrompt.vue` card on the dashboard (`Login.vue`, under the greeting), driven by `useInstallPrompt()` — a pure UI composable (the isomorphic rules of ADR-017 [Isomorphic Composables, Pure UI Composables and Per-Context Type Checking] do not reach it; it is client-only) exposing the pure decision `decideInstallFace({isStandalone, canPrompt, hasIosStandaloneFlag, isTouchFirst, dismissed}) → 'none' | 'button' | 'share-instructions' | 'menu-instructions'`, in that precedence after standalone and dismissed:

| Capability | Face |
|---|---|
| `display-mode: standalone` matches, or `navigator.standalone === true` | nothing — the app runs installed |
| `beforeinstallprompt` captured (Chromium) | `ALERTS.info` + `withActions`: Installér app (`BUTTONS.primaryAction` + `ICONS.download`, calls the captured event's `prompt()`) and Ikke nu |
| `navigator.standalone` exposed and `false` (iOS browser) | `share-instructions`: `ALERTS.info` + `withActions`, "Åbn Del-menuen og vælg 'Føj til hjemmeskærm'", and Ikke nu |
| `(pointer: coarse) and (hover: none)` matches (touch-first device) | `menu-instructions`: `ALERTS.info` + `withActions`, "Åbn browserens menu og vælg 'Føj til startskærm'", and Ikke nu |
| none of the above | nothing |

`appinstalled` hides the card in the session it fires. Ikke nu writes `useCookie('theslope-install-dismissed')` (maxAge 90 days); the dismissal is a per-device convenience, so the sealed session cookie and consent are untouched. The card renders inside `<ClientOnly>`: capability detection is a browser fact, SSR renders nothing. A browser tab opened while the app is installed shows the card again; Ikke nu silences it. A home-screen bookmark made before the PWA opens in the browser, so it lands on these faces and the user re-adds the app; the stale bookmark icon is deleted by hand.

The alert's leading slot carries `public/app-icon.svg` in a home-screen frame (rounded corners, drop shadow, ~48 px on the phone) in place of the info icon. The icon animates a double press-pulse — scale 100 → 92 → 100 twice over 0.6 s, resting ~3 s between rounds. The keyframes live in `app/assets/css/main.css` under `@theme` as `--animate-tap-pulse`; the design system token `COMPONENTS.installIcon` carries the frame classes plus `animate-tap-pulse motion-reduce:animate-none`, documented in `docs/ui.md` (ADR-018 [Design System Owns Shared UI Patterns]). The component binds the token and holds no style block. The animation belongs to the visual check; the specs assert the icon image renders.

**Mockup — Install card** `✅ signed off 2026-10-04` — both faces live in the `InstallPrompt.vue` header; the dashboard composition box is in the `Login.vue` header.

**Prompt capture at app start** (signed off and implemented 2026-10-05): Chromium fires `beforeinstallprompt` once, around page load — before the dashboard card mounts. `app/plugins/installPrompt.client.ts` captures the event at app start into shared state (`markRaw`: a reactive proxy breaks the native `prompt()`); `useInstallPrompt` reads that state.

**TDD:**

| Change | Spec |
|---|---|
| `decideInstallFace` | `tests/component/composables/useInstallPrompt.unit.spec.ts`, `describe.each` over the capability matrix |
| `InstallPrompt.vue` faces, dismissal cookie, `prompt()` call | `tests/component/components/InstallPrompt.nuxt.spec.ts` — `beforeinstallprompt`, `navigator.standalone` and the `display-mode` / `pointer` / `hover` media queries are browser APIs happy-dom lacks, faked with a reason comment |
| Dashboard behaviour | `tests/e2e/ui/InstallPrompt.e2e.spec.ts` — `page.addInitScript` injects the capability (defines `navigator.standalone`, answers the touch-first media query, dispatches a stubbed `beforeinstallprompt`), BDD over the visible outcomes (none, share and menu instructions, button, dismissal) |

Test-ids: `install-prompt`, `install-app`, `install-dismiss`.

**Affected areas:** `app/composables/useInstallPrompt.ts`, `app/plugins/installPrompt.client.ts` (captures `beforeinstallprompt` and `appinstalled` from app start), `app/components/InstallPrompt.vue`, `app/components/login/Login.vue`, `app/composables/useTheSlopeDesignSystem.ts` (`COMPONENTS.installIcon`), `app/assets/css/main.css` (`--animate-tap-pulse`), `docs/ui.md`, the three specs, `docs/adr-compliance-frontend.md` rows.

## Next

1. Install guidance: the visual check, and the prompt-capture decision above.
2. Next PR: the PRF spike (U2), then S5 planned for sign-off.
