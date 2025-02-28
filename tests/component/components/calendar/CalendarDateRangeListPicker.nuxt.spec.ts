// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from "@nuxt/test-utils/runtime"
import CalendarDateRangeListPicker from '~/components/calendar/CalendarDateRangeListPicker.vue'
import { nextTick, ref } from 'vue'

describe('CalendarDateRangeListPicker', () => {
    const ELEMENT_NAMES = {
        addButton: 'holidayRangeAddToList',
        dateRangePicker: 'holidayRangeList',
        errorContainer: 'holidayPicker',
        holidayListItem: (index: number) => `holidayRangeList-${index}`,
        removeButton: (index: number) => `holidayRangeRemoveFromList-${index}`
    } as const

    interface DateRange {
        start: Date;
        end: Date;
    }

    const createWrapper = async (modelValue: DateRange[] = []) => {
        return await mountSuspended(CalendarDateRangeListPicker, {
            props: { modelValue },
            global: {
                provide: {
                    isMd: ref(true)
                }
            }
        })
    }

    const setDateRange = async (wrapper: any, start: Date, end: Date) => {
        const datePicker = wrapper.findComponent({ name: 'CalendarDateRangePicker' })
        await datePicker.vm.$emit('update:modelValue', { start, end })
        await nextTick()
    }

    const clickAddButton = async (wrapper: any) => {
        const addButton = wrapper.find(`[name="${ELEMENT_NAMES.addButton}"]`)
        await addButton.trigger('click')
        await nextTick()
    }

    it('renders with empty date ranges', async () => {
        const wrapper = await createWrapper()
        expect(wrapper.exists()).toBe(true)
        const addButton = wrapper.find(`[name="${ELEMENT_NAMES.addButton}"]`)
        expect(addButton.text()).toContain('Tilføj ferie')
    })

    it('adds a holiday period', async () => {
        const wrapper = await createWrapper()

        await setDateRange(
            wrapper,
            new Date(2025, 0, 1),
            new Date(2025, 0, 5)
        )

        await clickAddButton(wrapper)

        const emitted = wrapper.emitted('update:modelValue')
        expect(emitted).toBeTruthy()
        expect(emitted[0][0]).toEqual([
            {
                start: new Date(2025, 0, 1),
                end: new Date(2025, 0, 5)
            }
        ])

        const holidayInput = wrapper.find(`[name="${ELEMENT_NAMES.holidayListItem(0)}"]`)
        expect(holidayInput.exists()).toBe(true)
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
        expect(wrapper.html()).toContain('Ferieperioder må ikke overlappe hinanden')
    })

    it('removes a holiday period', async () => {
        // Create a mock for defineModel that we can observe
        const modelValue = ref([{
            start: new Date(2025, 0, 1),
            end: new Date(2025, 0, 5)
        }]);
        
        // Mount with this reactive reference that we can track
        const wrapper = await mountSuspended(CalendarDateRangeListPicker, {
            props: { 
                modelValue: modelValue.value
            },
            attrs: {
                // Handle the update event to update our local ref
                'onUpdate:modelValue': (val: any) => { modelValue.value = val; }
            },
            global: {
                provide: {
                    isMd: ref(true)
                }
            }
        });

        // Verify the holiday input exists before removal
        expect(wrapper.find(`[name="${ELEMENT_NAMES.holidayListItem(0)}"]`).exists()).toBe(true)
        
        // Click the remove button
        const removeButton = wrapper.find(`[name="${ELEMENT_NAMES.removeButton(0)}"]`)
        await removeButton.trigger('click')
        await nextTick()
        
        // After click and nextTick, verify the list is now empty in model
        expect(modelValue.value.length).toBe(0)
    })
})
