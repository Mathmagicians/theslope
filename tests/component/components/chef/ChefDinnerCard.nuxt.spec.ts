import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import ChefDinnerCard from '~/components/chef/ChefDinnerCard.vue'
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'
import {nextTick} from 'vue'

describe('ChefDinnerCard', () => {
    const {DinnerStateSchema} = useBookingValidation()
    const DinnerState = DinnerStateSchema.enum

    // Fixed reference time for temporal tests: January 11, 2025 at 18:00
    const REFERENCE_TIME = new Date(2025, 0, 11, 18, 0)

    beforeEach(() => {
        // Use fake timers for temporal consistency
        vi.useFakeTimers()
        vi.setSystemTime(REFERENCE_TIME)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

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

        it('should show formatted date with weekday', async () => {
            const dinnerEvent = createDinnerEvent({ date: new Date('2025-12-25T18:00:00') })
            const wrapper = await mountSuspended(ChefDinnerCard, {
                props: { dinnerEvent }
            })

            // Should show weekday and date (e.g., "tor. 25/12")
            expect(wrapper.text()).toContain('25/12')
        })
    })

    describe('Deadline badges via DinnerDeadlineBadges', () => {
        it('should show Menu and Tilmelding labels', async () => {
            const dinnerEvent = createDinnerEvent()
            const wrapper = await mountSuspended(ChefDinnerCard, {
                props: { dinnerEvent }
            })

            // DinnerDeadlineBadges always shows these labels in standalone mode
            expect(wrapper.text()).toContain('Menu')
            expect(wrapper.text()).toContain('Tilmelding')
        })

        it('should show on-track badge for far future dinner', async () => {
            // GIVEN: Reference time is Jan 11, 2025 at 18:00
            // Dinner on Jan 26, 2025 at 18:00 (15 days away, well past warning threshold)
            const dinnerDate = new Date(2025, 0, 26, 18, 0)

            const dinnerEvent = createDinnerEvent({
                date: dinnerDate,
                state: DinnerState.SCHEDULED
            })
            const wrapper = await mountSuspended(ChefDinnerCard, {
                props: {dinnerEvent}
            })

            const text = wrapper.text()
            // Should show white circle emoji (⚪) for on-track status
            expect(text).toContain('⚪')
            // Should show countdown in days
            expect(text).toContain('15')
        })

        it('should show countdown for dinner within 72h', async () => {
            // GIVEN: Reference time is Jan 11, 2025 at 18:00
            // Dinner on Jan 13, 2025 at 18:00 (48 hours away, within warning threshold)
            const dinnerDate = new Date(2025, 0, 13, 18, 0)

            const dinnerEvent = createDinnerEvent({
                date: dinnerDate,
                state: DinnerState.SCHEDULED
            })
            const wrapper = await mountSuspended(ChefDinnerCard, {
                props: {dinnerEvent}
            })

            const text = wrapper.text()
            // Should show countdown value (days, hours, or minutes)
            expect(text).toMatch(/\d+\s*(DAGE?|T|M)/i)
        })

        it('should show Åben or Lukket for tilmelding status', async () => {
            const dinnerEvent = createDinnerEvent()
            const wrapper = await mountSuspended(ChefDinnerCard, {
                props: { dinnerEvent }
            })

            const text = wrapper.text()
            // Should show either Åben or Lukket for tilmelding
            expect(text).toMatch(/Åben|Lukket/)
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
})
