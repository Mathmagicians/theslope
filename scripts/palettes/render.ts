/**
 * Palette preset renderer - the stylesheet text of `app/assets/css/palettes/*.css`.
 *
 * Pure and deterministic: `renderPreset(preset)` returns the file a preset publishes and touches
 * no disk, so `scripts/palettes/generate.ts` writes it and
 * `tests/component/architecture/designSystemContrast.unit.spec.ts` compares the committed file
 * against it. A preset is two passes over the same inventory, with a third for a colour-safe one:
 *
 * 1. **The hue map** (optional). Each meaning-bearing family takes a named anchor: the anchor's
 *    OKLCH hue and chroma, the published family's lightness ladder rung by rung, chroma clamped
 *    to the sRGB gamut per rung. A family that is also a brand band publishes the anchor on the
 *    Nuxt UI slot instead (`--ui-color-<slot>-<step>`), so the meaning moves and the band does not.
 * 2. **The meaning faces and the stops** (a colour-safe preset). Each team stop publishes the
 *    colour the preset lists for it, and the meaning faces - the fill a solid badge and a button
 *    show - take the arrangement nearest their anchors' own lightness that meets the preset's level
 *    and keeps every two meanings shown together apart under protanopia, deuteranopia and
 *    tritanopia (`tests/component/architecture/designSystemMeanings.ts`).
 * 3. **The contrast walk** (every preset, at its level). The generator reads the pair inventory of
 *    `tests/component/architecture/designSystemPairs.ts` - the same inventory
 *    `designSystemContrast.unit.spec.ts` asserts - and walks every failing pair's step along OKLCH
 *    lightness, hue held and chroma clamped to the sRGB gamut at each lightness, until the pair
 *    meets its threshold. A step moves away from
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
 * Two runs produce byte-identical output: the hue map is arithmetic on published values, the faces
 * are placed in a fixed order on a fixed grid, and the walk starts from that base, takes a fixed
 * step, visits the pairs in the order the inventory lists them, and stops on the round that meets
 * every pair or on the first palette it repeats.
 */

import {
    APP_SCALES, MODES, NO_OVERRIDE, SLOT_FAMILY, SURFACES, TAILWIND_SCALES, buildPairs, meetsThreshold, referencesFor, round,
    type Mode, type PaletteOverride, type PaletteRef, type Pair
} from '../../tests/component/architecture/designSystemPairs'
import {
    clampChromaToGamut, composite, contrastRatio, hexToRgb, oklchToRgb, relativeLuminance, rgbToHex, rgbToOklch,
    type ColourScales, type ModeOverride, type Rgb, type SlotRungs
} from '../../tests/component/architecture/contrast'
import {MEANING_CASES, SEPARATION_BAR, swatchResolver, type Swatch} from '../../tests/component/architecture/designSystemMeanings'
import {VISION_TYPES, separationUnder} from '../../tests/component/architecture/colourVision'
import {RAINBOW} from '../../app/composables/useTheSlopeDesignSystem'
import {paletteFile, paletteSelector, type Anchor, type Preset} from './presets'


const LIGHTNESS_RANGE = {min: 0.02, max: 0.99}
const MAX_ROUNDS = 30

/** Aim this far past the threshold, to absorb the 8-bit hex and the surfaces that move with the ink */
const SOLVE_MARGIN = 0.15

/** Aim this far past the separation bar, to absorb the 8-bit hex of both faces */
const SEPARATION_MARGIN = 0.005

/** The lightness grid a meaning face is placed on */
const FACE_STEP = 0.005

/**
 * A face keeps at least this share of its anchor's chroma, so it still reads as the anchor's colour:
 * orange lifted to white on a dark page would clear every pair and mean nothing
 */
const MIN_CHROMA_SHARE = 0.5

/** How many partial arrangements the face search visits before it keeps the best it has */
const SEARCH_LIMIT = 2_000_000

// ---------------------------------------------------------------------------
// The hue map: an anchor becomes a full scale
// ---------------------------------------------------------------------------

const publishedScale = (family: string): Record<string, string> | undefined =>
    APP_SCALES[family] ?? TAILWIND_SCALES[family]

/**
 * What a family paints before a preset touches it, resolved the way the design-system resolver
 * does: an app scale, else the family a Nuxt UI slot aliases (`ocean` → blue, `neutral` → sky),
 * else Tailwind's default.
 */
const publishedFor = (family: string): Record<string, string> | undefined => {
    const alias = SLOT_FAMILY[family]
    return APP_SCALES[family] ?? (alias && alias !== family ? publishedFor(alias) : undefined) ?? TAILWIND_SCALES[family]
}

/** A family the resolver reaches through a Nuxt UI slot alias publishes as `--ui-color-<family>-<step>` */
const publishedAsSlot = (family: string) => !APP_SCALES[family] && SLOT_FAMILY[family] !== undefined

/** A colour of this hue at this lightness, with as much of `chroma` as sRGB can show there */
const inHue = (hue: number, lightness: number, chroma: number): string =>
    rgbToHex(oklchToRgb(lightness, clampChromaToGamut(lightness, chroma, hue), hue))

/**
 * The anchor at another lightness. A pale rung has no room for the anchor's chroma, so it gives
 * chroma up rather than hue - which is what the eye reads as "the same colour, lighter".
 */
const anchoredLightness = (hex: string, lightness: number): string => {
    const {chroma, hue} = rgbToOklch(hexToRgb(hex))
    return inHue(hue, lightness, chroma)
}

/**
 * The anchor as a 50-950 scale: every rung keeps the anchor's hue and takes the published rung's
 * lightness. It takes the anchor's chroma where sRGB can show it, or - for a family that paints the
 * greys - the published rung's own chroma.
 */
const anchorScale = ({hex, ladder, chroma}: Anchor): Record<string, string> => {
    const anchor = rgbToOklch(hexToRgb(hex))
    return Object.fromEntries(Object.entries(publishedScale(ladder) ?? {}).map(([step, published]) => {
        const rung = rgbToOklch(hexToRgb(published))
        return [step, inHue(anchor.hue, rung.lightness, chroma === 'ladder' ? rung.chroma : anchor.chroma)]
    }))
}

const anchorChroma = (hex: string) => rgbToOklch(hexToRgb(hex)).chroma

/** An anchor with no hue - black - is the ink end of the ladder */
const isAchromatic = (hex: string) => anchorChroma(hex) < 1e-6

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
 * A solid button is `text-inverted` on `bg-<slot>`, body text at its level (4.5:1 AA, 7:1 AAA).
 * Where the rung Nuxt UI points a slot at cannot carry that label, the preset moves the *slot*
 * rather than the rung:
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

/** A constraint holds at a lightness when it clears its bar by the margin the walk aims for */
const clearsAt = (constraint: Constraint, lightness: number) =>
    constraint.ratioAt(lightness) >= constraint.threshold + SOLVE_MARGIN

/**
 * The lightness this constraint needs, or `null` when the range does not reach it: the darkest
 * value that still clears the bar when the variable walks down, the lightest when it walks up.
 * The aim is past the bar by the margin, because a soft `bg-<slot>/10` surface moves with the
 * ink that sits on it and the emitted value is a byte, so the exact crossing lands a hair short.
 */
const required = (constraint: Constraint): number | null => {
    const {min, max} = LIGHTNESS_RANGE
    const clears = (value: number) => clearsAt(constraint, value)
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
 * One block of a preset: the steps it redeclares, then the slots it re-points. A step
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

/** What each family paints before a preset: the light block leaves out the rungs that match it */
const publishedScales = (families: string[]): ColourScales =>
    Object.fromEntries(families.map(family => [family, publishedFor(family) ?? {}]))

// ---------------------------------------------------------------------------
// The team stops and the meaning faces of a colour-safe preset
// ---------------------------------------------------------------------------

/** The palette variable each stop's fill names, read off its class: `bg-ocean-500` → ocean, 500 */
const STOP_FILLS: PaletteRef[] = RAINBOW.map(stop => {
    const fill = (referencesFor(stop, 'light').bg ?? []).at(-1)
    const [, family, step] = fill?.match(/^([a-z]+)-(\d{2,3})$/) ?? []
    if (!family || !step) throw new Error(`the rainbow stop "${stop}" names no palette fill`)
    return {family, step}
})

/**
 * A meaning face: the palette variable a meaning is painted with in one mode, the anchor it takes,
 * and the lightness it aims for. Black has no hue to keep and is the ink end of the ladder: the
 * darkest face in light mode and, on a dark page, the lightest.
 */
type Face = {key: StepKey, ref: PaletteRef, anchor: string, target: number}

const faceTarget = (anchor: string, mode: Mode) => {
    const {lightness} = rgbToOklch(hexToRgb(anchor))
    return isAchromatic(anchor) && mode === 'dark' ? 1 - lightness : lightness
}

/** The lightness grid a face may take, the target itself included */
const faceGrid = (target: number): number[] =>
    [...new Set([target, ...Array.from({length: Math.round(1 / FACE_STEP) + 1}, (_, index) => index * FACE_STEP)])]

/** The closest two colours come under any of the three dichromacies */
const closestUnderDichromacy = (a: Rgb, b: Rgb) =>
    Math.min(...VISION_TYPES.map(vision => separationUnder(vision, a, b)))

const sameRef = (a: PaletteRef | null, b: PaletteRef) => a !== null && a.family === b.family && a.step === b.step

/**
 * Whether every pair a face takes part in meets its level, with the walk's margin, when the face
 * publishes `hex` and the rest of the palette holds. A translucent fill of the face (`bg-<slot>/10`)
 * is laid down again on its ground, so the soft pair moves with the ink that sits on it.
 */
const readsAt = (pairs: Pair[], ref: PaletteRef, hex: string): boolean => {
    const colour = hexToRgb(hex)
    return pairs.every(pair => {
        const ink = sameRef(pair.ink.source, ref) ? {...colour, alpha: pair.ink.colour.alpha} : pair.ink.colour
        const fill = sameRef(pair.fill.source, ref)
            ? composite({...colour, alpha: pair.fill.alpha ?? 1}, pair.fill.ground ?? colour)
            : pair.fill.colour
        return contrastRatio(composite(ink, fill), fill) >= pair.threshold + SOLVE_MARGIN
    })
}

/** One lightness a face may publish: the byte it writes and the squared distance from its target */
type FaceOption = {lightness: number, hex: string, cost: number}

/**
 * The arrangement of the meaning faces nearest their anchors: every face on a lightness at which it
 * reads, every two faces that meet in a meaning set apart under all three dichromacies, and the least
 * squared lightness moved in total. Squared, so a move is shared between faces rather than laid on
 * one. Branch and bound, over the faces in a fixed order and each face's options nearest first, so
 * the first best arrangement found is the one kept and two runs agree.
 */
const nearestArrangement = (
    faces: Face[], options: Map<StepKey, FaceOption[]>, partners: Map<StepKey, Set<StepKey>>
): {arrangement: Map<StepKey, FaceOption> | null, complete: boolean} => {
    const order = [...faces].sort((a, b) =>
        (partners.get(b.key)?.size ?? 0) - (partners.get(a.key)?.size ?? 0) || a.key.localeCompare(b.key))
    const nearest = (face: Face) => options.get(face.key)![0]?.cost ?? Infinity
    const bound = [...order.map((_, index) => order.slice(index).reduce((sum, face) => sum + nearest(face), 0)), 0]

    const apart = new Map<string, boolean>()
    const clears = (a: FaceOption, b: FaceOption) => {
        const key = `${a.hex}|${b.hex}`
        if (!apart.has(key)) {
            apart.set(key, closestUnderDichromacy(hexToRgb(a.hex), hexToRgb(b.hex)) >= SEPARATION_BAR + SEPARATION_MARGIN)
        }
        return apart.get(key)!
    }

    const chosen = new Map<StepKey, FaceOption>()
    let best: {cost: number, arrangement: Map<StepKey, FaceOption>} | null = null
    let visited = 0
    const visit = (index: number, cost: number): void => {
        if (best !== null && cost + bound[index]! >= best.cost) return
        if (index === order.length) {
            best = {cost, arrangement: new Map(chosen)}
            return
        }
        if (++visited > SEARCH_LIMIT) return
        const face = order[index]!
        for (const option of options.get(face.key)!) {
            if (best !== null && cost + option.cost + bound[index + 1]! >= (best as {cost: number}).cost) break
            const fits = [...partners.get(face.key) ?? []]
                .every(partner => !chosen.has(partner) || clears(option, chosen.get(partner)!))
            if (!fits) continue
            chosen.set(face.key, option)
            visit(index + 1, cost + option.cost)
            chosen.delete(face.key)
        }
    }
    visit(0, 0)
    return {arrangement: (best as {arrangement: Map<StepKey, FaceOption>} | null)?.arrangement ?? null, complete: visited <= SEARCH_LIMIT}
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
    const {name, level, hues, colourSafe} = preset
    const output = paletteFile(name)
    const slotFamilies = new Set(Object.keys(hues).filter(family => hues[family]!.as === 'slot'))

    /** The hue map as a scale per family - the palette the walk starts from */
    const hueBase: ColourScales = Object.fromEntries(
        Object.entries(hues).map(([family, anchor]) => [family, anchorScale(anchor)])
    )

    /**
     * The palette the walk starts from, per mode: the hue map, and for a colour-safe preset the
     * stops and the meaning faces on top. A face sits at another lightness in each mode.
     */
    const base: Record<Mode, ColourScales> = {light: structuredClone(hueBase), dark: structuredClone(hueBase)}

    const baseHex = (mode: Mode, {family, step}: PaletteRef): string | undefined =>
        base[mode][family]?.[step] ?? publishedFor(family)?.[step]

    const setBase = (mode: Mode, {family, step}: PaletteRef, hex: string) => {
        (base[mode][family] ??= {})[step] = hex
    }

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
            light: {scales: structuredClone(base.light), slots: slotRungs('light', repointedSlots)},
            dark: {scales: structuredClone(base.dark), slots: slotRungs('dark', repointedSlots)}
        }
        for (const [key, value] of lightness) {
            const [mode, family, step] = key.split('|') as [Mode, string, string]
            const hex = baseHex(mode, {family, step})
            if (!hex) continue
            override[mode].scales[family] ??= {}
            // A rung gives up chroma where sRGB cannot show it at the new lightness: a clipped
            // channel costs the luminance the move was for, and bends a hue-mapped rung off its anchor
            override[mode].scales[family]![step] = anchoredLightness(hex, value)
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
        const {chroma, hue} = rgbToOklch(hexToRgb(baseHex(pair.mode, source)!))
        const shifted = (lightness: number) => oklchToRgb(lightness, clampChromaToGamut(lightness, chroma, hue), hue)
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

    const held = surfaceKeys(basePairs)

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

    // -----------------------------------------------------------------------
    // The stops and the meaning faces
    // -----------------------------------------------------------------------

    /** What the colour-safe pass did, for the run report */
    const placed: string[] = []

    if (colourSafe) {
        if (colourSafe.stops.length !== STOP_FILLS.length) {
            throw new Error(`${name} lists ${colourSafe.stops.length} stops for a rainbow of ${STOP_FILLS.length}`)
        }

        // A stop is the colour the preset lists for it, published on the variable its class names;
        // the walk moves it only where its ink cannot carry that colour at the preset's level
        STOP_FILLS.forEach((fill, index) => {
            const hex = rgbToHex(hexToRgb(colourSafe.stops[index]!))
            for (const mode of MODES) setBase(mode, fill, hex)
            if (publishedAsSlot(fill.family)) slotFamilies.add(fill.family)
            placed.push(`stop RAINBOW[${index}] ${fill.family}-${fill.step} → ${hex}`)
        })

        /**
         * The meaning faces. Each takes its anchor's hue and chroma, and a lightness from the
         * arrangement nearest the anchors' own (`nearestArrangement`): where AA allows, a face is its
         * anchor; where it does not, the faces give way together.
         */
        for (const mode of MODES) {
            const swatch = swatchResolver(toScales(new Map())[mode], mode)
            const faceOf = (of: Swatch): Face | null => {
                const {source} = swatch(of)
                const anchor = source && hues[source.family]?.hex
                return source && anchor
                    ? {key: stepKey(mode, source), ref: source, anchor, target: faceTarget(anchor, mode)}
                    : null
            }

            const faces = new Map<StepKey, Face>()
            const partners = new Map<StepKey, Set<StepKey>>()
            for (const {a, b} of MEANING_CASES) {
                const [first, second] = [faceOf(a), faceOf(b)]
                if (!first || !second || first.key === second.key) continue
                faces.set(first.key, first).set(second.key, second)
                partners.set(first.key, (partners.get(first.key) ?? new Set()).add(second.key))
                partners.set(second.key, (partners.get(second.key) ?? new Set()).add(first.key))
            }

            const pairs = buildPairs(toScales(new Map()), level).filter(pair => pair.mode === mode)
            const options = new Map([...faces.values()].map(face => {
                const involved = pairs.filter(pair => sameRef(pair.ink.source, face.ref) || sameRef(pair.fill.source, face.ref))
                return [face.key, faceGrid(face.target)
                    .map(lightness => ({lightness, hex: anchoredLightness(face.anchor, lightness), cost: (lightness - face.target) ** 2}))
                    .filter(({hex}) => rgbToOklch(hexToRgb(hex)).chroma >= MIN_CHROMA_SHARE * anchorChroma(face.anchor))
                    .filter(({hex}) => readsAt(involved, face.ref, hex))
                    .sort((a, b) => a.cost - b.cost || a.lightness - b.lightness)]
            }))

            const {arrangement, complete} = nearestArrangement([...faces.values()], options, partners)
            if (!complete) placed.push(`${mode}: the face search stopped at ${SEARCH_LIMIT} arrangements and keeps the best it found`)
            for (const face of [...faces.values()].sort((a, b) => a.key.localeCompare(b.key))) {
                const option = arrangement?.get(face.key) ?? options.get(face.key)![0]
                const hex = option?.hex ?? anchoredLightness(face.anchor, face.target)
                setBase(mode, face.ref, hex)
                placed.push(`${mode} face ${face.ref.family}-${face.ref.step} → ${hex}`
                    + ` (L ${round(option?.lightness ?? face.target)}, anchor ${face.anchor} L ${round(rgbToOklch(hexToRgb(face.anchor)).lightness)})`)
            }
            if (!arrangement) placed.push(`${mode}: no arrangement keeps every meaning apart; each face takes its nearest readable lightness`)
        }
    }

    // -----------------------------------------------------------------------
    // The walk
    // -----------------------------------------------------------------------

    const solve = () => {
        const lightness: Lightness = new Map()

        /** The lightness the base palette carries for a variable */
        const baseLightness = (key: StepKey): number | undefined => {
            const [mode, family, step] = key.split('|') as [Mode, string, string]
            const hex = baseHex(mode, {family, step})
            return hex ? rgbToOklch(hexToRgb(hex)).lightness : undefined
        }

        /**
         * The best palette any round reached is the one that is published, so a round that trades one
         * pair for another is not the one that wins.
         */
        let best = {lightness: new Map(lightness), passing: -1}
        let roundsUsed = 0

        /**
         * A round is a pure function of the lightness it starts from, so a walk that comes back to a
         * palette it has already published repeats the same cycle from there and no later round can
         * beat the best. A preset that meets its level everywhere stops on the round that gets it
         * there; one that cannot - Høj kontrast at AAA - stops on its first repeat.
         */
        const visited = new Set<string>()
        const fingerprint = () => [...lightness.keys()].sort().map(key => `${key}=${lightness.get(key)}`).join(';')

        for (let round_ = 0; round_ < MAX_ROUNDS; round_++) {
            const byVariable = constraintsByVariable(buildPairs(toScales(lightness), level))

            // Every variable is written, the unchanged ones included: a dark variable that stays at
            // its base lightness still has to say so, or it inherits the light block's move
            for (const key of [...byVariable.keys()].sort()) {
                const baseValue = baseLightness(key)
                if (baseValue === undefined) continue
                lightness.set(key, solveVariable(byVariable.get(key)!, baseValue))
            }

            const pairs = buildPairs(toScales(lightness), level)
            const passing = pairs.filter(meetsThreshold).length
            roundsUsed = round_ + 1
            if (passing > best.passing) best = {lightness: new Map(lightness), passing}
            const state = fingerprint()
            if (passing === pairs.length || visited.has(state)) break
            visited.add(state)
        }

        const solved = best.lightness
        return {
            lightness: solved,
            failing: buildPairs(toScales(solved), level).filter(pair => !meetsThreshold(pair)),
            roundsUsed
        }
    }

    const emit = (override: PaletteOverride) => {
        const published = publishedScales([...new Set([...Object.keys(override.light.scales), ...slotFamilies])])
        const header = ['/*', ...preset.header(output), ' */', ''].join('\n')

        const light = block(paletteSelector(name, 'light'), override.light, published, slotFamilies)
        const dark = block(paletteSelector(name, 'dark'), override.dark, override.light.scales, slotFamilies)

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
    const {lightness, failing, roundsUsed} = solve()
    const scales = toScales(lightness)
    const solved = buildPairs(scales, level)
    const written = emit(scales)

    /** The closest two meanings under any dichromacy, per mode, as the stylesheet paints them */
    const meaningsApart = MODES.map(mode => {
        const colour = swatchResolver(scales[mode], mode)
        const closest = MEANING_CASES.map(({a, b}) => ({a, b, distance: closestUnderDichromacy(colour(a).colour, colour(b).colour)}))
            .reduce((worst, pair) => pair.distance < worst.distance ? pair : worst)
        return {mode, ...closest}
    })

    const report = [
        `👨‍💻 > [PALETTE] > [${name}] ${level}, surfaces held: ${surfaceNames}`,
        `👨‍💻 > [PALETTE] > [published] ${published.length} pairs, ${published.filter(meetsThreshold).length} pass`,
        ...groupCounts(published),
        ...Object.entries(hues).map(([family, anchor]) =>
            `👨‍💻 > [PALETTE] > [${name}] ${anchor.as} ${family} → ${anchor.hex} on the ${anchor.ladder} ladder`
            + `${anchor.chroma === 'ladder' ? ' at the ladder\'s chroma' : ''} (${anchor.meaning})`),
        ...(Object.keys(hues).length
            ? [`👨‍💻 > [PALETTE] > [${name}] hue map: ${basePairs.length} pairs, ${basePairs.filter(meetsThreshold).length} pass`]
            : []),
        ...placed.map(line => `👨‍💻 > [PALETTE] > [${name}] ${line}`),
        `👨‍💻 > [PALETTE] > [${name}] ${solved.length} pairs, ${solved.filter(meetsThreshold).length} pass`,
        ...groupCounts(solved),
        `👨‍💻 > [PALETTE] > [${name}] steps published after ${roundsUsed} rounds`,
        ...MODES.map(mode => `    ${mode} block: ${written[mode].steps} steps, ${written[mode].slots} slots`),
        `👨‍💻 > [PALETTE] > [${name}] slots re-pointed to ${REPOINTED_RUNG.light}/${REPOINTED_RUNG.dark}: ${repointedSlots.join(', ')}`,
        ...(colourSafe
            ? meaningsApart.map(({mode, a, b, distance}) =>
                `👨‍💻 > [PALETTE] > [${name}] ${mode}: closest meanings ${a.label} vs ${b.label}, ${distance.toFixed(3)} apart under a dichromacy`)
            : []),
        `👨‍💻 > [PALETTE] > [${name}] renders ${output}`
    ]

    // A clipped channel bends the hue, and a hue map that bends is not the anchor it names.
    // Black has no hue to bend, and a ladder-chroma rung near white or black too little to read one
    const drift = Object.entries(hues).filter(([, anchor]) => !isAchromatic(anchor.hex)).flatMap(([family, anchor]) => {
        const {hue} = rgbToOklch(hexToRgb(anchor.hex))
        return MODES.flatMap(mode => Object.entries(scales[mode].scales[family] ?? {})
            .filter(([, hex]) => anchor.chroma !== 'ladder' || rgbToOklch(hexToRgb(hex)).chroma >= 0.02)
            .map(([step, hex]) => {
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
        ...(degenerate.length ? [`👨‍💻 > [PALETTE] > [${name}] ${degenerate.length} pairs collapsed to 1:1`] : []),
        ...(colourSafe
            ? meaningsApart.filter(({distance}) => distance < SEPARATION_BAR).map(({mode, a, b, distance}) =>
                `👨‍💻 > [PALETTE] > [${name}] ${mode}: ${a.label} vs ${b.label} ${distance.toFixed(3)} apart, under the bar ${SEPARATION_BAR}`)
            : [])
    ]

    return {css: written.css, report, warnings}
}

/** The full stylesheet text a preset publishes */
export const renderPreset = (preset: Preset): string => solvePreset(preset).css
