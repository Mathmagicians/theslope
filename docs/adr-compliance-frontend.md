# ADR Compliance - Frontend Routes & Components

**Generated:** 2025-11-11
**Last Updated:** 2026-09-18 (Poster notes: "Vigtige bemærkninger" is a `Setting` row; `useSettingValidation` carries the keys, schemas and `SETTING_REGISTRY`; `allergies.ts` owns `posterNotes` / `savePosterNotes`; `AllergyNotes` gained the pencil + textarea edit face. Earlier: Farveblind: the `colorblind` preset generated onto the Color Universal Design anchors, `PALETTES.colourSafe`, `designSystemColourVision.unit.spec.ts`. Earlier: My preferences: `UserPreferencesCard` on the dashboard, `useUserPreferenceValidation`, auth-store `savePreferences` / `sendTestNotification`, `html[data-palette]` + `html[data-text-scale]` from `layouts/default.vue`. Earlier: The brand rainbow: `PANTONE_FAMILIES` orders `HERO`, `RAINBOW` and `PANTONE_CHIPS`; landing bands and kitchen panels walk `getRainbowBand(i)` with `TEXT.black`; TIL SALG grey. Earlier: colour drift sweep: every colour in `app/` comes from `useTheSlopeDesignSystem.ts`; new `TEXT.ink/strong/toned/muted/dimmed/timestamp/menuBody`, `BG.panel/panelNested/panelHover/inset/ticket/budgetHead/invoiceGround/invoiceStat`, `LAYOUTS.panelDivider`, `RING`, `COMPONENTS.segmentedActive`, `economyTable.level{1,2}.tableHead`, `BACKGROUNDS.appShell`, `PANTONE_CHIPS`; two architecture rules in `designSystemUsage.unit.spec.ts`)

## Legend

### ADR Compliance Markers
- ✅ = Fully compliant
- ⚠️ = Partial compliance (needs review)
- ❌ = Non-compliant
- ❓ = Not yet audited
- N/A = Not applicable

### Test Coverage
- ✅ = Adequate test coverage (component + E2E)
- ⚠️ = Partial coverage (component OR E2E only)
- ❌ = Missing tests
- N/A = No tests needed (simple display component)

## Page Routes

| Route | Page Component | ADR-007 Store | ADR-008 FormManager | ADR-006 URL Nav | E2E Tests | Component Tests | Status |
|-------|----------------|---------------|---------------------|-----------------|-----------|-----------------|--------|
| **Admin Routes** |
| `/admin/planning` | `admin/[tab].vue` → `AdminPlanning.vue` | ✅ `usePlanStore()` | ✅ Full usage | ✅ `?mode=` | ✅ | ✅ | **✅ COMPLIANT** |
| `/admin/teams` | `admin/[tab].vue` → `AdminTeams.vue` | ✅ `usePlanStore()` | ✅ Partial usage | ✅ `?mode=` | ✅ | ❌ | **⚠️ MISSING TESTS** |
| `/admin/households` | `admin/[tab].vue` → `AdminHouseholds.vue` | ✅ `useHouseholdsStore()` | ❓ | ✅ `?mode=` | ✅ | ⚠️ | **⚠️ AUDIT NEEDED** |
| `/admin/allergies` | `admin/[tab].vue` → `AdminAllergies.vue` | ✅ `useAllergiesStore()` | N/A | ✅ tabs | ✅ | ✅ | **✅ COMPLIANT** |
| `/admin/users` | `admin/[tab].vue` → `AdminUsers.vue` | ✅ `useUsersStore()` | N/A | ✅ tabs | ✅ | ❌ | **⚠️ E2E ONLY** |
| `/admin/economy` | `admin/[tab].vue` → `AdminEconomy.vue` | ✅ `usePlanStore()`, `useBookingsStore()` | N/A | ✅ tabs | ✅ Serial | ❌ | **⚠️ E2E ONLY** - Admin corrections feature |
| `/admin/settings` | `admin/[tab].vue` → `AdminSettings.vue` | N/A | N/A | ✅ tabs | ❌ | ❌ | **❌ NO TESTS** |
| `/admin/allergies/pdf` | `admin/allergies/pdf.vue` | ✅ `useAllergiesStore()`, `usePlanStore()` | N/A | N/A | ✅ Smoke | ✅ 5 tests | **✅ COMPLIANT** — Age categories via `groupInhabitantsByTicketCategory` + `formatTicketCounts` (V/B/b), active-season age limits, DS typography; the no-print controls bind `BUTTONS.secondaryAction` + `ICONS.arrowLeft` (Tilbage) and `BUTTONS.primaryAction` + `ICONS.printer` (Print); notes render through `AllergyNotes` on the store's `posterNotes` — the same Setting row the catalog header edits, read-only here; the QR is the shared `QrCode` on `qrCodeUrl` and prints with the poster, the table + QR row is `flex-col md:flex-row` on screen and `row` in the print block |
| **Household Routes** |
| `/household/[shortname]` | `household/[shortname]/index.vue` | ✅ `useHouseholdsStore()` | N/A | ✅ path + `?pbs=` | ✅ | ⚠️ | **⚠️ REVIEW** - ADR-006 preserves `?pbs` on redirect |
| `/household/[shortname]/bookings` | `household/[shortname]/[tab].vue` → `HouseholdBookings.vue` | ✅ Multiple stores | N/A | ✅ tabs + `?pbs=` | ✅ | ❌ | **⚠️ MISSING TESTS** |
| `/household/[shortname]/allergies` | `household/[shortname]/[tab].vue` → `HouseholdAllergies.vue` | ✅ `useAllergiesStore()` | ❓ | ✅ tabs + `?pbs=` | ❌ | ❌ | **❌ NO TESTS** |
| `/household/[shortname]/settings` | `household/[shortname]/[tab].vue` → `HouseholdSettings.vue` | ✅ `useHouseholdsStore()` | N/A | ✅ tabs + `?pbs=` | ✅ | ❌ | **⚠️ E2E ONLY** - Move-out date management |
| `/household/[shortname]/economy` | `household/[shortname]/[tab].vue` → `HouseholdEconomy.vue` | ❓ | N/A | ✅ tabs + `?pbs=` | ❌ | ❌ | **❌ NO TESTS** |
| **Other Routes** |
| `/` | `index.vue` → `Hero.vue` | N/A | N/A | N/A | ✅ | ✅ | **✅ COMPLIANT** — The four bands are one `v-for` over `getRainbowBand(i)` (`data-testid="landing-band-<i>"`); dark ink, AA on the base theme. The landing mockup lives in the page header comment |
| `/login` | `login.vue` → `Login.vue` | ✅ `useAuthStore()` | N/A | ✅ open state in a component ref (ADR-006) | ✅ `UserPreferences.e2e.spec.ts`, `MobileViewport.e2e.spec.ts` | ⚠️ via `UserPreferencesCard` / `UserProfileCard` specs | **⚠️ E2E ONLY** - Dashboard owns the composition: `UserProfileCard` (with the ⚙) and, while `preferencesOpen`, `UserPreferencesCard` under it; the login form itself is untested |
| `/dinner` | `dinner/index.vue` | ✅ `useEventStore()` | N/A | N/A | ❌ | ❌ | **❌ NO TESTS** |
| `/chef` | `chef/index.vue` | ✅ `usePlanStore()` | N/A | ✅ `?team=` | ✅ | ❌ | **⚠️ E2E ONLY** - Team tab switching with calendar reactivity |
| `/chef/dinner/[id]` | `chef/dinner/[id].vue` | ❓ | N/A | ✅ path params | ❌ | ❌ | **❌ NO TESTS** |

## Component Breakdown

### Admin Planning Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `AdminPlanning.vue` | `/admin/planning` | `usePlanStore()` | `useEntityFormManager()`, `useSeasonValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 7 tests | ✅ Full | **✅ COMPLIANT** — Card header is `LAYOUTS.cardActionRow` with `SeasonSelector` + `create-season` (`BUTTONS.primaryAction` + `ICONS.plusCircle`); `AdminPlanningSeason` `@edit` drives `?mode=edit` through `useEntityFormManager` (ADR-006/ADR-008); the save toast reports the `SeasonUpdateResponse` counts |
| `AdminPlanningSeason.vue` | `/admin/planning` | `usePlanStore()` (saving state) | `useSeasonValidation()`, `useSeason()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 16 tests | ✅ Indirect | **✅ COMPLIANT** — Title carries the season name (view / Rediger / Opret); `edit-season` (`BUTTONS.secondaryAction` + `ICONS.edit`, labelled `Rediger {shortName}`) in the card header in view mode with `canEdit`; footer `LAYOUTS.formButtonRow` with `BUTTONS.cancel` / `BUTTONS.save`; `id="seasonForm"` unchanged — colour via DS tokens |
| `AdminToCreateSeason.vue` | `/admin/planning`, `/admin/teams` | None (prop-driven) | `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 2 tests | ❌ | **✅ COMPLIANT** — `canEdit` gates the `create-first-season` CTA (`BUTTONS.primaryAction` + `ICONS.plusCircle`); both hosts pass `:can-edit` |
| `TicketPriceListEditor.vue` | `/admin/planning` | Parent props | `useTicketPriceValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 4 tests | ✅ Indirect | **✅ COMPLIANT** — `BUTTONS.secondaryAction` + `ICONS.ticket` add, `BUTTONS.edit` + `ICONS.trash` row remove; `name=` hooks replaced by `ticket-price-add` / `ticket-price-remove-${i}` — colour via DS tokens |

### Admin Team Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `AdminTeams.vue` | `/admin/teams` | `usePlanStore()`, `useHouseholdsStore()` | `useEntityFormManager()`, `useCookingTeam()`, `useQueryParam()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ❌ | ✅ Full | **⚠️ MISSING UNIT** — `?team=` query param bleeds to other tabs (parked); the table branch and its `#empty` slot (`ALERTS.emptyState` + `create-new-team`) serve VIEW and EDIT alike — the master-detail branch and the edit footer are gated on `displayedTeams.length > 0`, covered by two `AdminTeams.e2e.spec.ts` cases — colour via DS tokens |
| `CookingTeamCard.vue` | `/admin/teams` | `usePlanStore()`, `useHouseholdsStore()` | `useCookingTeam()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** — Uses shared InhabitantSelector + TeamMemberAddForm — colour via DS tokens |
| `TeamMemberAddForm.vue` | `/admin/teams` (via CookingTeamCard) | None | `useCookingTeamValidation()` | ✅ | ✅ | ✅ 13 tests | ✅ Indirect | **✅ COMPLIANT** |
| `InhabitantSelector.vue` | `/admin/teams`, future `/admin/households` | None | - | ✅ | ✅ | ✅ 22 tests | ✅ Indirect | **✅ COMPLIANT** — Moved to `shared/`; generic slots; empty state uses the `#empty` table slot — colour via DS tokens |

### Admin Household Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `AdminHouseholds.vue` | `/admin/households` | `useHouseholdsStore()` | - | ✅ | ✅ | ⚠️ Store tested | ✅ Full | **⚠️ COMPONENT TESTS** — Row expansion with HouseholdEditPanel, move/delete via store; empty state uses the `#empty` table slot (e2e: search without matches) — colour via DS tokens |
| `HouseholdEditPanel.vue` | `/admin/households` (via expand) | None (prop-driven) | - | ✅ | ✅ | ✅ 11 tests | ✅ Indirect | **✅ COMPLIANT** — colour via DS tokens |
| `HouseholdCard.vue` | `/admin/households`, `/household/[shortname]` | Parent props | `useHouseholdValidation()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** — colour via DS tokens |
| `InhabitantCard.vue` | `/admin/households`, `/household/[shortname]` | Parent props | `useInhabitantValidation()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** |
| `HouseholdListItem.vue` | `/admin/households` | Parent props | - | ✅ | ✅ | ❌ | N/A | **N/A DISPLAY** — colour via DS tokens |
| `HouseholdSettings.vue` | `/household/[shortname]/settings` | `useHouseholdsStore()` | `useBooking()`, `useHousehold()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ❌ | ✅ | **⚠️ E2E ONLY** - Move-out date management with pencil-gate edit flow — colour via DS tokens |

### Allergy Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `AdminAllergies.vue` | `/admin/allergies` | `useAllergiesStore()`, `useHouseholdsStore()` | `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 41 tests | ✅ Full | **✅ COMPLIANT** — Master/detail with a responsive detail mount point: `AllergyDetailPanel` in the sticky pane (md+) or docked under the tapped row (`#expanded`, `<md`); selection is the single state; spec parametrized over `isMd`; owns the households lookup; empty catalog CTA renders through the `#empty` table slot; the card header carries `AllergyNotes` on the store's `posterNotes`, with `canEdit` and a local `isSavingNotes`, and `@save` calling `savePosterNotes` then toasting "Bemærkninger gemt" — colour via DS tokens |
| `AllergyCatalogTable.vue` | `/admin/allergies`, `/chef` (via `AllergenMultiSelector`) | Parent props | `useAllergy()`, `useAllergyValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 17 tests | ✅ Indirect | **✅ COMPLIANT** — ONE catalog master table (`mode: 'single' \| 'multi'`); forwards `#expanded` + `#empty`; deduplicates the former AdminAllergies/AllergenMultiSelector tables — colour via DS tokens |
| `AllergyDetailPanel.vue` | `/admin/allergies` | None (prop-driven) | `useAllergyValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 13 tests | ✅ Indirect | **✅ COMPLIANT** — Portable detail (view / edit / create / delete-confirm); the "Detaljer" header carries the labelled `BUTTONS.secondaryAction` + `COLOR.primary` + `ICONS.edit` "Rediger <navn>" entry beside the ghost trash (docs/ui.md Edit affordances); identical testids at every mount point — colour via DS tokens |
| `AllergenMultiSelector.vue` | `/admin/allergies`, `/chef` | Parent props | `useAllergyValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 17 tests | ✅ Indirect | **✅ COMPLIANT** — Consumes `AllergyCatalogTable` (multi); mobile fixed summary bar jumps to the statistics panel — colour via DS tokens |
| `HouseholdAllergies.vue` | `/household/[shortname]/allergies` | `useAllergiesStore()`, `useHouseholdsStore()` | `useAllergyValidation()` | ✅ | ✅ | ❌ | ❌ | **❌ NO TESTS** — colour via DS tokens |
| `AllergyTypeCard.vue` | `/admin/allergies`, `/household/[shortname]/allergies` | Parent props + `usePlanStore()` (activeSeason read) | `useAllergyValidation()`, `useTicket()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 13 tests | ✅ Indirect | **✅ COMPLIANT** — Serves view/compact/edit **and create** (`allergyType` optional); household rendered via `UserListItem` `#badge` slot; per-inhabitant age badge (`getTicketTypeConfig`, HouseholdCard pattern); `<NuxtTime relative>` for timestamps (SSR-safe) — colour via DS tokens |
| `AllergyTypeDisplay.vue` | `/admin/allergies/pdf` | Parent props | `useAllergyValidation()` | ✅ | ✅ | ❌ | N/A | **N/A DISPLAY** |
| `AllergyNotes.vue` | `/admin/allergies` (card header), `/admin/allergies/pdf` | None (prop-driven) | `useSettingValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 14 tests | ✅ Indirect | **✅ COMPLIANT** — ONE "Vigtige bemærkninger" box for both surfaces; props `notes` / `canEdit` / `isSaving`, emits `save`; one note per line via `splitNotes`; `{...ALERTS.legend, ...ALERTS.withActions}` + `ICONS.warning`; the pencil is `BUTTONS.edit` + `aria-label="Rediger bemærkninger"` in `#actions` with `canEdit`; the edit face is a `UTextarea` (rows 5) over `LAYOUTS.formButtonRow` with `BUTTONS.cancel` / `BUTTONS.save`, closing when the parent's `isSaving` resolves; no `UTooltip` (the poster has no `UApp`); margins belong to the mount point |
| `AllergyManagersList.vue` | `/admin/allergies`, `/household/[shortname]/allergies`, `/admin/allergies/pdf` | `useUsersStore()` | `useUserValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ❌ | ❌ | **❌ NO TESTS** — API is now `kind?: AlertKind` (default `info`; poster passes `neutral`) instead of `color`/`variant`; its description `:ui` merges on top of the kind (ADR-018) |

### Form & Shared Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `FormModeSelector.vue` | `/admin/teams` | None | - | N/A | N/A | ✅ Full | ✅ Indirect | **✅ COMPLIANT** — `/admin/planning` uses the pencil + "Opret sæson" pair instead — colour via DS tokens |
| `SeasonSelector.vue` | `/admin/planning`, `/admin/teams` | `usePlanStore()` | `useSeasonSelector()` | ✅ | ✅ | ✅ Full | ✅ Indirect | **✅ COMPLIANT** — colour via DS tokens |
| `TableSearchPagination.vue` | `/admin/users`, `/admin/households` | None | `useTheSlopeDesignSystem()` | N/A | N/A | ✅ | ✅ Indirect | **✅ COMPLIANT** — colour via DS tokens |
| `SeasonStatusDisplay.vue` | `/admin/planning` | `usePlanStore()` | `useSeasonValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ | ✅ Indirect | **✅ COMPLIANT** — `alertConfig` maps season status → `ALERTS` kind (ACTIVE success, FUTURE info, CURRENT warning, PAST neutral) + `withActions` (ADR-018); activate = `BUTTONS.primaryAction` + `COLOR.success` + `ICONS.playCircle`/`ICONS.arrowRight` with `:loading`; spec migrated off the mocked store to the real `usePlanStore` + `registerEndpoint` (testing.md Rule 6) |
| `UserPreferencesCard.vue` | `/login` (dashboard, behind the ⚙ in `UserProfileCard`) | `useAuthStore()` | `useUserPreferenceValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 20 tests | ✅ `UserPreferences.e2e.spec.ts` | **✅ COMPLIANT** — "Mine indstillinger": view face + `BUTTONS.edit` pencil, edit face with a `USwitch` per channel (SMS disabled + hint without a phone), `URadioGroup` for palette and text scale bound to `COMPONENTS.choiceGroup`, `TYPOGRAPHY.sectionSubheading` section titles over body-size options, `LAYOUTS.formButtonRow` footer; the EU badge renders on the presets `PALETTES` gives a level; test-ids `pref-*` shared via `tests/component/components/user/userPreferencesTestIds.ts`; spec parametrized over `isMd`, real auth store with only the session faked |
| `UserProfileCard.vue` | `/login` (dashboard), `/admin/users` (expanded row) | `useAuthStore()`, `useUsersStore()` | `useUserRolesUi()`, `useHeynabo()`, `useCoreValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 6 tests (the ⚙ toggle) | ✅ Indirect | **✅ COMPLIANT** — Header action group carries `[⚙ Indstillinger]` (`BUTTONS.secondaryAction` + `COMPONENTS.cardAction.toggle`/`toggleActive` + `ICONS.settings`, `pref-toggle`, `aria-pressed`) for the current user only; the parent owns the open state (`preferencesOpen` prop, `toggle-preferences` emit, ADR-006); the role manager in `#footer` is still spec-less |
| `UserView.vue` | All routes (PageHeader) | `useAuthStore()` | `useUserValidation()` | ✅ | ✅ | ❌ | ❌ | **❌ NO TESTS** |
| `UserListItem.vue` | `/admin/users`, `/admin/allergies` | Parent props | `useUserValidation()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ `label`/`labelPlural` declared but not rendered (removed in #62)** — colour via DS tokens |
| `DangerButton.vue` | `/household/[shortname]/settings`, `/admin/economy` | None | - | N/A | N/A | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** - Two-click confirm pattern for destructive actions — colour via DS tokens |
| `QrCode.vue` | `/admin/allergies/pdf` | None (prop-driven) | `encodeQrPath()` (`app/utils/qr.ts`, `uqr`) | N/A | N/A | ✅ 3 tests (+ 5 unit on `encodeQrPath`) | ✅ Indirect | **✅ COMPLIANT** — Inline `<svg role="img">`, white `<rect>` + one black `<path>`, `data-testid="qr-code"`; literal `#000000`/`#ffffff` so it prints under `print-color-adjust: exact`; `aria-label` reads `<label>: <value>`; caption and layout belong to the page |

### Calendar Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `CalendarDatePicker.vue` | `/household/[shortname]/settings` | None | `useDateRangeValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ Full | ✅ Indirect | **✅ COMPLIANT** - Single date picker with UCalendar + validation; binds `calendarPickerProps('cookingDay')` (grid + selection preset); input opens the popover with `:trailing-icon="ICONS.calendar"` instead of a nested button |
| `CalendarDateRangePicker.vue` | `/admin/planning` | None | `useDateRangeValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ Full | ✅ Indirect | **✅ COMPLIANT** — `selection` prop picks the `CALENDAR.picker` preset (`cookingDay` pink, `holiday` green ring) and `calendarPickerProps` merges it with `COMPONENTS.calendarGrid`; both date inputs use `:trailing-icon="ICONS.calendar"` |
| `CalendarDateRangeListPicker.vue` | `/admin/planning` | None | `useSeasonValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 13 tests | ✅ Indirect | **✅ COMPLIANT** — Edit/create renders each row as a `CalendarDateRangePicker` (`selection="holiday"`, `name="holidayRangeList-${i}"`) validated against `holidaysSchema` before it reaches the model; view keeps read-only rows; holidays kept chronological via `sortDateRanges`; testids shared via `tests/component/components/admin/planningTestIds.ts` |
| `WeekDayMapDisplay.vue` | `/admin/planning`, `/admin/teams` | None | `useWeekday()` | ✅ | ✅ | ✅ 9 tests | ✅ Indirect | **✅ COMPLIANT** — Added `hideRestricted` prop; compact view only renders active days |
| `WeekDayMapDinnerModeDisplay.vue` | `/household/[shortname]/settings` | None | `useWeekday()`, `useDinnerMode()` | ✅ | ✅ | ❌ | ❌ | **❌ NO TESTS** |
| `BaseCalendar.vue` | All calendar displays | None | `useTheSlopeDesignSystem()`, `useCalendarEvents()` | N/A | N/A | ❌ | N/A | **N/A DISPLAY** — spreads `COMPONENTS.calendarGrid` |
| `CalendarDisplay.vue` | `/admin/planning` | None | `useSeason()`, `useCalendarEvents()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ `CalendarDisplay.nuxt.spec.ts` | ❌ | **✅ COMPLIANT** - potential-cooking/generated-events preview on `PLANNING_CALENDAR` + `SIZES.calendarCircle` |
| `ChefCalendarDisplay.vue` | `/chef` | Parent props | `useTemporalCalendar()` | ✅ | ✅ | ❌ | ✅ | **⚠️ E2E ONLY** - Uses MaybeRefOrGetter for reactivity; agenda empty state uses the `#empty` table slot (untested) — colour via DS tokens |
| `DinnerCalendarDisplay.vue` | `/dinner`, `/household/[shortname]/bookings` | Parent props | `useTemporalCalendar()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ E2E ONLY** - DRY with ChefCalendarDisplay |
| `TeamCalendarDisplay.vue` | `/admin/teams`, `/chef` | Parent props | - | ✅ | ✅ | ❌ | ❌ | **❌ NO TESTS** |

### Household Booking Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `HouseholdBookings.vue` | `/household/[shortname]/bookings` | `usePlanStore()`, `useHouseholdsStore()`, `useBookingsStore()` | `useBookingView()`, `useBooking()` | ✅ | ✅ | ❌ | ✅ Full | **⚠️ MISSING UNIT** - E2E arrow-nav (`HouseholdBookings.e2e.spec.ts`) + day-view + cross-household covered |
| `BookingGridView.vue` | `/household/[shortname]/bookings` | Parent props | `useBooking()`, `useBookingUi()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 16 tests | ✅ Indirect | **✅ COMPLIANT** - ADR-016 week/month grid; `tableData` returns `[]` when `flatEvents` is empty so the `UTable` `#empty` slot (`ALERTS.emptyState`, `getRandomEmptyMessage('noDinners')`) renders for a period with no dinners; legend delegated to `DinnerModeLegend` |
| `BookingViewSwitcher.vue` | `/household/[shortname]/bookings` | Parent props | `useBookingView()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** - Day/week/month toggle — colour via DS tokens |
| `ActionPreview.vue` | `/household/[shortname]/bookings`, `/admin/economy` | Parent props | `useBookingUi()` | ✅ | ✅ | ✅ | ✅ Indirect | **✅ COMPLIANT** - Shows booking changes before save |
| `GuestBookingForm.vue` | `/household/[shortname]/bookings`, `/admin/economy` | Parent props | `useBooking()`, `useBookingUi()`, `useBookingValidation()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** - Guest ticket form — colour via DS tokens |
| `DinnerBookingForm.vue` | `/dinner`, `/household/[shortname]/bookings`, `/admin/economy` | `useBookingsStore()`, `useAuthStore()` | `useBooking()`, `useBookingUi()`, `useBookingValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ | ✅ Serial | **✅ COMPLIANT** - ADR-016 booking form, admin override support; legend delegated to `DinnerModeLegend` — colour via DS tokens |
| `DinnerModeLegend.vue` | `/household/[shortname]/bookings` (day + grid), `/dinner` | Parent props | `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 4 tests | ✅ Indirect | **✅ COMPLIANT** — THE "Forklaring" panel (`ALERTS.legend`); deduplicates the identical legends in `BookingGridView` and `DinnerBookingForm`; `modes`/`showNoConsensus`/`showModified`/`hint` props |
| `DinnerEvent.vue` | `/household/[shortname]/bookings`, `/dinner` | Parent props | `useDinnerEvent()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** |
| `DinnerTicket.vue` | `/household/[shortname]/bookings` | Parent props | `useTicket()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** — colour via DS tokens |
| `KitchenPreparation.vue` | `/dinner`, `/chef`, `/chef/dinner/[id]` | Parent props | `useOrder()`, `useAllergy()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** — The three dining modes walk `RAINBOW` (TAKEAWAY pink, SPISESAL orange, SPIS SENT ocean); TIL SALG is `gray-400`. Dark ink, AA on the base theme. Colour order is in the component header mockup |

### Layout Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `PageHeader.vue` | All routes (app.vue) | `useAuthStore()` | - | ✅ | N/A | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** — colour via DS tokens |
| `PageFooter.vue` | All routes (app.vue) | None | - | N/A | N/A | ❌ | N/A | **N/A LAYOUT** |
| `ViewError.vue` | All routes (error handler) | None | - | N/A | N/A | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** — colour via DS tokens |
| `Loader.vue` | All routes (loading states) | None | - | N/A | N/A | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** |
| `Ticker.vue` | `/` (landing page) | None | - | N/A | N/A | ❌ | N/A | **N/A DISPLAY** — `PANTONE_CHIPS` follows `PANTONE_FAMILIES`, so the tints run in the order of the bands below |
| `HelpButton.vue` | Various admin routes | None | - | N/A | N/A | ❌ | N/A | **N/A UTILITY** — colour via DS tokens |

## Store Compliance

| Store | ADR-007 useFetch | ADR-007 Status Computeds | ADR-007 isReady | ADR-007 watch:false | Component Tests | Status |
|-------|------------------|--------------------------|-----------------|---------------------|-----------------|--------|
| `plan.ts` | ✅ | ✅ | ✅ | ✅ | ✅ Full | **✅ COMPLIANT** — `updateSeason()` returns the parsed `SeasonUpdateResponse` envelope (ADR-009) and refreshes the season list and selection |
| `households.ts` | ✅ | ✅ | ✅ | ✅ | ✅ Full | **✅ COMPLIANT** - `setMoveOutDate()`, `lastMoveOutResult`, `moveInhabitant()`, `deleteHousehold()`, `lastMoveResult`, `updateInhabitantPreferences()`, `updateAllInhabitantPreferences()`, `initHouseholdsStore(shortName?, pbsId?)` disambiguation |
| `allergies.ts` | ✅ | ✅ | ✅ | ✅ | ✅ Full | **✅ COMPLIANT** — Catalog converted from `useFetch` to `useAsyncData` + `useRequestFetch`; `isAllergyTypesInitialized` checks data presence (ADR-007 rule 3); mutations refetch the catalog; catalog `transform` parses with `AllergyTypeDetailSchema` so dates are domain types (ADR-010). `posterNotes` is a second `useAsyncData` slice on `GET /api/admin/setting/allergy-poster-notes` with its own `isPosterNotesLoading` / `isPosterNotesErrored` / `isPosterNotesInitialized` and `loadPosterNotes` / `savePosterNotes`; it stays out of `isAllergyStoreReady` so the poster prints its notes while the catalog loads, and falls back to the registry default |
| `users.ts` | ✅ | ✅ | ✅ | ✅ | ❌ | **⚠️ MISSING TESTS** |
| `auth.ts` | N/A | ✅ | N/A | N/A | ✅ via `UserPreferencesCard.nuxt.spec.ts` | **✅ COMPLIANT** - Uses `usePermissions()` for role checks, `isMemberOfHousehold()` (session-aware wrapper over `isInHousehold`, ADR-017); own settings: `notificationChannels`, `appearance` (both fall back to the column defaults), `savePreferences()` → POST + session `fetch()` + toast, `sendTestNotification()` → POST + toast per result |
| `event.ts` | ❓ | ❓ | ❓ | ❓ | ❌ | **❓ AUDIT NEEDED** |
| `tickets.ts` | ❓ | ❓ | ❓ | ❓ | ❌ | **❓ AUDIT NEEDED** |
| `bookings.ts` | ✅ | ✅ | ✅ | ✅ | ❌ | **✅ COMPLIANT** - ADR-016 scaffold methods, `processAdminCorrection()` for admin bypass, `useRequestFetch()` for SSR |

## Composable Compliance

| Composable | ADR-001 Zod Schemas | ADR-001 Enum Re-export | ADR-010 Domain Types | Unit Tests | Status |
|------------|---------------------|------------------------|----------------------|------------|--------|
| **Validation Composables** |
| `useCoreValidation()` | ✅ | ✅ `SystemRoleSchema`, `DinnerModeSchema` | ✅ User, Inhabitant, Household (Display + Detail) | ✅ Full | **✅ COMPLIANT** - Merged useUserValidation + useHouseholdValidation via fragment pattern (ADR-001) |
| `useBookingValidation()` | ✅ | ✅ `OrderStateSchema`, `DinnerModeSchema` | ✅ Order, DinnerEvent, DesiredOrder, ScaffoldResult, HouseholdUpdateResponse | ✅ Full | **✅ COMPLIANT** - ADR-016 schemas, operation result types (ADR-009) |
| `useSeasonValidation()` | ✅ | ✅ | ✅ SerializedSeason, SeasonUpdateResponse | ✅ Full | **✅ COMPLIANT** — holidays serialized/deserialized in chronological order; owns the `SeasonUpdateResponse` operation result (ADR-009) |
| `useCookingTeamValidation()` | ✅ | ✅ | ✅ Domain types | ✅ Full | **✅ COMPLIANT** |
| `useAllergyValidation()` | ✅ | ✅ | ✅ Domain types | ✅ Full | **✅ COMPLIANT** |
| `useTicketPriceValidation()` | ✅ | ✅ | ✅ Domain types | ✅ Full | **✅ COMPLIANT** |
| `useDateRangeValidation()` | ✅ | N/A | ✅ DateRange schemas (required + nullable end) | ✅ Full | **✅ COMPLIANT** - Factory pattern for date range schemas with composable refinements |
| `useWeekDayMapValidation()` | ✅ | N/A | ✅ Generic WeekDayMap<T> | ✅ Full | **✅ COMPLIANT** - Generic weekday map validation factory |
| `useBillingValidation()` | ✅ | ✅ | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Billing, transaction, invoice schemas |
| `useHeynaboValidation()` | ✅ | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Heynabo import response schemas |
| `useMaintenanceValidation()` | ✅ | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Season import response schemas; `MONTHLY_BILLING` result summary = `MonthlyBillingJobResult` (`{results, periods}`, periods default `[]` for older runs) |
| `useMaintenance()` | N/A | N/A | ✅ Domain types | ✅ `useMaintenance.nuxt.spec.ts` | **✅ COMPLIANT** - Job labels, result parsing and stats; `formatMonthlyBillingStats` reports what the run billed and did (`CSV uploadet`, `Mails sendt`, `Afventer`) — one formatter for the toast, the cards and the job-run table |
| `useDeliveryValidation()` | ✅ | ✅ `DeliveryKindSchema`, `DeliverySubjectSchema` | ✅ Delivery, DeliveredVersions | ✅ Full | **✅ COMPLIANT** - Delivery facts (ADR-015 convergence): schemas + pure `deliveredVersions` reducer; isomorphic (ADR-017) |
| `useNotificationValidation()` | ✅ | N/A | ✅ Contract types | ✅ via `workers/sender/test/contract.unit.spec.ts` + `tests/component/utils/sender/*` | **✅ COMPLIANT** - Re-exports the sender contract (`workers/sender/contract.ts`); `NotificationConfigSchema` (runtimeConfig + app.config templates), sender event bodies, `SenderEmitResultSchema`; isomorphic (ADR-017) |
| `useSettingValidation()` | ✅ | N/A | ✅ SettingDetail (one entity type, ADR-009) | ✅ Full | **✅ COMPLIANT** - THE settings file: `SETTING_KEYS`, `SettingKeySchema`, `SettingDetailSchema` (nullable `updatedAt`/`updatedByUserId` for an unwritten key) and `SETTING_REGISTRY` (`valueSchema`, `defaultValue`, `canWrite`), plus `DEFAULT_ALLERGY_POSTER_NOTES` and `splitNotes`. Isomorphic (ADR-017): explicit imports, including `canMutateAllergies` from `usePermissions`; imported by the repository, the authorization helper and both endpoints |
| `useUserPreferenceValidation()` | ✅ | ✅ `NotificationChannelSchema` | ✅ Appearance, UserPreferencesUpdate | ✅ Full | **✅ COMPLIANT** - The two `User` settings columns: `PaletteSchema`, `TextScaleSchema`, `AppearanceSchema` + `DEFAULT_APPEARANCE`, `DEFAULT_NOTIFICATION_CHANNELS`, `PALETTES` (per preset: the contrast level the card badges, and `colourSafe` for the preset built on the Color Universal Design anchors); three presets — `default`, `tydelig`, `colorblind`; the single source of a preset's level: `tests/component/architecture/palettes.ts` derives the measured palettes from it, so the badge and the contrast assertion are one value; isomorphic (ADR-017), imported by `domainFragments.ts` and the preferences endpoint |
| **Business Logic Composables** |
| `useBooking()` | N/A | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - ADR-016 `decideOrderAction`, bucket resolvers, `resolveUserBookingBuckets()`; ADR-017 isomorphic (explicit imports; badges/action preview moved to `useBookingUi`, `DINNER_STEP_MAP` icon-free) |
| `useHousehold()` | N/A | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - `isHouseholdActiveOnDay()` residency predicate (ADR-016), `getResidencyStatus()`, consensus, name formatting |
| `useSeason()` | ✅ | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Exposes pre-configured `splitDinnerEvents`, `getNextDinnerDate`, `getAdjacentDinner` (the last powers `useBookingView` arrow nav) ; ADR-017 explicit imports |
| `useCookingTeam()` | ✅ | ✅ | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - ADR-017 explicit imports |
| `useBilling()` | N/A | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Billing business logic |
| `useHeynabo()` | N/A | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Heynabo import merge logic, `mergeHouseholdForUpdate()`, `resolveInhabitantImportPlan()` (4-bucket inhabitant plan: ADR-016 decide/execute, global deletion + placement routing) |
| `useOrder()` | N/A | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Order business logic |
| `useTicket()` | N/A | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Ticket display logic; `ticketTypeConfig.compactLabel` (V/B/b single source, read by `formatTicketCounts`); `groupInhabitantsByTicketCategory` aggregator; `getTicketTypeConfig` falls back to `determineTicketType` (never silently ADULT) |
| `useUserRoles` (module) | N/A | N/A | ✅ Domain types | ✅ Unit | **✅ COMPLIANT** - Server-safe `reconcileUserRoles` / `ROLE_OWNERSHIP` only (ADR-017); display moved to `useUserRolesUi` |
| **UI/Navigation Composables** |
| `useBookingView()` | ✅ `BookingViewSchema` | N/A | ✅ DateRange | ✅ Full | **✅ COMPLIANT** - ADR-006 URL-synced view/date for booking calendar. Single `findAdjacent(direction)` helper (boundary from `getPeriodBoundary` → `getAdjacentDinner`) replaces per-view switches; `seasonDates` option dropped (implicit via `dinnerDates`) |
| `useEntityFormManager()` | N/A | N/A | N/A | ✅ Full | **✅ COMPLIANT** |
| `useTabNavigation()` | N/A | N/A | N/A | ✅ Full | **✅ COMPLIANT** |
| `useSeasonSelector()` | N/A | N/A | N/A | ✅ Full | **✅ COMPLIANT** |
| `useQueryParam()` | N/A | N/A | N/A | ✅ Full | **✅ COMPLIANT** - Generic query param composable for URL state |
| `useApiHandler()` | N/A | N/A | N/A | ✅ Full | **✅ COMPLIANT** |
| `usePermissions()` | N/A | ✅ `SystemRoleSchema` | N/A | ✅ Full | **✅ COMPLIANT** - Isomorphic permission predicates (ADR-017); session-aware `isMemberOfHousehold` lives on the auth store |
| `useBookingUi()` | N/A | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Pure UI composable (ADR-017): deadline badges, `STEP_ICONS`, `formatActionPreview`; never server-imported |
| `useUserRolesUi()` | N/A | N/A | N/A | ✅ Full | **✅ COMPLIANT** - Pure UI composable (ADR-017): role labels/icons/`visibleRoles` from the auth store |
| `useTemporalCalendar()` | N/A | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Uses `MaybeRefOrGetter` + `toValue()` for reactive inputs, shared by ChefCalendarDisplay and DinnerCalendarDisplay (DRY) |
| `useTheSlopeDesignSystem()` | N/A | N/A | N/A | ✅ `withActions` branch | **N/A UTILITY** - Page layout + design tokens only (ADR-017); no longer reachable from `server/`. Owns `ALERTS` (+ `AlertKind`, `withActions`) alongside `BUTTONS`, `COMPONENTS.calendarGrid` and `CALENDAR.picker` (+ `calendarPickerProps`, `CalendarPickerSelection`); owns every colour value in the app (`COLOR`, `BG`, `TEXT`, `BORDER`, `RING`, `TYPOGRAPHY`, `BACKGROUNDS`, `PANTONE_CHIPS`); usage enforced by four rules in `tests/component/architecture/designSystemUsage.unit.spec.ts` (ADR-018) plus the two colour rules; the values are measured by `designSystemContrast.unit.spec.ts` (EN 301 549 → WCAG 2.1, per palette preset) and `designSystemColourVision.unit.spec.ts` (WCAG 2.1 §1.4.1, meanings under protanopia / deuteranopia / tritanopia) |

## ADR Compliance Summary

### ADR-001: Core Framework and Technology Stack
**Status:** ✅ **Fully Compliant**

**Three-layer architecture strictly enforced:**

1. **Generated Layer** (`~~/prisma/generated/zod/`)
   - ✅ Stays in repository (committed to git)
   - ✅ ONLY imported by validation composables
   - ✅ Never imported by application code

2. **Validation Layer** (`composables/use*Validation.ts`)
   - ✅ All validation composables import from generated layer
   - ✅ Re-export enum schemas for application code
   - ✅ Define Zod validation schemas
   - ✅ Export TypeScript types via `z.infer`

3. **Application Layer** (stores, components, pages)
   - ✅ Import ONLY from validation composables
   - ✅ Use `.enum` property for runtime values
   - ✅ No string literals for enum values
   - ✅ No direct imports from `~~/prisma/generated/zod`

**Issues:**
- None identified

### ADR-006: URL-Based Navigation
**Status:** ✅ **Compliant**

All admin and household pages use:
- ✅ Path-based routing for tabs (`/admin/[tab].vue`)
- ✅ Query parameters for form mode (`?mode=edit|create|view`)
- ✅ Dynamic tab loading with async components
- ✅ Household URLs use `?pbs=X` for disambiguation (`getHouseholdUrl()` utility in `app/utils/household.ts`)
- ✅ `?pbs` preserved on tab switches (via `useTabNavigation` query passthrough) and index redirects

**Issues:**
- None identified

### ADR-007: SSR-Friendly Store Pattern
**Status:** ⚠️ **Partially Compliant**

**Compliant stores:**
- ✅ `plan.ts` - Full compliance (tested)
- ✅ `households.ts` - Full compliance (tested)
- ✅ `allergies.ts` - Full compliance (tested)
- ✅ `users.ts` - Full compliance (not tested)

**Needs audit:**
- ❓ `event.ts` - Not audited
- ❓ `tickets.ts` - Not audited

**Note:** `auth.ts` uses `useUserSession()` from nuxt-auth-utils (not `useAsyncData`), so ADR-007 patterns don't fully apply. It's compliant for its use case.

### ADR-008: useEntityFormManager Pattern
**Status:** ⚠️ **Partially Compliant**

**Compliant:**
- ✅ `AdminPlanning.vue` - Full usage (tested)
- ✅ `AdminTeams.vue` - Partial usage (tested)

**Needs audit:**
- ❓ `AdminHouseholds.vue` - Not audited
- ❓ Other CRUD forms

### ADR-010: Domain-Driven Serialization
**Status:** ✅ **Compliant**

All components and stores work with domain types:
- ✅ UI/Client: Domain types (Season with Date objects, arrays)
- ✅ HTTP: Domain types (transparent via $fetch)
- ✅ Store: Domain types throughout
- ✅ Repository: Handles serialization (backend concern)

**Issues:**
- None identified

## Test Coverage Summary

### E2E Test Coverage (Playwright)

**Full Coverage:**
- ✅ Landing page (`pages.e2e.spec.ts`)
- ✅ Admin planning (`AdminPlanning.e2e.spec.ts`, `AdminPlanningSeason.e2e.spec.ts`)
- ✅ Admin teams (`AdminTeams.e2e.spec.ts`)
- ✅ Admin households (`AdminHouseholds.e2e.spec.ts`)
- ✅ Admin economy (`AdminEconomy.e2e.spec.ts` - serial, admin corrections)
- ✅ Household members (`HouseholdMembers.e2e.spec.ts`)
- ✅ Household navigation (`household.e2e.spec.ts`)
- ✅ Household bookings (`DinnerBookingForm.e2e.spec.ts` - serial, `HouseholdBookingsCrossHousehold.e2e.spec.ts`)
- ✅ Public billing (`PublicBilling.e2e.spec.ts`)
- ✅ Chef page (`Chef.e2e.spec.ts` - team tab switching, calendar reactivity)
- ✅ Household settings (`household.e2e.spec.ts` - move-out date management, tab navigation)

- ✅ Admin allergies (`AdminAllergies.e2e.spec.ts` - catalog CRUD)

**Missing E2E:**
- ❌ Admin users
- ❌ Admin settings
- ❌ Household allergies
- ❌ Household economy
- ❌ Login flow
- ❌ Dinner calendar
- ❌ Chef dinner editing

### Component Test Coverage (Vitest + Nuxt)

**Full Coverage:**
- ✅ Calendar components (`CalendarDatePicker`, `CalendarDateRangePicker`, `CalendarDateRangeListPicker`)
- ✅ Form components (`FormModeSelector`, `SeasonSelector`)
- ✅ Composables (`useEntityFormManager`, `useTabNavigation`, `useSeasonSelector`, `useApiHandler`, `useSeason`, `useCookingTeam`, `useTemporalCalendar`)
- ✅ Stores (`plan`, `households`, `allergies`)
- ✅ Landing (`Hero.vue`)

**Partial Coverage (indirect via E2E):**
- ⚠️ `AdminPlanning` components
- ⚠️ `AdminTeams` components
- ⚠️ `AdminHouseholds` components

**Missing Component Tests:**
- ❌ Most form components (tested indirectly via E2E)
- ❌ Calendar display components
- ❌ Allergy components
- ❌ Layout components (ViewError, Loader, etc.)
- ✅ Validation composables (all `use*Validation()` composables have comprehensive unit tests)
- ✅ Booking components (`ActionPreview.nuxt.spec.ts`, `DinnerBookingForm.nuxt.spec.ts`, `useBooking.nuxt.spec.ts`)

## Priority Actions

### High Priority (Critical Gaps)

1. **Store Audits** - Audit remaining 3 stores for ADR-007 compliance
   - `auth.ts`
   - `event.ts`
   - `tickets.ts`

2. **Validation Composable Tests** - ✅ COMPLETE
   - All `use*Validation()` composables now have comprehensive unit tests
   - Tests cover schemas, serialization/deserialization, validation rules, and edge cases
   - All tests passing (262 tests across 8 validation composables)

3. **Core Component Tests** - Add component tests for high-risk components
   - `UserProfileCard.vue` (role management UI needs component tests)
   - `HouseholdAllergies.vue` (complex state management)
   - `HouseholdBookings.vue` (booking flow)

### Medium Priority (Coverage Gaps)

4. **E2E Coverage** - Add E2E tests for untested user flows
   - Login flow (authentication)
   - Admin users (system roles)
   - Household allergies (user-facing CRUD)
   - Household settings (profile management)

5. **Component Test Cleanup** - Add unit tests for display components
   - Error handling components (`ViewError`, `Loader`)
   - Card components (already tested via E2E but should have unit tests)

### Low Priority (Nice to Have)

6. **Documentation Components** - Test documentation/help components
   - `HelpButton.vue`
   - Layout components

7. **Calendar Components** - Component tests for calendar displays
   - Already tested via E2E but would benefit from unit tests

## Compliance Checklist

Use this checklist when creating/reviewing frontend components.

### Critical Architectural Principles

**Before implementing ANY frontend code, understand these core principles:**

1. **🎨 NuxtUI First** - Use NuxtUI components (UButton, UInput, UCard, USelect) instead of custom HTML. We use the Nuxt ecosystem.

2. **📱 Mobile First** - 90% of users on mobile. Design mobile-first, use `isMd` (injected from layout) for desktop enhancements, use Tailwind `md:` breakpoint for responsive styling.

3. **📡 Stores Own Network** - ALL API calls (`$fetch`) happen in stores. Components/pages NEVER call APIs directly. (ADR-007)

4. **✅ Validation Composables Are Truth** - ALL validation schemas, types, and enums live in `use*Validation.ts` composables. Application code imports from there, NEVER from `~~/prisma/generated/zod` or `@prisma/client`. (ADR-001)

5. **🔄 Three-Layer Architecture** (ADR-001):
   - **Generated Layer** (`~~/prisma/generated/zod/`) → **Validation Layer** (`use*Validation.ts`) → **Application Layer** (components, stores, pages)
   - Each layer imports from the previous layer only
   - Application code gets everything from validation composables

6. **🎯 Domain Types Everywhere** - Work with domain types (Season with Date objects) throughout application code. Serialization happens in repository layer. (ADR-010)

---

### Components (Application Layer)

**UI & Presentation:**
- [ ] **CRITICAL:** Use NuxtUI components (UButton, UInput, UCard, USelect, UCheckbox, etc.) instead of hand-coded HTML (Nuxt stack principle)
- [ ] **CRITICAL:** Bind design-system tokens, never raw Nuxt UI props, on a family that has one (`v-bind="ALERTS.<kind>"`, `v-bind="BUTTONS.<role>"`, `v-bind="COMPONENTS.calendarGrid"`) — enforced by `tests/component/architecture/designSystemUsage.unit.spec.ts` (ADR-018)
- [ ] **CRITICAL:** Colour comes from the design system - `:color="COLOR.<name>"` or a domain token, and `BG`/`TEXT`/`BORDER`/`RING`/`TYPOGRAPHY` for classes; a Tailwind palette shade or a literal colour prop fails `tests/component/architecture/designSystemUsage.unit.spec.ts` (see docs/ui.md)
- [ ] **CRITICAL:** Mobile-first responsive design - 90% of users on mobile
- [ ] **CRITICAL:** DRY components - extract repeated logic into reusable atomic components
- [ ] **CRITICAL:** Clean template structure - use single if-else instead of checking same condition multiple times (e.g., `v-if="isTitle"` / `v-else` instead of `v-if="isTitle"` / `v-else-if="!isTitle && ..."`)
- [ ] Inject `isMd` from layout via `inject<Ref<boolean>>('isMd')` for reactive breakpoint detection
- [ ] Use `md:` breakpoint in Tailwind classes for responsive styling
- [ ] For NuxtUI component props (colors, variants, size), use `isMd` ref to switch between mobile/desktop values
- [ ] Use `name` attribute for form elements (E2E test selectors)
- [ ] Use `data-testid` for complex UI components that may not forward `name` to DOM

**Data & Types:**
- [ ] **CRITICAL:** NO direct API calls (`$fetch`) in components - ALL network communication goes through stores (ADR-007)
- [ ] **CRITICAL:** Import types/enums ONLY from validation composables, NEVER from `~~/prisma/generated/zod` or `@prisma/client` (ADR-001)
- [ ] Use domain types from validation composables (ADR-010)
- [ ] Use `.enum` property for enum values (e.g., `TicketTypeSchema.enum.ADULT`)
- [ ] NO validation logic in components - ALL validation in validation composables (ADR-001)

**State Management:**
- [ ] Interact with stores for all server data (read/write)
- [ ] Own UI state only (formMode, draft, UI flags)
- [ ] Show reactive loaders based on store's `isReady` flags (ADR-007)

**Testing:**
- [ ] Component tests for components with logic
- [ ] E2E tests for user-facing flows
- [ ] Adequate test coverage (see test coverage tables)

### Pages (Application Layer)

**Initialization & Navigation:**
- [ ] **CRITICAL:** Store initialization is synchronous - NO `await` on init (ADR-007)
- [ ] Show reactive loaders based on `isStoreReady` (ADR-007)
- [ ] Use URL parameters for navigation state (ADR-006)
- [ ] Path-based routing for tabs, query params for modes (`?mode=edit`)

**Data & State:**
- [ ] **CRITICAL:** NO direct API calls - ALL network communication through stores
- [ ] **CRITICAL:** Import types/enums from validation composables only (ADR-001)
- [ ] Use `useEntityFormManager` for CRUD forms (ADR-008)
- [ ] Pages coordinate between stores and components, don't own data

**Testing:**
- [ ] E2E test coverage for critical user paths

### Stores (Application Layer)

**Data Fetching:**
- [ ] **CRITICAL:** Prefer `useAsyncData` over `useFetch` (ADR-007)
- [ ] **CRITICAL:** ALL API calls happen in stores - NO direct $fetch in components/pages (ADR-007)
- [ ] Use unique string keys for static endpoints, computed keys for reactive (ADR-007)
- [ ] Internal watchers for reactive initialization (ADR-007)

**State Management:**
- [ ] Export status-derived computeds: `isLoading`, `isErrored`, `isInitialized`, `isEmpty` (ADR-007)
- [ ] Export `isStoreReady` convenience computed combining all checks (ADR-007)
- [ ] Expose raw error ref for statusCode access (ADR-007)
- [ ] Provide `refresh()` actions wrapping `useAsyncData` refresh (ADR-007)
- [ ] Init methods are synchronous - NO async/await (ADR-007)

**Types & Validation:**
- [ ] **CRITICAL:** Import types/enums from validation composables, NEVER from generated layer or @prisma/client (ADR-001)
- [ ] Work with domain types throughout (ADR-010)
- [ ] NO validation logic in stores - validation in composables only

**Testing:**
- [ ] Component tests for store logic (initialization, CRUD actions, computeds)
- [ ] Mock endpoints using `registerEndpoint` pattern
- [ ] Use `clearNuxtData()` in `beforeEach()` to prevent test pollution

### Validation Composables (Validation Layer - `use*Validation.ts`)

**Single Source of Truth:**
- [ ] **CRITICAL:** ALL validation schemas defined here - NEVER in components, stores, or pages (ADR-001)
- [ ] **CRITICAL:** ALL types exported via `z.infer` - application code imports types from here (ADR-001)
- [ ] **CRITICAL:** ALL enum schemas re-exported - application code gets enums from here (ADR-001)

**Schema Definition:**
- [ ] Import enum schemas from `~~/prisma/generated/zod` ONLY (not @prisma/client) (ADR-001)
- [ ] Re-export enum schemas for application code (ADR-001)
- [ ] Define all validation schemas using Zod (ADR-001)
- [ ] Export TypeScript types via `z.infer` (ADR-001)

**Domain Serialization (if needed):**
- [ ] Define domain types (ADR-010)
- [ ] Define serialized types for database format (ADR-010)
- [ ] Export serialize/deserialize functions (ADR-010)
- [ ] Transformation functions stay in validation composable

**Testing:**
- [ ] Unit tests for all validation schemas
- [ ] Unit tests for serialize/deserialize functions
- [ ] Unit tests for edge cases and validation rules

### Business Logic Composables (`use*.ts`)

**Types & Validation:**
- [ ] **CRITICAL:** Import types/enums from validation composables ONLY (ADR-001)
- [ ] NO validation schemas here - validation in `use*Validation.ts` only
- [ ] Work with domain types from validation composables (ADR-010)

**Logic & Utilities:**
- [ ] Complex business logic and calculations
- [ ] Default value creation
- [ ] Domain-specific utilities
- [ ] Functions depending on multiple composables

**Testing:**
- [ ] Unit tests for all complex logic functions
- [ ] Parametrized tests for similar cases with different data

## Fully Compliant Examples

Reference these components for correct ADR implementation:

### Pages & Components
- ✅ `AdminPlanning.vue` + `useEntityFormManager` - ADR-006, ADR-007, ADR-008 pattern
- ✅ `AdminTeams.vue` - Partial useEntityFormManager usage
- ✅ `SeasonSelector.vue` - Reactive store integration
- ✅ `CalendarDateRangeListPicker.vue` - Pure component with proper testing

### Stores
- ✅ `plan.ts` - Full ADR-007 compliance with reactive initialization
- ✅ `households.ts` - Full ADR-007 compliance with dynamic tab pattern
- ✅ `allergies.ts` - Full ADR-007 compliance

### Composables
- ✅ `useSeasonValidation()` - ADR-001 three-layer architecture (imports from generated, re-exports enums, defines validation schemas)
- ✅ `useOrderValidation()` - ADR-001 validation layer pattern with ADR-010 domain types
- ✅ `useCookingTeam()` - Business logic composable with tests (imports from validation layer)
- ✅ `useBooking()` - ADR-016 order decision logic (`decideOrderAction`, bucket resolvers)
- ✅ `useEntityFormManager()` - Form management pattern
- ✅ `useTabNavigation()` - URL navigation pattern
- ✅ `useTemporalCalendar()` - `MaybeRefOrGetter` + `toValue()` pattern for reactive composable inputs (DRY shared by calendar displays)

### Tests
- ✅ `tests/component/stores/plan.nuxt.spec.ts` - Store testing pattern
- ✅ `tests/component/components/calendar/CalendarDateRangeListPicker.nuxt.spec.ts` - Component testing best practices
- ✅ `tests/e2e/ui/AdminPlanning.e2e.spec.ts` - E2E testing pattern with factories
- ✅ `tests/e2e/ui/Chef.e2e.spec.ts` - E2E testing with proper beforeAll/afterAll cleanup, salted test data
