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
- `PANTONE_CHIPS` / `getPantoneChip(index)` - One tinted chip per brand family, cycled by index (landing ticker)
- `getKitchenPanelClasses(mode)` - Helper for kitchen panels
- `TICKET_TYPE_COLORS` - Ticket type to color mapping

## Palettes

A palette preset redeclares `--color-<family>-<step>` under `html[data-palette="…"]`, so one attribute
on `<html>` reaches Nuxt UI's semantics and the design system's utilities together. Generated values live
only in `app/assets/css/palettes/*.css`; `main.css` imports them next to its other imports and keeps its
own `@theme static` as the published palette.

**Tydelig** (`tydelig.css`) is TheSlope's own hues at the lightness EN 301 549 → WCAG 2.1 AA asks for.
The generator walks each step of a failing pair along OKLCH lightness with the hue and the chroma held,
so Mocha Mousse stays Mocha Mousse and reads at 4.5:1. The eight neutral surfaces (`page`, `BG.panel`,
`BG.panelNested`, `BG.inset`, `BG.ticket`, `BG.invoiceGround`, `BG.invoiceStat`, `BG.budgetHead`) keep
their published value, because a surface is the ground every other pair stands on. The light block
carries 25 steps, the dark block 34 — the dark block also restates a step the light block moved where
dark mode wants the published value back.

```bash
npx jiti scripts/palettes/generate.ts     # rewrites app/assets/css/palettes/tydelig.css
```

Two runs write the same bytes. `tests/component/architecture/designSystemContrast.unit.spec.ts` measures
every preset against the inventory the generator solves (`designSystemPairs.ts`), at the level the
preset's name promises. To see a preset in the browser before the appearance preference ships:

```js
document.documentElement.dataset.palette = 'tydelig'   // back to Standard: delete document.documentElement.dataset.palette
document.documentElement.classList.toggle('dark')      // the dark block
```

### What the contrast criteria cover

| Rule | Scope |
|---|---|
| **1.4.3 Contrast (Minimum)** | 4.5:1 for body text, 3:1 for large-scale text — 24px, or 18.66px at `font-bold` and heavier. A token states its own size, and the bare class decides, since a `md:` face is the larger one. `TYPOGRAPHY.sectionIconLight` (`text-2xl`) is measured at 3:1 |
| **1.4.11 Non-text Contrast** | 3:1 for the edges that identify a control or carry meaning: input and card borders, the green holiday ring, the amber and red deadline rings, the segmented-control ring, the calendar selection outlines |

Four edge tokens draw a boundary the layout already states, and sit outside 1.4.11:

| Token | Why |
|---|---|
| `LAYOUTS.sectionDivider` | A rule between page sections; the heading and the gap separate them |
| `LAYOUTS.panelDivider` | The rule above a detail panel's action row; the buttons carry their own edges |
| `COMPONENTS.economyTable.level{1,2,3}.border` | The nesting tint of a tree row, alongside its indentation, icon and heading |
| `COMPONENTS.economyTable.level{1,2,3}.header` / `.footer` / `.statBox` / `.tableHead` | Banding of a table's header, footer and stat boxes — a surface, measured for its ink in the text groups |

## Color Usage Guidelines

### Site Identity & Brand Colors

**PRIMARY BRAND COLOR**: <span class="color-swatch" style="background-color: #a47864;"></span> **Mocha Mousse** (`amber-500`) - Pantone Color of the Year 2025

The site identity is expressed through a **full-bleed rainbow** on the landing page:

| Section | Color | Usage | Text Color |
|---------|-------|-------|-----------|
| Title Bar | <span class="color-swatch" style="background-color: #a47864;"></span> `amber-500` | PRIMARY brand color | `amber-50` |
| Ticker | <span class="color-swatch" style="background-color: #a47864;"></span> `amber-500` | PRIMARY brand color | `amber-50` |
| Section 1 | <span class="color-swatch" style="background-color: #fa7b95;"></span> `pink-500` | Vibrant accent (households) | `pink-50` |
| Section 2 | <span class="color-swatch" style="background-color: #ec6a37;"></span> `orange-500` | Vibrant accent (community) | `orange-100` |
| Section 3 | <span class="color-swatch" style="background-color: #c4516c;"></span> `party-700` | Deep burgundy (dining) | `party-50` |
| Section 4 | <span class="color-swatch" style="background-color: #3c8c9e;"></span> `ocean-500` | Cool teal (nature) | `ocean-50` |

**Rainbow Progression**: Warm mocha → vibrant pink → bright orange → deep burgundy → cool ocean

### When to Use Each Color Type

#### Hero Sections (Family-Facing)
Use **warm, inviting colors** for user-facing hero sections:
- <span class="color-swatch" style="background-color: #a47864;"></span> `amber-500` (mocha mousse) - PRIMARY for main hero sections
- <span class="color-swatch" style="background-color: #fa7b95;"></span> `pink-500` - Vibrant accent
- <span class="color-swatch" style="background-color: #ec6a37;"></span> `orange-500` - Vibrant accent
- <span class="color-swatch" style="background-color: #ffb482;"></span> `peach-300` - Countdown timers, calendar highlights

**Example**: Dinner page hero should use `bg-amber-500` (mocha mousse)

#### Functional Data Sections (Kitchen/Admin)
Use **vibrant Pantone colors** for functional data display to celebrate the full rainbow:
- <span class="color-swatch" style="background-color: #f59e0b;"></span> `warning-500` (amber) - TAKEAWAY mode
- <span class="color-swatch" style="background-color: #c4516c;"></span> `party-700` (burgundy) - DINEIN mode
- <span class="color-swatch" style="background-color: #ec6a37;"></span> `orange-500` (mandarin) - DINEINLATE mode
- <span class="color-swatch" style="background-color: #6b7280;"></span> `gray-500` - RELEASED (neutral)
- <span class="color-swatch" style="background-color: #f8f5f2;"></span> `amber-50` - Subtle backgrounds with mocha tint

**Why vibrant?** Maximum color energy, celebrates the Pantone palette from the landing page, clear visual differentiation between dining modes. Uses the same amber/pink/orange colors from the site identity rainbow.

#### Navigation & Organization
Use **cool, calm colors** for navigation:
- <span class="color-swatch" style="background-color: #dbeafe;"></span> `blue-100` - Header background
- <span class="color-swatch" style="background-color: #25a6b5;"></span> `blue-500` (primary/info) - Buttons, links

#### Cooking Teams
Teams rotate through **8 Pantone colors** for identity:
- mocha, pink, orange, winery, party, peach, caramel, bonbon

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
- [ ] Hero section uses mocha mousse (`amber-500`) or Pantone accent colors
- [ ] Kitchen/functional data sections use **vibrant Pantone colors** (Option 2: Maximum Color)
  - TAKEAWAY: `warning-500` (amber)
  - DINEIN: `party-700` (burgundy pink)
  - DINEINLATE: `orange-500` (mandarin orange)
  - RELEASED: `gray-500` (neutral)
- [ ] Color palette uses Pantone rainbow from landing page
- [ ] Text contrast meets WCAG AA standards (check with contrast checker)
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
