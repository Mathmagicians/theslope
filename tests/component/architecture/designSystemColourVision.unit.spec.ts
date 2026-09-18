import {describe, it, expect} from 'vitest'
import {existsSync} from 'node:fs'
import {
    MODES, NO_OVERRIDE, createResolver, leafClasses, pickColour, repoFile, repoPath,
    type Channel, type Mode
} from './designSystemPairs'
import {composite, hexToRgb, parsePaletteOverrides, rgbToHex, type ModeOverride, type Rgb} from './contrast'
import {CUD_ANCHORS, VISION_TYPES, deltaEOk, separationUnder} from './colourVision'
import {BASELINE, COLOUR_SAFE, PALETTES_UNDER_TEST} from './palettes'
import {RAINBOW, ORDER_STATE_COLORS, TICKET_TYPE_COLORS} from '../../../app/composables/useTheSlopeDesignSystem'

/**
 * Architecture test - the meanings of the design system stay apart for a member with a colour
 * vision deficiency.
 *
 * `designSystemContrast.unit.spec.ts` asks whether a colour can be *read*; this asks whether two
 * colours that mean different things can be *told apart* - WCAG 2.1 §1.4.1 "Use of Color" for the
 * palette that promises it. Like that spec it asserts a property, never a token value: it resolves
 * each meaning through the same resolver, simulates protanopia, deuteranopia and tritanopia
 * (`colourVision.ts`, Machado et al. 2009 at severity 1.0, applied in linear RGB), and measures
 * ΔE in Oklab between the two as that dichromat sees them.
 *
 * The bar is **0.075**: the separation the Color Universal Design set itself keeps on its closest
 * pair (bluish green vs reddish purple, deuteranopia). A palette built on those anchors can promise
 * what the anchors promise and no more, so the set sets the bar - the last case here re-measures it,
 * so the bar cannot drift below the data it comes from. For scale, ~0.02 is the just-noticeable
 * difference in Oklab, so 0.075 is between three and four of them.
 *
 * When a case fails, fix the palette - never the threshold. Pairs that miss today are listed in
 * FINDINGS with the distance measured on 2026-09-18 and run as `it.fails`, so both a regression in
 * a green pair and a fix of a listed one break the build.
 */

/** The separation the CUD set keeps on its own closest pair - see the docblock */
const THRESHOLD = 0.075

// ---------------------------------------------------------------------------
// The meanings, read off the design system
// ---------------------------------------------------------------------------

/** One meaning, and the face the design system paints it with */
type Meaning = {label: string, slot?: string, faces?: {path: string, channel: Channel}[]}

/**
 * A set of meanings that appear in one another's company, so a member has to tell them apart.
 * Every pair of a set is a case; a meaning drawn by more than one token is measured at each face,
 * because each is a place the member sees it.
 */
const MEANING_SETS: {name: string, meanings: Meaning[]}[] = [
    {
        name: 'alert kinds',
        meanings: [{label: 'success', slot: 'success'}, {label: 'error', slot: 'error'}, {label: 'warning', slot: 'warning'}]
    },
    {
        name: 'info and secondary',
        meanings: [{label: 'info', slot: 'info'}, {label: 'secondary', slot: 'secondary'}]
    },
    {
        // `CALENDAR.picker.cookingDay` is the token the pickers draw and `PLANNING_CALENDAR.day.generated`
        // the one the season preview draws - one meaning, two faces, measured at both
        name: 'calendar day markers',
        meanings: [
            {label: 'holiday', faces: [{path: 'CALENDAR.holiday', channel: 'ring'}]},
            {label: 'cooking day', faces: [
                {path: 'CALENDAR.picker.cookingDay', channel: 'bg'},
                {path: 'PLANNING_CALENDAR.day.generated', channel: 'bg'}
            ]}
        ]
    },
    {
        name: 'order states',
        meanings: Object.entries(ORDER_STATE_COLORS).map(([label, slot]) => ({label, slot}))
    },
    {
        name: 'ticket types',
        meanings: Object.entries(TICKET_TYPE_COLORS).map(([label, slot]) => ({label, slot}))
    }
]

/** One measurable swatch of a meaning: what it is called and where it is drawn */
type Swatch = {label: string, slot?: string, path?: string, channel?: Channel}

const swatches = ({label, slot, faces}: Meaning): Swatch[] =>
    faces ? faces.map(face => ({label: `${label} (${face.path})`, ...face})) : [{label, slot}]

/** Every pair of two different meanings of a set, at every face each is drawn with */
const casesOf = (meanings: Meaning[]): [Swatch, Swatch][] => meanings.flatMap((first, index) =>
    meanings.slice(index + 1).flatMap(second =>
        swatches(first).flatMap(a => swatches(second).map(b => [a, b] as [Swatch, Swatch]))))

/**
 * The colour a swatch paints, composited onto the page it sits on. A slot resolves to the fill
 * Nuxt UI paints for `bg-<slot>` at the rung the palette points it at - the face a solid badge,
 * a button and a filled marker all show.
 */
const colourOf = (override: ModeOverride, mode: Mode) => {
    const resolve = createResolver(override)
    const page = resolve('default', 'bg', mode)!
    return (swatch: Swatch): Rgb => {
        const sourced = swatch.slot
            ? resolve(swatch.slot, 'bg', mode)
            : pickColour(resolve, leafClasses(swatch.path!), swatch.channel!, mode)
        if (!sourced) throw new Error(`${swatch.label} paints no colour in ${mode} mode`)
        return composite(sourced.colour, page.colour)
    }
}

// ---------------------------------------------------------------------------
// What each palette reaches today, measured 2026-09-18
// ---------------------------------------------------------------------------

/**
 * Pairs a palette does not keep apart, keyed `<palette>|<mode>|<a> vs <b>|<vision>`, with the
 * distance it reaches. They run as `it.fails`: a palette change that fixes one breaks the build
 * and asks for the entry to go, and a pair that is not listed may never start failing.
 *
 * Measured 2026-09-18: the default theme keeps 57 of its 72 cases, Farveblind 54.
 *
 * finding 2026-09-18, awaiting the user's decision: **a solid slot fill has one rung to give**.
 * It is both the ink of `text-<slot>` on the page and the fill under `text-inverted`, so AA at
 * 4.5:1 puts every slot at the same end of the lightness range - the dark end in light mode, the
 * light end in dark mode. The Color Universal Design anchors keep three of their pairs apart by
 * lightness (vermillion 0.62 against orange 0.75, blue 0.53 against yellow 0.90), and a palette
 * that spends its lightness on contrast has only hue left. Under protanopia and deuteranopia the
 * red-green axis is the one that goes, so `error vs warning` (vermillion against orange) and
 * `ADULT vs CHILD` (mocha against bluish green) land there. `CHILD vs BABY` is the same story on
 * the other axis: TheSlope's `neutral` is the Ocean teal, and the CUD bluish green sits beside it
 * for a tritanope once both are at the contrast ceiling.
 *
 * What the palette alone can reach was measured the same day: re-pointing each meaning slot at
 * the rung that spreads them furthest, instead of the uniform 600/300 the preset publishes, lifts
 * the worst pair from 0.019 to 0.078 in light mode and 0.056 in dark - and pays for it with
 * near-black meaning fills (`#00533b` success, `#3e1600` error). The decisions that would close
 * the rest are the user's: whether meanings may spend lightness, whether `neutral` stays a teal,
 * and whether `primary` mocha may carry a meaning at all.
 */
const FINDINGS = new Map<string, number>([
    ['default|light|success vs warning|deuteranopia', 0.048],
    ['default|light|error vs warning|protanopia', 0.073],
    ['default|light|info vs secondary|tritanopia', 0.07],
    ['default|light|normal vs released|protanopia', 0.017],
    ['default|light|normal vs released|deuteranopia', 0.036],
    ['default|light|normal vs released|tritanopia', 0.064],
    ['default|light|normal vs claimed|deuteranopia', 0.067],
    ['default|light|released vs claimed|deuteranopia', 0.054],
    ['default|light|released vs claimed|tritanopia', 0.066],
    ['default|dark|success vs error|deuteranopia', 0.065],
    ['default|dark|info vs secondary|protanopia', 0.031],
    ['default|dark|info vs secondary|deuteranopia', 0.039],
    ['default|dark|info vs secondary|tritanopia', 0.018],
    ['default|dark|released vs claimed|deuteranopia', 0.055],
    ['default|dark|released vs claimed|tritanopia', 0.064],
    ['colorblind|light|error vs warning|protanopia', 0.019],
    ['colorblind|light|error vs warning|deuteranopia', 0.025],
    ['colorblind|light|info vs secondary|protanopia', 0.073],
    ['colorblind|light|normal vs released|protanopia', 0.074],
    ['colorblind|light|ADULT vs CHILD|protanopia', 0.03],
    ['colorblind|light|ADULT vs CHILD|deuteranopia', 0.041],
    ['colorblind|light|ADULT vs BABY|protanopia', 0.073],
    ['colorblind|light|CHILD vs BABY|protanopia', 0.074],
    ['colorblind|light|CHILD vs BABY|deuteranopia', 0.069],
    ['colorblind|light|CHILD vs BABY|tritanopia', 0.014],
    ['colorblind|dark|success vs error|deuteranopia', 0.056],
    ['colorblind|dark|error vs warning|tritanopia', 0.045],
    ['colorblind|dark|info vs secondary|protanopia', 0.057],
    ['colorblind|dark|normal vs released|protanopia', 0.025],
    ['colorblind|dark|normal vs released|deuteranopia', 0.049],
    ['colorblind|dark|normal vs released|tritanopia', 0.053],
    ['colorblind|dark|ADULT vs CHILD|deuteranopia', 0.059],
    ['colorblind|dark|ADULT vs BABY|protanopia', 0.067]
])

// ---------------------------------------------------------------------------
// The palettes the appearance preference offers
// ---------------------------------------------------------------------------

/**
 * Every registry entry that claims `colourSafe`, plus the baseline it is read against - the theme
 * a member gets without choosing. A preset that promises only contrast is measured for that in
 * `designSystemContrast.unit.spec.ts`; the registry decides which list a preset lands in.
 */
const PALETTES = [BASELINE, ...COLOUR_SAFE]

describe('WCAG 2.1 §1.4.1: the design system keeps its meanings apart under colour vision deficiency', () => {
    it('the bar is the separation the Color Universal Design set keeps on its own closest pair', () => {
        const anchors = Object.values(CUD_ANCHORS).map(hexToRgb)
        const closest = Math.min(...VISION_TYPES.flatMap(vision => anchors.flatMap((a, index) =>
            anchors.slice(index + 1).map(b => separationUnder(vision, a, b)))))
        expect(Math.round(closest * 1000) / 1000).toBe(THRESHOLD)
    })

    it('a simulation leaves the greys where they are', () => {
        // The matrices are defined so that the achromatic axis is a fixed point: a dichromat sees
        // white, grey and black as they are, and a drift there would move every measured pair
        const greys = ['#ffffff', '#808080', '#000000']
        expect(VISION_TYPES.flatMap(vision =>
            greys.map(hex => separationUnder(vision, hexToRgb(hex), hexToRgb(hex)) === 0))
        ).not.toContain(false)
    })

    it('every listed finding still names a pair the inventory measures', () => {
        const measured = new Set(PALETTES.flatMap(palette => MODES.flatMap(mode =>
            MEANING_SETS.flatMap(set => casesOf(set.meanings).flatMap(([a, b]) =>
                VISION_TYPES.map(vision => `${palette.id}|${mode}|${a.label} vs ${b.label}|${vision}`))))))
        expect([...FINDINGS.keys()].filter(key => !measured.has(key)).join('\n')).toBe('')
    })

    describe.each(PALETTES)('$label', ({id, file}) => {
        const published = file !== null && existsSync(repoPath(file))
        const override = published ? parsePaletteOverrides(repoFile(file!)) : null

        if (file !== null) {
            it('publishes the stylesheet its badge claims', () => {
                // A registry entry with no generated file claims a mapping nobody measured
                expect(published, `${file} is missing - run npx jiti scripts/palettes/generate.ts`).toBe(true)
            })
        }

        describe.each(MODES)('%s mode', mode => {
            const colour = colourOf((override ?? NO_OVERRIDE)[mode], mode)

            // A preset with no stylesheet has already failed above; measuring it would report the
            // published palette's numbers under the preset's name
            const cases = (file !== null && !published ? [] : MEANING_SETS).flatMap(set => casesOf(set.meanings).flatMap(([a, b]) =>
                VISION_TYPES.map(vision => {
                    const distance = separationUnder(vision, colour(a), colour(b))
                    const key = `${id}|${mode}|${a.label} vs ${b.label}|${vision}`
                    return {key, vision, set: set.name, a, b, distance, finding: FINDINGS.get(key)}
                })))

            const named = (test: typeof cases[number]) =>
                `${test.set}: ${test.a.label} vs ${test.b.label} under ${test.vision}`

            const green = cases.filter(test => test.finding === undefined)
                .map(test => ({test, name: `${named(test)} ≥ ${THRESHOLD}`}))

            const findings = cases.filter(test => test.finding !== undefined)
                .map(test => ({test, name: `${named(test)} — ${test.finding} (finding 2026-09-18, awaiting the user's decision)`}))

            const message = (test: typeof cases[number]) =>
                `${named(test)} measures ${Math.round(test.distance * 1000) / 1000}`
                + ` (${rgbToHex(colour(test.a))} vs ${rgbToHex(colour(test.b))})`

            it.each(green)('$name', ({test}) => {
                expect(test.distance >= THRESHOLD, message(test)).toBe(true)
            })

            it.fails.each(findings)('$name', ({test}) => {
                expect(test.distance >= THRESHOLD, message(test)).toBe(true)
            })
        })
    })

    /**
     * The brand rainbow carries a meaning of its own: a cooking team wears the stop of its number
     * (ADR-018), so two teams in the same week have to read as two teams. The stops are measured
     * at the same bar, for normal vision, in every palette a member can pick - a preset moves the
     * rungs, so the nine have to stay apart in each of them.
     *
     * The bar stops at normal vision on purpose. Nine hues is two more than the Color Universal
     * Design set has anchors for, and under dichromacy the stops come as close as 0.016 (pink
     * against ocean, protanopia, Farveblind, measured 2026-09-18). WCAG 2.1 §1.4.1 is met by the
     * second channel instead: every team badge carries the team's name, its number or - in the
     * calendar - the day, with the legend and the tooltip naming the team beside it.
     */
    describe.each(PALETTES_UNDER_TEST)('$label: the brand rainbow', ({file}) => {
        const published = file !== null && existsSync(repoPath(file))
        const override = published ? parsePaletteOverrides(repoFile(file!)) : null

        describe.each(MODES)('%s mode', mode => {
            // A preset with no stylesheet is reported by its own palette case above; measuring it
            // here would report the published palette's numbers under the preset's name
            it.skipIf(file !== null && !published)(`keeps its ${RAINBOW.length} stops apart from one another ≥ ${THRESHOLD}`, () => {
                const colour = colourOf((override ?? NO_OVERRIDE)[mode], mode)
                const stops = RAINBOW.map((_, index) => ({label: `RAINBOW[${index}]`, path: `RAINBOW[${index}]`, channel: 'bg' as Channel}))
                const closest = stops.flatMap((a, index) => stops.slice(index + 1)
                    .map(b => ({a, b, distance: deltaEOk(colour(a), colour(b))})))
                    .reduce((worst, pair) => pair.distance < worst.distance ? pair : worst)

                expect(closest.distance >= THRESHOLD,
                    `${closest.a.label} vs ${closest.b.label} measures ${Math.round(closest.distance * 1000) / 1000}`
                    + ` (${rgbToHex(colour(closest.a))} vs ${rgbToHex(colour(closest.b))})`).toBe(true)
            })
        })
    })
})
