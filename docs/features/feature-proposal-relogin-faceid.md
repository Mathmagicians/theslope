# Feature Proposal: Re-login without typing — FaceID at the Heynabo re-login

**Status:** Parked (not in 0.9) | **Date:** 2026-10-06 | **Builds on:** `archived/feature-mobile-native-feel.md` (S1–S4 shipped, PRF spike run 2026-10-06)

Heynabo is the backend and the only authority: its login token sits in the sealed session cookie and a real Heynabo
login redoes it on a 401 or at the cookie's max-age (C4, C5, C9, C10 in the archived doc). Today password managers
prefill that login form on every platform. This proposal holds the two ways to take the typing out of the moment and
the research behind them; no option is chosen.

## Comparison by platform

| Platform | Today | Lightweight | Full (passkey + PRF) |
|---|---|---|---|
| iOS / iPadOS — any browser (all WebKit) and the installed PWA | form → manager autofill (iCloud Keychain or a third-party manager via the iOS AutoFill API, FaceID-gated) → Log ind | same as today — WebKit carries no Credential Management API; `autocomplete` attributes make the keychain offer reliably | one tap → FaceID → no form. Apple Passwords yes; third-party managers per the matrix below (1Password yes, Bitwarden/Dashlane no → today's form). Installed-PWA PRF unverified (H5) |
| Android — Chromium browsers (Chrome, Edge, Samsung Internet, Brave) and the installed PWA | form → manager autofill (Google Password Manager, Samsung Pass or third-party via Android Autofill, biometric-gated) → Log ind | form not shown: `credentials.get({password: true})` returns the saved login silently or via a one-tap chooser → auto-submit → back in place. Needs the login in the browser's own store (`credentials.store()` on first login); third-party-vault-only users keep today's flow. H3 verifies inside the installed PWA | one tap → biometric → no form. Google Password Manager yes (Chrome 130+), Samsung Internet yes; third-party vaults per matrix |
| Android — Firefox | form → autofill → Log ind | same as today (no Credential Management API) | per Firefox PRF support in the matrix; else today's form |
| Desktop — Chrome, Edge, Brave (macOS, Windows, Linux) | form → browser or extension autofill → Log ind | form not shown (same API as Android Chromium) when the login is in the browser store | one tap → Touch ID / Windows Hello / security key. Windows 10 and Windows 11 before the 2026-02 update: today's form |
| Desktop — Safari, Firefox | form → autofill → Log ind | same as today | per matrix (macOS 15 Safari, Firefox 149 yes) |

Lightweight is manager-agnostic (any autofill works; the gain exists where the browser implements the Credential
Management API). Full is manager-dependent (the gain exists where the authenticator implements PRF; elsewhere
today's form). Lightweight stores nothing; full stores the wrapped password in D1.

| | Today | Lightweight | Full |
|---|---|---|---|
| Taps after biometric | 2 (field + Log ind) | iOS 2 · Chromium 0–1, often no biometric | 1 |
| First use per device | type once, "save password" | type once; `credentials.store()` makes it visible to the API | type once, then enrollment (consent + create + immediate get) |
| Heynabo password changed | type once | type once, the manager updates | FaceID login fails → form → type once → re-wrapped |
| Visible new UI | — | none | login button, enrollment card in Mine indstillinger, consent dialog, fallback messaging |
| Trust surface | Heynabo + the user's manager | same | + our database holding the ciphertext |
| Schema | — | none | `WebAuthnCredential` (below) |
| Size | — | S | M–L |

## Workplans

**Lightweight**
1. `Login.vue`: `autocomplete="username"` on the email field, `autocomplete="current-password"` on the password
   field (today neither carries one — `app/components/login/Login.vue`); the form keeps its `type="submit"` button.
2. After a successful manual login, `navigator.credentials.store(new PasswordCredential(form))` where the API exists.
3. On the `/login?redirect=` landing after a 401 or expiry: `navigator.credentials.get({password: true, mediation:
   'optional'})` where the API exists → submit the returned credential through the existing `signIn` → return in
   place (S2). No API → today's form.
4. e2e: the login form carries the attributes; the Chromium path is a manual check on the household's devices.

**Full** — the spike's library, crypto and model below; enrollment in Mine indstillinger; "Log ind med FaceID" on
the login page; password form behind `prf.enabled: false`; the device protocol runs first.

## Hypotheses to test

| # | Hypothesis | Approach |
|---|---|---|
| H1 | The installed iOS PWA shows the keychain bar with FaceID on the `UInput type="password"` | lightweight |
| H2 | Safari and Chrome offer "save password" after the `$fetch` submit (no navigation) | lightweight |
| H3 | Chromium returns the stored login from `credentials.get` inside the installed Android PWA | lightweight |
| H4 | Taps drop on the household's real devices | both |
| H5 | PRF works in the installed iOS PWA (undocumented; protocol steps 3–4) | full |
| H6 | The two enrollment ceremonies are acceptable | full |
| H7 | `nuxt-auth-utils` 0.5.x handlers pass the `prf` extension through untouched with `@simplewebauthn` 11 | full |

Shared unknown: how often re-login happens with the 24h cookie (S1) in place.

## PRF spike findings (2026-10-06)

### PRF support

PRF rides the authenticator's `hmac-secret`: the credential manager holding the passkey decides, the browser relays,
and the flag is read per ceremony (`prf.enabled` at create, `prf.results` at get). Primary source:
[Corbado PRF guide](https://www.corbado.com/blog/passkeys-prf-webauthn) (updated 2026-09-29), verified 2026-10-06.

| Context | PRF | Since |
|---|---|---|
| iOS/iPadOS Safari + Apple Passwords (iCloud Keychain) | create + get | iOS 18 (2024-09); outputs stable across synced devices from iOS 18.4 / macOS 15.4 (2025-03/04, [Apple forums 764730](https://developer.apple.com/forums/thread/764730)) |
| iOS installed web app (standalone) | expected = Safari (same WebKit engine; home-screen web apps stay supported in the EU, [Apple reversal 2024-03](https://techcrunch.com/2024/03/01/apple-reverses-decision-about-blocking-web-apps-on-iphones-in-the-eu/)) | publicly undocumented — protocol steps 3–4 verify |
| Android Chrome / Edge / Samsung Internet + Google Password Manager | create + get | Chrome Android 130 (2024-10); GPM passkeys carry PRF by default ([Chromium intent](https://groups.google.com/a/chromium.org/g/blink-dev/c/iTNOgLwD2bI)) |
| macOS 15+ + Apple Passwords | create + get | Safari 18 (2024-09), Chrome 132 (2025-01), Firefox 149 (2026-03, [bugzilla 1985777](https://bugzilla.mozilla.org/show_bug.cgi?id=1985777)) |
| Windows 11 24H2/25H2 + Windows Hello | create + get | Windows update 2026-02; Chrome/Edge 147+ for create, Firefox 148+ |
| Windows 10, Windows 11 before the 2026-02 update + Windows Hello | — | password form |
| 1Password as manager | create + get | documented for the extension, Android and iOS 18 |
| Samsung Pass as manager | get only | enrollment's post-create get covers it |
| Bitwarden, Dashlane, NordPass as manager | — / unreliable | password form ([Bitwarden discussion 13838](https://github.com/orgs/bitwarden/discussions/13838)) |

Chromium exposes the API since M116 (2023-09); the yes/no above comes from the manager. The flag is read per
ceremony and the password form backs a `prf.enabled: false` or a missing result. Enrollment runs create (register)
and an immediate get (first PRF evaluation + wrap) because several managers evaluate PRF only at get.

### Library path

- The `nuxt-auth-utils` 0.5.26 server handlers `defineWebAuthnRegisterEventHandler` /
  `defineWebAuthnAuthenticateEventHandler` carry the server side: challenge store, `getOptions` override,
  verification via `@simplewebauthn/server` (optional peer `^11`); `onSuccess` hands the credential
  `{id, publicKey, counter, backedUp, transports}` to our storage, and the counter update lives in our `onSuccess`
  ([source v0.5.26](https://github.com/atinux/nuxt-auth-utils/tree/v0.5.26/src/runtime/server/lib/webauthn)).
- The client composable `useWebAuthn()` returns the verification boolean, so the client calls
  `@simplewebauthn/browser` 11 `startRegistration` / `startAuthentication` directly, speaks the handlers' two-step
  `verify: false` / `verify: true` body, injects `extensions.prf.eval.first` as a `BufferSource` into the options the
  handler returns (the browser package converts `challenge` and `allowCredentials` and passes `extensions` through,
  [startAuthentication v11](https://github.com/MasterKale/SimpleWebAuthn/blob/v11.0.0/packages/browser/src/methods/startAuthentication.ts)),
  and reads the PRF output from `credential.getClientExtensionResults().prf.results.first` on the device.
- PRF inputs and outputs stay in the browser; the POST bodies to the handlers are the standard WebAuthn JSON.
- npm 2026-10-06: `nuxt-auth-utils` latest 0.5.30 (published 2026-08-04); `@simplewebauthn/browser` latest 14.0.0
  and `/server` 14.0.3; the 0.5.x line declares both as optional peers at `^11.0.0`.

### Crypto path

PRF output (32 bytes) → WebCrypto HKDF-SHA256 (`salt: prfSalt`, `info: "theslope-hn-wrap-v1"`) → AES-GCM-256 key
(non-extractable) → encrypt / decrypt the Heynabo password with a fresh 12-byte IV per wrap. `prfSalt` (32 random
bytes per credential, generated at enrollment) doubles as the `prf.eval.first` input; ciphertext, IV and salt are
opaque without a passkey ceremony on an enrolled device.

### WebAuthnCredential model — proposed, awaiting model sign-off

```prisma
model WebAuthnCredential {
  id              String   @id // credentialId, base64url
  userId          Int
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  publicKey       String // base64url
  counter         Int      @default(0)
  backedUp        Boolean  @default(false)
  transports      String   @default("[]") // JSON stringified array of AuthenticatorTransport
  prfSalt         String // base64url, 32 bytes, prf.eval.first input
  wrappedPassword String // base64url AES-GCM ciphertext of the Heynabo password
  wrapIv          String // base64url, 12 bytes
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

`User` gains `credentials WebAuthnCredential[]`. CASCADE rides the nightly import's user delete (C4, ADR-005).

### Enrollment consent

The enrollment dialog names: a passkey for skraaningen.dk is created on this device; the app stores the Heynabo
password encrypted with a key derived from that passkey — ciphertext, IV and salt in the app's database; the key is
derived on the device during a passkey login and used there; a changed Heynabo password replaces the ciphertext at
the next password login, and deletion of the user in Heynabo removes it with the account.

### Device test protocol

Two public pages, no code of ours:

- capability check: [Corbado PRF demo](https://webauthn-passkeys-prf-demo.explore.corbado.com/) — reports PRF
  support at registration (create) and authentication (get)
- roundtrip check: [passkeyprf.com](https://www.passkeyprf.com/) — register, encrypt a message, decrypt it later; a
  successful decrypt proves the same key was derived (the wrap/unwrap shape)

A launch counts as standalone when the window shows no address bar (iOS 26+ opens home-screen additions as web apps
by default; a visible address bar means a Safari/Chrome view opened, and the step records "standalone untested on
this OS version").

1. iPhone (iOS 18.4+), Safari tab: open the Corbado demo, create a passkey (Face ID → Apple Passwords), run the
   authentication check. Both true → PRF-primary candidate; get false → the iPhone runs the password form.
2. Same Safari tab, passkeyprf.com: register, encrypt a test message, keep the storage key the page returns.
3. iPhone: Share → Add to Home Screen on passkeyprf.com, launch from the icon, decrypt the step-2 message with the
   same passkey. Success in a standalone window → PRF works in the installed context; a failed ceremony or decrypt
   there → the installed app runs the password form.
4. Android phone, Chrome: Corbado demo create + get (Google Password Manager), then passkeyprf.com — encrypt in the
   tab, add to the home screen, decrypt in the standalone launch. Same reading as steps 1–3.
5. Desktop, the daily browser: Corbado demo create + get. On Windows, record the build first (Settings → System →
   About; 24H2/25H2 with the 2026-02 update). Get true → PRF-primary; get false on an updated Windows 11 or
   macOS 15+ → that desktop runs the password form.
6. A device whose default credential manager is a third-party vault (Bitwarden, Dashlane): run step 1 twice, once
   storing the passkey in the vault, once in the OS keychain. The vault run's `prf.enabled: false` confirms the
   per-ceremony routing; the OS-keychain run confirms PRF stays available on the same hardware.

## Decisions

**2026-10-06**
- Parked out of release 0.9: the comparison above is the record; no option chosen. `WebAuthnCredential` leaves the
  0.9 Prisma bundle.

**2026-10-04** (carried from the mobile-native-feel sprint)
- The token-TTL probe is dropped: the token is a Heynabo-side session artifact whose lifetime Heynabo can change at
  any time, so the design is lifetime-independent (C10). The trigger covers both the theslope session's `exp` and a
  Heynabo 401 mid-session; both converge on one re-auth flow that returns the user in place (S2).
- Consent to storing a PRF-wrapped Heynabo password is captured at passkey enrollment; the dialog names what is
  stored and where.
- Rejected: a theslope session lifetime independent of Heynabo; a periodic Heynabo re-check; a server-side stored
  password; an App Store wrapper.
