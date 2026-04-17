// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import TeamMemberAddForm from '~/components/cooking-team/TeamMemberAddForm.vue'
import {nextTick, ref} from 'vue'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import {createDefaultWeekdayMap} from '~/types/dateTypes'

describe('TeamMemberAddForm', () => {

    const {TeamRoleSchema} = useCookingTeamValidation()
    const Role = TeamRoleSchema.enum

    const mount = (props: Record<string, unknown> = {}) =>
        mountSuspended(TeamMemberAddForm, {
            props: {teamColor: 'primary', ...props},
            global: {provide: {isMd: ref(true)}}
        })

    // ========== RENDERING ==========

    it.each([
        ['Vælg rolle på hold'], ['Arbejdstid'], ['Kan kun følgende ugedage'], ['Annuller']
    ])('shows label "%s"', async ([label]) => {
        const wrapper = await mount()
        expect(wrapper.text()).toContain(label)
    })

    it.each([
        ['add mode', undefined, 'Tilføj'],
        ['edit mode', Role.CHEF, 'Gem']
    ])('%s shows "%s" button', async (_, initialRole, expected) => {
        const wrapper = await mount(initialRole ? {initialRole} : {})
        expect(wrapper.text()).toContain(expected)
    })

    // ========== EDIT MODE PRE-FILL ==========

    it.each([
        [Role.CHEF, 'Chefkok'],
        [Role.COOK, 'Kok'],
        [Role.JUNIORHELPER, 'Kokkespire']
    ])('pre-fills role %s as "%s"', async (role, expectedLabel) => {
        const wrapper = await mount({initialRole: role})
        expect(wrapper.text()).toContain(expectedLabel)
    })

    it('pre-fills percentage', async () => {
        const wrapper = await mount({initialRole: Role.COOK, initialPercentage: 50})
        expect(wrapper.text()).toContain('50%')
    })

    // ========== EMITS ==========

    it('emits cancel on Annuller click', async () => {
        const wrapper = await mount()
        const cancelBtn = wrapper.findAll('button').find(b => b.text().includes('Annuller'))
        await cancelBtn!.trigger('click')
        await nextTick()
        expect(wrapper.emitted('cancel')).toBeTruthy()
    })

    it('emits submit with default values on Tilføj click', async () => {
        const wrapper = await mount()
        const submitBtn = wrapper.findAll('button').find(b => b.text().includes('Tilføj'))
        await submitBtn!.trigger('click')
        await nextTick()
        const emitted = wrapper.emitted('submit')
        expect(emitted).toBeTruthy()
        expect(emitted![0]![0]).toBe(Role.COOK)
        expect(emitted![0]![1]).toBe(100)
    })

    // ========== WEEKDAY RESTRICTION ==========

    it('hides restricted days when teamAffinity is set', async () => {
        const monWedFri = createDefaultWeekdayMap([true, false, true, false, true, false, false])
        const wrapper = await mount({teamAffinity: monWedFri})
        const text = wrapper.text()
        expect(text).toContain('mandag')
        expect(text).not.toContain('tirsdag')
    })
})
