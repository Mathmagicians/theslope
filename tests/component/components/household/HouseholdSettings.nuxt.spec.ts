// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount, flushPromises} from '@vue/test-utils'
import {nextTick} from 'vue'
import {addDays} from 'date-fns'
import {mountWithTooltipProvider, mountedStore, clickByTestId, findByTestId, resetStores, registerEmptyStoreEndpoints, untilTrue} from '~~/tests/component/testHelpers'
import HouseholdSettings from '~/components/household/HouseholdSettings.vue'
import {useBookingsStore} from '~/stores/bookings'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {formatDate, DATE_SETTINGS} from '~/utils/date'
import {HOUSEHOLD_WORDS} from '~/config/householdWords'
import {BUTTON_WORDS} from '~/config/buttonWords'

const Action = useBookingValidation().BookingActionSchema.enum

// A household moving out in a month; undoing the move books its people on a dinner after the date
const household = {...HouseholdFactory.defaultHouseholdDetail('household-settings'), moveOutDate: addDays(new Date(), 30)}
const [first, second] = household.inhabitants
const dinner = DinnerEventFactory.dinnerEventAt(1, 40)

// Only HTTP is faked (testing.md Rule 6): the household's run comes back with the other member's line first
registerEmptyStoreEndpoints()
registerEndpoint('/api/calendar/feed', () => 'BEGIN:VCALENDAR')
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
        await vi.waitFor(() => expect(useToast().toasts.value.at(-1)).toMatchObject({title: HOUSEHOLD_WORDS.moveOut.toasts.cleared, description: line}))
        const alert = findByTestId(wrapper, 'last-move-out-result-alert').text()
        expect(alert).toContain(HOUSEHOLD_WORDS.preferences.lastResult.title)
        expect(alert).toContain(HOUSEHOLD_WORDS.moveOut.lastResult(line))
    })
})

// A failed save shows the request's toast alone
describe('HouseholdSettings and a failed move-out save', () => {
    let unregister = () => {}

    beforeEach(() => {
        resetStores()
        useToast().clear()
        unregister = registerEndpoint(`/api/household/${household.id}/update`, {
            method: 'POST',
            handler: () => {
                throw createError({statusCode: 500})
            }
        })
    })

    afterEach(() => unregister())

    it('GIVEN the save fails THEN one toast names the failed save and the edit stays open', async () => {
        const wrapper = await mountWithTooltipProvider(HouseholdSettings, {props: {household}})
        await clickByTestId(wrapper, 'edit-move-out-date')
        for (const _click of [1, 2]) {
            await findByTestId(wrapper, 'clear-move-out-date').find('button').trigger('click')
            await nextTick()
        }

        await vi.waitFor(() => expect(useToast().toasts.value).not.toEqual([]))
        await untilTrue(() => !mountedStore(useBookingsStore).isProcessingBookings)
        await flushPromises()

        expect(useToast().toasts.value.map(toast => toast.description)).toEqual([HOUSEHOLD_WORDS.failed.save.description])
        expect(findByTestId(wrapper, 'cancel-edit-move-out-date').exists()).toBe(true)
    })
})

// The move-out draft starts on the edit button from the household's date; a cancel drops the picked date
describe('HouseholdSettings edits the move-out date', () => {
    beforeEach(() => {
        resetStores()
    })

    it('WHEN the move-out edits THEN the picker holds the household\'s date, WHEN a pick is cancelled THEN the edit reopens on the household\'s date', async () => {
        const wrapper = await mountWithTooltipProvider(HouseholdSettings, {props: {household}})
        const picker = () => wrapper.findComponent({name: 'CalendarDatePicker'})
        const picked = addDays(household.moveOutDate, 7)

        await clickByTestId(wrapper, 'edit-move-out-date')
        expect(picker().props('modelValue')).toEqual(household.moveOutDate)

        picker().vm.$emit('update:modelValue', picked)
        await nextTick()
        expect(picker().props('modelValue')).toEqual(picked)

        await clickByTestId(wrapper, 'cancel-edit-move-out-date')
        await clickByTestId(wrapper, 'edit-move-out-date')
        expect(picker().props('modelValue')).toEqual(household.moveOutDate)
    })
})

// The settings read the household words: the facts, the move-out card in view and in edit mode, the calendar subscription
describe('HouseholdSettings reads the household words', () => {
    beforeEach(() => {
        resetStores()
    })

    const {facts, moveOut, calendarFeed} = HOUSEHOLD_WORDS
    it.each([
        {standing: 'moving out', settings: household, editWords: [moveOut.dateLabel, moveOut.undo.label, BUTTON_WORDS.cancel, moveOut.save]},
        {standing: 'staying', settings: {...household, moveOutDate: null}, editWords: [moveOut.dateLabel, BUTTON_WORDS.cancel, moveOut.set.label]}
    ])('GIVEN a household $standing THEN the tab reads its facts, its move-out and the calendar subscription, WHEN the move-out edits THEN its date and buttons', async ({settings, editWords}) => {
        const wrapper = await mountWithTooltipProvider(HouseholdSettings, {props: {household: settings}})
        const viewWords = [facts.title, facts.pbs(settings.pbsId), facts.movedIn(formatDate(settings.movedInDate)), moveOut.title,
            calendarFeed.title, calendarFeed.intro, calendarFeed.fetch]
        expect(viewWords.filter(word => !wrapper.text().includes(word))).toEqual([])

        await clickByTestId(wrapper, 'edit-move-out-date')

        expect(editWords.filter(word => !wrapper.text().includes(word))).toEqual([])
    })

    it('WHEN the calendar feed is fetched THEN the tab offers its file to download', async () => {
        const wrapper = await mountWithTooltipProvider(HouseholdSettings, {props: {household}})

        await wrapper.findAll('button').find(button => button.text() === calendarFeed.fetch)!.trigger('click')

        await vi.waitFor(() => expect(wrapper.text()).toContain(calendarFeed.generated))
        expect(wrapper.find('a').text()).toBe(calendarFeed.download(calendarFeed.fileName))
        expect(wrapper.find('a').attributes('download')).toBe(calendarFeed.fileName)
    })
})
