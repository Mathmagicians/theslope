import {computed} from 'vue'
import type {WeekDay} from '~/types/dateTypes'
import type {AlertProps, AvatarProps, ButtonProps, BadgeProps, ChipProps} from '@nuxt/ui'
import {SEASON_STATUS} from '~/composables/useSeasonValidation'
import type {TicketState} from '~/composables/useBookingValidation'
import type {SeasonStatusValue} from '~/utils/season'

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
 *
 * Off the ladder: `subtle` (a soft tint inside a ring, the status badges) and `link` (text only,
 * a button that reads as a link). Each value is a literal type, so the badge variants
 * (`solid`, `outline`, `soft`, `subtle`) bind on a UBadge.
 */
export const NOISE = {
    loud:   'solid',
    medium: 'outline',
    soft:   'soft',
    quiet:  'ghost',
    subtle: 'subtle',
    link:   'link'
} as const satisfies Record<string, NuxtUIButtonVariant>

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
    green: {
        500: 'bg-green-500',    // The active season's disc, the holiday ring's green
        600: 'bg-green-600'     // The diff legend's new fill
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
    budgetHead: 'bg-neutral-50 dark:bg-neutral-800',
    /** The disc behind an allergy type's icon or emoji, white in both modes */
    allergyAvatar: 'bg-white',
    /** The tint of an expanded table row (the household allergies row). A variant prefix cannot be
     *  composed onto a token, so the pair lives here rather than at the site */
    expandedRow: 'data-[expanded=true]:bg-neutral-100/50 dark:data-[expanded=true]:bg-neutral-800/50'
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
        200: 'text-amber-200',
        600: 'text-amber-600',
        800: 'text-amber-800',    // Kitchen stats bar - secondary lines
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
    green: {
        500: 'text-green-500'    // The sprout of an upcoming season, the holiday ring's green
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
    /** The ink of a figure in the black, a check, a saved state */
    success: 'text-success-700 dark:text-success-400',
    /** The ink of an overdraft, a released ticket, a validation line */
    error: 'text-error-700 dark:text-error-400',
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
        // Admin economy - the invoice breakdown box
        frame: 'border-gray-200 dark:border-gray-800',
        300: 'border-gray-300',    // Poster - QR frame
        500: 'border-gray-500',
        600: 'border-gray-600',
        700: 'border-gray-700',
        800: 'border-gray-800 dark:border-gray-600'
    },
    peach: {
        400: 'border-peach-400',   // Calendar - countdown, rings
        600: 'border-peach-600'    // Team accent - selected row tab
    },
    // Bonbon names the violet scale and mocha the amber scale (the BG alias convention)
    bonbon: {
        600: 'border-violet-600'   // Team accent - selected row tab
    },
    yellow: {
        600: 'border-yellow-600'   // Team accent - selected row tab
    },
    sky: {
        600: 'border-sky-600'      // Team accent - selected row tab
    },
    mocha: {
        600: 'border-amber-600'    // Team accent - selected row tab
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
    /** Fine print that recedes: unit words, a note under a field, a comment */
    finePrintMuted: `text-xs ${TEXT.muted}`,
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

    /**
     * Master-detail page, in UPage's slots (`root`, `left`, `center`): stacked on a phone, master on top. From md the
     * master takes a third of the row, at least a week of 24px day circles, and the detail the rest, never wider than
     * its column. The lg: classes repeat the md ones: tailwind-merge keeps an md: class beside UPage's own lg grid,
     * which would win from lg.
     */
    masterDetailPage: {
        root: 'flex flex-col gap-2 md:grid md:gap-4 md:grid-cols-[minmax(245px,1fr)_minmax(0,2fr)] lg:grid-cols-[minmax(245px,1fr)_minmax(0,2fr)] lg:gap-4',
        left: 'min-w-0 lg:col-span-1',
        center: 'min-w-0 lg:col-span-1'
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

    // Card header row: content (selector, title) left, the rare action in the right corner -
    // the admin pages' shared header shape. Stacked with full-width children on a phone.
    cardHeaderRow: 'flex flex-col md:flex-row md:items-center md:justify-between gap-2',

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
 * light fill carries its own family's darkest rung. The ratios are the lower of Glade farver and
 * Til farveblinde; Høj kontrast holds every surface at 7:1.
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

/** The selected team row's left tab: the team's own family at the 600 border rung */
const RAINBOW_ACCENTS: Record<RainbowFamily, string> = {
    pink: BORDER.pink[600],
    orange: BORDER.orange[600],
    ocean: BORDER.ocean[600],
    bonbon: BORDER.bonbon[600],
    peach: BORDER.peach[600],
    yellow: BORDER.yellow[600],
    sky: BORDER.sky[600],
    mocha: BORDER.mocha[600]
}

export const getRainbowAccent = (index: number): string =>
    `border-s-4 ps-2 ${RAINBOW_ACCENTS[RAINBOW_FAMILIES[index % RAINBOW_FAMILIES.length]!]}`

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

/** The stats bar's secondary lines: the bar's fill, so the ink is measured on the surface it sits on */
const KITCHEN_STATS_BAR_SECONDARY = `${BG.mocha[50]} ${TEXT.mocha[800]}`

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
/** A data table cell's padding */
const TABLE_CELL_PADDING = 'px-2 py-1 md:px-4 md:py-2'
/** A data table's cell, the one `table.ui` gives every td and a sum row binds through `table.sumCell` */
const TABLE_CELL = `${TABLE_CELL_PADDING} ${TABLE_CELL_WRAP}`
/** A data table's cells: `table.ui`, and the tables that add to it */
const TABLE_UI = {th: 'px-2 md:px-4', td: TABLE_CELL} as const

/** Compact tables with many narrow columns */
const TABLE_DENSE_UI = {th: 'px-1 py-1 md:px-4 md:py-3', td: `px-1 md:px-4 ${TABLE_CELL_WRAP}`} as const

// The turn of an open-panel chevron; the classes go on whichever icon slot carries the chevron
const flipOpenTurn = (isOpen: boolean): string => `${isOpen ? 'rotate-180 ' : ''}transition-transform duration-200`
// The quarter turn of a chevron whose children open one level in
const openInTurn = (isOpen: boolean): string => `${isOpen ? 'rotate-90 ' : ''}transition-transform duration-200`

// A spinning icon while something runs: saving, a job, a fetch
const MOTION_SPIN = 'animate-spin motion-reduce:animate-none'

// The row over a collapsible: its title or tabs left, the chevron right
const COLLAPSIBLE_HEADER_ROW = 'flex items-center justify-between gap-2'

/**
 * The colour of a ticket's state: the ticket's edge and state glyph (DinnerTicket), the order state labels
 * (`ORDER_STATE_LABELS` in useBookingUi) and the waiting list surfaces (`COMPONENTS.waitlist`)
 */
export const ORDER_STATE_COLORS = {
    normal: COLOR.primary,
    released: COLOR.error,
    claimed: COLOR.info,
    queued: COLOR.neutral
} as const satisfies Record<TicketState, NuxtUIBadgeColor>

// A dinner ticket's card; each face adds its fill and the edge its state colours (`COMPONENTS.ticket.face`)
const TICKET_FRAME = 'relative overflow-hidden rounded-lg p-2 md:p-3 w-full border-x-4 md:border-x-8'
const TICKET_FACE = `${TICKET_FRAME} ${BG.ticket}`

// A past calendar day's colours (`CALENDAR.day.past`); a cancelled dinner's ticket and mode badge wear them too
const PAST_DAY_COLORS = `${BG.mocha[100]} ${TEXT.mocha[900]}`
// A cancelled dinner is struck through: its calendar day, its tickets and their mode badges. The stroke takes the past-day
// ink (`TEXT.mocha[900]`), spelled out for the Tailwind scanner; the cancelled fill stays light in the dark, so one value
const CANCELLED_STRIKE = 'line-through decoration-2 decoration-amber-900'

// The lock chip that carries the waiting-list hourglass: a step above SIZES.lockChip, so the glyph sits with a small inset
const QUEUE_LOCK_CHIP = {ui: {base: 'h-3.5 min-w-3.5 md:h-4.5 md:min-w-4.5'}, icon: 'size-2.5 md:size-3.5'} as const

// The box a corner ribbon is clipped to (`COMPONENTS.ribbon.container`, the household page's card root)
const RIBBON_CONTAINER = 'relative overflow-hidden'

// An inhabitant avatar size (`COMPONENTS.avatar`): `size` everywhere, `fit` the step up from md on each `UAvatar`, and
// `group` for a `UAvatarGroup`, whose `ui.base` carries the fit to its faces and the overflow count
const avatarFace = (size: NuxtUIAvatarSize, fit: string) => ({size, fit, group: {size, ui: {base: fit}}})

export const COMPONENTS = {
    // The turn of an open-panel chevron on a button whose own icon carries it; BUTTONS.flipOpen turns a trailing chevron
    openTurn: flipOpenTurn,

    // The pipe between the parts of one line, in its own span: a flex item drops the spaces a "|" in the text would carry
    pipe: 'mx-1',

    // Kitchen panels (functional data) - Vibrant Pantone colors
    kitchenStatsBar: `${BG.mocha[50]} ${TEXT.gray[900]} px-0 py-4 md:p-6`,

    /**
     * The dining modes walk `RAINBOW` from its first stop, so a panel is the same brand surface
     * the landing band paints and the panel owns only its edge and its box. Each divider is its
     * own family one rung deeper. TIL SALG stays grey: it is a ticket on offer, not a dining
     * mode, and the neutral fill is what says so. Dark ink reads 8.07:1 on it. The waiting list
     * shares the box: its people buy what is for sale.
     */
    kitchenPanel: {
        TAKEAWAY: `${getRainbowBand(0)} ${BORDER.pink[600]} ${KITCHEN_PANEL_BOX}`,
        DINEIN: `${getRainbowBand(1)} ${BORDER.orange[600]} ${KITCHEN_PANEL_BOX}`,
        DINEINLATE: `${getRainbowBand(2)} ${BORDER.ocean[600]} ${KITCHEN_PANEL_BOX}`,
        RELEASED: `${BG.gray[400]} ${TEXT.black} ${BORDER.gray[500]} ${KITCHEN_PANEL_BOX}`
    },

    /**
     * KitchenPreparation's layout on the kitchen surfaces: the totals in the stats bar, the panel
     * row, a panel's head lines and allergy line, and the household list a selected panel opens
     * below the row on that panel's surface (the list's padding and alignment win over the box's);
     * `allergyOverview` sets the kitchen type size on the shared `allergyOverview` line. The TIL SALG
     * box's waiting-list part follows its gap (`queue`), in the box and in its list; in the list each part's heading
     * (`partHeading`) sits on the left; each part's kuverter carry its glyph (`mainWithGlyph`)
     */
    kitchen: {
        totals: 'text-center',
        totalsLabel: `${TYPOGRAPHY.kitchenLabel} ${KITCHEN_STATS_BAR_SECONDARY}`,
        totalsMain: 'text-2xl md:text-3xl lg:text-4xl font-bold',
        totalsBreakdown: `text-xs md:text-sm flex flex-wrap justify-center gap-x-2 ${KITCHEN_STATS_BAR_SECONDARY}`,
        panels: 'flex flex-col md:flex-row overflow-hidden',
        // Beside `kitchenPanel`: the phone stacks the panels, so a bottom edge divides them below md
        panel: 'border-b md:border-b-0 md:border-r last:border-b-0 last:md:border-r-0 cursor-pointer',
        label: `${TYPOGRAPHY.kitchenLabel} truncate flex items-center justify-center gap-1`,
        glyph: 'size-4',
        breakdown: `${TYPOGRAPHY.kitchenDetail} flex flex-wrap justify-center gap-x-1`,
        figure: 'whitespace-nowrap',
        figureTotal: 'whitespace-nowrap font-semibold',
        allergyHead: `${TYPOGRAPHY.kitchenDetail} pt-2 flex items-center justify-center gap-1`,
        householdList: 'px-8 md:px-32 py-6 md:py-8 max-h-64 overflow-y-auto text-left',
        // One wrapping row on one vertical centre: the segments, and a diner with the allergy types beside the name
        household: `${TYPOGRAPHY.kitchenDetail} py-1 flex flex-wrap items-center gap-x-1`,
        householdName: 'font-semibold',
        diner: 'inline-flex items-center',
        allergyOverview: `${TYPOGRAPHY.kitchenDetail} py-1`,
        queue: 'pt-4 first:pt-0',
        partHeading: `${TYPOGRAPHY.kitchenLabel} py-1`,
        // A kuverter line carrying the glyph of its part, as `allergyHead` carries the allergy glyph
        mainWithGlyph: `${TYPOGRAPHY.kitchenMain} flex items-center justify-center gap-1`
    },

    /**
     * The allergy overview (`AllergyOverviewLine`): `ICONS.allergy` and the kuverter of the allergic diners in `total`,
     * then a `figure` per allergen centring its compact `AllergyTypeDisplay` between the separator and its kuverter; the
     * site sets the type size on the line. `besideName` spaces an `AllergyTypeDisplay` from the diner's name before it.
     */
    allergyOverview: {
        line: 'flex flex-wrap items-center gap-x-1',
        total: 'inline-flex items-center gap-1 whitespace-nowrap font-semibold',
        figure: 'inline-flex items-center gap-1 whitespace-nowrap',
        glyph: 'size-4',
        besideName: 'ms-1'
    },

    /**
     * AllergyTypeDisplay: the `compact` face for table cells and diner lines, the regular face for the editor;
     * `named` weights a type's name, `none` mutes the no-allergy state
     */
    allergyTypeDisplay: {
        compactRoot: 'inline-flex items-center gap-1 md:gap-2',
        compactAvatar: `flex-shrink-0 ${BG.allergyAvatar} p-0.5`,
        compactName: 'text-xs md:text-sm whitespace-nowrap',
        root: 'flex items-center gap-2',
        avatar: `flex-shrink-0 ${BG.allergyAvatar} p-1`,
        name: 'text-sm md:text-base',
        named: 'font-medium',
        none: TEXT.muted,
        // The no-allergy sun: the disc carries its fill and ink as one pair, and the icon slot inherits the ink. The
        // disc stays white in the dark, where the palettes lighten gray-500 for dark surfaces; gray-800 stays dark
        noneAvatarUi: {root: `${BG.allergyAvatar} ${TEXT.gray[500]} dark:text-gray-800`, icon: 'text-inherit'}
    },

    /**
     * AllergenMultiSelector: the catalog beside the allergy panel from md, stacked below; `withSummaryBar` keeps the
     * last rows clear of the phone's fixed `summaryBar`. The panel binds `ALERTS.legend` with `panelIcon` on its
     * icon slot; its `panelBody` stacks the overview, the Hvem button and the `names`.
     */
    allergenSelector: {
        root: 'flex flex-col md:flex-row gap-4 md:gap-6',
        withSummaryBar: 'pb-16 md:pb-0',
        master: 'md:w-1/3',
        summaryBar: `md:hidden fixed bottom-4 inset-x-4 z-50 ${BG.panelNested} shadow-lg`,
        detail: 'flex-1 md:border-l md:pl-6',
        panelIcon: 'size-8',
        panelBody: 'flex flex-col items-start gap-2',
        names: TYPOGRAPHY.bodyTextSmall
    },

    /**
     * HouseholdAllergies: the full-bleed `card` on a phone, the `body` stack, the row toggle (pencil closed, a turned
     * chevron open), the collapsed row's `allergies` with each `allergy` and its `comment`, and the `editor` padding
     */
    householdAllergies: {
        card: {class: `${LAYOUTS.cardResponsive} border-t-0 md:border-t`, ui: {body: 'px-0 mb-0 md:px-4'}},
        body: 'space-y-2 md:space-y-4',
        rowToggle: (isOpen: boolean) => ({
            color: COLOR.neutral,
            variant: NOISE.quiet,
            square: true,
            icon: isOpen ? ICONS.chevronDown : ICONS.edit,
            ui: {leadingIcon: `text-sm md:text-base ${flipOpenTurn(isOpen)}`}
        }),
        allergies: 'flex flex-wrap gap-1 md:gap-2',
        allergy: 'flex items-center gap-1',
        comment: TYPOGRAPHY.finePrintMuted,
        editor: 'p-4'
    },

    /**
     * AllergyEditor: the `label` over the add `select` with its `item` rows, the `allSelected` line; the comments mode's
     * `commentCard` per type with the `commentType` and the `commentRow` (`commentInput` and the remove button); the
     * simple mode's `badges`, a `badge` with its `badgeBody` and `badgeRemove`
     */
    allergyEditor: {
        root: 'space-y-3',
        label: `block ${TYPOGRAPHY.bodyTextMedium}`,
        select: 'w-full',
        item: 'flex items-center gap-2',
        empty: TEXT.muted,
        allSelected: TYPOGRAPHY.finePrintMuted,
        commentList: 'space-y-2',
        commentCard: `flex flex-col md:flex-row md:items-center gap-2 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 ${BG.panelNested}`,
        commentType: 'flex items-center gap-2 md:flex-shrink-0',
        commentRow: 'flex items-center gap-2 flex-1',
        commentInput: 'flex-1',
        badges: 'flex flex-wrap gap-2',
        badge: 'pr-1',
        badgeBody: 'flex items-center gap-1',
        badgeRemove: 'ml-1'
    },

    /**
     * AllergyCatalogTable's cells: the centred checkbox, the icon in its red ring, the name, and the centred count
     * and new-badge columns (the table binds `COMPONENTS.table.catalogUi`)
     */
    allergyCatalog: {
        checkboxCell: 'flex items-center justify-center',
        iconCell: 'flex items-center justify-center p-1 rounded-lg transition-colors',
        iconRing: `flex items-center justify-center w-8 h-8 rounded-full ring-1 shrink-0 ${RING.red[700]}`,
        iconGlyph: 'text-base',
        nameCell: 'font-medium',
        centredCell: 'text-center'
    },

    /** AdminAllergies: the catalog card, its header with the title row and the poster action, the toolbar, and the docked and sticky detail panes */
    allergyCatalogPage: {
        card: 'w-full px-0',
        header: 'flex flex-col gap-4',
        titleRow: 'flex flex-col md:flex-row items-center justify-between gap-4',
        headerActions: 'flex items-center gap-2',
        toolbar: 'mb-4',
        createDock: 'mb-2',
        stickyDetail: 'flex justify-center items-start md:sticky md:top-4 self-start'
    },

    // The admin economy page (AdminEconomy): its sections, the admin's correction under a dinner, the invoice breakdown
    adminEconomy: {
        page: 'space-y-6',
        cardTitleRow: 'flex items-center gap-2',
        panel: 'p-4',
        periodPanel: 'p-4 space-y-4',
        nestedList: 'p-2 space-y-1',
        invoicePanel: 'p-2',
        correction: 'p-4 space-y-4 bg-success-50 dark:bg-success-900/20 border-b border-success-200 dark:border-success-800',
        correctionRow: 'flex items-center gap-4',
        householdSelect: 'w-80',
        totalRow: 'flex justify-end items-center gap-2',
        invoiceHeader: 'flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4',
        invoiceTitle: 'md:mr-8',
        statBoxes: 'flex flex-wrap gap-2',
        statBox: 'flex items-center gap-2 px-3 py-2',
        statText: 'text-center',
        statValue: 'font-semibold',
        periodFooter: 'flex justify-between items-center',
        periodFigures: 'flex items-center gap-4',
        controlSumValid: 'text-success-700 dark:text-success-400 flex items-center gap-1',
        controlSumInvalid: 'text-error-700 dark:text-error-400 flex items-center gap-1',
        loadingLine: 'flex items-center gap-2',
        loadingSpinner: MOTION_SPIN,
        invoiceFrame: 'rounded-lg overflow-hidden border',
        shareRow: 'flex items-center gap-2 border-t pt-4'
    },

    // The household's economy tab: the page and its card rows share adminEconomy's tokens; these are its own
    householdEconomy: {
        // The Kommende title over its period on a phone, beside it from md with the pipe between them
        titleStack: 'flex flex-col md:flex-row md:items-center md:gap-2',
        titlePipe: 'hidden md:inline',
        // An expanded row's card, inset under the row it opens from
        expandedCard: 'ml-2 md:ml-8 mr-2 md:mr-4 my-2',
        // The orders of an expanded dinner scroll inside their card
        orderList: 'space-y-2 max-h-64 md:max-h-96 overflow-y-auto'
    },

    // HelpButton: the help popover below the button, its card, and the feedback form that unfolds in the card's footer
    helpButton: {
        popoverContent: {side: 'bottom', align: 'start'},
        card: 'max-w-xs sm:max-w-sm mx-2',
        header: 'flex justify-between items-center gap-2',
        close: 'flex-shrink-0',
        content: 'text-pretty break-words',
        actions: 'flex flex-col gap-1 md:gap-2',
        feedbackForm: 'pt-2 md:pt-3 space-y-2 md:space-y-3',
        success: 'text-center py-3 md:py-4 space-y-3',
        issueLink: 'block mx-auto underline decoration-dashed underline-offset-4',
        feedbackTypesUi: {fieldset: 'flex flex-col md:flex-row gap-2 md:gap-4'},
        description: 'w-full',
        formButtons: 'gap-2 md:gap-3'
    },

    // The season form's ticket price editor (TicketPriceListEditor): the card that adds a price and the list of prices
    ticketPriceEditor: {
        addCard: 'mb-4',
        addTitle: 'text-sm font-semibold',
        addStack: 'flex flex-col gap-6 w-full',
        addRow: 'flex gap-4 w-full',
        addField: 'flex-1 min-w-0',
        descriptionField: 'w-full',
        typeSelectUi: {content: 'min-w-fit'},
        descriptionUi: {root: 'w-full'},
        addFooter: 'flex justify-end',
        list: 'mt-4 space-y-2',
        empty: 'text-md mx-auto'
    },

    // The allergy type card (AllergyTypeCard): its edit form, its compact catalog row and its full detail
    allergyTypeCard: {
        form: 'w-full max-w-2xl space-y-4',
        formTitle: 'text-md font-semibold',
        field: 'w-full',
        compact: 'flex items-center gap-3 p-3',
        compactGlyph: 'flex items-center justify-center w-10 h-10 rounded-full ring-1 md:ring-2 flex-shrink-0',
        compactIcon: 'text-xl',
        content: 'flex-1 min-w-0',
        titleRow: 'flex items-center gap-2',
        compactName: 'font-medium text-sm',
        full: 'space-y-4',
        header: 'flex items-start gap-4',
        fullGlyph: 'flex items-center justify-center w-16 h-16 rounded-full ring-1 md:ring-2 flex-shrink-0',
        fullIcon: 'text-3xl',
        fullName: 'text-lg font-semibold break-words',
        description: 'mt-1 break-words',
        inhabitantSection: 'space-y-3',
        inhabitantList: 'space-y-3',
        inhabitant: 'space-y-2',
        badges: 'flex items-center gap-1',
        details: 'pl-14 space-y-1',
        comment: 'italic'
    },

    // The allergy catalog's detail panel (AllergyDetailPanel): its delete confirm, its detail face and its no-selection prompt
    allergyDetailPanel: {
        face: 'w-full max-w-2xl space-y-4',
        consequences: 'mt-2 space-y-1',
        consequence: 'flex items-center gap-2',
        consequenceIcon: 'mr-1',
        header: 'flex flex-wrap items-center justify-between gap-2',
        actions: 'flex items-center gap-2',
        noSelection: 'flex flex-col items-center justify-center py-12',
        noSelectionIcon: 'w-8 h-8 mb-2'
    },

    // Responsive row icon sizing (matches birthday cake pattern)
    rowIconClass: 'size-4 md:size-6',

    /**
     * Inhabitant avatars (`UserListItem`): the server renders before the breakpoint is known, so `size` is one
     * value everywhere and `fit` steps the avatar up a size from md. A group's default face count is the responsive
     * `SIZES.avatarMax`; the compact household list item (`listItemMax`) and the power rows (`powerRowMax`) show three everywhere.
     * `fit` goes on each `UAvatar`; a `UAvatarGroup` binds the size's `group` (`avatarFace`).
     */
    avatar: {
        // The compact household list item shows three faces before the overflow count
        listItemMax: 3,
        // A power row (the household preferences, the booking form) shows three faces before the overflow count, so its table fits a phone
        powerRowMax: 3,
        regular: avatarFace('md', 'md:size-9 md:text-lg'),
        compact: avatarFace('sm', 'md:size-8 md:text-base')
    },

    /**
     * UserListItem: the `group` stack and its `groupRow` of faces beside the names or the count, the `single` row and
     * its `nameStack`, a face's profile `link` (`singleLink` keeps the single face from shrinking), the regular `name`,
     * and a face's `ring` from md in the caller's colour. The group shrinks with the grid or flex cell that holds it and
     * its row wraps the names under the faces, so a long list never widens the page.
     */
    userListItem: {
        group: 'flex flex-col gap-1 min-w-0',
        groupRow: 'flex flex-wrap items-center gap-2',
        link: 'hover:scale-110 hover:rotate-3 transition-transform duration-200 inline-block',
        singleLink: 'hover:scale-110 hover:rotate-3 transition-transform duration-200 inline-block flex-shrink-0',
        single: 'flex items-start gap-3',
        nameStack: 'flex flex-col gap-1',
        name: 'font-semibold',
        ring: (color: string) => `md:ring-2 md:ring-${color}`
    },

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

    /**
     * The circular team chip beside the team-name input: w-fit pins the circle to its
     * content, where a flex column's cross-axis stretch would pull it into a full-width pill
     */
    teamChip: 'rounded-full p-2 md:p-3 w-fit',

    /**
     * The detail mounts of a master-detail page: the framed pane beside the master table,
     * the framed dock under the tapped row, and the dock's header bar, which stays pinned
     * under the sticky admin tab bar while the dock's body scrolls.
     */
    masterDetail: {
        pane: 'border rounded-lg p-4',
        dock: `border rounded-lg p-2 ${BG.panel}`,
        dockHeader: `sticky top-24 z-10 py-2 ${BG.panel}`,
        // A td sizes to its content's minimum width: zero width takes the dock out of that
        // equation and min-w-full stretches it back to the cell, so a wide detail can never
        // widen the master table
        dockClamp: 'w-0 min-w-full',
        // Wide detail content scrolls inside its own box; the dock header above it stays
        // outside the scroll container, so its stickiness keeps tracking the page
        dockBody: 'overflow-x-auto',
        // The master table has no fixed widths: the primary column takes the row's slack, so a
        // wrapping cell beside a compact one keeps its line instead of ceding the spare width
        primaryColumn: {th: 'w-full', td: 'w-full'},
        // w-px shrinks the column to its content; nowrap overrides the table cell wrap
        compactColumn: {th: 'w-px whitespace-nowrap', td: 'w-px whitespace-nowrap'}
    },

    /**
     * Team tabs: a `UTabs` whose triggers render `CookingTeamBadges`. The strip is a pure
     * selector - the selected team renders outside the tabs, and `content: false` keeps the
     * empty panels from squeezing a vertical list to a fraction of its box. Triggers never
     * shrink below their label, so a horizontal row with more tabs than fit scrolls sideways
     * instead of squeezing the names. The link variant's selection bar sits 1px outside the
     * list's border-box, which a scroll container clips - so the scroll applies on the
     * horizontal face only, where the bar moves onto the border line; the vertical side bar
     * stays untouched.
     */
    teamTabs: {
        variant: 'link' as const,
        content: false,
        ui: {
            list: 'data-[orientation=horizontal]:overflow-x-auto',
            trigger: 'shrink-0',
            indicator: 'in-data-[orientation=horizontal]:bottom-0'
        }
    },

    /** "Ikke dit hold" on a team the person is not on, the visiting tab and the visited team's card; its size is the responsive SIZES.small */
    visitBadge: {color: COLOR.neutral, variant: NOISE.subtle},

    /** MyTeamSelector tab body: the team icon above the badge on phone, beside it on desktop */
    myTeamSelector: {
        tab: 'flex flex-col items-center gap-1 md:flex-row md:gap-2',
        icon: 'shrink-0'
    },

    /** TeamCalendarDisplay days: a selectable day rings on hover, the selected dinner's day rings in primary */
    teamCalendar: {
        selectableDay: 'cursor-pointer hover:ring-2 hover:ring-offset-1',
        selectedDay: 'ring-2 ring-primary ring-offset-1',
        plainDay: 'text-sm'
    },

    /**
     * AdminTeams: the card, the header's season selector, the create face, and around `masterDetail` the dock's stack,
     * the detail header row, and the md pane and the overview calendar in the detail slot of `LAYOUTS.masterDetailPage`
     */
    adminTeams: {
        dockStack: 'space-y-2',
        detailHeaderRow: 'flex items-center justify-between gap-2',
        pane: 'space-y-4 self-start',
        overviewCalendar: 'w-full self-start',
        card: 'w-full px-0',
        seasonSelector: 'w-full md:w-auto',
        // The create face: the team count row over the preview grid (LAYOUTS.gridTwoCol), and its footer
        createFace: 'px-4 pb-4 space-y-4',
        countRow: 'flex items-center gap-4',
        countLabel: 'text-lg font-bold',
        previewTeam: 'p-4 border rounded',
        previewName: 'font-semibold',
        createFooter: 'flex gap-2',
        // The view and edit face around the master table and its detail
        viewFace: 'px-4 pb-4 space-y-6'
    },

    /** PageFooter: the centre row, and the footer's icon buttons inked like its text */
    pageFooter: {
        row: 'flex flex-col md:flex-row items-center justify-between gap-4 py-4',
        iconButtonUi: {leadingIcon: TYPOGRAPHY.footerText}
    },

    /** SeasonSelector: the select keeps room for the longest season name */
    seasonSelector: {select: 'min-w-48'},
    // The season status glyph beside a season name, the size of the text
    seasonStatus: {
        discUi: {base: 'size-3 rounded-full p-0 align-middle'},
        sproutUi: {base: 'p-0 align-middle', leadingIcon: 'size-4'}
    },

    /**
     * HouseholdListItem: the `compact` row of faces beside the name badges (wrapping the badges under the faces from md),
     * the wrapping `names`, and the card face's `inhabitants` stack, one `inhabitant` line each and the `empty` line
     */
    householdListItem: {
        compact: 'flex flex-col md:flex-row md:flex-wrap md:items-center gap-3',
        names: 'flex flex-wrap gap-1',
        inhabitants: 'space-y-2',
        inhabitant: 'flex items-center gap-2 p-2 rounded',
        empty: 'italic'
    },

    /**
     * HouseholdCard: the preferences card's title and stack, the row toggle (the power row's toggle plays while closed),
     * the name cell with the ticket under it on a phone, the expanded editor and its actions, the save icon, and the hint
     */
    householdCard: {
        title: TYPOGRAPHY.cardTitle,
        stack: 'space-y-2 md:space-y-4',
        powerToggleIdle: 'hover:animate-pulse hover:scale-125 hover:rotate-45 hover:text-warning active:scale-175 active:rotate-[720deg] active:text-error',
        ticketDesktop: 'hidden md:block',
        nameCell: 'flex flex-col gap-0.5',
        ticketPhone: 'md:hidden w-fit',
        editorField: 'py-2',
        editorStack: 'flex flex-col gap-3',
        actionsRow: 'flex justify-start md:justify-end',
        saveButton: 'group',
        saveIcon: 'transition-all duration-700',
        saveIconSaving: MOTION_SPIN,
        saveIconIdle: 'group-hover:animate-pulse group-hover:scale-125 group-hover:rotate-12 group-active:rotate-[360deg]',
        hintList: 'flex flex-col gap-1',
        hintLine: 'flex items-center gap-1',
        hintModes: 'flex flex-wrap items-center gap-1 mt-1',
        // One dinner mode in the hint: its glyph and its word wrap as one
        hintMode: 'inline-flex items-center gap-1',
        hintIcon: 'size-4'
    },

    /**
     * HouseholdSettings: the `root` stack, a `sectionTitle`, the household's `facts` (each `fact` a glyph, `factIcon`, and a
     * line), the move-out card's `cardHeader` and `cardBody` with the sun of a household without move-out plans
     * (`noPlansIcon`), the `sectionGap` under a section divider, the calendar `intro`, and the `feedBox` with its
     * `feedLabel` and `feedLink`
     */
    householdSettings: {
        root: 'space-y-6 px-2 md:px-0',
        sectionTitle: `${TYPOGRAPHY.cardTitle} mb-4`,
        facts: 'space-y-2',
        fact: 'flex items-center gap-2',
        factIcon: 'opacity-60',
        cardHeader: 'flex items-center justify-between',
        cardBody: 'space-y-4',
        sectionGap: 'pt-6',
        intro: `${TYPOGRAPHY.bodyTextMuted} mb-4`,
        feedBox: `mt-4 p-4 rounded ${BG.inset}`,
        feedLabel: `${TYPOGRAPHY.bodyTextMuted} mb-2`,
        feedLink: 'text-primary hover:underline text-sm',
        noPlansIcon: 'text-warning-700 dark:text-warning-400'
    },

    /**
     * The household page (`pages/household/[shortname]/[tab].vue`): the `card`, full-bleed on a phone, whose root clips
     * the residency ribbon; the `header` stack over the banners, the `title` row with its `titleIcon`, and the `tabs`
     * whose labels show from md
     */
    householdPage: {
        card: {class: `w-full px-0 ${LAYOUTS.cardResponsive}`, ui: {root: RIBBON_CONTAINER, body: 'px-0 py-2 md:px-4 md:py-6'}},
        header: 'flex flex-col gap-2',
        title: 'flex items-center gap-1 md:gap-2',
        titleIcon: 'text-2xl',
        tabs: {class: 'mt-1 mb-1 md:mt-0 md:mb-4', ui: {label: 'hidden md:inline'}}
    },

    /** HouseholdBookings: the booking panel's header row and title */
    householdBookings: {
        panelHeader: 'flex items-center justify-between mb-4',
        panelTitle: 'text-sm font-semibold'
    },

    /**
     * AdminSystem: the job cards (coloured header, icon, title, description, stats or skeletons) and the panels'
     * headers, the job history table
     */
    adminSystem: {
        root: 'space-y-6',
        header: 'flex items-center gap-3',
        jobCard: {ui: {root: 'h-full flex flex-col', body: 'flex-1 flex flex-col'}},
        jobHeader: 'rounded-t-lg -mx-4 -mt-4 px-4 py-6 md:py-8 flex flex-col items-center justify-center gap-2',
        jobIcon: 'text-5xl md:text-6xl opacity-80',
        jobIconRunning: MOTION_SPIN,
        jobTitle: `${TYPOGRAPHY.cardTitle} mb-2`,
        // A fixed height keeps the cards' footers level
        jobDescription: `${TYPOGRAPHY.bodyTextMuted} mb-4 min-h-[3rem]`,
        jobBody: 'flex-1',
        stats: 'space-y-1',
        stat: 'flex items-center gap-2',
        statIcon: `text-sm ${TEXT.success}`,
        skeletons: 'space-y-2',
        skeletonRow: 'flex items-center gap-2',
        skeletonDot: 'h-4 w-4 rounded-full',
        skeletonLong: 'h-4 w-32',
        skeletonShort: 'h-4 w-24',
        panelHeader: 'flex items-center gap-2',
        panelIcon: 'text-lg',
        panelTitle: 'font-semibold',
        historyTable: 'w-full',
        statusBadge: 'gap-1',
        statusIcon: 'text-xs'
    },

    /**
     * AdminHouseholds: the card and its header row, the padded sections above the table (the create form, the
     * search row), the household's link, the PBS cell with its residency badge, and the table's empty state
     */
    adminHouseholds: {
        card: 'w-full px-0',
        headerRow: 'flex items-center justify-between',
        section: 'px-6 py-3',
        shortNameLink: 'text-primary hover:underline font-medium',
        pbsCell: 'flex flex-col md:flex-row md:items-center gap-1 md:gap-2',
        empty: 'flex flex-col items-center justify-center py-6 gap-3',
        emptyIcon: 'w-8 h-8'
    },

    householdCreateForm: {
        // The households already at the chosen address, below the new household's fields
        prevOwners: 'flex flex-col gap-4 pt-2',
        // One household at the address: its name over its move-out field on a phone, beside it from md
        prevOwner: 'grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 md:items-center'
    },

    /**
     * AdminUsers: the card, its header and search row, the table with its loading bar, a user's role badges, and the
     * expanded row's detail in its `expandedPanel`: the expanded row spans every column, so where the table scrolls
     * sideways in its box the panel keeps to the part in view, sticky at the cell's inset and no wider than the box
     */
    adminUsers: {
        card: 'w-full px-0',
        header: 'px-6',
        toolbar: 'px-6 py-3',
        table: 'w-full',
        loadingBar: {loadingColor: COLOR.secondary, loadingAnimation: 'carousel' as const},
        roles: 'flex gap-1 flex-wrap',
        roleIcon: 'mr-1',
        detail: 'p-4',
        // The inset follows the cell padding of `table.adminUsersUi.td` (px-2 md:px-4); the cap, the box less that padding, binds on a phone
        expandedPanel: 'sticky left-2 md:left-4 max-w-[calc(100cqw-1rem)] overflow-x-auto'
    },

    userProfileCard: {
        // The header: the user over the action buttons on a phone, beside them from md
        header: 'flex flex-col md:flex-row md:items-start md:justify-between gap-4',
        // The role badges under the name and in the role section's view face
        roleBadges: 'flex flex-wrap gap-2',
        // The action buttons: they wrap on a phone, one row at the header's end from md
        actions: 'flex flex-wrap items-center gap-2 md:gap-4 md:flex-nowrap md:shrink-0 md:ml-auto',
        // The household link in the contact lines
        householdLink: 'underline hover:no-underline hover:text-primary transition-colors',
        // The role section's title row with its edit, save and cancel buttons
        rolesHeader: 'flex items-center justify-between mb-3',
        // The role section's edit face: the toggle rows over the note
        roleToggles: 'space-y-3',
        // A toggle row: the role's icon and label, its switch at the end
        roleToggle: 'flex items-center justify-between',
        // The role's icon and label in a toggle row
        roleLabel: 'flex items-center gap-2',
        // The icon and label of a role Heynabo owns, whose switch is disabled
        roleDisabled: 'opacity-40',
        // The note's list under the toggles
        roleNotes: 'list-disc list-inside space-y-1 mt-1'
    },

    /** InhabitantSelector: the stack of search row and table, the name cell, and the table's empty state */
    inhabitantSelector: {
        root: 'space-y-3',
        table: 'flex-1',
        nameRow: 'flex items-center gap-3',
        name: 'font-medium',
        empty: 'flex flex-col items-center justify-center py-6 gap-3',
        emptyIcon: 'w-8 h-8'
    },

    /** /dinner with no season: the empty state's frame */
    dinnerPage: {emptyFrame: `p-4 md:p-8 ${BACKGROUNDS.card}`},

    /** /chef master header: the team selector above the team's role status */
    chefTeamStatus: 'space-y-1 md:space-y-4',

    /**
     * `UCollapsible` - the panel a separate toggle opens and closes; the toggle binds `BUTTONS.flipOpen(isOpen)`.
     * The trigger stays outside the collapsible, so the panel's header may hold its own controls.
     */
    collapsible: {
        // The row that holds the title and the chevron (the Budget pane, Se billetændringer)
        headerRow: COLLAPSIBLE_HEADER_ROW,
        // A panel that opens below the button that toggles it (ChefMenuCard danger zone, RoleAssignment form)
        belowTrigger: {class: 'mt-3'},
        // The chef calendar's agenda or calendar below its header row, taking the column's remaining height
        chefCalendar: {class: 'flex-1'}
    },

    /**
     * ChefCalendarDisplay: the column under the countdown, the `header` row with the view tabs left and the
     * collapse chevron right, the agenda table's header row and empty state, and the calendar view
     */
    chefCalendar: {
        root: 'flex flex-col h-full',
        header: COLLAPSIBLE_HEADER_ROW,
        viewTabs: {variant: NOISE.link, orientation: 'horizontal' as const},
        agenda: 'flex-1 flex flex-col overflow-x-hidden',
        agendaHeader: 'flex items-center justify-between w-full',
        empty: 'flex flex-col items-center justify-center py-6 gap-3',
        emptyIcon: 'w-8 h-8',
        calendar: 'flex-1',
        plainDay: 'text-sm'
    },

    /**
     * DinnerCalendarDisplay: the column under the countdown, the `accordion` that folds the calendar with its
     * `leading` title row, the `calendar` body, a day without a dinner (`plainDay`), and the lock chip that carries
     * the waiting-list hourglass (`queueChip`)
     */
    dinnerCalendar: {
        root: 'flex flex-col h-full',
        accordion: 'flex-1',
        leading: 'flex items-center gap-2',
        calendar: 'flex-1',
        plainDay: 'text-sm',
        queueChip: QUEUE_LOCK_CHIP
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

    /**
     * DinnerTicket: the card `face` per order state (the ticket fill and its accent edge left and right), the
     * `watermark` layer and its `watermarkIcon`, the `content` stack, and row 1 in three slots: the `special` slot of
     * three fixed `cell`s (state | guest | allergy) whose state glyph takes the state colour (`stateIcon`) and whose
     * guest and allergy glyphs take the type badge's colour (`infoIcon`), the type `badge`, and `modeSlot` (how you
     * eat, right-aligned); `subRow` starts row 2 under the badge with its `provenance` line or a ticket price's `note`. A queued
     * ticket's edge takes the waiting list's colour (`ORDER_STATE_COLORS.queued`); its glyph (`stateIcon.queued`) takes the toned ink.
     * An expected booking (no order yet) is no ticket state: its `face.expected` and `stateIcon.expected` sit beside the
     * queued ones, on the same neutral edge and toned ink. A ticket on a cancelled dinner wears `face.cancelled` whatever
     * its state: the past calendar day's colours without an edge, struck through
     */
    ticket: {
        // The edge is the Nuxt UI slot utility of `ORDER_STATE_COLORS[state]`, spelled out for the Tailwind scanner
        face: {
            ...({
                normal: `${TICKET_FACE} border-primary`,
                released: `${TICKET_FACE} border-error`,
                claimed: `${TICKET_FACE} border-info`,
                queued: `${TICKET_FACE} border-neutral`
            } satisfies Record<TicketState, string>),
            expected: `${TICKET_FACE} border-neutral`,
            // No edge: the past day's fill stays light in the dark, where no edge holds 3:1 against it and the dark page
            // alike; the transparent edge keeps the frame, so the fill runs to the card's border
            cancelled: `${TICKET_FRAME} ${PAST_DAY_COLORS} border-transparent ${CANCELLED_STRIKE}`
        },
        watermark: 'absolute inset-0 flex items-center justify-center pointer-events-none',
        watermarkIcon: `w-full h-[140%] opacity-[0.12] ${TEXT.dimmed}`,
        content: 'relative z-10 space-y-1',
        row: 'flex items-center gap-2',
        special: 'flex items-center gap-1 flex-shrink-0',
        // 20px, the badge's height; an empty cell keeps the width so the badges share one left edge
        cell: 'size-5 flex-shrink-0 flex items-center justify-center',
        stateIcon: {
            ...({
                released: `size-5 ${TEXT.error}`,
                claimed: 'size-5 text-info',
                queued: `size-5 ${TEXT.toned}`
            } satisfies Record<Exclude<TicketState, 'normal'>, string>),
            expected: `size-5 ${TEXT.toned}`
        },
        // Keyed by the ticket type colours (TICKET_TYPE_COLORS)
        infoIcon: {
            [COLOR.primary]: 'size-5 text-primary-800 dark:text-primary-300',
            [COLOR.success]: `size-5 ${TEXT.success}`,
            [COLOR.neutral]: 'size-5 text-neutral-700 dark:text-neutral-400'
        } satisfies Record<TicketTypeColor, string>,
        badge: 'uppercase whitespace-nowrap',
        modeSlot: 'ms-auto flex items-center',
        // The special slot (three 20px cells, two gap-1) and the row's gap-2: 4.75rem
        subRow: 'flex items-center gap-2 pl-19',
        provenance: `${TYPOGRAPHY.finePrint} ${TEXT.gray[500]}`,
        note: `${TYPOGRAPHY.finePrint} ${TEXT.gray[500]}`
    },

    /**
     * DeadlineBadge: the badge above its help text (`root`), the help text in fine print (`helpText`)
     */
    deadlineBadge: {
        root: 'flex flex-col items-start',
        helpText: `${TYPOGRAPHY.finePrint} ${TEXT.muted} mt-0.5`
    },

    /**
     * DinnerBookingForm: the ticket under the name on a phone (`ticketPhone`) and in its own column from md
     * (`ticketDesktop`), `guestProvenance` under a guest order's booker, the `guestOf` row with its `guestOfLabel`, and
     * the expanded row's `allergyLine` (`ICONS.allergy`, then the allergy types)
     */
    bookingForm: {
        ticketPhone: 'mt-2 md:hidden',
        ticketDesktop: 'hidden md:block',
        // Indent = the guestOf disc (avatar.compact: sm, size-7, md:size-8) plus guestOf's gap-3, so a guest's badge starts under "Gæst af"
        guestProvenance: 'flex flex-wrap items-center gap-1 mt-1 ml-10 md:ml-11',
        // A guest order's name cell: the add-guest row's disc, label and gap, so both rows share their x
        guestOf: 'flex items-center gap-3',
        guestOfLabel: `${TYPOGRAPHY.bodyTextMedium} uppercase`,
        allergyLine: 'flex flex-wrap items-center gap-2',
        root: 'space-y-4',
        // Deadline badges left (stacked on a phone), the day bill right
        statusRow: 'flex justify-between items-start gap-4 md:gap-8',
        deadlineBadges: 'flex flex-col md:flex-row gap-2 md:gap-8',
        dayBill: 'border-b-2 border-default px-2 pb-1',
        releasedAlerts: 'space-y-2',
        // The power row's toggle pulses while closed; the toggle turns through `COMPONENTS.openTurn`
        powerToggleIdle: 'hover:animate-pulse hover:text-warning',
        nameCell: 'py-1',
        powerName: 'flex flex-col gap-0.5',
        // The expanded row's edit card: wide content scrolls inside it
        editCard: {class: 'max-w-full overflow-x-auto', ui: {body: 'p-4 flex flex-col gap-4', footer: 'p-4', header: 'p-4'}},
        editTitle: 'text-md font-semibold text-balance',
        editDeadlines: 'flex flex-col md:flex-row md:justify-between gap-2',
        history: 'mt-2',
        editFooter: 'flex flex-col gap-2',
        legend: 'mt-4'
    },

    // Table interactions - row selection and click patterns
    table: {
        selectedRow: 'bg-secondary-100 dark:bg-secondary-900',
        clickableCell: 'cursor-pointer',
        selectedCell: 'bg-secondary-50 dark:bg-secondary-950',
        /** An amount column: header and cells right-aligned (a column's `meta`) */
        amountColumn: {class: {th: 'text-right', td: 'text-right'}},
        /** The total row a table adds in its body-bottom slot */
        totalRow: `border-t ${TYPOGRAPHY.bodyTextMedium}`,
        /** The cells of a sum row in the body-bottom slot: a label cell, and an amount cell aligned with the amount column */
        sumCell: TABLE_CELL,
        sumAmountCell: `${TABLE_CELL} text-right`,
        /** The arrow before the name of the dinner on view */
        currentMarker: 'inline-block size-4 mr-1 align-middle',
        /** A receipt sub-row under a dinner: indented, in the muted ink */
        receiptLabel: `pl-4 ${TEXT.muted}`,
        /** A spacer row between two groups of bottom rows */
        spacerCell: 'h-3',
        /** The row a table fills its `#loading` slot with while its data is on the way; UTable renders `#empty` without it */
        loadingRow: `flex items-center justify-center gap-2 py-2 ${TYPOGRAPHY.finePrintMuted}`,
        /** The sync glyph of the loading row, spinning */
        loadingSpinner: MOTION_SPIN,
        /**
         * THE table cell styling (ADR-018): every UTable binds one of these three
         * (`designSystemUsage.unit.spec.ts` rejects a table without).
         * Cells wrap between words on every viewport (Nuxt UI's theme cell is `whitespace-nowrap`); a word stays whole.
         * A data table wider than a phone scrolls inside its own box, the page never does (MobileViewport.e2e).
         */
        ui: TABLE_UI,
        /** The users table: `ui`'s cells; on a phone the scroll box is the size container `adminUsers.expandedPanel` measures its width against */
        adminUsersUi: {...TABLE_UI, root: '@container md:@container-normal'},
        /** A history table (Billetændringer): `ui`'s padding, every row on one line, so on a phone the table scrolls sideways */
        historyUi: {th: 'px-2 md:px-4', td: `${TABLE_CELL_PADDING} whitespace-nowrap`},
        /** A cell a row's spanning cell covers (a column's `meta.class.td`): out of the row's layout */
        spannedCell: 'hidden',
        /** The household allergies: the dense cells, an expanded inhabitant row tinted */
        householdAllergiesUi: {...TABLE_DENSE_UI, tr: BG.expandedRow},
        /** The booking form: the dense cells, the power row first in the warning tint, an expanded row tinted */
        bookingUi: {...TABLE_DENSE_UI, tbody: '[&_tr:first-child]:bg-warning/10', tr: BG.expandedRow},
        /** The household preferences: the dense cells, the power row first in the info tint, an expanded row tinted */
        householdPreferencesUi: {...TABLE_DENSE_UI, tbody: '[&_tr:first-child]:bg-info/10', tr: BG.expandedRow},
        /** The chef agenda: one full-width card column in a fixed layout, no header rule */
        agendaUi: {th: 'border-b-0', td: 'py-1 md:py-2 max-w-0 w-full', base: 'table-fixed w-full'},
        /** The allergy catalog in its narrow master column: tighter horizontal cell padding */
        catalogUi: {th: 'px-1', td: `px-1 py-1 md:px-1 md:py-2 ${TABLE_CELL_WRAP}`},
        /** The booking grid: centred day cells, a sticky footer, the power row first in the warning tint, an expanded row tinted */
        gridUi: {
            // On a phone the scroll box is the size container `bookingGrid.expandedPanel` and `actionPanel` measure their width against
            root: '@container md:@container-normal',
            th: 'px-1 py-1 md:px-2 md:py-2 text-center',
            td: `px-1 py-1 md:px-2 text-center ${TABLE_CELL_WRAP}`,
            tfoot: 'sticky bottom-0 bg-default px-1 py-1 md:px-2 text-center text-xs',
            tbody: '[&_tr:first-child]:bg-warning/10',
            tr: BG.expandedRow
        }
    },

    /**
     * BookingGridView: the `root` column, the `nav` bar with its two `navSide`s (the right one ends in the edit
     * pencil), the residency `alert`, the `dayContent` slot; a day column's `eventHeader` with its `chipSlot` and
     * `lockChip`, muted while the dinner is out of reach (`eventHeaderDisabled`), and `weekBoundary` on the first
     * dinner of a week; the name cells (`powerName`, `inhabitantName`, `guestName` with `guestIcon`, `guestLabel`,
     * `guestUnknown`, `guestAddName` with `guestAddLabel`) and the count badges' `countIcon`; the guest-add
     * button, turning through `COMPONENTS.openTurn` while its form is open, and the form's `expandedPanel`: the expanded
     * row spans every column, so where the table scrolls sideways in its box the panel keeps to the part in view, sticky at
     * the cell's inset and no wider than the box; the footer `summary` with its `summaryPrice`, the
     * edit footer's `actionCell` and its `actionPanel`, kept to the box in view as the form's panel is, with its
     * `actionStack`, and the `legend` gap. A cell without an order shows the booking the
     * preferences give it as `expectedBadge`: the mode ghosted on the waiting list's neutral (`ORDER_STATE_COLORS.queued`),
     * outlined, its glyph and label in the muted ink, as the waiting list's ghost (`COMPONENTS.waitlist.ghostBadge`) shows
     * a wish; the day form's ticket binds it too
     */
    bookingGrid: {
        root: 'flex flex-col',
        nav: 'flex items-center px-2 py-2 border-b border-default',
        navSide: 'flex-1',
        navEnd: 'flex-1 flex justify-end',
        alert: 'mx-2 mt-2',
        // On a phone the household card body has no side padding: the slot carries a card body's, so the day form's table keeps its width and scrolls in its box
        dayContent: 'pt-2 px-4 md:pt-4 md:px-0',
        eventHeader: 'flex flex-col items-center',
        eventHeaderDisabled: TEXT.muted,
        chipSlot: 'h-6 flex items-center justify-center',
        // Inset: Nuxt UI shifts a chip that is not inset by half its size toward its corner, standalone too; inset it centres in `chipSlot`
        lockChip: {size: '3xl', standalone: true, inset: true},
        weekBoundary: 'border-l-2 border-primary',
        powerName: 'flex items-center gap-2',
        inhabitantName: 'flex items-center gap-1',
        countIcon: 'size-3',
        guestName: 'flex items-center gap-2',
        guestIcon: 'size-4 text-info flex-shrink-0',
        guestLabel: `${TYPOGRAPHY.bodyTextSmall} ${TEXT.muted}`,
        guestUnknown: TYPOGRAPHY.bodyTextSmall,
        guestAddName: 'flex items-center gap-1',
        // The inset follows the cell padding of `table.gridUi.td` (px-1 md:px-2); the cap, the box less that padding, binds on a phone
        expandedPanel: 'sticky left-1 md:left-2 max-w-[calc(100cqw-0.5rem)] overflow-x-auto',
        guestAddLabel: `${TYPOGRAPHY.bodyText} ${TEXT.muted}`,
        summary: 'flex flex-col items-center',
        summaryPrice: TEXT.muted,
        actionCell: 'px-2 py-2 border-t border-default',
        // As `expandedPanel`, kept to the box in view; the inset and the cap follow `actionCell`'s own padding (px-2 at every width)
        actionPanel: 'sticky left-2 max-w-[calc(100cqw-1rem)] overflow-x-auto',
        actionStack: 'flex flex-col gap-2',
        legend: 'mt-4',
        expectedBadge: {color: ORDER_STATE_COLORS.queued, variant: NOISE.medium, ink: TEXT.muted}
    },

    /** ActionPreview: the `list` of preview lines under the title, each `item` a badge with its `icon` */
    actionPreview: {
        list: 'mt-2 space-y-1',
        item: 'flex items-center gap-2',
        icon: 'mr-1'
    },

    /** A booking result's `lines`, one per person, in a toast's description and in the "Sidste ændring" alerts */
    bookingResult: {
        lines: 'whitespace-pre-line'
    },

    /**
     * GuestBookingForm: the info `card` (soft, its body a stack), the `header` row with its `headerIcon` and `title`,
     * the `deadlines` row, the two `columns` (ticket | allergies) with the left `fieldStack`, a ticket type `option`
     * in the select (`optionBadge`, `optionNote`), the `footer` stack, the `errors` block and an `error` line with its `errorIcon`
     */
    guestBookingForm: {
        card: {variant: NOISE.soft, ui: {body: 'p-4 flex flex-col gap-4', footer: 'p-4'}},
        header: 'flex items-center gap-2',
        headerIcon: 'size-5 text-info',
        title: 'text-md font-semibold',
        deadlines: 'flex flex-col md:flex-row md:justify-between gap-2',
        columns: LAYOUTS.gridTwoCol,
        fieldStack: 'flex flex-col gap-4',
        select: 'w-full',
        option: 'flex flex-col gap-0.5',
        optionBadge: 'uppercase w-fit',
        optionNote: TYPOGRAPHY.finePrintMuted,
        footer: 'flex flex-col gap-2',
        errors: `text-sm ${TEXT.error}`,
        error: 'flex items-center gap-1',
        errorIcon: 'size-4'
    },

    /**
     * The waiting list on the booking surfaces: the wished mode reads as a ghost of a booking (`ghostBadge`, no
     * fill, in the muted `ghostInk`), bound by DinnerModeSelector's view face on the ticket card, the booking form
     * and the grid; a queued grid cell and its legend sample carry the hourglass in a corner `chip` (`chipIcon`)
     */
    waitlist: {
        ghostBadge: {color: ORDER_STATE_COLORS.queued, variant: NOISE.medium},
        ghostInk: TEXT.muted,
        chip: {color: ORDER_STATE_COLORS.queued, size: '3xl', position: 'top-right'},
        chipIcon: 'size-3'
    },

    /**
     * DinnerModeSelector: the weekday title's `weekdayLabel`, the view and edit faces' `stack` (the badge or the
     * button group over its label), the edit face's `fieldGroup` and each mode's square `segment` on a phone, the
     * grid's unsaved-cell accent (`modified`), the DINEIN button's `pulse` while a household disagrees, and the
     * glyph size per Nuxt UI size (`iconSize`); without a size the glyph follows `WEEKDAY.badgeContentSize`. The edit
     * faces' buttons carry that size in their leading icon slot (`buttonUi`). On a plan (an expected booking, no
     * order yet) no button is selected: the plan's mode carries `plannedButton`, outlined on the expected booking's neutral.
     * On a cancelled dinner the view face's badge wears `cancelledFace`, the cancelled ticket's colours struck through; its
     * class outranks the colour and variant, which only keep the badge without a ring
     */
    dinnerModeSelector: {
        weekdayLabel: `flex items-center justify-center ${TYPOGRAPHY.caption} ${TEXT.ink}`,
        stack: 'flex flex-col items-center gap-0.5',
        fieldGroup: 'p-0 md:p-1.5 rounded-none md:rounded-lg border border-default bg-default gap-0 md:gap-1',
        // The view badge sits in its own wrapper, where the field group's corner rules never reach it, so both faces carry the corners
        segment: 'rounded-none md:rounded-md',
        modified: 'border-l-2 border-warning pl-0.5',
        pulse: 'animate-pulse',
        iconSize: {xs: 'size-3', sm: 'size-3', md: 'size-4', lg: 'size-5', xl: 'size-6'},
        buttonUi: (iconSize: string) => ({leadingIcon: iconSize}),
        plannedButton: {color: ORDER_STATE_COLORS.queued, variant: NOISE.medium},
        cancelledFace: {color: COLOR.neutral, variant: NOISE.soft, class: `${PAST_DAY_COLORS} ${CANCELLED_STRIKE}`}
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


    // The app icon in a home-screen frame (InstallPrompt): ~48px, rounded, shadowed, a double press-pulse;
    // reduced-motion users get the static icon
    installIcon: 'size-12 shrink-0 rounded-2xl shadow-md animate-tap-pulse motion-reduce:animate-none',

    // A framed summary: an icon beside a bold count over its label; the frame measures at the 3:1 edge rung
    statBox: {
        box: `flex items-center gap-2 px-3 py-2 w-fit rounded-md border ${BORDER.gray[500]}`,
        icon: 'text-xl text-primary'
    },

    // The typed date field (UInputDate) renders the house mask dd/MM/yyyy: en-GB gives the
    // day-month-year segment order and the "/" literals; the UApp locale (da) keeps the
    // calendars and built-in texts Danish. Content-width segments keep the field compact.
    dateField: {
        locale: 'en-GB',
        ui: {
            // align-top: the field is inline-flex, which otherwise baseline-shifts against siblings;
            // the end padding holds the trailing calendar button (~w-9) plus air after the year segment
            base: 'gap-0.5 align-top pe-12',
            segment: 'data-[segment=day]:w-auto data-[segment=month]:w-auto data-[segment=year]:w-auto'
        }
    },

    // The period field (CalendarDateRangePicker): its padded form field, and the read-only face's input,
    // as wide as the range text and never narrower than the field
    dateRangeField: {
        field: 'p-2',
        viewUi: {base: 'w-fit min-w-full'}
    },

    // Shared UCalendar root: Monday-first, no padding weeks, and other-month days both disabled
    // (reka data-outside-view) and hidden, so a day number never appears twice across
    // neighbouring month grids. Spread with v-bind at every UCalendar call site.
    // weekdayFormat narrow + the UApp da locale render the single-letter headers M T O T F L S.
    calendarGrid: {
        weekStartsOn: 1,
        fixedWeeks: false,
        weekdayFormat: 'narrow',
        disableDaysOutsideCurrentView: true,
        ui: {
            cellTrigger: 'data-[outside-view]:hidden',
            // The head letters are body-size text: their ink measures at the 4.5:1 rung
            headCell: `text-sm uppercase ${TEXT.toned}`
        }
    },

    // An ALERTS.legend panel (CalendarLegend, DinnerModeLegend's rows in its slot) is one `list`, one entry per row:
    // the sample in a fixed-width column (`sample`) beside its name (`entry`), so every name starts on one vertical
    // line; a team badge sample is the calendar's size
    legend: {
        list: 'flex flex-col gap-2',
        entry: 'flex items-center gap-2',
        // Holds the widest sample in a panel: the expected booking's sliders beside its mode badge, wider than a day
        // circle with its chip
        sample: 'w-14 shrink-0 flex items-center gap-2',
        badge: 'w-8 h-8 flex items-center justify-center shrink-0',
        // A chip sample with a glyph mirrors the dinner calendar's waiting-list lock chip
        iconChip: QUEUE_LOCK_CHIP,
        // The operating hint under the entries, in the design system's muted text (AA on every surface)
        hint: `mt-2 ${TEXT.muted}`
    },

    // Economy table hierarchy - ready-to-grab classes for each nesting level
    // Used by AdminEconomy and HouseholdEconomy for consistent stat headers
    economyTable: {
        // The table's frame: the date search and the sort above the table, the pagination beside them
        frame: {
            stack: 'space-y-2',
            toolbar: 'flex justify-between items-center gap-2',
            search: 'flex items-center gap-1',
            searchInput: 'w-28 md:w-36'
        },
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
        container: RIBBON_CONTAINER,
        colors: {
            cancel: 'bg-red-600',
            past: BG.gray[500],
            new: BG.green[600]
        }
    },

    // CostLine - line item in economy views with fixed column widths for vertical alignment
    costLine: {
        stack: 'space-y-1',
        row: 'grid items-center justify-items-center gap-1 md:gap-2 max-w-2xl',
        columns: 'grid-cols-[1.5rem_6rem_3rem_1.5rem_3rem_5rem_auto] md:grid-cols-[1.5rem_8rem_3.5rem_1.5rem_4rem_5.5rem_auto]',
        nameSlot: 'truncate justify-self-start',
        amountSlot: 'justify-self-end',
        // The order history unfolds indented under its line
        history: 'pl-6 md:pl-8 pt-1'
    },

    /** An order's history timeline (OrderHistoryDisplay): the line it shows while the history loads, its glyph spinning */
    orderHistory: {
        loadingLine: 'flex items-center gap-2 py-2',
        loadingSpinner: MOTION_SPIN
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
        heading: `text-xs font-bold uppercase tracking-wide ${TEXT.error} flex items-center gap-1.5`
    },

    /**
     * The team card's role groups (CookingTeamCard). Every face starts with the glyph column, 1rem
     * wide as the glyph itself, so the glyphs share one axis; the heading is a subgrid row of its
     * group, so the label, the list and the empty line start on the column after it. The monitor
     * face adds an auto label column, so every avatar list starts on one line across the groups.
     */
    roleBox: {
        box: 'grid grid-cols-[1rem_minmax(0,1fr)] gap-x-3 gap-y-2',
        heading: `col-span-2 grid grid-cols-subgrid items-center ${TYPOGRAPHY.caption} ${TEXT.toned}`,
        glyph: 'size-4',
        list: `col-start-2 flex flex-col gap-2 p-3 ${BG.inset}`,
        row: 'flex items-center gap-2 flex-wrap',
        // A member row's cells (avatar, name, allocation, weekdays, slet) share the list's columns, so every column starts on one line
        memberList: `col-start-2 grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] gap-2 p-3 ${BG.inset}`,
        memberRow: 'col-span-full grid grid-cols-subgrid items-center justify-items-start *:min-w-0 *:max-w-full',
        empty: `col-start-2 ${TYPOGRAPHY.bodyTextPlaceholder} italic p-3`,
        monitorGrid: 'grid grid-cols-[1rem_auto_minmax(0,1fr)] gap-x-3 gap-y-3 md:gap-y-4 px-3 md:px-4',
        monitorRow: 'col-span-3 grid grid-cols-subgrid items-center'
    },

    /** The team card's inline forms (TeamMemberAddForm, JokerSlotForm): the field stack, and a select or input filling its field */
    teamForm: {
        stack: 'flex flex-col gap-3 py-2',
        control: 'w-full'
    },

    /** CookingTeamBadges: the badges on one wrapping row */
    teamBadgeRow: 'flex items-center gap-2 flex-wrap',

    /**
     * The team card's faces around the role boxes (CookingTeamCard): the monitor face and its badge
     * header, the stacked sections of the view and edit faces, the dashed edit header with the
     * team-name input, the two-column rows (members beside the finder, weekdays beside the calendar),
     * a member row's links, the finder's status column and expanded member form, and the joker add row under the
     * finder: the finder row's padding, the avatar-place glyph beside its label in the finder's name ink
     */
    teamCard: {
        monitor: 'py-4 md:py-6',
        monitorHeader: 'flex flex-wrap items-center gap-2 mb-3 md:mb-4 px-3 md:px-4',
        stack: 'space-y-4',
        viewHeader: 'p-4 border',
        editHeader: 'flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 py-2 px-0 md:px-4 border-y-2 md:border-2 border-dashed',
        editHeaderMain: 'flex flex-col md:flex-row md:items-center gap-3 flex-1',
        nameField: 'flex-1 min-w-fit',
        // The end padding holds the trailing pencil (ICONS.edit, bound at the site)
        nameInput: {class: 'w-1/2', ui: {base: 'pe-11', trailing: 'me-3'}},
        // The edit header's faces beside the team badges, wrapping the badges under the faces in a narrow header
        memberSummary: 'flex flex-wrap items-center gap-2 min-w-0',
        deleteButton: 'w-full md:w-auto',
        row: 'flex flex-col md:flex-row gap-2 md:gap-4',
        fullColumn: 'w-full space-y-4',
        halfColumn: 'w-full md:w-1/2 space-y-4',
        affinityColumn: 'w-full md:w-1/4',
        calendarColumn: 'w-full md:w-3/4',
        boxes: 'flex flex-col gap-4',
        memberLink: 'cursor-pointer',
        nameBadge: 'cursor-pointer hover:opacity-80 transition-opacity',
        allocationBadge: {color: COLOR.neutral, variant: NOISE.medium, class: 'w-fit'},
        freeBadge: {color: COLOR.success, variant: NOISE.medium},
        statusList: 'flex flex-col gap-1',
        statusEntry: 'flex flex-col gap-0.5',
        statusBadge: 'w-fit',
        memberForm: `p-4 ${BG.panel}`,
        jokerAddRow: 'flex items-center justify-between gap-3 px-2 py-1 md:px-4 md:py-2',
        jokerAddName: 'flex items-center gap-3',
        jokerAddLabel: `${TYPOGRAPHY.bodyTextMedium} ${TEXT.muted}`
    },

    /**
     * The chef portrait on the dinner hero (ChefMenuCard): a trigger holding the ringed avatar
     * under a tilted chef hat beside the name. A dinner without a chef adds the dashed poster
     * frame to the trigger and shows a question-mark avatar under WANTED lettering.
     */
    wantedPoster: {
        trigger: 'flex items-center gap-3 cursor-pointer',
        frame: `${BG.mocha[950]} border-2 border-dashed ${BORDER.amber[600]} rounded-lg p-3 -skew-x-1 w-fit`,
        portrait: 'relative',
        ring: `rounded-full ring-2 md:ring-4 ${RING.amber[500]}`,
        avatar: {class: BG.mocha[800], ui: {icon: TEXT.mocha[50]}},
        hat: 'absolute -top-5 md:-top-7 left-1/2 -translate-x-1/2 text-xl md:text-3xl -rotate-9 drop-shadow-md',
        // The hat's ink follows the ground under it: pale gold on the dark frame; deep gold on the page, cream in dark mode
        hatOnFrame: TEXT.mocha[200],
        hatOnPage: `${TEXT.mocha[600]} dark:${TEXT.mocha[50]}`,
        nameStack: 'flex flex-col',
        lettering: `font-serif text-lg md:text-xl font-bold ${TEXT.mocha[50]} tracking-widest uppercase`,
        role: `${TEXT.mocha[50]} text-sm opacity-75`
    },

    /** The dinner budget pane (DinnerBudget): the compact amount, the three boxes, and the sections of the unfolded details */
    dinnerBudget: {
        compact: `inline-flex items-center gap-1 ${TYPOGRAPHY.bodyTextSmall}`,
        compactAmount: 'font-medium',
        stack: 'space-y-3',
        boxes: 'grid grid-cols-1 md:grid-cols-3 gap-3',
        boxUi: {body: 'p-3'},
        box: 'text-center',
        // The glyph keeps its full ink; only the words are muted
        boxLabel: `flex items-center justify-center gap-1 ${TYPOGRAPHY.caption} mb-1`,
        boxLabelText: TEXT.muted,
        boxGlyph: 'size-4',
        // A fact under the figure the chef reads (the kuverter), louder than the unit words
        boxFact: TYPOGRAPHY.bodyTextSmall,
        boxAmountLarge: `${TYPOGRAPHY.cardTitle} font-bold text-xl ${TEXT.success}`,
        // The unit words under a figure, and the rate under the contribution
        boxUnit: TYPOGRAPHY.finePrintMuted,
        summaryDeduction: `${TYPOGRAPHY.bodyTextMedium} ${TEXT.muted}`,
        boxLine: `flex items-center justify-between gap-2 whitespace-nowrap ${TYPOGRAPHY.bodyTextSmall}`,
        section: 'border-t p-4 space-y-2'
    },

    /**
     * One amount in both units (VatAmount): the ex moms figure in the row's weight, the slash and the inkl. moms half
     * in fine print; a balance adds its sign, reads red below zero, and carries the check or the exclamation icon
     */
    vatAmount: {
        // Fixed columns for the ex figure, the inkl. half and the icon slot, so kr lines up down a column of amounts
        root: 'inline-grid grid-cols-[minmax(3.75rem,max-content)_minmax(4.5rem,max-content)_1rem] items-baseline gap-x-1 whitespace-nowrap tabular-nums',
        ex: 'text-right',
        incl: `${TYPOGRAPHY.finePrintMuted} text-right`,
        // The overdraft's ink, on the figure and on its icon
        over: TEXT.error,
        iconSlot: 'inline-flex justify-center self-center',
        icon: 'size-4',
        iconOk: TEXT.success,
        iconWaiting: TEXT.muted,
        unitHeader: TYPOGRAPHY.finePrintMuted
    },

    /**
     * The grocery lines behind a cost (ExpenseLines), open: the helping numbers one row each with the amount at the
     * right, the entry row, then one grid per line (date, bestiller, amount in both units, remove) so every amount
     * and every remove button share a column. Folded, the row binds cardSection
     */
    expenseLines: {
        form: 'space-y-1',
        formRow: 'flex flex-col md:flex-row md:items-start gap-2',
        amountField: 'w-full md:w-32',
        vatField: 'w-full md:w-36',
        noteField: 'w-full md:flex-1',
        control: 'w-full',
        alternative: TYPOGRAPHY.finePrintMuted,
        // A text cell (the bestiller, the note) wraps on a phone, where the amount columns leave it little room, and truncates beside them on a desktop
        textCell: `${TYPOGRAPHY.bodyTextSmall} break-words md:truncate`,
        empty: TEXT.muted
    },

    /**
     * Billetændringer (TicketChanges): a toggle row that opens the dinner's ticket changes, newest first, the stretch
     * from the menu deadline first and the rest behind one button
     */
    ticketChanges: {
        // The history glyph leads the title, in its ink and size
        title: 'inline-flex items-center gap-1',
        // A run of chips sits on the middle of the row's text line, beside the plain-text cells
        chips: 'inline-flex flex-wrap items-center gap-1 align-middle',
        // Husstand wraps inside a capped width, against the history's one-line cells, so an opened list never widens the table
        households: 'inline-block max-w-56 md:max-w-xs whitespace-normal',
        // The "+N" control after the first households: a link that reads in the line of names
        householdsToggle: {color: COLOR.primary, variant: NOISE.link, ui: {base: 'p-0'}},
        moreRow: 'flex justify-center py-2'
    },

    /** `USeparator` with a label: the moment line in a history (Framelding lukker · 09/04/2026 12:00) */
    separator: {
        moment: {class: 'py-2', ui: {label: TYPOGRAPHY.finePrintMuted}}
    },

    /**
     * A section of the chef card (Allergener, Madbestilling): one row with the glyph inside the title, the content
     * line and the edit button at the right; the editor it opens heads with its title and the footer buttons
     */
    cardSection: {
        row: 'flex flex-col md:flex-row md:items-center gap-2',
        label: `${TYPOGRAPHY.sectionSubheading} uppercase inline-flex items-center gap-1`,
        // The leading glyph takes the title's ink and its font size
        glyph: 'size-[1em]',
        line: `${TYPOGRAPHY.bodyTextSmall} md:flex-1`,
        editor: 'space-y-4',
        editorHead: 'flex flex-col gap-2 md:flex-row md:items-center',
        editorTitle: `${TYPOGRAPHY.sectionSubheading} md:flex-1`
    },

    /**
     * ChefMenuCard below the hero: the compact face (a calendar list row: date, title, badges, budget), the full card's
     * ring and hero header, the menu row with its title, the Flere panel above the danger zone, the stacked sections with
     * a rule above each, the chef row, the alerts under the menu row, and the menu and release forms' stack and fields
     */
    chefMenuCard: {
        compactUi: (selected: boolean) => ({
            root: `${CALENDAR.selection.card.base} ${selected ? CHEF_CALENDAR.selection : ''}`,
            body: 'p-3'
        }),
        compactRow: 'flex items-center gap-3',
        compactDate: 'text-sm font-semibold text-primary w-12 shrink-0',
        compactTitleColumn: 'flex-1 min-w-0',
        compactTitle: 'text-sm truncate font-medium',
        compactTitlePlaceholder: `text-sm truncate italic ${TEXT.muted}`,
        compactBadge: 'shrink-0',
        compactBudget: 'text-sm font-medium shrink-0',
        // The full card: the amber ring, the hero fill behind the header
        fullUi: {root: `${RING.amber[500]} relative overflow-hidden`, header: `p-0 ${BACKGROUNDS.hero.mocha}`},
        // The menu field's hint shows from md
        menuFieldUi: {hint: 'hidden md:block'},
        menuRow: 'flex flex-col md:flex-row md:items-center gap-2',
        menuTitle: 'text-lg font-medium md:flex-1',
        menuTitlePlaceholder: `text-lg font-medium md:flex-1 italic ${TEXT.muted}`,
        description: `${TYPOGRAPHY.bodyTextSmall} ${TEXT.menuBody} mt-1`,
        // The Flere trigger sits at the row's end on a phone
        moreTrigger: 'self-end md:self-auto',
        // The Flere panel: the release entry above the danger zone
        morePanel: 'space-y-3',
        dangerLead: 'font-semibold',
        chefRow: 'pt-4 mt-4 flex items-center gap-3 flex-wrap',
        // An alert under the menu row: the missing-title warning, the queue's call to release portions
        alertGap: 'mt-2',
        stack: 'space-y-6',
        section: 'pt-4 border-t',
        form: 'space-y-4',
        field: 'w-full'
    }
} as const

// ============================================================================
// PART 4: Helper Functions
// ============================================================================

/**
 * Get kitchen panel classes dynamically
 *
 * @param mode - Dining mode (TAKEAWAY, DINEIN, DINEINLATE), RELEASED or WAITLIST
 * @returns Tailwind class string with vibrant Pantone colors
 *
 * @example
 * ```ts
 * const classes = getKitchenPanelClasses('DINEIN')
 * // Returns: 'bg-orange-500 text-black border-orange-600 ...'
 * ```
 */
export type KitchenPanelKey = keyof typeof COMPONENTS.kitchenPanel
export function getKitchenPanelClasses(
    mode: KitchenPanelKey
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

/** The colours a ticket type badge takes; `COMPONENTS.ticket.infoIcon` is keyed by them */
export type TicketTypeColor = typeof TICKET_TYPE_COLORS[keyof typeof TICKET_TYPE_COLORS]

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
    agenda: 'i-heroicons-list-bullet',
    calendarDays: 'i-heroicons-calendar-days',
    user: 'i-heroicons-user',
    /** A person's first dinner at a new ticket type */
    birthday: 'i-heroicons-cake',
    search: 'i-heroicons-magnifying-glass',
    /** The child ticket type */
    userCircle: 'i-heroicons-user-circle',
    /** The baby ticket type */
    faceSmile: 'i-heroicons-face-smile',
    userPlus: 'i-heroicons-user-plus',
    users: 'i-heroicons-users',
    userGroup: 'i-heroicons-user-group',
    /** Filled person silhouettes for member counts - the outline glyphs blur at badge size */
    members: 'i-heroicons-users-solid',
    ticket: 'i-heroicons-ticket',
    ticketSolid: 'i-heroicons-ticket-solid',  // DinnerTicket's watermark

    // Header navigation
    dinner: 'i-hugeicons-dish-02',
    chef: 'i-hugeicons-chef-hat',
    /** A joker slot: a seat the team holds open for a volunteer */
    joker: 'i-hugeicons-joker',
    household: 'i-heroicons-home',
    /** The users imported from Heynabo with their system roles (AdminUsers) */
    authorized: 'i-hugeicons-authorized',
    preferences: 'i-heroicons-adjustments-horizontal',
    /** The cog that opens a user's own settings ("Mine indstillinger") - `preferences` is the sliders glyph */
    settings: 'i-heroicons-cog-6-tooth',
    allergy: 'i-mdi-food-allergy-off-outline',
    economy: 'i-heroicons-currency-dollar',
    login: 'i-guidance-entry',
    logout: 'i-tdesign-wave-bye',
    moveIn: 'i-guidance-entry',
    moveOut: 'i-guidance-exit',
    noMoveOutPlans: 'i-heroicons-sun',
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
    jobFailed: 'i-heroicons-x-circle',
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
    /** A place in the queue for a sold-out dinner */
    waitlist: 'i-hugeicons-hourglass',
    archive: 'i-heroicons-archive-box',
    holiday: 'i-heroicons-sun',
    /** A household member without allergies */
    noAllergy: 'i-heroicons-sun',
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
    // The timeline badge's glyph for a moment still ahead; a figure that waits for tickets wears it too
    waiting: 'i-heroicons-ellipsis-horizontal-circle',
    info: 'i-heroicons-information-circle',

    // Status/state
    /** Look, don't touch: the visitor banner on another household, the admin pages for a non-admin */
    viewOnly: 'i-heroicons-eye',
    lockOpen: 'i-heroicons-lock-open',
    lockClosed: 'i-heroicons-lock-closed',
    authorize: 'i-heroicons-shield-check',

    // Actions
    share: 'i-heroicons-share',
    download: 'i-heroicons-arrow-down-tray',
    externalLink: 'i-heroicons-arrow-top-right-on-square',

    // Screen size
    desktopScreen: 'i-heroicons-computer-desktop',
    phoneScreen: 'i-heroicons-device-phone-mobile',

    // Season status in the season selector: active, current and future seasons take ICONS.calendar
    seasonPast: 'i-heroicons-archive-box-solid',
    sprout: 'i-mdi-sprout',


    // Dinner modes: the household preference hint, DinnerModeSelector (DINEIN takes `dinner`)
    lateDinner: 'i-heroicons-moon',
    takeaway: 'i-heroicons-shopping-bag',
    noDinner: 'i-heroicons-x-circle',

    // External links
    github: 'i-hugeicons-github-01',
    book: 'i-heroicons-book-open'
} as const

/** Ticket type glyphs, keyed like TICKET_TYPE_COLORS */
export const TICKET_TYPE_ICONS = {
    ADULT: ICONS.user,
    CHILD: ICONS.userCircle,
    BABY: ICONS.faceSmile
} as const

/**
 * Team role glyphs, one icon set with ICONS.chef and ICONS.dinner: the chef hat is the chef's
 * symbol, the cook's whisk is a tool rather than a rank, a kokkespire sprouts
 */
export const ROLE_ICONS = {
    CHEF: ICONS.chef,
    COOK: 'i-hugeicons-whisk',
    JUNIORHELPER: 'i-hugeicons-plant-01'
} as const

/** The team's calendar count badge: CookingTeamBadges' cooking days, the team card's joker shifts; the site binds the size */
export const getCalendarCountBadge = (teamNumber: number) => ({class: getRainbowBand(teamNumber - 1), icon: ICONS.calendar})

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
export const createResponsiveSizes = (isMd: Ref<boolean | null>) => ({
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
    // Badge icon class for small badges (inline icons in UBadge); the step at md lives in the classes
    smallBadgeIcon: 'size-3 mr-1 md:size-4',

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

    // Agenda page size: 3 on mobile, 5 on desktop
    get agendaPageSize(): number {
        return isMd.value ? 5 : 3
    },

    // An avatar group's faces before the overflow count: 3 on mobile, 5 on desktop
    get avatarMax(): number {
        return isMd.value ? 5 : 3
    },

    // Empty state avatar: 2xl on mobile, 3xl on desktop
    get emptyStateAvatar(): NuxtUIAvatarSize {
        return isMd.value ? '3xl' : '2xl'
    },

    // Allergy type avatar: the compact face in table cells and diner lines, the regular face in the editor
    get allergyAvatarCompact(): NuxtUIAvatarSize {
        return isMd.value ? 'xs' : '2xs'
    },
    get allergyAvatar(): NuxtUIAvatarSize {
        return isMd.value ? 'sm' : 'xs'
    },

    // Lock chip: lg on mobile, 3xl on desktop (for booking calendar lock indicators)
    get lockChip(): NuxtUIChipSize {
        return isMd.value ? '3xl' : 'lg'
    },

    // The season selector's USelect
    get seasonSelect(): NuxtUISize {
        return isMd.value ? 'lg' : 'sm'
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
export const createResponsiveIcons = (isMd: Ref<boolean | null>) => ({
    // Arrow pointing to master panel: up on mobile (stacked), left on desktop (side-by-side)
    get arrowToMaster(): string {
        return isMd.value ? ICONS.arrowLeft : ICONS.arrowUp
    },
    // The footer's screen size indicator
    get screen(): string {
        return isMd.value ? ICONS.desktopScreen : ICONS.phoneScreen
    },
    // The toggle of an open master row turns toward its detail: right into the pane from md, up to fold the phone dock
    get detailOpen(): string {
        return isMd.value ? ICONS.chevronRight : ICONS.chevronUp
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
const createResponsiveButtons = (isMd: Ref<boolean | null>) => {
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

        // Remove a line (ExpenseLines): square ghost trash in the row's last column, with an aria-label
        get remove() {
            return {
                icon: ICONS.trash,
                color: 'error' as const,
                variant: 'ghost' as const,
                square: true,
                size: sizes.small
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

        // The team finder's row action (Tilføj, Rediger, Luk): tinted and small, one per inhabitant row
        get memberFinder() {
            return {
                color: COLOR.primary,
                variant: NOISE.soft,
                size: sizes.small
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

        // History toggle - a quiet square icon beside the thing it reveals (order history, ticket changes):
        // the clipboard while closed, the chevron up while open. The site names it with an `aria-label`
        history: (isOpen: boolean) => ({
            icon: isOpen ? ICONS.chevronUp : ICONS.clipboard,
            color: COLOR.neutral,
            variant: NOISE.quiet,
            square: true,
            size: sizes.small
        }),

        /**
         * Modifier for a button that opens a panel below it: a chevron that turns while the panel is open, and
         * `aria-expanded` for screen readers. Spread after a kind: `v-bind="{...BUTTONS.settings, ...BUTTONS.flipOpen(isOpen)}"`
         */
        flipOpen(isOpen: boolean) {
            return {
                trailingIcon: ICONS.chevronDown,
                'aria-expanded': isOpen,
                ui: {trailingIcon: flipOpenTurn(isOpen)}
            }
        },

        /**
         * Sibling of `flipOpen` for children that open one level in: a right chevron that turns down while open, and
         * `aria-expanded`. Spread after a kind like `flipOpen`
         */
        turnOpen(isOpen: boolean) {
            return {
                trailingIcon: ICONS.chevronRight,
                'aria-expanded': isOpen,
                ui: {trailingIcon: openInTurn(isOpen)}
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
export const createResponsiveAlerts = (isMd: Ref<boolean | null>) => ({
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
const createOrientations = (isMd: Ref<boolean | null>) => ({
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
const createWeekdayDisplay = (isMd: Ref<boolean | null>) => ({
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
    fieldGroupClasses: 'p-0 md:p-1.5 rounded-none md:rounded-lg border border-default bg-default gap-0 md:gap-1 min-w-16 md:min-w-32',

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
const createPagination = (isMd: Ref<boolean | null>) => ({
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
const createNavigation = (isMd: Ref<boolean | null>) => ({
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
        return isMd.value === true
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
        // 24px below lg, 32px from lg, where a master column holds a week of the larger circle. The step lives in the
        // classes, so the server renders each screen's circle before the layout measures
        size: 'w-6 h-6 text-xs lg:w-8 lg:h-8 lg:text-sm',
        shape: 'rounded-full flex items-center justify-center cursor-pointer hover:opacity-90',
        past: `font-medium ${PAST_DAY_COLORS}`,
        // A cancelled dinner: the past circle, struck through
        cancelled: CANCELLED_STRIKE
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
export const createColumnVisibility = (isMd: Ref<boolean | null>) =>
    (hiddenOnPhone: readonly string[], hiddenFromMd: readonly string[] = []): Record<string, boolean> =>
        Object.fromEntries((isMd.value ? hiddenFromMd : hiddenOnPhone).map(column => [column, false]))

// A column whose header and cells render from md: a column carries it in its `meta`, which UTable reads
const TABLE_COLUMN_FROM_MD = {class: {th: 'hidden md:table-cell', td: 'hidden md:table-cell'}}

/**
 * UTable column definitions whose header or cell depends on the breakpoint, spread after the column id.
 * An undefined header renders an empty header cell.
 * @example {id: 'name', ...TABLE_COLUMNS.bookingFormName}
 */
export const createTableColumns = (isMd: Ref<boolean | null>) => ({
    // On a phone the booking form's name column carries each inhabitant's tickets inline
    get bookingFormName(): {header: string} {
        return {header: isMd.value ? 'Beboer' : 'Billetter'}
    },
    bookingFormTicket: {meta: TABLE_COLUMN_FROM_MD},
    get householdMemberName(): {header: string | undefined} {
        return {header: isMd.value ? 'Medlem' : undefined}
    },
    get householdTicketType(): {header: string | undefined, meta: typeof TABLE_COLUMN_FROM_MD} {
        return {header: isMd.value ? 'Billet' : undefined, meta: TABLE_COLUMN_FROM_MD}
    }
})

/**
 * COMPONENTS.masterDetail with the mount point of the detail: the pane beside the master from md,
 * the dock in the master row on a phone and until the layout has measured.
 */
export const createMasterDetail = (isMd: Ref<boolean | null>) => ({
    ...COMPONENTS.masterDetail,
    get detailAsPane(): boolean {
        return isMd.value === true
    }
})

/**
 * The layout's breakpoint for behaviour that needs the ref itself (a watch, a URL parameter's default).
 * `isMd` is null until the layout measures after mount; `measured` gates a default that reads it.
 */
export const createBreakpoint = (isMd: Ref<boolean | null>) => ({
    isMd,
    measured: computed(() => isMd.value !== null)
})

/**
 * The shared calendar day circle: size + shape + the variant the surface adds
 * (CALENDAR.holiday, PLANNING_CALENDAR.day.generated, CHEF_CALENDAR.day.next, …).
 */
export const dayCircleClasses = (...variants: (string | false | null | undefined)[]): string[] =>
    [CALENDAR.day.size, CALENDAR.day.shape, ...variants.filter((variant): variant is string => Boolean(variant))]

/**
 * Props for a date picker's UCalendar: the shared grid token with the cell-fill
 * neutralisation, so the `#day` slot owns how a selected day reads.
 */
export const calendarPickerProps = () => ({
    ...COMPONENTS.calendarGrid,
    ui: {
        ...COMPONENTS.calendarGrid.ui,
        cellTrigger: `${COMPONENTS.calendarGrid.ui.cellTrigger} ${CALENDAR.pickerCell}`
    }
})

/**
 * CHEF_CALENDAR - Ocean palette accent colors
 */
export const CHEF_CALENDAR = {
    day: {
        next: `text-white dark:text-black font-bold ${BG.ocean[400]}`,
        future: `font-medium ${BG.ocean[200]} ${TEXT.ocean[800]}`,
        // Another team's dinner: a plain outlined circle, without the team on view's colours
        otherTeam: `font-medium border ${BORDER.gray[500]}`
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
 * BOOKING_LOCK_STATUS - Lock chips on a dinner past its booking deadline (dinner calendar day, booking grid header)
 *
 * The chip shows the dinner's supply (`lockChip` in useBookingUi):
 * - locked: nothing for sale, no waiting list - peach chip (matches selection ring)
 * - lockedWithTickets: tickets for sale - yellow chip reading the count
 * - lockedWithQueue: a waiting list - yellow chip carrying the hourglass
 */
export const BOOKING_LOCK_STATUS = {
    locked: {color: 'peach' as NuxtUIColor},
    lockedWithTickets: {color: 'yellow' as NuxtUIColor},
    lockedWithQueue: {color: 'yellow' as NuxtUIColor, icon: ICONS.waitlist}
} as const

// ============================================================================
// PART 7: Empty State Messages (fun placeholders)
// ============================================================================

/**
 * EMPTY_STATE_MESSAGES - Fun empty state messages by context
 */
export const EMPTY_STATE_MESSAGES = {
    cookingTeam: [
        { emoji: '🌱', text: 'Køkkenholdet er her ikke, de lytter til græs der gror' },
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
        { emoji: '🎯', text: 'Madholdet har gemt sig, måske i et regneark' },
        { emoji: '🧩', text: 'Puslespillet mangler et madhold' }
    ],
    jobHistory: [
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
    ],
    dinnerGone: [
        { emoji: '🚪', text: 'Skulle du til middag? Den er gået' },
        { emoji: '🍽️', text: 'Tallerkenen er vasket op, middagen findes ikke mere' },
        { emoji: '🏃', text: 'Middag? Spisning er vild overvurderet' },
        { emoji: '🌫️', text: 'Den middag er vist gået op i damp og røg' }
    ],
    noAllergens: [
        { emoji: '🍀', text: 'Allergenerne fik ikke plads på menuen i dag' },
        { emoji: '😋', text: 'Ingen allergener på menuen - spis løs!' },
        { emoji: '🧑‍🍳', text: 'Kokken har ikke købt noget med allergener i' }
    ],
    seasonGone: [
        { emoji: '📅', text: 'Sæsonen er pakket sammen og sat op på loftet' },
        { emoji: '🍂', text: 'Denne sæson er måske blæst væk med bladene' },
        { emoji: '🗓️', text: 'Kalenderen har vendt bladet, sæsonen er væk' }
    ],
    noTicketsSold: [
        { emoji: '🎟️', text: 'Billetlugen er stadig lukket, ingen har købt endnu' },
        { emoji: '⏳', text: 'Billetterne er på vej, husstandene skal lige vågne' }
    ],
    noReceipts: [
        { emoji: '🛒', text: 'Indkøbsvognen er tom, kvitteringerne er ikke kommet endnu' },
        { emoji: '🧾', text: 'Kvitteringerne gemmer sig stadig i jakkelommen' }
    ],
    noTicketChanges: [
        { emoji: '🧘', text: 'Billetterne har holdt sig i ro' },
        { emoji: '📭', text: 'Postkassen er tom, ingen billetter er flyttet' }
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

/** The day's empty message as one line of text, emoji first */
export const getRandomEmptyMessageText = (context: keyof typeof EMPTY_STATE_MESSAGES) => {
    const {emoji, text} = getRandomEmptyMessage(context)
    return `${emoji} ${text}`
}

/** The season status glyph as a UBadge's settings per status: a filled disc, green active, yellow in progress, grey ended; the sprout alone for an upcoming season */
export const SEASON_STATUS_GLYPHS: Record<SeasonStatusValue, BadgeProps & {class: string}> = {
    [SEASON_STATUS.ACTIVE]: {class: BG.green[500], ui: COMPONENTS.seasonStatus.discUi},
    [SEASON_STATUS.CURRENT]: {class: BG.yellow[400], ui: COMPONENTS.seasonStatus.discUi},
    [SEASON_STATUS.FUTURE]: {icon: ICONS.sprout, class: `bg-transparent ${TEXT.green[500]}`, ui: COMPONENTS.seasonStatus.sproutUi},
    [SEASON_STATUS.PAST]: {class: BG.gray[500], ui: COMPONENTS.seasonStatus.discUi}
}

export const useTheSlopeDesignSystem = () => {
    // Inject responsive breakpoint from layout
    const isMd = inject<Ref<boolean | null>>('isMd', ref(null))
    const columnVisibility = createColumnVisibility(isMd)

    return {
        // The layout's breakpoint, for behaviour that needs the ref; a rendered value binds a responsive token
        breakpoint: createBreakpoint(isMd),

        // For NuxtUI components
        COLOR,
        NOISE,
        TICKET_TYPE_COLORS,
        TICKET_TYPE_ICONS,
        ROLE_ICONS,
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
        ORDER_STATE_COLORS,
        PANTONE_CHIPS,
        getPantoneChip,
        RAINBOW,
        RAINBOW_FAMILIES,
        getRainbowBand,
        getRainbowAccent,
        getCalendarCountBadge,
        ICONS,
        SEASON_STATUS_GLYPHS,
        IMG,

        // Semantic design patterns (USE THESE!)
        TYPOGRAPHY,
        LAYOUTS,
        BACKGROUNDS,
        COMPONENTS: {...COMPONENTS, masterDetail: createMasterDetail(isMd)},

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

        // UTable column definitions that follow the breakpoint
        TABLE_COLUMNS: createTableColumns(isMd),

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
        getRandomEmptyMessageText,
        EMPTY_STATE_MESSAGES
    }
}
