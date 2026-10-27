// @vitest-environment nuxt
import {describe, it, expect, beforeAll, beforeEach, afterEach} from 'vitest'
import {enableAutoUnmount} from '@vue/test-utils'
import {nextTick} from 'vue'
import MyTeamSelector from '~/components/cooking-team/MyTeamSelector.vue'
import type {CookingTeamDisplay} from '~/composables/useCookingTeamValidation'
import {useCookingTeam} from '~/composables/useCookingTeam'
import {getRainbowBand} from '~/composables/useTheSlopeDesignSystem'
import {TEAM_WORDS} from '~/config/teamWords'
import {mountWithTooltipProvider, findAllByTestId, resetStores} from '~~/tests/component/testHelpers'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'

enableAutoUnmount(afterEach)

beforeEach(() => {
    resetStores()
})

const seasonTeams = [
    SeasonFactory.defaultCookingTeamDisplay({id: 11, name: 'Madhold 1 - S1'}),
    SeasonFactory.defaultCookingTeamDisplay({id: 12, name: 'Holdet uden tal'}),
    SeasonFactory.defaultCookingTeamDisplay({id: 13, name: 'Madhold 3 - S1'})
]
const [first, renamed, third] = seasonTeams as [CookingTeamDisplay, CookingTeamDisplay, CookingTeamDisplay]

/**
 * The selector shows the user's own teams, a subset of the season. Each badge wears the rainbow stop of
 * the team's number: the one in its name, else its position in the season's teams - never its position
 * among the user's teams.
 */
describe('MyTeamSelector team colours', () => {
    it.each([
        {mine: [third, renamed], numbers: [3, 2], description: 'numbered team listed first, renamed team second'},
        {mine: [renamed], numbers: [2], description: 'the renamed team alone takes its season position'}
    ])('badges wear the stops of $numbers ($description)', async ({mine, numbers}) => {
        const wrapper = await mountWithTooltipProvider(MyTeamSelector, {props: {teams: mine, seasonTeams, modelValue: mine[0]!.id}, isMd: true})
        const badges = findAllByTestId(wrapper, 'team-badge-name')
        expect(badges).toHaveLength(numbers.length)
        badges.forEach((badge, index) =>
            expect(badge.classes()).toEqual(expect.arrayContaining(getRainbowBand(numbers[index]! - 1).split(' '))))
    })
})

/**
 * A team on view the person is not on rides as the last tab, marked as a visit; it counts as a tab for the
 * orientation, and it stands in for the empty state of a person on no team.
 */
describe('MyTeamSelector visiting team', () => {
    const VISIT_BADGE = 'my-team-visit-badge'
    const visiting = third
    // The person's own teams: the first n teams of the season before the visiting one
    const ownTeams = (count: number) => [first, renamed].slice(0, count)

    let getTeamShortName: ReturnType<typeof useCookingTeam>['getTeamShortName']
    beforeAll(() => {
        ({getTeamShortName} = useCookingTeam())
    })

    const mountWithVisit = (teams: CookingTeamDisplay[]) => mountWithTooltipProvider(MyTeamSelector, {
        props: {teams, seasonTeams, visitingTeam: visiting, modelValue: teams[0]?.id ?? null},
        isMd: true
    })
    type Mounted = Awaited<ReturnType<typeof mountWithVisit>>
    const tabsOf = (wrapper: Mounted) => wrapper.findAll('[role="tab"]')

    it.each([
        {own: 2, where: 'after the own teams'},
        {own: 0, where: 'alone, in place of the empty state'}
    ])('the visiting team is the last tab and the only one marked as a visit ($where)', async ({own}) => {
        const wrapper = await mountWithVisit(ownTeams(own))

        const tabs = tabsOf(wrapper)
        expect(tabs, 'a tab per own team and one for the visit').toHaveLength(own + 1)
        const visitTab = tabs.at(-1)!
        expect(visitTab.text()).toContain(getTeamShortName(visiting.name))
        const badges = findAllByTestId(wrapper, VISIT_BADGE)
        expect(badges).toHaveLength(1)
        expect(badges[0]!.text()).toBe(TEAM_WORDS.visit.badge)
        expect(visitTab.element.contains(badges[0]!.element), 'the badge sits on the visiting tab').toBe(true)
        expect(wrapper.text()).not.toContain('Ingen madhold')
    })

    it('choosing the visiting tab asks for the visiting team', async () => {
        const wrapper = await mountWithVisit(ownTeams(1))

        await tabsOf(wrapper).at(-1)!.trigger('mousedown', {button: 0})
        await nextTick()

        expect(wrapper.emitted('update:modelValue')).toEqual([[visiting.id]])
    })

    it.each([
        {own: 2, orientation: 'vertical'},
        {own: 1, orientation: 'horizontal'}
    ])('at md, $own own team(s) and the visiting team lay the tabs out $orientation', async ({own, orientation}) => {
        const wrapper = await mountWithVisit(ownTeams(own))

        expect(wrapper.find('[role="tablist"]').attributes('data-orientation')).toBe(orientation)
    })
})
