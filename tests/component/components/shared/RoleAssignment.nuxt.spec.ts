// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {mountSuspended, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {ref, h, nextTick} from 'vue'
import RoleAssignment from '~/components/shared/RoleAssignment.vue'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import type {InhabitantDisplay} from '~/composables/useCoreValidation'

/**
 * RoleAssignment component tests
 *
 * Generic role-assignment component used next to a portrait. Three render
 * branches based on `currentHolder` vs the logged-in user:
 *  - Vacant (no holder)            → trigger button "Bliv {role}", panel opens claim form
 *  - Self (holder.id === me)       → portrait slot only, no button, no panel
 *  - Other (holder.id !== me)      → trigger button "Byt", panel opens swap form (Phase 3 content)
 *
 * Phase 2 wires the vacant content; "other" trigger renders but its panel content
 * is a placeholder until Phase 3.
 *
 * Single inline panel below the row. DRY: same component for chef now and
 * cook/junior in the next iteration.
 */

const {TeamRoleSchema} = useCookingTeamValidation()
const TeamRole = TeamRoleSchema.enum

const ME_ID = 42
const OTHER_ID = 99
const OTHER_HOLDER: InhabitantDisplay = {
    id: OTHER_ID,
    name: 'Anna',
    lastName: 'Hansen',
    birthDate: new Date('1990-01-01'),
    pictureUrl: null,
    householdId: 1,
    userId: null
} as unknown as InhabitantDisplay

const SELF_HOLDER: InhabitantDisplay = {
    ...OTHER_HOLDER,
    id: ME_ID,
    name: 'Selv',
    lastName: 'Test'
}

const assignRoleToDinnerMock = vi.fn(async () => undefined)

mockNuxtImport('useAuthStore', () => {
    return () => ({
        // Return plain object (no ref wrapping). Real Pinia proxy unwraps refs
        // automatically; mocking with `ref()` would mean component code reading
        // `authStore.user.Inhabitant.id` gets the ref instead of unwrapped value.
        user: {Inhabitant: {id: ME_ID, name: 'Selv', lastName: 'Test'}}
    })
})

mockNuxtImport('usePlanStore', () => {
    return () => ({
        assignRoleToDinner: assignRoleToDinnerMock
    })
})

const TEST_IDS = {
    portrait: 'role-assignment-portrait',
    trigger: 'role-assignment-trigger',
    panel: 'role-assignment-panel',
    fortryd: 'role-assignment-fortryd'
} as const

const PORTRAIT_TEXT = 'PORTRAIT_SLOT_CONTENT'

const mountRoleAssignment = async (props: {
    role: typeof TeamRole.CHEF | typeof TeamRole.COOK | typeof TeamRole.JUNIORHELPER
    currentHolder: InhabitantDisplay | null
}) => {
    return await mountSuspended(RoleAssignment, {
        props: {
            dinnerEvent: DinnerEventFactory.defaultDinnerEventDetail(),
            ...props
        },
        slots: {
            default: () => h('div', {'data-testid': TEST_IDS.portrait}, PORTRAIT_TEXT)
        },
        global: {
            provide: {isMd: ref(true)}
        }
    })
}

const findById = (wrapper: Awaited<ReturnType<typeof mountRoleAssignment>>, id: string) =>
    wrapper.find(`[data-testid="${id}"]`)

beforeEach(() => {
    assignRoleToDinnerMock.mockClear()
})

describe('RoleAssignment', () => {
    describe('Render branches', () => {
        it.each([
            {
                desc: 'vacant',
                currentHolder: null,
                triggerVisible: true,
                triggerLabelContains: 'Bliv',
                panelVisibleByDefault: false
            },
            {
                desc: 'self (holder is current user)',
                currentHolder: SELF_HOLDER,
                triggerVisible: false,
                triggerLabelContains: '',
                panelVisibleByDefault: false
            },
            {
                desc: 'other (someone else is holder)',
                currentHolder: OTHER_HOLDER,
                triggerVisible: true,
                triggerLabelContains: 'Byt',
                panelVisibleByDefault: false
            }
        ])('GIVEN $desc state THEN portrait always rendered, trigger button visible=$triggerVisible, panel hidden by default', async ({currentHolder, triggerVisible, triggerLabelContains, panelVisibleByDefault}) => {
            const wrapper = await mountRoleAssignment({role: TeamRole.CHEF, currentHolder})

            // Portrait slot is always rendered (the parent's portrait must remain visible)
            expect(findById(wrapper, TEST_IDS.portrait).exists()).toBe(true)
            expect(findById(wrapper, TEST_IDS.portrait).text()).toContain(PORTRAIT_TEXT)

            // Trigger button visibility per branch
            const trigger = findById(wrapper, TEST_IDS.trigger)
            expect(trigger.exists()).toBe(triggerVisible)
            if (triggerVisible) {
                expect(trigger.text()).toContain(triggerLabelContains)
            }

            // Panel is closed initially
            expect(findById(wrapper, TEST_IDS.panel).exists()).toBe(panelVisibleByDefault)
        })
    })

    describe('Trigger button icons', () => {
        it.each([
            {
                desc: 'vacant',
                currentHolder: null,
                expectedTrailingIconHint: 'plus'
            },
            {
                desc: 'other',
                currentHolder: OTHER_HOLDER,
                expectedTrailingIconHint: 'arrow' // swap-arrows icon contains "arrow" in its name
            }
        ])('GIVEN $desc state THEN trigger button trailing icon is $expectedTrailingIconHint', async ({currentHolder, expectedTrailingIconHint}) => {
            const wrapper = await mountRoleAssignment({role: TeamRole.CHEF, currentHolder})
            const trigger = findById(wrapper, TEST_IDS.trigger)
            // Inspect rendered icon names (UButton renders <UIcon> with name= attr or via class)
            expect(trigger.html().toLowerCase()).toContain(expectedTrailingIconHint)
        })
    })

    describe('Panel open/close', () => {
        it('GIVEN vacant trigger WHEN clicked THEN panel opens', async () => {
            const wrapper = await mountRoleAssignment({role: TeamRole.CHEF, currentHolder: null})
            await findById(wrapper, TEST_IDS.trigger).trigger('click')
            await nextTick()
            expect(findById(wrapper, TEST_IDS.panel).exists()).toBe(true)
        })

        it('GIVEN other-chef trigger WHEN clicked THEN panel opens', async () => {
            const wrapper = await mountRoleAssignment({role: TeamRole.CHEF, currentHolder: OTHER_HOLDER})
            await findById(wrapper, TEST_IDS.trigger).trigger('click')
            await nextTick()
            expect(findById(wrapper, TEST_IDS.panel).exists()).toBe(true)
        })

        it('GIVEN open panel WHEN Fortryd clicked THEN panel closes', async () => {
            const wrapper = await mountRoleAssignment({role: TeamRole.CHEF, currentHolder: null})
            await findById(wrapper, TEST_IDS.trigger).trigger('click')
            await nextTick()
            await findById(wrapper, TEST_IDS.fortryd).trigger('click')
            await nextTick()
            expect(findById(wrapper, TEST_IDS.panel).exists()).toBe(false)
        })

        it('GIVEN open panel WHEN clicking outside THEN panel closes', async () => {
            const wrapper = await mountRoleAssignment({role: TeamRole.CHEF, currentHolder: null})
            await findById(wrapper, TEST_IDS.trigger).trigger('click')
            await nextTick()
            // Simulate a click on document body, outside the component's DOM
            document.body.dispatchEvent(new MouseEvent('click', {bubbles: true}))
            await nextTick()
            expect(findById(wrapper, TEST_IDS.panel).exists()).toBe(false)
        })
    })

    describe('Vacant claim flow (Phase 2)', () => {
        it('GIVEN vacant panel open WHEN DangerButton confirmed THEN calls assignRoleToDinner and emits role-assigned', async () => {
            // Default factory has cookingTeamId: null — the claim handler requires
            // a real team id to upsert the team assignment. Override with a real id.
            const dinnerEvent = {
                ...DinnerEventFactory.defaultDinnerEventDetail(),
                cookingTeamId: 7
            }
            const wrapper = await mountSuspended(RoleAssignment, {
                props: {dinnerEvent, role: TeamRole.CHEF, currentHolder: null},
                slots: {default: () => h('div', {'data-testid': TEST_IDS.portrait}, PORTRAIT_TEXT)},
                global: {provide: {isMd: ref(true)}}
            })

            // Open panel
            await findById(wrapper, TEST_IDS.trigger).trigger('click')
            await nextTick()

            // Scope the DangerButton search INSIDE the panel — the trigger button outside
            // also matches "Bliv chefkok" so we'd otherwise grab the wrong one.
            const panel = findById(wrapper, TEST_IDS.panel)
            const dangerBtn = panel.findAll('button').find(b => b.text().includes('Bliv'))
            expect(dangerBtn, 'DangerButton "Bliv chefkok" should be inside the panel').toBeTruthy()

            // Two clicks for 2-phase confirm
            await dangerBtn!.trigger('click')
            await nextTick()
            await dangerBtn!.trigger('click')
            await nextTick()

            expect(assignRoleToDinnerMock).toHaveBeenCalledTimes(1)
            expect(assignRoleToDinnerMock).toHaveBeenCalledWith(
                dinnerEvent.id,
                ME_ID,
                TeamRole.CHEF
            )
            expect(wrapper.emitted('role-assigned')).toHaveLength(1)
            // After successful claim, panel should close
            expect(findById(wrapper, TEST_IDS.panel).exists()).toBe(false)
        })
    })
})
