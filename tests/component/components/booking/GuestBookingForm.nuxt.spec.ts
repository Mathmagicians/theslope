// @vitest-environment nuxt
import {describe, it, expect, beforeAll, beforeEach, afterEach} from 'vitest'
import {enableAutoUnmount, flushPromises} from '@vue/test-utils'
import GuestBookingForm from '~/components/booking/GuestBookingForm.vue'
import {mountWithTooltipProvider, resetStores, registerEmptyStoreEndpoints, registerScaffoldEndpoint} from '~~/tests/component/testHelpers'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import {bookingContextOf, EMPTY_RELEASED_TICKET_COUNTS} from '~/composables/useBooking'
import {useSeason} from '~/composables/useSeason'
import {useBookingValidation} from '~/composables/useBookingValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import {BOOKING_WORDS} from '~/config/bookingWords'

// Only HTTP is faked: the stores the form creates read their datasets; the preview reads the scaffold's dry run
registerEmptyStoreEndpoints()
const scaffold = registerScaffoldEndpoint()

enableAutoUnmount(afterEach)

beforeEach(() => {
    resetStores()
    scaffold.reset()
})

const dinner = DinnerEventFactory.dinnerEventAt(1, 30)
const ticketPrices = TicketFactory.defaultTicketPrices()
// @nuxt/test-utils starts Nuxt in beforeAll: composables run there, not at module level
let deadlines: ReturnType<ReturnType<typeof useSeason>['deadlinesForSeason']>
beforeAll(() => {
    deadlines = useSeason().deadlinesForSeason(SeasonFactory.defaultSeasonData, new Date())
})

const mount = (prices: TicketPrice[] = ticketPrices) => mountWithTooltipProvider(GuestBookingForm, {
    props: {
        householdId: 1,
        dinnerEvent: dinner,
        ticketPrices: prices,
        allergyTypes: [],
        deadlines,
        releasedTicketCounts: EMPTY_RELEASED_TICKET_COUNTS,
        bookerId: 1,
        bookingContext: bookingContextOf(null, deadlines, prices, new Date())(dinner)
    }
})

// The save button submits the form; the test environment's button click leaves the form unsubmitted
const save = async (wrapper: Awaited<ReturnType<typeof mount>>) => {
    await wrapper.find('form').trigger('submit')
    await flushPromises()
}

// The form's input schema reads the guests the save books: a count it cannot book or no ticket type stops the save
describe('GuestBookingForm validation', () => {
    it.each([
        {count: '0', word: BOOKING_WORDS.guestForm.countMin},
        {count: '11', word: BOOKING_WORDS.guestForm.countMax},
        {count: '1.5', word: BOOKING_WORDS.guestForm.countNotInteger}
    ])('GIVEN $count guests WHEN the form saves THEN it reads "$word" and saves nothing', async ({count, word}) => {
        const wrapper = await mount()
        await wrapper.find('input[type="number"]').setValue(count)

        await save(wrapper)

        expect(wrapper.text()).toContain(word)
        expect(wrapper.emitted('save')).toBeUndefined()
    })

    it('GIVEN a season without an adult ticket, the price the form opens on, WHEN the form saves THEN it asks for a ticket type and saves nothing', async () => {
        const wrapper = await mount(ticketPrices.filter(price => price.ticketType !== useBookingValidation().TicketTypeSchema.enum.ADULT))

        await save(wrapper)

        expect(wrapper.text()).toContain(BOOKING_WORDS.guestForm.ticketPriceMissing)
        expect(wrapper.emitted('save')).toBeUndefined()
    })
})
