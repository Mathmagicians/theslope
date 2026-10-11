// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import MyTeamSelector from '~/components/cooking-team/MyTeamSelector.vue'
import {getRainbowBand} from '~/composables/useTheSlopeDesignSystem'
import {mountWithTooltipProvider, findAllByTestId} from '~~/tests/component/testHelpers'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'

/**
 * The selector shows the user's own teams, a subset of the season. Each badge wears the rainbow stop of
 * the team's number: the one in its name, else its position in the season's teams - never its position
 * among the user's teams.
 */
describe('MyTeamSelector team colours', () => {
    const seasonTeams = [
        SeasonFactory.defaultCookingTeamDisplay({id: 11, name: 'Madhold 1 - S1'}),
        SeasonFactory.defaultCookingTeamDisplay({id: 12, name: 'Holdet uden tal'}),
        SeasonFactory.defaultCookingTeamDisplay({id: 13, name: 'Madhold 3 - S1'})
    ]
    const [first, renamed, third] = seasonTeams as [typeof seasonTeams[0], typeof seasonTeams[0], typeof seasonTeams[0]]

    it.each([
        {mine: [third, renamed], numbers: [3, 2], description: 'numbered team listed first, renamed team second'},
        {mine: [renamed], numbers: [2], description: 'the renamed team alone takes its season position'},
        {mine: [first, third], numbers: [1, 3], description: 'numbers in the names, a gap between them'}
    ])('badges wear the stops of $numbers ($description)', async ({mine, numbers}) => {
        const wrapper = await mountWithTooltipProvider(MyTeamSelector, {props: {teams: mine, seasonTeams, modelValue: mine[0]!.id}, isMd: true})
        const badges = findAllByTestId(wrapper, 'team-badge-name')
        expect(badges).toHaveLength(numbers.length)
        badges.forEach((badge, index) =>
            expect(badge.classes()).toEqual(expect.arrayContaining(getRainbowBand(numbers[index]! - 1).split(' '))))
    })
})
