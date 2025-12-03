import type {WeekDay} from '~/types/dateTypes'
import type {AvatarProps, ButtonProps} from '@nuxt/ui'
import heynaboLogo from '~/assets/heynabo.jpeg'

// NuxtUI size types extracted from component props
type NuxtUISize = NonNullable<ButtonProps['size']>
type NuxtUIAvatarSize = NonNullable<AvatarProps['size']>

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
  // Semantic colors (mapped in app.config.ts → ui.colors)
  primary: 'primary',       // Amber (mocha/brown) - brand color, use for non-hero contexts
  secondary: 'secondary',   // Pink - secondary actions
  success: 'success',       // Green - success states, active
  error: 'error',           // Red - errors, cancellations
  warning: 'warning',       // Orange - CTAs on hero backgrounds, warnings
  info: 'info',             // Violet - information messages
  neutral: 'neutral',       // Sky - neutral/disabled

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
    200: 'bg-ocean-200',    // Chef calendar - future cookings
    300: 'bg-ocean-300',    // Chef calendar - countdown
    400: 'bg-ocean-400',    // Chef calendar - next cooking
    500: 'bg-ocean-500',    // Landing section
    600: 'bg-ocean-600',
    700: 'bg-ocean-700',
    800: 'bg-ocean-800'
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
    50: 'text-ocean-50',
    300: 'text-ocean-300',    // Chef calendar - countdown timer
    400: 'text-ocean-400',    // Chef calendar - countdown timer
    600: 'text-ocean-600',    // Chef calendar - rings
    800: 'text-ocean-800'     // Chef calendar - future cookings
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
  ocean: {
    400: 'border-ocean-400',   // Chef calendar - countdown, rings
    700: 'border-ocean-700'    // Chef calendar - selected state
  },
  orange: {
    500: 'border-orange-500'
  },
  red: {
    500: 'border-red-500'      // Deadline - critical
  },
  amber: {
    500: 'border-amber-500'    // Deadline - warning
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
  sectionSubheading: 'text-sm font-semibold text-gray-700 dark:text-gray-300',

  // Body text
  bodyText: 'text-base',
  bodyTextSmall: 'text-sm',
  bodyTextMedium: 'text-sm font-medium',
  bodyTextMuted: 'text-sm text-gray-600 dark:text-gray-400',
  bodyTextPlaceholder: 'text-sm text-gray-500',

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

  // Section content (card body sections)
  sectionContent: 'px-4 md:px-6 py-4 md:py-6 space-y-4',           // Standard section with padding
  sectionContentNoPadX: 'px-0 py-4 md:py-6 space-y-4',             // No horizontal padding (full-bleed)
  sectionContentCompact: 'px-4 py-3 space-y-3',                    // Compact variant

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
  },

  // Table interactions - row selection and click patterns
  table: {
    selectedRow: 'bg-secondary-100 dark:bg-secondary-900',
    clickableCell: 'cursor-pointer'
  },

  // Calendar UI configuration (UCalendar)
  calendar: {
    cellTrigger: 'data-[outside-view]:hidden'
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
  // Navigation & entities
  team: 'i-fluent-mdl2-team-favorite',
  calendar: 'i-heroicons-calendar',
  calendarDays: 'i-heroicons-calendar-days',
  user: 'i-heroicons-user',
  users: 'i-heroicons-users',
  userGroup: 'i-heroicons-user-group',
  ticket: 'i-heroicons-ticket',

  // Actions & feedback
  edit: 'i-heroicons-pencil',
  check: 'i-heroicons-check',
  checkCircle: 'i-heroicons-check-circle',
  plusCircle: 'i-heroicons-plus-circle',
  megaphone: 'i-heroicons-megaphone',
  exclamationCircle: 'i-heroicons-exclamation-circle',
  xMark: 'i-heroicons-x-mark',
  arrowRight: 'i-heroicons-arrow-right',

  // Empty states
  robotDead: 'i-mage-robot-dead'
} as const

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
  heynabo: heynaboLogo,
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
  get standard(): NuxtUISize { return isMd.value ? 'lg' : 'md' },
  get standardIconSize(): string { return isMd.value ? '20' : '16' },

  // Small responsive: sm on mobile, md on desktop
  get small(): NuxtUISize { return isMd.value ? 'md' : 'sm' },
  get smallIconSize(): string { return isMd.value ? '16' : '12' },

  // Large responsive: lg on mobile, xl on desktop
  get large(): NuxtUISize { return isMd.value ? 'xl' : 'lg' },
  get largeIconSize(): string { return isMd.value ? '24' : '20' },

  // Calendar: xl on desktop, sm on mobile (UCalendar sizing)
  get calendar(): NuxtUISize { return isMd.value ? 'xl' : 'sm' },

  // Calendar months: 3 on desktop, 1 on mobile
  get calendarMonths(): number { return isMd.value ? 3 : 1 },

  // Calendar day circle: w-8 h-8 on desktop, w-6 h-6 on mobile
  get calendarCircle(): string { return isMd.value ? 'w-8 h-8 text-sm' : 'w-6 h-6 text-xs' },

  // Calendar accordion default: '0' (expanded) on desktop, undefined (collapsed) on mobile
  get calendarAccordionDefault(): string | undefined { return isMd.value ? '0' : undefined },

  // Empty state avatar: 2xl on mobile, 3xl on desktop
  get emptyStateAvatar(): NuxtUIAvatarSize { return isMd.value ? '3xl' : '2xl' },

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
    icon: 'i-heroicons-calendar'
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
    critical: 'ring-2 ring-red-500',
    warning: 'ring-2 ring-amber-500',
    onTrack: ''
  },
  // Base selection behavior - combine with palette-specific color
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

/**
 * CHEF_CALENDAR - Ocean palette accent colors
 */
export const CHEF_CALENDAR = {
  day: {
    next: `text-white font-bold ${BG.ocean[400]}`,
    future: `font-medium ${BG.ocean[200]} ${TEXT.ocean[800]}`
  },
  countdown: {
    border: 'border-ocean-400',
    accent: TEXT.ocean[400],
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
    next: `text-white font-bold ${BG.peach[400]}`,
    future: `font-medium ${BG.peach[200]} ${TEXT.peach[800]}`
  },
  countdown: {
    border: BORDER.peach[400],
    accent: TEXT.peach[400],
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
  CRITICAL: {
    color: COLOR.error,
    label: 'Kritisk',
    icon: 'i-heroicons-exclamation-circle'
  },
  WARNING: {
    color: COLOR.warning,
    label: 'Snart',
    icon: 'i-heroicons-clock'
  },
  ON_TRACK: {
    color: COLOR.success,
    label: 'OK',
    icon: 'i-heroicons-check-circle'
  }
} as const

/**
 * Maps DeadlineUrgency (0 | 1 | 2) to DEADLINE_BADGES
 * 0 = On track, 1 = Warning, 2 = Critical
 */
export const URGENCY_TO_BADGE = {
  0: DEADLINE_BADGES.ON_TRACK,
  1: DEADLINE_BADGES.WARNING,
  2: DEADLINE_BADGES.CRITICAL
} as const

export const useTheSlopeDesignSystem = () => {
  // Inject responsive breakpoint from layout
  const isMd = inject<Ref<boolean>>('isMd', ref(false))

  return {
    // For NuxtUI components
    COLOR,
    TICKET_TYPE_COLORS,
    DINNER_STATE_BADGES,
    CALENDAR,
    CHEF_CALENDAR,
    DINNER_CALENDAR,
    DEADLINE_BADGES,
    URGENCY_TO_BADGE,
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
