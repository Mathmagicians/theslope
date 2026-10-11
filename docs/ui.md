# UI design system

Nuxt 4.3, Nuxt UI 4.3, Tailwind 4.1. Pages use Nuxt UI components; every shared UI value comes from the design system (ADR-018).

## Where it lives

| What | File |
|---|---|
| Colour scales, 50-950 per family | `app/assets/css/main.css` `@theme static` |
| Nuxt UI slot → family (`primary`, `secondary`, `neutral`, `info`, `success`, `warning`, `error`, brand slots) | `app/app.config.ts` `ui.colors` |
| Colour names Nuxt UI generates utilities for | `nuxt.config.ts` `ui.theme.colors` |
| Tokens components bind | `app/composables/useTheSlopeDesignSystem.ts` |
| Palette presets (generated) | `app/assets/css/palettes/<key>.css`, imported by `main.css` |
| Palette options and their contrast level | `PALETTES` in `app/composables/useUserPreferenceValidation.ts` |
| Preset definitions (hue maps, levels) | `scripts/palettes/presets.ts` |
| Text scale | `html[data-text-scale]` rules at the end of `main.css` |
| Brand SVG | `app/components/icons/Logo.vue` |

## Rules

- A component binds a design-system token and passes domain props only. `tests/component/architecture/designSystemUsage.unit.spec.ts`
  fails on a Tailwind palette shade, a literal colour prop, a `<UAlert>` without an `ALERTS` kind, a `<UCalendar>` without
  `COMPONENTS.calendarGrid`, a `<UTable>` without a `COMPONENTS.table` token, a team `<UTabs>` without `COMPONENTS.teamTabs`,
  a `<UCollapsible>` with a `class` or `ui` outside a `COMPONENTS.collapsible` token,
  a literal `size`, `variant` or `icon` on a `<UButton>`, `<UBadge>` or `<UAvatar>` (bind `SIZES`, `NOISE`, `BUTTONS` or `ICONS`),
  the form button row spelled out instead of `LAYOUTS.formButtonRow`, and the slot name `#empty-state`; it reports `file:line`.
- A token holds one rendered value, light and dark together. Two values are two tokens, named by where they are used.
- A Nuxt UI component family gets a token, and an architecture rule, before its first use.
- Layout responds with `md:` classes; `isMd` (provided by `app/layouts/default.vue`) sets prop values.
- Specs assert usage and behaviour; a token's value is checked by eye (`docs/testing.md` → Architecture Tests).

## Tokens

| Token | For |
|---|---|
| `COLOR` | a Nuxt UI `color` prop |
| `NOISE` | a Nuxt UI `variant` prop: the emphasis ladder `loud` (solid), `medium` (outline), `soft`, `quiet` (ghost), and `subtle` (status badges), `link` |
| `TEXT` | ink volume `ink` → `strong` → `toned` → `muted` → `dimmed`, single-owner lines, family rungs (`mocha[800]`: the kitchen stats bar's secondary lines) |
| `BG` | surfaces `panel`, `panelNested`, `panelHover`, `inset`, single-owner surfaces (`expandedRow`, the household allergies row while it is open), family rungs |
| `BORDER`, `RING` | edges and rings, family rungs |
| `TYPOGRAPHY`, `LAYOUTS`, `SIZES`, `ICONS` | text styles, layout classes, responsive sizes, icon names |
| `BUTTONS` | `edit`, `cancel`, `save`, `primaryAction`, `secondaryAction`, `settings`, `memberFinder` (the team finder's row action: Tilføj, Rediger, Luk) |
| `ALERTS` | alert kinds and the `withActions` / `withCornerAction` modifiers |
| `COMPONENTS` | `calendarGrid`, `dinnerBudget` (the budget pane), `expenseLines` (the grocery lines), `vatAmount` (one amount in both units), `cookingRound` (the team's round), `ticketChanges` (Billetændringer), `dateRangeField` (the period field's padding and its read-only input), `legend` (inside an `ALERTS.legend` panel: `entries`, `entry`, `stackedEntry`, `badge`, `hint`), `dateField`, `installIcon`, `statBox`, `table.ui` (and `table.catalogUi`, the allergy catalog's narrow cells; `table.agendaUi`, the chef agenda's one fixed-layout card column; `table.householdAllergiesUi`, the dense cells with an open row on `BG.expandedRow`; `table.bookingUi`, the booking form's dense cells with the power row in the warning tint and an open row on `BG.expandedRow`), `teamTabs`, `collapsible` (a `UCollapsible`: `belowTrigger` under its toggle button, `chefCalendar` under the chef calendar header), `chefCalendar` (`ChefCalendarDisplay`: the `root` column, the `header` row, `viewTabs`, the `agenda` view with its `agendaHeader` and `empty` state with `emptyIcon`, the `calendar` view and a `plainDay`), `teamChip` (the circular team icon beside the team-name input), `masterDetail` (framed `pane`/`dock`, sticky `dockHeader`, `dockClamp` keeps a wide dock out of the master table's sizing, `dockBody` scrolls it in its own box; the master columns bind `meta.class`: `primaryColumn` takes the row's slack, `compactColumn` fits its content on one line), `choiceGroup`, `kitchenPanel`, `kitchen` (`KitchenPreparation`: the stats-bar `totals` with `totalsSecondary`, the bar's fill with `TEXT.mocha[800]` under `totalsLabel` and `totalsBreakdown`, the `panels` row and a `panel`'s stacked divider, its `label`, `breakdown` and `allergyHead` (`ICONS.allergy` and the kuverter, no rule above it), the selected panel's `householdList` with the kitchen type size on its `allergyOverview` line, a `household` row centring its segments on one line and a `diner` with the allergy types beside the name), `allergyOverview` (`AllergyOverviewLine`: `line`, `total` with its `glyph`, a `figure` per allergen centring its compact `AllergyTypeDisplay` between the separator and its kuverter; `besideName`, the space between a diner's name and an `AllergyTypeDisplay`), `allergyTypeDisplay` (`AllergyTypeDisplay`: `compactRoot`, `compactAvatar`, `compactName` and `root`, `avatar`, `name` per face, the avatar on `BG.allergyAvatar` at `SIZES.allergyAvatarCompact` or `SIZES.allergyAvatar`; `named` weights a type's name, `none` mutes the no-allergy state, `ICONS.noAllergy` on `noneAvatarUi`: the white disc with its own grey ink, gray-500 in light and gray-800 in dark, which the sun icon inherits; a type's own icon or emoji keeps Nuxt UI's avatar ink), `allergenSelector` (`AllergenMultiSelector`: `root` with `withSummaryBar`, `master`, the phone's `summaryBar`, `detail`, the allergy panel's `panelIcon`, `panelBody` and `names`), `householdAllergies` (`HouseholdAllergies`: the full-bleed `card` on a phone, the `body` stack, `rowToggle(isOpen)` (the pencil closed, the turned chevron open), the collapsed row's `allergies`, an `allergy` and its muted `comment`, the `editor` padding), `allergyEditor` (`AllergyEditor`: `root`, `label`, the add `select` with its `item` rows and `empty` line, `allSelected`; the comments mode's `commentList` of `commentCard`s on `BG.panelNested` with `commentType`, `commentRow` and `commentInput`; the simple mode's `badges`, a `badge` with `badgeBody` and `badgeRemove`), `allergyCatalog` (`AllergyCatalogTable` cells: `checkboxCell`, `iconCell`, `iconRing`, `iconGlyph`, `nameCell`, `centredCell`), `allergyCatalogPage` (`AdminAllergies`: `card`, `header`, `titleRow`, `headerActions`, `toolbar`, `createDock`, `column`, `stickyDetail`), `segmentedActive`, `economyTable`, `powerMode`, `guestRow`, `ticket` (`DinnerTicket`: the card `face` per ticket state from `getTicketState` (`normal`, `released`, `claimed`: the ticket fill and its accent edge), the `watermark` with `watermarkIcon` (`ICONS.ticketSolid`), the `content` stack, row 1 as `row` in three slots: `special` (three 20px `cell`s, state | guest | allergy), the type `badge`, `modeSlot` (how you eat, right-aligned); `stateIcon.released` and `stateIcon.claimed` in the state colour, `infoIcon.primary` (primary-800, dark 300), `infoIcon.success`, `infoIcon.neutral` (the 700 rung, dark 400) for the guest and allergy glyphs in the type badge's colour; `subRow` with its `provenance` line under the badge), `bookingForm` (`DinnerBookingForm`: the ticket under the name on a phone `ticketPhone` and in its column from md `ticketDesktop`, the name cell's `provenance` row and a guest order's `guestProvenance`, the guest order's `guestOf` row (the add-guest row's `ICONS.userPlus` disc at `avatar.compact`, gap and label type) with its `guestOfLabel`, the expanded row's `allergyLine`), `roleBox` (the team card's role groups on one glyph column: `box`, `heading` with its `glyph`, `list`, `row`, the member rows' `memberList` with its five columns and the subgrid `memberRow`, `empty`, and the monitor face's `monitorGrid` and `monitorRow`), `teamForm` (the team card's inline forms: the field `stack`, a select or input `control` filling its field), `teamBadgeRow` (`CookingTeamBadges`' wrapping row), `getCalendarCountBadge(teamNumber)` (the team's `ICONS.calendar` count badge, team band and icon; the site binds the size: the cooking-days badge in `CookingTeamBadges`, the joker line's shift count in `CookingTeamCard` at `SIZES.small` with the aria-label "N vagter"), `teamCard` (the team card's faces: `monitor` and `monitorHeader`, the `stack` of sections, `viewHeader`, the dashed `editHeader` with `editHeaderMain`, `nameField`, `nameInput` (class and `ui`; the pencil binds `ICONS.edit`), `memberSummary` and `deleteButton`, the two-column `row` with `fullColumn`, `halfColumn`, `affinityColumn`, `calendarColumn`, the role `boxes`, a member row's `memberLink` avatar, `nameBadge` and `allocationBadge`, and the finder's `freeBadge` (LEDIG), `statusList`, `statusEntry`, `statusBadge` and expanded `memberForm`, and the joker add row under the finder: `jokerAddRow`, `jokerAddName`, `jokerAddLabel`), `wantedPoster` (the chef portrait: `trigger`, `frame`, `portrait`, `ring`, `avatar`, `hat` with its ink `hatOnFrame` or `hatOnPage`, `nameStack`, `lettering`, `role`), `chefMenuCard` (below the hero: the compact face `compactUi(selected)`, `compactRow`, `compactDate`, `compactTitleColumn`, `compactTitle` or `compactTitlePlaceholder` (italic in `TEXT.muted`, its own ink on the compact face), `compactBadge`, `compactBudget`; the `stack` of sections with a `section` rule; the `allergenRow` with `allergenLabel` and its leading `allergenGlyph` at the title's size, and `allergenLine`; the `allergenEditor` with its `allergenEditorHead` and `allergenEditorTitle`; the menu `form`, a `field`, the `costRow` with `costInput`, `costType`, `costAlternative`) |
| `CALENDAR`, `PLANNING_CALENDAR`, `CHEF_CALENDAR`, `DINNER_CALENDAR`, `dayCircleClasses`, `calendarPickerProps` | calendar days, pickers, countdowns |
| `BACKGROUNDS`, `RAINBOW`, `RAINBOW_FAMILIES`, `getRainbowBand`, `getRainbowFamily`, `getRainbowAccent` (selected team row's left tab), `PANTONE_CHIPS` | brand surfaces |
| `TICKET_TYPE_COLORS`, `ORDER_STATE_COLORS`, `DINNER_STATE_BADGES`, `DEADLINE_BADGES`, `RESIDENCY_CONFIG`, `ROLE_ICONS` | domain colour and glyph maps; the role and dinner glyphs are one set, Hugeicons: `ICONS.chef` (chef hat, Chefkok), `ROLE_ICONS.COOK` (whisk, Kok), `ROLE_ICONS.JUNIORHELPER` (plant, Kokkespire), `ICONS.joker` (joker, Jokere), `ICONS.dinner` (dish, Middag and Spisesal) |

## Patterns

### Edit affordances

| Surface | Binding |
|---|---|
| Table row, card header, notes box | `v-bind="BUTTONS.edit"` + `aria-label="Rediger"`: square ghost pencil |
| Form card (the season card), detail panel header (the team detail) | `v-bind="BUTTONS.secondaryAction"` + `:color="COLOR.primary"` + `:icon="ICONS.edit"`, label "Rediger &lt;navn&gt;" |
| Line in a list (the expense lines) | `v-bind="BUTTONS.remove"` + `aria-label="Slet"`: square ghost trash in the row's last column |

The ⚙ is `BUTTONS.settings` with an `aria-label`; labelled actions beside it bind `BUTTONS.secondaryAction`. A button that opens a
panel below it spreads `BUTTONS.flipOpen(isOpen)`: a chevron that turns while the panel is open, and `aria-expanded`
(`UserProfileCard` and `ChefMenuCard` ⚙, `RoleAssignment`, `HelpButton`). A chevron on another icon slot binds the same turn
through its token (`COMPONENTS.householdAllergies.rowToggle(isOpen)`, the row toggle's leading icon).

### Collapsible panels

A panel that opens and closes is a `UCollapsible` with its toggle outside it: a `UButton` spreading `BUTTONS.flipOpen(isOpen)`
(chevron and `aria-expanded`), and the collapsible binds a `COMPONENTS.collapsible` kind for its spacing. The toggle and the
other controls of a header are siblings in a plain row, so no button holds another (`ChefMenuCard` danger zone, `RoleAssignment`,
`HelpButton`). The chef calendar header (`ChefCalendarDisplay`) is the row `COMPONENTS.chefCalendar.header`: the
Agenda/Kalender `UTabs` (`COMPONENTS.chefCalendar.viewTabs`) on the left, the quiet neutral chevron on the right; the agenda or
calendar opens below it in `COMPONENTS.collapsible.chefCalendar`. The visual check is `/chef` at 375px and on desktop: the tabs
and the chevron on one line, the chevron turning as the content opens and closes, one footer.

### Alerts

`<UAlert v-bind="ALERTS.<kind>">`; the site adds `:title`, `:description`, an `:icon` override, `:avatar`, `data-testid`, a margin class.

| Kind | For |
|---|---|
| `info` | prose, banners |
| `neutral` | quiet system feedback: empty, read-only, last result |
| `success`, `warning`, `error` | an outcome or a state to act on |
| `legend` | "Forklaring" panels (`CalendarLegend` under every calendar, `DinnerModeLegend` on the booking surfaces, entries in `COMPONENTS.legend.entries`), the notes box |
| `emptyState`, `emptyStateCompact` | empty states, centred |

Modifiers spread after a kind: `withActions` (buttons beside the text from md, below it on a phone), `withCornerAction` (one icon
button in the top-right corner). A runtime choice picks between kinds (`v-bind="ok ? ALERTS.success : ALERTS.error"`). A site
that adds to a kind's `ui` merges on top of it (`AllergyManagersList.vue`). The migration record: `docs/features/feature-proposal-notifications.md`
→ "In-app alerts".

### Tables

The empty state renders in the `UTable` `#empty` slot. `COMPONENTS.table.ui` cells wrap between words and keep words, dates and e-mails whole; a data table wider than a phone scrolls inside its own box. A column sizes through its `meta.class` (`{th, td}`): the AdminTeams master binds `COMPONENTS.masterDetail.primaryColumn` on Madhold and `compactColumn` on Madlavningsdage, so the badges keep one line and the weekdays fit their letters; the visual check is `/admin/teams` at 375px and on desktop.

### Choice groups

`URadioGroup` and `USwitch` bind a `COMPONENTS.choiceGroup` shape (`stacked`, `inline`, `single`); the section heading above them
takes `TYPOGRAPHY.sectionSubheading`.

### Team tabs

A `UTabs` whose triggers render `CookingTeamBadges` binds `COMPONENTS.teamTabs`: the link variant, triggers that keep their
full label, and a horizontal row that scrolls sideways when more tabs than fit. On a phone the trigger stacks `ICONS.team`
over the compact badge (`MyTeamSelector`); the visual check is `/chef` at 375px with four teams.

### Install icon

`COMPONENTS.installIcon` frames `public/app-icon.svg` as a home-screen icon (48px, rounded, drop shadow) in the leading slot of
`InstallPrompt` and runs `animate-tap-pulse` (`--animate-tap-pulse` in `main.css` `@theme`): two presses to 92% in the first
0.6 s of a 3.6 s period. `motion-reduce:animate-none` holds the icon still. The visual check is `/login` (dashboard) on a phone at
375px with the install card showing: the icon taps twice, then rests; with reduced motion on (macOS Accessibility → Display →
Reduce motion, or DevTools Rendering → `prefers-reduced-motion: reduce`) it stands still.

### Wanted poster

The chef portrait in `ChefMenuCard` binds `COMPONENTS.wantedPoster`: a `trigger` that opens the role assignment, the
avatar inside the amber `ring`, the `hat` (`ICONS.chef`) tilted on top, and the name over "Chefkok" in `nameStack`. A dinner
without a chef adds `frame` (dashed amber border on mocha 950, a slight skew) to the trigger, renders a question-mark `UAvatar`
through `avatar` (fill and icon ink) and sets WANTED in `lettering` over the `role` line. The visual check is `/chef` and
`/dinner` at 375px and on desktop, on a dinner with and without a chef, in light and dark mode.

### Role boxes

`CookingTeamCard` sets its members in one box per role and a Jokere box after Kokkespirer, all bound to `COMPONENTS.roleBox`. A
heading carries its glyph once (`ROLE_ICONS[role]`, `ICONS.joker`) beside the label, centred on one line at one glyph size; the
rows inside a box carry no role glyph. A member row is a `memberRow` subgrid of the box's `memberList`: avatar, name, allocation, weekdays and slet each take a column, so the allocations, the weekdays and the slet buttons start on one line across the box and the slet column sits at the right edge; a member without weekdays keeps an empty cell. A joker line keeps the flex `row` and reads period, weekdays (`WeekDayMapDisplay` compact), the role's glyph and
label, the note and the shifts the slot covers (`countJokerSlotShifts` in `useCookingTeam`). An empty box shows the muted
`empty` line. The monitor face sets the same heading in `monitorGrid`, a heading column beside the avatars. The role and allocation fields are `TeamRoleFields`, shared by
`TeamMemberAddForm` and `JokerSlotForm`; the role select shows the selected role's glyph on its trigger. In the edit face each member row and each joker
line ends in a slet (`BUTTONS.edit` with `ICONS.trash` and an `aria-label`). Under the finder, "Tilføj jokere" holds one row
in the finder row's look (`teamCard.jokerAddRow`: `ICONS.joker` on a `UAvatar` in the avatar's place, "Joker · en plads uden
navn", a `BUTTONS.memberFinder` button with `aria-expanded`, reading
(plus) Tilføj, (`ICONS.chevronDown`) Luk while open, as a finder row) that opens `JokerSlotForm` in the
member form panel (`teamCard.memberForm`); its Tilføj and Annuller close it. The joker form's period defaults to the
season's dates, its weekdays are the season's cooking days (`hide-restricted`), and its allocation starts at 100. A team that
is not saved yet, and a team without dinners, show an `ALERTS.emptyStateCompact` in place of the finder and the calendar. Every face starts with the 1rem glyph column: a box is the
`box` grid with the heading as a subgrid row, so the label, the list and the empty line start on one line; the monitor face is
`monitorGrid` (glyph, label, list) with one `monitorRow` subgrid per group, so the glyphs share one axis and every avatar list
starts on one line. The visual check is `/admin/teams` with a team open in view
and edit mode, the add-member form with each role, the joker add row closed and open and a joker line's slet, and the monitor face on `/chef` and `/dinner`, at 375px and on desktop.

### Allergy overview

`AllergyOverviewLine` (`totalPortions`, `allergens`, `withGlyph`) reads `ICONS.allergy`, the kuverter of the allergic diners, then each
allergen as a compact `AllergyTypeDisplay` with `show-name` and its kuverter (`formatPortions` in `app/utils/utils.ts`), bound to
`COMPONENTS.allergyOverview`; the site orders the allergens and sets the type size. `computeAllergenOverview` hands each
allergen itself with its `portions`, so the line passes the entry to the element. Beside a diner's name each allergy renders as a compact `AllergyTypeDisplay`
with `show-name`: the type's own icon or emoji in a `UAvatar` and its name, spaced by `allergyOverview.besideName`. One computation,
`useAllergy().computeAllergenOverview`, counts the menu's allergens only: the chef's allergen row under the portrait, the
kitchen's panel heads and expanded list per dining mode (the heads add up to the chef's total), and the allergy panel of
`AllergenMultiSelector` on the selection, each allergen in the given order, a zero included. A diner's duplicated allergy
counts once; a guest ticket counts the allergies named on the ticket, never its booker's. The chef's row leads with
`ICONS.allergy` inside the title (`allergenGlyph`) and sets the line with `withGlyph` false; a menu without allergens reads
`getRandomEmptyMessage('noAllergens')` there, and the kitchen shows no allergy line and no allergy types. The allergy panel binds
`ALERTS.legend` with `ICONS.allergy` at `panelIcon`, the title "Allergier blandt gæsterne", the line, and the names with
their allergy types behind a `BUTTONS.flipOpen` "Hvem". The visual check is `/chef` and `/dinner` on a dinner with menu allergens and allergic
diners, and on one without menu allergens, in view and edit, with the editor open and Hvem open and closed, a kitchen
panel open, at 375px and on desktop.

### Dinner ticket

`DinnerTicket` (`ticketConfig`, `price`, `dinnerMode`, `isReleased`, `isClaimed`, `guestCount`, `allergies`,
`provenanceHousehold`) binds `COMPONENTS.ticket`. Row 1 is three slots of fixed width, so the cards of a table align: the
special slot, three 20px cells in the order state | guest | allergy (an empty cell keeps its width), the type badge, and
how you eat (`DinnerModeSelector`, right-aligned). The state cell shows `ICONS.released` or `ICONS.claim`, the guest cell
`ICONS.userPlus` on a guest ticket, the allergy cell `ICONS.allergy` when `allergies` holds a type. The state colour paints
the edge (`face[state]`) and the state glyph (`stateIcon[state]`); the type colour paints the badge and the guest and
allergy glyphs (`infoIcon[ticketConfig.color]`). "fra &lt;husstand&gt;" starts row 2 under the badge (`subRow`). `DinnerBookingForm` passes a booked inhabitant's allergy types from the household
detail's `inhabitants[].allergies`, and an empty list on a guest ticket. The expanded inhabitant row opens with
`bookingForm.allergyLine`: `ICONS.allergy` at `allergyOverview.glyph`, then one compact `AllergyTypeDisplay` with
`show-name` per type. A guest order's name cell (`bookingForm.guestOf`) leads with the add-guest row's disc (`ICONS.userPlus` on a
`UAvatar` at `avatar.compact`) and "Gæst af" in the add-guest name's type (`guestOfLabel`), then the booker; the two rows
share the disc's and the label's x. The visual check is `/dinner` and `/household/<kort navn>/bookings` on a booked dinner for a household with
one allergic and one non-allergic member, collapsed and expanded, with a released and a claimed ticket and a guest ticket per ticket type, at 375px and on
desktop, light and dark: the badges of the table share one left edge; on a VOKSEN ticket the guest and allergy glyphs read
amber-800 in light and amber-300 in dark.

### Expense lines and the chef's money

`ExpenseLines` (`expenses`, `title`, `hint`, `editable`, `pending`, `leftThisDinner`, `leftRound`) is the grocery ledger of a cost, mounted on the
chef card between Allergener and the stepper (`chefMenuCard.section`): the helping numbers for this dinner and the team's round, a `UForm`
on `ExpenseLineFormSchema` (beløb, the Inkl. moms / Ex moms select, a `BUTTONS.save` Tilføj that calls the form ref), then one
`expenseLines.row` grid per line (date, bestiller, the amount, `BUTTONS.remove` with `aria-label="Slet"`) and the Brugt row. The reporting
user is the payer and the server writes the note, so the form carries the amount alone. Lines are stored gross; every money cell renders
both units through `VatAmount` (`gross`, `balance`): the ex moms figure in the row's weight, the slash and the inkl. moms half in
`vatAmount.incl`; a balance adds its sign, reads `vatAmount.over` below zero and carries `ICONS.check` or `ICONS.exclamationCircle`.
The unit words appear once per block (`vatAmount.unitHeader`, `dinnerBudget.boxUnit`), never per cell.

`DinnerBudget` keeps one chevron. Its RÅDIGHEDSBELØB box carries start, Brugt and Til rådighed; INDTÆGTER and KØKKENBIDRAG read the same
two-unit form. Under the chevron: the Billetter table naming the types through `useTicket`, the summary ending in Til rådighed,
`TicketChanges` and `CookingRoundSpending`. `TicketChanges` (`dinnerEventId`, `since`) opens behind `BUTTONS.flipOpen` and reads the
dinner's changes from the menu deadline through the bookings store (`ticketChanges` tokens): household short name, the order history's
event word (`ORDER_ACTION_LABELS`), the moved ticket as a `UBadge` chip of its type with its sign, the composition as chips with counts
and the kuverter, Indtægter; "Vis fuld historik" loads the rest. `CookingRoundSpending` (`label`, `rows`) lists the team's consecutive
dinners with allowance, Brugt and Til rådighed and a total row (`cookingRound` tokens). The visual check is `/chef` as the team's chef:
the lines section with no lines, two lines and a removed line, the Budget boxes, the chevron open with the ticket table, the ticket
changes opened and the full history loaded, the round of a team cooking two days in a row; at 375px and on desktop, light and dark.

### QR codes

`app/components/shared/QrCode.vue` (`value`, `size`, `label`) draws an inline SVG in black on white; the page owns the caption.

## Brand rainbow

- `PANTONE_FAMILIES` orders the families; `RAINBOW_FAMILIES` lists the stops; `HERO` (read as `BACKGROUNDS.hero`) pairs each family's fill with its ink.
- Mocha (`amber-500`) is the frame: title bar, ticker, app shell, dinner header. Its rainbow stop is `HERO.mochaStop` (`amber-700`).
- Eight stops: pink, orange, ocean, bonbon (`violet-800`, white ink), peach, yellow, sky (`sky-700`, white ink), mocha. Til farveblinde
  publishes the eight Color Universal Design colours on them (`scripts/palettes/presets.ts`).
- The landing bands walk stops 0-3 (`app/pages/index.vue`), the kitchen panels 0-2 with TIL SALG grey
  (`COMPONENTS.kitchenPanel`), cooking team n wears stop n-1 and team 9 repeats team 1 (`getRainbowBand`). The ticker chips follow
  the family order.
- Mockups: `app/pages/index.vue` and `app/components/dinner/KitchenPreparation.vue` headers.

## Palettes

- **Options.** Glade farver (`default`, AA), Høj kontrast (`high-contrast`, AAA), Til farveblinde (`colorblind`, AA, colour-safe).
  `PALETTES` holds each key's level and `colourSafe`; `UserPreferencesCard.vue` renders the contrast badge from the level and the
  colour-vision badge from `colourSafe`.
- **Mechanism.** Glade farver is the base: `palettes/default.css` applies under `html:not([data-palette])`. A preset redeclares
  `--color-<family>-<step>`, `--ui-<slot>` and `--ui-color-<slot>-<step>` under `html[data-palette="<key>"]`. Each block has a `.dark`
  mirror and outranks the variables Nuxt UI writes at runtime. `app/layouts/default.vue` writes `data-palette` (omitted for
  `default`) and `data-text-scale` from the session user's `appearance`; SSR renders them.
- **Generator.** `scripts/palettes/presets.ts` (data), `render.ts` (hue map, slot re-pointing, OKLCH lightness walk to the preset's
  level), `generate.ts` (CLI). Run after a change to the `main.css` scales, `ui.colors` or a token that adds a fill or an ink, and
  commit the output:

  ```bash
  make palettes            # npx jiti scripts/palettes/generate.ts
  ```

- **Checks** (`npx vitest run tests/component/architecture`): `designSystemContrast.unit.spec.ts` measures every pair
  `designSystemPairs.ts` walks from the tokens at each preset's level and compares each committed file with a fresh render;
  `designSystemColourVision.unit.spec.ts` measures meaning pairs and rainbow stops under three vision types (ΔE ≥ 0.075 in Oklab);
  `palettes.ts` derives the measured list from `PALETTES`.
- **Preview** in the browser console:

  ```js
  document.documentElement.dataset.palette = 'high-contrast'   // 'colorblind'
  delete document.documentElement.dataset.palette             // Glade farver
  document.documentElement.classList.toggle('dark')
  ```

### Contrast criteria

| Criterion | Bar | Scope |
|---|---|---|
| WCAG 2.1 1.4.3 (AA) | 4.5:1 body text, 3:1 large text (24px, or 18.66px bold) | every face a token renders; the smallest sets the bar |
| 1.4.3 for a fill | the bar of the text a component places on it | `INK_ON_FILL` in `designSystemPairs.ts`, one row per surface with the component that draws it |
| 1.4.6 (AAA) | 7:1 body text, 4.5:1 large text | Høj kontrast |
| 1.4.11 | 3:1 | edges that identify a control or carry meaning; `LAYOUTS.sectionDivider`, `LAYOUTS.panelDivider` and the economy-tree banding sit outside it |

A surface that changes what it carries updates `INK_ON_FILL` in the same commit.

## Design ideas
- understory.io - pantone colors, with contrasting type colors
- round corner box with a paired box neighbour dd
- semi transparent menu stays at the top (but with offset) in mobile mode / and a hamburger menu / slides out - in
- weird lenses for background and images on top
