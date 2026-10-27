# 0.9.1 defects

**Date:** 2026-10-27 | **Specs:** [chores-0.9.1.md](chores-0.9.1.md), [feature-notification-delivery.md](feature-notification-delivery.md)

The DRY and architecture review of the pull request, against `.claude/skills/architecture/SKILL.md` (Code rules),
`.claude/skills/dry/SKILL.md`, `docs/adr.md` and `docs/testing.md`. **Decision** holds the user's choice (fix in this
release, or the release it moves to) with its date; **Verified** holds the date the documentar read the reported fix in
the code and its specs, what the fix does and where to see it; **Signed off** holds the date the user accepts the fix.

## Blocks the release (1)

| # | Defect | Rule | Where | Owner | Decision | Verified | Signed off |
|---|---|---|---|---|---|---|---|
| 22 | A booked ticket reads its person's ticket type of today, and a dinner without a booking is priced at the person's age today; around a birthday the grid and the day view show the wrong type and price | § The grid shows the day view's tickets | `useTicket.ts`, `BookingGridView.vue`, `DinnerBookingForm.vue` | orchestrator | fix in 0.9.1, 2026-10-27 | 2026-10-27: a booked ticket reads its own price row; a dinner without a booking is priced at the person's age on the dinner date. See QA #80, #81 | 2026-10-27 |

## Spec and code (5)

| # | Defect | Rule | Where | Owner | Decision | Verified | Signed off |
|---|---|---|---|---|---|---|---|
| 23 | Six tables keep their open row by position: the users and the household allergies (each with its own copy of the open-row logic), the admin teams, the admin households, the allergy catalog, the inhabitant selector | § Tables key their rows by id | `AdminUsers.vue`, `HouseholdAllergies.vue`, `AdminTeams.vue`, `AdminHouseholds.vue`, `AllergyCatalogTable.vue`, `InhabitantSelector.vue` | orchestrator | fix in 0.9.1, 2026-10-27 | | |
| 24 | The grid's column chip counts the household's released tickets; the day view shows the dinner's supply | ADR-016 compliance 13 | `BookingGridView.vue` | orchestrator | fix in 0.9.1, 2026-10-27: the grid's column chip shows the dinner's supply, the day view's numbers | | |
| 25 | The booking features hold no example rows for a ticket of 0 portions | § Zero-portion tickets get a place | `tests/e2e/features/` | test-engineer | fix in 0.9.1, 2026-10-27 | 2026-10-27: `booking.feature` gains the rule with three rows past the deadline: a 0-portion baby books directly, a baby with portions joins the waiting list, Ingen removes the 0-portion ticket; no ticket goes for sale. bdd 3/3 | 2026-10-27 |
| 26 | The DAILY_MAINTENANCE job's Notifikationer line counts monthly billing and chef deadlines, which the job leaves to their own runs | Code rule 7 | `notificationTemplates.ts`, `useMaintenance.ts`, `useMaintenance.nuxt.spec.ts` | orchestrator, test-engineer | | | |

## Notification delivery (11)

| # | Defect | Rule | Where | Owner | Decision | Verified | Signed off |
|---|---|---|---|---|---|---|---|
| 27 | A booking status run reads the season, its dinners and the dinners' deliveries twice | ADR-014 compliance 5 | `waitlist.ts`, `deliveries.ts` | orchestrator | | | |
| 28 | Monthly billing decides should-send twice, its own rule and then the delivery step's, and reads the deliveries one period at a time | Architecture § One of each; ADR-014 compliance 5 | `monthlyBillingService.ts` | orchestrator | | | |
| 29 | A dry run writes the sent-twice log line, which the `delivery: sent twice` dashboard counts | Code rule 5 | `deliveries.ts` | orchestrator | | | |
| 30 | E-mail off logs a warning outside the `app: not queued` dashboard query | Code rule 8; § Diagnostics | `deliveries.ts`, `docs/ops-runbook.md` | orchestrator | | | |
| 31 | The delivery dry run reads the season before it checks the e-mail channel, and with e-mail off answers 500 without the missing setting | Code rule 4 | `delivery.get.ts` | orchestrator | | | |
| 32 | "Nothing sent" is a result written in four places: the booking emails flag, the channel off, monthly billing's channel check, the job's empty result | Code rule 2 | `waitlist.ts`, `deliveries.ts`, `monthlyBillingService.ts`, `dailyMaintenanceService.ts` | orchestrator | | | |
| 33 | A dinner's buildup version counts the dinner's deliveries of every notification | § Versions | `waitlist.ts` | orchestrator | | | |
| 34 | The composer takes the notification kind as a string for one spec case; the test message's kind and the e-mail channel are string literals | Code rules 1, 6 | `compose.ts`, `test.ts`, `emit.ts` | orchestrator | | | |
| 35 | `jobRunId` is an option no caller passes; the options are `Pick` types | Code rule 1; domain types | `waitlist.ts`, `monthlyBillingService.ts` | orchestrator | | | |
| 36 | The background booking notification call is copied at eight routes | DRY | the seven booking routes, the chef's extra portions | orchestrator | | | |
| 37 | Each delivery scans the recorded deliveries twice and spells its identity in two places; the dinner link builds its date by hand | Code rule 3; DRY | `deliveries.ts`, `useDeliveryValidation.ts`, `useBooking.ts` (`buildDinnerUrl`) | orchestrator | | | |

## Booking views (15)

| # | Defect | Rule | Where | Owner | Decision | Verified | Signed off |
|---|---|---|---|---|---|---|---|
| 38 | The grid compares the view with a string; the grid and the day view name their row types in two unions | Code rule 6 | `BookingGridView.vue`, `DinnerBookingForm.vue` | orchestrator | fix in 0.9.1, 2026-10-27 | 2026-10-27: the grid and the day view read their row types from one enum beside the view enum, and the grid compares the view by its enum member. See /household/&lt;S&gt;/bookings: the day, week and month views and the add-guest row work as before | |
| 39 | "Gæst af" is written three times, and "Opdater" beside its booking word | ADR-017 compliance 6 | `BookingGridView.vue`, `DinnerBookingForm.vue` | orchestrator | fix in 0.9.1, 2026-10-27 | 2026-10-27: "Gæst", "Gæst af" and the grid's save button read from `bookingWords.ts`, as the day view does. See the guest rows on /dinner and in the week grid, and the grid's save button | |
| 40 | The booking context (residency, zero portions, deadlines) is built in three views | DRY | `BookingGridView.vue`, `DinnerBookingForm.vue`, `GuestBookingForm.vue` | orchestrator | fix in 0.9.1, 2026-10-27 | 2026-10-27: `bookingContextOf` in `useBooking.ts` builds the residency, the deadlines and the 0-portion tickets once; the day view and the grid build their context with it, and the guest form takes it from its parent. See /dinner and the week grid: the modes offered and the add-guest choices are as before | |
| 41 | A price row's presentation is built in three places, and the price lookups repeat the waiting list's | DRY | `BookingGridView.vue`, `DinnerBookingForm.vue`, `scaffoldPrebookings.ts`, `useWaitlist.ts` | orchestrator | fix in 0.9.1, 2026-10-27 | 2026-10-27: one price lookup by id (`findTicketPriceById` in `useTicket.ts`) for the views, the waiting list, the scaffold, the waiting-list mails and the order history; one price presentation (`ticketPricePresentation` in `useBookingUi.ts`) for the grid and the day view. No rendering change: the ticket badges on /dinner and in the week grid read as before | |
| 42 | The day view writes the released-or-provenance badge twice | DRY | `DinnerBookingForm.vue` | orchestrator | fix in 0.9.1, 2026-10-27 | 2026-10-27: each row builds one state badge (released, bought from a household, a place in line) and the day view renders it once. See QA #9, #76 | |
| 43 | A person's ticket counts take every order, filter inside and count the released tickets by hand | Code rule 3 | `useBooking.ts` (`personTicketCounts`) | orchestrator | fix in 0.9.1, 2026-10-27 | 2026-10-27: `personTicketCounts` moves to `useOrder.ts` beside `getReleasedOrders`; the grid hands it the person's own cells, and it counts the released tickets through `getReleasedOrders`. No rendering change: the name cell counts in the week grid read as before | |
| 44 | Three exports have no reader outside their spec: the expanded row id, the guest tickets label, the default ticket price data | DRY step 5 | `useExpandableRow.ts`, `useBookingUi.ts`, `ticketFactory.ts` | orchestrator, test-engineer | fix in 0.9.1, 2026-10-27 | 2026-10-27: the three exports are gone: `useExpandableRow` returns the open rows only, the guest tickets label is private to the preview lines, and the default ticket prices are a constant of `season.ts` that `TicketFactory` reads through `SEASON_CONFIG`. No rendering change | |
| 45 | The power save button binds an empty object in place of a button token | ADR-018 | `DinnerBookingForm.vue` | orchestrator | fix in 0.9.1, 2026-10-27 | | |
| 46 | The guest form's draft type restates its form schema's count, ticket price and allergies; its mode stays its own, since the draft holds Ingen while the form tries each mode | Domain types | `GuestBookingForm.vue` | orchestrator | fix in 0.9.1, 2026-10-27 | 2026-10-27, as built: the draft and the form state are typed from the form schema's type (`Omit` over `GuestBookingFormData`), local to the form; the draft's mode holds Ingen while the form tries each mode. No rendering change | |
| 47 | Two guards cover states the grid cannot reach; the count test ids repeat on each price row of a person | Code rule 7; test ids | `BookingGridView.vue` | orchestrator | fix in 0.9.1, 2026-10-27 | 2026-10-27: the four guards on states the grid cannot reach are gone, and the count test ids carry the row (`<row id>-ticket-count`, `-released-count`, `-waitlist-count`), so each price row of a person has its own. No rendering change | |
| 72 | The grid works out the household's residency once at setup; a household switch keeps the first household's residency | ADR-007 compliance 10 | `BookingGridView.vue` | orchestrator | fix in 0.9.1, 2026-10-26 | 2026-10-27: the grid reads the residency of the household on view, so a household switch shows the new household's. See /household/&lt;S&gt;/bookings, switch to a household that moved in or out within the week: its columns and the residency alert follow | |
| 73 | DeadlineBadge carries two raw classes | ADR-018 | `DeadlineBadge.vue` | orchestrator | fix in 0.9.1, 2026-10-27 | 2026-10-27: the badge binds the design system's deadline badge tokens. See /dinner: the deadline badges look as before | |
| 74 | 79 `Pick` types in 21 files take parts of a domain type; 16 of them in files this pull request changes (`SavedRow` in `DinnerBookingForm.vue`, 12 in `useBookingUi.ts`, 3 in the waiting-list sender event). `ticketStateOf` takes a `Pick` because it reads both a desired order and a booked one | Domain types | `DinnerBookingForm.vue`, `useBookingUi.ts`, `useBooking.ts`, `server/utils/sender/events/waitlist.ts` | orchestrator | fix in 0.9.1, 2026-10-27 | | |
| 87 | Billetændringer lists every household of a run a user starts (a season activation, an admin run) on one unwrapped line, so the table runs thousands of pixels wide and the columns after Husstand fall out of view on a desktop too | Layout | `useBookingUi.ts` (`ticketChangeHouseholds`), `TicketChanges.vue` | orchestrator | fix in 0.9.1, 2026-10-27: more than two households read as the first two and "+N", a control that opens the full list, which wraps in the cell | 2026-10-27: a line over more than two households reads two names and "+N"; a click opens all names, wrapped in a capped Husstand column, and the link reads "skjul" to fold it. The table keeps its box width. See QA #92 | |
| 95 | The guest form builds its guests' orders with its own copy of `useBooking`'s guest order builder (`buildGuestOrder`, behind `newGuestRow`) | DRY | `GuestBookingForm.vue` (`guestOrdersOf`), `useBooking.ts` | orchestrator | fix in 0.9.1, 2026-10-27 | 2026-10-27: the guest form builds each guest with `useBooking`'s `buildGuestOrder` for the save, the preview and the mode check; the orders are field for field the same. No rendering change | |

## Access, users, admin, layout (17)

| # | Defect | Rule | Where | Owner | Decision | Verified | Signed off |
|---|---|---|---|---|---|---|---|
| 48 | The allergy store's override flag is optional for one spec's sake | Code rule 1 | `stores/allergies.ts` | orchestrator, test-engineer | fix in 0.9.1, 2026-10-27 | | |
| 49 | The override query has three shapes, one of them sending `adminBypass=false` | DRY | `allergies.ts`, `households.ts`, `bookings.ts` | orchestrator | fix in 0.9.1, 2026-10-27 | | |
| 50 | The partial user serializer lives in the repository; the serialized user schema has no reader | ADR-010 compliance 3 | `prismaRepository.ts`, `useCoreValidation.ts` | orchestrator | fix in 0.9.1, 2026-10-27 | | |
| 51 | The user display carries an appearance its read leaves out, so it reads the default | Code rule 7 | `useCoreValidation.ts` | orchestrator | fix in 0.9.1, 2026-10-27 | | |
| 52 | The job boxes match stat icons by position: the daily job's Notifikationer line takes the info icon, and the stats are cast | Code rule 6 | `AdminSystem.vue`, `useMaintenance.ts` | orchestrator | fix in 0.9.1, 2026-10-27 | | |
| 53 | The column visibility helpers have no caller | DRY step 5 | `useTheSlopeDesignSystem.ts` | orchestrator, test-engineer | fix in 0.9.1, 2026-10-27 | | |
| 54 | The household page carries raw classes, an inline `:ui`, icon literals and the tab name as a string; the override flag lands on the economy tab as an attribute | ADR-018; Code rule 6 | `pages/household/[shortname]/[tab].vue` | orchestrator | fix in 0.9.1, 2026-10-27 | 2026-10-27: the page binds design-system tokens and icons, its tab keys come from one table, and only the tabs that edit receive the edit and override props. See QA #83, #84 | |
| 55 | Three avatar groups patch `:ui` inline | ADR-018 | `UserListItem.vue`, `CookingTeamCard.vue`, `HouseholdListItem.vue` | orchestrator | fix in 0.9.1, 2026-10-27 | 2026-10-27: the three avatar groups take their settings from the design system's avatar group tokens, with the classes unchanged. See QA #85 | |
| 56 | The preference save takes a string map; its preview takes the typed week map | Domain types | `households.ts` | orchestrator | fix in 0.9.1, 2026-10-27 | | |
| 57 | The history table's header token repeats the table header token's value | ADR-018 | `useTheSlopeDesignSystem.ts` | orchestrator | fix in 0.9.1, 2026-10-27 | | |
| 71 | The economy Menu column reads the menu title at the row's top level; the dinner nests it under `dinnerEvent`, so every Menu cell is empty | Regression (178d96b) | `AdminEconomy.vue`, `HouseholdEconomy.vue`, `EconomyTable.vue` | orchestrator | fix in 0.9.1, 2026-10-26 | 2026-10-27: the Menu column reads the dinner's menu title. See QA #77 (signed off) | |
| 75 | No architecture rule fails a raw class in a `.vue`: 201 static `class="…"` in 46 files | ADR-018 Enforcement | `designSystemUsage.unit.spec.ts`, `app/**/*.vue` | orchestrator | wontfix, 2026-10-27 | | 2026-10-27 |
| 78 | The chef page toasts the results of four store actions (allergens, announce, cancel, undo the cancel); the store owns the toast of its action | ADR-007 Responsibilities | `chef/index.vue`, `stores/bookings.ts` | orchestrator | fix in 0.9.1, 2026-10-27 | 2026-10-27: the bookings store toasts the four actions with words from `teamWords.ts`; the chef page sends none. See /chef: save allergens, announce, cancel and undo the cancel each toast once | |
| 79 | TeamRoleStatus names the cook and the kokkespire icons by raw icon names; the design system holds them in `ROLE_ICONS` (whisk, plant) | ADR-018 | `TeamRoleStatus.vue` | orchestrator | fix in 0.9.1, 2026-10-27 | 2026-10-27: the role line takes its icon from `ROLE_ICONS`. See /chef as a cook and as a kokkespire: the role line shows the role's icon | |
| 82 | The bookings store toasts six titles as literals: Heynabo-synkronisering, Indkøb gemt, Indkøb slettet, Portioner frigivet, Daglig vedligeholdelse afsluttet, Månedlig fakturering afsluttet; the file is touched, so its words move to `app/config/` | ADR-017 compliance 6, 7 | `stores/bookings.ts` | orchestrator | fix in 0.9.1, 2026-10-27 | 2026-10-27: the store reads every toast and error word from `teamWords.ts` and `bookingWords.ts`, word for word as before. See /chef: save a menu, add and remove a purchase; /admin/system: run a job; each toast reads as before | |
| 86 | The household page names its five tabs as literals: Tilmeldinger, Præferencer, Allergier, Økonomi, Indstillinger; the file is touched, so its words move to `app/config/` | ADR-017 compliance 6, 7 | `pages/household/[shortname]/[tab].vue` | orchestrator | fix in 0.9.1, 2026-10-27 | | |
| 93 | Save and cancel buttons render at four sizes: the power row's save binds an empty object, four forms override the token's size, four hand-roll their buttons | ADR-018 | `DinnerBookingForm.vue`, `HouseholdCard.vue`, `JokerSlotForm.vue`, `TeamMemberAddForm.vue`, `HouseholdCreateForm.vue`, `AdminHouseholds.vue`, `UserProfileCard.vue`, `HelpButton.vue`, `AdminTeams.vue` | orchestrator | fix in 0.9.1, 2026-10-27: every save and cancel binds `BUTTONS.save` and `BUTTONS.cancel` at their size (lg on a phone, xl from md); a site overrides only its colour or its icons; a button inside a row of fields keeps the row's size | | |

## Tests (8)

| # | Defect | Rule | Where | Owner | Decision | Verified | Signed off |
|---|---|---|---|---|---|---|---|
| 58 | Three API specs repeat the notification features | testing.md Rule 0 | `waitlistNotifications.e2e`, `sender-event-monthly-billing.e2e`, `sender-delivery.e2e` | test-engineer | fix in 0.9.1, 2026-10-27 | | |
| 59 | The sender specs copy the log spy and the channel-off value; the notification factory builds the mailbox reference by hand | testing.md Rules 1, 4 | the sender unit specs, `notificationFactory.ts`, `senderFactory.ts` | test-engineer | fix in 0.9.1, 2026-10-27 | | |
| 60 | The DAILY_MAINTENANCE service spec covers the failed run only | Every code path has a unit case | `dailyMaintenanceService.unit.spec.ts` | test-engineer | fix in 0.9.1, 2026-10-27 | | |
| 61 | Local copies of shared spec helpers: the icon reader three times, the test-id lookup six times, the price fields, rename wrappers of the default price | testing.md Rule 4 | the component specs | test-engineer | fix in 0.9.1, 2026-10-27 | | |
| 62 | The economy table spec passes the removed row key and leaves out the row id | testing.md Rule 4 | `EconomyTable.nuxt.spec.ts` | test-engineer | fix in 0.9.1, 2026-10-27 | | |
| 63 | The API error guard keeps a declaration across the cases on one browser context | § UI cases fail on an unexpected API error | `apiErrorGuard.ts` | test-engineer | fix in 0.9.1, 2026-10-27 | | |
| 64 | `Pick` types in the household factory; a date mask literal; three config values in the e2e helpers | Domain types; config values | `householdFactory.ts`, `AdminSystem.nuxt.spec.ts`, `tests/e2e/testHelpers.ts` | test-engineer | fix in 0.9.1, 2026-10-27 | | |
| 65 | The notification step pattern leaves out the chef deadline notice; the scenario is `@fixme` (unverified) | BDD | `notification.steps.ts` | test-engineer | fix in 0.9.1, 2026-10-27 | | |

## ADR (1)

| # | Defect | Rule | Where | Owner | Decision | Verified | Signed off |
|---|---|---|---|---|---|---|---|
| 66 | The System tab reads its job runs component-local through `storeAsyncData`; the ADR's exception names `useAsyncData` over store methods | ADR-007 § Component-Local Data Exception | `AdminSystem.vue` | user, then orchestrator | fix in 0.9.1, 2026-10-27 | | |

## Docs (4)

| # | Defect | Rule | Where | Owner | Decision | Verified | Signed off |
|---|---|---|---|---|---|---|---|
| 67 | The runbook's dedupe key format lacks the user part | DRY step 5 | `docs/ops-runbook.md` | documentar | fix in 0.9.1, 2026-10-27 | 2026-10-27: the runbook's key reads `<kind>:<channel>:user-<user id>/<masked recipient>:<message id>`, the test mailbox's without the user part | |
| 68 | The frontend compliance row lists `useExpandableRow` without its unit spec | DRY step 5 | `docs/adr-compliance-frontend.md` | documentar | fix in 0.9.1, 2026-10-27 | 2026-10-27: the `useExpandableRow` row reads ✅, tested by `useExpandableRow.unit.spec.ts` | |
| 69 | testing.md lists six test helpers short: `openPreferences`, `savePreferences`, `dinnerStartOf`, `isBeforeDinnerDeadline`, `gotoAllergyCatalog`, `stubAppConfig` | DRY step 5 | `docs/testing.md` | documentar | fix in 0.9.1, 2026-10-27 | 2026-10-27: the five e2e helpers stand in § Hydration, request and dinner-time helpers, `stubAppConfig` under § Hoisted mocks | |
| 70 | The guides read the booking views before this release: guest lines without the price, the waiting-list help, tickets of 0 portions, the allergy manager's override, the job boxes | Guides follow the app | `docs/user-guide.md`, `docs/admin-guide.md` | documentar | fix in 0.9.1, 2026-10-27 | 2026-10-27: the user guide shows the guest line with type and price, tickets of 0 portions and the waiting-list lines without a mail; the admin guide the override steps, the allergy manager, the users table on a phone and the job boxes; the chef guide Frigiv without a mail | |
