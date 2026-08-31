# Feature Proposal: Notifications (Email + SMS)

**Status:** Proposal
**Date:** 2026-08-31
**Release plan:** F3, milestone M5 (`release-plan-v0.9.md`)

## Problem

- TheSlope has no way to reach users outside the app — job failures, cancelled dinners, and waitlist events die silently in Workers Logs
- Users have no channel preference; some want e-mail, some SMS, some nothing
- Sending from the request path of the Nuxt worker would couple business mutations to third-party delivery latency and failures

Expected volume: **10–50 notifications/day** once the trigger catalog lands (chef-deadline reminders, booking sold/bought, upcoming team duty).

## Scope — decisions

| Decision | Choice | Rationale |
|---|---|---|
| Email provider | **Cloudflare Email Service** (`[[send_email]]` binding) | Native binding, no API key; skraaningen.dk is on Cloudflare DNS → SPF/DKIM/DMARC auto-provisioned; 3,000 mails/mo included on Workers Paid, then $0.35/1k. Public beta (Apr 2026) → wrapped in an `EmailProvider` port so a swap to Resend is one adapter file |
| SMS provider | **GatewayAPI** (`gatewayapi.eu`) | 0.307 DKK/SMS to DK → ~92–460 DKK/mo at stated volume — cheapest researched. Danish/EU (OnlineCity, Odense), no reported CVEs/breaches, hundreds of millions SMS/yr. Token-auth JSON REST; alphanumeric sender `Skraaningen` (exactly 11 chars, fits the limit). Behind an `SmsProvider` port |
| Architecture | **Separate stateless worker** `workers/notifications/` consuming a **Cloudflare Queue**; the Nuxt app is producer only | Separation of concerns: the app never sends, the worker never touches D1. The queue message schema (Zod, versioned) IS the service contract |
| Persistence | **None** — no delivery-log DB, no outbox table, no new JobType | Queue retries (cap 3) + DLQ (14-day retention) are the durable failure record; Workers Logs + DLQ-depth alert cover ops. The contract carries `dedupeKey`, so a delivery log / exactly-once can be added later without reshaping the contract |
| Preference model | `User.notificationChannels String @default("[\"EMAIL\"]")` — JSON array of new enum `NotificationChannel { EMAIL SMS }` | Mirrors the `systemRoles` JSON-array pattern 1:1. None = `[]`, both = `["EMAIL","SMS"]` |
| Address storage | **Normalized** — channels only; addresses resolved from `User.email` / `User.phone` at enqueue time | Email/phone are Heynabo-owned (nightly import overwrites them) → normalized means zero drift when HN data changes. The queue message snapshots the resolved address in `to:` for audit. Accepted limitation: SMS requires a phone in Heynabo. Upgrade path: TheSlope-owned `notificationPhone` override column later (non-breaking) |
| v1 trigger | **Test notification only** — "Send testbesked" in the profile proves both channels end-to-end | Every future trigger is one template + one `notifyUsers()` call site (see Out of Scope) |
| Templates | Danish, **app-side**; producer enqueues fully-rendered content | Domain knowledge stays in the app; the worker stays generic and reusable. Email `{subject, text, html?}`, SMS `{text}` ≤160 GSM-7 (æøå are in the GSM-7 basic set) |

## Architecture

```
┌───────────────────────────── theslope (Nuxt worker) ─────────────────────────────┐
│ UserProfileCard ──▶ auth store ──▶ POST /api/user/notifications/channels         │
│                                    POST /api/user/notifications/test             │
│                                         │                                        │
│  templates (DA) ─▶ notificationService.notifyUsers(queue, users, rendering)      │
│                         │  resolve channels + normalize msisdn + render → v1 msg │
└─────────────────────────┼────────────────────────────────────────────────────────┘
                          ▼  env.NOTIFICATIONS.sendBatch(≤100)
               [queue] theslope-notifications-{dev,prod}
                          │
┌─────────────────────────┼─────────── theslope-notifications (worker) ────────────┐
│ queue handler: parse contract → deliver → ack | retry(backoff 30/60/120s)        │
│   ├── EmailProvider port → CloudflareEmailProvider (env.EMAIL.send)              │
│   └── SmsProvider port   → GatewayApiSmsProvider (POST /rest/mtsms)              │
│ terminal error → ack + masked error log                                          │
│ retries exhausted → [queue] theslope-notifications-dlq-{dev,prod} (14d)          │
└──────────────────────────────────────────────────────────────────────────────────┘
```

The only coupling between the two workers is `contract.ts`.

### Why no database

- **Durability** is the queue's job: at-least-once delivery, per-message retries, then the DLQ holds permanently failed messages for 14 days. The DLQ *is* the failure record.
- **Failure visibility**: `[observability] enabled` → structured Workers Logs (`make logs-notifications-dev`), plus a Cloudflare alert on DLQ depth (I4).
- The only thing a DB would buy is strict dedupe (a crash between "provider accepted" and "ack" can redeliver → duplicate SMS). Rare, costs øre, annoys nobody. The `dedupeKey` in the contract keeps the upgrade path open.

## Queue contract (the service boundary)

**Ownership / import direction:** `workers/notifications/src/contract.ts` **owns** the schema — a consumer can never be looser than its own contract. `app/composables/useNotificationValidation.ts` re-exports it (ADR-001: application code imports from validation composables). The contract file imports **only zod** (root dependency, shared `node_modules`) — never `prisma/generated/zod`. The wire enum is a literal copy of the Prisma enum, guarded by a parity unit test.

```ts
// workers/notifications/src/contract.ts — v1. Breaking change = v2 schema + union on `v`.
import {z} from 'zod'

export const CONTRACT_VERSION = 1 as const
export const WireChannelSchema = z.enum(['EMAIL', 'SMS'])    // parity-tested against NotificationChannelSchema

export const SMS_MAX_LENGTH = 160                            // single GSM-7 segment (æøå are GSM-7 basic)
export const MsisdnSchema = z.string().regex(/^45\d{8}$/)    // Danish msisdn, no '+'
export const QUEUE_MAX_BATCH = 100                           // sendBatch limit (100 msgs / 256KB per call)

const MetaSchema = z.object({
    trigger: z.string().min(1),                 // 'TEST' in v1; later 'JOB_FAILED', 'DINNER_CANCELLED', ...
    userId: z.number().int().positive(),        // correlation only — the consumer has no DB
    enqueuedAt: z.string().datetime(),
    source: z.literal('theslope-app')
})

const EmailMessageSchema = z.object({
    v: z.literal(CONTRACT_VERSION),
    channel: z.literal(WireChannelSchema.enum.EMAIL),
    dedupeKey: z.string().min(1),
    to: z.string().email(),
    content: z.object({
        subject: z.string().min(1).max(200),
        text: z.string().min(1),
        html: z.string().optional()
    }),
    meta: MetaSchema
})

const SmsMessageSchema = z.object({
    v: z.literal(CONTRACT_VERSION),
    channel: z.literal(WireChannelSchema.enum.SMS),
    dedupeKey: z.string().min(1),
    to: MsisdnSchema,
    content: z.object({text: z.string().min(1).max(SMS_MAX_LENGTH)}),
    meta: MetaSchema
})

export const NotificationMessageSchema = z.discriminatedUnion('channel', [EmailMessageSchema, SmsMessageSchema])
export type NotificationMessage = z.infer<typeof NotificationMessageSchema>
```

- **`dedupeKey` format:** `{trigger}:{channel}:{userId}:{enqueuedAt-ISO}`, e.g. `TEST:EMAIL:42:2026-08-31T10:12:00.000Z` — one grep connects producer log, consumer log, and DLQ body. Future triggers switch the last segment to a content key (`DINNER_CANCELLED:EMAIL:42:dinner-317`) to enable consumer-side idempotency later.
- **Batch limits shape the producer:** messages are small (SMS ≤160 chars, mails a few KB), so the 128 KB/message limit is irrelevant; the producer chunks `sendBatch` into groups of 100 — this is what makes future fan-out (`notifyUsers(allBookedUsers, …)`) viable.

## Model — schema additions

`prisma/schema.prisma`:

```prisma
enum NotificationChannel {
  EMAIL
  SMS
}

model User {
  // ... existing fields ...
  notificationChannels String @default("[\"EMAIL\"]") // JSON stringified array of NotificationChannel
}
```

Migration via `make prisma-create-migration name=notifications` → `migrations/0015_notifications.sql`:

```sql
-- AlterTable
ALTER TABLE "User" ADD COLUMN "notificationChannels" TEXT NOT NULL DEFAULT '["EMAIL"]';
```

SQLite backfills existing rows with the default — every current user starts on e-mail. Regenerate with `make d1-prisma` (zod-prisma-types emits `NotificationChannelSchema`; imported only by validation composables per ADR-001).

### Serialization touchpoints (mirror `systemRoles` exactly)

| File | Change |
|---|---|
| `app/composables/fragments/domainFragments.ts` | `UserFragmentSchema` += `notificationChannels: z.array(NotificationChannelSchema).default(['EMAIL'])` — `.default()` keeps other fragment consumers (e.g. `bookedByUser` projections) parsing unchanged |
| `app/composables/useCoreValidation.ts` | `SerializedUserInputSchema` += `notificationChannels: z.string().default('["EMAIL"]')`; `serializeUserInput` += `JSON.stringify(...)`; `deserializeUser` / `deserializeUserDetail` += `JSON.parse(...)` |
| `server/data/prismaRepository.ts` | `serializeUserPartial` += ADR-012 `Prisma.skip` branch; `USER_DISPLAY_SELECT` += `notificationChannels: true`; `deserializeToUserDisplay` += `JSON.parse(...)` |
| `tests/e2e/testDataFactories/userFactory.ts` | `defaultUserData` += `notificationChannels: ['EMAIL']`; flows through `defaultUserWithInhabitant`'s `UserDetailSchema.parse` round-trip |

`UserDisplaySchema` / `UserDetailSchema` / `UserSessionSchema` inherit the field via `BaseUserSchema` — no direct edits.

## Producer design (Nuxt app)

### `server/utils/notificationService.ts`

Bindings-in, result-out (mirrors `dailyMaintenanceService.ts` — callable from event handlers today, Nitro scheduled tasks tomorrow):

```ts
export type NotificationRendering = {
    trigger: string
    email?: {subject: string, text: string, html?: string}
    sms?: {text: string}
}
export type NotifyTarget = Pick<UserDetail, 'id' | 'email' | 'phone' | 'notificationChannels'>
export type NotifyResult = {enqueued: number, skipped: number, degraded: boolean}

export const normalizeToMsisdn = (phone: string | null | undefined): string | null
    // pure: '+45 12 34 56 78' → '4512345678'; '12345678' → '4512345678'; anything else → null
export const resolveDeliveries = (user: NotifyTarget, r: NotificationRendering, enqueuedAt: string): NotificationMessage[]
    // pure: EMAIL if 'EMAIL' ∈ channels && r.email; SMS if 'SMS' ∈ channels && r.sms && normalizeToMsisdn(phone)
export async function notifyUsers(queue: Queue | undefined, users: NotifyTarget[], rendering: NotificationRendering): Promise<NotifyResult>
```

**`notifyUsers` never throws.** Notification is fire-and-forget: future call sites (job-failure, dinner-cancelled) must never have their business mutation fail because delivery infra is down. Missing binding ⇒ `console.warn('📮 > NOTIFY > [ENQUEUE] NOTIFICATIONS binding missing — degraded mode')` + `{enqueued: 0, skipped: n, degraded: true}`. The test endpoint therefore returns **200-with-warning, not 503**.

### Templates — `server/utils/notifications/templates/testNotification.ts`

```ts
export const renderTestNotification = (firstName: string): NotificationRendering => ({
    trigger: 'TEST',
    email: {
        subject: 'Skråningen: Testbesked fra TheSlope',
        text: `Hej ${firstName}!\n\nDette er en testbesked fra TheSlope. Dine e-mail-notifikationer virker. 🎉\n\n— Skråningen`,
        html: undefined /* minimal wrapper around text */
    },
    sms: {text: `Hej ${firstName}! Testbesked fra Skraaningen - dine SMS-notifikationer virker.`}
})
```

Next to it: `isGsm7(text)` helper. A unit test asserts every SMS template is ≤160 chars **and** GSM-7-only (æøåÆØÅ are basic-set; the traps are smart quotes and similar).

### Endpoints (ADR-002 two-try-catch; `/api/user/` = `isAuthenticated` in the route table — add an explicit row in `app/composables/usePermissions.ts` for documentation value)

**`server/routes/api/user/notifications/channels.post.ts`** — body `{channels: NotificationChannel[]}`

- Identity: `getSessionUser(event)` (`server/utils/eventHandlerHelper.ts`); 401 if null. Writes **only** the session user's row — no id parameter, no confused-deputy surface.
- Validation (400): `z.object({channels: z.array(NotificationChannelSchema)})`, refined: reject `SMS` when `user.phone` is null → 400 `'SMS kræver et telefonnummer'`.
- Business (500): `saveUser(d1Client, {notificationChannels: channels}, user.id)` (the single write path), then **patch the session snapshot** (login stores the whole `UserSession` incl. the Heynabo token): `setUserSession(event, {...session, user: {...session.user, notificationChannels: channels}})`. Return `Promise<UserDetail>` (strip `passwordHash`).

**`server/routes/api/user/notifications/test.post.ts`** — empty body

- Identity as above; fetch the fresh user row for canonical channels/phone.
- `notifyUsers(event.context.cloudflare.env.NOTIFICATIONS, [user], renderTestNotification(name))`.
- Returns 200 `TestNotificationResponse` = `{queued, enqueued, skipped, degraded, channels}` (schema in `useNotificationValidation`).

### `app/composables/useNotificationValidation.ts`

- Re-exports `NotificationChannelSchema` from `~~/prisma/generated/zod` (ADR-001) and the contract schemas from `~~/workers/notifications/src/contract`
- Defines `UpdateChannelsBodySchema`, `TestNotificationResponseSchema`
- Unit test: `WireChannelSchema.options` deep-equals `NotificationChannelSchema.options` (contract parity guard)

### Store actions — `app/stores/auth.ts` (self-service is session-coupled; `users.ts` stays admin-only)

```ts
const updateMyNotificationChannels = async (channels: NotificationChannel[]) => {
    await $fetch('/api/user/notifications/channels', {method: 'POST', body: {channels}})
    await fetch()                       // nuxt-auth-utils session refresh → card re-renders
    toast.add({title: 'Notifikationer opdateret', color: 'success'})
}
const sendTestNotification = async (): Promise<TestNotificationResponse> => { /* $fetch POST + toasts */ }
```

(All `$fetch` in stores per ADR-007; toasts in store per the `updateUserRoles` precedent.)

### UI — `app/components/user/UserProfileCard.vue`

New footer section copying the pencil-gated `USwitch` role-manager pattern; gated on `shouldShowActions` (i.e. `isCurrentUser` — appears on the `/login` dashboard, NOT in admin's view of other users). Update the leading ASCII-art comment per convention:

```
View (footer of profile card on /login, isCurrentUser only):
+--------------------------------------------------------------------------+
| Systemroller                                     [✏️ Rediger] (existing) |
|--------------------------------------------------------------------------|
| 🔔 Notifikationer                                [✏️ Rediger]            |
|   [📧 E-mail]  [📱 SMS]           ← badges; eller "Ingen notifikationer" |
|   [📨 Send testbesked]            ← disabled hvis ingen kanaler valgt    |
+--------------------------------------------------------------------------+

Edit (pencil → draft + Gem/Annuller, role-manager pattern):
| 🔔 Notifikationer                                                        |
|   E-mail   a.hansen@example.dk                              [———●] ON    |
|   SMS      +45 12 34 56 78                                  [●———] OFF   |
|            (kræver telefonnummer i Heynabo → disabled hvis intet nr.)    |
|   [Gem]  [Annuller]                                                      |
```

The resolved address is shown read-only next to each toggle — it visualizes the normalized model ("this is where it goes, managed via Heynabo"). Toasts: `Testbesked afsendt – tjek din indbakke/telefon` / error / degraded: `Notifikationer er ikke sat op i dette miljø`. Test-ids: `channel-toggle-EMAIL`, `channel-toggle-SMS`, `edit-channels-btn`, `save-channels-btn`, `send-test-notification-btn`.

## Consumer design — `workers/notifications/`

```
workers/notifications/
├── wrangler.toml                 # own 3-env config (local/dev/prod), consumer + send_email
├── tsconfig.json                 # standalone; types: @cloudflare/workers-types
├── vitest.config.ts              # @cloudflare/vitest-pool-workers defineWorkersConfig
├── src/
│   ├── index.ts                  # queue() handler — thin loop, per-message ack/retry
│   ├── contract.ts               # THE contract — zod only
│   ├── delivery.ts               # deliver(msg, env) → routes to provider; RetryableError/TerminalError
│   ├── mask.ts                   # maskEmail('a***@s***.dk'), maskMsisdn('45******78') — ADR-004
│   └── providers/
│       ├── email.ts              # EmailProvider port + CloudflareEmailProvider (env.EMAIL.send)
│       └── sms.ts                # SmsProvider port + GatewayApiSmsProvider (fetch injectable)
└── test/
    ├── contract.unit.spec.ts     # parametrized accept/reject matrix
    ├── consumer.spec.ts          # pool-workers: fake batch → ack/retry/poison behavior
    └── providers.spec.ts         # fake EMAIL binding, mocked fetch for GatewayAPI status codes
```

### `workers/notifications/wrangler.toml`

```toml
#:schema ../../node_modules/wrangler/config-schema.json
name = "theslope-notifications-local"
main = "src/index.ts"
compatibility_date = "2026-08-01"

[observability]
enabled = true

[vars]
EMAIL_FROM = "noreply@skraaningen.dk"
SMS_SENDER = "Skraaningen"                    # GSM alphanumeric sender, max 11 chars
GATEWAYAPI_BASE_URL = "https://gatewayapi.eu"

[[queues.consumers]]
queue = "theslope-notifications-local"
max_batch_size = 10
max_batch_timeout = 5
max_retries = 3
dead_letter_queue = "theslope-notifications-dlq-local"

[[send_email]]
name = "EMAIL"

[env.dev]
name = "theslope-notifications-dev"
# [env.dev.vars] = same trio
# [[env.dev.queues.consumers]] queue = "theslope-notifications-dev", dlq = "...-dlq-dev", same knobs
# [[env.dev.send_email]] name = "EMAIL"

[env.prod]
name = "theslope-notifications-prod"
# mirror of dev with -prod queue names
```

Secret per env, out-of-band: `make secrets-notifications-dev|prod` (→ `npx wrangler secret put GATEWAYAPI_TOKEN -c workers/notifications/wrangler.toml --env …`).

### Queue handler shape (`src/index.ts`)

```ts
export default {
    async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
        for (const msg of batch.messages) {
            const parsed = NotificationMessageSchema.safeParse(msg.body)
            if (!parsed.success) {                       // poison: the DLQ won't parse it better
                console.error('📮 > NOTIFICATIONS > [CONTRACT] poison message', {msgId: msg.id, issues: parsed.error.issues})
                msg.ack(); continue
            }
            const m = parsed.data
            try {
                const {providerMessageId} = await deliver(m, env)
                console.info(`📮 > NOTIFICATIONS > [${m.channel}] delivered`, {dedupeKey: m.dedupeKey, to: mask(m), providerMessageId, attempt: msg.attempts})
                msg.ack()
            } catch (e) {
                if (e instanceof RetryableError) {
                    console.warn(`📮 > NOTIFICATIONS > [${m.channel}] retrying`, {dedupeKey: m.dedupeKey, attempt: msg.attempts, reason: e.code})
                    msg.retry({delaySeconds: 30 * 2 ** (msg.attempts - 1)})   // 30s, 60s, 120s → DLQ
                } else {
                    console.error(`📮 > NOTIFICATIONS > [${m.channel}] terminal failure`, {dedupeKey: m.dedupeKey, to: mask(m), reason: String(e)})
                    msg.ack()
                }
            }
        }
    }
} satisfies ExportedHandler<Env>
```

### Error taxonomy

| Provider | Condition | Class | Action |
|---|---|---|---|
| Email | `E_RATE_LIMIT_EXCEEDED` | retryable | `msg.retry()` w/ backoff |
| Email | network/internal error | retryable | retry |
| Email | `E_SENDER_NOT_VERIFIED` | terminal (config) | ack + error log (fires on every message → immediately visible) |
| Email | recipient rejected / validation | terminal | ack + error log |
| SMS | HTTP 429, 5xx, fetch error | retryable | retry |
| SMS | 400/422 (bad msisdn/payload), 401/403 (auth) | terminal | ack + error log |
| SMS | 402 insufficient credit | terminal | ack + error log (retrying won't refill the account) |
| — | contract parse failure | poison | ack + error log |

Retryable failures that exhaust `max_retries = 3` are DLQ-routed automatically — the DLQ is exclusively "provider down / throttling > ~3.5 min", which is exactly what an operator can act on (inspect + redeliver via `wrangler queues`).

- **msisdn** is normalized producer-side and enforced by `MsisdnSchema`; the consumer trusts the contract: `POST {GATEWAYAPI_BASE_URL}/rest/mtsms`, header `Authorization: Token ${env.GATEWAYAPI_TOKEN}`, body `{sender: env.SMS_SENDER, message, recipients: [{msisdn: Number(m.to)}]}`.
- **Logging without PII (ADR-004):** tag `📮 > NOTIFICATIONS > [EMAIL|SMS|CONTRACT]`; recipients only via `maskEmail`/`maskMsisdn`; message bodies never logged. Note for ops-runbook: **the DLQ retains full message bodies (PII) for 14 days** — that is the triage tool.

## Infra changes (app side)

App `wrangler.toml` — add to **all three** blocks (top-level for local/`getPlatformProxy`, `[env.dev]`, `[env.prod]`):

```toml
[[queues.producers]]
binding = "NOTIFICATIONS"
queue = "theslope-notifications-local"   # -dev / -prod in the env blocks
```

Then `npm run cf-typegen` so `event.context.cloudflare.env.NOTIFICATIONS: Queue` typechecks.

**Local dev reality (verified):** `nitro-cloudflare-dev@0.2.1` calls wrangler's `getPlatformProxy` over the root `wrangler.toml`, so under `nuxt dev` the producer binding **exists** (miniflare-simulated); sends land in local queue storage that nothing consumes — a perfect E2E sink. The full produce→consume loop cannot run under `nuxt dev` (the consumer is a separate worker). Therefore E2E asserts the producer path only (status + response schema, not `queued === true`), and **dev.skraaningen.dk is the integration environment**.

**Makefile** additions:

```make
deploy-notifications-dev:    # npx wrangler deploy -c workers/notifications/wrangler.toml --env dev
deploy-notifications-prod:   # ... --env prod
secrets-notifications-dev:   # npx wrangler secret put GATEWAYAPI_TOKEN -c workers/notifications/wrangler.toml --env dev
secrets-notifications-prod:  # ... --env prod
logs-notifications-dev:      # npx wrangler tail theslope-notifications-dev --format pretty
logs-notifications-prod:     # npx wrangler tail theslope-notifications-prod --format pretty
```

**CI:** chain the worker deploy inside the existing targets (`deploy-dev: … && $(MAKE) deploy-notifications-dev`, same for prod) so `.github/workflows/cicd.yml` needs no structural change; add `npm run test:worker` (`npx vitest --run -c workers/notifications/vitest.config.ts`) next to `test:unit`.

## Costs

| Item | Requirement | Cost |
|---|---|---|
| Workers Paid | required for Queues + Email Service | $5/mo — likely already active (`cpu_ms=180_000` in `wrangler.toml` is Paid-only); **verify in dashboard, Phase 0** |
| Queues | included in Paid | 1M ops/mo included, then $0.40/M — negligible at this volume |
| Email Service (public beta Apr 2026) | Paid + zone enablement | 3,000 mails/mo included, then $0.35/1k |
| GatewayAPI SMS (DK) | prepaid account | 0.307 DKK/SMS → ~92–460 DKK/mo at 300–1,500 SMS/mo; no monthly fee |
| DLQ | included | raise retention to 14 days |

## Provider research (2026-08-31)

**Email** — MailChannels' free Workers integration is dead (EOL June 2024); Cloudflare's own docs point migrants to Resend. Chosen: **Cloudflare Email Service** (native binding, zero secrets, DNS auto-config, same bill); **Resend** (GA, 3,000/mo free, REST + API key) is the documented fallback behind the `EmailProvider` port.

**SMS** — no genuinely free SMS exists at production quality (carrier termination is always paid; "free" = own-Android-phone gateways or branded trial credits):

| Provider | Security record | Scale | DK price |
|---|---|---|---|
| **GatewayAPI** (OnlineCity, DK) | No reported CVEs/breaches; IP allowlisting; EU platform | Hundreds of millions SMS/yr (Google, Visma, Pfizer) | **0.307 DKK**, pay-as-you-go |
| CPSMS (Compaya, DK) | No reported breaches; annual ISAE 3000 audit | Small/domestic, since 2006 | 0.39 DKK @1k points (ex VAT) |
| Twilio | 2022 phishing breach (Signal/Okta affected); 2024 Authy leak, 33M phone numbers (CVE-2024-39891) | Global leader | ~0.40 DKK ($0.0592) |

Sources: developers.cloudflare.com (email-service pricing/limits/workers-api, queues limits), blog.mailchannels.com EOL notice, gatewayapi.com/da/priser + docs/apis/rest, cpsms.dk/priser, twilio.com/en-us/sms/pricing/dk, securityweek.com + nvd.nist.gov CVE-2024-39891.

## ADR compliance

| ADR | How this proposal complies |
|---|---|
| ADR-001 | New `useNotificationValidation` composable; enum re-export from generated layer; app code never imports the contract file directly |
| ADR-002 | Both endpoints: separate validation/business try-catch, `readValidatedBody`, explicit return types |
| ADR-003 | Every phase is test-first; E2E via `UserFactory`, salted, parallel-safe |
| ADR-004 | `📮 > NOTIFICATIONS >` log format; recipients masked; bodies never logged; no secrets logged |
| ADR-007 | All `$fetch` in the auth store; component renders from store/session state |
| ADR-010 | Serialization confined to composable transforms + repository; domain types everywhere else |
| ADR-012 | `Prisma.skip` branch in `serializeUserPartial` |
| ADR-015 | Deliberately N/A — no send job; the queue replaces the outbox pattern (documented in new ADR-017) |
| **ADR-017 (new)** | "Notification delivery via dedicated worker and versioned queue contract" — producer/consumer split, stateless consumer, contract ownership, provider ports, no-PII logging, the "notify never throws" degradation rule |

## Phases (TDD, each independently shippable)

> **Convention:** the USER runs all migrations, db operations, and account/infra commands (`make prisma-create-migration`, `npm run db:migrate:*`, `wrangler queues create/update`, `wrangler secret put`, dashboard steps). Claude prepares files and command lines; the user executes them.

### Phase 0 — This proposal + account prerequisites ✍️

Manual/dashboard, no code:
1. Verify **Workers Paid**; enable **Email Service** for zone `skraaningen.dk`; sender domain verification (SPF/DKIM/DMARC auto — domain already on Cloudflare DNS); register `noreply@skraaningen.dk`.
2. GatewayAPI account on the **EU platform** + API token (parked in the password manager until Phase 4).
3. Create queues — **user-run** (separate DLQs per env — separate consumers, separate blast radius):

```bash
npx wrangler queues create theslope-notifications-dev
npx wrangler queues create theslope-notifications-dlq-dev
npx wrangler queues create theslope-notifications-prod
npx wrangler queues create theslope-notifications-dlq-prod
npx wrangler queues update theslope-notifications-dlq-dev  --message-retention-period-secs 1209600
npx wrangler queues update theslope-notifications-dlq-prod --message-retention-period-secs 1209600
```

Do **not** create the `-local` queue names remotely — they only ever exist under miniflare.
4. `docs/ops-runbook.md` — new "Notifications" section: queues, DLQ triage (incl. the PII/14d note), sender verification, secret rotation.

### Phase 1 — Schema + serialization (no behavior change)

- **Tests first:** parametrized round-trip unit specs over `[]`, `['EMAIL']`, `['SMS']`, `['EMAIL','SMS']`; `UserFactory` defaults; existing `UserProfileCard` component spec stays green.
- `prisma/schema.prisma` enum + column; then **user runs** `make prisma-create-migration name=notifications` → `migrations/0015_notifications.sql` → `make d1-prisma` → `npm run db:migrate:local`.
- All serialization touchpoints from the table above.
- Ship: dormant column, default `["EMAIL"]`.

### Phase 2 — Contract + producer service

- **Tests first:** contract accept/reject matrix (bad version, bad msisdn, >160 SMS, missing subject) + wire/Prisma enum parity; `resolveDeliveries` matrix (channels × phone × rendering); `normalizeToMsisdn` parametrized; chunking at 100; degraded path (queue=undefined never throws); GSM-7 + length guard on `renderTestNotification`.
- Files: `workers/notifications/src/contract.ts` (contract only — the worker dir exists before the worker; it is the contract's home), `app/composables/useNotificationValidation.ts`, `server/utils/notificationService.ts`, `server/utils/notifications/templates/testNotification.ts`.
- App `wrangler.toml` producer bindings ×3 + `npm run cf-typegen`; verify the binding exists under `nuxt dev`.

### Phase 3 — Endpoints (producer path shippable, into the queue)

- **Tests first (BDD):** `tests/e2e/api/user/notifications.e2e.spec.ts` with `UserFactory`: `POST channels ['EMAIL','SMS']` → 200 with channels; `POST channels ['SMS']` for phoneless user → 400; `POST test` → 200 + `TestNotificationResponseSchema` shape; unauthenticated → 401.
- Files: `channels.post.ts`, `test.post.ts`, `usePermissions.ts` row.
- `docs/adr-compliance-backend.md`: two new rows.
- Ship: messages accumulate in the dev queue (visible via `wrangler queues info`) — harmless, they expire at retention.

### Phase 4 — Notifications worker

- **Tests first:** contract spec; consumer spec (pool-workers: batch of [valid email, valid sms, poison] with fake `EMAIL` binding + mocked `fetch` → ack/ack/ack; retryable throw → `msg.retry` with backoff; terminal → ack); provider spec (GatewayAPI status taxonomy parametrized: 200/429/500/400/401/402).
- Add devDep `@cloudflare/vitest-pool-workers` (**verify peer range against root vitest 3.2.4 at install**; fallback: the handler takes `(batch, env)` so plain-node vitest with fakes works), `vitest.config.ts` kept OUT of root vitest projects, npm script `test:worker`.
- Files: `src/index.ts`, `delivery.ts`, `mask.ts`, `providers/email.ts`, `providers/sms.ts`, `wrangler.toml`, `tsconfig.json`.
- Makefile targets + CI chaining + `make secrets-notifications-dev`.
- Deploy to dev → run Phase 3 E2E against dev → **a real e-mail and SMS arrive**.

### Phase 5 — UI

- **Tests first:** `UserProfileCard.nuxt.spec.ts` extensions (parametrized badges per channels; SMS toggle disabled without phone; `registerEndpoint` for both POSTs → save calls store, testbesked → toast; not-current-user hides section); `tests/e2e/ui/notifications.e2e.spec.ts` (edit → toggle → Gem → reload persists → Send testbesked → toast; `doScreenshot` documentation shot).
- Files: `UserProfileCard.vue` (footer section + ASCII mockup comment), `app/stores/auth.ts` (two actions).
- `docs/adr-compliance-frontend.md`: rows for component + store.

### Phase 6 — ADR + docs

- **ADR-017** at the top of `docs/adr.md`.
- `docs/features.md` entry + the Phase 5 screenshot; ops-runbook final pass; compliance docs' "Last Updated" lines.

## Verification (dev.skraaningen.dk before prod)

```bash
# unit + worker + component
npm run test:unit && npm run test:worker

# E2E (local, producer path)
npx playwright test tests/e2e/api/user/notifications.e2e.spec.ts tests/e2e/ui/notifications.e2e.spec.ts --reporter=line

# deploy dev (app + worker via chained Makefile target), then:
curl -s -b .cookies.txt -X POST "https://dev.skraaningen.dk/api/user/notifications/channels" \
  -H "Content-Type: application/json" -d '{"channels":["EMAIL","SMS"]}' | jq
curl -s -b .cookies.txt -X POST "https://dev.skraaningen.dk/api/user/notifications/test" | jq
#   → {"queued":true,"enqueued":2,"skipped":0,"degraded":false,...}

# watch the consumer eat it
make logs-notifications-dev          # expect: 📮 > NOTIFICATIONS > [EMAIL] delivered {dedupeKey...}
npx wrangler queues info theslope-notifications-dev       # backlog back to 0
npx wrangler queues info theslope-notifications-dlq-dev   # 0 messages
# and: the test e-mail is in the inbox / the SMS is on the phone
```

Prod: repeat the curl pair against `https://skraaningen.dk` after prod deploy + `make secrets-notifications-prod`.

## Risks / open items

- **Email Service is public beta** (Apr 2026): `env.EMAIL.send()` signature/error codes may drift before GA. Contained — only `providers/email.ts` touches it; Resend swap = one adapter + one secret. Re-verify binding key + typed errors against current docs in Phase 0.
- **Paid plan + zone enablement are dashboard steps** — cannot be IaC'd; Phase 0 checklist + runbook.
- **No full local loop** (two workers, one `nuxt dev`): accepted — producer E2E against the miniflare queue sink, consumer via pool-workers tests, dev environment proves integration.
- **`@cloudflare/vitest-pool-workers` peer pinning** vs root vitest 3.2.4 — check at install; fallback documented in Phase 4.
- **Sender ID** `Skraaningen` (11-char GSM alphanumeric, no å) — verify DK carrier acceptance with one real SMS in Phase 4.
- **Two-device session staleness**: channels are snapshotted in the session; the endpoint patches it and the store re-fetches, but a second logged-in device shows stale toggles until next login. Cosmetic — the test endpoint reads the DB row.
- **CI deploys the worker on every push** even when unchanged — wrangler deploys are cheap and idempotent; acceptable v1.

## Out of Scope (explicit follow-ups — each is one template + one `notifyUsers()` call site)

- Job-failure → admins (call site in `dailyMaintenanceService` / billing / import catch blocks; targets = ADMIN users) — release-plan I4
- Dinner-cancelled / announced → booked users (call site in the single chef-action entry point, `/api/chef/dinner/[id].post.ts`)
- Waitlist sold/bought + subscribe-and-notify (F4), duty/chef-deadline reminders (F5b, cron-driven from Nitro scheduled tasks), accountant billing mail (F2)
- Per-trigger opt-outs, digests, unsubscribe links, branded HTML templates
- Delivery log / exactly-once idempotency store + admin history UI (deliberately rejected — upgrade path documented via `dedupeKey`)
- TheSlope-owned `notificationPhone` override for users without a Heynabo phone (non-breaking later migration)
- Admin editing other users' channels
