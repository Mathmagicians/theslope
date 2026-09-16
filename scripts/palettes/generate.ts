/**
 * Palette preset generator - `app/assets/css/palettes/tydelig.css`.
 *
 *     npx jiti scripts/palettes/generate.ts
 *
 * Tydelig is TheSlope's own hues at a lightness that meets EN 301 549 → WCAG 2.1 AA. The
 * generator reads the pair inventory of `tests/component/architecture/designSystemPairs.ts`
 * - the same inventory `designSystemContrast.unit.spec.ts` asserts - and walks every failing
 * pair's `--color-<family>-<step>` along OKLCH lightness, hue and chroma held, until the pair
 * meets its threshold. A step moves away from what it is measured against: ink on a page goes
 * darker in light mode and lighter in dark mode, and a fill that carries white ink darkens.
 *
 * The neutral surfaces (`page`, `BG.panel`, `BG.panelNested`, `BG.inset`, `BG.ticket`,
 * `BG.invoiceGround`, `BG.invoiceStat`, `BG.budgetHead`) are held: a surface is the ground
 * every other pair stands on, so moving one moves the whole inventory at once.
 *
 * Two runs produce byte-identical output: the walk starts from the published palette, takes a
 * fixed step, and visits the pairs in the order the inventory lists them.
 */

import {mkdirSync, writeFileSync} from 'node:fs'
import {
    APP_SCALES, MODES, NO_OVERRIDE, SURFACES, TAILWIND_SCALES, buildPairs, meetsThreshold, repoPath, round,
    type Level, type Mode, type ModeScales, type PaletteRef, type Pair
} from '../../tests/component/architecture/designSystemPairs'
import {
    composite, contrastRatio, hexToRgb, oklchToRgb, relativeLuminance, rgbToOklch, withLightness,
    type ColourScales
} from '../../tests/component/architecture/contrast'

const PALETTE = 'tydelig'
const LEVEL: Level = 'AA'
const OUTPUT = `app/assets/css/palettes/${PALETTE}.css`

/** Bumped when the preset is regenerated, so a rerun that changes nothing changes no byte */
const GENERATED_ON = '2026-09-16'

const LIGHTNESS_RANGE = {min: 0.02, max: 0.99}
const MAX_ROUNDS = 30

/** Aim this far past the threshold, to absorb the 8-bit hex and the surfaces that move with the ink */
const SOLVE_MARGIN = 0.15

// ---------------------------------------------------------------------------
// The variables the preset may move
// ---------------------------------------------------------------------------

type StepKey = string

const stepKey = (mode: Mode, reference: PaletteRef): StepKey => `${mode}|${reference.family}|${reference.step}`

const baseHex = ({family, step}: PaletteRef): string | undefined =>
    APP_SCALES[family]?.[step] ?? TAILWIND_SCALES[family]?.[step]

/**
 * The surface variables, read off the inventory: a pair of the two surface groups is measured
 * against a named surface, so its fill is one. Held at their published value.
 */
const surfaceKeys = (pairs: Pair[]): Set<StepKey> => new Set(
    pairs.filter(pair => pair.group === 'text on surface' || pair.group === 'edge on surface')
        .map(pair => pair.fill.source && stepKey(pair.mode, pair.fill.source))
        .filter((key): key is StepKey => key !== null)
)

/** The surfaces by name, for the run report */
const surfaceNames = SURFACES.map(surface => surface.name).join(', ')

// ---------------------------------------------------------------------------
// The walk
// ---------------------------------------------------------------------------

/** `light|amber|500` → the lightness the preset currently publishes for it */
type Lightness = Map<StepKey, number>

const toScales = (lightness: Lightness): ModeScales => {
    const scales: ModeScales = {light: {}, dark: {}}
    for (const [key, value] of lightness) {
        const [mode, family, step] = key.split('|') as [Mode, string, string]
        const hex = baseHex({family, step})
        if (!hex) continue
        scales[mode][family] ??= {}
        scales[mode][family]![step] = withLightness(hex, value)
    }
    // A light-block declaration also applies in dark mode - the dark scale is the layered one
    for (const [family, steps] of Object.entries(scales.light)) {
        scales.dark[family] = {...steps, ...scales.dark[family]}
    }
    return scales
}

// ---------------------------------------------------------------------------
// What one pair asks of one variable
// ---------------------------------------------------------------------------

/**
 * One `--color-*` variable, one pair: the ratio the pair measures when the variable publishes
 * `lightness`, the bar to clear, and the only direction the variable may take to clear it.
 */
type Constraint = {
    pair: Pair
    threshold: number
    downwards: boolean
    ratioAt: (lightness: number) => number
}

const BISECTIONS = 40

/** The value on the `holds` side of the crossing between `holds(low)` and `!holds(high)` */
const bisect = (low: number, high: number, holds: (value: number) => boolean): number => {
    let [lower, upper] = [low, high]
    for (let step = 0; step < BISECTIONS; step++) {
        const middle = (lower + upper) / 2
        if (holds(middle)) lower = middle
        else upper = middle
    }
    return lower
}

/**
 * The lightness this constraint needs, or `null` when the range does not reach it: the darkest
 * value that still clears the bar when the variable walks down, the lightest when it walks up.
 * The aim is past the bar by the margin, because a soft `bg-<slot>/10` surface moves with the
 * ink that sits on it and the emitted value is a byte, so the exact crossing lands a hair short.
 */
const required = (constraint: Constraint): number | null => {
    const {min, max} = LIGHTNESS_RANGE
    const clears = (value: number) => constraint.ratioAt(value) >= constraint.threshold + SOLVE_MARGIN
    const end = constraint.downwards ? min : max
    return clears(end) ? bisect(end, constraint.downwards ? max : min, clears) : null
}

/**
 * The lightness one variable publishes. Every pair it takes part in - the ones that pass today
 * included, so a preset never trades one pair for another - asks it to be dark enough or light
 * enough, and a variable walks one way: the way more of its pairs ask for. It goes no further
 * than it must, because Tydelig is TheSlope's palette with the lightness turned up, not a new one.
 */
const solveVariable = (constraints: Constraint[], published: number): number => {
    const walk = (downwards: boolean) => {
        const asked = constraints.filter(constraint => constraint.downwards === downwards)
            .map(required).filter((value): value is number => value !== null)
        return asked.reduce((far, value) => (downwards ? Math.min(far, value) : Math.max(far, value)), published)
    }
    const satisfied = (value: number) =>
        constraints.filter(constraint => round(constraint.ratioAt(value)) >= constraint.threshold).length

    const [downwards, upwards] = [walk(true), walk(false)]
    const [down, up] = [satisfied(downwards), satisfied(upwards)]
    if (down !== up) return down > up ? downwards : upwards
    return Math.abs(downwards - published) <= Math.abs(upwards - published) ? downwards : upwards
}

// ---------------------------------------------------------------------------
// Solving the palette
// ---------------------------------------------------------------------------

/**
 * Which way the two colours of a pair separate. Each keeps the side it is on - a dark ink goes
 * darker, a light ink goes lighter - so a scale stays a scale: `pink-50` on `bg-pink-500` is
 * answered by darkening the fill, never by turning the lightest rung of pink black. Two colours
 * of near-equal luminance have no side, and take the end of the range with the headroom: a grey
 * border on a dark page reaches 13:1 white and 1.6:1 black.
 */
const INDISTINCT = 0.02

const separation = (pair: Pair): boolean => {
    const ink = composite(pair.ink.colour, pair.fill.colour)
    const difference = relativeLuminance(ink) - relativeLuminance(pair.fill.colour)
    if (Math.abs(difference) > INDISTINCT) return difference < 0

    const {chroma, hue} = rgbToOklch(ink)
    const at = (lightness: number) => contrastRatio(oklchToRgb(lightness, chroma, hue), pair.fill.colour)
    return at(LIGHTNESS_RANGE.min) > at(LIGHTNESS_RANGE.max)
}

/**
 * How a pair reads when one side publishes another lightness, the other side held. The hue and
 * the chroma come from the *published* hex, because that is what the emitted stylesheet carries:
 * reading them off the already-moved colour would solve for a swatch the file never writes.
 */
const constraintFor = (pair: Pair, asInk: boolean): Constraint => {
    const source = asInk ? pair.ink.source! : pair.fill.source!
    const {chroma, hue} = rgbToOklch(hexToRgb(baseHex(source)!))
    const shifted = (lightness: number) => oklchToRgb(lightness, chroma, hue)
    const inkDownwards = separation(pair)
    return {
        pair,
        threshold: pair.threshold,
        downwards: asInk ? inkDownwards : !inkDownwards,
        ratioAt: asInk
            ? lightness => contrastRatio(
                composite({...shifted(lightness), alpha: pair.ink.colour.alpha}, pair.fill.colour), pair.fill.colour)
            : lightness => contrastRatio(composite(pair.ink.colour, shifted(lightness)), shifted(lightness))
    }
}

const solve = () => {
    const held = surfaceKeys(buildPairs(NO_OVERRIDE, LEVEL))
    const lightness: Lightness = new Map()

    /** The lightness the published palette carries for a variable */
    const publishedLightness = (key: StepKey): number | undefined => {
        const [, family, step] = key.split('|') as [Mode, string, string]
        const hex = baseHex({family, step})
        return hex ? rgbToOklch(hexToRgb(hex)).lightness : undefined
    }

    /**
     * Both sides of a pair answer for it - the ink and the fill, whichever of them a preset may
     * move. One of them usually can: a slot's solid face has `text-inverted` for ink, a page has
     * a held surface for fill, and a light ink on a brand fill is answered by its fill.
     */
    const constraintsByVariable = (pairs: Pair[]) => {
        const byVariable = new Map<StepKey, Constraint[]>()
        const add = (key: StepKey, constraint: Constraint) =>
            byVariable.set(key, [...byVariable.get(key) ?? [], constraint])
        for (const pair of pairs) {
            const inkKey = pair.ink.source && stepKey(pair.mode, pair.ink.source)
            const fillKey = pair.fill.source && stepKey(pair.mode, pair.fill.source)
            if (inkKey && !held.has(inkKey)) add(inkKey, constraintFor(pair, true))
            if (fillKey && fillKey !== inkKey && !held.has(fillKey)) add(fillKey, constraintFor(pair, false))
        }
        return byVariable
    }

    /**
     * The best palette any round reached is the one that is published, so a round that trades one
     * pair for another is not the one that wins.
     */
    let best = {lightness: new Map(lightness), passing: -1}
    let roundsUsed = 0
    for (let round = 0; round < MAX_ROUNDS; round++) {
        const byVariable = constraintsByVariable(buildPairs(toScales(lightness), LEVEL))

        // Every variable is written, the unchanged ones included: a dark variable that stays at
        // its published lightness still has to say so, or it inherits the light block's move
        for (const key of [...byVariable.keys()].sort()) {
            const published = publishedLightness(key)
            if (published === undefined) continue
            lightness.set(key, solveVariable(byVariable.get(key)!, published))
        }

        const pairs = buildPairs(toScales(lightness), LEVEL)
        const passing = pairs.filter(meetsThreshold).length
        roundsUsed = round + 1
        if (passing > best.passing) best = {lightness: new Map(lightness), passing}
        if (passing === pairs.length) break
    }

    const solved = best.lightness
    return {
        lightness: solved,
        failing: buildPairs(toScales(solved), LEVEL).filter(pair => !meetsThreshold(pair)),
        roundsUsed
    }
}

// ---------------------------------------------------------------------------
// Emitting
// ---------------------------------------------------------------------------

const byStep = (a: string, b: string) => Number(a) - Number(b)

/**
 * One `html[data-palette]` block. A step whose value equals what the previous layer already
 * carries is left out - and a dark step that equals the *published* value is still written,
 * because the light block applies in dark mode too and this is what takes it back.
 */
const block = (selector: string, scales: ColourScales, previous: ColourScales) => {
    const lines = Object.keys(scales).sort().flatMap(family =>
        Object.keys(scales[family]!).sort(byStep)
            .filter(step => scales[family]![step] !== previous[family]?.[step])
            .map(step => `    --color-${family}-${step}: ${scales[family]![step]};`)
    )
    return {css: `${selector} {\n${lines.join('\n')}\n}`, count: lines.length}
}

const publishedScales = (): ColourScales => {
    const published: ColourScales = {}
    for (const [family, steps] of Object.entries({...TAILWIND_SCALES, ...APP_SCALES})) published[family] = steps
    return published
}

const emit = (scales: ModeScales) => {
    const published = publishedScales()
    const header = [
        '/*',
        ' * Tydelig - the AA palette preset. GENERATED by scripts/palettes/generate.ts; edits are overwritten.',
        ' *',
        ` * Generated ${GENERATED_ON} against EN 301 549 → WCAG 2.1: 4.5:1 body text and 3:1 large-scale`,
        ' * text (1.4.3 AA), 3:1 borders, rings and UI boundaries (1.4.11 AA). The hues and the chroma are',
        ' * TheSlope\'s published palette; only OKLCH lightness moves, and the neutral surfaces stay put.',
        ' *',
        ` * Run: npx jiti scripts/palettes/generate.ts     # rewrites ${OUTPUT}`,
        ' */',
        ''
    ].join('\n')

    const light = block(`html[data-palette="${PALETTE}"]`, scales.light, published)
    const dark = block(`html.dark[data-palette="${PALETTE}"]`, scales.dark, scales.light)

    mkdirSync(repoPath('app/assets/css/palettes'), {recursive: true})
    writeFileSync(repoPath(OUTPUT), `${header}\n${light.css}\n\n${dark.css}\n`, 'utf8')
    return {light: light.count, dark: dark.count}
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const groupCounts = (pairs: Pair[]) => [...new Set(pairs.map(pair => pair.group))]
    .map(group => {
        const cases = pairs.filter(pair => pair.group === group)
        return `    ${group}: ${cases.length} pairs, ${cases.filter(meetsThreshold).length} pass`
    })

const base = buildPairs(NO_OVERRIDE, LEVEL)
const {lightness, failing, roundsUsed} = solve()
const scales = toScales(lightness)
const solved = buildPairs(scales, LEVEL)
const written = emit(scales)

const report = [
    `👨‍💻 > [PALETTE] > [${PALETTE}] ${LEVEL}, surfaces held: ${surfaceNames}`,
    `👨‍💻 > [PALETTE] > [base] ${base.length} pairs, ${base.filter(meetsThreshold).length} pass`,
    ...groupCounts(base),
    `👨‍💻 > [PALETTE] > [${PALETTE}] ${solved.length} pairs, ${solved.filter(meetsThreshold).length} pass`,
    ...groupCounts(solved),
    `👨‍💻 > [PALETTE] > [${PALETTE}] steps published after ${roundsUsed} rounds`,
    ...MODES.map(mode => `    ${mode} block: ${written[mode]} steps`),
    `👨‍💻 > [PALETTE] > [${PALETTE}] wrote ${OUTPUT}`
]
report.forEach(line => console.info(line))

if (failing.length) {
    console.warn(`👨‍💻 > [PALETTE] > [${PALETTE}] ${failing.length} pairs the palette cannot reach:`)
    for (const pair of failing) {
        const ink = pair.ink.source ? `${pair.ink.source.family}-${pair.ink.source.step}` : 'no palette variable'
        const fill = pair.fill.source ? `${pair.fill.source.family}-${pair.fill.source.step}` : 'no palette variable'
        console.warn(`    ${pair.mode}: ${pair.name} — ${round(pair.ratio)}:1 of ${pair.threshold} (ink ${ink}, fill ${fill})`)
    }
}

// The white-on-white guard: a walk that lands on the surface it is measured against is a bug
const degenerate = solved.filter(pair => round(contrastRatio(pair.ink.colour, pair.fill.colour)) === 1)
if (degenerate.length) console.warn(`👨‍💻 > [PALETTE] > [${PALETTE}] ${degenerate.length} pairs collapsed to 1:1`)
