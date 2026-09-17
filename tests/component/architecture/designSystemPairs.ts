/**
 * The contrast pair inventory of the design system.
 *
 * `designSystemContrast.unit.spec.ts` asserts these pairs; `scripts/palettes/generate.ts` solves
 * them. One module, so a preset is generated against the same inventory it is measured by: the
 * resolution order, the surface folding, the scoping rules and the thresholds are stated once.
 *
 * Levels (WCAG 2.1, adopted by EN 301 549 clause 9.1.4):
 *   1.4.3  Contrast (Minimum), AA   - 4.5:1 body text, 3:1 large text
 *   1.4.6  Contrast (Enhanced), AAA - 7:1 body text, 4.5:1 large text
 *   1.4.11 Non-text Contrast, AA    - 3:1 borders, rings, UI boundaries (no AAA level exists)
 */

import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import type {Ref} from 'vue'
import {
    BACKGROUNDS, BG, BORDER, CALENDAR, CHEF_CALENDAR, COMPONENTS, DINNER_CALENDAR, LAYOUTS,
    PANTONE_CHIPS, PLANNING_CALENDAR, RAINBOW, RING, TEXT, TYPOGRAPHY, createResponsiveAlerts
} from '../../../app/composables/useTheSlopeDesignSystem'
import {
    composite, contrastRatio, cssColourToHex, hexToRgb, parseColourScales, parseSemanticBlock,
    type ModeOverride, type Rgb, type Rgba
} from './contrast'

// ---------------------------------------------------------------------------
// Where colour actually comes from
// ---------------------------------------------------------------------------

export const repoPath = (path: string) => fileURLToPath(new URL(`../../../${path}`, import.meta.url))
export const repoFile = (path: string) => readFileSync(repoPath(path), 'utf8')

/** The twelve Pantone families `main.css` declares in `@theme static` */
export const APP_SCALES = parseColourScales(repoFile('app/assets/css/main.css'))

/** Tailwind 4's default theme - `green`, `gray` and the rest arrive as oklch() */
export const TAILWIND_SCALES = parseColourScales(repoFile('node_modules/tailwindcss/theme.css'))

/**
 * `app.config.ts` `ui.colors` - the Nuxt UI slot → palette family map, parsed from the
 * source so a remap (primary: amber → caramel) reaches this test without an edit here.
 */
export const SLOT_FAMILY: Record<string, string> = Object.fromEntries(
    [...(repoFile('app/app.config.ts').match(/colors:\s*\{([\s\S]*?)\n\s*\}/) ?? [])[1]!
        .matchAll(/(\w+)\s*:\s*['"](\w+)['"]/g)].map(([, slot, family]) => [slot!, family!])
)

/** Nuxt UI's `--ui-text-*` / `--ui-bg-*` / `--ui-border-*` per mode, values still unresolved */
const NUXT_UI_CSS = repoFile('node_modules/@nuxt/ui/dist/runtime/index.css')
export const SEMANTIC = {
    light: parseSemanticBlock(NUXT_UI_CSS, '.light,:host,:root'),
    dark: parseSemanticBlock(NUXT_UI_CSS, '.dark{')
} as const

export type Mode = keyof typeof SEMANTIC
export const MODES = Object.keys(SEMANTIC) as Mode[]

/** A preset overrides `--color-<family>-<step>` per mode; `dark` already carries the light layer */
export type PaletteOverride = {light: ModeOverride, dark: ModeOverride}
export const NO_OVERRIDE: PaletteOverride = {light: {scales: {}, slots: {}}, dark: {scales: {}, slots: {}}}

/** Nuxt UI's colours plugin: a bare `bg-<slot>` paints the 500 rung in light, the 400 in dark */
export const DEFAULT_SLOT_RUNG: Record<Mode, string> = {light: '500', dark: '400'}

/** The `--color-<family>-<step>` variable a resolved colour came from - what a preset can move */
export type PaletteRef = {family: string, step: string}

/** A resolved colour and the palette variable behind it (`null` for `#fff`, `black`, …) */
export type Sourced = {colour: Rgba, source: PaletteRef | null}

/** The utility prefixes that carry a colour we can measure */
export type Channel = 'text' | 'bg' | 'border' | 'ring' | 'outline'
export const CHANNELS: Channel[] = ['text', 'bg', 'border', 'ring', 'outline']

/** Nuxt UI names its neutral semantics per channel: `text-muted` is not `bg-muted` */
const SEMANTIC_PREFIX: Record<Channel, string> = {
    text: 'text', bg: 'bg', border: 'border', ring: 'border', outline: 'border'
}

/**
 * A palette preset overrides `--color-<family>-<shade>` under `html[data-palette="…"]`, so
 * resolution is: preset override → app palette → semantic slot alias → Tailwind default. An
 * override is layered onto the family it names, so a preset may publish single steps.
 * `neutral` has no `@theme static` scale and resolves through the slot alias - which is why
 * `bg-neutral-900` paints TheSlope's sky, not Tailwind's grey, and why the variable a preset
 * has to move for it is `--color-sky-900`.
 */
export const createResolver = ({scales: override, slots}: ModeOverride) => {
    const layered = (family: string, scale: Record<string, string>) =>
        ({family, scale: override[family] ? {...scale, ...override[family]} : scale})

    const familyScale = (name: string, seen = new Set<string>()): {family: string, scale: Record<string, string>} | undefined => {
        if (seen.has(name)) return undefined
        seen.add(name)
        if (APP_SCALES[name]) return layered(name, APP_SCALES[name]!)
        const alias = SLOT_FAMILY[name] ? familyScale(SLOT_FAMILY[name]!, seen) : undefined
        // A preset may re-point a slot family (`--ui-color-info-600`) instead of the family behind
        // it, so the slot takes the new hue while the brand family keeps painting the bands
        if (alias) return override[name] ? {family: name, scale: {...alias.scale, ...override[name]}} : alias
        if (TAILWIND_SCALES[name]) return layered(name, TAILWIND_SCALES[name]!)
        return override[name] ? {family: name, scale: override[name]!} : undefined
    }

    const step = (family: string, shade: string): Sourced | null => {
        const resolved = familyScale(family)
        const hex = resolved?.scale[shade]
        return hex ? {colour: hexToRgb(hex), source: {family: resolved!.family, step: shade}} : null
    }

    /** `var(--ui-color-neutral-500)` or `#fff` → a colour and the variable behind it */
    const semanticValue = (value: string): Sourced | null => {
        const variable = value.match(/var\(--ui-color-(\w+)-(\d{2,3})\)/)
        if (variable) return step(variable[1]!, variable[2]!)
        const hex = cssColourToHex(value)
        return hex ? {colour: hexToRgb(hex), source: null} : null
    }

    /** `amber-500`, `primary`, `elevated/50`, `white` → the colour it paints, or null */
    return (reference: string, channel: Channel, mode: Mode): Sourced | null => {
        const [name, alphaPart] = reference.split('/') as [string, string?]
        const alpha = alphaPart === undefined ? 1 : Number(alphaPart) / 100
        if (!name || !Number.isFinite(alpha)) return null

        const withAlpha = (resolved: Sourced | null): Sourced | null => resolved && {
            colour: {...resolved.colour, alpha: alpha * resolved.colour.alpha},
            source: resolved.source
        }

        if (name === 'white') return withAlpha({colour: hexToRgb('#ffffff'), source: null})
        if (name === 'black') return withAlpha({colour: hexToRgb('#000000'), source: null})

        const shaded = name.match(/^([a-z]+)-(\d{2,3})$/)
        if (shaded) return withAlpha(step(shaded[1]!, shaded[2]!))

        // A bare slot name: Nuxt UI paints `bg-primary` as the 500 rung in light, 400 in dark,
        // unless the preset re-points `--ui-primary` at another rung
        if (SLOT_FAMILY[name]) return withAlpha(step(name, slots[name] ?? DEFAULT_SLOT_RUNG[mode]))

        // Nuxt UI's neutral semantics: `text-default`, `bg-elevated`, `border-accented`, …
        const base = SEMANTIC_PREFIX[channel]
        const raw = SEMANTIC[mode][name === 'default' ? base : `${base}-${name}`]
        return raw ? withAlpha(semanticValue(raw)) : null
    }
}

// ---------------------------------------------------------------------------
// Reading the design system: a token is a class string; light and dark both count
// ---------------------------------------------------------------------------

export type Leaf = {path: string, classes: string}

/** Every string leaf of the design system, named by the path a component writes */
const walk = (node: unknown, path: string, out: Leaf[] = []): Leaf[] => {
    if (typeof node === 'string') out.push({path, classes: node})
    else if (Array.isArray(node)) node.forEach((item, index) => walk(item, `${path}[${index}]`, out))
    else if (node && typeof node === 'object') {
        for (const [key, value] of Object.entries(node)) walk(value, path ? `${path}.${key}` : key, out)
    }
    return out
}

/** `withActions` reads the layout breakpoint; the alert kinds themselves are static */
const ALERTS = createResponsiveAlerts({value: false} as Ref<boolean>)

export const LEAVES = walk({
    TEXT, BG, BORDER, RING, TYPOGRAPHY, LAYOUTS, BACKGROUNDS, PANTONE_CHIPS, RAINBOW, COMPONENTS,
    CALENDAR, PLANNING_CALENDAR, CHEF_CALENDAR, DINNER_CALENDAR, ALERTS
}, '')

const leafByPath = new Map(LEAVES.map(leaf => [leaf.path, leaf]))

/**
 * The class string a design-system path renders. A spec that names one token resolves it through
 * here rather than restating its classes, so a renamed token fails loudly instead of silently
 * measuring nothing.
 */
export const leafClasses = (path: string): string => {
    const leaf = leafByPath.get(path)
    if (!leaf) throw new Error(`no design-system token at ${path}`)
    return leaf.classes
}

/**
 * The colour references a class string names in one mode, in source order. Only bare and
 * `dark:` classes count: a `hover:`, `md:` or `data-[…]:` face is a different state, not
 * this token's rendered pair. Several per channel, because `text-sm text-gray-700` names
 * the channel twice and only one of them is a colour.
 */
export const referencesFor = (classes: string, mode: Mode): Partial<Record<Channel, string[]>> => {
    const found: Partial<Record<Channel, string[]>> = {}
    for (const className of classes.split(/\s+/).filter(Boolean)) {
        const dark = className.startsWith('dark:')
        if (dark && mode !== 'dark') continue
        const bare = dark ? className.slice(5) : className
        if (bare.includes(':')) continue
        const channel = CHANNELS.find(candidate => bare.startsWith(`${candidate}-`))
        if (!channel) continue
        found[channel] = [...found[channel] ?? [], bare.slice(channel.length + 1)]
    }
    return found
}

// ---------------------------------------------------------------------------
// The pair inventory - data, derived from the design system
// ---------------------------------------------------------------------------

/**
 * The neutral surfaces a line of body text sits on. `page` is `bg-default`: white in light,
 * the neutral-900 rung in dark. A preset leaves them where they are: a surface is the ground
 * every other pair is measured against, so moving it moves the whole inventory at once.
 */
export const SURFACES = [
    {name: 'page', classes: 'bg-default'},
    {name: 'BG.panel', classes: BG.panel},
    {name: 'BG.panelNested', classes: BG.panelNested},
    {name: 'BG.inset', classes: BG.inset},
    {name: 'BG.ticket', classes: BG.ticket},
    {name: 'BG.invoiceGround', classes: BG.invoiceGround},
    {name: 'BG.invoiceStat', classes: BG.invoiceStat},
    {name: 'BG.budgetHead', classes: BG.budgetHead}
] as const

/** The surfaces a border, ring or outline is drawn against (1.4.11) */
const EDGE_SURFACES = SURFACES.filter(surface => surface.name === 'page' || surface.name === 'BG.panel')

/**
 * `TEXT.gray[500]` is a rung of a palette scale, not a pair: docs/ui.md calls `BG`, `TEXT`,
 * `BORDER` and `RING` "low-level builders", and a text rung carries no dark face, so measuring
 * it against a dark surface measures something nobody renders. A text rung is measured where a
 * token pairs it with a fill. Border and ring rungs stay in the edge group - being visible
 * against an unknown surface is the whole contract of an edge.
 */
const isTextRung = (path: string) => /^TEXT\.[a-z]+\.\d+$/.test(path)

/**
 * Ink the design system draws on a coloured or dark fill, never on a neutral page surface.
 * Crossing it with the page background would measure a pair nothing renders; it is measured
 * against the fill the design system pairs it with, either inside the token or via PAIRED_INK.
 */
const FILL_INK = [
    'TEXT.white', 'TEXT.black', 'TYPOGRAPHY.sectionSubheadingLight', 'TYPOGRAPHY.sectionIconLight',
    'TYPOGRAPHY.footerText', 'CALENDAR.countdown', 'CHEF_CALENDAR.countdown',
    'DINNER_CALENDAR.countdown', 'COMPONENTS.heroPanel', 'COMPONENTS.kitchenPanel', 'COMPONENTS.ribbon'
]

const isFillInk = (path: string) => FILL_INK.some(prefix => path === prefix || path.startsWith(`${prefix}.`))

/** Ink with one owner: the fill the design system draws it on */
const PAIRED_INK = [
    {ink: 'TYPOGRAPHY.footerText', fill: 'BACKGROUNDS.appShell'},
    {ink: 'TYPOGRAPHY.sectionSubheadingLight', fill: 'BACKGROUNDS.hero.mocha'},
    {ink: 'TYPOGRAPHY.sectionIconLight', fill: 'BACKGROUNDS.hero.mocha'},
    {ink: 'CALENDAR.countdown.title', fill: 'CALENDAR.countdown.container'},
    {ink: 'CALENDAR.countdown.numberPrefix', fill: 'CALENDAR.countdown.container'},
    {ink: 'CHEF_CALENDAR.countdown.accent', fill: 'CALENDAR.countdown.container'},
    {ink: 'CHEF_CALENDAR.countdown.accentLight', fill: 'CALENDAR.countdown.container'},
    {ink: 'CHEF_CALENDAR.countdown.accentMedium', fill: 'CALENDAR.countdown.container'},
    {ink: 'DINNER_CALENDAR.countdown.accent', fill: 'CALENDAR.countdown.container'},
    {ink: 'DINNER_CALENDAR.countdown.accentLight', fill: 'CALENDAR.countdown.container'},
    {ink: 'DINNER_CALENDAR.countdown.accentMedium', fill: 'CALENDAR.countdown.container'}
] as const

/** The Nuxt UI semantic slots the app maps in `app.config.ts` */
const SLOTS = Object.keys(SLOT_FAMILY)

// ---------------------------------------------------------------------------
// Scoping: which criterion a pair answers to
// ---------------------------------------------------------------------------

/**
 * 1.4.3 sets a lower bar for **large-scale text**: 18pt (24px), or 14pt bold (18.66px bold).
 * `font-semibold` is not bold: WCAG's "bold" is the 700 weight the browser draws for
 * `font-bold` and above.
 */
const TAILWIND_TEXT_PX: Record<string, number> = {
    xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36,
    '5xl': 48, '6xl': 60, '7xl': 72, '8xl': 96, '9xl': 128
}

const LARGE_TEXT_PX = 24
const LARGE_BOLD_TEXT_PX = 18.66
const BOLD_WEIGHTS = ['bold', 'extrabold', 'black']
const BREAKPOINTS = ['sm', 'md', 'lg', 'xl', '2xl']

/** One rendered size of a token: the bare classes, or a breakpoint's override of them */
export type TextFace = {at: string, px: number, bold: boolean}

/**
 * Every face a class string renders. `text-base md:text-lg font-bold` renders 16px bold up to
 * `md` and 18px bold from there, and a threshold has to hold at each - which in this codebase
 * means the bare face, since a `md:` face is always the larger one.
 */
export const textFaces = (classes: string): TextFace[] => {
    const tokens = classes.split(/\s+/).filter(Boolean)
    const read = <T>(pattern: RegExp, parse: (value: string) => T | undefined) => {
        const found = new Map<string, T>()
        for (const token of tokens) {
            const match = token.match(pattern)
            if (!match) continue
            const breakpoint = match[1] ?? ''
            if (breakpoint && !BREAKPOINTS.includes(breakpoint)) continue
            const value = parse(match[2]!)
            if (value !== undefined && !found.has(breakpoint)) found.set(breakpoint, value)
        }
        return found
    }

    const sizes = read(/^(?:([a-z0-9]+):)?text-([a-z0-9]+)$/, value => TAILWIND_TEXT_PX[value])
    const weights = read(/^(?:([a-z0-9]+):)?font-([a-z]+)$/, value => BOLD_WEIGHTS.includes(value))
    const bare = sizes.get('')
    if (bare === undefined) return []

    const faces = [...new Set(['', ...sizes.keys(), ...weights.keys()])]
    return faces.map(breakpoint => ({
        at: breakpoint || 'base',
        px: sizes.get(breakpoint) ?? bare,
        bold: weights.get(breakpoint) ?? weights.get('') ?? false
    }))
}

export const isLargeFace = ({px, bold}: TextFace) =>
    px >= LARGE_TEXT_PX || (bold && px >= LARGE_BOLD_TEXT_PX)

/** A token is large-scale text only when every face it renders is - the smallest one binds */
export const isLargeText = (classes: string): boolean => {
    const faces = textFaces(classes)
    return faces.length > 0 && faces.every(isLargeFace)
}

/** One rendered ink on a fill, and the component line that draws it */
type PlacedInk = {ink: string, at: string}

/** app/pages/index.vue:49 - the band loop draws one `TYPOGRAPHY.sectionTitle` per stop */
const SECTION_TITLE: PlacedInk[] = [{ink: 'TYPOGRAPHY.sectionTitle', at: 'index.vue:49'}]

/** app/components/dinner/KitchenPreparation.vue:200-214 - four sizes per panel, smallest binds */
const KITCHEN_INK: PlacedInk[] = [
    {ink: 'TYPOGRAPHY.kitchenLabel', at: 'KitchenPreparation.vue:200'},
    {ink: 'TYPOGRAPHY.kitchenSecondary', at: 'KitchenPreparation.vue:204'},
    {ink: 'TYPOGRAPHY.kitchenMain', at: 'KitchenPreparation.vue:209'},
    {ink: 'TYPOGRAPHY.kitchenDetail', at: 'KitchenPreparation.vue:214'}
]

/**
 * The typography a component actually places on a fill. 1.4.3 grades a pair by the size of the
 * text in it; a fill token carries no size of its own, so the threshold comes from the ink a
 * component draws on it, at that ink's smallest face. Read from the components named here - a
 * surface that changes what it carries updates this table.
 *
 * `BACKGROUNDS.landing.ticker` is left out on purpose: its words are `PANTONE_CHIPS`, which
 * bring their own fill and are measured as their own pairs, so the band's declared ink renders
 * nowhere and stays at the body bar.
 */
const INK_ON_FILL: Record<string, PlacedInk[]> = {
    // The brand rainbow. `RAINBOW` is what the landing bands and the kitchen panels both walk,
    // so a stop answers for every face its consumers draw and the smallest of them binds: the
    // kitchen's 12px label puts the first three stops at the body bar, while bonbon and party
    // carry the landing band's large title alone
    'RAINBOW[0]': [...SECTION_TITLE, ...KITCHEN_INK],
    'RAINBOW[1]': [...SECTION_TITLE, ...KITCHEN_INK],
    'RAINBOW[2]': [...SECTION_TITLE, ...KITCHEN_INK],
    'RAINBOW[3]': SECTION_TITLE,
    'RAINBOW[4]': SECTION_TITLE,
    'BACKGROUNDS.hero.mocha': [
        // app/components/dinner/DinnerDetailHeader.vue:65-78, app/components/chef/ChefMenuCard.vue:418
        {ink: 'TYPOGRAPHY.bodyTextMedium', at: 'DinnerDetailHeader.vue:74'},
        {ink: 'TYPOGRAPHY.heroTitle', at: 'Hero.vue:7'}
    ],
    'BACKGROUNDS.hero.pink': [...SECTION_TITLE, ...KITCHEN_INK],
    'BACKGROUNDS.hero.orange': [...SECTION_TITLE, ...KITCHEN_INK],
    'BACKGROUNDS.hero.ocean': [...SECTION_TITLE, ...KITCHEN_INK],
    'BACKGROUNDS.hero.bonbon': SECTION_TITLE,
    // The spare stop and the countdown fill are drawn by no component today; each is graded by
    // the typography docs/ui.md pairs it with. The day a component puts body text on one, that
    // component belongs in its row
    'BACKGROUNDS.hero.party': SECTION_TITLE,
    'BACKGROUNDS.hero.peach': [{ink: 'TYPOGRAPHY.heroTitle', at: 'docs/ui.md "The brand rainbow"'}],
    // app/components/landing/Hero.vue:7
    'BACKGROUNDS.landing.titleBar': [{ink: 'TYPOGRAPHY.heroTitle', at: 'Hero.vue:7'}],
    ...Object.fromEntries(['TAKEAWAY', 'DINEIN', 'DINEINLATE', 'RELEASED']
        .map(mode => [`COMPONENTS.kitchenPanel.${mode}`, KITCHEN_INK]))
}

/**
 * 1.4.11 covers the edges that identify a UI component or carry meaning in a graphic. These
 * draw a boundary the eye reads as depth, and each names something the layout already says,
 * so a member who cannot see the line loses nothing:
 *
 * | Token | Why it is out of 1.4.11 |
 * |---|---|
 * | `LAYOUTS.sectionDivider` | A rule between page sections; the heading and the gap separate them |
 * | `LAYOUTS.panelDivider` | The rule above a detail panel's action row; the buttons carry their own edges |
 * | `COMPONENTS.economyTable.level{1,2,3}.border` | The nesting tint of a tree row, alongside the row's indentation, icon and heading |
 * | `COMPONENTS.economyTable.level{1,2,3}.header` / `.footer` / `.statBox` / `.tableHead` | Banding of a table's own header, footer and stat boxes - a surface, measured for its ink in the text groups |
 *
 * The edges that stay: input and card borders, the green holiday ring, the amber and red
 * deadline rings, the segmented-control ring, the calendar selection outlines - each is the
 * only thing that says where a control is or what a day means.
 */
const DECORATIVE_EDGES = [
    'LAYOUTS.sectionDivider',
    'LAYOUTS.panelDivider',
    'COMPONENTS.economyTable.level1.border',
    'COMPONENTS.economyTable.level2.border',
    'COMPONENTS.economyTable.level3.border',
    'COMPONENTS.economyTable.level1.header',
    'COMPONENTS.economyTable.level1.footer',
    'COMPONENTS.economyTable.level1.statBox',
    'COMPONENTS.economyTable.level1.tableHead',
    'COMPONENTS.economyTable.level2.header',
    'COMPONENTS.economyTable.level2.footer',
    'COMPONENTS.economyTable.level2.statBox',
    'COMPONENTS.economyTable.level2.tableHead',
    'COMPONENTS.economyTable.level3.header',
    'COMPONENTS.economyTable.level3.footer',
    'COMPONENTS.economyTable.level3.statBox'
]

export const isDecorativeEdge = (path: string) => DECORATIVE_EDGES.includes(path)

export type Level = 'AA' | 'AAA'

export type Pair = {
    group: string
    mode: Mode
    name: string
    key: string
    threshold: number
    ratio: number
    /** The ink or edge of the pair, and the variable a preset moves to change it */
    ink: Sourced
    /** The opaque ground it is measured against */
    fill: {colour: Rgb, source: PaletteRef | null}
}

/** 1.4.3 body text; large-scale text drops one level (3:1 at AA, 4.5:1 at AAA) */
const TEXT_THRESHOLD: Record<Level, {body: number, large: number}> = {
    AA: {body: 4.5, large: 3},
    AAA: {body: 7, large: 4.5}
}

/** 1.4.11 Non-text Contrast has no enhanced level - 3:1 at every palette */
const EDGE_THRESHOLD = 3

/** The last reference on this channel that names a colour (`text-sm text-gray-700` → grey) */
export const pickColour = (
    resolve: ReturnType<typeof createResolver>, classes: string, channel: Channel, mode: Mode
): Sourced | null =>
    (referencesFor(classes, mode)[channel] ?? [])
        .map(reference => resolve(reference, channel, mode))
        .filter((resolved): resolved is Sourced => resolved !== null)
        .at(-1) ?? null

export const buildPairs = (override: PaletteOverride, level: Level): Pair[] => {
    const pairs: Pair[] = []

    for (const mode of MODES) {
        const resolve = createResolver(override[mode])

        const pick = (classes: string, channel: Channel, mode_: Mode): Sourced | null =>
            pickColour(resolve, classes, channel, mode_)

        const surfaceOf = (classes: string, mode_: Mode): {colour: Rgb, source: PaletteRef | null} | null => {
            const page = resolve('default', 'bg', mode_)
            if (!page) return null
            const own = pick(classes, 'bg', mode_)
            return own
                ? {colour: composite(own.colour, page.colour), source: own.source}
                : {colour: page.colour, source: page.source}
        }

        /**
         * The named surfaces, with the ones that resolve to the same colour folded into the first
         * name that carries it: `BG.panel`, `BG.invoiceGround` and `BG.budgetHead` are all
         * `neutral-50` in light, and three identical cases say the same thing three times.
         */
        const distinctSurfaces = (surfaces: readonly {name: string, classes: string}[], mode_: Mode) => {
            const seen = new Map<string, {name: string, colour: Rgb, source: PaletteRef | null}>()
            for (const surface of surfaces) {
                const resolved = surfaceOf(surface.classes, mode_)
                if (!resolved) continue
                const key = [resolved.colour.r, resolved.colour.g, resolved.colour.b].map(Math.round).join(',')
                if (!seen.has(key)) seen.set(key, {name: surface.name, ...resolved})
            }
            return [...seen.values()]
        }

        const add = (
            group: string, name: string, key: string, ink: Sourced,
            fill: {colour: Rgb, source: PaletteRef | null}, threshold: number
        ) => pairs.push({
            group, mode, name, key, threshold, ink, fill,
            ratio: contrastRatio(composite(ink.colour, fill.colour), fill.colour)
        })

        /** 1.4.3, at the level this palette promises, for the size the token draws */
        const textThreshold = (classes: string) =>
            TEXT_THRESHOLD[level][isLargeText(classes) ? 'large' : 'body']

        /**
         * 1.4.3 for a fill: the size comes from the ink a component places on it. Every face of
         * every placed ink has to clear the bar, so the smallest one sets it, and the pair says
         * which ink and which face that is.
         */
        const placedInk = (path: string) => {
            const placed = INK_ON_FILL[path]
            if (!placed?.length) return null
            const faces = placed.flatMap(({ink}) =>
                textFaces(leafByPath.get(ink)?.classes ?? '').map(face => ({ink, face})))
            if (!faces.length) return null
            const smallest = faces.reduce((worst, candidate) =>
                isLargeFace(candidate.face) && !isLargeFace(worst.face) ? worst
                    : candidate.face.px < worst.face.px ? candidate : worst)
            return {
                threshold: TEXT_THRESHOLD[level][faces.every(({face}) => isLargeFace(face)) ? 'large' : 'body'],
                governedBy: `${smallest.ink} @${smallest.face.at} ${smallest.face.px}px${smallest.face.bold ? ' bold' : ''}`
            }
        }

        const textSurfaces = distinctSurfaces(SURFACES, mode)
        const edgeSurfaces = distinctSurfaces(EDGE_SURFACES, mode)

        // 1 - body text on the neutral surfaces of the app (1.4.3)
        for (const leaf of LEAVES) {
            if (isFillInk(leaf.path) || isTextRung(leaf.path)) continue
            const ink = pick(leaf.classes, 'text', mode)
            if (!ink || pick(leaf.classes, 'bg', mode)) continue
            for (const surface of textSurfaces) {
                add('text on surface', `${leaf.path} on ${surface.name}`,
                    `${mode}|${leaf.path}|${surface.name}`, ink, surface, textThreshold(leaf.classes))
            }
        }

        // 1b - a token that carries both its ink and its fill states its own pair, graded by
        //      the text a component places on it where the fill names no size of its own
        for (const leaf of LEAVES) {
            const ink = pick(leaf.classes, 'text', mode)
            const bg = pick(leaf.classes, 'bg', mode) && surfaceOf(leaf.classes, mode)
            if (!ink || !bg) continue
            const placed = textFaces(leaf.classes).length ? null : placedInk(leaf.path)
            add('paired token', `${leaf.path} (own fill${placed ? `, ${placed.governedBy}` : ''})`,
                `${mode}|${leaf.path}|self`, ink, bg, placed?.threshold ?? textThreshold(leaf.classes))
        }

        // 1c - ink with one owner: the fill the design system draws it on
        for (const {ink: inkPath, fill: fillPath} of PAIRED_INK) {
            const inkLeaf = leafByPath.get(inkPath)
            const fillLeaf = leafByPath.get(fillPath)
            if (!inkLeaf || !fillLeaf) continue
            const ink = pick(inkLeaf.classes, 'text', mode)
            const bg = surfaceOf(fillLeaf.classes, mode)
            if (ink && bg) add('paired token', `${inkPath} on ${fillPath}`,
                `${mode}|${inkPath}|${fillPath}`, ink, bg, textThreshold(inkLeaf.classes))
        }

        // 2 - borders, rings and outlines against the surface they sit on (1.4.11).
        //     A token that brings its own fill is skipped: its edge meets that fill's
        //     neighbour, which the token does not name. A decorative edge is skipped too.
        for (const leaf of LEAVES) {
            if (pick(leaf.classes, 'bg', mode) || isDecorativeEdge(leaf.path)) continue
            for (const channel of ['border', 'ring', 'outline'] as const) {
                const edge = pick(leaf.classes, channel, mode)
                if (!edge) continue
                for (const surface of edgeSurfaces) {
                    add('edge on surface', `${leaf.path} (${channel}) on ${surface.name}`,
                        `${mode}|${leaf.path}|${channel}|${surface.name}`, edge, surface, EDGE_THRESHOLD)
                }
            }
        }

        // 2b - the economy tree's own header fills have to read as surfaces against the page
        for (const leaf of LEAVES.filter(candidate => candidate.path.startsWith('COMPONENTS.economyTable'))) {
            if (isDecorativeEdge(leaf.path)) continue
            const fill = pick(leaf.classes, 'bg', mode)
            const page = surfaceOf('bg-default', mode)
            if (fill && page) add('edge on surface', `${leaf.path} (fill) on page`,
                `${mode}|${leaf.path}|fill|page`, fill, page, EDGE_THRESHOLD)
        }

        // 3 - the Nuxt UI semantic slots: `text-<slot>` on the page and on the soft
        //     `bg-<slot>/10` surface (ALERTS/badges), `text-inverted` on the solid fill
        for (const slot of SLOTS) {
            const ink = resolve(slot, 'text', mode)
            const fill = resolve(slot, 'bg', mode)
            const inverted = resolve('inverted', 'text', mode)
            const page = surfaceOf('bg-default', mode)
            if (!ink || !fill || !inverted || !page) continue
            add('semantic slot', `text-${slot} on page`, `${mode}|slot.${slot}|page`,
                ink, page, TEXT_THRESHOLD[level].body)
            add('semantic slot', `text-${slot} on bg-${slot}/10`, `${mode}|slot.${slot}|soft`,
                ink, {colour: composite({...fill.colour, alpha: 0.1}, page.colour), source: fill.source},
                TEXT_THRESHOLD[level].body)
            add('semantic slot', `text-inverted on bg-${slot}`, `${mode}|slot.${slot}|solid`,
                inverted, {colour: composite(fill.colour, page.colour), source: fill.source},
                TEXT_THRESHOLD[level].body)
        }
    }

    return pairs
}

export const round = (ratio: number) => Math.round(ratio * 100) / 100

/** A pair meets its threshold at the precision the report prints */
export const meetsThreshold = (pair: Pair) => round(pair.ratio) >= pair.threshold
