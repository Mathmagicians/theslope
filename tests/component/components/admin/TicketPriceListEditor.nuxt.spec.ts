// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {reactive} from 'vue'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {findByTestId, clickByTestId, resetStores} from '~~/tests/component/testHelpers'
import {PLANNING_TEST_IDS} from '~~/tests/component/components/admin/planningTestIds'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import TicketPriceListEditor from '~/components/admin/planning/TicketPriceListEditor.vue'
import {ticketPriceSelectItems} from '~/composables/useBookingUi'

enableAutoUnmount(afterEach)

describe('TicketPriceListEditor', () => {

    beforeEach(() => {
        resetStores()
    })

    const mount = async (disabled = false) => {
        // reactive so an in-place splice by the component re-renders the list
        const modelValue = reactive(TicketFactory.defaultTicketPrices())
        const wrapper = await mountSuspended(TicketPriceListEditor, {props: {modelValue, disabled}})
        return {wrapper, modelValue}
    }

    it('offers the add control, and each price shows its ticket type and price on the badge, its age limit and description beside it, and a remove control', async () => {
        const {wrapper, modelValue} = await mount()
        const addButton = findByTestId(wrapper, PLANNING_TEST_IDS.ticketAdd)
        expect(addButton.exists()).toBe(true)
        expect(addButton.text()).toContain('Tilføj billet')

        const rows = wrapper.findAll('li')
        expect(rows).toHaveLength(modelValue.length)
        ticketPriceSelectItems(modelValue).forEach((item, index) => {
            expect(rows[index]!.text()).toContain(item.label)
            expect(rows[index]!.text()).toContain(item.description)
            expect(findByTestId(wrapper, PLANNING_TEST_IDS.ticketRemove(index)).exists()).toBe(true)
        })
    })

    it('removing a row drops it from the model', async () => {
        const {wrapper, modelValue} = await mount()
        const removed = modelValue[0]
        const before = modelValue.length

        await clickByTestId(wrapper, PLANNING_TEST_IDS.ticketRemove(0))

        expect(modelValue).toHaveLength(before - 1)
        expect(modelValue).not.toContain(removed)
        expect(findByTestId(wrapper, PLANNING_TEST_IDS.ticketRemove(before - 1)).exists()).toBe(false)
    })

    it('disabled hides both the add and the remove controls', async () => {
        const {wrapper} = await mount(true)
        expect(findByTestId(wrapper, PLANNING_TEST_IDS.ticketAdd).exists()).toBe(false)
        expect(findByTestId(wrapper, PLANNING_TEST_IDS.ticketRemove(0)).exists()).toBe(false)
    })
})
