# Bug Fix: Admin UX — allergy catalog, alerts, poster, planning, preferences, palettes

**Status:** In progress | **Date:** 2026-09-01 | **Updated:** 2026-09-18 | **Branch:** `bugfix/admin-ux` | **PR:** #166
The allergy catalog fixes D1, D2 and A1 shipped in #165. Follow-up defects found on this branch: `bug-fix-dinner-page-and-dates.md`.

## Fix inventory

| Fix | What | Status | Implementation |
|---|---|---|---|
| D1 Master/detail | the allergy detail docks under the tapped row on a phone, sticky beside the list on desktop | ✅ #165 | `AllergyCatalogTable.vue`, `AllergyDetailPanel.vue`, `AdminAllergies.vue` |
| D2 Combine summary | fixed bottom bar with the selection count on a phone | ✅ #165 | `AllergenMultiSelector.vue` |
| A1 Age categories | children classified by birth date on the poster and the allergy cards | ✅ #165 | `useTicket.ts` `getTicketTypeConfig`, `groupInhabitantsByTicketCategory`; `pdf.vue` |
| C1 Typecheck gate | per-context typecheck; presentation in `use<Domain>Ui` | ✅ 2026-09-02 | ADR-017; `pre:all` in `package.json`; `useBookingUi.ts`, `useUserRolesUi.ts` |
| C2 E2E stability | season list polling, hydration wait | ✅ 2026-09-02 | `seasonFactory.getAllSeasons`, `testHelpers.waitForHydration` |
| Alerts on mobile | one responsive alert pattern, 55 sites migrated | ✅ 2026-09-16 | `ALERTS` in `useTheSlopeDesignSystem.ts`, ADR-018 |
| Empty states | table empty states render through the Nuxt UI 4 `#empty` slot | ✅ 2026-09-16 | six `UTable` sites; `BookingGridView` `tableData` |
| Colour drift sweep | every colour from the design system, value-preserving | ✅ 2026-09-16 | `TEXT`/`BG`/`BORDER`/`RING`/`LAYOUTS` tokens; `designSystemUsage.unit.spec.ts` |
| Sorted holidays | holidays in date order in the list and in storage | ✅ 2026-09-16 | `sortDateRanges` in `app/utils/date.ts`; `useSeasonValidation.ts` |
| Calendar grid | pickers hide neighbouring-month days; one day-circle helper | ✅ 2026-09-16 | `COMPONENTS.calendarGrid`, `calendarPickerProps`, `dayCircleClasses` |
| Planning buttons | planning buttons bind `BUTTONS` tokens | ✅ 2026-09-16 | planning and calendar components, `ICONS.holiday`, `ICONS.printer` |
| Planning form | Opret + Rediger, editable holiday rows, live-season save | ✅ 2026-09-16 | `AdminPlanning.vue`, `AdminPlanningSeason.vue`, `season/[id].post.ts`, `reconcileDinnerEvents.ts` |
| QR code | in-house QR that prints with the poster | ✅ 2026-09-16 | `app/utils/qr.ts`, `shared/QrCode.vue` |
| Poster notes | "Vigtige bemærkninger" stored in `Setting`, edited in place by allergy managers | ✅ 2026-09-18 | `useSettingValidation.ts`, `settingsRepository.ts`, `api/admin/setting/[key]`, `AllergyNotes.vue` |
| My preferences | channels and appearance per user behind ⚙ on the dashboard | ✅ 2026-09-18 | `User` columns, `useUserPreferenceValidation.ts`, `api/user/preferences.post.ts`, `UserPreferencesCard.vue` |
| Palettes | Glade farver (AA, default), Høj kontrast (AAA), Til farveblinde (AA, colour-safe) | ✅ 2026-09-18 | `scripts/palettes/`, `app/assets/css/palettes/`, `PALETTES` |
| Brand rainbow | one ordered rainbow for landing, kitchen panels and ticker | ✅ 2026-09-17 | `PANTONE_FAMILIES`, `HERO`, `RAINBOW`, `getRainbowBand` |
| Team colours | team n wears rainbow stop n | ✅ 2026-09-18 | `RAINBOW_FAMILIES`; `TeamCalendarDisplay`, `CookingTeamBadges`, `CookingTeamCard`, `AdminTeams` |
| Team creation toast | the toast states teams created and dinners assigned | ✅ 2026-09-18 | `CreateTeamsResponse`, `api/admin/team/index.put.ts`, `AdminTeams.vue` |
| Dev feedback round 1 | six findings from the dev walk | ✅ 2026-09-18 | see "Dev feedback round 1" |
| Calendar-day matching | team assignment and holiday cells compare calendar days | ✅ 2026-09-18 | `computeTeamAssignmentsForEvents` in `app/utils/season.ts`, `isCalendarDateInDateList` in `app/utils/date.ts` |
| Mobile tables | the page fits a phone: cells wrap between words, wide data tables scroll in their own box, the users and job-history tables hide columns behind their expanded row; the loader fits its card | ✅ 2026-09-18 | `COMPONENTS.table.ui` / `denseUi` / `gridUi`, `columnVisibility`, every `UTable`, `AdminUsers.vue`, `AdminSystem.vue`, `Loader.vue` |

---

## Decisions

- **Editable content lives in the database** (2026-09-16). `app.config` and `runtimeConfig` are build and deploy time.
- **Community values in `Setting`, a user's own values in `User` columns** (2026-09-17). `Setting` holds a key and a JSON value typed by a
  code registry; `User.notificationChannels` and `User.appearance` travel with the session. Migration `0016_settings` adds both.
- **The design system owns shared UI values** (ADR-018, 2026-09-16). Components bind tokens; token sweeps preserve the rendered classes.
- **Mockups live in this doc until implemented, then in the component header comment** (2026-09-18). The parent draws the composition,
  the child its own layout; an implemented section keeps the signoff line and points to the header.
- **Edit affordances** (2026-09-16, 2026-09-18). Rows, detail panels, card headers and the notes box use the square ghost pencil
  `BUTTONS.edit`; the season card uses the labelled `Rediger <navn>`. The ⚙ settings control is `BUTTONS.settings`.
- **Planning** (2026-09-16). `/admin/planning` uses `Opret sæson` and `Rediger <navn>`; `/admin/teams` keeps `FormModeSelector`. The card title
  reads "Fællesspisning sæson …", "Redigerer fællesspisning sæson …" (edit), "Opretter fællesspisning sæson …" (create, 2026-09-18).
- **Picker selection** (2026-09-16). A picked holiday is the green holiday ring, a picked season date the pink cooking-day circle, drawn by
  `dayCircleClasses`. Green belongs to holidays.
- **The live season is edited in place** (2026-09-16). Saving reconciles the dinner events (ADR-015), runs `clipPreferences` and
  `scaffoldPrebookings` on the active season, and deletes the Heynabo events of removed dates (ADR-013). Activation lives in `/active`.
- **Palettes** (2026-09-16 to 2026-09-18). Three options: Glade farver (the Tydelig solve, AA, the default for every visitor), Høj kontrast
  (AAA), Til farveblinde (AA, colour-safe). The published Farveglad colours leave the UI; the `main.css` scales stay as the generator's input.
  The level comes from `PALETTES` in `useUserPreferenceValidation.ts`, which the contrast spec asserts. `make palettes` writes the preset files.
- **Colour vision in Glade farver** (2026-09-18). Colour-blind members pick Til farveblinde. Glade farver keeps 42 of 72 meaning cases (the
  Farveglad colours kept 57); its 30 pairs are listed in `FINDINGS` of `designSystemColourVision.unit.spec.ts`.
- **Contrast test** (2026-09-18). One case per palette and mode; `color="neutral"` badges, buttons and alerts are measured on the faces Nuxt
  UI gives them. Høj kontrast light `sky-700` → `#235261` and dark `sky-200` → `#cbeef5` carry `text-default` on `bg-elevated` at 7:1.
  Code comments carry no dates or decisions; this doc does.
- **Palette badges** (2026-09-18). "🇪🇺 EN 301 549 · Kontrast AA ✓" or "… Kontrast AAA ✓" from the `PALETTES` level: the badge claims
  contrast (WCAG 1.4.3, 1.4.6, 1.4.11), never full conformance. "👁 Nedsat farvesyn · Okabe–Ito ✓" from `PALETTES.colourSafe` (EN 301 549
  clause 4.2.3, WCAG 1.4.1 "Anvendelse af farve"). "Farvesikker" describes a person who passes a colour-vision test and is not used.
- **Farveblind is the Color Universal Design standard** (2026-09-18). Every colour comes from the eight CUD colours; neutral maps to sky blue,
  primary to black; teams 1-8 take the eight colours and team 9 repeats team 1.
- **Brand rainbow** (2026-09-17). Order pink, orange, ocean, bonbon, then the team stops. Black ink on the vibrant fills. TIL SALG stays grey.
  The landing walks stops 0-3, the kitchen panels 0-2, the ticker chips follow the same order. The kitchen panel arrows show on panels
  with orders (2026-09-18).
- **Team colours** (2026-09-18). Team n wears rainbow stop n; eight stops (option A), team 9 repeats team 1; the team name on the badge
  carries the identity.
- **Preferences** (2026-09-16, 2026-09-17). The card sits behind ⚙ in the profile card header; the pencil opens the edit face with Gem and
  Annuller. Labels: Notifikationer, Farvevalg (Glade farver, Høj kontrast, Til farveblinde), Tekst (Normal, Stor, Større).
- **Poster boxes are outline** (2026-09-18). The poster prints without grey fills.
- **Allergy toolbar** (2026-09-18). "Kombiner allergener", and "Afslut kombinering" while active.
- **Disclosure buttons** (2026-09-18). A button that opens a panel below it carries a chevron that turns while the panel is open
  (`BUTTONS.disclosure`): the ⚙ on the dashboard and on `/chef`, the role assignment, "Rapporter fejl".
- **Toasts state results** (2026-09-18). The team toast reads `<n> madhold oprettet · <m> madlavninger tildelt`; the test-message toast carries
  the message id.
- **Tables on a phone** (2026-09-18). A wide data table scrolls sideways inside its own box; the page never does. Words, dates, badges and
  e-mails stay whole. The chevron and expanded row serve the users and job-history tables, whose extra columns are detail. The settings
  tree keeps its ellipsis.

## Open

### Smaller open items

- **`MobileViewport.e2e.spec.ts` under parallel load.** With four workers one screen per run stays on "Henter sæsondata..." for 64s
  (`admin-planning`, then `dinner`), and one run drew the page header 152px wide for a frame (`household-bookings-week`); each case
  passes alone. CI runs one worker.
- **Inhabitant create on an existing email.** `serializeUserInput` writes both preference columns on the email-keyed upsert, so an admin
  creating an inhabitant whose email already exists resets that user's channels and appearance to the defaults — the same as it resets
  `systemRoles`. The Heynabo import creates through `createUsers` and updates through the id-keyed `saveUser`, so it keeps them.
- **Tokens without a consumer:** `COMPONENTS.cardAction.{neutral,destructive,toggle,toggleActive}`, `BUTTONS.more`, `LAYOUTS.hero`, the
  `CLASSES.hero.primary` example in the design-system header (names an export that does not exist), `TEXT.orange[100]`, `getRainbowFamily`.
- **Alert descriptions** render at `opacity-90` (Nuxt UI); the contrast spec measures alert text at full strength.
- **Neutral badges in Til farveblinde.** A solid BABY badge renders `neutral-900` (Nuxt UI paints neutral solid on `bg-inverted`), not
  sky blue.
- **Til farveblinde choices made by the generator** (visual check). Error and warning part by lightness; light `neutral` (L .43) sits
  below `success` (L .52); faces keep at least half their anchor's chroma; `neutral` keeps the ladder's chroma (dark page `#2d4351`);
  dark `primary` is `#d2d2d2`; ocean and peach swap anchors (ocean bluish green, peach sky blue); bonbon takes vermillion darkened to
  `#c05400` for its white ink.
- **Høj kontrast dark peach stop** is `#fff3eb`.
- **Countdown token names.** `CHEF_CALENDAR.countdown` / `DINNER_CALENDAR.countdown` read `accent` = 200, `accentMedium` = 300,
  `accentLight` = 50 since the accent moved to the 200 rung.
- **Nuxt UI colour observations.** Nuxt UI's colours plugin emits no `--ui-neutral`; each preset declares it. `mocha` and `bonbon` are
  declared in `nuxt.config.ts` `ui.theme.colors` and mapped nowhere in `app.config.ts` `ui.colors`, so `bg-mocha-*` and `bg-bonbon-*` paint
  nothing; `BG.mocha` names `amber`, `BG.bonbon` names `violet`.
- **`AdminAllergies.e2e.spec.ts` poster-notes cases** fail with four workers: `apiRequestContext.get: Request context disposed` in the
  catalog `beforeAll` and `apiRequestContext.post: Target page, context or browser has been closed` inside `UserFactory.withSystemRoles`.
  The describe runs serially; the cause (a context closed while another test uses it) is being traced in `settingFactory.ts` /
  `testHelpers.freshMemberContext`.
- **`ChefMenuCard.nuxt.spec.ts`** mocks stores and child components (`docs/testing.md` Rule 6) and still describes the actions trigger as
  a "quiet overflow trigger" / "…".
- **Admin pages are readable by any logged-in user** (`GET /api/admin/*` → `isAuthenticated` in `usePermissions.ts`); the poster's QR flow
  relies on it for members.
- **`HouseholdAllergies.vue`** has no component or e2e spec and keeps its own table layout.
- **Mobile Playwright projects** are commented out in `playwright.config.ts`; phone widths are covered by `MobileViewport.e2e.spec.ts`
  with `test.use({viewport})`.
- **`nuxt typecheck`** (`vue-tsc -b` over root `references`) replaces the per-project `ts:*` scripts once nuxt/nuxt#34385 is fixed; it is
  broken on Nuxt 4.3.1 / @nuxt/cli 3.33.1 (fix PR #35195 unmerged). Recorded in ADR-017.

## Ship — not started

1. The settings ADR in `docs/adr.md` under the next free number (text in "ADR notes" below).
2. `docs/ui.md` "Complete Color Reference Table": the Nuxt UI semantic rows name stale scales (`primary` / `secondary` / `info` as
   `blue-500`, `warning` as `amber-500`); rewrite them from `app.config.ts` `ui.colors`.
3. Compliance docs final pass (`docs/adr-compliance-backend.md`, `docs/adr-compliance-frontend.md`), `docs/testing.md` for the
   architecture specs added on this branch (`designSystemColourVision`, `migrations`, the registry-derived palette list).
4. `npm run pre:all`, the full unit suite and the full e2e suite (parallel and serial projects) in one run; each package ran only its
   own specs.
5. `/dry` over the branch.
6. PR #166 description: summary, test results, and the human checks comment.

---

## Alerts on mobile

**Problem.** `UAlert` clipped long words, e-mails and URLs on a phone; 56 sites picked colour, variant and padding by hand.
**Solution.** `createResponsiveAlerts(isMd)` exports `ALERTS`: `info`, `neutral`, `success`, `warning`, `error`, `legend`, `emptyState`,
`emptyStateCompact`, plus the modifiers `withActions` (actions beside the text from md, below it on a phone) and `withCornerAction` (an
icon-only action in the top-right corner). Shared `ui` wraps anywhere and breaks white space. The two "Forklaring" legends are
`dinner/DinnerModeLegend.vue`. Tables and the loader: "Mobile tables". The classification of the 56 sites is in the git history of
`feature-proposal-notifications.md`.
**Tests.** `designSystemUsage.unit.spec.ts` (every `<UAlert>` binds a kind), `MobileViewport.e2e.spec.ts`, `DinnerModeLegend.nuxt.spec.ts`.

## Empty states

**Problem.** Six tables used the Nuxt UI 2 slot `#empty-state`, which Nuxt UI 4 ignores.
**Solution.** `#empty` in `BookingGridView`, `AllergyCatalogTable`, `AdminAllergies`, `AdminHouseholds`, `AdminTeams`, `ChefCalendarDisplay`,
`InhabitantSelector`. `AdminTeams` renders its table (and its `#empty`) with zero teams in view and edit; `BookingGridView.tableData` is empty
for a period without dinners. `designSystemUsage.unit.spec.ts` rejects `#empty-state`.

## Colour drift sweep

**Problem.** 178 raw Tailwind colour classes and 59 literal colour props sat outside the design system.
**Solution.** One token per distinct rendered value (`TEXT.ink/strong/toned/muted/dimmed/timestamp/menuBody`, `BG.panel/panelNested/panelHover/
inset/ticket/budgetHead/invoiceGround/invoiceStat`, `LAYOUTS.panelDivider`, `RING.*`, `COMPONENTS.segmentedActive`, `BACKGROUNDS.appShell/header`,
`PANTONE_CHIPS`). A before/after comparison of the rendered class sets over the 105 `.vue` files showed zero differences. Two rules in
`designSystemUsage.unit.spec.ts` reject raw colour classes and literal colour props. Token table: `docs/ui.md`.

## Planning form, holidays, calendars, buttons

**Problem.** Planning used a three-button mode selector, holiday rows could only be deleted, holidays kept insertion order, the pickers drew
neighbouring-month days twice, and planning buttons were hand-built. Saving the active season left clipping and scaffolding to the nightly job
and left Heynabo events of removed dates published.
**Solution.**
- `AdminPlanning.vue`: `SeasonSelector` + `Opret sæson` (`create-season`); `useEntityFormManager` keeps `?mode=` (ADR-006, ADR-008).
- `AdminPlanningSeason.vue`: title per mode (`TITLE_VERBS`), `Rediger <navn>` (`edit-season`, `EDIT_VERB`), footer `LAYOUTS.formButtonRow`.
- `CalendarDateRangeListPicker.vue`: each holiday row is a `CalendarDateRangePicker` validated against `holidaysSchema`; `sortDateRanges` on add;
  `serializeSeason`/`deserializeSeason` store and read holidays in date order.
- `COMPONENTS.calendarGrid` on every `UCalendar`; `calendarPickerProps(selection)` and `CALENDAR.picker` for pickers; `dayCircleClasses` for
  every day circle; `PLANNING_CALENDAR` for the preview.
- `season/[id].post.ts` returns `SeasonUpdateResponse` (ADR-009), ignores `isActive`, runs `clipPreferences` + `scaffoldPrebookings` on the
  active season; `reconcileDinnerEventsForSeason` passes `deleteHeynaboEventAsSystem`.
- Buttons: `BUTTONS.secondaryAction`/`primaryAction`/`edit` with `ICONS`; `TicketPriceListEditor` test-ids; `AdminToCreateSeason` `canEdit`.
**Mockups.** `AdminPlanning.vue` and `AdminPlanningSeason.vue` headers (✅ 2026-09-16).
**Tests.** `AdminPlanning.nuxt`, `AdminPlanningSeason.nuxt`, `CalendarDateRangeListPicker.nuxt`, `CalendarDateRangePicker.nuxt`,
`CalendarDisplay.nuxt`, `TicketPriceListEditor.nuxt`, `AdminToCreateSeason.nuxt`, `SeasonStatusDisplay.nuxt`, `date.unit`, `useSeasonValidation.unit`;
e2e `AdminPlanning`, `AdminPlanningSeason`, `admin`, `season` (API), `seasonLiveEdit` (serial API), `AdminPlanningLiveSeason` (serial UI).

## QR code

**Problem.** The poster loaded its QR from `api.qrserver.com` and hid it from print.
**Solution.** `encodeQrPath` (`app/utils/qr.ts`, `uqr`) and `QrCode.vue` (inline SVG, black on white). The poster row is `flex-col md:flex-row`
on screen and a row in print. **Mockup:** `pdf.vue` header (✅ 2026-09-16). **Tests:** `qr.unit`, `QrCode.nuxt`, `admin-allergies-pdf.nuxt`,
`AllergyPoster.e2e`.

## Poster notes

**Problem.** The poster's notes existed only on the poster and were fixed text.
**Solution.**
- `Setting` table (`key`, JSON `value`, `updatedAt`, `updatedByUserId` SET NULL) in `prisma/schema.prisma`, migration `0016_settings`.
- `useSettingValidation.ts`: `SETTING_KEYS`, `SettingDetailSchema`, `SETTING_REGISTRY` (`valueSchema`, `defaultValue`, `canWrite`),
  `DEFAULT_ALLERGY_POSTER_NOTES`, `splitNotes`.
- `settingsRepository.ts` (`fetchSetting`, `upsertSetting`); `GET /api/admin/setting/[key]` (row or registry default, 400 for an unknown key);
  `POST` (key's `valueSchema`, `requireSettingWriteAccess`, 403). Route rule in `usePermissions.ts` before the admin rule.
- `allergies.ts` `posterNotes`, `savePosterNotes` (takes the stored row from the POST response).
- `AllergyNotes.vue`: view face `ALERTS.legend` + `withCornerAction`, pencil for ADMIN and ALLERGYMANAGER, edit face with Gem and Annuller;
  mounted in the `AdminAllergies` card header and on the poster.
**Mockup.** `AllergyNotes.vue` header (✅ 2026-09-16, edit face ✅ 2026-09-18).
**Tests.** `useSettingValidation.unit`, `usePermissions.unit`, `allergies.nuxt`, `AllergyNotes.nuxt`, `AdminAllergies.nuxt`,
`admin-allergies-pdf.nuxt`; e2e `setting` (API), `AdminAllergies`, `AllergyPoster`. The notes row is shared state: `SettingFactory.appendLine` /
`removeLines` touch only a suite's own salted lines.

## My preferences

**Problem.** Members had no per-login settings for notification channels, colours or text size.
**Solution.**
- `User.notificationChannels`, `User.appearance` (JSON, typed by `AppearanceSchema`) through the user schemas in `useCoreValidation.ts` and
  `domainFragments.ts`; `serializeUserPartial` writes them (ADR-012).
- `useUserPreferenceValidation.ts`: `PaletteSchema`, `TextScaleSchema`, `AppearanceSchema`, `PALETTES` (level, colourSafe), defaults,
  `UserPreferencesUpdateSchema`.
- `POST /api/user/preferences` (session user, 400 for SMS without a phone, session refreshed); `POST /api/user/notifications/test`
  (`emitTestEmail` to the session user). Route rule `/api/user/` in `usePermissions.ts`.
- `auth.ts` `savePreferences`, `sendTestNotification` (toast with the `dedupeKey`); column defaults cover sessions issued before the migration.
- `UserProfileCard.vue` ⚙ (`BUTTONS.settings`, `pref-toggle`); `Login.vue` owns the open state; `UserPreferencesCard.vue` view and edit faces,
  `COMPONENTS.choiceGroup` for radios and switches.
- `layouts/default.vue` writes `html[data-palette]` and `html[data-text-scale]`; `main.css` scales the root font.
**Mockups.** `Login.vue`, `UserProfileCard.vue`, `UserPreferencesCard.vue` headers (✅ 2026-09-16, card faces ✅ 2026-09-17).
**Tests.** `useUserPreferenceValidation.unit`, `useCoreValidation.unit`, `usePermissions.unit`, `sender/events/test.unit`,
`UserPreferencesCard.nuxt`, `UserProfileCard.nuxt`; e2e `user/preferences` (API), `UserPreferences`, `MobileViewport`.

## Palettes

- **Mechanism.** The base `palettes/default.css` (the Tydelig solve) applies under `html:not([data-palette])`; a preset redeclares
  `--color-<family>-<step>` and `--ui-<slot>` under `html[data-palette="<key>"]`; each has a `.dark` mirror. `main.css` imports all three.
- **Registry.** `PALETTES` in `useUserPreferenceValidation.ts` holds each key's level and `colourSafe`; `AppearanceSchema` reads a stored
  `tydelig` as `default`. `UserPreferencesCard.vue` renders the labels and badges.
- **Generator.** `scripts/palettes/presets.ts` (data), `render.ts` (`solvePreset`, `renderPreset`, the meaning faces), `generate.ts` (CLI). Run:
  `make palettes`. Til farveblinde maps every meaning face and the eight stops onto the Color Universal Design colours.
- **Measurement.** `tests/component/architecture/`: `contrast.ts`, `designSystemPairs.ts`, `designSystemMeanings.ts`, `palettes.ts`,
  `designSystemContrast.unit.spec.ts`, `designSystemColourVision.unit.spec.ts` (`docs/testing.md` → Architecture Tests).
- **Counts (2026-09-18).**

  | Palette | Contrast pairs at its level | Meaning cases (3 vision types × 2 modes) |
  |---|---|---|
  | Glade farver | 440 of 440 at AA | 42 of 72 |
  | Høj kontrast | 440 of 440 at AAA | not measured |
  | Til farveblinde | 440 of 440 at AA | 72 of 72 |

- **Mockups.** `UserPreferencesCard.vue` header (badges ✅ 2026-09-18).

## Brand rainbow and team colours

**Solution.** `PANTONE_FAMILIES` orders the families; `HERO` holds fill and ink per family; `RAINBOW_FAMILIES`/`RAINBOW` and `getRainbowBand(i)`
walk the stops; `PANTONE_CHIPS` follows the same order. `pages/index.vue` loops the landing bands; `COMPONENTS.kitchenPanel` takes stops 0-2
and grey for RELEASED; team badges in `TeamCalendarDisplay`, `CookingTeamBadges`, `CookingTeamCard`, `AdminTeams` bind `getRainbowBand(i)`.
`useCookingTeam.ts` carries no colours (ADR-017).
**Mockups.** `pages/index.vue`, `KitchenPreparation.vue` headers.
**Tests.** `designSystemColourVision.unit` (stops apart per palette), `designSystemContrast.unit` (`INK_ON_FILL` grades every stop as body
text), `TeamCalendarDisplay.nuxt`.

## Team creation toast

`PUT /api/admin/team` returns `CreateTeamsResponse` `{teams, eventsAssigned}` (`useCookingTeamValidation.ts`, ADR-009); `plan.ts` `createTeam`
returns it; `AdminTeams.vue` writes both numbers. **Tests:** `team.e2e` (API), `plan.nuxt`, `AdminTeams.nuxt`.

## Dev feedback round 1

| Finding | Implementation |
|---|---|
| Dashboard actions overflowed a phone in three looks | `UserProfileCard.vue` wrapping row; ⚙ `BUTTONS.settings`; Heynabo and Log ud `BUTTONS.secondaryAction` |
| Preferences pencil carried a label | `UserPreferencesCard.vue` `BUTTONS.edit` + `aria-label` |
| Notes pencil sat under the text on a phone | `ALERTS.withCornerAction` in `AllergyNotes.vue` |
| "Sammenlign" | `AdminAllergies.vue` "Kombiner allergener" / "Afslut kombinering" |
| Expanded allergy row overflowed a phone | `COMPONENTS.table.ui.td` wraps the expanded cell; `alertUi` root `whitespace-normal` |
| `/chef` "…" menu trigger | `ChefMenuCard.vue` `BUTTONS.settings` + chevron |

**Tests.** `UserProfileCard.nuxt`, `UserPreferencesCard.nuxt`, `AllergyNotes.nuxt`, `AdminAllergies.nuxt`; `MobileViewport.e2e` (`login`,
`admin-allergies-expanded-row`).

## Calendar-day matching

Stored dinner dates carry UTC midnight; date-fns and local `Date` values carry local midnight. `computeTeamAssignmentsForEvents` and
`isCalendarDateInDateList` compare calendar days with `isSameDay`, so team assignment and holiday cells hold in Copenhagen, in UTC (CI, the
SSR worker) and in between. **Tests:** `season.unit` (UTC-midnight events), `date.unit` (`isCalendarDateInDateList`), `CalendarDisplay.nuxt`,
run in UTC and Copenhagen. The storage convention: `bug-fix-dinner-page-and-dates.md`.

---

## Mobile tables

**Problem.** Measured at 375px by `MobileViewport.e2e.spec.ts` on 2026-09-18: the users table scrolled 555px sideways, the job-history
table 1146px, the allergy catalog 192px with a row expanded; `/dinner` was 3px wider than the phone while its loaders showed.
**Root cause.** Nuxt UI's table cell is `whitespace-nowrap` with `p-4`, so a multi-word value keeps to one line. Ten of the seventeen
tables bound no table token. `Loader.vue` draws a fixed 48 + 16 + 250px row, 378px inside a card on a phone.
**Solution.**
- `COMPONENTS.table.ui` (cells `px-2 md:px-4`, `py-1 md:py-2`, `whitespace-normal`: a cell wraps between words, a word and an e-mail stay
  whole), `denseUi` (the compact padding of the booking form, household preferences and household allergies) and `gridUi` (the booking
  grid); every `<UTable>` binds one of them — `designSystemUsage.unit.spec.ts` rule "every <UTable> binds a COMPONENTS.table token".
- A data table wider than a phone scrolls inside its own box (the economy tables, households, teams); the page stays at the phone's width.
- `columnVisibility(hiddenOnPhone, hiddenFromMd)` in the design system (`createColumnVisibility`). The users table hides `#`, Telefon,
  Systemroller and Sidst opdateret on a phone, their content is in the expanded `UserProfileCard`. The job history hides Varighed, Kilde
  and Resultat on a phone behind a chevron (`job-history-expand-<id>`, the panel `job-history-details`); from md the chevron hides and an
  open row closes.
- `Loader.vue`: the bars keep 250/200px as a maximum and shrink with the card.

**Mockup — users table on a phone** ✅ signed off 2026-09-18, addresses whole 2026-09-18; in the header of `AdminUsers.vue`.
**Mockup — job history on a phone** ✅ signed off 2026-09-18; in the header of `AdminSystem.vue`.

**TDD.** `MobileViewport.e2e.spec.ts` covers every route, admin and household tab, booking view and revealed state (`SCREENS`). Per
screen it samples the document every animation frame (skeletons included), checks every alert for clipped content, and checks that no
word in a table, a badge or a button breaks across two lines (alerts break anywhere by design). Red on the badges ("Igangværende",
"Gennemført", "Fraflyttet") and on the cell text (`17/09/202|6`) under `wrap-anywhere`, then green. `designSystemUsage.unit.spec.ts` red
on seven sites, then green. `useTheSlopeDesignSystem.unit.spec.ts`: `columnVisibility` per breakpoint. `AdminSystem.nuxt.spec.ts`: the
columns and the chevron per breakpoint, the expanded row's content, the row closing at md.
**Affected.** `useTheSlopeDesignSystem.ts`; `AdminUsers.vue`, `AdminSystem.vue`, `AdminTeams.vue`, `BookingGridView.vue`,
`DinnerBookingForm.vue`, `HouseholdCard.vue`, `HouseholdAllergies.vue`, `AllergyCatalogTable.vue`, `CostEntry.vue` (doc example),
`Loader.vue`; every table that already bound `COMPONENTS.table.ui` takes the new padding and wrapping; root test-ids `chef-page` and
`public-billing`. Tests: `SeasonFactory.defaultJobRun`, `mountWithTooltipProvider` takes an `isMd` ref.

## Test coverage

| Endpoint | API spec |
|---|---|
| `GET`, `POST /api/admin/setting/[key]` | `tests/e2e/api/parallel/admin/setting.e2e.spec.ts` |
| `POST /api/user/preferences`, `POST /api/user/notifications/test` | `tests/e2e/api/parallel/user/preferences.e2e.spec.ts` |
| `POST /api/admin/season/[id]` | `tests/e2e/api/parallel/admin/season.e2e.spec.ts`; active season: `tests/e2e/api/serial/admin/seasonLiveEdit.e2e.spec.ts` |
| `PUT /api/admin/team` | `tests/e2e/api/parallel/admin/team.e2e.spec.ts` |

| Component or behaviour | E2E | Component spec |
|---|---|---|
| `ALERTS`, overflow at 375px | `MobileViewport` | `designSystemUsage`, `DinnerModeLegend` |
| `AllergyNotes` | `AdminAllergies`, `AllergyPoster` | `AllergyNotes`, `AdminAllergies`, `admin-allergies-pdf` |
| `QrCode` | `AllergyPoster` | `QrCode`, `qr.unit` |
| Preferences, ⚙ | `UserPreferences`, `MobileViewport` | `UserPreferencesCard`, `UserProfileCard` |
| Planning form, holidays, pickers | `AdminPlanning`, `AdminPlanningSeason`, `admin`, `AdminPlanningLiveSeason` | `AdminPlanning`, `AdminPlanningSeason`, `CalendarDateRangeListPicker`, `CalendarDateRangePicker`, `CalendarDisplay` |
| Planning buttons | planning e2e via test-ids | `TicketPriceListEditor`, `AdminToCreateSeason`, `SeasonStatusDisplay` |
| Teams: empty state, colours, toast | `AdminTeams` | `AdminTeams`, `TeamCalendarDisplay` |
| Booking grid without dinners | — | `BookingGridView` |
| Palettes and rainbow | — | `designSystemContrast`, `designSystemColourVision` |

## Test-id contract

| Surface | Old | New |
|---|---|---|
| Planning header | `form-mode-create` | `create-season` |
| Season card | `form-mode-edit`, `form-mode-view` | `edit-season` (view + canEdit) |
| Empty-state CTA | UAlert `:actions` | `create-first-season` |
| Ticket prices | `name="addTicketPrice"`, `name="removeTicketPrice-${i}"` | `ticket-price-add`, `ticket-price-remove-${i}` |
| Profile card | `name="logout-button"`, `name="heynabo-profile-link"` | `data-testid` with the same names; `pref-toggle` |
| Preferences (proposal: `channel-toggle-*`, `edit-channels-btn`, `save-channels-btn`, `send-test-notification-btn`) | — | `pref-channel-*`, `pref-edit`, `pref-save`, `pref-cancel`, `pref-send-test`, `pref-card`, `pref-palette-<key>`, `pref-text-scale-<key>` |
| Notes | — | `allergy-notes`, `allergy-notes-item`, `edit-allergy-notes`, `allergy-notes-textarea`, `save-allergy-notes`, `cancel-allergy-notes` |
| QR, team legend | — | `qr-code`, `team-legend-entry`, `team-legend-badge` |

Shared contracts: `planningTestIds.ts`, `allergyTestIds.ts`, `userPreferencesTestIds.ts`.

## Visual check

The human checks for this branch live in the PR #166 comment, grouped by page. Palettes switch from ⚙ Indstillinger → Rediger → Farvevalg,
or with `document.documentElement.dataset.palette = '<key>'` in the console.

## ADR notes

- **ADR-017** — composables the server imports use explicit imports; presentation lives in `use<Domain>Ui`; `pre:all` typechecks each
  generated project (C1).
- **ADR-018** — recorded 2026-09-16: the design system owns shared UI values; architecture tests enforce it.
- **Next free number — Editable settings as a key-value store with a code registry.** `Setting` holds a key and a JSON value;
  `SETTING_REGISTRY` declares each key's `valueSchema`, `defaultValue` and `canWrite`. `GET` answers a registered key with the row or the
  default and an unregistered key with 400; `POST` validates with the key's schema and runs `requireSettingWriteAccess`, so the route table
  carries one rule per prefix. The repository owns the JSON (ADR-010); the domain store owns the fetch. A user's own values are `User`
  columns typed by `useUserPreferenceValidation.ts`.

## Commands

```
make palettes                              # regenerate app/assets/css/palettes/*.css after a scale, ui.colors or fill/ink token change
make d1-create-migration name=<change>     # the user runs it; the Prisma source is rewritten to ALTER TABLE before flattening
make d1-migrate-local                      # then d1-migrate-dev before deploy-dev, d1-migrate-prod before deploy-prod
make d1-nuke-allergy-notes                 # remove e2e lines (a UUID in the line) from the allergy notes, local; part of d1-nuke-all
```
