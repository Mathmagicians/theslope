// @vitest-environment nuxt
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from "@nuxt/test-utils/runtime"
import {mountWithTooltipProvider, findByTestId, findDateSegments, dateSegment, asCalendarDays, resetStores, iconNamesIn, emittedPayload} from '~~/tests/component/testHelpers'
import {ICONS, COMPONENTS, type CalendarPickerSelection} from '~/composables/useTheSlopeDesignSystem'
import {dateRangeSchema} from '~/composables/useDateRangeValidation'
import {SEASON_WORDS} from '~/config/seasonWords'
import {DATE_WORDS} from '~/config/dateWords'
import type {DateRange} from '~/types/dateTypes'
import {PLANNING_TEST_IDS} from '~~/tests/component/components/admin/planningTestIds'
import CalendarDateRangeListPicker from '~/components/calendar/CalendarDateRangeListPicker.vue'
import { nextTick, ref, type ComponentPublicInstance } from 'vue'
import { enableAutoUnmount } from '@vue/test-utils'
import {formatDateRange} from '~/utils/date'

enableAutoUnmount(afterEach)

describe('CalendarDateRangeListPicker', () => {
    beforeEach(() => {
        resetStores()
    })

    // The mounts with `attrs` and `setProps` below stay on the root mount, which alone takes them
    const createWrapper = (modelValue: DateRange[] = [], props: Record<string, unknown> = {}) =>
        mountWithTooltipProvider(CalendarDateRangeListPicker, {props: {modelValue, ...props}, isMd: true})

    type WrapperType = Awaited<ReturnType<typeof createWrapper>>

    const setDateRange = async (wrapper: WrapperType, start: Date, end: Date) => {
        const datePicker = wrapper.findComponent({ name: 'CalendarDateRangePicker' })
        await datePicker.vm.$emit('update:modelValue', { start, end })
        await nextTick()
    }

    const clickAddButton = async (wrapper: WrapperType) => {
        const addButton = findByTestId(wrapper, PLANNING_TEST_IDS.holidayAdd)
        await addButton.trigger('click')
        await nextTick()
    }

    it('renders with empty date ranges', async () => {
        const wrapper = await createWrapper()
        expect(wrapper.exists()).toBe(true)
        const addButton = findByTestId(wrapper, PLANNING_TEST_IDS.holidayAdd)
        expect(addButton.text()).toContain(DATE_WORDS.picker.holidays.add)
        expect(addButton.classes()).toContain(COMPONENTS.holidayListPicker.addButton.plain)
    })

    it('adds a holiday period', async () => {
        const wrapper = await createWrapper()

        await setDateRange(
            wrapper,
            new Date(2025, 0, 1),
            new Date(2025, 0, 5)
        )

        await clickAddButton(wrapper)

        expect(asCalendarDays(emittedPayload(wrapper, 'update:modelValue', dateRangeSchema.array(), 0))).toEqual([
            {start: '2025-01-01', end: '2025-01-05'}
        ])

        const holidayInput = findByTestId(wrapper, PLANNING_TEST_IDS.holidayItem(0))
        expect(holidayInput.exists()).toBe(true)
    })

    it('inserts an earlier range before an existing later one', async () => {
        const later = {start: new Date(2025, 0, 10), end: new Date(2025, 0, 12)}
        const earlier = {start: new Date(2025, 0, 1), end: new Date(2025, 0, 3)}
        const wrapper = await createWrapper([later])

        await setDateRange(wrapper, earlier.start, earlier.end)
        await clickAddButton(wrapper)

        expect(asCalendarDays(emittedPayload(wrapper, 'update:modelValue', dateRangeSchema.array(), 0))).toEqual([
            {start: '2025-01-01', end: '2025-01-03'},
            {start: '2025-01-10', end: '2025-01-12'}
        ])

        // Edit mode renders each row as a picker: its start-day segments hold the earlier date
        const firstRow = findByTestId(wrapper, PLANNING_TEST_IDS.holidayItem(0))
        expect(dateSegment(firstRow, 'day').attributes('aria-valuenow')).toBe(String(earlier.start.getDate()))
        expect(dateSegment(firstRow, 'year').attributes('aria-valuenow')).toBe(String(earlier.start.getFullYear()))
    })

    it('validates overlapping ranges', async () => {
        const wrapper = await createWrapper([{
            start: new Date(2025, 0, 1),
            end: new Date(2025, 0, 10)
        }])

        await setDateRange(
            wrapper,
            new Date(2025, 0, 5),
            new Date(2025, 0, 15)
        )

        await clickAddButton(wrapper)
        expect(wrapper.html()).toContain(SEASON_WORDS.form.holidaysOverlap)
        // The error line under the period field lowers the field's foot, so the add button drops with it
        expect(findByTestId(wrapper, PLANNING_TEST_IDS.holidayAdd).classes()).toContain(COMPONENTS.holidayListPicker.addButton.withError)
    })

    it('removes a holiday period by emitting the list without it', async () => {
        const holidays = [{start: new Date(2025, 0, 1), end: new Date(2025, 0, 5)}]
        const wrapper = await createWrapper(holidays)

        await findByTestId(wrapper, PLANNING_TEST_IDS.holidayRemove(0)).trigger('click')

        expect(emittedPayload(wrapper, 'update:modelValue', dateRangeSchema.array())).toEqual([])
        expect(holidays).toHaveLength(1)
    })

    it('renders correctly in disabled mode with holiday periods: read-only rows, no add or remove', async () => {
        const first = {start: new Date(2025, 0, 1), end: new Date(2025, 0, 5)}
        const wrapper = await createWrapper([first], {disabled: true})

        // The row is a read-only input holding the period
        const row = findByTestId(wrapper, PLANNING_TEST_IDS.holidayItem(0))
        expect(row.exists()).toBe(true)
        expect(findDateSegments(row, 'day').length).toBe(0)
        const input = row.find('input')
        expect(input.attributes('disabled')).toBeDefined()
        expect(input.element.value).toBe(formatDateRange(first))

        const addButton = findByTestId(wrapper, PLANNING_TEST_IDS.holidayAdd)
        expect(addButton.exists()).toBe(false)

        const removeButton = findByTestId(wrapper, PLANNING_TEST_IDS.holidayRemove(0))
        expect(removeButton.exists()).toBe(false)

        // The read-only row carries the holiday icon in place of the remove button
        expect(iconNamesIn(row)).toContain(ICONS.holiday)
    })

    it('should handle async data loading without errors', async () => {
        const holidays = ref<DateRange[]>([])

        const wrapper = await mountSuspended(CalendarDateRangeListPicker, {
            props: {
                modelValue: holidays.value,
                seasonDates: {
                    start: new Date(2025, 0, 1),
                    end: new Date(2025, 0, 31)
                }
            },
            attrs: {
                'onUpdate:modelValue': (val: DateRange[]) => { holidays.value = val }
            },
            global: {
                provide: {
                    isMd: ref(true)
                }
            }
        })

        expect(wrapper.exists()).toBe(true)

        // The holidays arrive after the mount
        holidays.value = [{
            start: new Date(2025, 0, 5),
            end: new Date(2025, 0, 10)
        }]

        await wrapper.setProps({
            modelValue: holidays.value
        })

        await nextTick()
        await nextTick()

        const holidayListItem = findByTestId(wrapper, PLANNING_TEST_IDS.holidayItem(0))
        expect(holidayListItem.exists()).toBe(true)
    })

    /**
     * Edit mode: each row is its own CalendarDateRangePicker, so a period can be
     * corrected in place (the add row keeps name="holidayRangeList").
     */
    describe('editable rows', () => {
        const first = {start: new Date(2025, 0, 1), end: new Date(2025, 0, 5)}
        const second = {start: new Date(2025, 0, 10), end: new Date(2025, 0, 12)}

        const rowPickers = (wrapper: WrapperType) =>
            wrapper.findAllComponents<ComponentPublicInstance<{name: string, selection: CalendarPickerSelection}>>({name: 'CalendarDateRangePicker'})

        const rowPicker = (wrapper: WrapperType, index: number) => {
            const picker = rowPickers(wrapper).find(candidate => candidate.props('name') === `holidayRangeList-${index}`)
            if (!picker) throw new Error(`No picker on row ${index}`)
            return picker
        }

        const editRow = async (wrapper: WrapperType, index: number, range: DateRange) => {
            await rowPicker(wrapper, index).vm.$emit('update:modelValue', range)
            await nextTick()
        }

        it('renders a picker per row, each picking holidays in the holiday selection style', async () => {
            const wrapper = await createWrapper([first, second])
            expect(rowPicker(wrapper, 0)).toBeDefined()
            expect(rowPicker(wrapper, 1)).toBeDefined()

            const selections = rowPickers(wrapper).map(picker => picker.props('selection'))

            expect(selections.length).toBeGreaterThan(0)
            expect(selections.every(selection => selection === 'holiday')).toBe(true)
        })

        it('emits the list with the edited row replaced', async () => {
            const wrapper = await createWrapper([first, second])
            const corrected = {start: new Date(2025, 0, 1), end: new Date(2025, 0, 7)}

            await editRow(wrapper, 0, corrected)

            expect(emittedPayload(wrapper, 'update:modelValue', dateRangeSchema.array(), 0)).toEqual([corrected, second])
        })

        it('rejects an edit that overlaps another period', async () => {
            const wrapper = await createWrapper([first, second])

            await editRow(wrapper, 0, {start: new Date(2025, 0, 1), end: new Date(2025, 0, 11)})

            expect(wrapper.html()).toContain(SEASON_WORDS.form.holidaysOverlap)
            expect(wrapper.emitted('update:modelValue')).toBeFalsy()
        })
    })
})
