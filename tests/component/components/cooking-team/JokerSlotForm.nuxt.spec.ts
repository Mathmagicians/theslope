// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {nextTick, type ComponentPublicInstance} from 'vue'
import {enableAutoUnmount, type VueWrapper} from '@vue/test-utils'
import {mountWithTooltipProvider, findByTestId, clickByTestId, resetStores, iconNamesIn, emittedPayload} from '~~/tests/component/testHelpers'
import {JOKER_SLOT_IDS, toggleEveryWeekday, submitJokerSlotForm} from '~~/tests/component/components/cooking-team/jokerSlotForm'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import JokerSlotForm from '~/components/cooking-team/JokerSlotForm.vue'
import CalendarDateRangePicker from '~/components/calendar/CalendarDateRangePicker.vue'
import {ROLE_ICONS} from '~/composables/useTheSlopeDesignSystem'
import {useCookingTeamValidation, ALLOCATION_PERCENTAGE_OPTIONS} from '~/composables/useCookingTeamValidation'
import {createDefaultWeekdayMap, WEEKDAYS} from '~/types/dateTypes'
import {useDutyValidation} from '~/composables/useDutyValidation'
import {DUTY_WORDS} from '~/config/dutyWords'
import {DATE_WORDS} from '~/config/dateWords'

const {TeamRoleSchema} = useCookingTeamValidation()
const Role = TeamRoleSchema.enum
const WORDS = DUTY_WORDS.jokerSlot

const roleGlyphs: string[] = Object.values(ROLE_ICONS)

const season = SeasonFactory.defaultSeason()
// The team cooks tuesdays and thursdays
const teamAffinity = createDefaultWeekdayMap([false, true, false, true, false, false, false])
const teamWeekdays = WEEKDAYS.filter(day => teamAffinity[day])

enableAutoUnmount(afterEach)

beforeEach(() => {
    resetStores()
})

const mountForm = () => mountWithTooltipProvider(JokerSlotForm, {
    props: {seasonDates: season.seasonDates, teamAffinity},
    isMd: true
})

// The role glyphs on the trigger; the trigger also carries its chevron
const roleTriggerGlyphs = (wrapper: VueWrapper) =>
    iconNamesIn(findByTestId(wrapper, JOKER_SLOT_IDS.roleSelect)).filter(name => roleGlyphs.includes(name))

const fieldNamed = (wrapper: VueWrapper, name: string) => {
    const field = wrapper.findAllComponents<ComponentPublicInstance<{name?: string}>>({name: 'UFormField'}).find(candidate => candidate.props('name') === name)
    if (!field) throw new Error(`No field named ${name}`)
    return field
}

const fullTime = ALLOCATION_PERCENTAGE_OPTIONS.find(option => option.value === 100)
if (!fullTime) throw new Error('No full-time allocation option')
const fullTimeLabel = fullTime.label

describe('JokerSlotForm', () => {
    it('Tilføj emits the slot over the season period with a full-time allocation on the team days and no note by default', async () => {
        const wrapper = await mountForm()
        await submitJokerSlotForm(wrapper)

        expect(wrapper.emitted('submit')).toHaveLength(1)
        const slot = emittedPayload(wrapper, 'submit', useDutyValidation().JokerSlotCreateSchema, 0)
        expect(slot).toEqual({
            role: Role.COOK,
            allocationPercentage: 100,
            affinity: teamAffinity,
            startDate: season.seasonDates.start,
            endDate: season.seasonDates.end
        })
        expect(slot).not.toHaveProperty('note')
    })

    it('names each field after its schema path, starts the allocation at full time and offers only the team cooking days, each ticked', async () => {
        const schemaPaths = ['endDate', 'affinity', 'role', 'allocationPercentage', 'note']
        const wrapper = await mountForm()

        schemaPaths.forEach(path => expect(fieldNamed(wrapper, path).exists(), path).toBe(true))
        expect(fieldNamed(wrapper, 'allocationPercentage').text()).toContain(fullTimeLabel)
        const weekdays = fieldNamed(wrapper, 'affinity').findAll('[role="checkbox"]')
        expect(weekdays.map(weekday => weekday.attributes('aria-checked'))).toEqual(teamWeekdays.map(() => 'true'))
        expect(fieldNamed(wrapper, 'affinity').text()).toBe(`${WORDS.weekdays}${teamWeekdays.join('')}`)
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
        // The period field is the range picker's own: it checks the range it shows, and its rule names the error
        expect(fieldNamed(wrapper, 'endDate').find('[data-slot="error"]').text()).toBe(DATE_WORDS.rules.endAfterStart)
    })

    // One template binds the glyph of the chosen role: one role stands for all
    it('the role trigger shows the glyph of the chosen role', async () => {
        const wrapper = await mountForm()
        const select = wrapper.findAllComponents({name: 'USelectMenu'})
            .find(menu => findByTestId(menu, JOKER_SLOT_IDS.roleSelect).exists())
        if (!select) throw new Error('No role select')
        select.vm.$emit('update:modelValue', Role.CHEF)
        await nextTick()
        expect(roleTriggerGlyphs(wrapper)).toEqual([ROLE_ICONS[Role.CHEF]])
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
