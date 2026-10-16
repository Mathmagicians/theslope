// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {flushPromises, enableAutoUnmount} from '@vue/test-utils'
import {ref} from 'vue'
import {mountWithTooltipProvider, clickByTestId, resetStores, VIEWPORTS} from '~~/tests/component/testHelpers'
import HouseholdCard from '~/components/household/HouseholdCard.vue'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {createResponsiveSizes, createTableColumns} from '~/composables/useTheSlopeDesignSystem'

// Only HTTP is faked (testing.md Rule 6)
const season = {...SeasonFactory.defaultSeason('household-card'), id: 1}
registerEndpoint('/api/admin/season/active', () => season.id)
registerEndpoint(`/api/admin/season/${season.id}`, () => season)
registerEndpoint('/api/admin/season', () => [season])
registerEndpoint('/api/admin/household', () => [])

// The next test's resetStores drops the datasets a still-mounted card reads
enableAutoUnmount(afterEach)

const household = HouseholdFactory.defaultHouseholdDetail('household-card')
const inhabitant = household.inhabitants[0]!

const mountCard = async (isMd: boolean) => {
    const wrapper = await mountWithTooltipProvider(HouseholdCard, {props: {household, canEdit: true}, isMd})
    await flushPromises()
    return wrapper
}

describe.each(VIEWPORTS)('HouseholdCard on $viewport', ({isMd}) => {
    beforeEach(() => {
        resetStores()
    })

    it('the name and ticket type columns bind their column tokens', async () => {
        const wrapper = await mountCard(isMd)
        const columns = wrapper.findComponent({name: 'UTable'}).props('columns') as Array<{id: string}>
        const tokens = createTableColumns(ref(isMd))
        expect(columns.find(column => column.id === 'name')).toEqual({id: 'name', ...tokens.householdMemberName})
        expect(columns.find(column => column.id === 'ticketType')).toEqual({id: 'ticketType', ...tokens.householdTicketType})
    })

    it('an open member row groups its actions at the card field group size', async () => {
        const wrapper = await mountCard(isMd)
        await clickByTestId(wrapper, `inhabitant-${inhabitant.id}-edit-preferences`)
        const actions = wrapper.findAllComponents({name: 'UFieldGroup'})
            .find(group => group.find('[data-testid="cancel-preferences"]').exists())
        expect(actions?.props('size')).toBe(createResponsiveSizes(ref(isMd)).cardFieldGroup)
    })
})
