# ADR Compliance - Backend

**Generated:** 2025-01-09
**Last Updated:** 2026-10-25
**History:** git and the feature plans under `docs/features/` (shipped plans in `docs/features/archived/`)

One row per endpoint and per server module an ADR names, with its markers and its API spec. The handler, its repository
function and the spec hold the detail; a row names a gap in a few words.

## Legend

| Column | ✅ means |
|---|---|
| Return type | an explicit `Promise<Type>` with the type from a validation composable (ADR-001, ADR-009) |
| Validation | params, body and query read through `getValidatedRouterParams`, `readValidatedBody`, `getValidatedQuery` (ADR-002) |
| Repository | the repository function parses its result with the schema (ADR-010) |
| E2E | an API spec under `tests/e2e/api/` or a scenario under `tests/e2e/features/` exercises it (ADR-003) |

⚠️ partial, the gap named in Status · ❌ non-compliant · ❓ not audited · N/A not applicable

## Endpoints

| Endpoint | Return type | Validation | Repository | E2E | Status |
|---|---|---|---|---|---|
| **Orders** | | | | | |
| `/api/order/index.get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ the sort from `OrderSortBySchema` |
| `/api/order/[id].get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/order/waitlist.get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `server/utils/waitlistAssignment.ts` | ✅ | N/A | ✅ | ✅ serial; recovery unit | ✅ `joinWaitlist` joins a household's claims on a dinner as one batch, idempotent on a later run; a placement grabs, writes, records and removes; the recovery settles a grab past `waitlistPlacingLeaseMinutes` and reports the sale or extra portion it finishes |
| `server/utils/sender/events/waitlist.ts` | ✅ | N/A | ✅ | ✅ serial; unit | ✅ the booking status sender event: a notification about an inhabitant goes to the closest user (`findClosestUserInHousehold`, `records.ts`), the buildup to the closest user of the dinner's chef; `sendNotifications` sends the notifications of the dinners past their booking deadline as they stand, through `deliverDesired`; the dinners, people, households and logins read once per kind |
| `server/utils/sender/deliveries.ts` | ✅ | N/A | ✅ | unit | ✅ `deliverDesired`, the delivery step every sender event shares: the recorded rows read once per subject type (ADR-014), one emit, one write of the Delivery rows; a delivery goes to a user or to a configured mailbox; `deliverInBackground` runs a sender event after the response |
| `server/utils/sender/events/monthly-billing.ts` | ✅ | N/A | ✅ | unit | ✅ the monthly billing sender event: `notificationsForAccountant`, a period's current version to the accountant's mailbox, cc the admin mailbox, the CSV attached; a missing accountant mailbox is an error line; sent through `deliverDesired` by the monthly run and the re-send |
| `server/utils/sender/events/chef-deadlines.ts` | ✅ | N/A | ✅ | unit | ✅ the chef deadlines sender event (`sendChefDeadlines`): one notice a dinner a night to the chef's closest user while an alarm of the chef page (`getChefDeadlines`) is yellow, red or overdue, through `deliverDesired`; the active season's dinners and chefs read once |
| `server/utils/sender/records.ts` | ✅ | N/A | ✅ | unit, through the sender events | ✅ the people reads every sender event shares (`readPeople`, `readNamed`) and `findClosestUserInHousehold` |
| `server/data/waitlistRepository.ts` | ✅ | N/A | ✅ | ✅ | ✅ a leave or a change of an entry a run holds or has placed answers 409; `createWaitlistEntries` writes the entries and their QUEUE rows in two bulk writes |
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
| `/api/admin/team/assignment/[id].delete.ts` | ✅ | ✅ | ✅ | ✅ | ✅ returns the deleted id |
| **Admin - users** | | | | | |
| `/api/admin/users/index.get.ts` | ✅ | ⚠️ | ✅ | ✅ | ⚠️ raw query read; deserializes through the typed schemas |
| `/api/admin/users/index.put.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/users/[id].post.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/users/[id].delete.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/users/by-role/[role].get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ deserializes through the typed schemas |
| **Admin - households** | | | | | |
| `/api/admin/household/index.get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ deserializes through the typed schemas |
| `/api/admin/household/index.put.ts` | ✅ | ✅ | ✅ | ✅ | ✅ deserializes through the typed schemas |
| `/api/admin/household/[id].get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ deserializes through the typed schemas |
| `/api/admin/household/[id].delete.ts` | ✅ | ✅ | ✅ | ✅ | ✅ deserializes through the typed schemas |
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
| `/api/admin/season/active.post.ts` | ✅ | ✅ | ❓ | ✅ | ❓ audit needed; the activation's scaffold drops cancelled and consumed dinners |
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
| `/api/admin/maintenance/daily.post.ts` | ✅ | ⚠️ | ❓ | ✅ serial | ⚠️ raw body read; the scaffold step drops cancelled and consumed dinners; the run sends the notifications of the dinners (`sendNotifications`) and then the chef deadlines (`sendChefDeadlines`), counted per sender event in `notifications` (`BOOKING_STATUS`, `CHEF_DEADLINES`) |
| `/api/admin/maintenance/monthly.post.ts` | ✅ | ⚠️ | ✅ | ✅ serial | ⚠️ raw body read |
| `/api/admin/maintenance/job-run/index.get.ts` | ✅ | ✅ | ❓ | ❓ | ❓ audit needed |
| `/api/admin/maintenance/job-run/[id].get.ts` | ✅ | ✅ | ❓ | ❓ | ❓ audit needed |
| `/api/admin/heynabo/import.get.ts` | ✅ | ⚠️ | ✅ | ✅ serial | ⚠️ raw query read |
| **Admin - sender events** | | | | | |
| `/api/admin/sender/event/test.post.ts` | ✅ | N/A | N/A | ✅ | ✅ batched, 100 per call |
| `/api/admin/sender/event/monthly-billing.post.ts` | ✅ | ✅ | ✅ | ✅ `billing-notifications.feature`; unit | ✅ the admin's re-send of a period's accountant notification through `deliverDesired` as the admin's override, logged with the admin |
| `/api/admin/sender/delivery.get.ts` | ✅ | ✅ | ✅ | ✅ `delivery-records.feature`, `booking-notifications.feature` | ✅ the Delivery rows of the subjects in `subjectType=` and `subjectIds=`; `dryRun=BOOKING_STATUS` is the delivery dry run: per user what the DAILY_MAINTENANCE job sends, empty with no active season, an error with email off; every member reads (ADR-004) |
| **Household** | | | | | |
| `/api/household/[id]/update.post.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/household/inhabitants/[id]/preferences.get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ the save's dry run on the draft in `dinnerPreferences=` (`serializeWeekDayMap`); any member reads any household's (ADR-004) |
| `/api/household/inhabitants/[id]/preferences.post.ts` | ✅ | ✅ | ✅ | ⚠️ | ⚠️ a save runs on the weekdays its draft changes, its dry run is the GET; past the deadline the path buys or queues (One intent path); `preferences.e2e` green in CI 2026-10-19 (8ed7e42) |
| `/api/household/order/scaffold.get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ the save's dry run on the draft in `orders=` (`DesiredOrderQuerySchema`, a month's draft under 16 KB); no orders answers the household's next run on the season's deadlines (One intent path); `bypassDeadlines=true` lifts the deadlines for an admin only; any member reads any household's (ADR-004) |
| `/api/household/order/scaffold.post.ts` | ✅ | ✅ | ✅ | ⚠️ | ✅ a save naming an order since bought by another household lists it in `failed` (`scaffoldPrebookings.unit.spec.ts:314`). Its dry run is the GET; `?adminBypass=true` from an admin writes the run's history rows with the source `admin-correction`; the run drops cancelled and consumed dinners; `scaffold.e2e` green in CI 2026-10-19 (8ed7e42); a ticket of 0 portions past the deadline: `features/booking/booking.feature` |
| `/api/household/allergy/index.get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/household/allergy/index.put.ts` | ✅ | ✅ | ✅ | ✅ | ✅ the inhabitant's household changes it; `?adminBypass=true` from an admin or the allergy manager (`requireHouseholdAccess`, ADR-004) |
| `/api/household/allergy/[id].get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/household/allergy/[id].post.ts` | ✅ | ✅ | ✅ | ✅ | ✅ the allergy's household changes it; `?adminBypass=true` from an admin or the allergy manager (`requireHouseholdAccess`, ADR-004) |
| `/api/household/allergy/[id].delete.ts` | ✅ | ✅ | ✅ | ✅ | ✅ the allergy's household removes it; `?adminBypass=true` from an admin or the allergy manager (`requireHouseholdAccess`, ADR-004) |
| **Chef** | | | | | |
| `/api/chef/dinner/[id].post.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/chef/dinner/[id]/expenses/index.get.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/chef/dinner/[id]/expenses/index.put.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/chef/dinner/[id]/expenses/[expenseId].delete.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/chef/dinner/[id]/order-history.get.ts` | ✅ | ✅ | ✅ | ⚠️ | ⚠️ a line names its actor (`performedByName`, from the history read's performer select with the inhabitant's name); an admin's correction carries its reason from the row's source (`admin-correction`), a row without a source that deletes after the booking deadline by inference; the buyers' households come from `fetchHouseholdsByInhabitantIds`; the reads go one after another (ADR-014); the audit rows read through `readOrderAudit`, "?" for a ticket it cannot attribute (One audit format); `orderHistory` e2e green in CI 2026-10-19 (8ed7e42) |
| `/api/chef/dinner/[id]/extra-portions.post.ts` | ✅ | ✅ | ✅ | ✅ serial | ✅ |
| **Teams** | | | | | |
| `/api/team/my.get.ts` | ✅ | N/A | ✅ | ✅ | ✅ |
| `/api/team/cooking/[id]/assign-role.post.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/team/cooking/[id]/remove-role.post.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **User** | | | | | |
| `/api/user/preferences.post.ts` | ✅ | ✅ | ✅ | ✅ | ✅ the booking mails honour the saved `notificationChannels`; after the user's creation this save is the one write of `notificationChannels` and `appearance` |
| `/api/user/notifications/test.post.ts` | ✅ | N/A | N/A | ✅ | ✅ batched, 100 per call |
| **Public** | | | | | |
| `/api/public/billing/[token]/index.get.ts` | ✅ | ✅ | ❓ | ✅ ui | ❓ audit needed |
| `/api/public/billing/[token]/csv.get.ts` | ✅ | ✅ | ❓ | ✅ ui | ❓ audit needed |
| `/api/public/health.get.ts` | ❌ | N/A | N/A | N/A | ⚠️ no return type |
| **Other** | | | | | |
| `/api/auth/login.post.ts` | ❌ | ✅ | N/A | ✅ | ⚠️ no return type |
| `/api/billing/index.get.ts` | ✅ | ✅ | ❓ | ✅ | ❓ audit needed |
| `/api/calendar/index.get.ts` | ❌ | ⚠️ | ❓ | ❌ | ❌ raw query read, no spec |
| `/api/calendar/feed.ts` | ✅ | N/A | ❓ | ❌ | ⚠️ no spec |
| `/api/feedback.post.ts` | ✅ | ✅ | N/A | ❌ | ⚠️ spec owed: 401 without a session, 400 on an invalid body |
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
