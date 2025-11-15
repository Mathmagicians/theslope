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
<UAlert :color="COLOR.warning">Warning!</UAlert>
<UBadge :color="COLOR.mocha">Mocha Mousse</UBadge>
```

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

**Available exports:**
- `COLOR` - NuxtUI component color prop values ('primary', 'mocha', 'success', etc.)
- `SIZES` - Responsive size patterns for NuxtUI components (standard, small, large)
- `TYPOGRAPHY` - Text styling patterns (heroTitle, footerText, finePrint, etc.)
- `LAYOUTS` - Layout patterns (footer, sectionDivider, grids)
- `BACKGROUNDS` - Background+text combinations (hero, card, landing sections)
- `COMPONENTS` - Complete component styling (kitchen panels, stats bar)
- `BG` - Background color scale (low-level, use BACKGROUNDS instead)
- `TEXT` - Text color scale (low-level, use TYPOGRAPHY instead)
- `BORDER` - Border color scale (low-level, use LAYOUTS instead)
- `getKitchenPanelClasses(mode)` - Helper for kitchen panels
- `TICKET_TYPE_COLORS` - Ticket type to color mapping

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
