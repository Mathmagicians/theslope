# Feature: Notifications — `theslope-sender` delivery pipe, accountant mail, billing archive

**Status:** ✅ Implemented on `bugfix/admin-ux` (PR #166), 2026-09-18; ADRs open | **Date:** 2026-08-31 | **Updated:** 2026-09-18
**Operations:** `docs/ops-runbook.md` → "Sender (e-mail delivery worker)", "Schema Changes (Prisma → D1)".
**Follow-ups:** triggers, landing-page alarms and SMS in `feature-proposal-notification-triggers.md`; parked defects and findings
in `bug-fix-dinner-page-and-dates.md`.

## Inventory

| Package | Delivers | Code | Tests | Status |
|---|---|---|---|---|
| E-mail through the pipe | the Nitro worker `theslope-sender-{env}` consumes `theslope-sender-{env}` and sends through the `send_email` binding; contract v1; an SMS message is acknowledged as not enabled | `workers/sender/` (`contract.ts`, `plugins/queue.ts`, `utils/consumeBatch.ts`, `utils/delivery.ts`, `utils/providers/`), `workers/common/` | `workers/sender/test/*.unit.spec.ts`, `tests/component/workers/common/*` | ✅ 2026-09-16 |
| Shared platform base | one compatibility date and one Nitro base for the app and every worker; runtime types from `wrangler types` | `workers/common/cloudflare.ts`, `nuxt.config.ts`, `make typegen` | `npm run pre:all` (`ts:workers`) | ✅ 2026-09-16 |
| Health | every worker reports its version; the smoke run checks each | `workers/common/health.ts`, `server/routes/api/public/health.get.ts`, `workers/sender/routes/sender/health.get.ts` | `tests/component/workers/common/health.unit.spec.ts`, `tests/e2e/smoke/smoke.e2e.spec.ts` | ✅ 2026-09-16 |
| Test event | one real mail to the admin mailbox through the deployed pipe | `server/utils/sender/{emit,compose,config}.ts`, `server/utils/sender/events/test.ts`, `server/routes/api/admin/sender/event/test.post.ts`, `make theslope-sender-event-test-<env>` | `tests/component/utils/sender/`, `tests/e2e/api/parallel/admin/sender-event-test.e2e.spec.ts` | ✅ 2026-09-16, real mail on dev |
| Accountant mail and billing archive | every closed period converges: its CSV in R2 (one object per version) and a mail to the accountant with the CSV, cc the admin mailbox; v1 is `BILLING_PERIOD_CLOSED`, a later version `BILLING_PERIOD_UPDATED` | `app/config/notificationTemplates.ts`, `app/utils/template.ts`, `server/utils/sender/events/monthly-billing.ts`, `server/utils/billingArchive.ts`, `server/utils/monthlyBillingService.ts`, `useBilling().decideBillingSideEffects`, `app/composables/useDeliveryValidation.ts`, `server/data/financesRepository.ts` (`bumpBillingPeriodVersion`, `fetchDeliveries`, `recordDelivery`), `migrations/0015_notifications.sql`, `server/routes/api/admin/sender/event/monthly-billing.post.ts`, `make theslope-sender-event-monthly-billing-<env> bpid=<id>` | `tests/component/utils/{template,billingArchive}.unit.spec.ts`, `tests/component/utils/sender/events/monthly-billing.unit.spec.ts`, `tests/component/composables/{useBilling.nuxt,useDeliveryValidation.unit}.spec.ts`, `tests/e2e/api/serial/admin/{maintenance,sender-event-monthly-billing}.e2e.spec.ts` | ✅ 2026-09-18, mail with the CSV on dev |
| Job result | the monthly job reports CSVs uploaded, mails sent and periods pending | `formatMonthlyBillingStats` in `app/composables/useMaintenance.ts`, `MonthlyBillingJobResult` | `tests/component/composables/useMaintenance.nuxt.spec.ts` | ✅ 2026-09-18 |
| Prod environment | `[env.prod]` for the sender; `make deploy-prod` deploys the sender, then the app | `workers/sender/wrangler.toml`, `Makefile` | the CI smoke run on `/sender/health` | ✅ wired 2026-09-18 |
| Migration safety | migrations after `0014` add columns with `ALTER TABLE`; `make d1-migrate-<env>` compares parent-link counts before and after the apply | `Makefile` (`d1_migrate`, `d1-verify-<env>`), `.claude/skills/prisma/SKILL.md` | `tests/component/architecture/migrations.unit.spec.ts` | ✅ 2026-09-18 |
| Channel preference | per-user channels `EMAIL` / `SMS` | `User.notificationChannels` (migration `0015`); "My preferences" in `bug-fix-admin-ux.md` | "My preferences" in `bug-fix-admin-ux.md` | ✅ 2026-09-18 |
| In-app alerts | one alert pattern for the 55 `<UAlert>` sites | `ALERTS` in `useTheSlopeDesignSystem.ts` (ADR-018), `app/components/dinner/DinnerModeLegend.vue` | `tests/component/architecture/designSystemUsage.unit.spec.ts`, `tests/e2e/ui/MobileViewport.e2e.spec.ts` | ✅ 2026-09-16; standing overflow findings in `bug-fix-dinner-page-and-dates.md` |
| Runbook and compliance | runbook sections Sender, Templates, Secrets, Billing archive (R2), Schema Changes; compliance rows | `docs/ops-runbook.md`, `docs/adr-compliance-backend.md`, `docs/adr-compliance-frontend.md` | — | ✅ 2026-09-18 |
| ADRs | two ADRs | `docs/adr.md` | — | open — text under "Open" |

## Decisions

| Decision | Date |
|---|---|
| The sender is a Nitro app in `workers/sender/` with its own `wrangler.toml`; one root `package.json`; shared platform values in `workers/common/cloudflare.ts` | 2026-09-16 |
| The app renders complete messages and the sender transports them. The sender owns the contract and the app re-exports it through `useNotificationValidation`; one message is one delivery; `meta.kind` is app-owned | 2026-09-16 |
| E-mail through Cloudflare Email Service (`send_email` binding); Resend is the documented fallback behind the `EmailProvider` port | 2026-08-31 |
| Retries at 30/60/120 s; the fourth failed attempt logs an error with the masked recipient and acknowledges; the logs are the failure record | 2026-09-16 |
| Sender and recipient limits live on the `send_email` binding: sender `no-reply.<environment>@skraaningen.dk` (`no-reply@` on prod); dev delivers to the dev test mailbox | 2026-09-16 |
| Environment and site come from `DEPLOY_URL` (locally from the request origin); the sender address and display name from the environment; Reply-To is the admin mailbox; the accountant and admin mailboxes are worker secrets | 2026-09-17 |
| One template per kind in `app/config/notificationTemplates.ts`; built-ins `senderName`, `site`, `environment`, `dedupeKey`; the signature names the sending site | 2026-09-18 |
| Every trigger is a function in `server/utils/sender/events/<event>.ts` with an HTTP twin `POST /api/admin/sender/event/<event>` and a Make target `theslope-sender-event-<event>-<env>` | 2026-09-16 |
| Monthly billing converges every closed period (ADR-015): `BillingPeriodSummary.version`, delivery facts in `Delivery`, one R2 object per version; the app counts a mail as sent once it is on the queue | 2026-09-18 |
| Migration `0015` marks the periods closed before 2026-09-17 as mailed at v1; the first run archives their CSVs | 2026-09-17 |
| Local runs every binding in miniflare; dev and prod use their own resources; Make targets call the deployed app through `BASE_URL` from `.env.<env>` | 2026-09-16 |
| CI steps are Make targets; `make deploy-<env>` deploys the sender before the app | 2026-09-16 |
| SMS: the contract channel, the `SmsProvider` port and a stub that acknowledges; the gateway adapter is in `feature-proposal-notification-triggers.md` | 2026-09-16 |

## Platform facts (Cloudflare docs, 2026-09-16)

Queues: a message ≤128 KB, `sendBatch` ≤100 messages / 256 KB, `delaySeconds` ≤24 h, retention ≤14 days; a batch is acknowledged
once `queue()` returns and every `waitUntil()` promise resolves. Email Service (public beta since April 2026): `send()` returns
`{messageId}`, ≤5 MiB and ≤32 attachments per mail, attachment `content` as bytes (a string is sent as the file's text);
`E_RATE_LIMIT_EXCEEDED`, `E_DAILY_LIMIT_EXCEEDED` and `E_INTERNAL_SERVER_ERROR` are retryable, every other `E_*` code is terminal.
`workers/sender/utils/providers/cloudflareEmail.ts` is the one module that calls it.

## Costs

| Item | Cost |
|---|---|
| Workers Paid (Queues, Email Service) | $5 a month, active |
| Queues | 1M operations a month included, then $0.40 per million |
| Email Service | 3,000 mails a month included, then $0.35 per 1,000 |
| R2 | 10 GB-month included |

## Open

### ADRs

Both go into `docs/adr.md` under the next free numbers.

**[Additional workers are Nitro apps under `workers/<name>`; the sender owns a versioned queue contract]**
- Context: a second Cloudflare worker, the queue consumer, shares the app's engine, versions and toolchain, and the Nuxt app
  stays at the repository root.
- Decision: every additional worker is a Nitro app in `workers/<name>/` (`nitro.config.ts` from `workers/common/cloudflare.ts`,
  its own `wrangler.toml` next to its code); one root `package.json`; platform constants in `workers/common/cloudflare.ts`; Make
  is the per-worker entry point and `make deploy-<env>` deploys every worker, consumers first. The sender owns a versioned zod
  contract (`v`, app-owned `meta.kind`, one message = one delivery) that the app re-exports through a validation composable; the
  app renders, the sender transports. An admin sets runtime secrets with `wrangler secret put`. Logs follow ADR-004 with masked
  recipients; the last attempt logs an error and acknowledges.
- Compliance: a worker imports from `workers/common/` and its own tree; the app imports `workers/sender/contract.ts` from the
  sender; `utils/` modules import explicitly (ADR-017); `consumeBatch` acknowledges or retries every message of a batch; every
  worker has `[observability] enabled`.

**[Side effects of a scheduled job converge: a content version on the aggregate, delivery facts, one archive object per version]**
- Context: the accountant CSV needs a durable copy and a mail for every content change; the next run redoes a failed put or
  send, and a second run leaves the end state as it is.
- Decision: the aggregate carries `version`, bumped when its content changes; each side effect done is a `Delivery` row
  (`subjectType`, `subjectId`, `version`, `kind`, `reference`, `jobRunId`); a run redoes a kind whose highest delivered version is
  behind; archive keys carry the version (`billing/YYYY-MM/pbs-opgoerelse-YYYY-MM-v<n>.csv`); bindings arrive as parameters and a
  side effect returns an operation result (ADR-009), so billing completes independently of it (ADR-015).

### Prod release

The human checks in the PR #166 description: `make d1-migrate-prod` (parent-link counts equal before and after), the prod mailbox
secrets, `make deploy-prod`, `make theslope-sender-event-test-prod`, and the first monthly run, which mails the accountant the
period 18/08/2026–17/09/2026.
