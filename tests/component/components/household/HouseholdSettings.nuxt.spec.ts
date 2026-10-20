// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {nextTick} from 'vue'
import {addDays} from 'date-fns'
import {mountWithTooltipProvider, clickByTestId, findByTestId, resetStores, registerEmptyStoreEndpoints} from '~~/tests/component/testHelpers'
import HouseholdSettings from '~/components/household/HouseholdSettings.vue'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {formatDate, DATE_SETTINGS} from '~/utils/date'

const Action = useBookingValidation().BookingActionSchema.enum

// A household moving out in a month; undoing the move books its people on a dinner after the date
const household = {...HouseholdFactory.defaultHouseholdDetail('household-settings'), moveOutDate: addDays(new Date(), 30)}
const [first, second] = household.inhabitants
const dinner = DinnerEventFactory.dinnerEventAt(1, 40)

// Only HTTP is faked (testing.md Rule 6): the household's run comes back with the other member's line first
registerEmptyStoreEndpoints()
registerEndpoint(`/api/household/${household.id}/update`, {
    method: 'POST',
    handler: () => ({
        household: {...household, moveOutDate: null},
        scaffoldResult: OrderFactory.defaultScaffoldResult({
            dinners: [{id: dinner.id, date: dinner.date}],
            results: [second!, first!].map(({id, name}) => OrderFactory.defaultBookingResult({inhabitantId: id, inhabitantName: name, dinnerEventId: dinner.id, action: Action.BOOK}))
        })
    })
})

enableAutoUnmount(afterEach)

// Undoing a move-out reports what the household's run did: the toast's lines, a line per day, and the same lines in the
// "Sidste ændring" alert
describe('HouseholdSettings reports an undone move-out', () => {
    beforeEach(() => {
        resetStores()
        useToast().clear()
    })

    it('the toast and the alert read the day\'s line, the people in the household\'s order', async () => {
        const wrapper = await mountWithTooltipProvider(HouseholdSettings, {props: {household}})
        await clickByTestId(wrapper, 'edit-move-out-date')
        // The undo confirms on its second click
        for (const _click of [1, 2]) {
            await findByTestId(wrapper, 'clear-move-out-date').find('button').trigger('click')
            await nextTick()
        }

        const line = `${formatDate(dinner.date, DATE_SETTINGS.DAY_MONTH_MASK)}  tilmeldt: ${first!.name}, ${second!.name}`
        await vi.waitFor(() => expect(useToast().toasts.value.at(-1)).toMatchObject({title: 'Fraflytning fortrudt', description: line}))
        expect(findByTestId(wrapper, 'last-move-out-result-alert').text()).toContain(`Fraflytningsdato ændret, og familiens bookinger har ændret sig:\n${line}`)
    })
})
