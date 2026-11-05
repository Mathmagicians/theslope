// @vitest-environment nuxt
import {describe, it, expect, beforeAll, beforeEach, afterEach} from 'vitest'
import {enableAutoUnmount} from '@vue/test-utils'
import TeamRoleStatus from '~/components/chef/TeamRoleStatus.vue'
import {useCookingTeam} from '~/composables/useCookingTeam'
import {useCookingTeamValidation, type CookingTeamAssignment} from '~/composables/useCookingTeamValidation'
import {ROLE_ICONS} from '~/composables/useTheSlopeDesignSystem'
import {TEAM_WORDS} from '~/config/teamWords'
import {iconNamesIn, mountWithTooltipProvider, resetStores} from '~~/tests/component/testHelpers'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'

enableAutoUnmount(afterEach)

const Role = useCookingTeamValidation().TeamRoleSchema.enum
const TEAM_ID = 3
const TEAM_NAME = 'Madhold 3 - S1'
const ME = 42
const SOMEONE_ELSE = 43

// The team on view holds one assignment; the person reading the status is ME
const mountStatus = (assignment: CookingTeamAssignment) => mountWithTooltipProvider(TeamRoleStatus, {
    props: {
        team: SeasonFactory.defaultCookingTeamDisplay({id: TEAM_ID, name: TEAM_NAME, assignments: [assignment]}),
        inhabitantId: ME
    }
})

/**
 * The person's place on the team on view: the role they hold, under the role's icon, or a visitor's line when they
 * hold none. The team is named by its short name.
 */
describe('TeamRoleStatus', () => {
    let shortName: string
    beforeAll(() => {
        shortName = useCookingTeam().getTeamShortName(TEAM_NAME)
    })

    beforeEach(() => {
        resetStores()
    })

    it.each(Object.values(Role))('a %s on the team reads the role\'s title and description under the role\'s icon', async (role) => {
        const wrapper = await mountStatus(SeasonFactory.defaultCookingTeamAssignment({cookingTeamId: TEAM_ID, inhabitantId: ME, role}))

        expect(wrapper.text()).toContain(TEAM_WORDS.roles[role].title)
        expect(wrapper.text()).toContain(TEAM_WORDS.roles[role].description(shortName))
        expect(iconNamesIn(wrapper)).toEqual([ROLE_ICONS[role]])
    })

    it('a visitor, on view of a team they are not on, reads that they are not on it', async () => {
        const wrapper = await mountStatus(SeasonFactory.defaultCookingTeamAssignment({cookingTeamId: TEAM_ID, inhabitantId: SOMEONE_ELSE}))

        expect(wrapper.text()).toContain(TEAM_WORDS.visit.line(shortName))
    })
})
