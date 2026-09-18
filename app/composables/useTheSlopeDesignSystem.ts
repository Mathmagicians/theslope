import type {WeekDay} from '~/types/dateTypes'
import type {AlertProps, AvatarProps, ButtonProps, BadgeProps, ChipProps} from '@nuxt/ui'

// NuxtUI size types extracted from component props
export type NuxtUISize = NonNullable<ButtonProps['size']>
export type NuxtUIAvatarSize = NonNullable<AvatarProps['size']>
export type NuxtUIChipSize = NonNullable<ChipProps['size']>
export type NuxtUIBadgeColor = NonNullable<BadgeProps['color']>
export type NuxtUIBadgeVariant = NonNullable<BadgeProps['variant']>
export type NuxtUIButtonVariant = NonNullable<ButtonProps['variant']>

/**
 * Color System - TheSlope Design System
 *
 * Central source of truth for color usage across the application.
 * Based on Pantone Color of the Year 2025 (Mocha Mousse) and deliciousness themes.
 *
 * USAGE:
 *
 * 1. For NuxtUI components (UButton, UBadge, UAlert, UCard):
 *    ```vue
 *    <UButton :color="COLOR.primary">Click me</UButton>
 *    <UBadge :color="COLOR.success">Active</UBadge>
 *    ```
 *
 * 2. For Tailwind classes (div, section, etc.):
 *    ```vue
 *    <div :class="CLASSES.hero.primary">Hero Section</div>
 *    <section :class="CLASSES.landing.section1">Content</section>
 *    ```
 *
 * 3. For dynamic class building:
 *    ```ts
 *    const heroClass = `${BG.mocha[500]} ${TEXT.mocha[50]}`
 *    ```
 *
 * See docs/ui.md for full color usage guidelines.
 */

// ============================================================================
// PART 1: NuxtUI Component Colors (for :color prop)
// ============================================================================

/**
 * COLOR - For NuxtUI component `color` prop
 *
 * Use these string values directly in component color props.
 * <UAlert :color="COLOR.warning">Warning!</UAlert>
 * ```
 */
export const COLOR = {
    // Semantic colors (mapped in app.config.ts → ui.colors)
    primary: 'primary',       // Amber (mocha/brown) - brand color, use for non-hero contexts
    secondary: 'secondary',   // Pink - secondary actions
    success: 'success',       // Green - success states, active
    error: 'error',           // Red - errors, cancellations
    warning: 'warning',       // Orange - CTAs on hero backgrounds, warnings
    info: 'info',             // Violet - information messages
    neutral: 'neutral',       // Sky - neutral/disabled
    yellow: 'yellow',         // Yellow - deadline warnings (more visible than warning)

    // Brand Pantone colors (custom palettes in app.config.ts)
    mocha: 'mocha',          // PRIMARY BRAND - Pantone 2025 (same as primary/amber)
    peach: 'peach',          // Warm, countdown timers
    pink: 'pink',            // Pink Lemonade - vibrant
    orange: 'orange',        // Mandarin Orange - energetic (same as warning)
    party: 'party',          // Party Punch - deep burgundy
    ocean: 'ocean',          // Ocean/Sky - cool blue
    winery: 'winery',        // Winery - deep red
    caramel: 'caramel',      // Caramel - warm brown
    bonbon: 'bonbon'         // Bonbon - light purple
} as const

/** NuxtUI color type - derived from COLOR constant for type-safe component props */
export type NuxtUIColor = typeof COLOR[keyof typeof COLOR]

/**
 * NOISE - Visual emphasis scale ("how loud should this action be?")
 *
 * Maps emphasis intent → NuxtUI button/badge variant. Noise is CONTEXTUAL, not
 * intrinsic to an action: "edit" is `quiet` in an admin table (many rows) but
 * `loud` in the chef menu (the one action the user came to do).
 *
 * Colour stays separate - hero vs card contexts supply their own:
 *   <UButton v-bind="BUTTONS.primaryAction" :color="HERO.primaryButton">Save</UButton>
 *
 * Ladder (loudest → quietest):
 *   loud   → solid    primary CTA - the one action the user came to do
 *   medium → outline  secondary - important, not primary
 *   soft   → soft     supplementary - tinted, gentle
 *   quiet  → ghost    tertiary - overflow triggers, inline icons, rare actions
 */
export const NOISE = {
    loud:   'solid'   as NuxtUIButtonVariant,
    medium: 'outline' as NuxtUIButtonVariant,
    soft:   'soft'    as NuxtUIButtonVariant,
    quiet:  'ghost'   as NuxtUIButtonVariant
} as const

/** Noise level type - derived from NOISE constant */
export type NoiseLevel = keyof typeof NOISE

// ============================================================================
// PART 2: Tailwind Class Builders (for dynamic classes)
// ============================================================================

/**
 * BG - Background color scale (50-950)
 *
 * Use for dynamic background colors.
 * ```
 */
export const BG = {
    mocha: {
        50: 'bg-amber-50',
        100: 'bg-amber-100',
        200: 'bg-amber-200',
        300: 'bg-amber-300',
        400: 'bg-amber-400',
        500: 'bg-amber-500',    // PRIMARY
        600: 'bg-amber-600',
        700: 'bg-amber-700',    // Rainbow stop 8
        800: 'bg-amber-800',
        900: 'bg-amber-900',
        950: 'bg-amber-950'
    },
    peach: {
        50: 'bg-peach-50',
        200: 'bg-peach-200',    // Calendar - regular dinner events
        300: 'bg-peach-300',    // Countdown, calendar
        400: 'bg-peach-400',    // Calendar - next dinner, countdown
        500: 'bg-peach-500',
        700: 'bg-peach-700',
        950: 'bg-peach-950'
    },
    pink: {
        50: 'bg-pink-50',
        500: 'bg-pink-500',     // Landing section
        800: 'bg-pink-800'
    },
    orange: {
        50: 'bg-orange-50',
        100: 'bg-orange-100',
        500: 'bg-orange-500',   // Landing section
        600: 'bg-orange-600'
    },
    ocean: {
        50: 'bg-ocean-50',
        200: 'bg-ocean-200',    // Chef calendar - future cookings
        300: 'bg-ocean-300',    // Chef calendar - countdown
        400: 'bg-ocean-400',    // Chef calendar - next cooking
        500: 'bg-ocean-500',    // Rainbow stop 3
        600: 'bg-ocean-600',
        700: 'bg-ocean-700',
        800: 'bg-ocean-800'
    },
    // Bonbon is the Pantone name of the violet scale. `bg-bonbon-*` paints nothing - the alias
    // is declared in nuxt.config but never mapped in app.config - so the token names the scale
    bonbon: {
        800: 'bg-violet-800'    // Rainbow stop 4
    },
    yellow: {
        400: 'bg-yellow-400'    // Rainbow stop 6
    },
    sky: {
        700: 'bg-sky-700'       // Rainbow stop 7
    },
    gray: {
        50: 'bg-gray-50',
        100: 'bg-gray-100',
        200: 'bg-gray-200',
        400: 'bg-gray-400',
        500: 'bg-gray-500',
        600: 'bg-gray-600',
        700: 'bg-gray-700',
        800: 'bg-gray-800',
        900: 'bg-gray-900'
    },
    blue: {
        100: 'bg-blue-100',     // Header
        500: 'bg-blue-500'
    },
    red: {
        100: 'bg-red-100'       // Error overlay
    },

    // Surface depth - how deep a surface sits under the card it belongs to. One token carries
    // exactly one rendered value (light and dark), so a surface that has always drawn its own
    // pair keeps its own token rather than being folded into a neighbour.
    /** Recessed: an expanded table row and the detail panel under it */
    panel: 'bg-neutral-50 dark:bg-neutral-900',
    /** One step up: a block that has to read above a panel (the economy tree's nested breakdown) */
    panelNested: 'bg-neutral-100 dark:bg-neutral-800',
    /** The hover face of a list row that lifts under the pointer. A variant prefix cannot be
     *  composed onto a token, so the pair lives here rather than at the site */
    panelHover: 'hover:bg-gray-50 dark:hover:bg-gray-800',
    /** An inset box inside a card: a member list, a selected row, the calendar-feed box */
    inset: 'bg-gray-50 dark:bg-gray-800',
    /** The face of a dinner ticket - the inset box, half-lit in the dark */
    ticket: 'bg-gray-50 dark:bg-gray-800/50',
    /** The ground the public invoice page sits on */
    invoiceGround: 'bg-neutral-50 dark:bg-neutral-950',
    /** A stat box on the public invoice page */
    invoiceStat: 'bg-neutral-100 dark:bg-neutral-900',
    /** The head row of the chef's budget table */
    budgetHead: 'bg-neutral-50 dark:bg-neutral-800'
} as const

/**
 * TEXT - Text color scale (50-950)
 *
 * Use for dynamic text colors.
 *
 * @example
 * ```ts
 * const textClass = TEXT.mocha[50]  // 'text-amber-50'
 * ```
 */
export const TEXT = {
    mocha: {
        50: 'text-amber-50',
        500: 'text-amber-500',    // Chef hat accent
        900: 'text-amber-900',
        950: 'text-amber-950'
    },
    peach: {
        50: 'text-peach-50',
        200: 'text-peach-200',    // Dinner calendar - countdown accent
        300: 'text-peach-300',    // Countdown timer
        400: 'text-peach-400',    // Countdown timer
        600: 'text-peach-600',    // Calendar - rings
        800: 'text-peach-800',    // Calendar - regular dinner events
        950: 'text-peach-950'
    },
    pink: {
        50: 'text-pink-50'
    },
    orange: {
        100: 'text-orange-100'
    },
    ocean: {
        50: 'text-ocean-50',
        200: 'text-ocean-200',    // Chef calendar - countdown accent
        300: 'text-ocean-300',    // Chef calendar - countdown timer
        400: 'text-ocean-400',    // Chef calendar - countdown timer
        600: 'text-ocean-600',    // Chef calendar - rings
        800: 'text-ocean-800'     // Chef calendar - future cookings
    },
    gray: {
        400: 'text-gray-400',
        500: 'text-gray-500',
        600: 'text-gray-600',
        700: 'text-gray-700',
        900: 'text-gray-900'
    },
    neutral: {
        400: 'text-neutral-400',  // Economy tree - the "no value" dash
        500: 'text-neutral-500'   // Household edit panel labels, chef menu placeholder
    },
    blue: {
        500: 'text-blue-500',     // External link
        900: 'text-blue-900'
    },
    red: {
        500: 'text-red-500',      // Inline validation error
        700: 'text-red-700',
        900: 'text-red-900'
    },
    white: 'text-white',

    /**
     * Dark ink for a vibrant fill. `ink` cannot serve here: its `dark:text-white` face would
     * turn white again on a fill that has no dark face of its own, and `text-gray-900` reads
     * 4.01:1 on Party Punch. Black clears 4.5:1 on every brand fill, in both modes.
     */
    black: 'text-black',

    // Foreground volume - how loud a line of text reads against the surface it sits on.
    // One token carries exactly one rendered value; a line that has always had its own
    // light/dark pair keeps its own token.
    /** Full contrast: a form field heading, a dinner-mode glyph */
    ink: 'text-gray-900 dark:text-white',
    /** A section sub-heading and the prose that belongs to it */
    strong: 'text-gray-700 dark:text-gray-300',
    /** Secondary body text: descriptions, sub-lines under a title */
    toned: 'text-gray-600 dark:text-gray-400',
    /** Supporting text: counts, empty-state prose */
    muted: 'text-gray-500 dark:text-gray-400',
    /** Recedes: a decorative glyph, a column separator, a stack trace. One rung deeper than
     *  `muted` in each mode, and off the 400 rung the RELEASED kitchen panel fills with */
    dimmed: 'text-gray-500 dark:text-gray-400',
    /** The "last changed" line on an allergy row - holds its weight in the dark */
    timestamp: 'text-gray-500 dark:text-gray-500',
    /** The menu description on a chef's menu card */
    menuBody: 'text-neutral-600 dark:text-neutral-400'
} as const

/**
 * BORDER - Border color scale
 */
export const BORDER = {
    gray: {
        200: 'border-gray-200',
        300: 'border-gray-300',    // Poster - QR frame
        500: 'border-gray-500',
        600: 'border-gray-600',
        700: 'border-gray-700',
        800: 'border-gray-800 dark:border-gray-600'
    },
    peach: {
        400: 'border-peach-400'    // Calendar - countdown, rings
    },
    ocean: {
        400: 'border-ocean-400',   // Chef calendar - countdown, rings
        600: 'border-ocean-600',   // Kitchen panel divider - SPIS SENT
        700: 'border-ocean-700'    // Chef calendar - selected state
    },
    pink: {
        600: 'border-pink-600'     // Kitchen panel divider - TAKE AWAY
    },
    orange: {
        // Light draws 600: 500 is also the orange band fill, and reads 2.96:1 as a border on BG.panel
        500: 'border-orange-600 dark:border-orange-500',
        600: 'border-orange-600'   // Kitchen panel divider - SPIS SAMMEN
    },
    red: {
        500: 'border-red-500'      // Deadline - critical
    },
    amber: {
        500: 'border-amber-500 dark:border-amber-300',   // Deadline - warning
        600: 'border-amber-600'    // Chef menu - missing chef frame
    }
} as const

/**
 * RING - Ring color scale
 *
 * Same shape as BORDER, for the `ring-*` utilities: selection outlines, marker circles
 * and armed confirm states.
 */
export const RING = {
    red: {
        500: 'ring-red-500',       // Deadline - critical, DangerButton armed
        700: 'ring-red-700'        // Allergen marker circle
    },
    green: {
        500: 'ring-green-500'      // Holiday marker, DangerButton undo
    },
    amber: {
        500: 'ring-amber-500 dark:ring-amber-300'   // Deadline - warning, chef portrait
    },
    orange: {
        200: 'ring-orange-200'     // Selected item in a segmented control
    }
} as const

// ============================================================================
// PART 3: Design System - Semantic UI Patterns
// ============================================================================

/**
 * TYPOGRAPHY - Text styling patterns
 *
 * Pre-defined text styles for consistent typography across the app.
 */
export const TYPOGRAPHY = {
    // Headers and titles
    heroTitle: 'text-2xl md:text-4xl font-extrabold uppercase',
    sectionTitle: 'text-xl md:text-3xl font-bold uppercase',
    cardTitle: 'text-lg font-semibold',
    sectionSubheading: `text-sm font-semibold ${TEXT.strong}`,
    sectionSubheadingLight: 'text-md font-semibold text-amber-50 dark:text-amber-100',
    sectionIconLight: 'text-2xl text-amber-50 dark:text-amber-100',

    // Body text
    bodyText: 'text-base',
    bodyTextSmall: 'text-sm',
    bodyTextMedium: 'text-sm font-medium',
    bodyTextMuted: `text-sm ${TEXT.toned}`,
    bodyTextPlaceholder: `text-sm ${TEXT.gray[500]}`,

    // Small text
    finePrint: 'text-xs',
    caption: 'text-xs font-medium',

    // Footer
    footerText: 'text-xs text-white dark:text-amber-50',

    // Kitchen panel text (inherits text-white from panel, no color classes)
    kitchenLabel: 'text-xs md:text-sm font-semibold',
    kitchenSecondary: 'text-xs md:text-sm font-medium opacity-90',
    kitchenMain: 'font-bold text-base md:text-lg',
    kitchenDetail: 'text-xs md:text-sm',
    kitchenMuted: 'text-xs md:text-sm opacity-75'
} as const

/**
 * LAYOUTS - Common layout patterns
 *
 * Pre-built layout classes for common UI structures.
 */
export const LAYOUTS = {
    // Footer
    footer: 'flex flex-row items-start justify-between p-4',
    footerStacked: 'flex flex-col items-center gap-2 p-4',

    // Hero sections
    hero: 'relative min-h-[300px] md:min-h-[400px] flex flex-col justify-center items-center text-center p-6 md:p-12',

    // Cards
    card: 'rounded-lg border p-4',
    cardCompact: 'rounded-lg border p-2',

    // Grids
    gridTwoCol: 'grid grid-cols-1 md:grid-cols-2 gap-4',
    gridThreeCol: 'grid grid-cols-1 md:grid-cols-3 gap-4',

    // Master-detail page layout (for UPage :ui prop)
    // 1/4 master (left), 3/4 detail (center) on desktop, stacked on mobile
    masterDetailPage: {
        root: 'flex flex-col md:grid md:grid-cols-12 gap-2',
        left: 'md:col-span-3',
        center: 'md:col-span-9'
    },

    // Responsive card rounding: no rounding on mobile (full-bleed), rounded on desktop
    cardResponsive: 'rounded-none md:rounded-lg',

    // Form footer button row: stacked on mobile (cancel below save), horizontal right-aligned on desktop
    formButtonRow: 'flex flex-col-reverse md:flex-row md:justify-end gap-2',

    // Card action row: a toolbar of action buttons inside a card (e.g. ChefMenuCard menu actions).
    // Mobile-first - full-width buttons stacked vertically (big tap targets, no competing for
    // horizontal space), inline wrapping row on desktop. Pair the two classes:
    //   <div :class="LAYOUTS.cardActionRow">
    //     <UButton :class="LAYOUTS.cardActionButton" ... />
    cardActionRow: 'flex flex-col md:flex-row md:flex-wrap md:items-center gap-2',
    cardActionButton: 'w-full md:w-auto justify-center',

    // Section content (card body sections)
    sectionContent: 'px-4 md:px-6 py-4 md:py-6 space-y-4',           // Standard section with padding
    sectionContentNoPadX: 'px-0 py-4 md:py-6 space-y-4',             // No horizontal padding (full-bleed)
    sectionContentCompact: 'px-4 py-3 space-y-3',                    // Compact variant

    // Dividers
    sectionDivider: 'border-t border-gray-200 dark:border-gray-800',
    /** The rule above a detail panel's action row */
    panelDivider: 'border-t border-neutral-200 dark:border-neutral-700'
} as const

/**
 * PANTONE_FAMILIES - every brand family, by hue
 *
 * `CHIPS` is a record keyed by family, and `PANTONE_CHIPS` maps this list, so the ticker tints run
 * in the order of the solid bands below them. `RAINBOW` maps `RAINBOW_FAMILIES`, the families a
 * list walks.
 */
export const PANTONE_FAMILIES = ['pink', 'orange', 'ocean', 'bonbon', 'party', 'peach', 'mocha', 'winery', 'yellow', 'sky'] as const

export type PantoneFamily = typeof PANTONE_FAMILIES[number]

/**
 * HERO - the brand fill set: one fill, one ink, per surface
 *
 * The landing rainbow, the dinner and chef headers, the kitchen panels and the cooking teams
 * paint these same surfaces, so each surface pairs its fill with its ink here and every consumer
 * inherits both.
 *
 * Ink is whichever of `TEXT.black` and `TEXT.white` clears 4.5:1 on the fill in both modes; a
 * light fill carries its own family's darkest rung. Ratios measured 2026-09-18 in the AA palettes,
 * Glade farver and Til farveblinde - the lower of the two is the one written here. Høj kontrast
 * holds every surface at 7:1.
 */
const HERO = {
    pink: `${BG.pink[500]} ${TEXT.black}`,            // Pink Lemonade   6.86:1
    orange: `${BG.orange[500]} ${TEXT.black}`,        // Mandarin Orange 6.68:1
    ocean: `${BG.ocean[500]} ${TEXT.black}`,          // Ocean           6.14:1
    bonbon: `${BG.bonbon[800]} ${TEXT.white}`,        // Bonbon          4.66:1
    peach: `${BG.peach[300]} ${TEXT.peach[950]}`,     // Countdown       6.77:1
    yellow: `${BG.yellow[400]} ${TEXT.black}`,        // Yellow         13.71:1
    sky: `${BG.sky[700]} ${TEXT.white}`,              // Sky             5.19:1
    /** The frame: title bar, ticker, dinner header */
    mocha: `${BG.mocha[500]} ${TEXT.mocha[50]}`,      // Mocha Mousse    4.66:1
    /** Mocha as a rainbow stop, two rungs under the frame so a team never reads as the frame */
    mochaStop: `${BG.mocha[700]} ${TEXT.white}`       // Mocha Mousse    7.22:1
} as const

/**
 * RAINBOW_FAMILIES - the stops a list walks, in hue order
 *
 * Eight hues, each one its own: the nearest pair stays 0.100 apart in Oklab (the bar
 * `designSystemColourVision.unit.spec.ts` reads off the Color Universal Design set is 0.075)
 * in Glade farver and Høj kontrast, light and dark. Til farveblinde publishes the eight colours of
 * that set on the stops, which keep the bar under protanopia, deuteranopia and tritanopia as well
 * (`scripts/palettes/presets.ts`). A red-pink family has room for a light fill with
 * black ink and a dark fill with white ink at 7:1, so pink is the light one and Bonbon, at its
 * 800 rung, the dark one. Mocha's stop is its 700 rung (`HERO.mochaStop`); its 500 rung stays
 * the frame.
 */
export const RAINBOW_FAMILIES = ['pink', 'orange', 'ocean', 'bonbon', 'peach', 'yellow', 'sky', 'mocha'] as const satisfies readonly PantoneFamily[]

type RainbowFamily = typeof RAINBOW_FAMILIES[number]

/** The surface a family wears as a stop: its hero fill, and Mocha's stop in place of the frame */
const stopOf = (family: RainbowFamily): string => family === 'mocha' ? HERO.mochaStop : HERO[family]

/**
 * RAINBOW - the stops themselves, walked by index
 *
 * The landing bands take the first four, the kitchen panels the first three, and a cooking team
 * wears the stop of its number: team 9 repeats team 1.
 */
export const RAINBOW = RAINBOW_FAMILIES.map(stopOf)

/** The rainbow stop for a position in a list, wrapping at the end of the palette */
export const getRainbowBand = (index: number): string => RAINBOW[index % RAINBOW.length]!

/** The family behind that stop, for a consumer that needs another rung of the same colour */
export const getRainbowFamily = (index: number): PantoneFamily =>
    RAINBOW_FAMILIES[index % RAINBOW_FAMILIES.length]!

/**
 * BACKGROUNDS - Background patterns for sections
 *
 * Complete background styling for major page sections.
 */
export const BACKGROUNDS = {
    // The landing frame. The bands themselves walk `RAINBOW` from the page
    landing: {
        titleBar: HERO.mocha,
        ticker: HERO.mocha
    },

    // Hero sections (family-facing)
    hero: HERO,

    // The app shell behind every page
    appShell: `${BG.mocha[500]} dark:bg-amber-800`,

    // Navigation - the sticky header bar. Translucent from md up, where it floats as a rounded card
    header: `${BG.blue[100]} md:bg-blue-100/80 dark:bg-blue-900 md:dark:bg-blue-900/80`,

    // Cards
    card: 'bg-white',
    cardSubtle: `${BG.gray[50]}`,
    cardDark: `${BG.gray[900]} ${TEXT.white}`
} as const

/**
 * PANTONE_CHIPS - One tinted chip per brand family, cycled by index
 *
 * The landing ticker walks this list so consecutive words carry the whole palette.
 * Border, fill and ink come from the same family, so a chip reads as one colour.
 */
const CHIPS: Record<PantoneFamily, string> = {
    pink: 'border-pink-800 bg-pink-100 text-pink-800',
    orange: 'border-orange-600 bg-orange-100 text-orange-800',
    ocean: 'border-ocean-600 bg-ocean-50 text-ocean-900',
    bonbon: 'border-violet-800 bg-violet-100 text-violet-900',
    party: 'border-party-800 bg-party-50 text-party-900',
    peach: 'border-peach-700 bg-peach-50 text-peach-950',
    mocha: 'border-amber-900 bg-amber-100 text-amber-900',
    winery: 'border-winery-800 bg-winery-100 text-winery-900',
    yellow: 'border-yellow-600 bg-yellow-100 text-yellow-900',
    sky: 'border-sky-700 bg-sky-50 text-sky-900'
}

export const PANTONE_CHIPS = PANTONE_FAMILIES.map(family => CHIPS[family])

/** The Pantone chip for a position in a list, wrapping at the end of the palette */
export const getPantoneChip = (index: number): string => PANTONE_CHIPS[index % PANTONE_CHIPS.length]!

/** The box every kitchen panel draws: a right divider, padding, a centred column that may shrink */
const KITCHEN_PANEL_BOX = 'border-r last:border-r-0 p-3 md:p-4 text-center min-w-0 box-border'

/**
 * COMPONENTS - Complete component styling
 *
 * Ready-to-use complete styling for common components.
 */
/** What every choice label reads as: the body size in regular weight, under its section heading */
const CHOICE_LABEL_UI = {
    label: 'font-normal text-base',
    legend: 'font-normal',
    description: 'text-sm'
} as const

/** Table cells wrap between words; a word stays whole */
const TABLE_CELL_WRAP = 'whitespace-normal'

export const COMPONENTS = {
    // Kitchen panels (functional data) - Vibrant Pantone colors
    kitchenStatsBar: `${BG.mocha[50]} ${TEXT.gray[900]} px-0 py-4 md:p-6`,

    /**
     * The dining modes walk `RAINBOW` from its first stop, so a panel is the same brand surface
     * the landing band paints and the panel owns only its edge and its box. Each divider is its
     * own family one rung deeper. TIL SALG stays grey: it is a ticket on offer, not a dining
     * mode, and the neutral fill is what says so. Dark ink reads 8.07:1 on it.
     */
    kitchenPanel: {
        TAKEAWAY: `${getRainbowBand(0)} ${BORDER.pink[600]} ${KITCHEN_PANEL_BOX}`,
        DINEIN: `${getRainbowBand(1)} ${BORDER.orange[600]} ${KITCHEN_PANEL_BOX}`,
        DINEINLATE: `${getRainbowBand(2)} ${BORDER.ocean[600]} ${KITCHEN_PANEL_BOX}`,
        RELEASED: `${BG.gray[400]} ${TEXT.black} ${BORDER.gray[500]} ${KITCHEN_PANEL_BOX}`
    },

    // Responsive row icon sizing (matches birthday cake pattern)
    rowIconClass: 'size-4 md:size-6',

    // The selected item in a segmented control (form mode, booking view) - a ring, not a fill,
    // so the item's own colour still reads through
    segmentedActive: `ring-2 border-2 ${RING.orange[200]} shadow-md`,

    /**
     * A choice control inside a form section (`URadioGroup`, `USwitch`): `v-bind` a shape so an
     * option reads as a choice, not as a heading. Nuxt UI paints the label `font-medium` at the
     * control's size, which outweighs the section heading above it (`TYPOGRAPHY.sectionSubheading`),
     * so every shape puts the label back on the body size in regular weight.
     */
    choiceGroup: {
        /** One option under the other */
        stacked: {ui: {...CHOICE_LABEL_UI, fieldset: 'flex flex-col gap-2'}},
        /** Side by side from md up, stacked on a phone */
        inline: {ui: {...CHOICE_LABEL_UI, fieldset: 'flex flex-col md:flex-row gap-2 md:gap-4'}},
        /** One control on its own row, with no fieldset of its own (`USwitch`) */
        single: {ui: CHOICE_LABEL_UI}
    },

    // Power mode - family-wide bulk editing pattern
    powerMode: {
        color: 'warning' as const,
        icon: 'i-fluent-emoji-high-contrast-woman-superhero',
        buttonIcon: 'i-heroicons-bolt',
        // The 600 rung, so the 500 the second rainbow stop fills with stays free
        iconClass: 'size-4 md:size-6 text-warning-600 dark:text-warning-400',
        ticketConfig: {label: 'Powermode!', color: 'warning' as const, icon: 'i-heroicons-bolt'},
        // Power-mode alerts bind ALERTS.warning and override the icon with `powerMode.icon`
        card: {
            color: 'warning' as const,
            variant: 'outline' as const
        }
    },

    // Guest row - guest ticket booking patterns
    guestRow: {
        color: 'info' as const,
        addIcon: 'i-heroicons-user-plus',      // For "add guest" rows
        orderIcon: 'i-heroicons-ticket',        // For existing guest orders
        iconClass: 'size-4 md:size-6 text-info-600'
    },

    // Table interactions - row selection and click patterns
    table: {
        selectedRow: 'bg-secondary-100 dark:bg-secondary-900',
        clickableCell: 'cursor-pointer',
        selectedCell: 'bg-secondary-50 dark:bg-secondary-950',
        /**
         * THE table cell styling (ADR-018): every UTable binds one of these three
         * (`designSystemUsage.unit.spec.ts` rejects a table without).
         * Cells wrap between words on every viewport (Nuxt UI's theme cell is `whitespace-nowrap`); a word stays whole.
         * A data table wider than a phone scrolls inside its own box, the page never does (MobileViewport.e2e).
         */
        ui: {th: 'px-2 md:px-4', td: `px-2 py-1 md:px-4 md:py-2 ${TABLE_CELL_WRAP}`},
        /** Compact tables with many narrow columns (booking form, household preferences, household allergies) */
        denseUi: {th: 'px-1 py-1 md:px-4 md:py-3', td: `px-1 md:px-4 ${TABLE_CELL_WRAP}`},
        /** The booking grid: centred day cells, a sticky footer */
        gridUi: {
            th: 'px-1 py-1 md:px-2 md:py-2 text-center',
            td: `px-1 py-1 md:px-2 text-center ${TABLE_CELL_WRAP}`,
            tfoot: 'sticky bottom-0 bg-default px-1 py-1 md:px-2 text-center text-xs'
        }
    },

    // Card action buttons - positioned in card corners or footers
    cardAction: {
        // Neutral action (logout, cancel, secondary actions)
        neutral: {
            color: 'primary' as const,
            variant: 'soft' as const
        },
        // Destructive action (delete, remove)
        destructive: {
            color: 'error' as const,
            variant: 'outline' as const
        },
        /**
         * A header toggle that reveals a panel under its card. Spread over `BUTTONS.secondaryAction`
         * so the button keeps its responsive size: closed it reads as one of the card's actions,
         * open it is filled, which is how the card says the panel below belongs to it.
         */
        toggle: {
            color: 'primary' as const,
            variant: NOISE.medium
        },
        toggleActive: {
            color: 'primary' as const,
            variant: NOISE.loud
        }
    },


    // Shared UCalendar root: Monday-first, no padding weeks, and other-month days both disabled
    // (reka data-outside-view) and hidden, so a day number never appears twice across
    // neighbouring month grids. Spread with v-bind at every UCalendar call site.
    calendarGrid: {
        weekStartsOn: 1,
        fixedWeeks: false,
        weekdayFormat: 'short',
        disableDaysOutsideCurrentView: true,
        ui: {cellTrigger: 'data-[outside-view]:hidden'}
    },

    // Economy table hierarchy - ready-to-grab classes for each nesting level
    // Used by AdminEconomy and HouseholdEconomy for consistent stat headers
    economyTable: {
        level1: {
            header: 'bg-ocean-50 dark:bg-ocean-800',
            icon: 'text-xl text-ocean-600 dark:text-ocean-400',
            statBox: 'bg-white dark:bg-neutral-900 rounded-lg',
            border: 'border-ocean-50 dark:border-ocean-800',
            footer: 'bg-ocean-50 dark:bg-ocean-800',
            // The head of a table nested under this level - one step stronger than the header
            tableHead: 'bg-ocean-100 dark:bg-ocean-900'
        },
        level2: {
            header: 'bg-peach-100 dark:bg-peach-900',
            icon: 'text-xl text-peach-600 dark:text-peach-400',
            statBox: 'bg-white dark:bg-neutral-900 rounded-lg',
            border: 'border-peach-100 dark:border-peach-900',
            footer: 'bg-peach-100 dark:bg-peach-900',
            tableHead: 'bg-peach-100 dark:bg-peach-900'
        },
        level3: {
            header: 'bg-neutral-50 dark:bg-neutral-900',
            icon: 'text-neutral-600 dark:text-neutral-400',
            statBox: 'bg-white dark:bg-neutral-800 rounded-lg',
            border: 'border-neutral-50 dark:border-neutral-900',
            footer: 'bg-neutral-50 dark:bg-neutral-900'
        }
    },

    // Diagonal corner ribbon - top-right status overlay (cancelled dinners, move-out, move-in)
    ribbon: {
        base: 'absolute top-8 -right-10 z-10 text-white text-xs font-bold py-1 pl-14 pr-12 rotate-45 shadow-md',
        container: 'relative overflow-hidden',
        colors: {
            cancel: 'bg-red-600',
            past: 'bg-gray-500',
            new: 'bg-green-600'
        }
    },

    // CostLine - line item in economy views with fixed column widths for vertical alignment
    costLine: {
        row: 'grid items-center justify-items-center gap-1 md:gap-2 max-w-2xl',
        columns: 'grid-cols-[1.5rem_6rem_3rem_1.5rem_3rem_5rem_auto] md:grid-cols-[1.5rem_8rem_3.5rem_1.5rem_4rem_5.5rem_auto]',
        nameSlot: 'justify-self-start',
        amountSlot: 'justify-self-end'
    },

    // Hero-complementary panels - Sections that sit on hero backgrounds (mocha/peach/pink/orange)
    // Curated defaults for maximum readability on warm hero backgrounds
    heroPanel: {
        // High-contrast light panel (for CTAs, forms, important actions)
        light: {
            container: 'bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-white/50',
            primaryButton: 'warning' as const,   // NuxtUI 'warning' → orange palette (warm Pantone accent)
            secondaryButton: 'neutral' as const  // Neutral for cancel/secondary actions
        },
        // Subtle panel (for supplementary content, less prominent)
        subtle: {
            container: 'bg-white/30 backdrop-blur-sm rounded-lg p-4 border border-white/20',
            primaryButton: 'primary' as const,   // NuxtUI 'primary' → amber palette (mocha color)
            secondaryButton: 'neutral' as const
        },
        // Dark panel (for contrast variation on light heroes)
        dark: {
            container: 'bg-gray-900/80 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50',
            primaryButton: 'peach' as const,     // Custom color mapped in app.config.ts → peach palette
            secondaryButton: 'neutral' as const
        }
    },

    // Danger zone - bordered region inside a "More"/overflow panel for destructive actions.
    // Spatially separates rare + destructive actions from routine controls (see ChefMenuCard).
    // Reusable: hosts DangerButton commits; designed to grow with more items.
    dangerZone: {
        container: 'rounded-lg border border-error-300 dark:border-error-800 ' +
                   'bg-error-50 dark:bg-error-950/40 p-4 space-y-3',
        heading: 'text-xs font-bold uppercase tracking-wide ' +
                 'text-error-700 dark:text-error-400 flex items-center gap-1.5'
    }
} as const

// ============================================================================
// PART 4: Helper Functions
// ============================================================================

/**
 * Get kitchen panel classes dynamically
 *
 * @param mode - Dining mode (TAKEAWAY, DINEIN, DINEINLATE, RELEASED)
 * @returns Tailwind class string with vibrant Pantone colors
 *
 * @example
 * ```ts
 * const classes = getKitchenPanelClasses('DINEIN')
 * // Returns: 'bg-orange-500 text-black border-orange-600 ...'
 * ```
 */
export function getKitchenPanelClasses(
    mode: 'TAKEAWAY' | 'DINEIN' | 'DINEINLATE' | 'RELEASED'
): string {
    return COMPONENTS.kitchenPanel[mode]
}

/** Get combined ribbon classes for a ribbon type */
export type RibbonType = keyof typeof COMPONENTS.ribbon.colors
export const getRibbonClasses = (type: RibbonType): string =>
    `${COMPONENTS.ribbon.base} ${COMPONENTS.ribbon.colors[type]}`

/**
 * Ticket type colors (for UBadge components)
 *
 * Maps ticket types to NuxtUI colors
 */
export const TICKET_TYPE_COLORS = {
    ADULT: COLOR.primary,
    CHILD: COLOR.success,
    BABY: COLOR.neutral
} as const

// ============================================================================
// PART 5: Order State Display (for DinnerTicket accent colors)
// ============================================================================

/** Order state to accent color mapping for ticket display */
export const ORDER_STATE_COLORS: Record<'normal' | 'released' | 'claimed', NuxtUIBadgeColor> = {
    normal: 'primary',
    released: 'error',
    claimed: 'info'
}

/** Get order state accent color from isReleased/isClaimed flags */
export const getOrderStateColor = (isReleased: boolean, isClaimed: boolean): NuxtUIBadgeColor => {
    if (isReleased) return ORDER_STATE_COLORS.released
    if (isClaimed) return ORDER_STATE_COLORS.claimed
    return ORDER_STATE_COLORS.normal
}

/**
 * ICONS - Standard icon names for common UI elements
 *
 * Centralized icon definitions for consistent icon usage across the app.
 *
 * @example
 * ```vue
 * <UIcon :name="ICONS.team" />
 * <UIcon :name="ICONS.calendar" />
 * ```
 */
export const ICONS = {
    // Navigation & entities
    team: 'i-fluent-mdl2-team-favorite',
    calendar: 'i-heroicons-calendar',
    calendarDays: 'i-heroicons-calendar-days',
    user: 'i-heroicons-user',
    userPlus: 'i-heroicons-user-plus',
    users: 'i-heroicons-users',
    userGroup: 'i-heroicons-user-group',
    ticket: 'i-heroicons-ticket',

    // Header navigation
    dinner: 'i-streamline-food-kitchenware-spoon-plate-fork-plate-food-dine-cook-utensils-eat-restaurant-dining',
    chef: 'i-streamline-food-kitchenware-chef-toque-hat-cook-gear-chef-cooking-nutrition-tools-clothes-hat-clothing-food',
    household: 'i-heroicons-home',
    preferences: 'i-heroicons-adjustments-horizontal',
    /** The cog that opens a user's own settings ("Mine indstillinger") - `preferences` is the sliders glyph */
    settings: 'i-heroicons-cog-6-tooth',
    allergy: 'i-mdi-food-allergy-off-outline',
    economy: 'i-heroicons-currency-dollar',
    login: 'i-guidance-entry',
    logout: 'i-tdesign-wave-bye',
    moveIn: 'i-guidance-entry',
    moveOut: 'i-guidance-exit',
    admin: 'i-pajamas-admin',
    menu: 'i-heroicons-bars-3',
    help: 'i-heroicons-question-mark-circle',

    // Actions & feedback
    clipboard: 'i-heroicons-clipboard-document-list',
    edit: 'i-heroicons-pencil',
    trash: 'i-heroicons-trash',
    compare: 'i-heroicons-rectangle-stack',
    document: 'i-heroicons-document-text',
    select: 'i-heroicons-cursor-arrow-rays',
    /** Recently added or changed - paired with COLOR.success (see ribbon.colors.new) */
    new: 'i-heroicons-sparkles',
    chevronDown: 'i-heroicons-chevron-down',
    chevronUp: 'i-heroicons-chevron-up',
    chevronRight: 'i-heroicons-chevron-right',
    sortAscending: 'i-lucide-arrow-up-narrow-wide',
    sortDescending: 'i-lucide-arrow-down-wide-narrow',
    check: 'i-heroicons-check',
    checkCircle: 'i-heroicons-check-circle',
    plusCircle: 'i-heroicons-plus-circle',
    playCircle: 'i-heroicons-play-circle',
    pauseCircle: 'i-heroicons-pause-circle',
    megaphone: 'i-heroicons-megaphone',
    exclamationCircle: 'i-heroicons-exclamation-circle',
    warning: 'i-heroicons-exclamation-triangle',
    ellipsis: 'i-heroicons-ellipsis-horizontal',
    xMark: 'i-heroicons-x-mark',
    arrowRight: 'i-heroicons-arrow-right',
    arrowLeft: 'i-heroicons-arrow-left',
    arrowUp: 'i-heroicons-arrow-up',
    undo: 'i-heroicons-arrow-uturn-left',
    sync: 'i-heroicons-arrow-path',
    shoppingCart: 'i-heroicons-shopping-cart',
    released: 'i-heroicons-arrow-up-tray',
    claim: 'i-heroicons-arrows-right-left',
    archive: 'i-heroicons-archive-box',
    holiday: 'i-heroicons-sun',
    printer: 'i-heroicons-printer',

    // Empty states & system feedback
    robotDead: 'i-mage-robot-dead',
    robotHappy: 'i-mage-robot-happy',

    // Danger/delete confirmations
    dangerConfirm: 'i-healthicons-death-alt',

    // Descriptive
    mail: 'i-guidance-mail',
    phone: 'i-guidance-phone',
    identification: 'i-heroicons-identification',

    // Own settings (Mine indstillinger)
    notification: 'i-heroicons-bell',
    palette: 'i-lucide-palette',
    textScale: 'i-lucide-a-large-small',

    // Time & info
    clock: 'i-heroicons-clock',
    ellipsisCircle: 'i-heroicons-ellipsis-horizontal-circle',
    info: 'i-heroicons-information-circle',

    // Status/state
    lockOpen: 'i-heroicons-lock-open',
    lockClosed: 'i-heroicons-lock-closed',
    authorize: 'i-heroicons-shield-check',

    // Actions
    share: 'i-heroicons-share',
    download: 'i-heroicons-arrow-down-tray',
    externalLink: 'i-heroicons-arrow-top-right-on-square',

    // External links
    github: 'i-simple-icons-github',
    book: 'i-heroicons-book-open'
} as const

/** Residency colours double as alert kinds, so a residency alert is `v-bind="ALERTS[residency.color]"` */
export type ResidencyAlertKind = Extract<AlertKind, 'success' | 'error' | 'neutral'>

/** Residency status → display config (ribbon, alert, badge). null = active, no display needed */
export const RESIDENCY_CONFIG: Record<import('~/composables/useHousehold').ResidencyStatus, { type: RibbonType, prefix: string, description: string, icon: string, color: ResidencyAlertKind, dateField: 'movedInDate' | 'moveOutDate' } | null> = {
    'pending':   { type: 'new',    prefix: 'Indflytter',  description: 'Familien flytter ind d.',    icon: ICONS.moveIn,  color: COLOR.success, dateField: 'movedInDate' },
    'leaving':   { type: 'cancel', prefix: 'Fraflytter',  description: 'Familien fraflytter d.',     icon: ICONS.moveOut, color: COLOR.error,   dateField: 'moveOutDate' },
    'moved-out': { type: 'past',   prefix: 'Fraflyttet',  description: 'Familien er fraflyttet d.',  icon: ICONS.moveOut, color: COLOR.neutral, dateField: 'moveOutDate' },
    'active':    null
}

/** Resolve residency display data for a household. Returns null for active households. */
export const getResidencyDisplay = (movedInDate: Date, moveOutDate: Date | null) => {
    const config = RESIDENCY_CONFIG[getResidencyStatus(movedInDate, moveOutDate)]
    if (!config) return null
    const date = config.dateField === 'movedInDate' ? movedInDate : moveOutDate
    const dateText = `${config.description} ${formatDate(date!)}`
    return {
        ...config,
        dateText,
        badgeText: `${config.prefix} ${formatDate(date!)}`,
        alertTitle: 'Fællesspisning er for beboere',
        alertDescription: `Familien skal bo her, for at kunne bestille. ${dateText}.`
    }
}

/**
 * IMG - Image assets for brand logos and external services
 *
 * Use with UButton avatar prop or img src.
 *
 * @example
 * ```vue
 * <UButton :avatar="{ src: IMG.heynabo }" />
 * <div :style="{ backgroundImage: `url(${IMG.defaultDinnerPicture})` }" />
 * ```
 */
export const IMG = {
    /**
     * Heynabo logo for external service links
     * Located in public/ folder, accessible from root URL
     */
    heynabo: '/heynabo.jpeg',
    /**
     * Default dinner picture for heroes without custom menu pictures
     * Located in public/ folder (ADR-013), accessible from root URL
     */
    defaultDinnerPicture: '/fællesspisning_0.jpeg'
} as const

/**
 * SIZES - Responsive size patterns for NuxtUI components
 *
 * Automatically adapts based on `isMd` breakpoint from layout.
 * Use these instead of manually checking `getIsMd ? 'lg' : 'md'`.
 *
 * Returns typed computed refs that Vue auto-unwraps in templates.
 *
 * @example
 * ```vue
 * <UButton :size="SIZES.standard">Click me</UButton>
 * <UBadge :size="SIZES.small">Tag</UBadge>
 * <UIcon :name="ICONS.team" :size="SIZES.largeIconSize" />
 * ```
 */

/**
 * Creates responsive size getters that work with Vue's reactivity and TypeScript templates.
 * Uses getters to return plain values while maintaining reactivity through isMd dependency.
 */
export const createResponsiveSizes = (isMd: Ref<boolean>) => ({
    // Standard responsive: md on mobile, lg on desktop
    get standard(): NuxtUISize {
        return isMd.value ? 'lg' : 'md'
    },
    get standardIconSize(): string {
        return isMd.value ? '20' : '16'
    },

    // Small responsive: sm on mobile, md on desktop
    get small(): NuxtUISize {
        return isMd.value ? 'md' : 'sm'
    },
    get smallIconSize(): string {
        return isMd.value ? '16' : '12'
    },
    // Badge icon class for small badges (inline icons in UBadge)
    get smallBadgeIcon(): string {
        return isMd.value ? 'size-4 mr-1' : 'size-3 mr-1'
    },

    // Large responsive: lg on mobile, xl on desktop
    get large(): NuxtUISize {
        return isMd.value ? 'xl' : 'lg'
    },
    get largeIconSize(): string {
        return isMd.value ? '24' : '20'
    },

    // Calendar: xl on desktop, sm on mobile (UCalendar sizing)
    get calendar(): NuxtUISize {
        return isMd.value ? 'xl' : 'sm'
    },

    // Calendar months: 3 on desktop, 1 on mobile
    get calendarMonths(): number {
        return isMd.value ? 3 : 1
    },

    // Calendar day circle: w-8 h-8 on desktop, w-6 h-6 on mobile
    get calendarCircle(): string {
        return isMd.value ? 'w-8 h-8 text-sm' : 'w-6 h-6 text-xs'
    },

    // Calendar accordion default: '0' (expanded) on desktop, undefined (collapsed) on mobile
    get calendarAccordionDefault(): string | undefined {
        return isMd.value ? '0' : undefined
    },

    // Agenda page size: 3 on mobile, 5 on desktop
    get agendaPageSize(): number {
        return isMd.value ? 5 : 3
    },

    // Empty state avatar: 2xl on mobile, 3xl on desktop
    get emptyStateAvatar(): NuxtUIAvatarSize {
        return isMd.value ? '3xl' : '2xl'
    },

    // Lock chip: lg on mobile, 3xl on desktop (for booking calendar lock indicators)
    get lockChip(): NuxtUIChipSize {
        return isMd.value ? '3xl' : 'lg'
    },

    // Static sizes (for when you need non-responsive)
    xs: 'xs' as const,
    sm: 'sm' as const,
    md: 'md' as const,
    lg: 'lg' as const,
    xl: 'xl' as const,
    '2xl': '2xl' as const,
    '3xl': '3xl' as const
})

/**
 * createResponsiveIcons - Responsive icon patterns
 *
 * Provides icons that change based on layout direction (mobile stacked vs desktop side-by-side).
 *
 * @param isMd - Responsive breakpoint ref
 * @returns Icon helpers
 */
const createResponsiveIcons = (isMd: Ref<boolean>) => ({
    // Arrow pointing to master panel: up on mobile (stacked), left on desktop (side-by-side)
    get arrowToMaster(): string {
        return isMd.value ? ICONS.arrowLeft : ICONS.arrowUp
    }
})

/**
 * createResponsiveButtons - Standardized button configurations with responsive sizing
 *
 * Use v-bind to spread all button props at once.
 * @example <UButton v-bind="BUTTONS.edit" @click="handleEdit" />
 *
 * @param isMd - Responsive breakpoint ref
 * @returns Button configuration objects with responsive sizes
 */
const createResponsiveButtons = (isMd: Ref<boolean>) => {
    const sizes = createResponsiveSizes(isMd)
    return {
        // Edit/pencil button - for row expand/edit actions
        // Standard size: lg on desktop, md on mobile
        get edit() {
            return {
                icon: ICONS.edit,
                color: 'neutral' as const,
                variant: 'ghost' as const,
                square: true,
                size: sizes.standard
            }
        },

        // Cancel button - secondary action in form footers
        // Large size for better touch targets
        get cancel() {
            return {
                color: 'neutral' as const,
                variant: 'ghost' as const,
                icon: ICONS.xMark,
                size: sizes.large
            }
        },

        // Save/submit button - primary action in form footers
        // Large size for better touch targets
        get save() {
            return {
                color: 'primary' as const,
                variant: 'solid' as const,
                icon: ICONS.check,
                size: sizes.large
            }
        },

        // Primary action - loud, labelled CTA (NOISE.loud).
        // The one action the user came to do. Colour supplied by caller (context-dependent).
        // <UButton v-bind="BUTTONS.primaryAction" :color="HERO.primaryButton" :icon="ICONS.edit">Save</UButton>
        get primaryAction() {
            return {
                variant: NOISE.loud,
                size: sizes.standard
            }
        },

        // Secondary action - medium, labelled (NOISE.medium). Important, not primary.
        get secondaryAction() {
            return {
                variant: NOISE.medium,
                size: sizes.standard
            }
        },

        // Overflow "More" trigger - quiet (NOISE.quiet): "..." glyph + chevron, no label.
        // Reveals rare/destructive actions (danger zone) without competing with routine controls.
        // Pair with a :ui rotation on the trailing chevron to reflect open/closed state.
        get more() {
            return {
                icon: ICONS.ellipsis,
                trailingIcon: ICONS.chevronDown,
                color: 'neutral' as const,
                variant: NOISE.quiet,
                size: sizes.standard
            }
        },

        // Settings wheel - icon-only, framed (NOISE.medium), so it sits in a row of outline
        // actions with the same shape. The site names it with an `aria-label`; as a menu trigger
        // it adds `:trailing-icon="ICONS.chevronDown"`.
        get settings() {
            return {
                icon: ICONS.settings,
                color: COLOR.primary,
                variant: NOISE.medium,
                square: true,
                size: sizes.standard
            }
        },

        /**
         * Modifier for a button that opens a panel below it: a chevron that turns while the panel is open, and
         * `aria-expanded` for screen readers. Spread after a kind: `v-bind="{...BUTTONS.settings, ...BUTTONS.disclosure(isOpen)}"`
         */
        disclosure(isOpen: boolean) {
            return {
                trailingIcon: ICONS.chevronDown,
                'aria-expanded': isOpen,
                ui: {trailingIcon: isOpen ? 'rotate-180 transition-transform duration-200' : 'transition-transform duration-200'}
            }
        }
    }
}

type AlertUi = {root: string, title: string, description: string}
type AlertKindConfig = {
    color: NonNullable<AlertProps['color']>
    variant: NonNullable<AlertProps['variant']>
    icon?: string
    ui: AlertUi
}

/**
 * Nuxt UI's alert root is `overflow-hidden` and its title/description carry no wrap class,
 * so an unbreakable token (a mail address, a URL) is clipped instead of wrapped on a phone.
 * `wrap-anywhere` counts in min-content sizing where `break-words` does not, and `min-w-0`
 * lets the alert shrink inside a flex parent rather than pushing past the viewport.
 * `whitespace-normal` undoes an inherited `whitespace-nowrap` (a table cell), which no wrap
 * class can break through.
 */
const alertUi = (extra: Partial<AlertUi> = {}): AlertUi => ({
    root: ['min-w-0 whitespace-normal', extra.root].filter(Boolean).join(' '),
    title: ['wrap-anywhere', extra.title].filter(Boolean).join(' '),
    description: ['wrap-anywhere', extra.description].filter(Boolean).join(' ')
})

/**
 * createResponsiveAlerts - THE alert pattern (ADR-018)
 *
 * `v-bind` a kind and pass only domain props: `:title`, `:description`, an `:icon` override,
 * `:avatar`, `data-testid`, a margin `class`. Colour and variant belong to the kind, never to
 * the site - `tests/component/architecture/designSystemUsage.unit.spec.ts` enforces that.
 *
 * @example <UAlert v-bind="ALERTS.warning" title="Fraflytning" />
 * @example <UAlert v-bind="{...ALERTS.warning, ...ALERTS.withActions}"><template #actions>…
 * @example <UAlert v-bind="errored ? ALERTS.error : ALERTS.neutral" />   // colour by state
 *
 * @param isMd - Responsive breakpoint ref
 */
export const createResponsiveAlerts = (isMd: Ref<boolean>) => ({
    /** Prose, banners, "how this works" */
    info: {color: 'info', variant: 'subtle', icon: ICONS.info, ui: alertUi()} satisfies AlertKindConfig,

    /** Quiet system feedback: nothing here yet, read-only, last result */
    neutral: {color: 'neutral', variant: 'subtle', icon: ICONS.robotHappy, ui: alertUi()} satisfies AlertKindConfig,

    /** Something went right and stays right (active season, residency confirmed) */
    success: {color: 'success', variant: 'soft', icon: ICONS.checkCircle, ui: alertUi()} satisfies AlertKindConfig,

    /** The user should look before acting (deadlines, power mode, poster notes) */
    warning: {color: 'warning', variant: 'soft', icon: ICONS.warning, ui: alertUi()} satisfies AlertKindConfig,

    /** Something failed or is cancelled */
    error: {color: 'error', variant: 'soft', icon: ICONS.exclamationCircle, ui: alertUi()} satisfies AlertKindConfig,

    /** "Forklaring" panels: a bordered box around badges, lists and selectors. Icon per site */
    legend: {color: 'neutral', variant: 'outline', ui: alertUi()} satisfies AlertKindConfig,

    /** Empty state - centred, large, emoji avatar. Stays vertical even with a CTA in #actions */
    emptyState: {
        color: 'neutral',
        variant: 'soft',
        ui: alertUi({
            root: 'text-center',
            title: 'text-lg md:text-xl font-semibold',
            description: 'text-sm md:text-base'
        })
    } satisfies AlertKindConfig,

    /** Empty state inside a panel or a row - compact, mocha tinted */
    emptyStateCompact: {
        color: 'neutral',
        variant: 'soft',
        ui: alertUi({
            root: `text-center py-2 ${BG.mocha[100]} ${TEXT.mocha[900]} rounded-lg`,
            title: 'text-sm font-normal',
            description: 'text-xs'
        })
    } satisfies AlertKindConfig,

    /**
     * Modifier, not a kind: spread AFTER a kind when the alert carries action buttons.
     * Actions sit beside the text on desktop and below it on a phone.
     * @example <UAlert v-bind="{...ALERTS.info, ...ALERTS.withActions}">
     */
    get withActions() {
        return {orientation: (isMd.value ? 'horizontal' : 'vertical') as NonNullable<AlertProps['orientation']>}
    },

    /**
     * Modifier, not a kind: spread AFTER a text kind when the alert's one action is an icon-only
     * button (a pencil). The button sits in the box's top-right corner on every viewport, the way
     * a card's edit pencil does. It carries the kinds' shared wrap `ui`, so it pairs with the
     * text kinds, not with the empty states.
     * @example <UAlert v-bind="{...ALERTS.legend, ...ALERTS.withCornerAction}">
     */
    withCornerAction: {
        orientation: 'horizontal' as NonNullable<AlertProps['orientation']>,
        ui: {...alertUi({root: 'items-start'}), actions: 'self-start'}
    }
})

export type ResponsiveAlerts = ReturnType<typeof createResponsiveAlerts>
/** The alert kinds a component may take as a prop (`kind?: AlertKind`) */
export type AlertKind = Exclude<keyof ResponsiveAlerts, 'withActions' | 'withCornerAction'>

/**
 * createOrientations - Responsive orientation patterns for UFieldGroup
 *
 * Provides responsive orientation values for button groups and field groups.
 *
 * @param isMd - Responsive breakpoint ref
 * @returns Orientation helpers
 */
const createOrientations = (isMd: Ref<boolean>) => ({
    /**
     * Responsive orientation: vertical on mobile, horizontal on desktop
     * Common for button groups, weekday selectors showing multiple items
     */
    responsive: computed(() => isMd.value ? 'horizontal' : 'vertical'),

    /**
     * Always horizontal (desktop/mobile)
     */
    horizontal: 'horizontal' as const,

    /**
     * Always vertical (desktop/mobile)
     */
    vertical: 'vertical' as const,

    /**
     * Orientation based on item count:
     * - At or below threshold: always horizontal (fits in a row)
     * - Above threshold: vertical on desktop, horizontal on mobile
     *
     * Use case: Tab selectors where few items look better horizontal,
     * but many items need vertical layout on desktop sidebars.
     *
     * @param count - Number of items
     * @param threshold - Max count for always-horizontal (default: 2)
     */
    forItemCount: (count: number, threshold = 2): 'horizontal' | 'vertical' => {
        if (count <= threshold) return 'horizontal'
        return isMd.value ? 'vertical' : 'horizontal'
    }
})

/**
 * createWeekdayDisplay - Weekday label formatting with responsive sizing
 *
 * Centralizes weekday display logic (3 letters desktop, 1 letter mobile).
 * Based on HouseholdCard pattern (lines 181-185, 271-283).
 *
 * @param isMd - Responsive breakpoint ref
 * @returns Weekday display helpers
 */
const createWeekdayDisplay = (isMd: Ref<boolean>) => ({
    /**
     * Get formatted weekday label (responsive)
     * Desktop: 3 letters (e.g., "Man")
     * Mobile: 1 letter (e.g., "M")
     */
    getLabel: (day: WeekDay) => formatWeekdayCompact(day, !isMd.value),

    /**
     * Badge props for weekday title headers (table columns)
     * Matches HouseholdCard preferences-header styling
     */
    titleBadgeProps: {
        color: 'neutral' as const,
        variant: 'outline' as const,
        class: 'rounded-none md:rounded-md'
    },

    /**
     * UFieldGroup classes for weekday preference displays
     * Used in table headers and weekday selector rows
     * Responsive padding, borders, background, and minimum widths
     */
    fieldGroupClasses: 'p-0 md:p-1.5 rounded-none md:rounded-lg border border-default bg-neutral gap-0 md:gap-1 min-w-16 md:min-w-32',

    /**
     * Badge/button content size for dinner mode icons
     * Mobile: size-4 (16px), Desktop: size-8 (32px)
     */
    badgeContentSize: 'size-4 md:size-8'
})

/**
 * createPagination - Responsive pagination configuration
 *
 * Provides responsive sibling count for UPagination components.
 * Pattern used in people finder (InhabitantSelector) and agenda views.
 *
 * @param isMd - Responsive breakpoint ref
 * @returns Pagination configuration
 *
 * @example
 * ```vue
 * <UPagination
 *   :sibling-count="PAGINATION.siblingCount.value"
 *   @update:page="handlePage"
 * />
 * ```
 */
const createPagination = (isMd: Ref<boolean>) => ({
    /**
     * Responsive sibling count:
     * - Desktop (isMd): 1 sibling (shows 3 pages: prev, current, next)
     * - Mobile (!isMd): 0 siblings (shows 1 page: current only)
     */
    siblingCount: computed(() => isMd.value ? 1 : 0)
})

/**
 * createNavigation - Responsive navigation configuration
 *
 * Provides navigation link styling and responsive behavior for header menus.
 * On desktop (md+), drawer links swap to main nav since drawer toggle is hidden.
 *
 * @param isMd - Responsive breakpoint ref
 * @returns Navigation configuration
 */
const createNavigation = (isMd: Ref<boolean>) => ({
    // Link styling - matches UNavigationMenu: neutral (sky/blue) default, primary (amber/brown) soft when active
    link: {
        color: 'neutral' as const,
        variant: 'link' as const,
        activeColor: 'primary' as const,
        activeVariant: 'soft' as const
    },
    /**
     * Whether to swap drawer content with main nav
     * - Desktop (isMd): true - drawer links should be in main nav (toggle is hidden)
     * - Mobile (!isMd): false - drawer links stay in drawer
     */
    get shouldSwapDrawerWithMain(): boolean {
        return isMd.value
    }
})

/**
 * useTheSlopeDesignSystem Composable
 *
 * TheSlope's centralized design system - single source of truth for colors, typography,
 * layouts, backgrounds, components, and responsive sizing patterns.
 *
 * Provides curated design decisions based on Pantone Color of the Year 2025 (Mocha Mousse)
 * and TheSlope's vibrant color palette.
 *
 * @example
 * ```ts
 * const { COLOR, TYPOGRAPHY, LAYOUTS, BACKGROUNDS, COMPONENTS, SIZES, WEEKDAY } = useTheSlopeDesignSystem()
 *
 * // Use semantic patterns
 * <footer :class="LAYOUTS.footer">
 *   <span :class="TYPOGRAPHY.footerText">Copyright 2025</span>
 * </footer>
 *
 * // Use responsive sizes
 * <UButton :size="SIZES.standard">Click me</UButton>
 *
 * // Use weekday labels
 * <UBadge v-bind="WEEKDAY.titleBadgeProps">
 *   {{ WEEKDAY.getLabel('mandag') }}
 * </UBadge>
 * ```
 */
/**
 * DINNER_STATE_BADGES - Shared dinner state badge configuration
 *
 * Used for consistent dinner state display across:
 * - TeamCalendarDisplay (agenda view)
 * - ChefDinnerCard (master view)
 * - DinnerEvent components
 *
 * Colors follow feature proposal:
 * - SCHEDULED: mocha (warm - "ready to plan")
 * - ANNOUNCED: success (green - "published, bookable")
 * - CONSUMED: neutral (gray - "done, archived")
 * - CANCELLED: neutral (black/dark - NOT red, red is for deadline warnings)
 */
export const DINNER_STATE_BADGES = {
    SCHEDULED: {
        label: 'Planlagt',
        color: COLOR.mocha,
        icon: 'i-heroicons-clipboard-document-list'
    },
    ANNOUNCED: {
        label: 'Annonceret',
        color: COLOR.success,
        icon: 'i-heroicons-megaphone'
    },
    CANCELLED: {
        label: 'Aflyst',
        color: COLOR.neutral,
        icon: 'i-heroicons-x-circle'
    },
    CONSUMED: {
        label: 'Afholdt',
        color: COLOR.neutral,
        icon: 'i-heroicons-check-circle'
    }
} as const

/**
 * PLANNING_CALENDAR - Pink palette accent colors
 *
 * Season planning preview: a generated dinner event is filled, a day that only
 * matches the cooking pattern is an outline.
 */
// The holiday marker every calendar draws: an empty circle with a green ring
const HOLIDAY_RING = `ring-2 ${RING.green[500]}`

export const PLANNING_CALENDAR = {
    day: {
        generated: `font-medium ${BG.pink[800]} ${TEXT.pink[50]}`,
        potential: 'font-medium border-2 border-pink-300 text-pink-800 dark:text-pink-300'
    }
} as const

/**
 * CALENDAR - Shared calendar structure and styling
 *
 * Contains shared shapes, typography, and behaviors.
 * Use with palette-specific constants (CHEF_CALENDAR, DINNER_CALENDAR).
 */
export const CALENDAR = {
    day: {
        shape: 'rounded-full flex items-center justify-center cursor-pointer hover:opacity-90',
        past: `font-medium ${BG.mocha[100]} ${TEXT.mocha[900]}`
    },
    countdown: {
        container: 'bg-amber-950 text-amber-50 py-6 md:py-8 border-b-2',
        title: 'text-xs md:text-sm font-semibold tracking-widest uppercase opacity-90 text-amber-50',
        date: 'text-sm font-medium uppercase',
        number: 'text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight',
        numberPrefix: 'opacity-75 text-amber-50',
        timeLabel: 'text-xs md:text-sm',
        timeValue: 'text-xl md:text-2xl font-medium',
        dot: 'w-3 h-3 rounded-full animate-pulse'
    },
    deadline: {
        critical: `ring-2 ${RING.red[500]}`,
        warning: `ring-2 ${RING.amber[500]}`,
        onTrack: ''
    },
    // The holiday marker every calendar draws: an empty circle with a green ring
    holiday: HOLIDAY_RING,
    /**
     * Picker selection presets - what is being picked decides how a selected day reads:
     * a holiday is the same green ring the preview draws, a season date the filled pink
     * of a cooking day with a dinner. Rendered through the pickers' `#day` slot.
     */
    picker: {
        cookingDay: PLANNING_CALENDAR.day.generated,
        holiday: HOLIDAY_RING
    },
    /**
     * A picker draws its selection in the `#day` slot, so the cell trigger keeps its own
     * selected and range fill out of the way (variant names from `.nuxt/ui/calendar.ts`).
     */
    pickerCell: 'data-[selected]:bg-transparent data-[selected]:text-default data-[highlighted]:bg-transparent data-[highlighted]:text-default',
    // Base selection behaviour - combine with palette-specific color
    selection: {
        base: 'ring-2 md:ring-4',
        // Card behaviors for selectable items (agenda, list views)
        card: {
            base: 'cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg',
            // Helper to generate selected state with color
            selected: (ringColor: string) => `ring-2 md:ring-4 ${ringColor}`
        }
    }
} as const

export type CalendarPickerSelection = keyof typeof CALENDAR.picker

/**
 * UTable column visibility by breakpoint: `hiddenOnPhone` columns hide on a phone, `hiddenFromMd` columns hide from md.
 * The content of a column hidden on a phone lives in the row's expanded panel; its expand column is `hiddenFromMd`
 * when every column fits from md.
 * @example <UTable :column-visibility="columnVisibility(['id', 'phone'])" />
 * @example <UTable :column-visibility="columnVisibility(['durationMs'], ['expand'])" />
 */
export const createColumnVisibility = (isMd: Ref<boolean>) =>
    (hiddenOnPhone: readonly string[], hiddenFromMd: readonly string[] = []): Record<string, boolean> =>
        Object.fromEntries((isMd.value ? hiddenFromMd : hiddenOnPhone).map(column => [column, false]))

/**
 * The shared calendar day circle: responsive size + shape + the variant the surface adds
 * (CALENDAR.holiday, PLANNING_CALENDAR.day.generated, CHEF_CALENDAR.day.next, …).
 * Exposed from the composable because the size depends on `isMd`.
 */
export const createDayCircleClasses = (isMd: Ref<boolean>) =>
    (...variants: (string | false | null | undefined)[]): string[] =>
        [createResponsiveSizes(isMd).calendarCircle, CALENDAR.day.shape, ...variants.filter((variant): variant is string => Boolean(variant))]

/**
 * Props for a date picker's UCalendar: the shared grid token with the cell-fill
 * neutralisation, so the `#day` slot owns how a selected day reads.
 */
export const calendarPickerProps = () => ({
    ...COMPONENTS.calendarGrid,
    ui: {cellTrigger: `${COMPONENTS.calendarGrid.ui.cellTrigger} ${CALENDAR.pickerCell}`}
})

/**
 * CHEF_CALENDAR - Ocean palette accent colors
 */
export const CHEF_CALENDAR = {
    day: {
        next: `text-white dark:text-black font-bold ${BG.ocean[400]}`,
        future: `font-medium ${BG.ocean[200]} ${TEXT.ocean[800]}`
    },
    countdown: {
        border: 'border-ocean-400',
        accent: TEXT.ocean[200],
        accentLight: TEXT.ocean[50],
        accentMedium: TEXT.ocean[300],
        dot: BG.ocean[400]
    },
    // Selection uses outline (outer) so deadline ring (inner) remains visible
    selection: 'outline outline-2 md:outline-4 outline-ocean-700 outline-offset-2'
} as const

/**
 * DINNER_CALENDAR - Peach palette accent colors
 */
export const DINNER_CALENDAR = {
    day: {
        next: `text-white dark:text-black font-bold ${BG.peach[400]}`,
        future: `font-medium ${BG.peach[200]} ${TEXT.peach[800]}`
    },
    countdown: {
        border: BORDER.peach[400],
        accent: TEXT.peach[200],
        accentLight: TEXT.peach[50],
        accentMedium: TEXT.peach[300],
        dot: BG.peach[400]
    },
    // Selection uses outline (outer) so deadline ring (inner) remains visible
    selection: 'outline outline-2 md:outline-4 outline-peach-700 outline-offset-2'
} as const


/**
 * DEADLINE_BADGES - Chef deadline indicator badges
 *
 * Small colored chips showing deadline types and urgency in agenda view.
 * Complements calendar ring indicators with specific deadline info.
 */
export const DEADLINE_BADGES = {
    /** Completed - check circle (green) */
    COMPLETED: {
        color: COLOR.success,
        label: 'Færdig',
        icon: 'i-heroicons-check-circle'
    },
    /** On track - ellipsis circle (green) */
    SUCCESS: {
        color: COLOR.success,
        label: 'OK',
        icon: 'i-heroicons-ellipsis-horizontal-circle'
    },
    /** Warning - exclamation circle (orange) */
    WARNING: {
        color: COLOR.warning,
        label: 'Snart',
        icon: 'i-heroicons-exclamation-circle'
    },
    /** Critical - exclamation circle (red) */
    CRITICAL: {
        color: COLOR.error,
        label: 'Kritisk',
        icon: 'i-heroicons-exclamation-circle'
    },
    /** Overdue - exclamation circle (black) */
    OVERDUE: {
        color: COLOR.neutral,
        label: 'Forsinket',
        icon: 'i-heroicons-exclamation-circle'
    },
    /** @deprecated Use COMPLETED for completed steps */
    NEUTRAL: {
        color: COLOR.success,
        label: 'Neutral',
        icon: 'i-heroicons-check-circle'
    },
    /** @deprecated Use COMPLETED */
    DONE: {
        color: COLOR.success,
        label: 'Færdig',
        icon: 'i-heroicons-check-circle'
    },
    /** @deprecated Use SUCCESS */
    ON_TRACK: {
        color: COLOR.success,
        label: 'OK',
        icon: 'i-heroicons-ellipsis-horizontal-circle'
    }
} as const

/**
 * Maps AlarmLevel to DEADLINE_BADGES
 * -1 = Completed (check), 0 = On track (ellipsis), 1 = Warning, 2 = Critical, 3 = Overdue
 */
export const ALARM_TO_BADGE = {
    [-1]: DEADLINE_BADGES.COMPLETED,
    0: DEADLINE_BADGES.SUCCESS,
    1: DEADLINE_BADGES.WARNING,
    2: DEADLINE_BADGES.CRITICAL,
    3: DEADLINE_BADGES.OVERDUE
} as const

/**
 * Maps DeadlineUrgency (0 | 1 | 2) to DEADLINE_BADGES
 * @deprecated Use ALARM_TO_BADGE instead
 * 0 = On track, 1 = Warning, 2 = Critical
 */
export const URGENCY_TO_BADGE = {
    0: DEADLINE_BADGES.ON_TRACK,
    1: DEADLINE_BADGES.WARNING,
    2: DEADLINE_BADGES.CRITICAL
} as const

/**
 * Maps DeadlineUrgency to UChip colors for calendar display
 * Uses 'yellow' for warning (more visible than orange 'warning')
 * 0 = null (no chip), 1 = yellow, 2 = error (red), 3 = neutral (black/overdue)
 */
export const URGENCY_TO_CHIP_COLOR = {
    [-1]: null,  // No dinner
    0: null,     // On track
    1: 'yellow', // Warning
    2: 'error',  // Critical
    3: 'neutral' // Overdue
} as const

/**
 * BOOKING_LOCK_STATUS - Lock indicator chips for household booking calendar
 *
 * Shows booking deadline status based on released ticket count:
 * - null: Not locked (deadline not yet passed) - no chip
 * - 0: Locked, no tickets available - peach chip (matches selection ring)
 * - >0: Locked, tickets available - yellow chip
 */
export const BOOKING_LOCK_STATUS = {
    locked: {
        color: 'peach' as NuxtUIColor,
        icon: ICONS.lockClosed
    },
    lockedWithTickets: {
        color: 'yellow' as NuxtUIColor,
        icon: ICONS.lockClosed
    }
} as const

/** Get lock status config from released ticket count (null = not locked, 0 = locked, >0 = tickets available) */
export const getLockStatusConfig = (releasedCount: number | null) => {
    if (releasedCount === null) return null
    return releasedCount > 0 ? BOOKING_LOCK_STATUS.lockedWithTickets : BOOKING_LOCK_STATUS.locked
}

// ============================================================================
// PART 7: Empty State Messages (fun placeholders)
// ============================================================================

/**
 * EMPTY_STATE_MESSAGES - Fun empty state messages by context
 */
export const EMPTY_STATE_MESSAGES = {
    cookingTeam: [
        { emoji: '🌱', text: 'Køkkenholdet lytter til græs der gror' },
        { emoji: '☁️', text: 'Køkkenholdet kigger på skyer' },
        { emoji: '💨', text: 'Køkkenholdet øver sig på luftfrikadeller' },
        { emoji: '🎨', text: 'Køkkenholdet ser maling tørre' },
        { emoji: '🏃‍♀️🏃‍♂️', text: 'Køkkenholdet er løbet ud at lege' }
    ],
    household: [
        { emoji: '👻', text: 'Husstanden er forsvundet i tågen' },
        { emoji: '🏝️', text: 'Alle på ferie - ingen hjemme!' },
        { emoji: '🎪', text: 'Familien er stukket af med cirkus' },
        { emoji: '🧘', text: 'Familien mediterer i bjergene' },
        { emoji: '🚀', text: 'Husstanden tog til månen... uden WiFi' }
    ],
    allergy: [
        { emoji: '🤷', text: 'Ingen beboere har denne allergi... endnu' },
        { emoji: '✨', text: 'Kan spises af alle - så er køkkenlivet lidt lettere!' },
        { emoji: '🎉', text: 'Hurra! Ingen allergiske reaktioner her' },
        { emoji: '👍', text: 'Alle har sagt god for denne ingrediens' },
        { emoji: '😌', text: 'Ingen bekymringer med denne ingrediens' }
    ],
    noTeamAssigned: [
        { emoji: '🤔', text: 'Hvem laver maden? Det finder vi ud af!' },
        { emoji: '🎲', text: 'Madholdet er stadig i puljen' },
        { emoji: '🔮', text: 'Krystalkuglen ved ikke hvem der laver mad endnu' },
        { emoji: '🎯', text: 'Administratoren sigter efter et madhold' },
        { emoji: '🧩', text: 'Puslespillet mangler et madhold' }
    ],
    jobHistory: [
        { emoji: '😴', text: 'Bytenisserne sover endnu' },
        { emoji: '🐱', text: 'Katten har ædt kildekoden til systemjobbet' },
        { emoji: '📋', text: 'Servernes fagforening har indkaldt til årsmøde' },
        { emoji: '🌙', text: 'Systemet venter på fuldmåne før første kørsel' },
        { emoji: '🔧', text: 'Tandhjulene er ved at blive poleret' }
    ],
    noDinners: [
        { emoji: '😴', text: 'Gryderne sover i denne periode' },
        { emoji: '🍳', text: 'Panderne hviler sig' },
        { emoji: '🥄', text: 'Grydeskeerne venter på næste middag' },
        { emoji: '🧂', text: 'Saltet venter tålmodigt i skabet' }
    ],
    noGuestTickets: [
        { emoji: '🌬️', text: 'Billetterne blæser om kap med vinden - se om du kan fange en derude!' },
        { emoji: '😋', text: 'Maden er for god i dag til at vi vil dele med nogen' },
        { emoji: '🍕', text: 'Du kan desværre ikke være med, men der er en dejlig pizzeria i Lejre Downtown' },
        { emoji: '🎫', text: 'Du kan få en fribillet til Store Bededag i stedet for' },
        { emoji: '🦆', text: 'Ænderne i Lejre Å har også travlt i dag - prøv igen i morgen!' }
    ]
} as const

/** Pick a random message from a context - seeded by UTC date so SSR and client agree */
export const getRandomEmptyMessage = (context: keyof typeof EMPTY_STATE_MESSAGES, today: Date = new Date()) => {
    const messages = EMPTY_STATE_MESSAGES[context]
    // UTC parts: local date parts diverge between a UTC server and a Danish browser
    // in the evening, giving each side a different "random" message (hydration mismatch)
    const seed = today.getUTCFullYear() * 10000 + (today.getUTCMonth() + 1) * 100 + today.getUTCDate()
    const index = seed % messages.length
    return messages[index]!
}

export const useTheSlopeDesignSystem = () => {
    // Inject responsive breakpoint from layout
    const isMd = inject<Ref<boolean>>('isMd', ref(false))
    const dayCircleClasses = createDayCircleClasses(isMd)
    const columnVisibility = createColumnVisibility(isMd)

    return {
        // For NuxtUI components
        COLOR,
        NOISE,
        TICKET_TYPE_COLORS,
        DINNER_STATE_BADGES,
        CALENDAR,
        calendarPickerProps,
        dayCircleClasses,
        columnVisibility,
        CHEF_CALENDAR,
        DINNER_CALENDAR,
        PLANNING_CALENDAR,
        DEADLINE_BADGES,
        ALARM_TO_BADGE,
        URGENCY_TO_BADGE,
        URGENCY_TO_CHIP_COLOR,
        BOOKING_LOCK_STATUS,
        getLockStatusConfig,
        ORDER_STATE_COLORS,
        getOrderStateColor,
        PANTONE_CHIPS,
        getPantoneChip,
        RAINBOW,
        RAINBOW_FAMILIES,
        getRainbowBand,
        getRainbowFamily,
        ICONS,
        IMG,

        // Semantic design patterns (USE THESE!)
        TYPOGRAPHY,
        LAYOUTS,
        BACKGROUNDS,
        COMPONENTS,

        // Responsive sizes
        SIZES: createResponsiveSizes(isMd),

        // Responsive orientations
        ORIENTATIONS: createOrientations(isMd),

        // Weekday display helpers
        WEEKDAY: createWeekdayDisplay(isMd),

        // Pagination configuration
        PAGINATION: createPagination(isMd),

        // Navigation configuration
        NAVIGATION: createNavigation(isMd),

        // Responsive icons
        RESPONSIVE_ICONS: createResponsiveIcons(isMd),

        // Responsive buttons (standardized button configs with sizing)
        BUTTONS: createResponsiveButtons(isMd),

        // Responsive alerts (ADR-018: v-bind a kind, never raw color/variant)
        ALERTS: createResponsiveAlerts(isMd),

        // Low-level builders (only if you need custom combinations)
        BG,
        TEXT,
        BORDER,
        RING,

        // Helpers
        getKitchenPanelClasses,
        getRibbonClasses,
        RESIDENCY_CONFIG,
        getResidencyDisplay,
        getRandomEmptyMessage,
        EMPTY_STATE_MESSAGES
    }
}

// Backwards compatibility alias (deprecated - use useTheSlopeDesignSystem)
export const useColorSystem = useTheSlopeDesignSystem
