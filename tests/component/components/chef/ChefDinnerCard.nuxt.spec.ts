import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ChefDinnerCard from '~/components/chef/ChefDinnerCard.vue'
import type { DinnerEventDisplay } from '~/composables/useBookingValidation'
import { nextTick } from 'vue'

describe('ChefDinnerCard', () => {
    const { DinnerStateSchema } = useBookingValidation()
    const DinnerState = DinnerStateSchema.enum

    const createDinnerEvent = (overrides: Partial<DinnerEventDisplay> = {}): DinnerEventDisplay => ({
        id: 1,
        date: new Date('2025-12-25T18:00:00'),
        menuTitle: 'Spaghetti Carbonara',
        menuDescription: 'Classic Italian pasta',
        menuPictureUrl: null,
        state: DinnerState.SCHEDULED,
        totalCost: 0,
        chefId: null,
        cookingTeamId: 1,
        heynaboEventId: null,
        seasonId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides
    })

    describe('Rendering', () => {
        it('should render dinner event with menu title', async () => {
            const dinnerEvent = createDinnerEvent()
            const wrapper = await mountSuspended(ChefDinnerCard, {
                props: { dinnerEvent }
            })

            expect(wrapper.text()).toContain('Spaghetti Carbonara')
        })

        it('should show placeholder for unannounced menu', async () => {
            const dinnerEvent = createDinnerEvent({ menuTitle: '' })
            const wrapper = await mountSuspended(ChefDinnerCard, {
                props: { dinnerEvent }
            })

            expect(wrapper.text()).toContain('Menu ikke annonceret')
        })

        it('should show formatted date', async () => {
            const dinnerEvent = createDinnerEvent({ date: new Date('2025-12-25T18:00:00') })
            const wrapper = await mountSuspended(ChefDinnerCard, {
                props: { dinnerEvent }
            })

            expect(wrapper.text()).toContain('25/12')
        })
    })

    describe('State badges', () => {
        it.each([
            {
                state: DinnerState.SCHEDULED,
                expectedLabel: 'Planlagt',
                description: 'SCHEDULED state'
            },
            {
                state: DinnerState.ANNOUNCED,
                expectedLabel: 'Annonceret',
                description: 'ANNOUNCED state'
            },
            {
                state: DinnerState.CANCELLED,
                expectedLabel: 'Aflyst',
                description: 'CANCELLED state'
            },
            {
                state: DinnerState.CONSUMED,
                expectedLabel: 'Afholdt',
                description: 'CONSUMED state'
            }
        ])('should display $expectedLabel badge for $description', async ({ state, expectedLabel }) => {
            const dinnerEvent = createDinnerEvent({ state })
            const wrapper = await mountSuspended(ChefDinnerCard, {
                props: { dinnerEvent }
            })

            expect(wrapper.text()).toContain(expectedLabel)
        })
    })

    describe('Deadline warnings', () => {
        it.each([
            {
                description: 'no warning for far future dinner',
                date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
                expectedWarning: null
            },
            {
                description: 'warning for dinner within 3 days',
                date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
                expectedWarning: 'dage tilbage'
            },
            {
                description: 'urgent warning for dinner within 24 hours',
                date: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
                expectedWarning: 'timer tilbage'
            },
            {
                description: 'critical warning for past deadline',
                date: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
                expectedWarning: 'Deadline overskredet'
            }
        ])('should show $description', async ({ date, expectedWarning }) => {
            const dinnerEvent = createDinnerEvent({
                date,
                state: DinnerState.SCHEDULED
            })
            const wrapper = await mountSuspended(ChefDinnerCard, {
                props: { dinnerEvent }
            })

            if (expectedWarning) {
                expect(wrapper.text()).toContain(expectedWarning)
            } else {
                expect(wrapper.text()).not.toContain('tilbage')
                expect(wrapper.text()).not.toContain('overskredet')
            }
        })

        it('should not show deadline warning for ANNOUNCED dinner', async () => {
            const dinnerEvent = createDinnerEvent({
                date: new Date(Date.now() - 1 * 60 * 60 * 1000), // Past deadline
                state: DinnerState.ANNOUNCED
            })
            const wrapper = await mountSuspended(ChefDinnerCard, {
                props: { dinnerEvent }
            })

            expect(wrapper.text()).not.toContain('Deadline overskredet')
            expect(wrapper.text()).not.toContain('tilbage')
        })
    })

    describe('Selection', () => {
        it('should apply cursor pointer styling to card', async () => {
            const dinnerEvent = createDinnerEvent()
            const wrapper = await mountSuspended(ChefDinnerCard, {
                props: {
                    dinnerEvent,
                    selected: true
                }
            })

            const card = wrapper.find('[name="chef-dinner-card-1"]')
            expect(card.classes()).toContain('cursor-pointer')
        })

        it('should render card without errors when not selected', async () => {
            const dinnerEvent = createDinnerEvent()
            const wrapper = await mountSuspended(ChefDinnerCard, {
                props: {
                    dinnerEvent,
                    selected: false
                }
            })

            const card = wrapper.find('[name="chef-dinner-card-1"]')
            expect(card.exists()).toBe(true)
        })

        it('should emit select event with dinner ID when clicked', async () => {
            const dinnerEvent = createDinnerEvent({ id: 42 })
            const wrapper = await mountSuspended(ChefDinnerCard, {
                props: { dinnerEvent }
            })

            const card = wrapper.find('[name="chef-dinner-card-42"]')
            await card.trigger('click')
            await nextTick()

            const emitted = wrapper.emitted('select')
            expect(emitted).toBeTruthy()
            expect(emitted![0]).toEqual([42])
        })
    })

    describe('Chef assignment indicator', () => {
        it('should show chef assigned indicator when chefId is set', async () => {
            const dinnerEvent = createDinnerEvent({ chefId: 5 })
            const wrapper = await mountSuspended(ChefDinnerCard, {
                props: { dinnerEvent }
            })

            expect(wrapper.text()).toContain('Chefkok tildelt')
        })

        it('should not show chef assigned indicator when chefId is null', async () => {
            const dinnerEvent = createDinnerEvent({ chefId: null })
            const wrapper = await mountSuspended(ChefDinnerCard, {
                props: { dinnerEvent }
            })

            expect(wrapper.text()).not.toContain('Chefkok tildelt')
        })
    })
})
