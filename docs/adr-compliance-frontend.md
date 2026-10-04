# ADR Compliance - Frontend Routes & Components

**Generated:** 2025-11-11
**Last Updated:** 2026-10-04
**History:** git and the feature plans under `docs/features/` (shipped plans in `docs/features/archived/`)

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
| `/admin/system` | `admin/[tab].vue` → `AdminSystem.vue` | ⚠️ `useUsersStore()`, `useHouseholdsStore()`, `useBookingsStore()`; the job history is a component `useFetch` | N/A | ✅ tabs | ✅ `admin.e2e.spec.ts`, `MobileViewport.e2e.spec.ts` | ⚠️ `AdminSystem.nuxt.spec.ts` (job history) | **⚠️ PARTIAL** — On a phone the job history shows Dato, Job, Status and a chevron (`BUTTONS.edit`, `job-history-expand-<id>`); Varighed, Kilde and Resultat open in `job-history-details`; `columnVisibility(HIDDEN_ON_PHONE, ['expand'])` shows every column from md, where an open row closes; the settings tree keeps its ellipsis |
| `/admin/allergies/pdf` | `admin/allergies/pdf.vue` | ✅ `useAllergiesStore()`, `usePlanStore()` | N/A | N/A | ✅ Smoke | ✅ 5 tests | **✅ COMPLIANT** — Age categories via `groupInhabitantsByTicketCategory` + `formatTicketCounts` (V/B/b), active-season age limits, DS typography; the no-print controls bind `BUTTONS.secondaryAction` + `ICONS.arrowLeft` (Tilbage) and `BUTTONS.primaryAction` + `ICONS.printer` (Print); notes render through `AllergyNotes` on the store's `posterNotes` — the same Setting row the catalog header edits, read-only here; the QR is the shared `QrCode` on `qrCodeUrl` and prints with the poster, the table + QR row is `flex-col md:flex-row` on screen and `row` in the print block |
| **Household Routes** |
| `/household/[shortname]` | `household/[shortname]/index.vue` | ✅ `useHouseholdsStore()` | N/A | ✅ path + `?pbs=` | ✅ | ⚠️ | **⚠️ REVIEW** - ADR-006 preserves `?pbs` on redirect |
| `/household/[shortname]/bookings` | `household/[shortname]/[tab].vue` → `HouseholdBookings.vue` | ✅ Multiple stores | N/A | ✅ tabs + `?pbs=` | ✅ | ❌ | **⚠️ MISSING TESTS** |
| `/household/[shortname]/allergies` | `household/[shortname]/[tab].vue` → `HouseholdAllergies.vue` | ✅ `useAllergiesStore()` | ❓ | ✅ tabs + `?pbs=` | ❌ | ❌ | **❌ NO TESTS** |
| `/household/[shortname]/settings` | `household/[shortname]/[tab].vue` → `HouseholdSettings.vue` | ✅ `useHouseholdsStore()` | N/A | ✅ tabs + `?pbs=` | ✅ | ❌ | **⚠️ E2E ONLY** - Move-out date management |
| `/household/[shortname]/economy` | `household/[shortname]/[tab].vue` → `HouseholdEconomy.vue` | ❓ | N/A | ✅ tabs + `?pbs=` | ❌ | ❌ | **❌ NO TESTS** |
| **Other Routes** |
| `/` | `index.vue` → `Hero.vue` | N/A | N/A | N/A | ✅ | ✅ | **✅ COMPLIANT** — The four bands are one `v-for` over `getRainbowBand(i)` (`data-testid="landing-band-<i>"`); dark ink on bands 0-2, white on the Bonbon band (`violet-800`), AA in every palette. The landing mockup lives in the page header comment |
| `/login` | `login.vue` → `Login.vue` | ✅ `useAuthStore()` | N/A | ✅ open state in a component ref (ADR-006) | ✅ `UserPreferences.e2e.spec.ts`, `MobileViewport.e2e.spec.ts` | ⚠️ via `UserPreferencesCard` / `UserProfileCard` specs | **⚠️ E2E ONLY** - Dashboard owns the composition: `UserProfileCard` (with the ⚙) and, while `preferencesOpen`, `UserPreferencesCard` under it; the login form itself is untested |
| `/dinner` | `dinner/index.vue` | ✅ `useEventStore()` | N/A | N/A | ❌ | ❌ | **❌ NO TESTS** |
| `/chef` | `chef/index.vue` | ✅ `usePlanStore()` | N/A | ✅ `?team=` | ✅ | ❌ | **⚠️ E2E ONLY** - Team tab switching with calendar reactivity |
| `/chef/dinner/[id]` | `chef/dinner/[id].vue` | ❓ | N/A | ✅ path params | ❌ | ❌ | **❌ NO TESTS** |

## Component Breakdown

### Admin Planning Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `AdminPlanning.vue` | `/admin/planning` | `usePlanStore()` | `useEntityFormManager()`, `useSeasonValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 7 tests | ✅ Full | **✅ COMPLIANT** — Card header is `LAYOUTS.cardActionRow` with `SeasonSelector` + `create-season` (`BUTTONS.primaryAction` + `ICONS.plusCircle`); `AdminPlanningSeason` `@edit` drives `?mode=edit` through `useEntityFormManager` (ADR-006/ADR-008); the save toast reports the `SeasonUpdateResponse` counts |
| `AdminPlanningSeason.vue` | `/admin/planning` | `usePlanStore()` (saving state) | `useSeasonValidation()`, `useSeason()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 16 tests | ✅ Indirect | **✅ COMPLIANT** — Title carries the season name (view / Rediger / Opret); the header holds the `COMPONENTS.statBox` cooking-day counter (`cooking-day-count`) and, in view mode with `canEdit`, `edit-season` (`BUTTONS.secondaryAction` + `ICONS.edit`, labelled `Rediger {shortName}`); footer `LAYOUTS.formButtonRow` with `BUTTONS.cancel` / `BUTTONS.save`; `id="seasonForm"` — colour via DS tokens |
| `AdminToCreateSeason.vue` | `/admin/planning`, `/admin/teams` | None (prop-driven) | `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 2 tests | ❌ | **✅ COMPLIANT** — `canEdit` gates the `create-first-season` CTA (`BUTTONS.primaryAction` + `ICONS.plusCircle`); both hosts pass `:can-edit` |
| `TicketPriceListEditor.vue` | `/admin/planning` | Parent props | `useTicketPriceValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 4 tests | ✅ Indirect | **✅ COMPLIANT** — `BUTTONS.secondaryAction` + `ICONS.ticket` add, `BUTTONS.edit` + `ICONS.trash` row remove; testids `ticket-price-add` / `ticket-price-remove-${i}` — colour via DS tokens |

### Admin Team Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `AdminTeams.vue` | `/admin/teams` | `usePlanStore()`, `useHouseholdsStore()` | `useEntityFormManager()`, `useCookingTeam()`, `useQueryParam()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ⚠️ 1 test | ✅ Full | **⚠️ PARTIAL UNIT** — ONE master table in every mode (compact names via `getTeamShortName`, `CookingTeamBadges` rows); selection is the open state in `?team=`: the master is constant (md 1/3, both columns in every state) and only the region beside it swaps - the all-teams calendar with no selection (the overview), the framed detail when a row is open; the toggle chevron turns toward the open detail (`team-toggle-<id>`: down closed, up folds the phone dock, right points into the md+ pane) and the row click (`team-row-<id>`) toggles the same way; the open row wears `getRainbowAccent`, the detail mounts in `COMPONENTS.masterDetail` frames (pane md 2/3 / dock with sticky `dockHeader`); a background season refresh keeps the page mounted (`showAdminTeams` checks data presence) and the card refetches its detail in place; the detail face rides in `?mode=` (`edit-team` pencil / `back-to-view`), deselect-while-editing returns to view with sequential awaited URL writes (the mode and team keys never resurrect each other's stale value); the header carries `create-team` beside the `SeasonSelector`; the table `#empty` slot keeps `create-new-team`; the create face submits via `submit-create-teams`; create toast reports the `CreateTeamsResponse` counts, `AdminTeams.nuxt.spec.ts` reads it from `useToast().toasts`; `?team=` bleeds to other tabs (parked); `admin-teams-edit` screenshot in `AdminTeams.e2e.spec.ts`, every immediate save asserts `expectMode`, the row-click test asserts select, switch and deselect — colour via DS tokens |
| `CookingTeamCard.vue` | `/admin/teams`, `/chef`, `/dinner` | `usePlanStore()`, `useHouseholdsStore()` | `useCookingTeam()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** — Uses shared InhabitantSelector + TeamMemberAddForm; the monitor, edit and view headers render the `CookingTeamBadges` triple (large; the edit row counts-only via `showName`); another team's status badge binds its own rainbow stop; the frames take the base border colour and the allocation badge is `COLOR.neutral` outline, so colour comes from the design system alone; role glyphs render via `UIcon` from the design system's `ROLE_ICONS` — colour via DS tokens |
| `TeamMemberAddForm.vue` | `/admin/teams` (via CookingTeamCard) | None | `useCookingTeamValidation()` | ✅ | ✅ | ✅ 13 tests | ✅ Indirect | **✅ COMPLIANT** — the affinity checkboxes take `WeekDayMapDisplay`'s default colour; the role select item icons come from `ROLE_ICONS` |
| `MyTeamSelector.vue` | `/chef` | Parent props | `useCookingTeam()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** — `UTabs` of `CookingTeamBadges` bound to `COMPONENTS.teamTabs`; on a phone the trigger stacks `ICONS.team` over the compact badge (mockup in the component header); the tab items carry no colour; empty state `ALERTS.info` |
| `WorkAssignment.vue` | `/dinner`, `/chef` | `usePlanStore()`, `useAuthStore()` | `useCookingTeamValidation()`, `useBookingValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** — Volunteer buttons for cooking roles with `ROLE_ICONS` glyphs via `UIcon`; mockup in the component header |
| `InhabitantSelector.vue` | `/admin/teams` | None | - | ✅ | ✅ | ✅ 22 tests | ✅ Indirect | **✅ COMPLIANT** — Lives in `shared/`; generic slots; empty state uses the `#empty` table slot — colour via DS tokens |

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
| `AdminAllergies.vue` | `/admin/allergies` | `useAllergiesStore()`, `useHouseholdsStore()` | `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 41 tests | ✅ Full | **✅ COMPLIANT** — Master/detail with a responsive detail mount point: `AllergyDetailPanel` in the sticky pane (md+) or docked under the tapped row (`#expanded`, `<md`); selection is the single state; spec parametrized over `isMd`; owns the households lookup; empty catalog CTA renders through the `#empty` table slot; the card header carries `AllergyNotes` on the store's `posterNotes`, with `canEdit` and a local `isSavingNotes`, and `@save` calling `savePosterNotes` then toasting "Bemærkninger gemt"; the `multiselect-toggle` reads "Kombiner allergener" / "Afslut kombinering"; the docked detail wraps inside the expanded row (`COMPONENTS.table.ui`, `MobileViewport.e2e` `admin-allergies-expanded-row`) — colour via DS tokens |
| `AllergyCatalogTable.vue` | `/admin/allergies`, `/chef` (via `AllergenMultiSelector`) | Parent props | `useAllergy()`, `useAllergyValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 17 tests | ✅ Indirect | **✅ COMPLIANT** — ONE catalog master table (`mode: 'single' \| 'multi'`); forwards `#expanded` + `#empty` — colour via DS tokens |
| `AllergyDetailPanel.vue` | `/admin/allergies` | None (prop-driven) | `useAllergyValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 13 tests | ✅ Indirect | **✅ COMPLIANT** — Portable detail (view / edit / create / delete-confirm); the "Detaljer" header carries the labelled `BUTTONS.secondaryAction` + `COLOR.primary` + `ICONS.edit` "Rediger <navn>" entry beside the ghost trash (docs/ui.md Edit affordances); identical testids at every mount point — colour via DS tokens |
| `AllergenMultiSelector.vue` | `/admin/allergies`, `/chef` | Parent props | `useAllergyValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 17 tests | ✅ Indirect | **✅ COMPLIANT** — Consumes `AllergyCatalogTable` (multi); mobile fixed summary bar jumps to the statistics panel — colour via DS tokens |
| `HouseholdAllergies.vue` | `/household/[shortname]/allergies` | `useAllergiesStore()`, `useHouseholdsStore()` | `useAllergyValidation()` | ✅ | ✅ | ❌ | ❌ | **❌ NO TESTS** — colour via DS tokens |
| `AllergyTypeCard.vue` | `/admin/allergies`, `/household/[shortname]/allergies` | Parent props + `usePlanStore()` (activeSeason read) | `useAllergyValidation()`, `useTicket()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 13 tests | ✅ Indirect | **✅ COMPLIANT** — Serves view/compact/edit **and create** (`allergyType` optional); household rendered via `UserListItem` `#badge` slot; per-inhabitant age badge (`getTicketTypeConfig`, HouseholdCard pattern); `<NuxtTime relative>` for timestamps (SSR-safe) — colour via DS tokens |
| `AllergyTypeDisplay.vue` | `/admin/allergies/pdf` | Parent props | `useAllergyValidation()` | ✅ | ✅ | ❌ | N/A | **N/A DISPLAY** |
| `AllergyNotes.vue` | `/admin/allergies` (card header), `/admin/allergies/pdf` | None (prop-driven) | `useSettingValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 17 tests | ✅ Indirect | **✅ COMPLIANT** — ONE "Vigtige bemærkninger" box for both surfaces; props `notes` / `canEdit` / `isSaving`, emits `save`; one note per line via `splitNotes`; `{...ALERTS.legend, ...ALERTS.withCornerAction}` + `ICONS.warning`; the pencil is `BUTTONS.edit` + `aria-label="Rediger bemærkninger"` in `#actions` with `canEdit`, top-right on phone and desktop; the edit face is a `UTextarea` (rows 5) over `LAYOUTS.formButtonRow` with `BUTTONS.cancel` / `BUTTONS.save`, closing when the parent's `isSaving` resolves; no `UTooltip` (the poster has no `UApp`); margins belong to the mount point |
| `AllergyManagersList.vue` | `/admin/allergies`, `/household/[shortname]/allergies`, `/admin/allergies/pdf` | `useUsersStore()` | `useUserValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ❌ | ❌ | **❌ NO TESTS** — API is `kind?: AlertKind` (default `info`; poster passes `legend`, outline without fill on paper); its description `:ui` merges on top of the kind (ADR-018) |

### Form & Shared Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `SeasonSelector.vue` | `/admin/planning`, `/admin/teams` | `usePlanStore()` | `useSeasonSelector()` | ✅ | ✅ | ✅ Full | ✅ Indirect | **✅ COMPLIANT** — colour via DS tokens |
| `TableSearchPagination.vue` | `/admin/users`, `/admin/households` | None | `useTheSlopeDesignSystem()` | N/A | N/A | ✅ | ✅ Indirect | **✅ COMPLIANT** — colour via DS tokens |
| `SeasonStatusDisplay.vue` | `/admin/planning` | `usePlanStore()` | `useSeasonValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ | ✅ Indirect | **✅ COMPLIANT** — `alertConfig` maps season status → `ALERTS` kind (ACTIVE success, FUTURE info, CURRENT warning, PAST neutral) + `withActions` (ADR-018); activate = `BUTTONS.primaryAction` + `COLOR.success` + `ICONS.playCircle`/`ICONS.arrowRight` with `:loading`; spec uses the real `usePlanStore` + `registerEndpoint` (testing.md Rule 6) |
| `UserPreferencesCard.vue` | `/login` (dashboard, behind the ⚙ in `UserProfileCard`) | `useAuthStore()` | `useUserPreferenceValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 26 tests | ✅ `UserPreferences.e2e.spec.ts` | **✅ COMPLIANT** — "Mine indstillinger": view face + `BUTTONS.edit` pencil (`aria-label="Rediger"`, no text), edit face with a `USwitch` per channel (SMS disabled + hint without a phone), `URadioGroup` for palette and text scale bound to `COMPONENTS.choiceGroup`, `TYPOGRAPHY.sectionSubheading` section titles over body-size options, `LAYOUTS.formButtonRow` footer; options "Glade farver" / "Høj kontrast" / "Til farveblinde" in `PaletteSchema` order; "🇪🇺 EN 301 549 · Kontrast AA|AAA ✓" renders from `PALETTES[key].level` and "👁 Nedsat farvesyn · Okabe–Ito ✓" from `PALETTES[key].colourSafe`, in both faces; test-ids `pref-*` shared via `tests/component/components/user/userPreferencesTestIds.ts`; spec parametrized over `isMd`, real auth store with only the session faked |
| `UserProfileCard.vue` | `/login` (dashboard), `/admin/users` (expanded row) | `useAuthStore()`, `useUsersStore()` | `useUserRolesUi()`, `useHeynabo()`, `useCoreValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 7 tests (header actions) | ✅ `MobileViewport.e2e.spec.ts` (`login`) | **✅ COMPLIANT** — Header actions in a wrapping flex row, one right-aligned row from md: `[⚙]` (`BUTTONS.settings`, `aria-label="Indstillinger"`, `pref-toggle`, `aria-pressed`) and `[👋 Log ud →]` (`BUTTONS.secondaryAction` + `COLOR.error`, `logout-button`) for the current user only, `[Heynabo →]` (`BUTTONS.secondaryAction` + `COLOR.primary`, `heynabo-profile-link`) whenever the inhabitant has a Heynabo URL; the parent owns the open state (`preferencesOpen` prop, `toggle-preferences` emit, ADR-006); the role manager in `#footer` is still spec-less |
| `UserView.vue` | All routes (PageHeader) | `useAuthStore()` | `useUserValidation()` | ✅ | ✅ | ❌ | ❌ | **❌ NO TESTS** |
| `UserListItem.vue` | `/admin/users`, `/admin/allergies` | Parent props | `useUserValidation()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ `label`/`labelPlural` declared but not rendered** — colour via DS tokens |
| `DangerButton.vue` | `/household/[shortname]/settings`, `/admin/economy` | None | - | N/A | N/A | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** - Two-click confirm pattern for destructive actions — colour via DS tokens |
| `CookingTeamBadges.vue` | `/admin/teams` (master table + detail headers), `/chef` (via `MyTeamSelector`), `/dinner` + `/chef` (via `CookingTeamCard`) | None (prop-driven) | `useTheSlopeDesignSystem()` | N/A | N/A | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** — THE team badge row: name (`ICONS.team`), chef count (`ICONS.chef`, via `countChefs`), member count (`ICONS.members`, solid silhouettes) and cooking days (`ICONS.calendar`) bind `getRainbowBand(teamNumber - 1)` as class; `size` small/standard/large; `showName`/`showCounts`/`showTeamIcon` pick the face per host |
| `QrCode.vue` | `/admin/allergies/pdf` | None (prop-driven) | `encodeQrPath()` (`app/utils/qr.ts`, `uqr`) | N/A | N/A | ✅ 3 tests (+ 5 unit on `encodeQrPath`) | ✅ Indirect | **✅ COMPLIANT** — Inline `<svg role="img">`, white `<rect>` + one black `<path>`, `data-testid="qr-code"`; literal `#000000`/`#ffffff` so it prints under `print-color-adjust: exact`; `aria-label` reads `<label>: <value>`; caption and layout belong to the page |
| `InstallPrompt.vue` | `/login` (dashboard, inside `<ClientOnly>` under the greeting) | None | `useInstallPrompt()`, `useTheSlopeDesignSystem()` | N/A | N/A | ✅ 16 tests | ✅ `InstallPrompt.e2e.spec.ts` (5) | **✅ COMPLIANT** — Face from `useInstallPrompt().face`: nothing when standalone, dismissed or nothing offered; `{...ALERTS.info, ...ALERTS.withActions}` titled "Få Skråningen som app" (`install-prompt`); leading slot `public/app-icon.svg` bound to `COMPONENTS.installIcon` (home-screen frame + `animate-tap-pulse`, static under `motion-reduce`); button face `install-app` (`BUTTONS.primaryAction` + `COLOR.primary` + `ICONS.download`) calls the captured `prompt()`; `share-instructions` face reads "Åbn Del-menuen og vælg 'Føj til hjemmeskærm'", `menu-instructions` face reads "Åbn browserens menu og vælg 'Føj til startskærm'", both with Ikke nu only and no browser names (C3); `install-dismiss` (`BUTTONS.cancel`, "Ikke nu") writes the 90-day dismissal cookie; no style block; mockup in the component header |

### Calendar Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `CalendarDatePicker.vue` | `/household/[shortname]/settings`, `/admin/households` (create form) | None | `useDateRangeValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ Full | ✅ Indirect | **✅ COMPLIANT** — one `UInputDate` with typed dd/MM/yyyy segments (`COMPONENTS.dateField`); `CalendarPickerPopover` in the `#trailing` slot opens the calendar |
| `CalendarDateRangePicker.vue` | `/admin/planning` | None | `useDateRangeValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ Full | ✅ Indirect | **✅ COMPLIANT** — one `UInputDate range` box per period (`COMPONENTS.dateField`); `selection` picks the `CALENDAR.picker` preset in the shared `CalendarPickerPopover`; a disabled range reads as one compact field; `icon` renders as the field's leading icon |
| `CalendarPickerPopover.vue` | via both pickers | None | `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ Indirect | ✅ Indirect | **✅ COMPLIANT** — THE calendar popover of the date pickers: calendar button trigger, `calendarPickerProps` grid, the `#day` circle via `isDaySelected` |
| `CalendarDateRangeListPicker.vue` | `/admin/planning` | None | `useSeasonValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 13 tests | ✅ Indirect | **✅ COMPLIANT** — Edit/create renders each row as a `CalendarDateRangePicker` (`selection="holiday"`, `name="holidayRangeList-${i}"`) validated against `holidaysSchema` before it reaches the model; view keeps read-only rows; holidays kept chronological via `sortDateRanges`; testids shared via `tests/component/components/admin/planningTestIds.ts` |
| `WeekDayMapDisplay.vue` | `/admin/planning`, `/admin/teams` | None | `useWeekday()` | ✅ | ✅ | ✅ 9 tests | ✅ Indirect | **✅ COMPLIANT** — `hideRestricted` prop; compact view only renders active days |
| `WeekDayMapDinnerModeDisplay.vue` | `/household/[shortname]/settings` | None | `useWeekday()`, `useDinnerMode()` | ✅ | ✅ | ❌ | ❌ | **❌ NO TESTS** |
| `BaseCalendar.vue` | All calendar displays | None | `useTheSlopeDesignSystem()`, `useCalendarEvents()` | N/A | N/A | ❌ | N/A | **N/A DISPLAY** — spreads `COMPONENTS.calendarGrid` |
| `CalendarDisplay.vue` | `/admin/planning` | None | `useSeason()`, `useCalendarEvents()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ `CalendarDisplay.nuxt.spec.ts` | ❌ | **✅ COMPLIANT** - potential-cooking/generated-events preview on `PLANNING_CALENDAR` + `SIZES.calendarCircle` |
| `ChefCalendarDisplay.vue` | `/chef` | Parent props | `useTemporalCalendar()` | ✅ | ✅ | ❌ | ✅ | **⚠️ E2E ONLY** - Uses MaybeRefOrGetter for reactivity; agenda empty state uses the `#empty` table slot (untested) — colour via DS tokens |
| `DinnerCalendarDisplay.vue` | `/dinner`, `/household/[shortname]/bookings` | Parent props | `useTemporalCalendar()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ E2E ONLY** - DRY with ChefCalendarDisplay |
| `TeamCalendarDisplay.vue` | `/admin/teams`, `/chef` | Parent props | `useCalendarEvents()`, `useSeason()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 11 tests | ❌ | **✅ COMPLIANT** — Cooking-day and legend badges bind `getRainbowBand(i)` as class (team n wears stop n); `TeamCalendarDisplay.nuxt.spec.ts` renders nine teams through the real component: each legend badge carries its stop, eight distinct, the ninth wraps; test-ids `team-legend-entry` / `team-legend-badge` |

### Household Booking Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `HouseholdBookings.vue` | `/household/[shortname]/bookings` | `usePlanStore()`, `useHouseholdsStore()`, `useBookingsStore()` | `useBookingView()`, `useBooking()` | ✅ | ✅ | ❌ | ✅ Full | **⚠️ MISSING UNIT** - E2E arrow-nav (`HouseholdBookings.e2e.spec.ts`) + day-view + cross-household covered |
| `BookingGridView.vue` | `/household/[shortname]/bookings` | Parent props | `useBooking()`, `useBookingUi()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 16 tests | ✅ Indirect | **✅ COMPLIANT** - ADR-016 week/month grid; `tableData` returns `[]` when `flatEvents` is empty so the `UTable` `#empty` slot (`ALERTS.emptyState`, `getRandomEmptyMessage('noDinners')`) renders for a period with no dinners; legend delegated to `DinnerModeLegend` |
| `BookingViewSwitcher.vue` | `/household/[shortname]/bookings` | Parent props | `useBookingView()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** - Day/week/month toggle — colour via DS tokens |
| `ActionPreview.vue` | `/household/[shortname]/bookings`, `/admin/economy` | Parent props | `useBookingUi()` | ✅ | ✅ | ✅ | ✅ Indirect | **✅ COMPLIANT** - Shows booking changes before save |
| `GuestBookingForm.vue` | `/household/[shortname]/bookings`, `/admin/economy` | Parent props | `useBooking()`, `useBookingUi()`, `useBookingValidation()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** - Guest ticket form — colour via DS tokens |
| `DinnerBookingForm.vue` | `/dinner`, `/household/[shortname]/bookings`, `/admin/economy` | `useBookingsStore()`, `useAuthStore()` | `useBooking()`, `useBookingUi()`, `useBookingValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ | ✅ Serial | **✅ COMPLIANT** - ADR-016 booking form, admin override support; legend delegated to `DinnerModeLegend` — colour via DS tokens |
| `DinnerModeLegend.vue` | `/household/[shortname]/bookings` (day + grid), `/dinner` | Parent props | `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 4 tests | ✅ Indirect | **✅ COMPLIANT** — THE "Forklaring" panel (`ALERTS.legend`), shared by `BookingGridView` and `DinnerBookingForm`; `modes`/`showNoConsensus`/`showModified`/`hint` props |
| `DinnerEvent.vue` | `/household/[shortname]/bookings`, `/dinner` | Parent props | `useDinnerEvent()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** |
| `DinnerTicket.vue` | `/household/[shortname]/bookings` | Parent props | `useTicket()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** — colour via DS tokens |
| `KitchenPreparation.vue` | `/dinner`, `/chef`, `/chef/dinner/[id]` | Parent props | `useOrder()`, `useAllergy()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** — The three dining modes walk `RAINBOW` (TAKEAWAY pink, SPISESAL orange, SPIS SENT ocean); TIL SALG is `gray-400`. Dark ink, AA on the base theme. Colour order is in the component header mockup |

### Chef Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `ChefMenuCard.vue` | `/chef` | `useAllergiesStore()` | `useSeason()`, `useBooking()`, `useOrder()`, `useHousehold()`, `useBookingValidation()`, `useCookingTeamValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ⚠️ 10 tests (mocks stores and child components — testing.md Rule 6 debt) | ❌ | **⚠️ MISSING E2E** — Action row: `edit-menu` (`BUTTONS.primaryAction`), `announce-dinner` (`BUTTONS.secondaryAction`), `dinner-more-actions` (`BUTTONS.settings` + `ICONS.chevronDown`, `aria-label="Flere handlinger"`) opening the `COMPONENTS.dangerZone` panel |

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
| `plan.ts` | ✅ | ✅ | ✅ | ✅ | ✅ Full | **✅ COMPLIANT** — `updateSeason()` returns the parsed `SeasonUpdateResponse` envelope (ADR-009) and refreshes the season list and selection; `createTeam()` returns the parsed `CreateTeamsResponse` envelope (ADR-009) |
| `households.ts` | ✅ | ✅ | ✅ | ✅ | ✅ Full | **✅ COMPLIANT** - `setMoveOutDate()`, `lastMoveOutResult`, `moveInhabitant()`, `deleteHousehold()`, `lastMoveResult`, `updateInhabitantPreferences()`, `updateAllInhabitantPreferences()`, `initHouseholdsStore(shortName?, pbsId?)` disambiguation |
| `allergies.ts` | ✅ | ✅ | ✅ | ✅ | ✅ Full | **✅ COMPLIANT** — Catalog uses `useAsyncData` + `useRequestFetch`; `isAllergyTypesInitialized` checks data presence (ADR-007 rule 3); mutations refetch the catalog; catalog `transform` parses with `AllergyTypeDetailSchema` so dates are domain types (ADR-010). `posterNotes` is a second `useAsyncData` slice on `GET /api/admin/setting/allergy-poster-notes` with its own `isPosterNotesLoading` / `isPosterNotesErrored` / `isPosterNotesInitialized` and `loadPosterNotes` / `savePosterNotes`; it stays out of `isAllergyStoreReady` so the poster prints its notes while the catalog loads, and falls back to the registry default. `savePosterNotes` takes the POST response as the new value (ADR-009: the mutation returns the row) |
| `users.ts` | ✅ | ✅ | ✅ | ✅ | ❌ | **⚠️ MISSING TESTS** |
| `auth.ts` | N/A | ✅ | N/A | N/A | ✅ via `UserPreferencesCard.nuxt.spec.ts` | **✅ COMPLIANT** - Uses `usePermissions()` for role checks, `isMemberOfHousehold()` (session-aware wrapper over `isInHousehold`, ADR-017); own settings: `notificationChannels`, `appearance` (both fall back to the column defaults), `savePreferences()` → POST + session `fetch()` + toast, `sendTestNotification()` → POST + toast per result |
| `event.ts` | ❓ | ❓ | ❓ | ❓ | ❌ | **❓ AUDIT NEEDED** |
| `tickets.ts` | ❓ | ❓ | ❓ | ❓ | ❌ | **❓ AUDIT NEEDED** |
| `bookings.ts` | ✅ | ✅ | ✅ | ✅ | ❌ | **✅ COMPLIANT** - ADR-016 scaffold methods, `processAdminCorrection()` for admin bypass, `useRequestFetch()` for SSR |

## Composable Compliance

| Composable | ADR-001 Zod Schemas | ADR-001 Enum Re-export | ADR-010 Domain Types | Unit Tests | Status |
|------------|---------------------|------------------------|----------------------|------------|--------|
| **Validation Composables** |
| `useCoreValidation()` | ✅ | ✅ `SystemRoleSchema`, `DinnerModeSchema` | ✅ User, Inhabitant, Household (Display + Detail) | ✅ Full | **✅ COMPLIANT** - User + household schemas composed via the fragment pattern (ADR-001) |
| `useBookingValidation()` | ✅ | ✅ `OrderStateSchema`, `DinnerModeSchema` | ✅ Order, DinnerEvent, DesiredOrder, ScaffoldResult, HouseholdUpdateResponse | ✅ Full | **✅ COMPLIANT** - ADR-016 schemas, operation result types (ADR-009) |
| `useSeasonValidation()` | ✅ | ✅ | ✅ SerializedSeason, SeasonUpdateResponse | ✅ Full | **✅ COMPLIANT** — holidays serialized/deserialized in chronological order; owns the `SeasonUpdateResponse` operation result (ADR-009) |
| `useCookingTeamValidation()` | ✅ | ✅ | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - `ROLE_OPTIONS` carries plain labels; role glyphs live in the design system `ROLE_ICONS` (ADR-017) |
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
| `useUserPreferenceValidation()` | ✅ | ✅ `NotificationChannelSchema` | ✅ Appearance, UserPreferencesUpdate | ✅ Full | **✅ COMPLIANT** - The two `User` settings columns: `PaletteSchema`, `TextScaleSchema`, `AppearanceSchema` + `DEFAULT_APPEARANCE`, `DEFAULT_NOTIFICATION_CHANNELS`, `PALETTES` (per palette: the contrast level the card badges, and `colourSafe` for the preset built on the Color Universal Design colours); three options — `default` (Glade farver, the base, AA), `high-contrast` (AAA), `colorblind` (AA, colour-safe); `AppearanceSchema` reads a stored `tydelig` as `default`; the single source of a preset's level: `tests/component/architecture/palettes.ts` derives the measured palettes from it, so the badge and the contrast assertion are one value, and `scripts/palettes/presets.ts` solves each preset at the level its entry carries; isomorphic (ADR-017), imported by `domainFragments.ts` and the preferences endpoint |
| **Business Logic Composables** |
| `useBooking()` | N/A | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - ADR-016 `decideOrderAction`, bucket resolvers, `resolveUserBookingBuckets()`; ADR-017 isomorphic (explicit imports; badges/action preview live in `useBookingUi`, `DINNER_STEP_MAP` icon-free) |
| `useHousehold()` | N/A | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - `isHouseholdActiveOnDay()` residency predicate (ADR-016), `getResidencyStatus()`, consensus, name formatting |
| `useSeason()` | ✅ | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Exposes pre-configured `splitDinnerEvents`, `getNextDinnerDate`, `getAdjacentDinner` (the last powers `useBookingView` arrow nav) ; ADR-017 explicit imports |
| `useCookingTeam()` | ✅ | ✅ | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - ADR-017 explicit imports; carries no presentation — a team's colour is the design-system rainbow stop (`getRainbowBand`) |
| `useBilling()` | N/A | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Billing business logic |
| `useHeynabo()` | N/A | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Heynabo import merge logic, `mergeHouseholdForUpdate()`, `resolveInhabitantImportPlan()` (4-bucket inhabitant plan: ADR-016 decide/execute, global deletion + placement routing) |
| `useOrder()` | N/A | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Order business logic |
| `useTicket()` | N/A | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Ticket display logic; `ticketTypeConfig.compactLabel` (V/B/b single source, read by `formatTicketCounts`); `groupInhabitantsByTicketCategory` aggregator; `getTicketTypeConfig` falls back to `determineTicketType` (never silently ADULT) |
| `useUserRoles` (module) | N/A | N/A | ✅ Domain types | ✅ Unit | **✅ COMPLIANT** - Server-safe `reconcileUserRoles` / `ROLE_OWNERSHIP` only (ADR-017); display lives in `useUserRolesUi` |
| **UI/Navigation Composables** |
| `useBookingView()` | ✅ `BookingViewSchema` | N/A | ✅ DateRange | ✅ Full | **✅ COMPLIANT** - ADR-006 URL-synced view/date for booking calendar. Single `findAdjacent(direction)` helper (boundary from `getPeriodBoundary` → `getAdjacentDinner`); season bounds come from `dinnerDates` |
| `useEntityFormManager()` | N/A | N/A | N/A | ✅ Full | **✅ COMPLIANT** |
| `useTabNavigation()` | N/A | N/A | N/A | ✅ Full | **✅ COMPLIANT** - query params (`?pbs`) pass through on tab switches (ADR-006) |
| `useSeasonSelector()` | N/A | N/A | N/A | ✅ Full | **✅ COMPLIANT** |
| `useQueryParam()` | N/A | N/A | N/A | ✅ Full | **✅ COMPLIANT** - Generic query param composable for URL state |
| `useApiHandler()` | N/A | N/A | N/A | ✅ Full | **✅ COMPLIANT** |
| `usePermissions()` | N/A | ✅ `SystemRoleSchema` | N/A | ✅ Full | **✅ COMPLIANT** - Isomorphic permission predicates (ADR-017); session-aware `isMemberOfHousehold` lives on the auth store |
| `useBookingUi()` | N/A | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Pure UI composable (ADR-017): deadline badges, `STEP_ICONS`, `formatActionPreview`; never server-imported |
| `useUserRolesUi()` | N/A | N/A | N/A | ✅ Full | **✅ COMPLIANT** - Pure UI composable (ADR-017): role labels/icons/`visibleRoles` from the auth store |
| `useInstallPrompt()` | N/A | N/A | N/A | ✅ 12 unit (`decideInstallFace` matrix) + via `InstallPrompt.nuxt.spec.ts` (incl. the plugin: event before and after mount) | **✅ COMPLIANT** - Pure UI composable (ADR-017), client-only: pure `decideInstallFace` (standalone → dismissed → prompt → iOS flag `share-instructions` → touch-first `menu-instructions` → none); reads `INSTALL_MEDIA_QUERIES` (`display-mode: standalone`, `(pointer: coarse) and (hover: none)`) and `navigator.standalone` on mount, reads the `beforeinstallprompt` event and the `appinstalled` flag from `useState` (`INSTALL_PROMPT_STATE`), which `app/plugins/installPrompt.client.ts` writes from app start (`markRaw`; no `preventDefault`, so Chrome's mini-infobar stays as the second offer, decision 2026-10-05), so an offer fired before the card mounts still shows the button; `promptInstall()` consumes the event; `dismiss()` writes `useCookie('theslope-install-dismissed')` (maxAge 90 days) |
| `useTemporalCalendar()` | N/A | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Uses `MaybeRefOrGetter` + `toValue()` for reactive inputs, shared by ChefCalendarDisplay and DinnerCalendarDisplay (DRY) |
| `useTheSlopeDesignSystem()` | N/A | N/A | N/A | ✅ `withActions` branch | **N/A UTILITY** - Page layout + design tokens only, client-only (ADR-017). Owns `ALERTS` (+ `AlertKind`, `withActions`, `withCornerAction`; kind roots carry `whitespace-normal`) alongside `BUTTONS` (incl. `settings`), `COMPONENTS.table.ui` (the cell under an expanded row wraps), `COMPONENTS.calendarGrid` and `CALENDAR.picker` (+ `calendarPickerProps`, `CalendarPickerSelection`); owns every colour value in the app (`COLOR`, `BG`, `TEXT`, `BORDER`, `RING`, `TYPOGRAPHY`, `BACKGROUNDS`, `PANTONE_CHIPS`, and the eight-stop `RAINBOW` with `RAINBOW_FAMILIES` / `getRainbowBand` / `getRainbowFamily` that landing bands, kitchen panels and cooking teams walk - `HERO.mochaStop` is Mocha's stop, `HERO.mocha` the frame); usage enforced by the ADR-018 rules in `tests/component/architecture/designSystemUsage.unit.spec.ts` (alerts, calendar grid, table token, team tabs, the two colour rules, the dead `#empty-state` slot); the values are measured by `designSystemContrast.unit.spec.ts` (EN 301 549 → WCAG 2.1, per palette preset) and `designSystemColourVision.unit.spec.ts` (WCAG 2.1 §1.4.1, meanings and - in the colour-safe preset - the rainbow stops under protanopia / deuteranopia / tritanopia; the meaning inventory lives in `designSystemMeanings.ts`, shared with the palette generator) |

## Compliance Checklist

Use this checklist when creating/reviewing frontend code:

- [ ] UI renders NuxtUI components (`UButton`, `UInput`, `UCard`, `USelect`)
- [ ] Shared UI patterns bind design-system tokens and colour comes from `useTheSlopeDesignSystem` (ADR-018, docs/ui.md); enforced by `tests/component/architecture/designSystemUsage.unit.spec.ts`
- [ ] Mobile-first: `md:` Tailwind breakpoints; components inject the layout's `isMd` ref for prop switches
- [ ] Network calls live in stores via `useAsyncData`; stores expose `isLoading` / `isErrored` / `isInitialized` / `isStoreReady`; init methods are synchronous (ADR-007)
- [ ] Types, schemas and enums come from validation composables; enum values via `.enum` (ADR-001)
- [ ] Domain types throughout; serialization lives in the repository (ADR-010)
- [ ] Tabs are path-based, form mode is `?mode=`, household URLs go through `getHouseholdUrl()` (ADR-006)
- [ ] CRUD forms manage mode through `useEntityFormManager` (ADR-008)
- [ ] Form elements carry `name`; interactive elements carry `data-testid` (docs/testing.md)
- [ ] Component and E2E coverage recorded in the tables above

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
