// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {mountSuspended, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {findByTestId} from '~~/tests/component/testHelpers'
import {nextTick} from 'vue'
import RoleAssignmentForm from '~/components/shared/RoleAssignmentForm.vue'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import {useBookingValidation, type DinnerState} from '~/composables/useBookingValidation'
import type {InhabitantDisplay} from '~/composables/useCoreValidation'
import {formatDate} from '~/utils/date'

const {TeamRoleSchema} = useCookingTeamValidation()
const TeamRole = TeamRoleSchema.enum
const {DinnerStateSchema} = useBookingValidation()
const DinnerStates = DinnerStateSchema.enum

const COOKING_TEAM = {id: 7, name: 'Madhold A - Winter 2026'} as unknown as never
const CHEF: InhabitantDisplay = {id: 99, name: 'Anna', lastName: 'Hansen'} as unknown as InhabitantDisplay

mockNuxtImport('usePlanStore', () => () => ({isRoleUpdating: false}))

const TEST_IDS = {
    cancel: 'role-assignment-cancel',
    save: 'role-assignment-save',
    resign: 'role-assignment-resign',
    menuStrategy: 'role-assignment-menu-strategy'
} as const

type DinnerOverrides = {cookingTeam?: typeof COOKING_TEAM | null, chef?: InhabitantDisplay, state?: DinnerState}

const buildDinner = (overrides: DinnerOverrides = {}) => ({
    ...DinnerEventFactory.defaultDinnerEventDetail(),
    cookingTeamId: 7,
    cookingTeam: overrides.cookingTeam === undefined ? COOKING_TEAM : overrides.cookingTeam,
    chef: overrides.chef ?? null,
    ...(overrides.state && {state: overrides.state})
})

const mountForm = (mode: 'volunteer' | 'resign' | 'swap', dinnerOverrides: DinnerOverrides = {}) =>
    mountSuspended(RoleAssignmentForm, {
        props: {dinnerEvent: buildDinner(dinnerOverrides), role: TeamRole.CHEF, mode}
    })

beforeEach(() => vi.clearAllMocks())

describe('RoleAssignmentForm', () => {
    it('renders volunteer copy in volunteer mode', async () => {
        const wrapper = await mountForm('volunteer')
        const text = wrapper.text()
        expect(text).toContain('Fællesspisning søger chefkok')
        expect(text).toContain('chefkok-tjansen')
        expect(text).toContain('Madhold A')
        expect(text).not.toContain('Winter 2026')
    })

    it('renders Meld afbud copy in resign mode', async () => {
        const wrapper = await mountForm('resign')
        const text = wrapper.text()
        expect(text).toContain('Meld afbud som chefkok')
        expect(text).toContain('Tjansen bliver ledig igen')
    })

    it('renders swap copy naming the chef and dinner date in swap mode', async () => {
        const dinner = buildDinner({chef: CHEF})
        const wrapper = await mountSuspended(RoleAssignmentForm, {
            props: {dinnerEvent: dinner, role: TeamRole.CHEF, mode: 'swap'}
        })
        const text = wrapper.text()
        expect(text).toContain(CHEF.name)
        expect(text).toContain(formatDate(dinner.date))
    })

    it('omits team clause when dinner has no cookingTeam (volunteer)', async () => {
        const wrapper = await mountForm('volunteer', {cookingTeam: null})
        const text = wrapper.text()
        expect(text).toContain('Fællesspisning søger chefkok')
        expect(text).not.toContain('sammen med')
    })

    it('emits cancel when Annuller is clicked', async () => {
        const wrapper = await mountForm('volunteer')
        await findByTestId(wrapper, TEST_IDS.cancel).trigger('click')
        expect(wrapper.emitted('cancel')).toHaveLength(1)
    })

    it('emits submit {ours, theirs: undefined} on volunteer', async () => {
        const wrapper = await mountForm('volunteer')
        await findByTestId(wrapper, TEST_IDS.save).trigger('click')
        expect(wrapper.emitted('submit')![0]![0]).toEqual({ours: expect.any(Number), theirs: undefined})
    })

    it('enables takeover of a dinner that is not announced and emits an empty offer', async () => {
        const wrapper = await mountForm('swap', {chef: CHEF})
        const save = findByTestId(wrapper, TEST_IDS.save)
        expect(save.attributes('disabled'), 'takeover commit is active').toBeUndefined()
        expect(findByTestId(wrapper, TEST_IDS.menuStrategy).exists(), 'no menu decision outside ANNOUNCED').toBe(false)
        await save.trigger('click')
        expect(wrapper.emitted('submit')![0]![0]).toEqual({ours: expect.any(Number), theirs: [], menuStrategy: undefined})
    })

    it('gates takeover of an ANNOUNCED dinner behind the menu decision', async () => {
        const wrapper = await mountForm('swap', {chef: CHEF, state: DinnerStates.ANNOUNCED})
        expect(findByTestId(wrapper, TEST_IDS.menuStrategy).exists(), 'menu decision rendered').toBe(true)
        expect(findByTestId(wrapper, TEST_IDS.save).attributes('disabled'), 'commit gated until menu choice').toBeDefined()

        // reka-ui renders radio items as <button role="radio" value="...">
        await findByTestId(wrapper, TEST_IDS.menuStrategy).find('[role="radio"][value="CLEAR"]').trigger('click')
        await nextTick()
        const save = findByTestId(wrapper, TEST_IDS.save)
        expect(save.attributes('disabled'), 'commit active after choice').toBeUndefined()
        await save.trigger('click')
        expect(wrapper.emitted('submit')![0]![0]).toEqual({ours: expect.any(Number), theirs: [], menuStrategy: 'CLEAR'})
    })

    it('shows no menu decision in volunteer mode', async () => {
        const wrapper = await mountForm('volunteer', {state: DinnerStates.ANNOUNCED})
        expect(findByTestId(wrapper, TEST_IDS.menuStrategy).exists()).toBe(false)
    })

    it('emits resign after the DangerButton 2-step confirm', async () => {
        const wrapper = await mountForm('resign')
        const resignBtn = findByTestId(wrapper, TEST_IDS.resign).find('button')
        await resignBtn.trigger('click')
        await nextTick()
        await resignBtn.trigger('click')
        await nextTick()
        expect(wrapper.emitted('resign')).toHaveLength(1)
    })
})
