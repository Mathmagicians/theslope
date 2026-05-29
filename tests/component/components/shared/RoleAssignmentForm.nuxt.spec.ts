// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {mountSuspended, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {nextTick} from 'vue'
import RoleAssignmentForm from '~/components/shared/RoleAssignmentForm.vue'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import type {InhabitantDisplay} from '~/composables/useCoreValidation'
import {formatDate} from '~/utils/date'

const {TeamRoleSchema} = useCookingTeamValidation()
const TeamRole = TeamRoleSchema.enum

const COOKING_TEAM = {id: 7, name: 'Madhold A - Winter 2026'} as unknown as never
const CHEF: InhabitantDisplay = {id: 99, name: 'Anna', lastName: 'Hansen'} as unknown as InhabitantDisplay

mockNuxtImport('usePlanStore', () => () => ({isRoleUpdating: false}))

const TEST_IDS = {
    cancel: 'role-assignment-cancel',
    save: 'role-assignment-save',
    resign: 'role-assignment-resign'
} as const

const buildDinner = (overrides: {cookingTeam?: typeof COOKING_TEAM | null, chef?: InhabitantDisplay} = {}) => ({
    ...DinnerEventFactory.defaultDinnerEventDetail(),
    cookingTeamId: 7,
    cookingTeam: overrides.cookingTeam === undefined ? COOKING_TEAM : overrides.cookingTeam,
    chef: overrides.chef ?? null
})

const mountForm = (mode: 'volunteer' | 'resign' | 'swap', dinnerOverrides: {cookingTeam?: typeof COOKING_TEAM | null, chef?: InhabitantDisplay} = {}) =>
    mountSuspended(RoleAssignmentForm, {
        props: {dinnerEvent: buildDinner(dinnerOverrides), role: TeamRole.CHEF, mode}
    })

const findById = (wrapper: Awaited<ReturnType<typeof mountForm>>, id: string) =>
    wrapper.find(`[data-testid="${id}"]`)

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
        await findById(wrapper, TEST_IDS.cancel).trigger('click')
        expect(wrapper.emitted('cancel')).toHaveLength(1)
    })

    it('emits submit {ours, theirs: undefined} on volunteer', async () => {
        const wrapper = await mountForm('volunteer')
        await findById(wrapper, TEST_IDS.save).trigger('click')
        expect(wrapper.emitted('submit')![0]![0]).toEqual({ours: expect.any(Number), theirs: undefined})
    })

    it('disables the swap action button (swap not implemented yet)', async () => {
        const wrapper = await mountForm('swap', {chef: CHEF})
        expect(findById(wrapper, TEST_IDS.save).attributes('disabled')).toBeDefined()
    })

    it('emits resign after the DangerButton 2-step confirm', async () => {
        const wrapper = await mountForm('resign')
        const resignBtn = findById(wrapper, TEST_IDS.resign).find('button')
        await resignBtn.trigger('click')
        await nextTick()
        await resignBtn.trigger('click')
        await nextTick()
        expect(wrapper.emitted('resign')).toHaveLength(1)
    })
})
