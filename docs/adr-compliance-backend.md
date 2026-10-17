# ADR Compliance - Backend

**Generated:** 2025-01-09
**Last Updated:** 2026-10-15
**History:** git and the feature plans under `docs/features/` (shipped plans in `docs/features/archived/`)

One row per endpoint and per server module an ADR names, with its markers and its API spec. The handler, its repository
function and the spec hold the detail; a row names a gap in a few words.

## Legend

| Column | ✅ means |
|---|---|
| Return type | an explicit `Promise<Type>` with the type from a validation composable (ADR-001, ADR-009) |
| Validation | params, body and query read through `getValidatedRouterParams`, `readValidatedBody`, `getValidatedQuery` (ADR-002) |
| Repository | the repository function parses its result with the schema (ADR-010) |
| E2E | an API spec under `tests/e2e/api/` exercises it (ADR-003) |

⚠️ partial, the gap named in Status · ❌ non-compliant · ❓ not audited · N/A not applicable

## Endpoints

| Endpoint | Return type | Validation | Repository | E2E | Status |
|---|---|---|---|---|---|
| **Orders** | | | | | |
| `/api/order/index.get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/order/[id].get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/order/waitlist.get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Admin - dinner events** | | | | | |
| `/api/admin/dinner-event/index.get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/dinner-event/index.put.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/dinner-event/[id].get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/dinner-event/[id].delete.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Admin - teams** | | | | | |
| `/api/admin/team/index.get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/team/index.put.ts` | ✅ | ⚠️ | ✅ | ✅ | ⚠️ raw body read beside the validated one |
| `/api/admin/team/[id].get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/team/[id].post.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/team/[id].delete.ts` | ✅ | ✅ | ✅ | ✅ | ✅ returns the deleted id |
| `/api/admin/team/[id]/joker-slot/index.put.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/team/[id]/joker-slot/[slotId].delete.ts` | ✅ | ✅ | ✅ | ✅ | ✅ returns the deleted id |
| `/api/admin/team/assignment/index.get.ts` | ❌ | N/A | N/A | N/A | ❌ stub |
| `/api/admin/team/assignment/index.put.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/team/assignment/[id].get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/team/assignment/[id].post.ts` | ✅ | ✅ | ✅ | ⚠️ | ⚠️ spec written, not run |
| `/api/admin/team/assignment/[id].delete.ts` | ⚠️ | ✅ | ✅ | ✅ | ⚠️ returns the deleted count for a single delete (ADR-009 r7: the id) |
| **Admin - users** | | | | | |
| `/api/admin/users/index.get.ts` | ✅ | ⚠️ | ✅ | ✅ | ⚠️ raw query read |
| `/api/admin/users/index.put.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/users/[id].post.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/users/[id].delete.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/users/by-role/[role].get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Admin - households** | | | | | |
| `/api/admin/household/index.get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/household/index.put.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/household/[id].get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/household/[id].delete.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/household/inhabitants/index.get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/household/inhabitants/index.put.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/household/inhabitants/[id].get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/household/inhabitants/[id].post.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/household/inhabitants/[id].delete.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Admin - seasons** | | | | | |
| `/api/admin/season/index.get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/season/index.put.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/season/[id].get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/season/[id].post.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/season/[id].delete.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/season/active.get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/season/active.post.ts` | ✅ | ✅ | ❓ | ✅ | ❓ audit needed |
| `/api/admin/season/deactivate.post.ts` | ✅ | N/A | ❓ | ❓ | ❓ audit needed |
| `/api/admin/season/[id]/generate-dinner-events.post.ts` | ✅ | ✅ | ❓ | ✅ | ❓ audit needed |
| `/api/admin/season/[id]/assign-cooking-teams.post.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/season/[id]/assign-team-affinities.post.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/season/[id]/scaffold-prebookings.post.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/season/import.post.ts` | ✅ | ✅ | ✅ | ✅ local | ✅ |
| `server/utils/reconcileDinnerEvents.ts` | ✅ | N/A | ✅ | ✅ unit | ✅ |
| **Admin - allergy types** | | | | | |
| `/api/admin/allergy-type/index.get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/allergy-type/index.put.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/allergy-type/[id].get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/allergy-type/[id].post.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/allergy-type/[id].delete.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Admin - settings** | | | | | |
| `/api/admin/setting/[key].get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/setting/[key].post.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `server/data/settingsRepository.ts` | ✅ | N/A | ✅ | ✅ | ✅ |
| **Admin - billing** | | | | | |
| `/api/admin/billing/current-period.get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/billing/invoices/[id].get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/billing/periods.get.ts` | ✅ | N/A | ❓ | ✅ | ❓ audit needed |
| `/api/admin/billing/periods/[id].get.ts` | ✅ | ✅ | ❓ | ✅ | ❓ audit needed |
| `/api/admin/billing/import.post.ts` | ✅ | ✅ | ✅ | ⚠️ | ⚠️ spec skipped, import replaced |
| **Admin - maintenance and jobs** | | | | | |
| `/api/admin/maintenance/daily.post.ts` | ✅ | ⚠️ | ❓ | ✅ serial | ⚠️ raw body read |
| `/api/admin/maintenance/monthly.post.ts` | ✅ | ⚠️ | ✅ | ✅ serial | ⚠️ raw body read |
| `/api/admin/maintenance/job-run/index.get.ts` | ✅ | ✅ | ❓ | ❓ | ❓ audit needed |
| `/api/admin/maintenance/job-run/[id].get.ts` | ✅ | ✅ | ❓ | ❓ | ❓ audit needed |
| `/api/admin/heynabo/import.get.ts` | ✅ | ⚠️ | ✅ | ✅ serial | ⚠️ raw query read |
| **Admin - sender events** | | | | | |
| `/api/admin/sender/event/test.post.ts` | ✅ | N/A | N/A | ✅ | ✅ |
| `/api/admin/sender/event/monthly-billing.post.ts` | ✅ | ✅ | ✅ | ✅ serial | ✅ |
| **Household** | | | | | |
| `/api/household/[id]/update.post.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/household/inhabitants/[id]/preferences.post.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/household/order/scaffold.post.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/household/allergy/index.get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/household/allergy/index.put.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/household/allergy/[id].get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/household/allergy/[id].post.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/household/allergy/[id].delete.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Chef** | | | | | |
| `/api/chef/dinner/[id].post.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/chef/dinner/[id]/expenses/index.get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/chef/dinner/[id]/expenses/index.put.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/chef/dinner/[id]/expenses/[expenseId].delete.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/chef/dinner/[id]/order-history.get.ts` | ✅ | ✅ | ✅ | ⚠️ | ⚠️ spec asserts the reply before ticket events |
| `/api/chef/dinner/[id]/extra-portions.post.ts` | ✅ | ✅ | ✅ | ✅ serial | ✅ |
| **Teams** | | | | | |
| `/api/team/my.get.ts` | ✅ | N/A | ✅ | ✅ | ✅ |
| `/api/team/cooking/[id]/assign-role.post.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/team/cooking/[id]/remove-role.post.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **User** | | | | | |
| `/api/user/preferences.post.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/user/notifications/test.post.ts` | ✅ | N/A | N/A | ✅ | ✅ |
| **Public** | | | | | |
| `/api/public/billing/[token]/index.get.ts` | ✅ | ✅ | ❓ | ✅ ui | ❓ audit needed |
| `/api/public/billing/[token]/csv.get.ts` | ✅ | ✅ | ❓ | ✅ ui | ❓ audit needed |
| `/api/public/health.get.ts` | ❌ | N/A | N/A | N/A | ⚠️ no return type |
| **Other** | | | | | |
| `/api/auth/login.post.ts` | ❌ | ✅ | N/A | ✅ | ⚠️ no return type |
| `/api/billing/index.get.ts` | ✅ | ✅ | ❓ | ✅ | ❓ audit needed |
| `/api/calendar/index.get.ts` | ❌ | ⚠️ | ❓ | ❌ | ❌ raw query read, no spec |
| `/api/calendar/feed.ts` | ✅ | N/A | ❓ | ❌ | ⚠️ no spec |
| `/api/feedback.post.ts` | ✅ | ✅ | N/A | ❌ | ⚠️ no spec |
| `server/integration/github/githubClient.ts` | ✅ | ✅ | N/A | ❌ | ⚠️ no spec |
| `/api/test/heynabo/*` | N/A | N/A | N/A | N/A | N/A test support |
| **Authorization** | | | | | |
| `server/middleware/2.authorize.ts` | N/A | N/A | N/A | ✅ | ✅ |
| `server/utils/authorizationHelper.ts` | N/A | N/A | N/A | ✅ | ✅ |

## Checklist

For a new or changed endpoint:

- [ ] Separate try-catch for validation (400) and business logic (500); 404 and 409 where the ADR names them (ADR-002)
- [ ] Params, body and query through the H3 validated readers with a Zod schema (ADR-002)
- [ ] Explicit `Promise<Type>` return; index endpoints return Display, detail and mutations return Detail, an operation returns its result type (ADR-009)
- [ ] Types from validation composables, enums from the generated layer in server code (ADR-001); a composable the server imports is isomorphic (ADR-017)
- [ ] Serialization in the repository; domain types above it (ADR-010)
- [ ] Deletion through the schema's cascades, one atomic delete (ADR-005)
- [ ] Authorization through `requireRoutePermission`, `requireHouseholdAccess`, `requireChefForDinner` or `requireSettingWriteAccess`
- [ ] Logging per ADR-004: `👨‍💻 > [MODULE] > [METHOD]`, no secrets
- [ ] An API spec under `tests/e2e/api/` with factories and salted data, green (ADR-003); serial when it needs the active season
- [ ] The row above is updated: markers, spec, status

## Reference implementations

| Pattern | File |
|---|---|
| Route param validation, return type, error handling | `/api/admin/allergy-type/[id].get.ts` |
| Delete with validation and cascade | `/api/household/allergy/[id].delete.ts` |
| Household-scoped authorization with admin bypass | `/api/household/order/scaffold.post.ts` |
| Chef endpoint with the Heynabo token pattern (ADR-013) | `/api/chef/dinner/[id].post.ts` |
| Operation result envelope (ADR-009) | `/api/admin/season/[id].post.ts` |
| Repository-only endpoint (ADR-001, ADR-010) | `/api/team/cooking/[id]/assign-role.post.ts` |
| Key-value settings with a code registry | `/api/admin/setting/[key].post.ts`, `server/data/settingsRepository.ts` |
