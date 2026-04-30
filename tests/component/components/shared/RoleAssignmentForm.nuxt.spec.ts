// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {mountSuspended, mockNuxtImport} from '@nuxt/test-utils/runtime'
import RoleAssignmentForm from '~/components/shared/RoleAssignmentForm.vue'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import type {InhabitantDisplay} from '~/composables/useCoreValidation'

const {TeamRoleSchema} = useCookingTeamValidation()
const TeamRole = TeamRoleSchema.enum

const COOKING_TEAM = {id: 7, name: 'Madhold A - Winter 2026'} as unknown as never
const OTHER: InhabitantDisplay = {id: 99, name: 'Anna', lastName: 'Hansen'} as unknown as InhabitantDisplay

mockNuxtImport('usePlanStore', () => () => ({isAssigningRole: false}))

const TEST_IDS = {
    cancel: 'role-assignment-cancel',
    save: 'role-assignment-save'
} as const

const buildDinner = (cookingTeam: typeof COOKING_TEAM | null = COOKING_TEAM) => ({
    ...DinnerEventFactory.defaultDinnerEventDetail(),
    cookingTeamId: 7,
    cookingTeam
})

const mountForm = (props: {role?: typeof TeamRole.CHEF, swapWith?: InhabitantDisplay, cookingTeam?: typeof COOKING_TEAM | null} = {}) =>
    mountSuspended(RoleAssignmentForm, {
        props: {
            dinnerEvent: buildDinner(props.cookingTeam),
            role: props.role ?? TeamRole.CHEF,
            swapWith: props.swapWith
        }
    })

const findById = (wrapper: Awaited<ReturnType<typeof mountForm>>, id: string) =>
    wrapper.find(`[data-testid="${id}"]`)

beforeEach(() => vi.clearAllMocks())

describe('RoleAssignmentForm', () => {
    it('renders volunteer copy when no swapWith', async () => {
        const wrapper = await mountForm()
        const text = wrapper.text()
        expect(text).toContain('Fællesspisning søger chefkok')
        expect(text).toContain('chefkok-tjansen')
        expect(text).toContain('Madhold A')
        expect(text).not.toContain('Winter 2026')
    })

    it('renders swap copy when swapWith present', async () => {
        const wrapper = await mountForm({swapWith: OTHER})
        const text = wrapper.text()
        expect(text).toContain('Byt med Anna')
        expect(text).not.toContain('Fællesspisning søger')
    })

    it('omits team clause when dinner has no cookingTeam', async () => {
        const wrapper = await mountForm({cookingTeam: null})
        const text = wrapper.text()
        expect(text).toContain('Fællesspisning søger chefkok')
        expect(text).not.toContain('sammen med')
    })

    it('emits cancel when Annuller is clicked', async () => {
        const wrapper = await mountForm()
        await findById(wrapper, TEST_IDS.cancel).trigger('click')
        expect(wrapper.emitted('cancel')).toHaveLength(1)
    })

    it('emits submit with {ours, theirs: undefined} on volunteer', async () => {
        const wrapper = await mountForm()
        await findById(wrapper, TEST_IDS.save).trigger('click')
        const submitted = wrapper.emitted('submit')
        expect(submitted).toHaveLength(1)
        expect(submitted![0]![0]).toEqual({ours: expect.any(Number), theirs: undefined})
    })

    it('emits submit with {ours, theirs: []} on swap (placeholder)', async () => {
        const wrapper = await mountForm({swapWith: OTHER})
        await findById(wrapper, TEST_IDS.save).trigger('click')
        const submitted = wrapper.emitted('submit')
        expect(submitted).toHaveLength(1)
        expect(submitted![0]![0]).toEqual({ours: expect.any(Number), theirs: []})
    })
})
