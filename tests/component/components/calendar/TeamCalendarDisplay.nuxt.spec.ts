// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import TeamCalendarDisplay from '~/components/calendar/TeamCalendarDisplay.vue'
import {RAINBOW, getRainbowBand} from '~/composables/useTheSlopeDesignSystem'
import {mountWithTooltipProvider, findAllByTestId} from '~~/tests/component/testHelpers'

/**
 * The legend is where every team of a season is on screen at once, so it is where the rule
 * "team number n wears rainbow stop n" is visible (ADR-018). The expected classes come from
 * `getRainbowBand` itself: the spec asserts that the badge binds the token, never what the
 * token is worth - that is the contrast and colour-vision specs' business.
 */
describe('TeamCalendarDisplay legend', () => {
    const {getDefaultCookingTeam} = useCookingTeam()

    const seasonDates = {start: new Date('2026-01-01'), end: new Date('2026-01-31')}

    /** One more team than the rainbow has stops, so the last one has to wrap */
    const teams = Array.from({length: RAINBOW.length + 1}, (_, index) =>
        getDefaultCookingTeam(1, 'S1', index + 1, {id: index + 1}))

    const mount = (teamCount: number) => mountWithTooltipProvider(TeamCalendarDisplay, {
        props: {seasonDates, teams: teams.slice(0, teamCount), dinnerEvents: []},
        isMd: true
    })

    it(`renders one legend entry per team`, async () => {
        const wrapper = await mount(teams.length)
        expect(findAllByTestId(wrapper, 'team-legend-entry')).toHaveLength(teams.length)
    })

    it.each(teams.map((team, index) => ({index, name: team.name})))(
        'team $index wears its own rainbow stop', async ({index}) => {
            const wrapper = await mount(teams.length)
            const badge = findAllByTestId(wrapper, 'team-legend-badge')[index]!
            expect(badge.classes()).toEqual(expect.arrayContaining(getRainbowBand(index).split(' ')))
        })

    it('the stops a season of teams renders are all different, and the tenth wraps', async () => {
        const wrapper = await mount(teams.length)
        // What a badge renders of the rainbow: its own classes, kept to the ones a stop names
        const stopClasses = new Set(RAINBOW.flatMap(stop => stop.split(' ')))
        const rendered = findAllByTestId(wrapper, 'team-legend-badge')
            .map(badge => badge.classes().filter(name => stopClasses.has(name)).sort().join(' '))

        expect(new Set(rendered.slice(0, RAINBOW.length)).size).toBe(RAINBOW.length)
        expect(rendered[RAINBOW.length]).toBe(rendered[0])
    })
})
