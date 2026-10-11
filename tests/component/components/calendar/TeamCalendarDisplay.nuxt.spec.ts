// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import TeamCalendarDisplay from '~/components/calendar/TeamCalendarDisplay.vue'
import {RAINBOW, getRainbowBand} from '~/composables/useTheSlopeDesignSystem'
import {mountWithTooltipProvider, findAllByTestId} from '~~/tests/component/testHelpers'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import type {CookingTeamDisplay} from '~/composables/useCookingTeamValidation'

/**
 * The legend is where every team of a season is on screen at once, so it is where the rule
 * "team number n wears rainbow stop n" is visible (ADR-018). The number is the one in the team's
 * name, else its position in the season's team list. The expected classes come from
 * `getRainbowBand` itself: the spec asserts that the badge binds the token, never what the
 * token is worth - that is the contrast and colour-vision specs' business.
 */
describe('TeamCalendarDisplay legend', () => {
    const {getDefaultCookingTeam} = useCookingTeam()

    const seasonDates = {start: new Date('2026-01-01'), end: new Date('2026-01-31')}

    /** One more team than the rainbow has stops, listed from the highest number down, so position and number differ */
    const teams = Array.from({length: RAINBOW.length + 1}, (_, index) =>
        getDefaultCookingTeam(1, 'S1', index + 1, {id: index + 1})).reverse()
    const bandOf = (number: number) => getRainbowBand(number - 1).split(' ')

    const mount = (shown: CookingTeamDisplay[], seasonTeams: CookingTeamDisplay[] = shown, dinnerEvents = [] as ReturnType<typeof DinnerEventFactory.defaultDinnerEventDisplay>[]) =>
        mountWithTooltipProvider(TeamCalendarDisplay, {
            props: {seasonDates, teams: shown, seasonTeams, dinnerEvents},
            isMd: true
        })

    it(`renders one legend entry per team`, async () => {
        const wrapper = await mount(teams)
        expect(findAllByTestId(wrapper, 'calendar-legend-entry')).toHaveLength(teams.length)
    })

    it.each(teams.map((team, position) => ({position, number: teams.length - position, name: team.name})))(
        '$name, listed at $position, wears the stop of its number', async ({position, number}) => {
            const wrapper = await mount(teams)
            const badge = findAllByTestId(wrapper, 'calendar-legend-badge')[position]!
            expect(badge.classes()).toEqual(expect.arrayContaining(bandOf(number)))
        })

    it(`the stops a season of teams renders are all different, and team ${RAINBOW.length + 1} wraps`, async () => {
        const wrapper = await mount(teams)
        // What a badge renders of the rainbow: its own classes, kept to the ones a stop names
        const stopClasses = new Set(RAINBOW.flatMap(stop => stop.split(' ')))
        const rendered = findAllByTestId(wrapper, 'calendar-legend-badge')
            .map(badge => badge.classes().filter(name => stopClasses.has(name)).sort().join(' '))

        // Listed from the highest number down: the first entry is the wrapping team, the last is team 1
        expect(new Set(rendered.slice(1)).size).toBe(RAINBOW.length)
        expect(rendered[0]).toBe(rendered[RAINBOW.length])
    })

    describe('a renamed team with no number in its name, shown alone', () => {
        const season = [
            getDefaultCookingTeam(1, 'S1', 1, {id: 1}),
            getDefaultCookingTeam(1, 'S1', 2, {id: 2, name: 'Holdet uden tal'}),
            getDefaultCookingTeam(1, 'S1', 3, {id: 3})
        ]
        const renamed = season[1]!
        const dinner = {...DinnerEventFactory.defaultDinnerEventDisplay(), id: 7, date: new Date('2026-01-15'), cookingTeamId: renamed.id!}

        it('the legend badge wears the stop of its position in the season', async () => {
            const wrapper = await mount([renamed], season)
            expect(findAllByTestId(wrapper, 'calendar-legend-badge')[0]!.classes()).toEqual(expect.arrayContaining(bandOf(2)))
        })

        it('its cooking day wears the same stop', async () => {
            const wrapper = await mount([renamed], season, [dinner])
            const day = findAllByTestId(wrapper, 'team-calendar-day')[0]!
            expect(day.classes()).toEqual(expect.arrayContaining(bandOf(2)))
        })
    })
})
