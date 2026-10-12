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

    it.each([
        {id: 'name', token: 'householdMemberName'},
        {id: 'ticketType', token: 'householdTicketType'}
    ] as const)('the $id column binds its column token', async ({id, token}) => {
        const wrapper = await mountCard(isMd)
        const columns = wrapper.findComponent({name: 'UTable'}).props('columns') as Array<{id: string}>
        expect(columns.find(column => column.id === id)).toEqual({id, ...createTableColumns(ref(isMd))[token]})
    })

    it('the ticket type column renders its header and cells from md through its column meta', async () => {
        const wrapper = await mountCard(isMd)
        const columns = wrapper.findComponent({name: 'UTable'}).props('columns') as Array<{id: string}>
        const index = columns.findIndex(column => column.id === 'ticketType')
        const {meta} = createTableColumns(ref(isMd)).householdTicketType
        expect(wrapper.findAll('thead th')[index]!.classes()).toEqual(expect.arrayContaining(meta.class.th.split(' ')))
        expect(wrapper.findAll('tbody tr')[0]!.findAll('td')[index]!.classes()).toEqual(expect.arrayContaining(meta.class.td.split(' ')))
    })

    it('an open member row groups its actions at the card field group size', async () => {
        const wrapper = await mountCard(isMd)
        await clickByTestId(wrapper, `inhabitant-${inhabitant.id}-edit-preferences`)
        const actions = wrapper.findAllComponents({name: 'UFieldGroup'})
            .find(group => group.find('[data-testid="cancel-preferences"]').exists())
        expect(actions?.props('size')).toBe(createResponsiveSizes(ref(isMd)).cardFieldGroup)
    })
})
