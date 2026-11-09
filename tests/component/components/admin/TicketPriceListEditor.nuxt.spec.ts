// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {findByTestId, clickByTestId, resetStores, itemAt, emittedPayload} from '~~/tests/component/testHelpers'
import {PLANNING_TEST_IDS} from '~~/tests/component/components/admin/planningTestIds'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import TicketPriceListEditor from '~/components/admin/planning/TicketPriceListEditor.vue'
import {ticketPriceSelectItems} from '~/composables/useBookingUi'
import {useTicketPriceValidation} from '~/composables/useTicketPriceValidation'
import {SEASON_WORDS} from '~/config/seasonWords'

enableAutoUnmount(afterEach)

describe('TicketPriceListEditor', () => {

    beforeEach(() => {
        resetStores()
    })

    const mount = async (disabled = false) => {
        const modelValue = TicketFactory.defaultTicketPrices()
        const wrapper = await mountSuspended(TicketPriceListEditor, {props: {modelValue, disabled}})
        return {wrapper, modelValue}
    }

    it('offers the add control, and each price shows its ticket type and price on the badge, its age limit and description beside it, and a remove control', async () => {
        const {wrapper, modelValue} = await mount()
        const addButton = findByTestId(wrapper, PLANNING_TEST_IDS.ticketAdd)
        expect(addButton.exists()).toBe(true)
        expect(addButton.text()).toContain(SEASON_WORDS.ticketPriceEditor.add)

        const rows = wrapper.findAll('li')
        expect(rows).toHaveLength(modelValue.length)
        ticketPriceSelectItems(modelValue).forEach((item, index) => {
            expect(itemAt(rows, index).text()).toContain(item.label)
            expect(itemAt(rows, index).text()).toContain(item.description)
            expect(findByTestId(wrapper, PLANNING_TEST_IDS.ticketRemove(index)).exists()).toBe(true)
        })
    })

    it('removing a row emits the prices without it and leaves the bound list as it was', async () => {
        const {wrapper, modelValue} = await mount()
        const before = [...modelValue]

        await clickByTestId(wrapper, PLANNING_TEST_IDS.ticketRemove(0))

        expect(emittedPayload(wrapper, 'update:modelValue', useTicketPriceValidation().TicketPriceSchema.array())).toEqual(before.slice(1))
        expect(modelValue).toEqual(before)
    })

    it('disabled hides both the add and the remove controls', async () => {
        const {wrapper} = await mount(true)
        expect(findByTestId(wrapper, PLANNING_TEST_IDS.ticketAdd).exists()).toBe(false)
        expect(findByTestId(wrapper, PLANNING_TEST_IDS.ticketRemove(0)).exists()).toBe(false)
    })
})
