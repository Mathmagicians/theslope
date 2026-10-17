import {describe, it, expect, vi, beforeEach, afterEach, beforeAll} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {findByTestId, findAllByTestId, resetStores} from '~~/tests/component/testHelpers'
import ChefDinnerCard from '~/components/chef/ChefDinnerCard.vue'
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {nextTick} from 'vue'

enableAutoUnmount(afterEach)

describe('ChefDinnerCard', () => {
    const {DinnerStateSchema} = useBookingValidation()
    const DinnerState = DinnerStateSchema.enum

    // Fixed reference time for temporal tests: January 11, 2025 at 18:00
    const REFERENCE_TIME = new Date(2025, 0, 11, 18, 0)

    // Default deadlines from factory season
    // @nuxt/test-utils 4 starts Nuxt in beforeAll: composables run there, not in the describe body
    let defaultDeadlines: ReturnType<ReturnType<typeof useSeason>['deadlinesForSeason']>
    beforeAll(() => {
        const {deadlinesForSeason} = useSeason()
        defaultDeadlines = deadlinesForSeason(SeasonFactory.defaultSeason())
    })

    beforeEach(() => {
        resetStores()
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

    const mountCard = (props: { dinnerEvent: DinnerEventDisplay } & Record<string, unknown>) =>
        mountSuspended(ChefDinnerCard, {
            props: { deadlines: defaultDeadlines, ...props }
        })

    // Each badge by its label, read off one mount
    const badgeTexts = (wrapper: Awaited<ReturnType<typeof mountCard>>, labels: string[]) => {
        const badges = findAllByTestId(wrapper, 'deadline-badge')
        return labels.map(label => badges.find(b => b.text().includes(label))?.text())
    }

    describe('Rendering', () => {
        it('should render the menu title, the formatted date with weekday and the Menu and Framelding badges', async () => {
            const wrapper = await mountCard({ dinnerEvent: createDinnerEvent({ date: new Date('2025-12-25T18:00:00') }) })

            expect(wrapper.text()).toContain('Spaghetti Carbonara')
            // Should show weekday and date (e.g., "tor. 25/12")
            expect(wrapper.text()).toContain('25/12')
            expect(wrapper.text()).toContain('Menu')
            expect(wrapper.text()).toContain('Framelding')
        })

        it('should show placeholder for unannounced menu', async () => {
            const dinnerEvent = createDinnerEvent({ menuTitle: '' })
            const wrapper = await mountCard({ dinnerEvent })

            expect(wrapper.text()).toContain('Ingen menu endnu')
        })
    })

    describe('Deadline badges', () => {
        // SCHEDULED dinners: menu NOT done
        // Each badge counts to its OWN deadline (menu, booking, groceries, dinner are independent)
        it.each([
            {
                name: 'SCHEDULED, far future (15 days)',
                dinnerDate: new Date(2025, 0, 26, 18, 0),
                expectedBadges: [/om\s+5\s+dage/i, /åben/i, /om\s+15\s+dage/i, /om\s+15\s+dage/i]
            },
            {
                name: 'SCHEDULED, 9 days (menu deadline passed)',
                dinnerDate: new Date(2025, 0, 20, 18, 0),
                // Groceries independent: counts to dinner time
                expectedBadges: [/mangler/i, /åben/i, /om\s+9\s+dage/i, /om\s+9\s+dage/i]
            },
            {
                name: 'SCHEDULED, 6 days (both deadlines passed)',
                dinnerDate: new Date(2025, 0, 17, 18, 0),
                expectedBadges: [/mangler/i, /lukket/i, /om\s+6\s+dage/i, /om\s+6\s+dage/i]
            }
        ])('$name: the Menu, Framelding, Indkøb and Spisning badges', async ({ dinnerDate, expectedBadges }) => {
            const wrapper = await mountCard({ dinnerEvent: createDinnerEvent({ date: dinnerDate, state: DinnerState.SCHEDULED }) })

            badgeTexts(wrapper, ['Menu', 'Framelding', 'Indkøb', 'Spisning'])
                .forEach((text, index) => expect(text).toMatch(expectedBadges[index]!))
        })

        // ANNOUNCED dinners: menu IS done; groceries shows countdown (NO cascade)
        it('ANNOUNCED, 9 days (menu done, groceries shows countdown): the Framelding, Indkøb and Spisning badges', async () => {
            const wrapper = await mountCard({ dinnerEvent: createDinnerEvent({ date: new Date(2025, 0, 20, 18, 0), state: DinnerState.ANNOUNCED }) })

            const [framelding, groceries, dinner] = badgeTexts(wrapper, ['Framelding', 'Indkøb', 'Spisning'])
            expect(framelding).toMatch(/åben/i)
            expect(groceries).toMatch(/om\s+9\s+dage/i)
            expect(dinner).toMatch(/om\s+9\s+dage/i)
        })
    })

    describe('Selection', () => {
        it('should emit select event with dinner ID when clicked', async () => {
            const dinnerEvent = createDinnerEvent({ id: 42 })
            const wrapper = await mountCard({ dinnerEvent })

            const card = findByTestId(wrapper, 'chef-dinner-card-42')
            await card.trigger('click')
            await nextTick()

            const emitted = wrapper.emitted('select')
            expect(emitted).toBeTruthy()
            expect(emitted![0]).toEqual([42])
        })
    })
})
