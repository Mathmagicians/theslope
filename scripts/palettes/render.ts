/**
 * Palette preset renderer - the stylesheet text of `app/assets/css/palettes/*.css`.
 *
 * Pure and deterministic: `renderPreset(preset)` returns the file a preset publishes and touches
 * no disk, so `scripts/palettes/generate.ts` writes it and
 * `tests/component/architecture/designSystemContrast.unit.spec.ts` compares the committed file
 * against it. A preset is two passes over the same inventory:
 *
 * 1. **The hue map** (optional). Each meaning-bearing family takes a named anchor: the anchor's
 *    OKLCH hue and chroma, the published family's lightness ladder rung by rung, chroma clamped
 *    to the sRGB gamut per rung. A family that is also a brand band publishes the anchor on the
 *    Nuxt UI slot instead (`--ui-color-<slot>-<step>`), so the meaning moves and the band does not.
 * 2. **The AA walk** (every preset). The generator reads the pair inventory of
 *    `tests/component/architecture/designSystemPairs.ts` - the same inventory
 *    `designSystemContrast.unit.spec.ts` asserts - and walks every failing pair's step along OKLCH
 *    lightness, hue and chroma held, until the pair meets its threshold. A step moves away from
 *    what it is measured against: ink on a page goes darker in light mode and lighter in dark mode,
 *    and a fill that carries white ink darkens.
 *
 * The neutral surfaces (`page`, `BG.panel`, `BG.panelNested`, `BG.inset`, `BG.ticket`,
 * `BG.invoiceGround`, `BG.invoiceStat`, `BG.budgetHead`) are held: a surface is the ground
 * every other pair stands on, so moving one moves the whole inventory at once.
 *
 * Before the walk, the preset re-points the Nuxt UI semantic slots whose solid face cannot carry
 * a white label at the rung Nuxt UI points them at, by emitting `--ui-<slot>`. That takes the
 * button's demand off the 500 rung the brand paints with, so the walk answers the bands and the
 * chips at 500 and the buttons at 600.
 *
 * Two runs produce byte-identical output: the hue map is arithmetic on published values, and the
 * walk starts from that base, takes a fixed step, and visits the pairs in the order the inventory
 * lists them.
 */

import {
    APP_SCALES, MODES, NO_OVERRIDE, SURFACES, TAILWIND_SCALES, buildPairs, meetsThreshold, round,
    type Mode, type PaletteOverride, type PaletteRef, type Pair
} from '../../tests/component/architecture/designSystemPairs'
import {
    clampChromaToGamut, composite, contrastRatio, hexToRgb, oklchToRgb, relativeLuminance, rgbToHex, rgbToOklch,
    withLightness, type ColourScales, type ModeOverride, type SlotRungs
} from '../../tests/component/architecture/contrast'
import {paletteFile, type Anchor, type Preset} from './presets'


const LIGHTNESS_RANGE = {min: 0.02, max: 0.99}
const MAX_ROUNDS = 30

/** Aim this far past the threshold, to absorb the 8-bit hex and the surfaces that move with the ink */
const SOLVE_MARGIN = 0.15

// ---------------------------------------------------------------------------
// The hue map: an anchor becomes a full scale
// ---------------------------------------------------------------------------

const publishedScale = (family: string): Record<string, string> | undefined =>
    APP_SCALES[family] ?? TAILWIND_SCALES[family]

/**
 * The anchor as a 50-950 scale: every rung keeps the anchor's hue, takes the published rung's
 * lightness, and takes the anchor's chroma where sRGB can show it. A pale rung has no room for
 * the anchor's chroma, so it gives chroma up rather than hue - which is what the eye reads as
 * "the same colour, lighter".
 */
const anchoredLightness = (hex: string, lightness: number): string => {
    const {chroma, hue} = rgbToOklch(hexToRgb(hex))
    return rgbToHex(oklchToRgb(lightness, clampChromaToGamut(lightness, chroma, hue), hue))
}

const anchorScale = ({hex, ladder}: Anchor): Record<string, string> => Object.fromEntries(
    Object.entries(publishedScale(ladder) ?? {})
        .map(([step, published]) => [step, anchoredLightness(hex, rgbToOklch(hexToRgb(published)).lightness)])
)

// ---------------------------------------------------------------------------
// The walk
// ---------------------------------------------------------------------------

type StepKey = string

const stepKey = (mode: Mode, reference: PaletteRef): StepKey => `${mode}|${reference.family}|${reference.step}`

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

/**
 * A solid button is `text-inverted` on `bg-<slot>`, body text at 4.5:1. Where the rung Nuxt UI
 * points a slot at cannot carry that label, the preset moves the *slot* rather than the rung:
 * the 500 rung also paints the landing bands and the Pantone chips, and dragging it down to
 * answer a white button label darkens the whole brand with it. So `--ui-<slot>` re-points one
 * rung deeper in light, and its mirror in dark, where `text-inverted` is dark ink and the fill
 * has to lift instead. Nuxt UI's colours plugin publishes 500 / 400; the preset publishes 600 / 300.
 */
const REPOINTED_RUNG: Record<Mode, string> = {light: '600', dark: '300'}

/** `light|amber|500` → the lightness the preset currently publishes for it */
type Lightness = Map<StepKey, number>

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
 * than it must, because a preset is TheSlope's palette with the lightness turned up, not a new one.
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

// ---------------------------------------------------------------------------
// Emitting
// ---------------------------------------------------------------------------

const byStep = (a: string, b: string) => Number(a) - Number(b)

/**
 * One `html[data-palette]` block: the steps it redeclares, then the slots it re-points. A step
 * whose value equals what the previous layer already carries is left out - and a dark step that
 * equals the *published* value is still written, because the light block applies in dark mode
 * too and this is what takes it back. The slot lines are written in both blocks for the same
 * reason: the dark block's mirror has to override the light block's rung.
 *
 * A slot family publishes `--ui-color-<slot>-<step>`, the variable Nuxt UI's colours plugin
 * points the slot's Tailwind scale at, and its lines follow the `--color-*` ones.
 */
const block = (selector: string, override: ModeOverride, previous: ColourScales, slotFamilies: Set<string>) => {
    const declarations = (families: string[], variable: (family: string) => string) => families.flatMap(family =>
        Object.keys(override.scales[family]!).sort(byStep)
            .filter(step => override.scales[family]![step] !== previous[family]?.[step])
            .map(step => `    ${variable(family)}-${step}: ${override.scales[family]![step]};`)
    )
    const families = Object.keys(override.scales).sort()
    const steps = [
        ...declarations(families.filter(family => !slotFamilies.has(family)), family => `--color-${family}`),
        ...declarations(families.filter(family => slotFamilies.has(family)), family => `--ui-color-${family}`)
    ]
    const slots = Object.keys(override.slots).sort()
        .map(slot => `    --ui-${slot}: var(--ui-color-${slot}-${override.slots[slot]});`)
    return {css: `${selector} {\n${[...steps, ...slots].join('\n')}\n}`, steps: steps.length, slots: slots.length}
}

const publishedScales = (): ColourScales => {
    const published: ColourScales = {}
    for (const [family, steps] of Object.entries({...TAILWIND_SCALES, ...APP_SCALES})) published[family] = steps
    return published
}

// ---------------------------------------------------------------------------
// One preset
// ---------------------------------------------------------------------------

/** The stylesheet a preset publishes, and what the CLI says about the run that produced it */
export type RenderedPreset = {css: string, report: string[], warnings: string[]}

/**
 * Solve a preset and render its stylesheet. No I/O and no clock: the same preset renders the same
 * bytes on every run, which is what lets a spec compare the committed file against it.
 */
export const solvePreset = (preset: Preset): RenderedPreset => {
    const {name, level, generatedOn, hues} = preset
    const output = paletteFile(name)
    const slotFamilies = new Set(Object.keys(hues).filter(family => hues[family]!.as === 'slot'))

    /** The hue map as a scale per family - the palette the walk starts from */
    const hueBase: ColourScales = Object.fromEntries(
        Object.entries(hues).map(([family, anchor]) => [family, anchorScale(anchor)])
    )

    const baseHex = ({family, step}: PaletteRef): string | undefined =>
        hueBase[family]?.[step] ?? publishedScale(family)?.[step]

    const slotRungs = (mode: Mode, repointed: string[]): SlotRungs =>
        Object.fromEntries(repointed.map(slot => [slot, REPOINTED_RUNG[mode]]))

    const hueOverride: PaletteOverride = {
        light: {scales: hueBase, slots: {}},
        dark: {scales: hueBase, slots: {}}
    }

    /** Every pair of the hue-mapped palette - the baseline the re-pointing and the report read */
    const basePairs = buildPairs(hueOverride, level)

    const repointedSlots = [...new Set(basePairs
        .filter(pair => pair.mode === 'light' && pair.group === 'semantic slot'
            && pair.key.endsWith('|solid') && !meetsThreshold(pair))
        .map(pair => pair.key.split('|')[1]!.replace(/^slot\./, '')))].sort()

    const toScales = (lightness: Lightness): PaletteOverride => {
        const override: PaletteOverride = {
            light: {scales: structuredClone(hueBase), slots: slotRungs('light', repointedSlots)},
            dark: {scales: structuredClone(hueBase), slots: slotRungs('dark', repointedSlots)}
        }
        for (const [key, value] of lightness) {
            const [mode, family, step] = key.split('|') as [Mode, string, string]
            const hex = baseHex({family, step})
            if (!hex) continue
            override[mode].scales[family] ??= {}
            // A hue-mapped rung answers for a meaning, so it gives up chroma rather than let a
            // clipped channel bend it off its anchor; a published rung keeps its own hue anyway
            override[mode].scales[family]![step] = hueBase[family]
                ? anchoredLightness(hex, value)
                : withLightness(hex, value)
        }
        // A light-block declaration also applies in dark mode - the dark scale is the layered one
        for (const [family, steps] of Object.entries(override.light.scales)) {
            override.dark.scales[family] = {...steps, ...override.dark.scales[family]}
        }
        return override
    }

    /**
     * How a pair reads when one side publishes another lightness, the other side held. The hue and
     * the chroma come from the *base* hex, because that is what the emitted stylesheet carries:
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
        const held = surfaceKeys(basePairs)
        const lightness: Lightness = new Map()

        /** The lightness the base palette carries for a variable */
        const baseLightness = (key: StepKey): number | undefined => {
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
        for (let round_ = 0; round_ < MAX_ROUNDS; round_++) {
            const byVariable = constraintsByVariable(buildPairs(toScales(lightness), level))

            // Every variable is written, the unchanged ones included: a dark variable that stays at
            // its base lightness still has to say so, or it inherits the light block's move
            for (const key of [...byVariable.keys()].sort()) {
                const base = baseLightness(key)
                if (base === undefined) continue
                lightness.set(key, solveVariable(byVariable.get(key)!, base))
            }

            const pairs = buildPairs(toScales(lightness), level)
            const passing = pairs.filter(meetsThreshold).length
            roundsUsed = round_ + 1
            if (passing > best.passing) best = {lightness: new Map(lightness), passing}
            if (passing === pairs.length) break
        }

        /**
         * The rounds publish the palette that passed the most pairs, and a round is all variables at
         * once - so a variable that alone would close a pair is dropped with the round that traded
         * something else away. The repair takes the winning palette and offers each still-failing
         * pair the move it asks for, one variable at a time, keeping it only when the whole inventory
         * comes out ahead. One variable at a time in inventory order, so a rerun repairs the same way.
         */
        const repair = (start: Lightness): Lightness => {
            const lightness_ = new Map(start)
            const count = () => buildPairs(toScales(lightness_), level).filter(meetsThreshold).length
            let passing = count()
            for (const pair of buildPairs(toScales(lightness_), level).filter(pair_ => !meetsThreshold(pair_))) {
                for (const asInk of [true, false]) {
                    const source = asInk ? pair.ink.source : pair.fill.source
                    const key = source && stepKey(pair.mode, source)
                    if (!key || held.has(key)) continue
                    const wanted = required(constraintFor(pair, asInk))
                    if (wanted === null) continue
                    const previous = lightness_.get(key)
                    lightness_.set(key, wanted)
                    if (count() > passing) {
                        passing = count()
                        break
                    }
                    if (previous === undefined) lightness_.delete(key)
                    else lightness_.set(key, previous)
                }
            }
            return lightness_
        }

        const solved = repair(best.lightness)
        return {
            lightness: solved,
            failing: buildPairs(toScales(solved), level).filter(pair => !meetsThreshold(pair)),
            repaired: buildPairs(toScales(solved), level).filter(meetsThreshold).length - best.passing,
            roundsUsed
        }
    }

    const emit = (override: PaletteOverride) => {
        const published = publishedScales()
        const header = ['/*', ...preset.header(output, generatedOn), ' */', ''].join('\n')

        const light = block(`html[data-palette="${name}"]`, override.light, published, slotFamilies)
        const dark = block(`html.dark[data-palette="${name}"]`, override.dark, override.light.scales, slotFamilies)

        return {light, dark, css: `${header}\n${light.css}\n\n${dark.css}\n`}
    }

    // -----------------------------------------------------------------------
    // Solve, render, describe
    // -----------------------------------------------------------------------

    const groupCounts = (pairs: Pair[]) => [...new Set(pairs.map(pair => pair.group))]
        .map(group => {
            const cases = pairs.filter(pair => pair.group === group)
            return `    ${group}: ${cases.length} pairs, ${cases.filter(meetsThreshold).length} pass`
        })

    const published = buildPairs(NO_OVERRIDE, level)
    const {lightness, failing, repaired, roundsUsed} = solve()
    const scales = toScales(lightness)
    const solved = buildPairs(scales, level)
    const written = emit(scales)

    const report = [
        `👨‍💻 > [PALETTE] > [${name}] ${level}, surfaces held: ${surfaceNames}`,
        `👨‍💻 > [PALETTE] > [base] ${published.length} pairs, ${published.filter(meetsThreshold).length} pass`,
        ...groupCounts(published),
        ...Object.entries(hues).map(([family, anchor]) =>
            `👨‍💻 > [PALETTE] > [${name}] ${anchor.as} ${family} → ${anchor.hex} on the ${anchor.ladder} ladder (${anchor.meaning})`),
        ...(Object.keys(hues).length
            ? [`👨‍💻 > [PALETTE] > [${name}] hue map: ${basePairs.length} pairs, ${basePairs.filter(meetsThreshold).length} pass`]
            : []),
        `👨‍💻 > [PALETTE] > [${name}] ${solved.length} pairs, ${solved.filter(meetsThreshold).length} pass`,
        ...groupCounts(solved),
        `👨‍💻 > [PALETTE] > [${name}] steps published after ${roundsUsed} rounds and ${repaired} repaired pairs`,
        ...MODES.map(mode => `    ${mode} block: ${written[mode].steps} steps, ${written[mode].slots} slots`),
        `👨‍💻 > [PALETTE] > [${name}] slots re-pointed to ${REPOINTED_RUNG.light}/${REPOINTED_RUNG.dark}: ${repointedSlots.join(', ')}`,
        `👨‍💻 > [PALETTE] > [${name}] renders ${output}`
    ]

    // A clipped channel bends the hue, and a hue map that bends is no longer the anchor it names
    const drift = Object.entries(hues).flatMap(([family, anchor]) => {
        const {hue} = rgbToOklch(hexToRgb(anchor.hex))
        return MODES.flatMap(mode => Object.entries(scales[mode].scales[family] ?? {}).map(([step, hex]) => {
            const emitted = rgbToOklch(hexToRgb(hex)).hue
            return {at: `${mode} ${family}-${step}`, degrees: Math.abs(((emitted - hue + 540) % 360) - 180)}
        }))
    }).sort((a, b) => b.degrees - a.degrees)[0]
    if (drift) report.push(`👨‍💻 > [PALETTE] > [${name}] widest hue drift from its anchor: ${round(drift.degrees)}° at ${drift.at}`)

    // The white-on-white guard: a walk that lands on the surface it is measured against is a bug
    const degenerate = solved.filter(pair => round(contrastRatio(pair.ink.colour, pair.fill.colour)) === 1)

    const warnings = [
        ...(failing.length ? [`👨‍💻 > [PALETTE] > [${name}] ${failing.length} pairs the palette cannot reach:`] : []),
        ...failing.map(pair => {
            const ink = pair.ink.source ? `${pair.ink.source.family}-${pair.ink.source.step}` : 'no palette variable'
            const fill = pair.fill.source ? `${pair.fill.source.family}-${pair.fill.source.step}` : 'no palette variable'
            return `    ${pair.mode}: ${pair.name} — ${round(pair.ratio)}:1 of ${pair.threshold} (ink ${ink}, fill ${fill})`
        }),
        ...(degenerate.length ? [`👨‍💻 > [PALETTE] > [${name}] ${degenerate.length} pairs collapsed to 1:1`] : [])
    ]

    return {css: written.css, report, warnings}
}

/** The full stylesheet text a preset publishes */
export const renderPreset = (preset: Preset): string => solvePreset(preset).css

