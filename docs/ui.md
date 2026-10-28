# UI design system

Nuxt 4.3, Nuxt UI 4.3, Tailwind 4.1. Pages use Nuxt UI components; every shared UI value comes from the design system
(ADR-018 Design System Owns Shared UI Patterns). This page says where the system lives, what each token family is for and
which patterns are shared. A component's own layout lives in its header mockup and its `COMPONENTS.<name>` token.

## Where it lives

| What | File |
|---|---|
| Colour scales, 50-950 per family | `app/assets/css/main.css` `@theme static` |
| Nuxt UI slot → family (`primary`, `secondary`, `neutral`, `info`, `success`, `warning`, `error`, brand slots) | `app/app.config.ts` `ui.colors` |
| Colour names Nuxt UI generates utilities for | `nuxt.config.ts` `ui.theme.colors` |
| Tokens components bind | `app/composables/useTheSlopeDesignSystem.ts` |
| Animation keyframes and durations (`--animate-*`) | `app/assets/css/main.css` `@theme` |
| Palette presets (generated) | `app/assets/css/palettes/<key>.css`, imported by `main.css` |
| Palette options and their contrast level | `PALETTES` in `app/composables/useUserPreferenceValidation.ts` |
| Preset definitions (hue maps, levels) | `scripts/palettes/presets.ts` |
| Text scale | `html[data-text-scale]` rules at the end of `main.css` |
| Brand SVG | `app/components/icons/Logo.vue` |
| Rules that keep the system swept | `tests/component/architecture/` (`docs/testing.md` → Architecture Tests) |

## Rules

- A component binds a design-system token and passes domain props only. `designSystemUsage.unit.spec.ts` holds the
  rule list and reports a breach as `file:line`.
- A token holds one rendered value, light and dark together. Two values are two tokens, named by where they are used.
- A Nuxt UI component family gets a token, and an architecture rule, before its first use. A value that moves into a
  token moves at every site in the same change.
- A `.vue` carries no `<style>` block and no raw utility class (the one exemption is the print CSS in
  `app/pages/admin/allergies/pdf.vue`). An animation is a `--animate-*` keyframe in `main.css`, reached through a token
  that also carries `motion-reduce:animate-none`.
- The design system is the one reader of the layout's breakpoint: a value that follows the breakpoint is a responsive
  token, and behaviour reads `breakpoint` (`isMd`, `measured`) from the composable; the usage spec fails any other inject
  of it.
- Specs assert usage and behaviour; a token's value is checked by eye in the package's visual check.

## Tokens

| Family | For |
|---|---|
| `COLOR`, `NOISE` | a Nuxt UI `color` prop; a Nuxt UI `variant` prop read as an emphasis ladder |
| `TEXT`, `BG`, `BORDER`, `RING` | ink, surfaces, edges and rings: shared rungs, single-owner values named by their owner, family rungs |
| `TYPOGRAPHY`, `LAYOUTS`, `SIZES`, `ICONS` | text styles, layout classes, responsive sizes, icon names |
| `BUTTONS`, `ALERTS` | button kinds and alert kinds; a toggle kind takes its open state, a modifier spreads after a kind |
| `COMPONENTS` | one key per component or shared element that owns a layout, named after it; the keys inside name the parts its header mockup draws |
| the calendar tokens | days, pickers, countdowns, one palette per calendar surface |
| the brand tokens | rainbow stops, hero surfaces, pantone chips (Brand rainbow below) |
| the domain maps | ticket type, order state, dinner state, deadline, residency, role glyphs |

## Shared patterns

### Edit affordances

| Surface | Binding |
|---|---|
| Table row, card header, notes box | `v-bind="BUTTONS.edit"` + `aria-label="Rediger"`: square ghost pencil |
| Form card, detail panel header | `v-bind="BUTTONS.secondaryAction"` + `:color="COLOR.primary"` + `:icon="ICONS.edit"`, label "Rediger &lt;navn&gt;" |
| Line in a list | `v-bind="BUTTONS.remove"` + `aria-label="Slet"`: square ghost trash in the row's last column |

The settings wheel is `BUTTONS.settings` with an `aria-label`; labelled actions beside it bind `BUTTONS.secondaryAction`. A
button that opens a panel below it spreads `BUTTONS.flipOpen(isOpen)`: a chevron that turns while the panel is open, and
`aria-expanded`. A chevron on another icon slot binds the same turn through its owner's token.

### Collapsible panels

A panel that opens and closes is a `UCollapsible` with its toggle outside it: a `UButton` spreading `BUTTONS.flipOpen(isOpen)`,
and the collapsible binds a `COMPONENTS.collapsible` kind for its spacing. The toggle and the other controls of a header are
siblings in a plain row, so no button holds another. The chef calendar header in `ChefCalendarDisplay.vue` is the reference:
tabs on the left, the chevron on the right, the body below. A title with its chevron shares `COMPONENTS.collapsible.headerRow`.

### Separators

A rule with words on it is a `USeparator` with a `label`, bound to a `COMPONENTS.separator` kind; the moment line in a
history (`TicketChanges.vue`) is the reference.

### Alerts

`<UAlert v-bind="ALERTS.<kind>">`; the site adds `:title`, `:description`, an `:icon` override, `:avatar`, `data-testid`, a margin class.

| Kind | For |
|---|---|
| `info` | prose, banners |
| `neutral` | quiet system feedback: empty, read-only, last result |
| `success`, `warning`, `error` | an outcome or a state to act on |
| `legend` | "Forklaring" panels (`CalendarLegend`, `DinnerModeLegend`, entries in `COMPONENTS.legend`: one entry per row, the sample in a fixed-width column, every explanation on one vertical line), the notes box |
| `emptyState`, `emptyStateCompact` | empty states, centred |

Modifiers spread after a kind: `withActions` (buttons beside the text from md, below it on a phone), `withCornerAction` (one
icon button in the top-right corner). A runtime choice picks between kinds (`v-bind="ok ? ALERTS.success : ALERTS.error"`). A
site that adds to a kind's `ui` merges on top of it.

### Tables

The empty state renders in the `UTable` `#empty` slot. A table bound to a dataset that reloads binds that dataset's `loading`: UTable's loading bar runs under the column headers while the rows stay. Its `#loading` slot, the spinning sync glyph and a line of text from the table tokens, fills a table that has no rows yet, so the empty state shows only once the data has answered. `COMPONENTS.table.ui` cells wrap between words and keep words, dates
and e-mails whole; a dense variant per surface sits beside it (`table.catalogUi`, `table.bookingUi`, …). A data table wider
than a phone scrolls inside its own box; `table.historyUi` keeps each row on one line, so a history scrolls sideways on a
phone. A history cell that lists many names (Husstand in `TicketChanges.vue`) shows the first two and a link counting
the rest; opened, the list wraps inside the cell's capped width while the other cells keep their line. A column sizes through its `meta.class` (`{th, td}`); `COMPONENTS.masterDetail` holds the master table's
`primaryColumn` and `compactColumn`. A row that spans the table, the moment line in `TicketChanges.vue`, sets the first
column's `meta.colspan.td` to the column count and binds `table.spannedCell` on the other cells. An `#expanded` row
spans every column: in a table that scrolls sideways, its content keeps to the part of the box in view, sticky at the
cell's inset and no wider than the box (`table.gridUi` and `table.adminUsersUi` make their box a size container on a
phone; `bookingGrid.expandedPanel` holds the booking grid's guest form, `adminUsers.expandedPanel` the user's profile
card).

### Choice groups

`URadioGroup` and `USwitch` bind a `COMPONENTS.choiceGroup` shape (`stacked`, `inline`, `single`); the section heading above
them takes `TYPOGRAPHY.sectionSubheading`.

### Team tabs

A `UTabs` whose triggers render `CookingTeamBadges` binds `COMPONENTS.teamTabs`: the link variant, triggers that keep their
full label, and a horizontal row that scrolls sideways when more tabs than fit. On a phone the trigger stacks `ICONS.team`
over the compact badge (`MyTeamSelector`, `COMPONENTS.myTeamSelector`). A team on view the person is not on rides as
the last tab, with "Ikke dit hold" on its name's line (`COMPONENTS.visitBadge`), and counts toward the vertical list.

### A cancelled dinner

A cancelled dinner reads as a past day struck through on every member surface: the calendar day binds the past circle
with the cancelled strike (`CALENDAR.day`), a ticket and a grid cell's mode badge bind the cancelled faces of their own
tokens, built from the same past-day colours and strike, the grid's column header carries the dinner state badge in the
lock chip's place, and the booking form and the chef's card wear the cancel corner ribbon (`getRibbonClasses`).

### Master-detail pages

A page or tab that sets a calendar or a list beside the item it opens binds `LAYOUTS.masterDetailPage`: on `UPage :ui`, or
on its own containers through the same `root`, `left` and `center` slots. A phone stacks the master over the detail; from
md the master takes a third of the row, never narrower than a week of the calendar's day circles, and the detail takes the
rest, never wider. The calendar's day circle steps up a size at lg. A master table whose detail docks under its row on a
phone mounts the detail through `COMPONENTS.masterDetail`.

### Faces

A face in `UserListItem` rings from md in a colour already on the surface its faces sit on: the caller passes the
surface's key in `COMPONENTS.userListItem.ring`, built on the `RING` family. On a phone no face rings.

### A printed page

A page made to print renders in light mode whatever the member's mode, through `colorMode: 'light'` in its page meta,
and sits on `BG.page`, the page surface the contrast gate measures. The allergy poster
(`app/pages/admin/allergies/pdf.vue`, `COMPONENTS.allergyPoster`) is the reference.

### Component layouts

A layout one component owns is drawn in that component's header and bound through the `COMPONENTS` key that carries its
name; the header also names the visual check.

## Brand rainbow

- `PANTONE_FAMILIES` orders the families; `RAINBOW_FAMILIES` holds the eight stops and `HERO` (read as `BACKGROUNDS.hero`) pairs each fill with its ink. Til farveblinde
  publishes the Color Universal Design colours on the stops (`scripts/palettes/presets.ts`).
- Mocha is the frame: title bar, ticker, app shell, dinner header.
- The landing bands, the kitchen panels and the cooking teams walk the stops in order (`getRainbowBand`); a team wears the stop of its number and the ninth repeats the first.
- A team's number is the one in its name ("Madhold N"), else its position in the season's team list (`getTeamNumber` in
  `useCookingTeam`); every site that shows a team takes its band from that number.
- Mockups: `app/pages/index.vue` and `app/components/dinner/KitchenPreparation.vue` headers.

## Palettes

- **Options.** Glade farver (`default`, AA), Høj kontrast (`high-contrast`, AAA), Til farveblinde (`colorblind`, AA, colour-safe).
  `PALETTES` holds each key's level and `colourSafe`; `UserPreferencesCard.vue` renders the badges from them.
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
  `designSystemPairs.ts` walks from the tokens in each committed palette file at its preset's level;
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
| 1.4.11 | 3:1 | edges that identify a control or carry meaning; `LAYOUTS.sectionDivider`, `LAYOUTS.panelDivider`, the economy-tree banding and its invoice frame sit outside it |

A surface that changes what it carries updates `INK_ON_FILL` in the same commit.

## Design ideas
- understory.io - pantone colors, with contrasting type colors
- round corner box with a paired box neighbour dd
- semi transparent menu stays at the top (but with offset) in mobile mode / and a hamburger menu / slides out - in
- weird lenses for background and images on top
