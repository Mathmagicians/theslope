import {describe, it, expect} from 'vitest'
import {existsSync} from 'node:fs'
import {MODES, NO_OVERRIDE, repoFile, repoPath, type Channel} from './designSystemPairs'
import {hexToRgb, parsePaletteOverrides, rgbToHex, type Rgb} from './contrast'
import {CUD_ANCHORS, VISION_TYPES, deltaEOk, separationUnder} from './colourVision'
import {MEANING_SETS, SEPARATION_BAR as THRESHOLD, casesOf, colourOf} from './designSystemMeanings'
import {BASELINE, COLOUR_SAFE, PALETTES_UNDER_TEST} from './palettes'
import {RAINBOW} from '../../../app/composables/useTheSlopeDesignSystem'

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
 * The bar is **0.075** (`SEPARATION_BAR` in `designSystemMeanings.ts`, with the meaning inventory the
 * palette generator spreads against): the separation the Color Universal Design set itself keeps on
 * its closest pair. The first case here re-measures it, so the bar cannot drift below the data it
 * comes from.
 *
 * When a case fails, fix the palette - never the threshold. Pairs that miss today are listed in
 * FINDINGS with the distance measured on 2026-09-18 and run as `it.fails`, so both a regression in
 * a green pair and a fix of a listed one break the build.
 */

// ---------------------------------------------------------------------------
// What each palette reaches today, measured 2026-09-18
// ---------------------------------------------------------------------------

/**
 * Pairs a palette does not keep apart, keyed `<palette>|<mode>|<a> vs <b>|<vision>`, with the
 * distance it reaches. They run as `it.fails`: a palette change that fixes one breaks the build
 * and asks for the entry to go, and a pair that is not listed may never start failing.
 *
 * Measured 2026-09-18: Glade farver, the base, keeps 42 of its 72 cases; Til farveblinde keeps all 72.
 *
 * finding 2026-09-18, awaiting the user's decision: **a solid slot fill has one rung to give**.
 * It is both the ink of `text-<slot>` on the page and the fill under `text-inverted`, so AA at
 * 4.5:1 puts every slot at the same end of the lightness range - the dark end in light mode, the
 * light end in dark mode - and leaves hue alone to tell the meanings apart. Under protanopia and
 * deuteranopia the red-green axis is the one that goes. The base's rows are that finding: it is
 * the published palette with its lightness walked to AA, and the walk takes each face to the edge.
 *
 * Til farveblinde answers it with the user's decisions of 2026-09-18 ("The meaning faces" in
 * `scripts/palettes/render.ts`): every meaning face takes its Color Universal Design anchor -
 * `neutral` sky blue and `primary` black included - and where AA leaves no room at an anchor's own
 * lightness the faces take the arrangement nearest their anchors' lightness that parts, by lightness,
 * every pair the hues cannot part.
 */
const FINDINGS = new Map<string, number>([
    ['default|light|success vs error|deuteranopia', 0.037],
    ['default|light|success vs warning|deuteranopia', 0.056],
    ['default|light|error vs warning|deuteranopia', 0.061],
    ['default|light|info vs secondary|protanopia', 0.04],
    ['default|light|info vs secondary|deuteranopia', 0.043],
    ['default|light|info vs secondary|tritanopia', 0.033],
    ['default|light|normal vs released|protanopia', 0.017],
    ['default|light|normal vs released|deuteranopia', 0.019],
    ['default|light|normal vs released|tritanopia', 0.07],
    ['default|light|normal vs claimed|deuteranopia', 0.035],
    ['default|light|released vs claimed|deuteranopia', 0.045],
    ['default|light|released vs claimed|tritanopia', 0.062],
    ['default|light|ADULT vs CHILD|deuteranopia', 0.037],
    ['default|light|ADULT vs BABY|protanopia', 0.073],
    ['default|light|CHILD vs BABY|tritanopia', 0.025],
    ['default|dark|success vs error|deuteranopia', 0.043],
    ['default|dark|success vs warning|deuteranopia', 0.069],
    ['default|dark|info vs secondary|protanopia', 0.028],
    ['default|dark|info vs secondary|deuteranopia', 0.028],
    ['default|dark|info vs secondary|tritanopia', 0.012],
    ['default|dark|normal vs released|protanopia', 0.046],
    ['default|dark|normal vs released|deuteranopia', 0.046],
    ['default|dark|normal vs released|tritanopia', 0.044],
    ['default|dark|normal vs claimed|deuteranopia', 0.059],
    ['default|dark|normal vs claimed|tritanopia', 0.056],
    ['default|dark|released vs claimed|protanopia', 0.066],
    ['default|dark|released vs claimed|deuteranopia', 0.046],
    ['default|dark|released vs claimed|tritanopia', 0.051],
    ['default|dark|ADULT vs CHILD|deuteranopia', 0.069],
    ['default|dark|ADULT vs BABY|protanopia', 0.071]
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
     * rungs, so the eight have to stay apart in each of them.
     *
     * A colour-safe palette goes further: its eight stops are the eight colours of the Color
     * Universal Design set, so they stay apart under protanopia, deuteranopia and tritanopia too.
     * The other palettes meet WCAG 2.1 §1.4.1 through the second channel: every team badge carries
     * the team's name, its number or - in the calendar - the day, with the legend and the tooltip
     * naming the team beside it.
     */
    describe.each(PALETTES_UNDER_TEST)('$label: the brand rainbow', ({file, colourSafe}) => {
        const published = file !== null && existsSync(repoPath(file))
        const override = published ? parsePaletteOverrides(repoFile(file!)) : null
        const stops = RAINBOW.map((_, index) => ({label: `RAINBOW[${index}]`, path: `RAINBOW[${index}]`, channel: 'bg' as Channel}))

        /** The closest two stops as `distance` measures them, with the message a failure prints */
        const closestStops = (colour: ReturnType<typeof colourOf>, distance: (a: Rgb, b: Rgb) => number) => {
            const closest = stops.flatMap((a, index) => stops.slice(index + 1)
                .map(b => ({a, b, distance: distance(colour(a), colour(b))})))
                .reduce((worst, pair) => pair.distance < worst.distance ? pair : worst)
            return {
                distance: closest.distance,
                message: `${closest.a.label} vs ${closest.b.label} measures ${Math.round(closest.distance * 1000) / 1000}`
                    + ` (${rgbToHex(colour(closest.a))} vs ${rgbToHex(colour(closest.b))})`
            }
        }

        describe.each(MODES)('%s mode', mode => {
            // A preset with no stylesheet is reported by its own palette case above; measuring it
            // here would report the published palette's numbers under the preset's name
            const unpublished = file !== null && !published
            const colour = colourOf((override ?? NO_OVERRIDE)[mode], mode)

            it.skipIf(unpublished)(`keeps its ${RAINBOW.length} stops apart from one another ≥ ${THRESHOLD}`, () => {
                const {distance, message} = closestStops(colour, deltaEOk)
                expect(distance >= THRESHOLD, message).toBe(true)
            })

            if (colourSafe) {
                it.skipIf(unpublished).each(VISION_TYPES)(`keeps its ${RAINBOW.length} stops apart under %s ≥ ${THRESHOLD}`, vision => {
                    const {distance, message} = closestStops(colour, (a, b) => separationUnder(vision, a, b))
                    expect(distance >= THRESHOLD, message).toBe(true)
                })
            }
        })
    })
})
