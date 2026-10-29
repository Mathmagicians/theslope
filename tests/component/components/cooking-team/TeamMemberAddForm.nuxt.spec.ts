// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import TeamMemberAddForm from '~/components/cooking-team/TeamMemberAddForm.vue'
import {nextTick} from 'vue'
import {enableAutoUnmount, type VueWrapper} from '@vue/test-utils'
import {mountWithTooltipProvider, findByTestId, resetStores, iconNamesIn} from '~~/tests/component/testHelpers'
import {ROLE_ICONS} from '~/composables/useTheSlopeDesignSystem'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import {TEAM_WORDS} from '~/config/teamWords'
import {createDefaultWeekdayMap} from '~/types/dateTypes'

enableAutoUnmount(afterEach)

describe('TeamMemberAddForm', () => {

    const {TeamRoleSchema} = useCookingTeamValidation()
    const Role = TeamRoleSchema.enum

    beforeEach(() => {
        resetStores()
    })

    const mount = (props: Record<string, unknown> = {}) =>
        mountWithTooltipProvider(TeamMemberAddForm, {props, isMd: true})

    // The glyphs on the role select's trigger
    const triggerGlyphs = (wrapper: VueWrapper) => iconNamesIn(findByTestId(wrapper, 'team-member-role-select'))

    // ========== RENDERING ==========

    it('add mode shows its labels and the "Tilføj" button', async () => {
        const labels = ['Vælg rolle på hold', 'Arbejdstid', 'Kan kun følgende ugedage', 'Annuller', 'Tilføj']
        const wrapper = await mount()
        labels.forEach(label => expect(wrapper.text(), label).toContain(label))
    })

    // ========== EDIT MODE PRE-FILL ==========

    it.each(TeamRoleSchema.options)('edit mode pre-fills role %s with its label and its glyph on the trigger, and shows "Gem"', async (role) => {
        const wrapper = await mount({initialRole: role})
        expect(wrapper.text()).toContain(TEAM_WORDS.roles[role].label)
        expect(triggerGlyphs(wrapper)).toContain(ROLE_ICONS[role])
        expect(wrapper.text()).toContain('Gem')
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

    // ========== ROLE GLYPH ON THE TRIGGER ==========

    it('the role select trigger follows a change of selection', async () => {
        const wrapper = await mount({initialRole: Role.COOK})
        const select = wrapper.findAllComponents({name: 'USelectMenu'})
            .find(menu => findByTestId(menu, 'team-member-role-select').exists())
        select!.vm.$emit('update:modelValue', Role.CHEF)
        await nextTick()
        const glyphs = triggerGlyphs(wrapper)
        expect(glyphs).toContain(ROLE_ICONS[Role.CHEF])
        expect(glyphs).not.toContain(ROLE_ICONS[Role.COOK])
    })
})
