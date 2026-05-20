// @vitest-environment nuxt
import {describe, it, expect, vi} from 'vitest'
import {mountSuspended, mockNuxtImport, mockComponent} from '@nuxt/test-utils/runtime'
import ChefMenuCard from '~/components/chef/ChefMenuCard.vue'
import {ref, h, nextTick} from 'vue'
import {flushPromises} from '@vue/test-utils'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {FORM_MODES} from '~/types/form'

/**
 * ChefMenuCard Unit Tests
 *
 * Focus: Allergen ID extraction from dinner event
 * The bug fix: allergens array contains AllergyType objects with `id`,
 * NOT join table objects with `allergyTypeId`
 */

// Mock stores
mockNuxtImport('useAllergiesStore', () => {
    return () => ({
        allergyTypes: ref(AllergyFactory.createMockAllergyTypesWithInhabitants()),
        isAllergyTypesInitialized: ref(true)
    })
})

mockNuxtImport('usePlanStore', () => {
    return () => ({
        assignRoleToDinner: vi.fn()
    })
})

mockNuxtImport('useAuthStore', () => {
    return () => ({
        user: ref({Inhabitant: {id: 1, name: 'Test User'}})
    })
})

// Mock useHeynabo
mockNuxtImport('useHeynabo', () => {
    return () => ({
        getEventUrl: vi.fn((id: number) => `https://heynabo.com/event/${id}`)
    })
})

// Mock complex child components
mockComponent('AllergenMultiSelector', {
    props: ['modelValue', 'allergyTypes', 'mode'],
    emits: ['update:modelValue'],
    setup(props) {
        return () => h('div', {'data-testid': 'allergen-selector'}, [
            h('span', `Selected: ${props.modelValue?.join(', ') || 'none'}`)
        ])
    }
})

mockComponent('DinnerBookingForm', {
    props: ['household', 'dinnerEvent', 'orders', 'ticketPrices', 'mode'],
    setup() {
        return () => h('div', {'data-testid': 'booking-form'}, 'Booking Form')
    }
})

describe('ChefMenuCard', () => {
    const {deadlinesForSeason} = useSeason()
    const defaultDeadlines = deadlinesForSeason(SeasonFactory.defaultSeason())

    // DRY: Create wrapper with defaults
    const createWrapper = async (props: Record<string, unknown> = {}) => {
        return await mountSuspended(ChefMenuCard, {
            props: {
                dinnerEvent: DinnerEventFactory.defaultDinnerEventDetail(),
                deadlines: defaultDeadlines,
                formMode: FORM_MODES.EDIT,
                showAllergens: true,
                ...props
            },
            global: {
                provide: {
                    isMd: ref(true)
                }
            }
        })
    }

    // Factory: Create dinner event with allergens
    const createDinnerEventWithAllergens = (allergenIds: number[]) => ({
        ...DinnerEventFactory.defaultDinnerEventDetail(),
        allergens: allergenIds.map(id => ({
            id,
            name: `Allergen ${id}`,
            description: `Description for allergen ${id}`,
            icon: '🥜'
        }))
    })

    describe('Allergen ID Extraction', () => {
        it.each([
            {
                name: 'single allergen',
                allergenIds: [1],
                expectedIds: [1]
            },
            {
                name: 'multiple allergens',
                allergenIds: [1, 3, 5],
                expectedIds: [1, 3, 5]
            },
            {
                name: 'empty allergens',
                allergenIds: [],
                expectedIds: []
            }
        ])('extracts $name correctly', async ({allergenIds, expectedIds}) => {
            const dinnerEvent = createDinnerEventWithAllergens(allergenIds)
            const wrapper = await createWrapper({dinnerEvent})

            // The AllergenMultiSelector should receive the extracted IDs
            const selector = wrapper.find('[data-testid="allergen-selector"]')
            expect(selector.exists()).toBe(true)

            // Verify the text shows the correct IDs
            const text = selector.text()
            if (expectedIds.length === 0) {
                expect(text).toContain('none')
            } else {
                expectedIds.forEach(id => {
                    expect(text).toContain(String(id))
                })
            }
        })

        it('uses id property NOT allergyTypeId (bug fix verification)', async () => {
            // This test verifies the bug fix: we use a.id not a.allergyTypeId
            const dinnerEvent = {
                ...DinnerEventFactory.defaultDinnerEventDetail(),
                allergens: [
                    {id: 42, name: 'Test Allergen', description: 'Test', icon: '🥜'}
                ]
            }

            const wrapper = await createWrapper({dinnerEvent})
            const selector = wrapper.find('[data-testid="allergen-selector"]')

            // Should show id=42, not undefined (which would happen with allergyTypeId)
            expect(selector.text()).toContain('42')
            expect(selector.text()).not.toContain('undefined')
        })
    })

    describe('Empty Allergens', () => {
        it('handles dinner event without allergens array', async () => {
            const dinnerEvent = {
                ...DinnerEventFactory.defaultDinnerEventDetail(),
                allergens: undefined
            }

            const wrapper = await createWrapper({dinnerEvent})
            const selector = wrapper.find('[data-testid="allergen-selector"]')

            // Should show empty selection, not crash
            expect(selector.text()).toContain('none')
        })
    })

    describe('Menu action row (EDIT mode)', () => {
        it('shows a labelled primary edit, secondary publish, and a quiet overflow trigger', async () => {
            const wrapper = await createWrapper()

            // Primary action is labelled (no longer a bare pencil icon)
            expect(wrapper.find('[data-testid="edit-menu"]').text()).toContain('Rediger menu')
            expect(wrapper.find('[name="announce-dinner"]').text()).toContain('Publicer')
            expect(wrapper.find('[data-testid="dinner-more-actions"]').text()).toContain('Mere')
        })

        it('keeps the cancel-dinner action behind the overflow panel', async () => {
            const wrapper = await createWrapper()

            // Danger zone is collapsed by default - cancel action is not in the DOM
            expect(wrapper.find('[data-testid="dinner-danger-zone"]').exists()).toBe(false)

            // Opening the overflow panel reveals the danger zone
            await wrapper.find('[data-testid="dinner-more-actions"]').trigger('click')
            await nextTick()
            await flushPromises()

            const dangerZone = wrapper.find('[data-testid="dinner-danger-zone"]')
            expect(dangerZone.exists()).toBe(true)
            expect(dangerZone.text()).toContain('Aflys middagen')
        })
    })

    describe('Mode Rendering', () => {
        it.each([
            {formMode: FORM_MODES.EDIT, showAllergens: true, shouldShowAllergenSelector: true},
            {formMode: FORM_MODES.VIEW, showAllergens: true, shouldShowAllergenSelector: true},
            {formMode: FORM_MODES.VIEW, showAllergens: false, shouldShowAllergenSelector: false}
        ])('renders allergen display with formMode=$formMode showAllergens=$showAllergens', async ({formMode, showAllergens, shouldShowAllergenSelector}) => {
            const dinnerEvent = createDinnerEventWithAllergens([1, 2])
            const wrapper = await createWrapper({dinnerEvent, formMode, showAllergens})

            const selector = wrapper.find('[data-testid="allergen-selector"]')
            expect(selector.exists()).toBe(shouldShowAllergenSelector)
        })
    })
})
