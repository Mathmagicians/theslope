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
  `COMPONENTS.calendarGrid`, and the slot name `#empty-state`; it reports `file:line`.
- A token holds one rendered value, light and dark together. Two values are two tokens, named by where they are used.
- A Nuxt UI component family gets a token, and an architecture rule, before its first use.
- Layout responds with `md:` classes; `isMd` (provided by `app/layouts/default.vue`) sets prop values.
- Specs assert usage and behaviour; a token's value is checked by eye (`docs/testing.md` → Architecture Tests).

## Tokens

| Token | For |
|---|---|
| `COLOR` | a Nuxt UI `color` prop |
| `TEXT` | ink volume `ink` → `strong` → `toned` → `muted` → `dimmed`, single-owner lines, family rungs |
| `BG` | surfaces `panel`, `panelNested`, `panelHover`, `inset`, single-owner surfaces, family rungs |
| `BORDER`, `RING` | edges and rings, family rungs |
| `TYPOGRAPHY`, `LAYOUTS`, `SIZES`, `ICONS` | text styles, layout classes, responsive sizes, icon names |
| `BUTTONS` | `edit`, `cancel`, `save`, `primaryAction`, `secondaryAction`, `settings` |
| `ALERTS` | alert kinds and the `withActions` / `withCornerAction` modifiers |
| `COMPONENTS` | `calendarGrid`, `table.ui`, `choiceGroup`, `kitchenPanel`, `segmentedActive`, `economyTable`, `powerMode`, `guestRow` |
| `CALENDAR`, `PLANNING_CALENDAR`, `CHEF_CALENDAR`, `DINNER_CALENDAR`, `dayCircleClasses`, `calendarPickerProps` | calendar days, pickers, countdowns |
| `BACKGROUNDS`, `RAINBOW`, `RAINBOW_FAMILIES`, `getRainbowBand`, `getRainbowFamily`, `PANTONE_CHIPS` | brand surfaces |
| `TICKET_TYPE_COLORS`, `ORDER_STATE_COLORS`, `DINNER_STATE_BADGES`, `DEADLINE_BADGES`, `RESIDENCY_CONFIG` | domain colour maps |

## Patterns

### Edit affordances

| Surface | Binding |
|---|---|
| Table row, card header, notes box | `v-bind="BUTTONS.edit"` + `aria-label="Rediger"`: square ghost pencil |
| Form card (the season card) | `v-bind="BUTTONS.secondaryAction"` + `:color="COLOR.primary"` + `:icon="ICONS.edit"`, label "Rediger &lt;navn&gt;" |

The ⚙ is `BUTTONS.settings` with an `aria-label`; labelled actions beside it bind `BUTTONS.secondaryAction`. A button that opens a
panel below it spreads `BUTTONS.disclosure(isOpen)`: a chevron that turns while the panel is open, and `aria-expanded`
(`UserProfileCard` and `ChefMenuCard` ⚙, `RoleAssignment`, `HelpButton`).

### Alerts

`<UAlert v-bind="ALERTS.<kind>">`; the site adds `:title`, `:description`, an `:icon` override, `:avatar`, `data-testid`, a margin class.

| Kind | For |
|---|---|
| `info` | prose, banners |
| `neutral` | quiet system feedback: empty, read-only, last result |
| `success`, `warning`, `error` | an outcome or a state to act on |
| `legend` | "Forklaring" panels, the notes box |
| `emptyState`, `emptyStateCompact` | empty states, centred |

Modifiers spread after a kind: `withActions` (buttons beside the text from md, below it on a phone), `withCornerAction` (one icon
button in the top-right corner). A runtime choice picks between kinds (`v-bind="ok ? ALERTS.success : ALERTS.error"`). A site
that adds to a kind's `ui` merges on top of it (`AllergyManagersList.vue`). The migration record: `docs/features/feature-proposal-notifications.md`
→ "In-app alerts".

### Tables

The empty state renders in the `UTable` `#empty` slot. `COMPONENTS.table.ui` wraps the cell under an expanded row.

### Choice groups

`URadioGroup` and `USwitch` bind a `COMPONENTS.choiceGroup` shape (`stacked`, `inline`, `single`); the section heading above them
takes `TYPOGRAPHY.sectionSubheading`.

### QR codes

`app/components/shared/QrCode.vue` (`value`, `size`, `label`) draws an inline SVG in black on white; the page owns the caption.

## Brand rainbow

- `PANTONE_FAMILIES` orders the families; `RAINBOW_FAMILIES` lists the stops; `HERO` (read as `BACKGROUNDS.hero`) pairs each family's fill with its ink.
- Mocha (`amber-500`) is the frame: title bar, ticker, app shell, dinner header.
- The landing bands walk stops 0-3 (`app/pages/index.vue`), the kitchen panels 0-2 with TIL SALG grey
  (`COMPONENTS.kitchenPanel`), cooking team n wears stop n-1 and the list wraps (`getRainbowBand`). The ticker chips follow the
  family order.
- Mockups: `app/pages/index.vue` and `app/components/dinner/KitchenPreparation.vue` headers.

## Palettes

- **Options.** `PALETTES` holds the keys and the level each preset is measured at; `UserPreferencesCard.vue` renders them with the
  EU badge for that level. Farveglad is the published palette.
- **Mechanism.** A preset redeclares `--color-<family>-<step>`, `--ui-<slot>` and `--ui-color-<slot>-<step>` under
  `html[data-palette="<key>"]` and its `.dark` mirror. `app/layouts/default.vue` writes `data-palette` and `data-text-scale` from
  the session user's `appearance`; SSR renders them.
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
  document.documentElement.dataset.palette = 'tydelig'   // 'colorblind', 'high-contrast'
  delete document.documentElement.dataset.palette       // Farveglad
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
