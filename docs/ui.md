# UI design and usability considerations

## UI Framework
- Tailwind 4
- Nuxt UI 3

We try to a large extent to use the built-in components from Nuxt UI 3, and extend them with our own styles in [app/assets/main.css](../app/assets/main.css).
The only extension this far is custom colors.

## TheSlope Design System

TheSlope uses a custom color palette inspired by Pantone Color of the Year 2025 and deliciousness themes. Colors are defined in three layers:

1. **Tailwind Layer** (`app/assets/css/main.css`) - Full 50-950 scale for each color
2. **NuxtUI Theme** (`nuxt.config.ts`) - Color aliases for component usage
3. **Component Usage** - Semantic color names in templates

### Complete Color Reference Table

<style>
.color-swatch {
    display: inline-block;
    width: 30px;
    height: 30px;
    border-radius: 4px;
    border: 1px solid #ccc;
    vertical-align: middle;
    margin-right: 8px;
}
</style>

| Color | Pantone Name | Base Hex | Tailwind Name | NuxtUI Alias | Type | Usage |
|-------|--------------|----------|---------------|--------------|------|-------|
| <span class="color-swatch" style="background-color: #a47864;"></span> | **Mocha Mousse** | `#a47864` | `amber-500` | `mocha` | Custom | Cooking teams |
| <span class="color-swatch" style="background-color: #fa7b95;"></span> | **Pink Lemonade** | `#fa7b95` | `pink-500` | `pink` | Custom | Cooking teams, calendar events |
| <span class="color-swatch" style="background-color: #ec6a37;"></span> | **Mandarin Orange** | `#ec6a37` | `orange-500` | `orange` | Custom | Cooking teams |
| <span class="color-swatch" style="background-color: #7e212a;"></span> | **Winery** | `#7e212a` | `winery-900` | `winery` | Custom | Cooking teams |
| <span class="color-swatch" style="background-color: #c4516c;"></span> | **Party Punch** | `#c4516c` | `party-700` | `party` | Custom | Cooking teams |
| <span class="color-swatch" style="background-color: #ffb482;"></span> | **Peach Cobbler** | `#ffb482` | `peach-300` | `peach` | Custom | Cooking teams, countdown timer |
| <span class="color-swatch" style="background-color: #ca815a;"></span> | **Caramel** | `#ca815a` | `caramel-400` | `caramel` | Custom | Cooking teams |
| <span class="color-swatch" style="background-color: #f1a9cf;"></span> | **Bonbon** | `#f1a9cf` | `violet-300` | `bonbon` | Custom | Cooking teams |
| <span class="color-swatch" style="background-color: #3c8c9e;"></span> | **Ocean/Sky** | `#3c8c9e` | `sky-500` | `ocean` | Custom | Menu hero, DINEIN mode |
| <span class="color-swatch" style="background-color: #25a6b5;"></span> | **Blue Lagoon** | `#25a6b5` | `blue-500` | `primary` / `secondary` / `info` | Semantic | Buttons, links, info messages |
| <span class="color-swatch" style="background-color: #c4746f;"></span> | **Soft Red** | `#c4746f` | `red-500` | `error` | Semantic | Error messages, cancel actions |
| <span class="color-swatch" style="background-color: #10b981;"></span> | **Green** | `#10b981` | Tailwind default `green-500` | `success` | Semantic | Success states, holidays |
| <span class="color-swatch" style="background-color: #f59e0b;"></span> | **Amber** | `#f59e0b` | `amber-500` (override) | `warning` | Semantic | TAKEAWAY mode, warnings |
| <span class="color-swatch" style="background-color: #6b7280;"></span> | **Gray** | `#6b7280` | Tailwind default `gray-500` | `neutral` | Semantic | Borders, disabled states |

### Usage in Components - TheSlope Design System (`useTheSlopeDesignSystem`)

We provide a centralized design system in `app/composables/useTheSlopeDesignSystem.ts` for consistent color, typography, layout, and sizing usage.

**Import the design system:**
```ts
const { COLOR, TYPOGRAPHY, LAYOUTS, BACKGROUNDS, COMPONENTS, SIZES } = useTheSlopeDesignSystem()
```

**1. For NuxtUI component colors:**
```vue
<UButton :color="COLOR.primary">Save</UButton>
<UBadge :color="COLOR.success">Active</UBadge>
<UBadge :color="COLOR.mocha">Mocha Mousse</UBadge>
```

> ⚠️ Not every component takes a raw `:color`. Families with a design-system token (`UAlert` → `ALERTS`,
> `UCalendar` → `COMPONENTS.calendarGrid`) bind the token instead — see **ALERTS** below and ADR-018.

**2. For responsive sizes (NEW!):**
```vue
<!-- ✅ GOOD: Automatic responsive sizing -->
<UButton :size="SIZES.standard">Click me</UButton>
<UBadge :size="SIZES.small">Badge</UBadge>

<!-- ❌ OLD: Manual breakpoint checking -->
<UButton :size="getIsMd ? 'lg' : 'md'">Click me</UButton>
```

**Available responsive sizes:**
- `SIZES.standard` - md on mobile, lg on desktop (most common)
- `SIZES.small` - sm on mobile, md on desktop
- `SIZES.large` - lg on mobile, xl on desktop
- `SIZES.xs`, `SIZES.sm`, `SIZES.md`, `SIZES.lg`, `SIZES.xl` - Static sizes

**3. For semantic typography:**
```vue
<h1 :class="TYPOGRAPHY.heroTitle">Welcome</h1>
<span :class="TYPOGRAPHY.footerText">Copyright 2025</span>
<p :class="TYPOGRAPHY.finePrint">Terms and conditions</p>
```

**4. For semantic layouts:**
```vue
<footer :class="LAYOUTS.footer">Footer content</footer>
<div :class="LAYOUTS.sectionDivider">Divider between sections</div>
<div :class="LAYOUTS.gridTwoCol">Two column grid</div>
```

**5. For semantic backgrounds:**
```vue
<div :class="BACKGROUNDS.hero.mocha">Hero section</div>
<div :class="BACKGROUNDS.card">Card background</div>
<section :class="BACKGROUNDS.landing.section1">Landing section</section>
```

**6. For complete component styling:**
```vue
<div :class="COMPONENTS.kitchenStatsBar">Kitchen stats</div>
```

**7. For ticket type badges:**
```vue
<UBadge :color="TICKET_TYPE_COLORS[ticketType]">{{ label }}</UBadge>
```

### Edit affordances — where a pencil is a glyph and where it is a label

| Surface | Button | Shape |
|---|---|---|
| A row in a table or list | `v-bind="BUTTONS.edit"` + `aria-label="Rediger"` | square ghost pencil, no text |
| A form card (today: the season card; detail panels keep the pencil) | `v-bind="BUTTONS.secondaryAction"` + `:color="COLOR.primary"` + `:icon="ICONS.edit"` | labelled "Rediger &lt;navn&gt;" |

The label names the record, the way the household delete button names the household.

```vue
<!-- row action -->
<UButton v-bind="BUTTONS.edit" aria-label="Rediger" data-testid="edit-allergy-type" @click="emit('edit')"/>

<!-- a record's edit entry -->
<UButton
    v-bind="BUTTONS.secondaryAction"
    :color="COLOR.primary"
    :icon="ICONS.edit"
    data-testid="edit-allergy-type"
    @click="emit('edit')"
>
  Rediger {{ shortName }}
</UButton>
```

Sites: the season card on `/admin/planning`, the "Detaljer" header of `AllergyDetailPanel`.

### QrCode — a QR code with no image service

`app/components/shared/QrCode.vue` encodes `value` with `uqr` through `encodeQrPath()` (`app/utils/qr.ts`) and draws one inline
`<svg role="img">`: a white `<rect>` under one black `<path>` of 1x1 module rects, `data-testid="qr-code"`.

| Prop | Value |
|---|---|
| `value` | what the code encodes; also the tail of `aria-label` |
| `size` | rendered edge in pixels, default 160 |
| `label` | what the code is for, read out before the value |

The colours are literal `#000000`/`#ffffff`, so the code prints under `print-color-adjust: exact`. The page owns the caption and
the surrounding layout. Site: `/admin/allergies/pdf`.

### ALERTS — the one alert pattern (ADR-018)

Every `<UAlert>` in `app/` binds a **kind**. The kind owns colour, variant, default icon and the `ui` that lets long
Danish sentences, e-mail addresses and URLs wrap instead of clipping inside the alert's `overflow-hidden` root.
The site passes only domain props: `:title`, `:description`, an `:icon` override, `:avatar`, `data-testid`, a margin `class`.

| Kind | Used for |
|------|----------|
| `info` | Prose, banners, "how this works" |
| `neutral` | Quiet system feedback: nothing here yet, read-only, last result |
| `success` | Something went right and stays right |
| `warning` | Look before acting: deadlines, power mode, poster notes |
| `error` | Something failed or is cancelled |
| `legend` | "Forklaring" panels — a bordered box around badges, lists and selectors |
| `emptyState` | Centred, large, emoji avatar — stays vertical even with a CTA |
| `emptyStateCompact` | Empty state inside a panel or a row |

`withActions` is a **modifier**, not a kind: spread it after a kind when the alert carries action buttons, and they
sit beside the text on desktop, below it on a phone. Empty states keep their CTA centred and do not take it.

```vue
<UAlert v-bind="ALERTS.warning" title="Fraflytning" :description="text"/>

<!-- colour chosen at runtime: pick between kinds, never a raw :color -->
<UAlert v-bind="errored ? ALERTS.error : ALERTS.neutral" title="Sidste ændring"/>

<!-- with actions -->
<UAlert v-bind="{...ALERTS.info, ...ALERTS.withActions}" title="Du besøger en anden husstand">
  <template #actions><UButton>Admin røre alligevel</UButton></template>
</UAlert>
```

A component that takes the kind from its parent types the prop as `AlertKind`
(`AllergyManagersList.vue`: `kind?: AlertKind`, default `'info'`; the poster passes `kind="neutral"`).
When a site must add to the kind's `ui`, it **merges** on top so the wrap classes survive:

```ts
const alertUi = computed(() => ({
  ...ALERTS[props.kind].ui,
  description: `${ALERTS[props.kind].ui.description} flex flex-col md:flex-row md:items-center gap-3`
}))
```

`tests/component/architecture/designSystemUsage.unit.spec.ts` fails the build on a `<UAlert` without an `ALERTS`
token or with a raw `color`/`variant`/`type` prop.

### Colour comes from the design system

`app/composables/useTheSlopeDesignSystem.ts` owns every colour value in the app. A `.vue` file references a token;
`app/components/icons/Logo.vue` holds the brand SVG's hex values.

| At the site | Take |
|---|---|
| A NuxtUI `color` prop (`color`, `ring-color`, `initial-color`, `loading-color`) | `:color="COLOR.<name>"`, or the domain token that already answers it (`TICKET_TYPE_COLORS`, `ORDER_STATE_COLORS`, `DINNER_STATE_BADGES`, `ALERTS`, `RESIDENCY_CONFIG`) |
| Text volume, loudest to quietest | `TEXT.ink` → `TEXT.strong` → `TEXT.toned` → `TEXT.muted` → `TEXT.dimmed`, or a `TYPOGRAPHY` style that carries its own colour (`bodyTextMuted`, `sectionSubheading`) |
| A recessed surface | `BG.panel` (an expanded row and the detail panel under it), `BG.panelNested` (a block that reads above a panel), `BG.panelHover` (a list row's hover face), `BG.inset` (a box inside a card) |
| A surface or line with one owner | `BG.ticket`, `BG.budgetHead`, `BG.invoiceGround`, `BG.invoiceStat`, `TEXT.timestamp`, `TEXT.menuBody`, `LAYOUTS.panelDivider` |
| A palette fill, ink, border or ring | `BG.<family>[shade]`, `TEXT.<family>[shade]`, `BORDER.<family>[shade]`, `RING.<family>[shade]` |
| A surface a domain constant already describes | `COMPONENTS.economyTable.level<n>` (`header`, `statBox`, `icon`, `border`, `footer`, `tableHead`), `CALENDAR`/`CHEF_CALENDAR`/`DINNER_CALENDAR`/`PLANNING_CALENDAR`, `getRibbonClasses`, `getKitchenPanelClasses`, `getPantoneChip`, `BACKGROUNDS` |

A token carries one rendered value, light rung and dark rung together. Two surfaces that draw different values take
two tokens, named by where they are used.

```vue
<UBadge :color="COLOR.success" variant="subtle">Igangværende</UBadge>
<span :class="[TYPOGRAPHY.finePrint, TEXT.muted]">{{ count }} beboere</span>
<div :class="['p-4', BG.panel]"><!-- expanded row --></div>
<div :class="`rounded-full ring-2 ${RING.amber[500]}`"><!-- chef portrait --></div>
```

`tests/component/architecture/designSystemUsage.unit.spec.ts` reads every `.vue` under `app/` and fails on a Tailwind
palette shade (`bg-gray-50`, `dark:text-neutral-400`, `ring-red-700`, including `dark:`/`hover:`/`md:` forms) and on a
literal colour in a component prop (`color="primary"`, `:color="'error'"`). It reports `file:line`.

**Available exports:**
- `COLOR` - NuxtUI component color prop values ('primary', 'mocha', 'success', etc.)
- `SIZES` - Responsive size patterns for NuxtUI components (standard, small, large)
- `TYPOGRAPHY` - Text styling patterns (heroTitle, footerText, finePrint, etc.)
- `LAYOUTS` - Layout patterns (footer, grids, `sectionDivider`, `panelDivider` for the rule above a detail panel's action row)
- `BACKGROUNDS` - Background+text combinations (hero, card, landing sections)
- `COMPONENTS` - Complete component styling (kitchen panels, stats bar)
- `COMPONENTS.calendarGrid` - Shared `UCalendar` root config (`v-bind` it) - Monday-first, no padding weeks, adjacent-month days disabled and hidden
- `ALERTS` - Shared `UAlert` config (`v-bind` a kind) + the `withActions` modifier; `AlertKind` types a kind prop
- `BUTTONS` - Standardized button configs with responsive sizing (`v-bind` it): `edit` (square ghost row action - pair with `ICONS.trash` + an `aria-label` for a row delete), `cancel`, `save`, `primaryAction`, `secondaryAction`, `more`; the caller supplies `:color` and, for the action pair, `:icon`. See **Edit affordances** for which of `edit` and `secondaryAction` a surface takes
- `ICONS` - Icon names for `:icon`, `:trailing-icon` and `<UIcon :name>`, including `ICONS.holiday` (season holiday rows), `ICONS.printer` (the allergy poster) and `ICONS.calendar` (date inputs bind it as `:trailing-icon`)
- `dayCircleClasses(...variants)` - THE calendar day circle (responsive size + `CALENDAR.day.shape` + the variants a surface adds). Every calendar day renders through it: `CalendarDisplay`, `TeamCalendarDisplay`, `DinnerCalendarDisplay`, `ChefCalendarDisplay` and both date pickers
- `CALENDAR.picker` - What a picked day looks like: `holiday` is `CALENDAR.holiday` (the green ring the preview draws), `cookingDay` is `PLANNING_CALENDAR.day.generated` (the filled pink of a cooking day with a dinner). The pickers draw it in their `#day` slot; `calendarPickerProps()` adds `CALENDAR.pickerCell` to `COMPONENTS.calendarGrid` so the cell trigger keeps its own fill out of the way
- `PLANNING_CALENDAR` - Season planning day palette (`day.generated` filled, `day.potential` outline)
- `BG` - Background scale per family, plus the surface-depth tokens `panel`, `panelNested`, `panelHover` and `inset`, and the single-owner surfaces `ticket`, `budgetHead`, `invoiceGround` and `invoiceStat`
- `TEXT` - Text scale per family, plus the foreground-volume tokens `ink`, `strong`, `toned`, `muted` and `dimmed`, and the single-owner lines `timestamp` and `menuBody`
- `BORDER` - Border color scale (low-level, use LAYOUTS instead)
- `RING` - Ring color scale for `ring-*` utilities: selection outlines, marker circles, armed confirm states
- `COMPONENTS.segmentedActive` - The selected item in a segmented control (`FormModeSelector`, `BookingViewSwitcher`)
- `COMPONENTS.choiceGroup` - Shared `URadioGroup` / `USwitch` config (`v-bind` a shape): `stacked` (one option under the other), `inline` (side by side from md up), `single` (a lone control). Every shape puts the option label on the body size in regular weight, so it reads under its section heading (`TYPOGRAPHY.sectionSubheading`) instead of competing with it
- `PANTONE_CHIPS` / `getPantoneChip(index)` - One tinted chip per brand family, cycled by index (landing ticker)
- `RAINBOW` / `getRainbowBand(index)` / `getRainbowFamily(index)` - The nine brand stops (fill + ink classes), cycled by index, and the family behind a stop: landing bands, kitchen panels, cooking teams (see **The brand rainbow**)
- `getKitchenPanelClasses(mode)` - Helper for kitchen panels
- `TICKET_TYPE_COLORS` - Ticket type to color mapping

## Palettes

A palette preset redeclares `--color-<family>-<step>` under `html[data-palette="…"]`, so one attribute
on `<html>` reaches Nuxt UI's semantics and the design system's utilities together. Generated values live
only in `app/assets/css/palettes/*.css`; `main.css` imports them next to its other imports and keeps its
own `@theme static` as the published palette.

Four options: **Farveglad**, the published palette a member gets without choosing, and the three generated
presets below.

**Tydelig** (`tydelig.css`) is TheSlope's own hues at the lightness EN 301 549 → WCAG 2.1 AA asks for, and it meets that level on all 438 pairs the design system defines, in light and dark.
The generator walks each step of a failing pair along OKLCH lightness with the hue and the chroma held,
so Mocha Mousse stays Mocha Mousse and reads at 4.5:1. The eight neutral surfaces (`page`, `BG.panel`,
`BG.panelNested`, `BG.inset`, `BG.ticket`, `BG.invoiceGround`, `BG.invoiceStat`, `BG.budgetHead`) keep
their published value, because a surface is the ground every other pair stands on. The light block
carries 21 steps, the dark block 37 — the dark block also restates a step the light block moved where
dark mode wants the published value back.

**Slot re-pointing.** Nuxt UI's colours plugin points `--ui-<slot>` at the 500 rung in light and the 400
in dark, so a solid button's white label is measured against the rung the brand paints with. For each
slot whose solid face misses its level's body-text bar at that rung, the preset emits `--ui-<slot>: var(--ui-color-<slot>-600)`
in the light block and the 300 rung in the dark block. That puts the button's demand on 600/300 and leaves
500 to the bands and the chips: `pink-500`, `party-700` and `ocean-500` keep their published value under
Tydelig. All three presets re-point the same thirteen slots: `caramel`, `error`, `info`, `neutral`,
`ocean`, `party`, `peach`, `primary`, `secondary`, `success`, `warning`, `winery`, `yellow`. At 7:1 the
600 and 300 rungs still carry the label, so Høj kontrast re-points to the same pair of rungs.

**Farveblind** (`colorblind.css`) maps the meaning-bearing families onto the Color Universal Design
anchors (Okabe & Ito) and then takes the same AA walk, so it meets EN 301 549 → WCAG 2.1 AA on all 438
pairs as well. Each anchor becomes a 50-950 scale: the anchor's OKLCH hue and chroma, the published
family's lightness ladder rung by rung, chroma clamped to the sRGB gamut where a pale rung has no room
for it. The light block carries 77 steps, the dark block 35.

| Family | Meaning it carries | Anchor | Published as |
|---|---|---|---|
| `green` | success, active season, CHILD ticket, holiday ring | bluish green `#009E73` | `--color-green-*` |
| `red` | error, released orders, cancellations, delete confirm | vermillion `#D55E00` | `--color-red-*` |
| `orange` | warning, power mode, deadline ring, CTAs | orange `#E69F00` | `--color-orange-*` |
| `yellow` | deadline chips | yellow `#F0E442` | `--color-yellow-*` |
| `pink` | secondary, generated cooking days, picker selection | reddish purple `#CC79A7` | `--color-pink-*` |
| `info` slot | info alerts, guest rows, claimed orders | blue `#0072B2` | `--ui-color-info-*` |

**Scale or slot.** Two of the six families are also brand: `orange` is landing band 1 and the SPISESAL
kitchen panel, `violet` is the Bonbon band and chip. The rule is the distance to the anchor. Mandarin
Orange sits 36° from the CUD orange, so the scale moves and band 1 moves with it, from `#ec6a37` to
`#bc8100`, 6.28:1 against its black ink where the published value reads 6.68:1. Bonbon sits 110° from the CUD blue, so the preset moves the
*slot* instead: `--ui-color-info-<step>` is the variable Nuxt UI's colours plugin points the `info`
scale at, so `bg-info` and `text-info-600` take the blue while `--color-violet-*` keeps painting the
band and the chip. The brand families `amber`, `blue`, `sky`, `party`, `peach`, `caramel` and `winery`
keep their published hue in every preset.

**Høj kontrast** (`high-contrast.css`) takes Tydelig's procedure to the enhanced level: EN 301 549 →
WCAG 2.1 1.4.6 asks 7:1 of body text and 4.5:1 of large-scale text, and 1.4.11 keeps borders, rings and
UI boundaries at 3:1, the level it defines. The hues, the chroma and the eight held surfaces are
Tydelig's, and the walk starts from the same published palette and stops at the higher bar. It meets AAA
on 423 of the 438 pairs; the light block carries 31 steps, the dark block 39. The remaining fifteen are
listed in `PRESET_FINDINGS` in `designSystemContrast.unit.spec.ts`, each with the ratio it reaches,
measured 2026-09-18, and the change that closes it.

**Regenerating.** Rerun the generator after a change to the `@theme static` scales in `main.css`, to
`ui.colors` in `app.config.ts`, or to a design-system token that adds a fill or an ink:

```bash
make palettes                             # npx jiti scripts/palettes/generate.ts
```

It rewrites every preset under `app/assets/css/palettes/`, and those files are committed. The check is
`npx vitest run tests/component/architecture`: `designSystemContrast.unit.spec.ts` renders each preset
again and compares it to the committed file, so a stale file fails with the command to run, and it
measures every preset against the inventory the generator solves (`designSystemPairs.ts`), at the level
the registry badges it. Two runs write the same bytes.

The level lives in one place: `PALETTES` in `app/composables/useUserPreferenceValidation.ts`. The card
badges it, `tests/component/architecture/palettes.ts` derives the measured list from it, and one case
holds `scripts/palettes/presets.ts` to the same names and levels.

**What the simulation measures.** `designSystemColourVision.unit.spec.ts` takes the meanings that appear
in one another's company - the alert kinds, info against secondary, the holiday ring against the cooking
day, the order states, the ticket types - resolves each through the same resolver as the contrast spec,
and measures how far apart the two stay for a dichromat. `colourVision.ts` simulates protanopia,
deuteranopia and tritanopia with the Machado, Oliveira & Fernandes (2009) matrices at severity 1.0,
applied in linear RGB, and the distance is ΔE in Oklab. The bar is **0.075**, the separation the CUD set
itself keeps on its closest pair (bluish green against reddish purple, deuteranopia); a case in the
spec re-measures that, so the bar stays tied to the data it comes from. The default theme and the
Farveblind preset are both measured, 72 cases each: 57 and 54 clear the bar today, and the rest are
listed in `FINDINGS` with their distance and run as `it.fails`.

**The two `<html>` attributes.** `app/layouts/default.vue` writes them with `useHead({htmlAttrs})` from the
logged-in user's `appearance` (`app/stores/auth.ts`), so SSR renders them and a reload keeps the look. Each is
omitted on its default value. The member picks them in "Mine indstillinger" on the dashboard
(`UserPreferencesCard.vue` → `POST /api/user/preferences`), and `useUserPreferenceValidation.ts` is the registry:
`PaletteSchema`, `TextScaleSchema` and `PALETTES`, which carries the level the contrast test verifies each preset
at — the level the card shows as the option's badge — and `colourSafe`, which marks the preset built on the
Color Universal Design anchors.

| Attribute | Values | Drawn by |
|---|---|---|
| `data-palette` | `tydelig`, `colorblind`, `high-contrast` | the preset block in `app/assets/css/palettes/<value>.css` |
| `data-text-scale` | `large` (112.5%), `larger` (125%) | the root font-size rules at the end of `app/assets/css/main.css` |

To see a preset in the browser without saving it:

```js
document.documentElement.dataset.palette = 'tydelig'     // or 'colorblind', 'high-contrast'
delete document.documentElement.dataset.palette         // back to Farveglad
document.documentElement.classList.toggle('dark')       // the dark block
```

### What the contrast criteria cover

| Rule | Scope |
|---|---|
| **1.4.3 Contrast (Minimum)** | 4.5:1 for body text, 3:1 for large-scale text — 24px, or 18.66px at `font-bold` and heavier. Every face a token renders is measured, so the smallest one sets the bar. `TYPOGRAPHY.sectionIconLight` (`text-2xl`) is measured at 3:1 |
| **1.4.3 for a fill** | A fill carries no size, so its bar comes from the typography a component places on it, listed in `INK_ON_FILL` with the component and line that draws it. A rainbow stop answers for every face its consumers draw and the smallest one binds: the first three stops carry the kitchen's `kitchenLabel` at `text-xs` and take 4.5:1, the last two carry `TYPOGRAPHY.sectionTitle` (`text-xl md:text-3xl font-bold` — large at both widths) and take 3:1 |
| **1.4.6 Contrast (Enhanced)** | 7:1 for body text, 4.5:1 for large-scale text, at the same faces and the same `INK_ON_FILL` rule. The level Høj kontrast is measured at |
| **1.4.11 Non-text Contrast** | 3:1 for the edges that identify a control or carry meaning: input and card borders, the green holiday ring, the amber and red deadline rings, the segmented-control ring, the calendar selection outlines. 3:1 at every level, so it is the same bar in all four palettes |

A surface that changes what it carries updates `INK_ON_FILL` in the same commit. `BACKGROUNDS.landing.ticker`
is left out of it: its words are `PANTONE_CHIPS`, which bring their own fill and are measured as their own pairs.

Four edge tokens draw a boundary the layout already states, and sit outside 1.4.11:

| Token | Why |
|---|---|
| `LAYOUTS.sectionDivider` | A rule between page sections; the heading and the gap separate them |
| `LAYOUTS.panelDivider` | The rule above a detail panel's action row; the buttons carry their own edges |
| `COMPONENTS.economyTable.level{1,2,3}.border` | The nesting tint of a tree row, alongside its indentation, icon and heading |
| `COMPONENTS.economyTable.level{1,2,3}.header` / `.footer` / `.statBox` / `.tableHead` | Banding of a table's header, footer and stat boxes — a surface, measured for its ink in the text groups |

## Color Usage Guidelines

### Site Identity & Brand Colors

**PRIMARY BRAND COLOR**: <span class="color-swatch" style="background-color: #a47864;"></span> **Mocha Mousse** (`amber-500`) - Pantone Color of the Year 2025. Mocha is the frame: the landing title bar, the ticker and the dinner header.

### The brand rainbow

`PANTONE_FAMILIES` in `useTheSlopeDesignSystem.ts` states the order of the palette, by hue, and `PANTONE_CHIPS` maps it for the ticker. `HERO` holds one fill and one ink per family; `RAINBOW_FAMILIES` lists the nine families that are stops and `RAINBOW` maps them, so a surface walks the rainbow by index through `getRainbowBand(i)` and takes the family behind a stop from `getRainbowFamily(i)`.

| # | Family | Fill | Ink | Contrast | Walked by |
|---|--------|------|-----|---------:|-----------|
| 0 | Pink Lemonade | <span class="color-swatch" style="background-color: #fa7b95;"></span> `pink-500` | `TEXT.black` | 8.33 | landing band 1, kitchen TAKEAWAY, madhold 1 |
| 1 | Mandarin Orange | <span class="color-swatch" style="background-color: #ec6a37;"></span> `orange-500` | `TEXT.black` | 6.27 | landing band 2, kitchen SPISESAL, madhold 2 |
| 2 | Ocean | <span class="color-swatch" style="background-color: #25a6b5;"></span> `ocean-500` | `TEXT.black` | 7.2 | landing band 3, kitchen SPIS SENT, madhold 3 |
| 3 | Bonbon | <span class="color-swatch" style="background-color: #de5697;"></span> `bonbon-500` (violet scale) | `TEXT.black` | 5.88 | landing band 4, madhold 4 |
| 4 | Party Punch | <span class="color-swatch" style="background-color: #c4516c;"></span> `party-700` | `TEXT.black` | 4.74 | madhold 5 |
| 5 | Peach Cobbler | <span class="color-swatch" style="background-color: #ffb482;"></span> `peach-300` | `TEXT.peach[950]` | 9.01 | countdowns, calendar highlights, madhold 6 |
| 6 | Winery | <span class="color-swatch" style="background-color: #a02f4b;"></span> `winery-700` | `TEXT.white` | 6.99 | madhold 7 |
| 7 | Yellow | <span class="color-swatch" style="background-color: #facc15;"></span> `yellow-400` | `TEXT.black` | 13.71 | madhold 8 |
| 8 | Sky | <span class="color-swatch" style="background-color: #305f6e;"></span> `sky-700` | `TEXT.white` | 7.03 | madhold 9 |

One family sits outside the walk: <span class="color-swatch" style="background-color: #a47864;"></span> `amber-500` with `TEXT.mocha[50]`, the frame — the landing title bar, the ticker and the dinner header.

**Nine hues, one per cooking team.** A cooking team wears the stop of its number, wrapping at nine (`getRainbowBand(teamNumber - 1)`); the badge carries the stop's fill and ink as classes. The nearest two stops sit 0.079 apart in Oklab in each registered palette, over the 0.075 bar `designSystemColourVision.unit.spec.ts` reads off the Color Universal Design set. The set has seven anchors, so a dichromat reads the team from the name or number on the badge and in the legend beside it.

**Ink on brand fills.** Each stop carries the ink that clears 4.5:1 on it in light and dark mode: `TEXT.black` on six of them, `TEXT.white` on Winery and Sky, `TEXT.peach[950]` on Peach. `TEXT.ink` serves text on a page surface; a brand fill takes the ink its `HERO` entry names.

**TIL SALG is grey.** `COMPONENTS.kitchenPanel.RELEASED` fills `gray-400` with `TEXT.black` (8.07:1) and reads as neutral beside the three dining modes. Each kitchen divider is its own family one rung deeper: `border-pink-600`, `border-orange-600`, `border-ocean-600`, `border-gray-500`.

### When to Use Each Color Type

#### Navigation & Organization
Use **cool, calm colors** for navigation:
- <span class="color-swatch" style="background-color: #dbeafe;"></span> `blue-100` - Header background
- <span class="color-swatch" style="background-color: #25a6b5;"></span> `blue-500` (primary/info) - Buttons, links

#### Cooking Teams
Team n wears rainbow stop n — the nine stops in **The brand rainbow**, wrapping at nine. `CookingTeamBadges`, `CookingTeamCard`, `TeamCalendarDisplay` and the `/admin/teams` table bind `getRainbowBand(i)` as the badge's class, `i` being the team's position in the season (`teamNumber - 1`). Mocha is the frame.

**Note**: Team cards are small components showing one color at a time - don't compete with hero sections.

#### Status & Semantic
Use **semantic colors** for states:
- <span class="color-swatch" style="background-color: #10b981;"></span> `success` (green) - Success states, holidays
- <span class="color-swatch" style="background-color: #c4746f;"></span> `error` (soft red) - Errors, cancellations
- <span class="color-swatch" style="background-color: #f59e0b;"></span> `warning` (amber) - Warnings, takeaway mode
- <span class="color-swatch" style="background-color: #25a6b5;"></span> `info` (blue) - Information messages

### Design Principles

1. **Mobile-first**: 90% of users on mobile - keep color palettes simple
2. **Visual hierarchy**: Warm vibrant hero (family-facing) → calm neutral data (functional)
3. **Site consistency**: Use landing page Pantone rainbow colors throughout site
4. **Reduce chaos**: Limit to 4-6 color families per page (down from 10+)
5. **Let heroes shine**: Neutral functional sections make hero sections pop

### Implementation Checklist

When designing a new page:
- [ ] A hero band takes `BACKGROUNDS.hero.<family>`; a series of bands walks `getRainbowBand(i)`
- [ ] Fill and ink come from the same token, so dark ink follows its fill
- [ ] Color palette uses the Pantone rainbow in `PANTONE_FAMILIES` order
- [ ] `npx vitest run tests/component/architecture` measures the contrast of every pair the tokens define
- [ ] Mobile-first responsive design
- [ ] Consistent with landing page rainbow identity

### Dinner Page Color Decision (2025-11-14)

**Selected: Option 2 - Vibrant Kitchen Panels (Maximum Color)**

**Rationale:**
- ✅ **Maximum energy**: Kitchen section celebrates Pantone palette from landing page
- ✅ **Clear differentiation**: Each dining mode has distinct color identity
- ✅ **Site consistency**: Uses amber/pink/orange from landing hero rainbow
- ✅ **Team card not competing**: Small component showing one color at a time doesn't clash
- ✅ **Respects existing design**: Keeps beautiful peach countdown/calendar unchanged
- ✅ **Mocha mousse hero**: PRIMARY brand color (Pantone 2025) featured prominently

**Color families used:** 6 total (amber/mocha, peach, warning, party, orange, gray + team rotation)

For detailed color harmony analysis and specific implementations, see:
- [Dinner Page Color Fixes](./fix-dinner-colors.md) - Detailed analysis and implementation guide

## Design ideas
- understory.io - pantone colors, with contrasting type colors
- round corner box with a paired box neighbour dd
- semi transparent menu stays at the top (but with offset) in mobile mode / and a hamburger menu / slides out - in
- weird lenses for background and images on top
