// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {reactive} from 'vue'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {findByTestId, clickByTestId} from '~~/tests/component/testHelpers'
import {PLANNING_TEST_IDS} from '~~/tests/component/components/admin/planningTestIds'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import TicketPriceListEditor from '~/components/admin/planning/TicketPriceListEditor.vue'

describe('TicketPriceListEditor', () => {

    const mount = async (disabled = false) => {
        // reactive so an in-place splice by the component re-renders the list
        const modelValue = reactive(TicketFactory.defaultTicketPrices())
        const wrapper = await mountSuspended(TicketPriceListEditor, {props: {modelValue, disabled}})
        return {wrapper, modelValue}
    }

    it('offers the add control', async () => {
        const {wrapper} = await mount()
        const addButton = findByTestId(wrapper, PLANNING_TEST_IDS.ticketAdd)
        expect(addButton.exists()).toBe(true)
        expect(addButton.text()).toContain('Tilføj billet')
    })

    it('renders a remove control per ticket price', async () => {
        const {wrapper, modelValue} = await mount()
        modelValue.forEach((_, index) =>
            expect(findByTestId(wrapper, PLANNING_TEST_IDS.ticketRemove(index)).exists()).toBe(true)
        )
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
