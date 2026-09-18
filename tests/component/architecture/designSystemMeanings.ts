/**
 * The meaning inventory of the design system: the colours that mean something, grouped by the
 * company they keep.
 *
 * `designSystemColourVision.unit.spec.ts` measures these pairs under protanopia, deuteranopia and
 * tritanopia; `scripts/palettes/render.ts` spreads a colour-safe preset's meaning faces against
 * them. One module, so a preset is generated against the same inventory it is measured by - the
 * same arrangement `designSystemPairs.ts` makes for contrast.
 */

import {ORDER_STATE_COLORS, TICKET_TYPE_COLORS} from '../../../app/composables/useTheSlopeDesignSystem'
import {createResolver, leafClasses, pickColour, type Channel, type Mode} from './designSystemPairs'
import {composite, type ModeOverride, type Rgb} from './contrast'

/**
 * The bar two meanings keep apart, ΔE in Oklab: the separation the Color Universal Design set
 * itself keeps on its closest pair (bluish green vs reddish purple, deuteranopia). A palette built
 * on those anchors can promise what the anchors promise and no more, so the set sets the bar -
 * `designSystemColourVision.unit.spec.ts` re-measures it, so the bar cannot drift below the data
 * it comes from. For scale, ~0.02 is the just-noticeable difference in Oklab, so 0.075 is between
 * three and four of them.
 */
export const SEPARATION_BAR = 0.075

/** One meaning, and the face the design system paints it with */
export type Meaning = {label: string, slot?: string, faces?: {path: string, channel: Channel}[]}

/**
 * A set of meanings that appear in one another's company, so a member has to tell them apart.
 * Every pair of a set is a case; a meaning drawn by more than one token is measured at each face,
 * because each is a place the member sees it.
 */
export const MEANING_SETS: {name: string, meanings: Meaning[]}[] = [
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
export type Swatch = {label: string, slot?: string, path?: string, channel?: Channel}

const swatches = ({label, slot, faces}: Meaning): Swatch[] =>
    faces ? faces.map(face => ({label: `${label} (${face.path})`, ...face})) : [{label, slot}]

/** Every pair of two different meanings of a set, at every face each is drawn with */
export const casesOf = (meanings: Meaning[]): [Swatch, Swatch][] => meanings.flatMap((first, index) =>
    meanings.slice(index + 1).flatMap(second =>
        swatches(first).flatMap(a => swatches(second).map(b => [a, b] as [Swatch, Swatch]))))

/** Every pair the inventory measures, with the set it belongs to */
export const MEANING_CASES = MEANING_SETS.flatMap(set => casesOf(set.meanings).map(([a, b]) => ({set: set.name, a, b})))

/**
 * The palette variable a swatch paints and the colour it paints, composited onto the page it sits
 * on. A slot resolves to the fill Nuxt UI paints for `bg-<slot>` at the rung the palette points it
 * at - the face a solid badge, a button and a filled marker all show.
 */
export const swatchResolver = (override: ModeOverride, mode: Mode) => {
    const resolve = createResolver(override)
    const page = resolve('default', 'bg', mode)!
    return (swatch: Swatch) => {
        const sourced = swatch.slot
            ? resolve(swatch.slot, 'bg', mode)
            : pickColour(resolve, leafClasses(swatch.path!), swatch.channel!, mode)
        if (!sourced) throw new Error(`${swatch.label} paints no colour in ${mode} mode`)
        return {colour: composite(sourced.colour, page.colour) as Rgb, source: sourced.source}
    }
}

/** The colour a swatch paints in one mode of a palette */
export const colourOf = (override: ModeOverride, mode: Mode) => {
    const swatch = swatchResolver(override, mode)
    return (of: Swatch): Rgb => swatch(of).colour
}
