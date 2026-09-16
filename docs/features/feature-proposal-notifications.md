# Feature Proposal: Notifications — `theslope-sender` delivery pipe + billing CSV archive

**Status:** Accepted (signed off 2026-09-16) | **Date:** 2026-08-31 | **Updated:** 2026-09-16 | **Branch:** `feature/email-notifications` (M5; work currently on `bugfix/admin-ux`)
**Release plan:** F3 (delivery infra) + F2 (accountant CSV archive) — milestones M5/M6 in `proposals/release-plan-v0.9.md`

## Package inventory

| Package | Delivers | Status |
|---|---|---|
| Proposal doc revision | this document, signed off | ✅ 2026-09-16 |
| Cloudflare prerequisites | Email Service enabled + sender verified, dev queue, operator API token | user-run |
| E-mail through the pipe | `workers/sender/` (Nitro), contract v1 — built and reviewed | ✅ 2026-09-16 (54 tests, gates green) |
| Test event through the app | `SENDER` producer binding, `server/utils/sender/events/test.ts` + `POST /api/admin/sender/event/test`, `make theslope-sender-event-test-dev` → a real e-mail confirmed in the inbox; CF-review fixes on the sender | next |
| Prod env for the sender | `[env.prod]`, `deploy-sender-prod`, `theslope-sender-event-test-prod` | |
| App adopts the shared base | `nuxt.config.ts` reads `compatibilityDate` + `nitro.preset` from `workers/common/cloudflare.ts`; all workers on `2026-09-16`; runtime types via `make typegen` | ✅ 2026-09-16 (verified by CI e2e + dev smoke on next deploy) |
| Billing archive | monthly billing writes the period CSV to R2, on-demand archive endpoint | |
| Docs and ADRs | ADR-018, ADR-019, ops-runbook, compliance tables, release plan | |
| *(later)* SMS gateway adapter | GatewayAPI provider + token, real SMS delivery | not this release |
| *(next task)* Triggers + UX | chef reminders, `PLANNINGMANAGER`, landing-page alarms, templates, producer call sites | separate proposal |

## Problem

- TheSlope has no way to reach users outside the app — job failures, cancelled dinners, chef deadlines and the monthly accountant CSV die silently in Workers Logs or depend on a human copying a magic link
- Sending from the request path of the Nuxt worker would couple business mutations to third-party delivery latency and failures
- The accountant CSV exists only as an on-the-fly download (`/api/public/billing/[token]/csv`); there is no durable copy

Expected volume: **10–50 notifications/day** once the trigger catalog lands (chef-deadline reminders, team shift reminders, booking events, monthly accountant mail).

## Decisions (2026-09-16)

| Decision | Status | Where |
|---|---|---|
| Worker named **`theslope-sender`** — directory `workers/sender/`, worker `theslope-sender-{env}`, queue `theslope-sender-{env}`, app producer binding `SENDER` | ✅ | Layout |
| **No dead-letter queue** — after the 3 retries (30/60/120 s) the sender logs `[<channel>] failed after 4 attempts` with the masked recipient and acknowledges; logs are the failure record | ✅ (user, 2026-09-16) | Sender |
| **Two wrangler files** — `workers/sender/wrangler.toml` next to the sender code; the root file only gains the `SENDER` producer + `ARCHIVE` bucket. One file *could* host both (wrangler environments may override `main`/`name`) but would inherit the app's `assets`/`crons` into the sender unless overridden, and the per-env repetition of bindings is identical either way | ✅ (user, pro/con reviewed) | Layout |
| **The sender is a Nitro app (no Vue)** — same engine (nitropack 2.13.3) and Cloudflare preset as the app's server side; zero new dependencies | ✅ | Tech stack |
| **One repo, one `package.json`, N workers.** Shared: versions, Nitro base settings, platform constants + naming, tests, lint, Make entry points. Per worker: bindings, vars, routes, crons. No workspaces | ✅ | Layout |
| **Secrets: the existing two processes, untouched** (GitHub env for CI time, Worker secrets via `wrangler secret put` for runtime). No Make target. The sender has **no secrets this release** | ✅ | Secrets |
| **App renders.** Templates with placeholders live in theslope's config; the job that raises a signal fills them and emits a complete message (`to`, `from` no-reply, `replyTo`, subject, body, attachments). The sender is **transport only** | ✅ | Contract |
| `meta.kind` is an opaque string in the contract; the trigger catalog is app-owned → a new trigger never needs a sender deploy | ✅ | Contract |
| **SMS: plumbing only, not shipped this release.** Contract channel, provider port, tests in place; an SMS message is acked with `[SMS] channel not enabled`. Gateway adapter + token = later package | ✅ | Sender |
| Accountant CSV: monthly billing **archives to R2** (idempotent per period) **and** the message inlines the CSV as a base64 attachment → self-contained, sender never touches storage | ✅ | Billing archive |
| **Environment consistency**: `local` = miniflare simulation for every binding (D1 copy, queue sink — verified 2026-09-16: local writes land in `.wrangler/state`, the remote dev D1 has tonight's cron JobRun and different row counts), `dev` = dev resources, `prod` = prod resources; no `remote = true` anywhere. Make targets call the **deployed** environment (`URL_dev` / `URL_prod`) with the existing `theslope_call` login pattern | ✅ (user, 2026-09-16) | Layout |
| **Sender events**: every notification trigger is a function in `server/utils/sender/events/<event>.ts` used by both its cron path and its HTTP twin `POST /api/admin/sender/event/<event>` — the `/api/admin/maintenance/*` pattern. First event: `test` (a real e-mail to a given mailbox); `monthly-billing` (accountant mail) follows in its own package | ✅ (user) | Sender events |
| **The proof of the pipe is `make theslope-sender-event-test-dev`**: calls the deployed dev app → `env.SENDER.send()` → real queue → deployed sender → real mail from `Skråningen dev <no-reply.dev@skraaningen.dk>`, confirmed in the inbox. Replaces the curl-to-Queues-API script (Cloudflare REST API where a binding exists is an anti-pattern) | ✅ (user) | Make |
| **Health contract for every worker** (user, 2026-09-16): `workers/common/health.ts` defines the report; the app serves it at `/api/public/health`, the sender at `/sender/health` under the app's hostname (route `<host>/sender/*`, `workers_dev = false`); the smoke job checks every worker against `EXPECTED_VERSION`; `make deploy-sender-*` bakes the same version vars as the app (`with_version`) | ✅ | Health |
| Cloudflare review (`workers-best-practices`, `wrangler` skills): `Env` typed from the generated `worker-configuration.d.ts` (no hand-written `Env`); `observability.traces.enabled = true` on both workers | ✅ (user: "green on cf review") | Sender |
| `COMPATIBILITY_DATE = '2026-09-16'` for every worker (both bumped together, verified by CI e2e + dev smoke); types are generated from it with `wrangler types` (Cloudflare's current practice — `@cloudflare/workers-types` v5 has no dated entrypoints), so no `@cloudflare/workers-types` entry in any `tsconfig` `types`; the package is **removed from `package.json`** (no source file imports it; `D1Database` etc. are globals from `shared/types/worker-configuration.d.ts`). nitropack's own preset typings import that package, so the `cloudflare:queue` hook payload in `workers/sender/plugins/queue.ts` is annotated explicitly from the generated types | ✅ (user, 2026-09-16) | |
| **Make target list** (see Makefile section): `deploy-theslope-*`, `deploy-sender-*`, `logs-sender-*`, `theslope-sender-event-test-*` (the test mail), `queues-info-*`, `typegen`, later `r2-get-billing-*`, `sender-event-monthly-billing-*`; `deploy-dev\|prod` widened to all workers; **no** `secret-*`, `build-*`, `%` pattern rules | ✅ | Makefile |
| **No dry-run target and no dry-run CI step.** `wrangler deploy --dry-run` only re-does what a deploy does (config parse + bundle, no resource checks); run right before a deploy it adds nothing. `make deploy-*` is the validation. Rule recorded: **CI steps are always Make targets** | ✅ (user) | Makefile |
| First iteration ends with a real e-mail through the deployed pipe; nothing app-side is built before that is seen | ✅ | Packages |
| Every package runs behind a brief approved in the main loop (plan-and-supervise) | ✅ | Packages |
| **Wrangler config test** (a vitest spec parsing both `wrangler.toml` files and cross-checking queue names/compat/naming) — **out**. Review instead; a queue-name mismatch surfaces operationally (`theslope-sender-event-test-*`, `queues-info-*`) | ✅ decided out | Wrangler config test |
| R2 bucket names **`theslope-backups` / `theslope-backups-prod`** (from `feature-proposal-backup-export.md`), key prefix `billing/YYYY-MM/` | ✅ (user) | Billing archive |
| **Sender/recipient restrictions live on the `[[send_email]]` binding, not in code** (supersedes the fail-closed `RECIPIENT_ALLOWLIST` var decided earlier the same day): `allowed_sender_addresses` per env (`no-reply.dev@skraaningen.dk` in local/dev, `no-reply@skraaningen.dk` in prod); `allowed_destination_addresses = ["<dev test mailbox>"]` in **dev only** (a verified destination address); prod omits it (= everyone). Platform-enforced, zero code, no vars; `utils/policy.ts` is dropped. Dev shares the local D1 data, so the dev list is what keeps a dev run away from residents | ✅ (user) | Sender |
| **Addresses**: `from` is **per environment — dev `Skråningen dev <no-reply.dev@skraaningen.dk>`, prod `Skråningen <no-reply@skraaningen.dk>`** (address + display name `fromName`, both from the app's vars `NUXT_NOTIFICATIONS_FROM` / `NUXT_NOTIFICATIONS_FROM_NAME`) — so the sender line alone tells the environments apart; pinned per env by the binding's `allowed_sender_addresses`, read by the app from its Cloudflare var `NUXT_NOTIFICATIONS_FROM`; **`replyTo` likewise a per-environment Cloudflare var on the app** (`NUXT_NOTIFICATIONS_REPLY_TO`), both in the root `wrangler.toml` `[env.*.vars]` → `runtimeConfig.notifications.*` → every composed message | ✅ (user) | Next task (producer) |
| **Email Service is set up with wrangler**: `wrangler email sending enable skraaningen.dk` (DNS auto-provisioned), `dns get`, `settings`, and `wrangler email sending send …` proves the service before any code exists; a destination address is verified with `wrangler email routing addresses create <email>` | ✅ | Prerequisites |
| **Environment visible in the mail**: the app's template signature ends with the sending site (`DEPLOY_URL`, e.g. `— Skråningen · dev.skraaningen.dk`); the sender adds nothing to subjects or bodies (no `[dev]` prefix) | ✅ (user) | Next task (templates) + `verify-email.sh` |
| Chef deadline reminders/overdue → **chef only**; new **`PLANNINGMANAGER`** role receives chefless-dinner alerts; where they are shown (`/admin/teams` vs chef page) and alarms on the post-login landing page | ✅ decided / **OPEN** placement — **next task** | Next task |
| "Shift start" for 24 h / 1 h team reminders (dinner start vs configurable cooking offset) | **OPEN** — next task | Next task |

Verified platform facts (Cloudflare docs, 2026-09-16): Queues message ≤128 KB, `sendBatch` ≤100 msgs / 256 KB, `delaySeconds` ≤24 h, retention ≤14 d. **Ack semantics:** a batch is implicitly acknowledged only when `queue()` returned **and every `waitUntil()` promise resolved**; a rejected `waitUntil` promise retries the whole batch. Email Service `send({from, to, subject, text, html, replyTo, attachments[{content: base64|ArrayBuffer, filename, type, disposition}], headers})` → `{messageId}`, ≤5 MiB total, ≤32 attachments; **retryable** error codes `E_RATE_LIMIT_EXCEEDED`, `E_DAILY_LIMIT_EXCEEDED`, `E_INTERNAL_SERVER_ERROR`; every other `E_*` is terminal. `wrangler queues` has no publish subcommand → publishing from the command line goes through the Queues HTTP API.

## Tech stack: Nitro without Vue

Nuxt = **Vue** (pages, components, Pinia, NuxtUI) + **Nitro** (the server engine: `server/`, tasks, plugins, presets, `.output/server/index.mjs`). A queue consumer has no UI, so the honest "same stack" is **Nitro standalone** — identical engine, identical Cloudflare preset, identical deploy artefact, identical conventions. Verified in `node_modules`:

- nitropack **2.13.3** is what Nuxt 4.3.1 runs on here (`nuxt → @nuxt/nitro-server → nitropack`, one hoisted copy); the `nitro` CLI is already in `node_modules/.bin` (`nitro dev|build|prepare [--dir]`).
- Nitro's `cloudflare_module` preset exports `fetch`, `scheduled`, `email`, **`queue`**, `tail`, `trace` and fires typed hooks — `"cloudflare:queue": ({batch: MessageBatch, env, context: ExecutionContext}) => void` (`nitropack/dist/presets/cloudflare/types.d.ts:92`). The runtime wraps the hook in `context.waitUntil(...)` (`_module-handler.mjs:53-61`), which is correct under the ack rules above.
- The app already uses the same mechanism for cron (`scheduledTasks` → `runCronTasks`, same `_module-handler.mjs:23-34`).

| | Plain Worker (`export default {queue}`) | **Nitro app (chosen)** | Nuxt app |
|---|---|---|---|
| Runtime / deploy | workerd, `wrangler deploy` of `src/index.ts` | workerd via `cloudflare_module`; `nitro build` → `.output/server/index.mjs` → `wrangler deploy -c …` — same shape as the root worker | same + Vue SSR bundle |
| Consumer entry | hand-written `queue()` | `plugins/queue.ts`: `defineNitroPlugin(app => app.hooks.hook('cloudflare:queue', ({batch, env}) => consumeBatch(batch, env)))` | same |
| Conventions | none | `nitro.config.ts`, `plugins/`, `utils/` (auto-imported), `routes/`, `nitro prepare` types, same log/ADR conventions as `server/` | same + `app/` |
| Unneeded weight | — | ~200 KB h3/router (irrelevant at 10–50 msgs/day) | Vue, pages, Pinia, NuxtUI |
| Tests | vitest node | vitest node on `utils/*` (explicit imports, ADR-017 discipline) | `@nuxt/test-utils` |

Config stays **bindings-in** like the app's services: bindings arrive on the hook's `env`, typed by the generated `Env` (`make typegen`) — one config mechanism per worker.

## Repo layout: N workers, one toolchain

### Versions: one `package.json`

No per-worker `package.json`, no npm workspaces (they would split lockfiles and let versions diverge). Every worker resolves `nitropack`, `wrangler`, `zod`, `typescript`, `vitest`, `eslint` from the root; one version bump moves every worker. The sender's Nitro is *literally* Nuxt's Nitro — not declared twice, it stays transitive under `nuxt`; `ts:workers` / `test:workers` tell us if a Nuxt bump broke it.

### Secrets — the existing process, traced

| Consumer | Where the secret lives | Evidence |
|---|---|---|
| **CI time** — tests (Heynabo logins), deploy authentication | GitHub environment `CLOUDFLARE_THESLOPE` (+ `dev`/`prod`) → job `env:` | `.github/workflows/cicd.yml:34-41`, `:230-232`; `docs/ops-runbook.md` "GitHub Secrets & Variables" |
| **Runtime** — the deployed worker (`HEY_NABO_USERNAME/PASSWORD`, `NUXT_SESSION_PASSWORD`) | Cloudflare Worker secrets, set **out of band** by an admin with `npx wrangler secret put <NAME> --env <env>`. Nothing in the repo or CI calls `wrangler secret put`; `wrangler deploy` uploads no env vars; the code reads them from the runtime env (`server/integration/heynabo/heynaboClient.ts:22-25`; nuxt-auth-utils via `NUXT_SESSION_PASSWORD`) | grep `secret put` → 0 hits in Makefile / cicd.yml / package.json |

Two processes for two consumers — neither may hold the other's material. The sender follows the runtime pattern: when SMS ships, `GATEWAYAPI_TOKEN` is set with `npx wrangler secret put GATEWAYAPI_TOKEN -c workers/sender/wrangler.toml --env dev|prod`, exactly like the app's secrets; the app's `NUXT_NOTIFICATIONS_REPLY_TO` (producer task) the same way with `--env dev|prod`. This release the sender has none. Local *ops credentials* are a different, existing house pattern: Make targets read `.env.<env>` through `with_env` (`Makefile:30`, `heynabo-login-dev`, `smoke-dev`); `theslope-sender-event-test-*` reads `HEY_NABO_*` + `SENDER_TEST_EMAIL` the same way and sets nothing. Doc gap: the runbook documents the GitHub side only — the Docs package adds the Cloudflare-side runtime-secrets table per worker.

### Shared vs independent

| Concern | Single source (shared) | Per worker (by design) | Drift guard |
|---|---|---|---|
| Dependencies & versions | root `package.json` + lockfile | — | `npm ls nitropack` shows one copy |
| Nitro build settings | `workers/common/cloudflare.ts` → `{preset: 'cloudflare_module', compatibilityDate: COMPATIBILITY_DATE, typescript: {strict: true}}`; imported by `nuxt.config.ts` (`compatibilityDate`, `nitro.preset`) and every `workers/<name>/nitro.config.ts` | `experimental.tasks`, `scheduledTasks`, `wasm`, plugins | TypeScript import — cannot drift |
| Build constants | `workers/common/cloudflare.ts` → `COMPATIBILITY_DATE = '2026-09-16'`, `COMPATIBILITY_FLAGS = ['nodejs_compat']`, `ENVIRONMENTS = ['local','dev','prod']` (the values a worker's `ENVIRONMENT` var may take) | — | TypeScript import |
| Resource names | declared in each worker's `wrangler.toml`; code reaches resources through bindings (`DB`, `EMAIL`, `SENDER`, `ARCHIVE`) and `[vars]`. Convention: workers `theslope[-<worker>]-<env>`, queues `theslope-<worker>-<env>`, account resources `theslope-<resource>` (local+dev) / `theslope-<resource>-prod` (the D1 precedent) | the names themselves | review |
| Wrangler config | conventions above only — TOML has no `extends`/include | `wrangler.toml` per worker: bindings, vars, routes, crons, limits, `send_email`, queue consumer/producer | review; `make deploy-*` validates on deploy |
| Environments & env files | `local`/`dev`/`prod`; `.env`, `.env.dev`, `.env.prod` via `with_env`; `ENV_<env>` map | local keys each ops target needs | — |
| Secrets | existing two processes, nothing added | runtime secrets per worker (runbook table) | — |
| TypeScript | root `tsconfig.json`; `server/tsconfig.json` ← `.nuxt/tsconfig.server.json` | `workers/<name>/tsconfig.json` = one line extending `./.nitro/types/tsconfig.json` | `ts:workers` loops `workers/*/` |
| Binding + runtime typings | `make typegen` → `wrangler types` per worker, generated from that worker's `compatibility_date` + flags (bindings **and** runtime types, committed); no `@cloudflare/workers-types` in any `types` array | — | regenerated together |
| Tests | root `vitest.config.ts` projects `unit`, `nuxt`, **one per worker** (`sender`: `workers/sender/**/*.unit.spec.ts`, node, `~/` → the worker's root exactly as Nitro resolves it) — `npm run test:unit` covers all | specs live next to the worker | — |
| Lint | root `eslint.config.mjs` (`withNuxt`) lints `workers/**` | — | `npm run lint` |
| Logging / ADR rules | ADR-004 format; explicit imports inside `utils/` (ADR-017 discipline) | log tag per worker (`📮 > SENDER`) | review |
| Shared runtime code between workers | `workers/common/` (plain TS, explicit imports) | worker-specific `utils/` | — |
| Deploy / ops entry point | **Makefile only**; `deploy-dev\|prod` deploy all workers | the app keeps `deploy_to` (build + version info) | CI calls `make deploy-*` — unchanged |
| npm scripts | app scripts unchanged; only `ts:workers`, `test:workers` added (`pre:all` += `ts:workers`) | no per-worker npm scripts | — |
| Observability | `[observability] enabled = true` in every worker | — | review |

### Directory layout

```
theslope/                                   # one repo · one package.json · one Cloudflare account · N workers
├── package.json / package-lock.json        # ONE version of nuxt, nitropack (transitive), wrangler, zod, typescript, vitest, eslint
├── nuxt.config.ts                          # (App adopts the shared base) imports workers/common/cloudflare.ts
├── wrangler.toml                           # worker "theslope" — root = wrangler default path (nitro-cloudflare-dev, wrangler d1 scripts, CI)
├── app/  server/  shared/  prisma/  tests/
├── workers/
│   ├── common/                             # shared by every worker AND nuxt.config.ts — plain TS, explicit imports
│   │   ├── cloudflare.ts                   # COMPATIBILITY_DATE, COMPATIBILITY_FLAGS, ENVIRONMENTS, nitroBase
│   │   ├── health.ts                       # HealthReportSchema + buildHealthReport — every worker's health report
│   │   └── mask.ts                         # maskEmail / maskName / maskMsisdn / maskRecipient — logs and dedupe keys (ADR-004)
│   └── sender/                             # worker "theslope-sender" (Nitro, no Vue)
│       ├── nitro.config.ts                 # defineNitroConfig({...nitroBase})
│       ├── wrangler.toml                   # main = ./.output/server/index.mjs; local / [env.dev] / [env.prod]; consumer, send_email, vars
│       ├── worker-configuration.d.ts       # `make typegen` output (committed): Env with the SendEmail binding + vars
│       ├── tsconfig.json                   # extends ./.nitro/types/tsconfig.json
│       ├── contract.ts                     # THE CONTRACT — zod only; the app imports ~~/workers/sender/contract (outside utils/ → no auto-import)
│       ├── plugins/queue.ts                # cloudflare:queue hook → consumeBatch(batch, env)   (the only file using Nitro auto-imports)
│       ├── utils/                          # modules import each other explicitly by alias (`~/utils/…`, `~/contract`), project style; `workers/common` by relative path (outside the worker root)
│       │   ├── consumeBatch.ts             # per message: safeParse → deliver → ack | retry(backoff)
│       │   ├── delivery.ts                 # deliver(msg, providers); RetryableError / TerminalError (sender/recipient limits are on the binding)
│       │   └── providers/
│       │       ├── types.ts                # EmailProvider / SmsProvider ports
│       │       ├── cloudflareEmail.ts      # env.EMAIL.send(...) + E_* → retryable/terminal
│       │       ├── smsNotEnabled.ts        # SmsProvider that acks with a warning — the plumbing stub until the gateway adapter ships
│       │       └── index.ts                # createProviders(env)
│       └── test/                           # plain vitest (node) — the root "sender" vitest project
│           ├── fixtures.ts                 # MessageFactory.email(salt) / sms(salt)
│           └── contract.unit.spec.ts  consumeBatch.unit.spec.ts  delivery.unit.spec.ts  providers.unit.spec.ts
├── vitest.config.ts                        # + project "workers"
├── eslint.config.mjs                       # unchanged (withNuxt covers workers/**)
└── Makefile                                # see below
```

`.gitignore` already covers `.output`, `.nitro`, `.wrangler` at any depth. The app's `wrangler.toml` stays at the root because `nitro-cloudflare-dev` (`getPlatformProxy`), the ten `wrangler d1 …` npm scripts, `deploy`/`cf-typegen` and CI resolve it on the default path; Cloudflare's monorepo convention is *config next to code, addressed with `-c`*.

**Contract ownership:** the sender owns `workers/sender/contract.ts` (zod only). The app imports it via `~~/workers/sender/contract` from `useNotificationValidation.ts` (next task) — verify the Nitro per-context typecheck follows that import (ADR-017 gate `ts:server`).

### Makefile — the diff for two workers (target list ✅ agreed 2026-09-16; `theslope-sender-event-test-*` ✅ same day)

House style is *macro for the recipe, explicit target per env* (`run_smoke` → `smoke-dev|prod`), and `help` (`Makefile:57`) greps `^[a-zA-Z0-9_-]+:.*## ` — a `%` pattern rule would be invisible in `make help`. Two workers → explicit targets + macros; pattern rules become worth it at a third worker. CI (`make deploy-dev|prod`) is untouched. **No secret targets.**

```diff
 # ============================================================================
 # DEPLOYMENT & LOGS
 # ============================================================================
-.PHONY: deploy-dev deploy-prod logs-dev logs-prod
+# Workers: "theslope" = the Nuxt app (root wrangler.toml); every other worker is a Nitro app in workers/<name>/
+WORKERS := sender
+worker_cfg = workers/$(1)/wrangler.toml
+
+.PHONY: deploy-dev deploy-prod logs-dev logs-prod deploy-theslope-dev deploy-theslope-prod \
+        deploy-sender-dev deploy-sender-prod logs-sender-dev logs-sender-prod typegen
 
 # Deploy macro: $(1)=npm script, $(2)=environment name
 # Uses env vars if set (CI), otherwise calculates via version-info (local)
 define deploy_to
 	…
 endef
 
-deploy-dev: ## Deploy to dev with version info
+# Nitro worker macros: $(1)=worker, $(2)=env — same artefact shape as the app (.output/server/index.mjs)
+define worker_deploy
+	@npx nitro build --dir workers/$(1) && npx wrangler deploy -c $(call worker_cfg,$(1)) --env $(2)
+endef
+define worker_tail
+	@npx wrangler tail -c $(call worker_cfg,$(1)) --env $(2) --format pretty
+endef
+
+deploy-theslope-dev: ## Deploy the app to dev with version info
 	$(call deploy_to,deploy,dev)
 
-deploy-prod: ## Deploy to prod with version info
+deploy-theslope-prod: ## Deploy the app to prod with version info
 	$(call deploy_to,deploy:prod,prod)
 
-logs-dev: ## Tail dev logs
+deploy-sender-dev: ## Build + deploy theslope-sender to dev
+	$(call worker_deploy,sender,dev)
+
+deploy-sender-prod: ## Build + deploy theslope-sender to prod
+	$(call worker_deploy,sender,prod)
+
+# CI entry points — names unchanged. Prerequisites run in order: consumers first, the app (producer) last.
+deploy-dev: $(foreach w,$(WORKERS),deploy-$(w)-dev) deploy-theslope-dev ## Deploy ALL workers to dev
+deploy-prod: $(foreach w,$(WORKERS),deploy-$(w)-prod) deploy-theslope-prod ## Deploy ALL workers to prod
+
+logs-dev: ## Tail app logs (dev)
 	@npx wrangler tail theslope --env dev --format pretty
 
-logs-prod: ## Tail prod logs
+logs-prod: ## Tail app logs (prod)
 	@npx wrangler tail theslope --env prod --format pretty
+
+logs-sender-dev: ## Tail theslope-sender logs (dev)
+	$(call worker_tail,sender,dev)
+
+logs-sender-prod: ## Tail theslope-sender logs (prod)
+	$(call worker_tail,sender,prod)
+
+typegen: ## Regenerate wrangler binding typings for every worker (root + workers/*)
+	@npx wrangler types && $(foreach w,$(WORKERS),npx wrangler types -c $(call worker_cfg,$(w)) &&) true
+
+# ============================================================================
+# SENDER EVENTS — trigger a notification event on an environment (the cron twins' pattern, via theslope_call)
+# ============================================================================
+.PHONY: theslope-sender-event-test-local theslope-sender-event-test-dev theslope-sender-event-test-prod queues-info-dev queues-info-prod
+
+# $(1)=env file, $(2)=URL. theslope_call logs in with HEY_NABO_* from the env file; SENDER_TEST_EMAIL is the recipient
+define theslope_sender_event_test
+	$(call theslope_call,$(1),$(2),-X POST "$(2)/api/admin/sender/event/test" -d "{\"to\":\"$$SENDER_TEST_EMAIL\"}")
+endef
+
+theslope-sender-event-test-local: ## Test event on localhost (lands in the miniflare queue sink)
+	$(call theslope_sender_event_test,$(ENV_local),$(URL_local))
+
+theslope-sender-event-test-dev: ## Test event on dev → real mail from Skråningen dev <no-reply.dev@skraaningen.dk>
+	$(call theslope_sender_event_test,$(ENV_dev),$(URL_dev))
+
+theslope-sender-event-test-prod: ## Test event on prod → real mail from Skråningen <no-reply@skraaningen.dk>
+	$(call theslope_sender_event_test,$(ENV_prod),$(URL_prod))
+
+queues-info-dev: ## Backlog of the dev sender queue
+	@npx wrangler queues info theslope-sender-dev
+
+queues-info-prod: ## Backlog of the prod sender queue
+	@npx wrangler queues info theslope-sender-prod
```

| Target | Status | Does |
|---|---|---|
| `deploy-dev` / `deploy-prod` | **unchanged name, wider scope** | deploy ALL workers (sender first, app last) — what CI calls |
| `logs-dev` / `logs-prod` | unchanged | tail app logs |
| `deploy-theslope-dev` / `-prod` | new | the app alone (the previous body of `deploy-dev\|prod`) |
| `deploy-sender-dev` / `-prod` | new | `nitro build --dir workers/sender` + `wrangler deploy -c` |
| `logs-sender-dev` / `-prod` | new | tail `theslope-sender-{env}` |
| `theslope-sender-event-test-local` / `-dev` / `-prod` | new | **the test mail** — `theslope_call` login + `POST /api/admin/sender/event/test {to}` on that environment; dev/prod deliver a real mail, local lands in the miniflare sink. Later events add `sender-event-<event>-<env>` the same way |
| `queues-info-dev` / `-prod` | new | backlog of the queue |
| `typegen` | new | `wrangler types` for root + every worker |
| `r2-get-billing-dev` / `-prod` | new (Billing archive package) | download an archived CSV, `period=YYYY-MM` |
| `secret-*` | **not added** | secrets stay in the existing two processes |
| `build-*`, `dry-run-*`, `sender-verify-*`, `%` pattern rules | not added | build is inside `worker_deploy`; a dry run only repeats what deploy does; the event target is the verification; `%` rules are invisible to `help` |

New macros: `worker_deploy`, `worker_tail`. New variables: `WORKERS`, `worker_cfg`. `package.json` gains only `ts:workers` and `test:workers`. **CI** (`cicd.yml`): unchanged — it keeps calling `make deploy-<env>`, which now deploys every worker. (Rule: CI steps are always Make targets.)

### Wrangler config test — decided out (2026-09-16)

The two `wrangler.toml` files cannot import `workers/common/cloudflare.ts`, so the root producer queue name vs the sender consumer queue name (per env), the shared `compatibility_date`/flags/observability and the naming conventions can drift silently. A ~40-line vitest spec parsing both files with wrangler's exported `unstable_readConfig` (pure file parse — no network, no build, no deploy) was proposed and **declined**: `make deploy-*` validates each file on deploy, and a queue-name mismatch surfaces operationally (`make sender-verify-email-*` fails, `make queues-info-*` shows the backlog). Nothing under `tests/component/architecture/` is created for this.

## Message contract v1 (`workers/sender/contract.ts`)

**Ownership / import direction:** the sender owns the schema — a consumer can never be looser than its own contract. The app re-exports it from `useNotificationValidation.ts` (ADR-001: application code imports from validation composables). The contract file imports **only zod** — never `prisma/generated/zod`.

One queue message = **one delivery** (one recipient, one channel), so retry/ack semantics never duplicate a sibling delivery. Breaking change = v2 schema + union on `v`.

```ts
import {z} from 'zod'

export const CONTRACT_VERSION = 1 as const
export const ChannelSchema = z.enum(['EMAIL', 'SMS'])                    // SMS: contract-ready, gateway not shipped this release
export const KindSchema = z.string().regex(/^[A-Z][A-Z0-9_]{2,63}$/)     // app-owned catalog, opaque here
export const EnvironmentSchema = z.enum(['local', 'dev', 'prod'])         // = ENVIRONMENTS in workers/common/cloudflare.ts (parity test)
export const EmailAddressSchema = z.string().email().max(254)
export const MsisdnSchema = z.string().regex(/^45\d{8}$/)                // Danish, no '+', normalized producer-side
export const SMS_MAX_LENGTH = 160                                        // one GSM-7 segment (æøåÆØÅ are basic-set)
export const ATTACHMENT_MAX_BASE64_CHARS = 96 * 1024                     // keeps the whole message < 128 KB queue limit
export const isGsm7 = (text: string): boolean => /* GSM 03.38 basic + extension set */

const MetaSchema = z.object({
    kind: KindSchema,                             // 'TEST' | 'BILLING_PERIOD_CLOSED' | 'DUTY_SHIFT_REMINDER' | ...
    dedupeKey: z.string().min(1).max(200),        // `{kind}:{channel}:{maskedRecipient}:{messageId}` (workers/common/mask.ts, crypto.randomUUID) — one grep across producer log and sender log
    source: z.literal('theslope-app'),
    environment: EnvironmentSchema,
    enqueuedAt: z.string().datetime(),
    correlationId: z.string().max(100).optional(), // jobRunId / dinnerEventId / billingPeriod — never PII
    userId: z.number().int().positive().optional()
})

const AttachmentSchema = z.object({
    filename: z.string().min(1).max(255),
    contentType: z.string().min(1).max(100),      // 'text/csv; charset=utf-8'
    contentBase64: z.string().min(1).max(ATTACHMENT_MAX_BASE64_CHARS).regex(/^[A-Za-z0-9+/]+={0,2}$/)
})

const EmailMessageSchema = z.object({
    v: z.literal(CONTRACT_VERSION),
    channel: z.literal('EMAIL'),
    to: EmailAddressSchema,
    toName: z.string().max(100).optional(),
    from: EmailAddressSchema,                     // per environment (no-reply.dev@ / no-reply@skraaningen.dk); the binding enforces it
    fromName: z.string().min(1).max(100).optional(), // display name: `Skråningen dev` / `Skråningen`
    replyTo: EmailAddressSchema.optional(),
    subject: z.string().min(1).max(200),
    text: z.string().min(1).max(50_000),
    html: z.string().max(100_000).optional(),
    attachments: z.array(AttachmentSchema).max(4).default([]),
    meta: MetaSchema
})

const SmsMessageSchema = z.object({
    v: z.literal(CONTRACT_VERSION),
    channel: z.literal('SMS'),
    to: MsisdnSchema,
    text: z.string().min(1).max(SMS_MAX_LENGTH).refine(isGsm7, 'SMS text must be GSM-7'),
    meta: MetaSchema                              // no sender-ID field: the alphanumeric sender ID is a gateway detail (worker var)
})

export const NotificationMessageSchema = z.discriminatedUnion('channel', [EmailMessageSchema, SmsMessageSchema])
export type NotificationMessage = z.infer<typeof NotificationMessageSchema>
export type EmailMessage = z.infer<typeof EmailMessageSchema>
export type SmsMessage = z.infer<typeof SmsMessageSchema>
```

- **`dedupeKey` format:** `{kind}:{channel}:{maskedRecipient}:{messageId}` — the recipient masked with `workers/common/mask.ts` (`a***@s***.dk`, `45******78`; names via `maskName` where a name is logged), the message id from `crypto.randomUUID()`. E.g. `TEST:EMAIL:t***@m***.dk:3f1c…`, `BILLING_PERIOD_CLOSED:EMAIL:r***@e***.dk:9b2a…`. One grep on the masked address finds every send to that mailbox; no address or name ever appears in a key or a log line.
- **Batch limits shape the producer:** messages are small (SMS ≤160 chars, mails a few KB, the CSV attachment ≤96 KB base64); the producer chunks `sendBatch` into groups of 100.

Example — the accountant mail the billing trigger (next task) will emit; `events/test.ts` emits the `TEST` shape:

```json
{"v":1,"channel":"EMAIL","to":"revisor@example.dk","from":"no-reply@skraaningen.dk","fromName":"Skråningen","replyTo":"kasserer@skraaningen.dk",
 "subject":"Skråningen: PBS-opgørelse 17/08/2026-16/09/2026",
 "text":"Hej,\n\nVedhæftet er PBS-opgørelsen for perioden ... 64 husstande, i alt 41.230,00 kr.\n\nOversigt: https://skraaningen.dk/public/billing/<token>\n\n— Skråningen",
 "attachments":[{"filename":"PBS-Opgørelse-Skråningen-2026-08.csv","contentType":"text/csv; charset=utf-8","contentBase64":"IktLdW5kZS..."}],
 "meta":{"kind":"BILLING_PERIOD_CLOSED","dedupeKey":"BILLING_PERIOD_CLOSED:EMAIL:r***@e***.dk:9b2a4c1e-6d1f-4c7a-9a0e-2f1b3c4d5e6f","source":"theslope-app","environment":"prod","enqueuedAt":"2026-09-18T03:00:12.000Z","correlationId":"jobRun:812"}}
```

## Sender behaviour + config

```
┌──────────────────────────── theslope (Nuxt worker, producer) ────────────────────────────┐
│ job / endpoint ─▶ fills config template ─▶ complete message (to/from/replyTo/body/att.)   │
│                                    env.SENDER.sendBatch(≤100)                             │
└─────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                          ▼  [queue] theslope-sender-{dev,prod}
┌──────────────────────── theslope-sender (Nitro worker, consumer) ─────────────────────────┐
│ cloudflare:queue hook → consumeBatch: parse contract → deliver → ack | retry              │
│   ├── EmailProvider port → CloudflareEmailProvider (env.EMAIL.send)                       │
│   └── SmsProvider port   → smsNotEnabled (this release) → GatewayAPI adapter (later)      │
│ last attempt (after 30/60/120 s retries) → error log + ack; logs are the failure record   │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Consumer** (`utils/consumeBatch.ts`, called from `plugins/queue.ts`): per message `safeParse` → a body that fails the contract can never be delivered, so it is acked with `console.error('📮 > SENDER > [CONTRACT] rejected', {msgId, issues})` (body never logged) | `deliver()` → ack + `console.info('📮 > SENDER > [EMAIL] delivered', {dedupeKey, to: masked, providerMessageId, attempt})` | `RetryableError` → `msg.retry({delaySeconds: 30 * 2 ** (attempts-1)})` (30/60/120 s); on the 4th attempt → `console.error('… failed after 4 attempts')` + ack | `TerminalError` → ack + `console.error`. `consumeBatch` **never rejects** — every message is explicitly acked or retried; a rejection would retry the whole batch including delivered messages. Recipients only masked (ADR-004).
- **SMS this release**: `providers/smsNotEnabled.ts` implements the `SmsProvider` port and throws `TerminalError('SMS_NOT_ENABLED')` → ack + `console.warn('📮 > SENDER > [SMS] channel not enabled in this release', {dedupeKey})`. Contract, masking and tests for SMS are in place now; the GatewayAPI adapter replaces the stub in a later package.
- **Sender/recipient restrictions are on the binding, not in code**: `[[send_email]]` carries `allowed_sender_addresses` per env (`no-reply.dev@skraaningen.dk` local/dev, `no-reply@skraaningen.dk` prod — the sender address alone tells the environments apart) and `allowed_destination_addresses = ["<dev test mailbox>"]` in dev only (prod omits it = everyone). A message outside those limits fails inside `env.EMAIL.send()` with a terminal `E_*` code → ack + `console.error` with the masked recipient. Dev shares the local D1 data, so the dev list is what keeps a dev run away from residents. The sender never alters subjects or bodies — which environment sent a mail is stated by the app's template signature (`— Skråningen · dev.skraaningen.dk`, from `DEPLOY_URL`).
- **Error taxonomy** (verified codes): Email retryable = `E_RATE_LIMIT_EXCEEDED`, `E_DAILY_LIMIT_EXCEEDED`, `E_INTERNAL_SERVER_ERROR`, network; terminal = every other `E_*` (`E_SENDER_NOT_VERIFIED` fires on every message → immediately visible). A retryable failure on the last attempt (provider down / throttling for longer than the retry window) is logged with the masked recipient and acknowledged.
- **Email provider**: `EmailProvider.send(EmailMessage) → {providerMessageId}` over `env.EMAIL.send({from: fromName ? {email: from, name: fromName} : from, to: toName ? {email, name} : to, replyTo, subject, text, html, attachments: [{content: contentBase64, filename, type: contentType, disposition: 'attachment'}]})`.

### `workers/sender/nitro.config.ts` + `wrangler.toml`

```ts
import {nitroBase} from '../common/cloudflare'
export default defineNitroConfig({...nitroBase})          // preset cloudflare_module, compatibilityDate, strict TS
```

```toml
#:schema ../../node_modules/wrangler/config-schema.json
name = "theslope-sender-local"
main = "./.output/server/index.mjs"      # same artefact shape as the root worker
compatibility_date = "2026-09-16"        # = COMPATIBILITY_DATE
compatibility_flags = ["nodejs_compat"]
[observability]
enabled = true
[vars]
ENVIRONMENT = "local"
[[queues.consumers]]
queue = "theslope-sender-dev"            # same name at the root and in [env.dev], like D1; local = miniflare
max_batch_size = 10
max_batch_timeout = 5
max_retries = 3                          # the last attempt logs an error and acknowledges
[[send_email]]
name = "EMAIL"
allowed_sender_addresses = ["no-reply.dev@skraaningen.dk"]    # platform-enforced `from` (local = dev address)

[env.dev]   name = "theslope-sender-dev"   # ENVIRONMENT="dev";  consumer on -dev; send_email: sender no-reply.dev@, allowed_destination_addresses = ["<dev test mailbox>"]
[env.prod]  name = "theslope-sender-prod"  # ENVIRONMENT="prod"; consumer on -prod; send_email: sender no-reply@skraaningen.dk, no destination limit
```

Vars, bindings and consumers are not inherited by wrangler environments — the three blocks repeat them. **No secrets** in this release; SMS vars (`SMS_SENDER_ID`, `GATEWAYAPI_BASE_URL`) and the `GATEWAYAPI_TOKEN` secret arrive with the gateway adapter package.

### App `wrangler.toml` (all three blocks — Billing archive package)

```toml
[[queues.producers]]
binding = "SENDER"
queue = "theslope-sender-dev"             # local + dev; theslope-sender-prod in [env.prod]
[[r2_buckets]]
binding = "ARCHIVE"
bucket_name = "theslope-backups"          # local + dev share; prod: theslope-backups-prod
```

`shared/types/cloudflare.d.ts` += `SENDER: Queue; ARCHIVE: R2Bucket` on both augmentations (this file, not the unreferenced root `worker-configuration.d.ts`, is the app's binding typing). Under `nuxt dev`, `nitro-cloudflare-dev` (`getPlatformProxy`) simulates both bindings: local sends land in a queue nothing consumes — the intended E2E sink. The full produce→consume loop cannot run under `nuxt dev` (the consumer is a separate worker); **dev.skraaningen.dk is the integration environment**, `make theslope-sender-event-test-dev` proves it.

## Sender events — one function per trigger, cron and HTTP twin

Pattern (= `/api/admin/maintenance/*`): the trigger logic lives once in `server/utils/sender/events/<event>.ts`; the cron path and the admin endpoint both call it.

```
server/utils/sender/
├── emit.ts                  emit(queue: Queue | undefined, message: NotificationMessage): Promise<SenderEmitResult>
│                            — validates against the contract, env.SENDER.send(message); never throws:
│                            missing binding → console.warn + {queued: false, degraded: true}
└── events/
    ├── test.ts              emitTestEmail(queue, {to, replyTo?, from, fromName, site}) → the TEST message, dedupeKey TEST:EMAIL:<to-hash>:<iso>
    └── monthly-billing.ts   (later package) emitBillingPeriodClosed(queue, summary, csv, …) — called from runMonthlyBilling and its HTTP twin

server/routes/api/admin/sender/event/
├── test.post.ts             body {to, replyTo?} (SenderEventTestBodySchema) → emitTestEmail → SenderEmitResult; ADR-002; admin (existing /api/admin POST rule)
└── monthly-billing.post.ts  (later package)
```

- `from`/`fromName` come from `runtimeConfig.notifications` (`NUXT_NOTIFICATIONS_FROM` / `_FROM_NAME` wrangler vars per environment); `replyTo` from the body, else `runtimeConfig.notifications.replyTo` (the secret, when set), else omitted; `site` = `getRequestURL(event).host` for HTTP twins, `DEPLOY_URL` for cron paths.
- `app/composables/useNotificationValidation.ts` re-exports the contract (`~~/workers/sender/contract`) and defines `SenderEventTestBodySchema`, `SenderEmitResultSchema` (`{queued, dedupeKey, degraded}`).
- `shared/types/cloudflare.d.ts` += `SENDER: Queue` (H3EventContext + TaskContext).

Make (per environment, `theslope_call`): `theslope-sender-event-test-local|dev|prod` → `POST $(URL_<env>)/api/admin/sender/event/test -d '{"to": "$SENDER_TEST_EMAIL"}'`, prints `{queued, dedupeKey}`. On dev/prod the deployed sender delivers; `make logs-sender-<env>` shows `[EMAIL] delivered <dedupeKey>`; the inbox is the confirmation. `.env.<env>` provides `HEY_NABO_USERNAME/PASSWORD` (already there) and `SENDER_TEST_EMAIL`.

## Billing CSV archive (R2)

- **Key scheme** (pure, unit-tested, in `useBilling`): `getBillingArchiveKey(cutoffDate) → 'billing/2026-08/pbs-opgoerelse-2026-08.csv'` (ASCII; `billingPeriod`'s `dd/MM/yyyy-dd/MM/yyyy` contains slashes and must not be a key). The human filename `PBS-Opgørelse-Skråningen-….csv` (`generateCsvFilename`) goes to `customMetadata.filename` and later to the mail attachment.
- **`server/utils/billingArchive.ts`**: `archiveBillingCsv(bucket: R2Bucket | undefined, summary: BillingPeriodSummaryDetail, jobRunId?: number): Promise<BillingArchiveResult>` → `generateBillingCsv(summary)` → `bucket.put(key, csv, {httpMetadata: {contentType: 'text/csv; charset=utf-8'}, customMetadata: {billingPeriod, filename, sha256, jobRunId}})`. **Never throws**: missing binding → `console.warn` + `{archived: false, degraded: true}`; put failure → `console.error` + `{archived: false}`. Idempotent: same key overwritten on re-run (ADR-015). Log tag `💰 > BILLING > [ARCHIVE]`.
- **`BillingArchiveResultSchema`** = `{key, filename, sizeBytes, sha256, archived, degraded}`; `BillingGenerationResultSchema += archive: BillingArchiveResultSchema.nullable()` (operation-result type, ADR-009).
- **`runMonthlyBilling(d1Client, triggeredBy, archive?: R2Bucket)`** (`server/utils/monthlyBillingService.ts`): after `generateBilling`, per result `fetchBillingPeriodSummary(d1, result.billingPeriodSummaryId)` → `archiveBillingCsv`. Billing success never depends on the archive. `server/tasks/monthly-billing.ts` and `server/routes/api/admin/maintenance/monthly.post.ts` pass the binding.
- **`POST /api/admin/billing/periods/[id]/archive`** (ADR-002 two-try-catch, `getValidatedRouterParams`, `Promise<BillingArchiveResult>`, 404 when the period is missing): backfill of historic periods and the E2E-testable surface. Row in `docs/adr-compliance-backend.md`.
- Tests: unit (`getBillingArchiveKey` parametrized, sha256 helper); API spec `tests/e2e/api/admin/billing-archive.e2e.spec.ts` via `BillingFactory` (+ `archiveBillingPeriod(context, id)`): 200 + key format; second call → same key (idempotent); the monthly-billing spec asserts `results[].archive.archived === true` under `nuxt dev` (miniflare R2).
- Make: `r2-get-billing-dev|prod period=YYYY-MM` → `wrangler r2 object get theslope-backups[-prod]/billing/<period>/pbs-opgoerelse-<period>.csv --file …`.

## Work packages (one at a time, each behind an approved brief)

**Convention:** the user runs all Cloudflare account commands (`wrangler email|queues|r2|secret …`) and starts dev servers; Claude prepares files + exact command lines. Before any agent starts a package, its brief (goal, files, red tests, open decisions, agent, user actions) is posted in the main loop for approval. No UX in scope → no mockups. **The first code package ends with `make sender-verify-email-dev` delivering a real e-mail; nothing else is built until that is seen.**

| Package | Goal | Creates / modifies | Red tests first | User actions |
|---|---|---|---|---|
| **Proposal doc revision** | this document signed off | `docs/features/feature-proposal-notifications.md` | — | review + sign off (incl. the OPEN rows) |
| **Cloudflare prerequisites** | dev resources exist (prod later, same commands) | `.env.dev` local keys | — | `npx wrangler email sending enable skraaningen.dk` → `dns get` / `settings` show verified; `npx wrangler email routing addresses create <dev test mailbox>` (confirm the mail); `npx wrangler email sending send --from no-reply@skraaningen.dk --to <dev test mailbox> --subject … --text …` proves the service; `wrangler queues create theslope-sender-dev`; operator API token with Queues Edit |
| **E-mail through the pipe** ✅ | sender built, 54 tests, gates green (2026-09-16) | `workers/common/cloudflare.ts` (tiny; the sender is built on them from day one); `workers/sender/{contract.ts, nitro.config.ts, tsconfig.json, wrangler.toml (local + dev, binding restrictions), plugins/queue.ts, utils/{env,consumeBatch,delivery,mask}.ts, utils/providers/{types,cloudflareEmail,smsNotEnabled,index}.ts, test/**, scripts/verify-email.sh}`; Makefile: `deploy-sender-dev`, `logs-sender-dev`, `sender-verify-email-dev`, `queues-info-dev`; root `vitest.config.ts` project `sender`; npm `test:workers`, `ts:workers`, `pre:all` | `contract` accept/reject matrix; `consumeBatch` ack/retry/reject + SMS-not-enabled; `providers` e-mail E_* taxonomy; `fixtures.ts` | `make deploy-sender-dev`, `make sender-verify-email-dev`, check inbox. Verify `nitro build --dir` resolves the root `node_modules` from a clean checkout (fallback: `nodeModulesDirs` in `nitro.config.ts`) |
| **Test event through the app** | `make theslope-sender-event-test-dev` delivers a real mail from the deployed pipe, confirmed in the inbox; sender green on the Cloudflare review | root `wrangler.toml` (`SENDER` producer ×3, `NUXT_NOTIFICATIONS_FROM/_FROM_NAME` vars ×3, `observability.traces`), `nuxt.config.ts` (`runtimeConfig.notifications`), `shared/types/cloudflare.d.ts`, `app/composables/useNotificationValidation.ts`, `server/utils/sender/{emit,events/test}.ts`, `server/routes/api/admin/sender/event/test.post.ts`, Makefile `theslope-sender-event-test-{local,dev,prod}` (drop `sender-verify-email-*` + `scripts/verify-email.sh`), sender: `utils/env.ts` on generated `Env`, `wrangler.toml` traces + `workers_dev = false` + top-level queue `theslope-sender-dev`, `docs/adr-compliance-backend.md` row | unit: `emit` (never throws, degraded), `events/test` (contract-valid, from/fromName/site/replyTo); API spec `tests/e2e/api/parallel/admin/sender-event-test.e2e.spec.ts` (admin 200 `{queued:true, dedupeKey}` — local sink; non-admin 403; bad body 400) | `.env.dev` `SENDER_TEST_EMAIL`; `make deploy-dev`; `make theslope-sender-event-test-dev`; confirm the inbox |
| **Prod env for the sender** | prod deployable | `wrangler.toml` `[env.prod]` (`allowed_sender_addresses = no-reply@`, no destination limit); Makefile: `deploy-sender-prod`, `logs-sender-prod`, `sender-verify-email-prod`, `queues-info-prod`, `typegen`, `deploy-theslope-*` + `deploy-dev\|prod` aggregation (CI unchanged) | — (`theslope-sender-event-test-prod` is the proof) | `make deploy-prod`; `make theslope-sender-event-test-prod` |
| **App adopts the shared base** | `nuxt.config.ts` reads `compatibilityDate` + `nitro.preset` from `workers/common/cloudflare.ts` | `nuxt.config.ts` | — (`npm run pre:all` green, `make deploy-dev` unchanged) | none |
| **Billing archive** | monthly billing stores the period CSV in R2, idempotently, never failing billing; on-demand archive endpoint | app `wrangler.toml` bindings ×3 (`SENDER` producer, `ARCHIVE`), `shared/types/cloudflare.d.ts`, `getBillingArchiveKey`, `billingArchive.ts`, `runMonthlyBilling`, task + `monthly.post.ts`, `archive.post.ts`, `BillingFactory.archiveBillingPeriod`, `r2-get-billing-*` | unit: key builder, sha256; API spec `billing-archive.e2e.spec.ts` | `wrangler r2 bucket create theslope-backups` + `theslope-backups-prod`; none locally (miniflare R2 under `nuxt dev`) |
| **Docs and ADRs** | ADRs, runbook, compliance and release plan updated | `docs/adr.md` ADR-018 + ADR-019 (below); `docs/ops-runbook.md` "Workers & deploy order", "Runtime secrets per worker (Cloudflare side)", "Sender" (queue, failures in logs, Email Service setup via `wrangler email sending`, binding restrictions per env, `sender-verify-email`), "Billing archive"; compliance tables; `release-plan-v0.9.md` (M5/M6 split, SMS deferred) | — | review |
| *(later)* **SMS gateway adapter** | ship SMS | `providers/gatewayApiSms.ts` replacing `smsNotEnabled`, vars `SMS_SENDER_ID`/`GATEWAYAPI_BASE_URL`, provider spec (status taxonomy: 429/5xx retryable; 400/422, 401/403, 402 terminal), an SMS test event (`theslope-sender-event-test-*` with an SMS recipient) real delivery | provider spec | GatewayAPI EU account; `GATEWAYAPI_TOKEN` set with `wrangler secret put -c workers/sender/wrangler.toml --env …` (runtime-secret pattern); DK carrier acceptance of the 11-char sender ID `Skraaningen` verified by the first real SMS |

Per-package gate: red run shown → green run shown → `npm run pre:all` → diff review against the brief and the coverage matrix → compliance rows updated in the same change → **the user commits**.

## Coverage matrix

| Change | Required tests | Spec |
|---|---|---|
| `workers/sender/contract.ts` | unit | `test/contract.unit.spec.ts` — accept/reject matrix (`describe.each`); `EnvironmentSchema` ↔ `ENVIRONMENTS` parity |
| `utils/consumeBatch.ts`, `delivery.ts` | unit | `test/consumeBatch.unit.spec.ts`, `test/delivery.unit.spec.ts` |
| `workers/common/{health,mask}.ts` | unit | `tests/component/workers/common/{health,mask}.unit.spec.ts` |
| `utils/providers/*` (Cloudflare e-mail, `smsNotEnabled`) | unit (fake `EMAIL` binding with E_* codes) | `test/providers.unit.spec.ts` |
| `server/utils/sender/emit.ts`, `events/test.ts` | unit | `tests/component/utils/sender/*.unit.spec.ts` |
| `POST /api/admin/sender/event/test` (new endpoint) | Playwright API spec | `tests/e2e/api/parallel/admin/sender-event-test.e2e.spec.ts` |
| Make targets | verified by running them (`make theslope-sender-event-test-dev`) | Verification |
| every `wrangler.toml` | validated by `make deploy-*`; no unit spec (wrangler config test decided out) | Verification |
| `POST /api/admin/billing/periods/[id]/archive` (new endpoint) | Playwright API spec | `tests/e2e/api/admin/billing-archive.e2e.spec.ts` (parallel, salted, `BillingFactory`) |
| `runMonthlyBilling` archive step | existing monthly-billing API spec extended (`results[].archive`) | `tests/e2e/api/serial/…` (already serial) |
| `getBillingArchiveKey`, sha256 helper | unit | `tests/component/composables/useBilling.unit.spec.ts` (+ cases) |

No UX component changes → no BDD/component specs, no test-id changes.

## Verification (dev.skraaningen.dk before prod)

```bash
npm run pre:all && npm run test:unit                      # ts:workers + "workers" project green, lint clean
make deploy-dev                                           # both workers (sender first, app last)
make theslope-sender-event-test-dev                                # admin login → POST /api/admin/sender/event/test → {queued, dedupeKey}
make logs-sender-dev                                      # 📮 > SENDER > [EMAIL] delivered {dedupeKey} → then the inbox
make queues-info-dev                                      # backlog 0
make logs-sender-dev                                      # 📮 > SENDER > [EMAIL] delivered {dedupeKey, providerMessageId}
# archive (local, miniflare R2 via nuxt dev — user starts the server)
npx playwright test tests/e2e/api/admin/billing-archive.e2e.spec.ts --reporter=line --workers=4
make deploy-dev                                           # builds + deploys ALL workers — the same target CI calls
make typegen                                              # regenerates binding typings for all workers (no diff expected)
make r2-get-billing-dev period=2026-08                    # after a dev monthly run / archive POST
```

Prod: `make deploy-prod`, `make theslope-sender-event-test-prod`.

## Costs

| Item | Requirement | Cost |
|---|---|---|
| Workers Paid | required for Queues + Email Service | $5/mo — **already active** ✓ |
| Queues | included in Paid | 1M ops/mo included, then $0.40/M — negligible at this volume |
| Email Service (public beta Apr 2026) | Paid + zone enablement | 3,000 mails/mo included, then $0.35/1k |
| R2 | included in Paid | 10 GB-month free; a CSV per month is nothing |
| GatewayAPI SMS (DK) — **later package** | prepaid account | 0.307 DKK/SMS → ~92–460 DKK/mo at 300–1,500 SMS/mo; no monthly fee |

## Provider research (2026-08-31, kept for the SMS package)

**Email** — MailChannels' free Workers integration is dead (EOL June 2024); Cloudflare's own docs point migrants to Resend. Chosen: **Cloudflare Email Service** (native binding, zero secrets, DNS auto-config for `skraaningen.dk`, same bill); **Resend** (GA, 3,000/mo free, REST + API key) is the documented fallback behind the `EmailProvider` port.

**SMS** — no genuinely free SMS exists at production quality:

| Provider | Security record | Scale | DK price |
|---|---|---|---|
| **GatewayAPI** (OnlineCity, DK) | No reported CVEs/breaches; IP allowlisting; EU platform | Hundreds of millions SMS/yr | **0.307 DKK**, pay-as-you-go |
| CPSMS (Compaya, DK) | No reported breaches; annual ISAE 3000 audit | Small/domestic, since 2006 | 0.39 DKK @1k points (ex VAT) |
| Twilio | 2022 phishing breach; 2024 Authy leak, 33M phone numbers (CVE-2024-39891) | Global leader | ~0.40 DKK |

Sources: developers.cloudflare.com (email-service, queues limits/javascript-apis), blog.mailchannels.com EOL notice, gatewayapi.com/da/priser + docs/apis/rest, cpsms.dk/priser, twilio.com/en-us/sms/pricing/dk, securityweek.com + nvd.nist.gov CVE-2024-39891.

## ADR Notes (proposed; next free numbers — the earlier draft's "ADR-017" label is taken by Isomorphic Composables)

**ADR-018 [Additional workers are Nitro apps under workers/<name> with single-sourced platform config; versioned queue contract for the sender]**
- Context: a second Cloudflare worker (queue consumer) must share the app's engine, versions and toolchain without moving the Nuxt app off the root.
- Decision: every additional worker is a Nitro app in `workers/<name>/` (`nitro.config.ts` from `workers/common/cloudflare.ts`, own `wrangler.toml` next to its code); one root `package.json`; platform constants + naming in `workers/common/cloudflare.ts`; Make is the per-worker entry point and `deploy-dev|prod` deploy all workers, consumers first; the sender owns a versioned zod contract (`v`, opaque `meta.kind`, one message = one delivery) that the app re-exports through a validation composable; the sender is transport-only, app renders; secrets follow the existing runtime pattern (`wrangler secret put` by an admin), never Make/CI; ADR-004 logging with masked recipients; logs are the failure record (last attempt = error log + ack).
- Compliance: no `app/`/`server/` imports in a worker; no worker internals imported by the app except `contract.ts`; `utils/` modules import explicitly (ADR-017); `consumeBatch` never rejects; every worker has `[observability] enabled`.

**ADR-019 [Durable exports in R2: bindings-in, never-throws, idempotent keys]**
- Context: the accountant CSV needs a durable copy; the archive must never fail the business job that produces it.
- Decision: R2 via a binding passed into the service (`archive?: R2Bucket`), ASCII deterministic keys (`billing/YYYY-MM/…`), overwrite on re-run (ADR-015), `customMetadata` with the human filename + sha256 + jobRunId, result surfaced as an operation-result type (ADR-009), degraded mode logged and returned — never thrown.

## Existing DRY violations observed (report only — not touched here)

| Where | Duplication | Note |
|---|---|---|
| `wrangler.toml` | D1 block ×3; `[triggers] crons` ×3 | wrangler envs don't inherit bindings — inherent, but unguarded |
| `wrangler.toml` ×3 + `nuxt.config.ts:31-35` + `app/app.config.ts` `systemJobs` | the three cron strings live in **5 places** ("must match" comment in `wrangler.toml:27`) | `app.config.ts` also states local times that are wrong in CEST |
| `Makefile:36,42,270,275,280,344,349,360,368,375` | Heynabo login JSON body inlined ~10× although `heynabo_call`/login macros exist | |
| `Makefile` | per-env target triplets (`d1-migrate-*`, `d1-seed-*`, `theslope-login-*`, `heynabo-*-dev|prod`, `heal-*`, `regen-dinner-events-*`) | inherent to the explicit-target house style; `%` rules would need the `help` regex widened |
| `package.json:33-44` | `db:seed:*` / `db:migrate:*` ×3 per env, each repeating the D1 name | |
| `.github/workflows/cicd.yml:35-37` and `:230-232` | `HEY_NABO_*` secret mappings declared twice | |
| `worker-configuration.d.ts` (root, unreferenced) vs `shared/types/cloudflare.d.ts` vs gitignored `env.d.ts` | three declarations of the same `Env` (`DB`, `ASSETS`) | `make typegen` keeps the generated one honest; the augmentation stays the source |
| `heynaboClient.ts:22-25` vs `githubClient.ts:95` | two config-reading mechanisms (`dotenv` + `process.env` vs `useRuntimeConfig()`) | the producer (next task) follows `useRuntimeConfig` |
| `docs/ops-runbook.md` | GitHub secrets documented, Cloudflare runtime secrets not | doc gap, closed by the Docs package |

## Risks / open items

- **Email Service is public beta** (Apr 2026): `env.EMAIL.send()` signature/error codes may drift before GA. Contained — only `providers/cloudflareEmail.ts` touches it; Resend swap = one adapter + one secret. Re-verify binding key + typed errors against current docs in the prerequisites package.
- **Email Service setup is scriptable** (`wrangler email sending enable|dns|settings|send`, `wrangler email routing addresses create`) but one-time and account-level — documented as command lines in the prerequisites + runbook, not Make targets (they are not repeatable operations).
- **No full local loop** (two workers, one `nuxt dev`): accepted — producer E2E against the miniflare queue sink, consumer via unit tests, dev environment proves integration (`theslope-sender-event-test-dev`). Optional for built artefacts: `wrangler dev -c wrangler.toml -c workers/sender/wrangler.toml` shares the local queue.
- **`nitro build --dir workers/sender`** must resolve the root `node_modules` from a clean checkout — verified in the first code package; fallback `nodeModulesDirs` in `nitro.config.ts`.
- **CI deploys the sender on every push** even when unchanged — wrangler deploys are cheap and idempotent; acceptable.
- **Deploy order** matters once the contract evolves: consumer before producer — encoded in `deploy-dev|prod`, documented in the runbook.

## Next task (deferred design — not part of this proposal's packages)

Decisions already taken for it (2026-09-16): chef deadline reminders/overdue go to the **chef only**; a new **`PLANNINGMANAGER`** system role receives alerts for **chefless dinners**; those alerts must be clearly visible in an admin panel (**OPEN:** `/admin/teams` vs the chef page) and alarms/warnings also appear on the landing page after login. **OPEN:** the "shift start" used for the 24 h / 1 h team-member reminders (dinner start vs a configurable cooking offset). Note `fetchUsersByRole` matches roles by JSON substring (`contains`) — `PLANNINGMANAGER` must keep names non-overlapping or the lookup switches to exact-array matching.

Trigger catalog (each = one config template + one producer call site emitting contract messages via `env.SENDER`): `TEST` (profile "Send testbesked"), `CHEF_MENU_DEADLINE` / `CHEF_MENU_OVERDUE` (menu deadline = dinner − `menuIsAnnouncedDaysBefore`, `useSeason().deadlinesForSeason`), `DINNER_NO_CHEF` (→ `PLANNINGMANAGER`), `DUTY_SHIFT_REMINDER` 24 h / 1 h (hourly Nitro task; team → assignment → inhabitant → user needs a new repository query, ADR-009 Display type), `BILLING_PERIOD_CLOSED` (accountant address from runtime config; CSV inline from the archive step), `JOB_FAILED` (I4, admins), `DINNER_CANCELLED`. Cron descriptions in `app.config.ts` `systemJobs` state local times that are wrong in CEST — fix when the reminder crons are added.

App-side design carried over from the 2026-08-31 draft (unchanged, to be re-validated in that task):

- **Preference model:** `User.notificationChannels String @default("[\"EMAIL\"]")` — JSON array of new enum `NotificationChannel { EMAIL SMS }`, mirroring the `systemRoles` JSON-array pattern; addresses resolved from `User.email` / `User.phone` at enqueue time (Heynabo-owned, zero drift). Serialization touchpoints: `UserFragmentSchema`, `SerializedUserInputSchema` / `serializeUserInput` / `deserializeUser` / `deserializeUserDetail`, `serializeUserPartial` (ADR-012 `Prisma.skip`) + `USER_DISPLAY_SELECT` + `deserializeToUserDisplay`, `userFactory.defaultUserData`. Migration `make prisma-create-migration name=notifications`.
- **Producer:** `server/utils/notifications/notificationService.ts` — `notifyUsers(queue, users, rendering)` **never throws** (missing binding → warn + degraded result); `normalizeToMsisdn`, `resolveDeliveries` pure; chunked `sendBatch` ≤100. Templates with placeholders in theslope's config (`app.config.ts` `theslope.notifications`); `from`, `replyTo` and the accountant address are Cloudflare vars per environment on the app (`NUXT_NOTIFICATIONS_FROM` = `no-reply.dev@skraaningen.dk` / `no-reply@skraaningen.dk`, `NUXT_NOTIFICATIONS_FROM_NAME` = `Skråningen dev` / `Skråningen`, `NUXT_NOTIFICATIONS_REPLY_TO`, `NUXT_NOTIFICATIONS_ACCOUNTANT_EMAIL` in the root `wrangler.toml` `[env.*.vars]` → `runtimeConfig.notifications.*`). **Every template's signature states the sending site** (`— Skråningen · dev.skraaningen.dk` / `www.skraaningen.dk`, from `DEPLOY_URL`) so dev mail is never mistaken for prod mail.
- **Endpoints:** `POST /api/user/notifications/channels` (session user only, 400 `'SMS kræver et telefonnummer'` when phone missing, patches the session snapshot), `POST /api/user/notifications/test` (200-with-warning when degraded, not 503). ADR-002 two-try-catch; row in `usePermissions.ts`.
- **Store:** `auth.ts` `updateMyNotificationChannels`, `sendTestNotification` (all `$fetch` in stores, toasts in store per the `updateUserRoles` precedent).
- **UI mockup — `UserProfileCard.vue` footer** (`isCurrentUser` only) ⏳ awaiting signoff:

```
View:
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

  Test-ids: `channel-toggle-EMAIL`, `channel-toggle-SMS`, `edit-channels-btn`, `save-channels-btn`, `send-test-notification-btn`. Toasts: `Testbesked afsendt – tjek din indbakke/telefon` / error / degraded `Notifikationer er ikke sat op i dette miljø`.

- Out of scope there too: per-trigger opt-outs, digests, unsubscribe links, branded HTML templates, delivery log / exactly-once store (rejected — upgrade path via `dedupeKey`), TheSlope-owned `notificationPhone` override, admin editing other users' channels.
