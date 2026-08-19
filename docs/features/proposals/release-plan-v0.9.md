# Release Plan: v0.9 — Bugs, Consistency, Observability & Billing/Swap/Waitlist Features

**Status:** Draft
**Date:** 2026-08-19
**Current version:** 0.8.2 (main @ `1bc6798`)

## Where We Are

### Shipped since spring

| PR | Feature |
|----|---------|
| #88 | Orders only scaffolded after move-in and until move-out (residency-scoped scaffolding) |
| #106 | Admin can create adjustments; multiple households can coexist on one address |
| #112 | Chef swap — volunteer/claim/resign the chef role on a dinner |
| #122 | Team swap — swap team assignments between members |
| #125 | Single chef-action entry point + `pre:all` CI gate |

### In flight (uncommitted on `feature/ad-hoc-transactions`, which is at the same commit as `main`)

| Item | State |
|------|-------|
| `app/stores/plan.ts` — refresh-ordering fix (chef page stale detail after role change) | Working tree, ready to test + commit |
| `docs/features/bug-fix-booking-desired-order-builder.md` — root-caused grid-save bug + TDD plan | Doc done, implementation not started |
| Chef screenshots (role-assigned/role-wanted) | Regenerated |

---

## 1. Bugs (P0 — fix before feature work)

Analysis, root causes, and TDD steps live in the detail docs — this table is the index.

| # | Bug | Status | Detail doc | Effort |
|---|-----|--------|------------|--------|
| B1 | Grid booking save shows "fejlede" despite 200s; day view works | ✅ Root-caused | [bug-fix-booking-desired-order-builder.md](../bug-fix-booking-desired-order-builder.md) | M |
| B2 | Inhabitant deleted on Heynabo survives in TheSlope (appears in allergy views) — rule: inhabitants follow Heynabo, households preserved | ✅ Root-caused + decisions made | [bug-fix-plan-v0.9.md](../bug-fix-plan-v0.9.md) | M–L |
| B3 | `/admin/allergies` intermittently shows no data | ✅ Root-caused (SSR-fragile store fetch) | [bug-fix-plan-v0.9.md](../bug-fix-plan-v0.9.md) | S–M |
| B4 | Errors editing allergies in `/admin/allergies` | 🔎 Repro first; likely same store as B3 | [bug-fix-plan-v0.9.md](../bug-fix-plan-v0.9.md) | S |
| B5 | Errors adding holidays to a new season | 🔎 Repro first; suspects ranked | [bug-fix-plan-v0.9.md](../bug-fix-plan-v0.9.md) | S–M |
| B6 | Kitchen stats show 0 portions when `ticketPriceId` is null | ✅ Root-caused | [bug-fix-order-snapshot.md](../bug-fix-order-snapshot.md) | S |

**Approach:** see [bug-fix-plan-v0.9.md](../bug-fix-plan-v0.9.md) — TDD per ADR-003, one branch, per-bug commits, and a DRY mandate: every fix removes the duplicated logic that caused it.

---

## 2. Improvements / Code Quality (P1 — land before big features)

| # | Improvement | Why now | Effort |
|---|-------------|---------|--------|
| I1 | **SSR-safe data loading sweep** — replace bare `$fetch` with `useRequestFetch`, kill the page-level `useAsyncData`-wrapping-store anti-pattern, one canonical loading-state pattern (proposal exists: `proposals/bare-fetch-fix.md`). Known symptoms it fixes: admin economy not loading past periods, chef page transient hydration issues, likely B3 | New features (waitlist, ad-hoc UI) build on these stores — fix the foundation first | M |
| I2 | **DRY sweep of stores + data loading** — the 7 stores implement ADR-007 with drift (e.g., `allergies.ts` alone mixes `useFetch`/`useAsyncData`/`$fetch`; repeated status-computed boilerplate). Extract a shared store-fetch helper or at minimum align every store to one reference pattern (`plan.ts`); audit `event.ts` + `tickets.ts` (still ❓ in compliance doc) | Same as I1; also cuts the copy-paste class of bugs the release is fixing | M |
| I3 | **`Order` uniqueness** — add `@@unique([inhabitantId, dinnerEventId])` guard against duplicate regular orders + backfill/dedup migration (flagged out-of-scope in the B1 doc; without it the bug class returns) | Companion hardening to B1 | S–M |
| I4 | **Observability baseline — stop driving blind.** Today the only signals are `console.*` logs (ADR-004) and the JobRun history panel. Add: Workers observability enabled in `wrangler.toml` (structured log retention + querying), error alerting on 5xx rates and failed jobs (Cloudflare notifications or a lightweight error tracker), a `/api/health` endpoint wired to an uptime monitor, and job-failure alerts to admins (email — first consumer of F4 infra once it lands, Cloudflare notification until then). Document in `ops-runbook.md` | Debugging B3/B4-class "sometimes fails" bugs and operating billing/notifications safely requires seeing prod. Cheap to add, pays off in every later milestone | M |
| I5 | **Compliance docs refresh** — update backend/frontend ADR-compliance tables as B/I items land (per CLAUDE.md) | Continuous | S |

---

## 3. Features (P2 — in priority order)

### F1. Ad-hoc transactions ⭐ most important
- **Proposal:** ✅ ready — `feature-proposal-adhoc-admin-billing.md` (phases 1–5 defined: schema/serialization → endpoints + billing pipeline → read path → admin UI → ADR-011 supplement)
- **Next step:** sign off the proposal, then implement phase-by-phase on this branch (`feature/ad-hoc-transactions`)
- **Effort:** L (5 phases, includes Transaction migration + snapshot-union rewrite)

### F2. Accountant mail + offline billing archive
- **Proposal:** ❌ needs writing (`feature-proposal-billing-archive.md`). When monthly billing runs:
  1. Generate the billing CSV (exists today as manual export) and **store an offline copy in Cloudflare R2** (immutable, per-period key, e.g. `billing/2026-08/invoices.csv`)
  2. **Email the external accountant** automatically — period summary + CSV attached (or magic link), single fixed recipient from runtime config
  3. Idempotent per billing period (ADR-015): re-running billing re-uses/overwrites the archive, doesn't re-spam the accountant
- **Dependency:** first real consumer of F3 email infra — small, one recipient, monthly cadence: the ideal proving ground before user-facing notifications
- **Related:** narrows `feature-proposal-backup-export.md` to the billing slice; full-data backup stays out of scope
- **Effort:** M (R2 binding + archive step + one mail template)

### F3. Email notifications (SMS later)
- **Proposal:** ❌ needs writing (`feature-proposal-notifications.md`). No messaging infrastructure exists today. Scope for the proposal:
  - Provider choice compatible with Cloudflare Workers (e.g., Resend / MailChannels / SES via API), secrets via runtime config
  - `Notification`/outbox model + idempotent send job (ADR-015 pattern), opt-out per user
  - Trigger catalog v1: **accountant billing mail (F2)** and **job-failure alerts (I4)** first (admin-facing, low volume), then waitlist ticket available (F4), duty/chef swap + sign-off (F5 — its proposal explicitly deferred notifications), dinner announced/cancelled
  - Danish templates; SMS explicitly deferred to a later release (same outbox, different channel)
- **Effort:** M (infra + 2–3 triggers)

### F4. Waitlist (released-ticket claim)
- **Proposal:** ❌ needs writing (`feature-proposal-waitlist.md`). Backend exists (`/api/order/claim` — FIFO by `releasedAt`, retry, audit) and claim detection is partially wired in `GuestBookingForm`/`DinnerBookingForm`. Missing: a first-class UI surfacing released tickets ("N ledige billetter"), an explicit claim flow in day + grid views, and a *subscribe-and-notify* waitlist ("tell me when a ticket frees up") — the latter depends on F3
- **Next step:** write proposal; ship claim-UI part independently of notify part
- **Effort:** M (claim UI) + M (subscription/notify, after F3)

### F5. Work shift swapping (duty roster + cross-team swap)
- **Proposal:** ✅ draft — `feature-proposal-duty-roster.md` (models `DinnerDutyTemplate`/`DinnerDuty`/`DutyHistory`, audit timeline, chef sign-off, cross-team swap). Builds on shipped chef-swap.
- **Next step:** review draft → accept; split delivery: **F5a** templates + roster + audit trail, **F5b** cross-team swap + sign-off UI (+ swap notifications via F3)
- **Effort:** XL (largest item in the release)

**Dependency chain:** F3 (email infra) enables F2 (accountant mail), F4 (waitlist notify) and F5b (swap notifications). Recommended build order: F1 → F3 → F2 → F4 → F5.

---

## 4. Milestones — Small Incremental Deployments

**Release process:** one branch per milestone, merged to `main` via PR and deployed immediately — no big-bang release. Each milestone leaves `main` shippable; version bumps at the marked cuts.

| Milestone | Branch | Content | Version |
|-----------|--------|---------|---------|
| M0 | `fix/bug-sprint-heynabo-allergies-holidays` | Ship in-flight work: plan.ts chef-refresh fix (B0) + B1 + B2 | 0.8.3 |
| M1 | `fix/bug-sprint-allergies-holidays` | B3/B4, B5, B6 (+ I3 hardening) | 0.8.4 |
| M2 | `refactor/store-fetch-consistency` | I1 + I2 consistency sweep (+ I5 docs) | 0.8.5 |
| M3 | `feature/observability-baseline` | I4: Workers observability, health endpoint, error + job-failure alerting | 0.8.6 |
| M4 | `feature/ad-hoc-transactions` | F1 ad-hoc transactions, phased per proposal | **0.9.0** 🚀 |
| M5 | `feature/email-notifications` | F3 email infra (outbox + provider + admin triggers) | 0.9.1 |
| M6 | `feature/billing-archive` | F2 accountant mail + R2 billing CSV archive | 0.9.2 |
| M7 | `feature/waitlist` | F4 claim UI, then subscribe-and-notify | 0.9.3 |
| M8 | `feature/duty-roster` | F5a roster + audit, then F5b cross-team swap | **0.10.0** |

Rationale for the ordering: bugs and the consistency sweep de-risk everything after them; observability lands before the billing/notification features so their first production runs are visible; ad-hoc transactions is the highest-value standalone feature and names the current branch; email infra precedes its three consumers (accountant mail, waitlist notify, swap notify); duty roster is big enough to headline its own release.

## 5. Proposal Work Queue

| Proposal | Status | Action |
|----------|--------|--------|
| `feature-proposal-adhoc-admin-billing.md` | Proposal | Review + sign-off (Phase 0) |
| `feature-proposal-duty-roster.md` | Draft | Review, split into F5a/F5b |
| `bug-fix-plan-v0.9.md` | Accepted | Implement M1 bug sprint (B2–B5) |
| `bug-fix-booking-desired-order-builder.md` | Done (uncommitted) | Commit + implement (B1) |
| `bug-fix-order-snapshot.md` | Done | Implement (B6) |
| `proposals/bare-fetch-fix.md` | Notes | Expand into I1/I2 workplan |
| `feature-proposal-notifications.md` | Missing | Write (F3) |
| `feature-proposal-billing-archive.md` | Missing | Write (F2, references backup-export proposal) |
| `feature-proposal-waitlist.md` | Missing | Write (F4) |
| `proposals/guest-booking-form.md` | Notes | Fold into F4 claim-UI work or archive |

## Out of Scope (this cycle)

- SMS channel (after email infra proves out)
- Full-data backup/export (`feature-proposal-backup-export.md`) — only the billing CSV slice ships (F2)
- PBS direct export, chef budget view
- Two-sided swap consent flow (duty roster keeps one-sided commit per its draft)
- Observability beyond baseline (dashboards, tracing) — revisit after M3 shows what's missing
