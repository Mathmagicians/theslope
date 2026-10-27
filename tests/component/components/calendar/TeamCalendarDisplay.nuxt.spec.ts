// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {enableAutoUnmount} from '@vue/test-utils'
import TeamCalendarDisplay from '~/components/calendar/TeamCalendarDisplay.vue'
import {RAINBOW, getRainbowBand} from '~/composables/useTheSlopeDesignSystem'
import {mountWithTooltipProvider, findAllByTestId, resetStores} from '~~/tests/component/testHelpers'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import type {CookingTeamDisplay} from '~/composables/useCookingTeamValidation'

enableAutoUnmount(afterEach)

/**
 * The legend is where every team of a season is on screen at once, so it is where the rule
 * "team number n wears rainbow stop n" is visible (ADR-018). The number is the one in the team's
 * name, else its position in the season's team list. The expected classes come from
 * `getRainbowBand` itself: the spec asserts that the badge binds the token, never what the
 * token is worth - that is the contrast and colour-vision specs' business.
 */
describe('TeamCalendarDisplay legend', () => {
    const seasonDates = {start: new Date('2026-01-01'), end: new Date('2026-01-31')}

    /** One more team than the rainbow has stops, listed from the highest number down, so position and number differ */
    const teams = Array.from({length: RAINBOW.length + 1}, (_, index) =>
        SeasonFactory.defaultCookingTeamDisplay({id: index + 1, name: `Madhold ${index + 1} - S1`})).reverse()
    const bandOf = (number: number) => getRainbowBand(number - 1).split(' ')

    beforeEach(() => {
        resetStores()
    })

    const mount = (shown: CookingTeamDisplay[], seasonTeams: CookingTeamDisplay[] = shown, dinnerEvents = [] as ReturnType<typeof DinnerEventFactory.defaultDinnerEventDisplay>[]) =>
        mountWithTooltipProvider(TeamCalendarDisplay, {
            props: {seasonDates, teams: shown, seasonTeams, dinnerEvents},
            isMd: true
        })

    it(`renders one legend entry per team, each wearing the stop of its number; the stops are all different and team ${RAINBOW.length + 1} wraps`, async () => {
        const wrapper = await mount(teams)
        expect(findAllByTestId(wrapper, 'calendar-legend-entry')).toHaveLength(teams.length)

        // Listed from the highest number down
        const badges = findAllByTestId(wrapper, 'calendar-legend-badge')
        teams.forEach((_team, position) => expect(badges[position]!.classes()).toEqual(expect.arrayContaining(bandOf(teams.length - position))))

        // What a badge renders of the rainbow: its own classes, kept to the ones a stop names
        const stopClasses = new Set(RAINBOW.flatMap(stop => stop.split(' ')))
        const rendered = badges.map(badge => badge.classes().filter(name => stopClasses.has(name)).sort().join(' '))
        // The first entry is the wrapping team, the last is team 1
        expect(new Set(rendered.slice(1)).size).toBe(RAINBOW.length)
        expect(rendered[0]).toBe(rendered[RAINBOW.length])
    })

    it('a renamed team with no number in its name, shown alone, wears the stop of its position in the season on its legend badge and its cooking day', async () => {
        const season = [
            SeasonFactory.defaultCookingTeamDisplay({id: 1, name: 'Madhold 1 - S1'}),
            SeasonFactory.defaultCookingTeamDisplay({id: 2, name: 'Holdet uden tal'}),
            SeasonFactory.defaultCookingTeamDisplay({id: 3, name: 'Madhold 3 - S1'})
        ]
        const renamed = season[1]!
        const dinner = {...DinnerEventFactory.defaultDinnerEventDisplay(), id: 7, date: new Date('2026-01-15'), cookingTeamId: renamed.id}

        const wrapper = await mount([renamed], season, [dinner])

        expect(findAllByTestId(wrapper, 'calendar-legend-badge')[0]!.classes()).toEqual(expect.arrayContaining(bandOf(2)))
        const day = findAllByTestId(wrapper, 'team-calendar-day')[0]!
        expect(day.classes()).toEqual(expect.arrayContaining(bandOf(2)))
    })
})
