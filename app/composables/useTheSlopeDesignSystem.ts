1
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
 *
 * @example
 * ```vue
 * <UButton :color="COLOR.primary">Save</UButton>
 * <UBadge :color="COLOR.mocha">Mocha Mousse</UBadge>
 * <UAlert :color="COLOR.warning">Warning!</UAlert>
 * ```
 */
export const COLOR = {
  // Semantic colors (standard NuxtUI)
  primary: 'primary',       // Blue - main actions, links
  secondary: 'secondary',   // Blue variant - secondary actions
  success: 'success',       // Green - success states, active
  error: 'error',           // Red - errors, cancellations
  warning: 'warning',       // Amber - warnings, takeaway
  info: 'info',             // Blue - information messages
  neutral: 'neutral',       // Gray - neutral/disabled

  // Brand Pantone colors (custom)
  mocha: 'mocha',          // PRIMARY BRAND - Pantone 2025
  peach: 'peach',          // Warm, countdown timers
  pink: 'pink',            // Pink Lemonade - vibrant
  orange: 'orange',        // Mandarin Orange - energetic
  party: 'party',          // Party Punch - deep burgundy
  ocean: 'ocean',          // Ocean/Sky - cool blue
  winery: 'winery',        // Winery - deep red
  caramel: 'caramel',      // Caramel - warm brown
  bonbon: 'bonbon'         // Bonbon - light purple
} as const

// ============================================================================
// PART 2: Tailwind Class Builders (for dynamic classes)
// ============================================================================

/**
 * BG - Background color scale (50-950)
 *
 * Use for dynamic background colors.
 *
 * @example
 * ```ts
 * const bgClass = BG.mocha[500]  // 'bg-amber-500'
 * const lightBg = BG.peach[50]   // 'bg-peach-50'
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
    700: 'bg-amber-700',
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
  party: {
    50: 'bg-party-50',
    500: 'bg-party-500',
    700: 'bg-party-700',    // Landing section, vibrant kitchen
    800: 'bg-party-800'
  },
  ocean: {
    50: 'bg-ocean-50',
    500: 'bg-ocean-500',    // Landing section
    600: 'bg-ocean-600'
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
  }
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
    900: 'text-amber-900',
    950: 'text-amber-950'
  },
  peach: {
    50: 'text-peach-50',
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
  party: {
    50: 'text-party-50'
  },
  ocean: {
    50: 'text-ocean-50'
  },
  gray: {
    600: 'text-gray-600',
    700: 'text-gray-700',
    900: 'text-gray-900'
  },
  blue: {
    900: 'text-blue-900'
  },
  white: 'text-white'
} as const

/**
 * BORDER - Border color scale
 */
export const BORDER = {
  gray: {
    200: 'border-gray-200',
    500: 'border-gray-500',
    600: 'border-gray-600',
    700: 'border-gray-700',
    800: 'border-gray-800'
  },
  peach: {
    400: 'border-peach-400'    // Calendar - countdown, rings
  },
  orange: {
    500: 'border-orange-500'
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

  // Body text
  bodyText: 'text-base',
  bodyTextSmall: 'text-sm',

  // Small text
  finePrint: 'text-xs',
  caption: 'text-xs font-medium',

  // Footer
  footerText: 'text-xs text-amber-50'
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

  // Dividers
  sectionDivider: 'border-t border-gray-200 dark:border-gray-800'
} as const

/**
 * BACKGROUNDS - Background patterns for sections
 *
 * Complete background styling for major page sections.
 */
export const BACKGROUNDS = {
  // Landing page sections
  landing: {
    titleBar: `${BG.mocha[500]} ${TEXT.mocha[50]}`,
    ticker: `${BG.mocha[500]} ${TEXT.mocha[50]}`,
    section1: `${BG.pink[500]} ${TEXT.pink[50]}`,
    section2: `${BG.orange[500]} ${TEXT.orange[100]}`,
    section3: `${BG.party[700]} ${TEXT.party[50]}`,
    section4: `${BG.ocean[500]} ${TEXT.ocean[50]}`
  },

  // Hero sections (family-facing)
  hero: {
    mocha: `${BG.mocha[500]} ${TEXT.mocha[50]}`,      // PRIMARY
    peach: `${BG.peach[300]} ${TEXT.peach[950]}`,     // Countdown
    pink: `${BG.pink[500]} ${TEXT.pink[50]}`,         // Accent
    orange: `${BG.orange[500]} ${TEXT.orange[100]}`   // Accent
  },

  // Navigation
  header: `${BG.blue[100]} ${TEXT.blue[900]}`,

  // Cards
  card: 'bg-white',
  cardSubtle: `${BG.gray[50]}`,
  cardDark: `${BG.gray[900]} ${TEXT.white}`
} as const

/**
 * COMPONENTS - Complete component styling
 *
 * Ready-to-use complete styling for common components.
 */
export const COMPONENTS = {
  // Kitchen panels (functional data) - Vibrant Pantone colors
  kitchenStatsBar: `${BG.mocha[50]} ${TEXT.gray[900]} px-0 py-4 md:p-6`,

  kitchenPanel: {
    TAKEAWAY: `bg-warning-500 ${TEXT.white} border-warning-600 border-r last:border-r-0 p-3 md:p-4 text-center min-w-0 box-border`,
    DINEIN: `${BG.party[700]} ${TEXT.white} border-party-800 border-r last:border-r-0 p-3 md:p-4 text-center min-w-0 box-border`,
    DINEINLATE: `${BG.orange[500]} ${TEXT.white} border-orange-600 border-r last:border-r-0 p-3 md:p-4 text-center min-w-0 box-border`,
    RELEASED: `${BG.gray[500]} ${TEXT.white} ${BORDER.gray[600]} border-r last:border-r-0 p-3 md:p-4 text-center min-w-0 box-border`
  },

  // Empty state alert - centered with large text and emoji
  emptyStateAlert: {
    root: 'text-center',
    title: 'text-lg md:text-xl font-semibold',
    description: 'text-sm md:text-base'
  },

  // Power mode - family-wide bulk editing pattern
  powerMode: {
    color: 'warning' as const,
    icon: 'i-fluent-emoji-high-contrast-woman-superhero',
    buttonIcon: 'i-heroicons-bolt',
    alert: {
      color: 'warning' as const,
      variant: 'soft' as const,
      icon: 'i-fluent-emoji-high-contrast-woman-superhero'
    },
    card: {
      color: 'warning' as const,
      variant: 'outline' as const
    }
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
 * // Returns: 'bg-party-700 text-white border-party-800 ...'
 * ```
 */
export function getKitchenPanelClasses(
  mode: 'TAKEAWAY' | 'DINEIN' | 'DINEINLATE' | 'RELEASED'
): string {
  return COMPONENTS.kitchenPanel[mode]
}

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
  team: 'i-fluent-mdl2-team-favorite',
  calendar: 'i-heroicons-calendar',
  user: 'i-heroicons-user',
  users: 'i-heroicons-users'
} as const

/**
 * SIZES - Responsive size patterns for NuxtUI components
 *
 * Automatically adapts based on `isMd` breakpoint from layout.
 * Use these instead of manually checking `getIsMd ? 'lg' : 'md'`.
 *
 * Each size includes both badge size and matching icon size for consistency.
 *
 * @example
 * ```vue
 * <UBadge :size="SIZES.large.value">
 *   <UIcon :name="ICONS.team" :size="SIZES.large.iconSize" />
 * </UBadge>
 * ```
 */
export const createResponsiveSizes = (isMd: Ref<boolean>) => ({
  // Standard responsive: md on mobile, lg on desktop
  standard: {
    value: computed(() => isMd.value ? 'lg' : 'md'),
    iconSize: computed(() => isMd.value ? '20' : '16')
  },

  // Small responsive: sm on mobile, md on desktop
  small: {
    value: computed(() => isMd.value ? 'md' : 'sm'),
    iconSize: computed(() => isMd.value ? '16' : '12')
  },

  // Large responsive: lg on mobile, xl on desktop
  large: {
    value: computed(() => isMd.value ? 'xl' : 'lg'),
    iconSize: computed(() => isMd.value ? '24' : '20')
  },

  // Empty state avatar: 2xl on mobile, 3xl on desktop
  emptyStateAvatar: computed(() => isMd.value ? '3xl' : '2xl'),

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
  vertical: 'vertical' as const
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
    ui: { rounded: 'rounded-none md:rounded-md' }
  },

  /**
   * UFieldGroup classes for weekday preference displays
   * Used in table headers and weekday selector rows
   * Responsive padding, borders, background, and minimum widths
   */
  fieldGroupClasses: 'p-0 md:p-1.5 rounded-none md:rounded-lg border border-default bg-neutral gap-0 md:gap-1 min-w-16 md:min-w-32'
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
export const useTheSlopeDesignSystem = () => {
  // Inject responsive breakpoint from layout
  const isMd = inject<Ref<boolean>>('isMd', ref(false))

  return {
    // For NuxtUI components
    COLOR,
    TICKET_TYPE_COLORS,
    ICONS,

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

    // Low-level builders (only if you need custom combinations)
    BG,
    TEXT,
    BORDER,

    // Helpers
    getKitchenPanelClasses
  }
}

// Backwards compatibility alias (deprecated - use useTheSlopeDesignSystem)
export const useColorSystem = useTheSlopeDesignSystem
