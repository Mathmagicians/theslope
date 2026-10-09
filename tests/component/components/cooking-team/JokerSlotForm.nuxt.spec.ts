// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {nextTick, type ComponentPublicInstance} from 'vue'
import type {VueWrapper} from '@vue/test-utils'
import {mountWithTooltipProvider, findByTestId, clickByTestId} from '~~/tests/component/testHelpers'
import {JOKER_SLOT_IDS, toggleEveryWeekday, submitJokerSlotForm} from '~~/tests/component/components/cooking-team/jokerSlotForm'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import JokerSlotForm from '~/components/cooking-team/JokerSlotForm.vue'
import CalendarDateRangePicker from '~/components/calendar/CalendarDateRangePicker.vue'
import {ROLE_ICONS} from '~/composables/useTheSlopeDesignSystem'
import {useCookingTeamValidation, ALLOCATION_PERCENTAGE_OPTIONS} from '~/composables/useCookingTeamValidation'
import {createDefaultWeekdayMap, WEEKDAYS} from '~/types/dateTypes'

const {TeamRoleSchema} = useCookingTeamValidation()
const Role = TeamRoleSchema.enum

type IconWrapper = VueWrapper<ComponentPublicInstance<{name: string}>>
type FieldWrapper = VueWrapper<ComponentPublicInstance<{name?: string}>>

const roleGlyphs: string[] = Object.values(ROLE_ICONS)

const season = SeasonFactory.defaultSeason()
// The team cooks tuesdays and thursdays
const teamAffinity = createDefaultWeekdayMap([false, true, false, true, false, false, false])
const teamWeekdays = WEEKDAYS.filter(day => teamAffinity[day])

const mountForm = () => mountWithTooltipProvider(JokerSlotForm, {
    props: {seasonDates: season.seasonDates, teamAffinity},
    isMd: true
})

// The role glyphs on the trigger; the trigger also carries its chevron
const roleTriggerGlyphs = (wrapper: VueWrapper) => {
    const select = findByTestId(wrapper, JOKER_SLOT_IDS.roleSelect)
    return (wrapper.findAllComponents({name: 'UIcon'}) as IconWrapper[])
        .filter(icon => select.element.contains(icon.element))
        .map(icon => icon.props('name'))
        .filter(name => roleGlyphs.includes(name))
}

const fieldNamed = (wrapper: VueWrapper, name: string) =>
    (wrapper.findAllComponents({name: 'UFormField'}) as FieldWrapper[]).find(field => field.props('name') === name)

const fullTimeLabel = ALLOCATION_PERCENTAGE_OPTIONS.find(option => option.value === 100)!.label

describe('JokerSlotForm', () => {
    it('Tilføj emits the slot over the season period with a full-time allocation on the team days and no note by default', async () => {
        const wrapper = await mountForm()
        await submitJokerSlotForm(wrapper)

        const emitted = wrapper.emitted('submit')
        expect(emitted).toHaveLength(1)
        const slot = emitted![0]![0]
        expect(slot).toEqual({
            role: Role.COOK,
            allocationPercentage: 100,
            affinity: teamAffinity,
            startDate: season.seasonDates.start,
            endDate: season.seasonDates.end
        })
        expect(slot).not.toHaveProperty('note')
    })

    it('the allocation field starts at full time', async () => {
        const wrapper = await mountForm()
        expect(fieldNamed(wrapper, 'allocationPercentage')!.text()).toContain(fullTimeLabel)
    })

    it('offers only the team cooking days as weekdays, each ticked', async () => {
        const wrapper = await mountForm()
        const weekdays = fieldNamed(wrapper, 'affinity')!.findAll('[role="checkbox"]')
        expect(weekdays.map(weekday => weekday.attributes('aria-checked'))).toEqual(teamWeekdays.map(() => 'true'))
        expect(fieldNamed(wrapper, 'affinity')!.text()).toBe(`Ugedage${teamWeekdays.join('')}`)
    })

    it.each(['endDate', 'affinity', 'role', 'allocationPercentage', 'note'])('the %s field is named after its schema path', async (path) => {
        const wrapper = await mountForm()
        expect(fieldNamed(wrapper, path)).toBeDefined()
    })

    it('an end before the start blocks Tilføj and shows the message on the period field', async () => {
        const wrapper = await mountForm()
        wrapper.findComponent(CalendarDateRangePicker).vm.$emit('update:modelValue', {
            start: season.seasonDates.end,
            end: season.seasonDates.start
        })
        await nextTick()
        await submitJokerSlotForm(wrapper)

        expect(wrapper.emitted('submit')).toBeUndefined()
        expect(fieldNamed(wrapper, 'endDate')!.find('[data-slot="error"]').text()).toMatch(/slutdato/i)
    })

    it.each([Role.CHEF, Role.COOK, Role.JUNIORHELPER])('the role trigger shows the %s glyph once chosen', async (role) => {
        const wrapper = await mountForm()
        const select = wrapper.findAllComponents({name: 'USelectMenu'})
            .find(menu => findByTestId(menu, JOKER_SLOT_IDS.roleSelect).exists())
        select!.vm.$emit('update:modelValue', role)
        await nextTick()
        expect(roleTriggerGlyphs(wrapper)).toEqual([ROLE_ICONS[role]])
    })

    it('Annuller emits cancel and nothing else', async () => {
        const wrapper = await mountForm()
        await clickByTestId(wrapper, JOKER_SLOT_IDS.cancel)
        expect(wrapper.emitted('cancel')).toHaveLength(1)
        expect(wrapper.emitted('submit')).toBeUndefined()
    })

    it('a slot without a weekday is not emitted', async () => {
        const wrapper = await mountForm()
        await toggleEveryWeekday(wrapper)
        await submitJokerSlotForm(wrapper)
        expect(wrapper.emitted('submit')).toBeUndefined()
    })
})
