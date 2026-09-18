// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from "@nuxt/test-utils/runtime"
import {findByTestId} from '~~/tests/component/testHelpers'
import {PLANNING_TEST_IDS} from '~~/tests/component/components/admin/planningTestIds'
import {formatDate} from '~/utils/date'
import CalendarDateRangeListPicker from '~/components/calendar/CalendarDateRangeListPicker.vue'
import { nextTick, ref } from 'vue'

describe('CalendarDateRangeListPicker', () => {
    interface DateRange {
        start: Date;
        end: Date;
    }

    type WrapperType = Awaited<ReturnType<typeof mountSuspended>>

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
        expect(emitted![0]![0]).toEqual([
            {
                start: new Date(2025, 0, 1),
                end: new Date(2025, 0, 5)
            }
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

        const emitted = wrapper.emitted('update:modelValue')
        expect(emitted![0]![0]).toEqual([earlier, later])

        // Edit mode renders each row as a picker: its first input holds the start date
        const firstRow = findByTestId(wrapper, PLANNING_TEST_IDS.holidayItem(0))
        expect(firstRow.find('input').element.value).toBe(formatDate(earlier.start))
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
                'onUpdate:modelValue': (val: DateRange[]) => { modelValue.value = val }
            },
            global: {
                provide: {
                    isMd: ref(true)
                }
            }
        });

        // Verify the holiday input exists before removal
        expect(findByTestId(wrapper, PLANNING_TEST_IDS.holidayItem(0)).exists()).toBe(true)

        // Click the remove button
        const removeButton = findByTestId(wrapper, PLANNING_TEST_IDS.holidayRemove(0))
        await removeButton.trigger('click')
        await nextTick()
        
        // After click and nextTick, verify the list is now empty in model
        expect(modelValue.value.length).toBe(0)
    })

    it('renders correctly in disabled mode with holiday periods', async () => {
        // Create with initial holidays and disabled prop set to true
        const wrapper = await mountSuspended(CalendarDateRangeListPicker, {
            props: { 
                modelValue: [{
                    start: new Date(2025, 0, 1),
                    end: new Date(2025, 0, 5)
                }],
                disabled: true
            },
            global: {
                provide: {
                    isMd: ref(true)
                }
            }
        });

        // The component should exist
        expect(wrapper.exists()).toBe(true);
        
        // Verify the holiday input exists
        const holidayInput = findByTestId(wrapper, PLANNING_TEST_IDS.holidayItem(0));
        expect(holidayInput.exists()).toBe(true);

        // In disabled mode, the add button and datepicker should not be visible
        const addButton = findByTestId(wrapper, PLANNING_TEST_IDS.holidayAdd);
        expect(addButton.exists()).toBe(false);

        // In disabled mode, the delete button should not be visible
        const removeButton = findByTestId(wrapper, PLANNING_TEST_IDS.holidayRemove(0));
        expect(removeButton.exists()).toBe(false);
        
        // In disabled mode, we should have an icon instead of the remove button
        // For now, just verify the remove button is not there
        // Testing the actual icon presence is challenging in the test environment
        // since the UIcon component might render differently in tests
        const iconElement = wrapper.findComponent({ name: 'UIcon' });
        expect(iconElement.exists()).toBe(true);
    })

    it('should handle async data loading without errors', async () => {
        // Create a reactive reference we can update
        const holidays = ref<DateRange[]>([]);
        
        // Mount with initial empty data
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
        });
        
        expect(wrapper.exists()).toBe(true);
        
        // Simulate async data being loaded
        holidays.value = [{
            start: new Date(2025, 0, 5),
            end: new Date(2025, 0, 10)
        }];
        
        // Set the modelValue property manually
        await wrapper.setProps({ 
            modelValue: holidays.value 
        });
        
        // Wait for Vue to process updates
        await nextTick();
        await nextTick(); // Sometimes two ticks are needed
        
        // Verify the component renders the holiday properly
        const holidayListItem = findByTestId(wrapper, PLANNING_TEST_IDS.holidayItem(0));
        expect(holidayListItem.exists()).toBe(true);
    })
    
    it('should work with a Pinia store', async () => {
        // Create a mock store
        const mockStore = reactive({
            isLoading: false,
            holidays: [] as DateRange[]
        });
        
        // Mount with store data
        const wrapper = await mountSuspended(CalendarDateRangeListPicker, {
            props: { 
                modelValue: mockStore.holidays,
                seasonDates: { 
                    start: new Date(2025, 0, 1), 
                    end: new Date(2025, 0, 31) 
                }
            },
            attrs: {
                'onUpdate:modelValue': (val: DateRange[]) => {
                    mockStore.holidays = val
                }
            },
            global: {
                provide: {
                    isMd: ref(true)
                }
            }
        });
        
        expect(wrapper.exists()).toBe(true);
        
        // Simulate store update (like after an API call)
        mockStore.holidays = [{
            start: new Date(2025, 0, 5),
            end: new Date(2025, 0, 10)
        }];
        
        // Update props to reflect store changes
        await wrapper.setProps({ 
            modelValue: mockStore.holidays 
        });
        
        // Wait for updates
        await nextTick();
        await nextTick();
        
        // Verify component properly renders the store data
        const holidayItem = findByTestId(wrapper, PLANNING_TEST_IDS.holidayItem(0));
        expect(holidayItem.exists()).toBe(true);
    })

    /**
     * Edit mode: each row is its own CalendarDateRangePicker, so a period can be
     * corrected in place (the add row keeps name="holidayRangeList").
     */
    describe('editable rows', () => {
        const first = {start: new Date(2025, 0, 1), end: new Date(2025, 0, 5)}
        const second = {start: new Date(2025, 0, 10), end: new Date(2025, 0, 12)}

        type PickerWrapper = ReturnType<WrapperType['findAllComponents']>[number]

        const rowPicker = (wrapper: WrapperType, index: number) =>
            wrapper.findAllComponents({name: 'CalendarDateRangePicker'})
                .find((picker: PickerWrapper) => picker.props('name') === `holidayRangeList-${index}`)

        const editRow = async (wrapper: WrapperType, index: number, range: DateRange) => {
            await rowPicker(wrapper, index)!.vm.$emit('update:modelValue', range)
            await nextTick()
        }

        it('renders a picker per row', async () => {
            const wrapper = await createWrapper([first, second])
            expect(rowPicker(wrapper, 0)).toBeDefined()
            expect(rowPicker(wrapper, 1)).toBeDefined()
        })

        it('picks holidays, so every picker uses the holiday selection style', async () => {
            const wrapper = await createWrapper([first, second])
            const selections = wrapper.findAllComponents({name: 'CalendarDateRangePicker'})
                .map((picker: PickerWrapper) => picker.props('selection'))

            expect(selections.length).toBeGreaterThan(0)
            expect(selections.every(selection => selection === 'holiday')).toBe(true)
        })

        it('emits the list with the edited row replaced', async () => {
            const wrapper = await createWrapper([first, second])
            const corrected = {start: new Date(2025, 0, 1), end: new Date(2025, 0, 7)}

            await editRow(wrapper, 0, corrected)

            const emitted = wrapper.emitted('update:modelValue')
            expect(emitted).toBeTruthy()
            expect(emitted![0]![0]).toEqual([corrected, second])
        })

        it('rejects an edit that overlaps another period', async () => {
            const wrapper = await createWrapper([first, second])

            await editRow(wrapper, 0, {start: new Date(2025, 0, 1), end: new Date(2025, 0, 11)})

            expect(wrapper.html()).toContain('Ferieperioder må ikke overlappe hinanden')
            expect(wrapper.emitted('update:modelValue')).toBeFalsy()
        })

        it('keeps rows read-only when disabled', async () => {
            const wrapper = await mountSuspended(CalendarDateRangeListPicker, {
                props: {modelValue: [first], disabled: true},
                global: {provide: {isMd: ref(true)}}
            })
            expect(rowPicker(wrapper, 0)).toBeUndefined()
            expect(findByTestId(wrapper, PLANNING_TEST_IDS.holidayItem(0)).exists()).toBe(true)
        })
    })
})
