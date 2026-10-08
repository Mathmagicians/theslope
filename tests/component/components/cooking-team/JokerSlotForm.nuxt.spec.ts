// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {nextTick, type ComponentPublicInstance} from 'vue'
import type {VueWrapper} from '@vue/test-utils'
import {mountWithTooltipProvider, findByTestId, clickByTestId} from '~~/tests/component/testHelpers'
import {JOKER_SLOT_IDS, tickFirstWeekday, submitJokerSlotForm} from '~~/tests/component/components/cooking-team/jokerSlotForm'
import JokerSlotForm from '~/components/cooking-team/JokerSlotForm.vue'
import {ROLE_ICONS} from '~/composables/useTheSlopeDesignSystem'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import {createDefaultWeekdayMap} from '~/types/dateTypes'

const {TeamRoleSchema} = useCookingTeamValidation()
const Role = TeamRoleSchema.enum

type IconWrapper = VueWrapper<ComponentPublicInstance<{name: string}>>

const roleGlyphs: string[] = Object.values(ROLE_ICONS)

const mountForm = () => mountWithTooltipProvider(JokerSlotForm, {isMd: true})

// The role glyphs on the trigger; the trigger also carries its chevron
const roleTriggerGlyphs = (wrapper: VueWrapper) => {
    const select = findByTestId(wrapper, JOKER_SLOT_IDS.roleSelect)
    return (wrapper.findAllComponents({name: 'UIcon'}) as IconWrapper[])
        .filter(icon => select.element.contains(icon.element))
        .map(icon => icon.props('name'))
        .filter(name => roleGlyphs.includes(name))
}

describe('JokerSlotForm', () => {
    it('Opret emits the slot with a full-time allocation and no note by default', async () => {
        const wrapper = await mountForm()
        await tickFirstWeekday(wrapper)
        await submitJokerSlotForm(wrapper)

        const emitted = wrapper.emitted('submit')
        expect(emitted).toHaveLength(1)
        const slot = emitted![0]![0]
        expect(slot).toEqual({
            role: Role.COOK,
            allocationPercentage: 100,
            affinity: createDefaultWeekdayMap([true, false, false, false, false, false, false]),
            startDate: expect.any(Date),
            endDate: expect.any(Date)
        })
        expect(slot).not.toHaveProperty('note')
    })

    it.each([Role.CHEF, Role.COOK, Role.JUNIORHELPER])('the role trigger shows the %s glyph once chosen', async (role) => {
        const wrapper = await mountForm()
        const select = wrapper.findAllComponents({name: 'USelectMenu'})
            .find(menu => findByTestId(menu, JOKER_SLOT_IDS.roleSelect).exists())
        select!.vm.$emit('update:modelValue', role)
        await nextTick()
        expect(roleTriggerGlyphs(wrapper)).toEqual([ROLE_ICONS[role]])
    })

    it('Fortryd emits cancel and nothing else', async () => {
        const wrapper = await mountForm()
        await clickByTestId(wrapper, JOKER_SLOT_IDS.cancel)
        expect(wrapper.emitted('cancel')).toHaveLength(1)
        expect(wrapper.emitted('submit')).toBeUndefined()
    })

    it('a slot without a weekday is not emitted', async () => {
        const wrapper = await mountForm()
        await submitJokerSlotForm(wrapper)
        expect(wrapper.emitted('submit')).toBeUndefined()
    })
})
