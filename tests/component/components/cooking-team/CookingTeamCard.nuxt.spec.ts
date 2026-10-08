// @vitest-environment nuxt
import {describe, it, expect, beforeEach} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {flushPromises, type VueWrapper} from '@vue/test-utils'
import {nextTick, type ComponentPublicInstance} from 'vue'
import {mountWithTooltipProvider, findByTestId, findAllByTestId, resetStores} from '~~/tests/component/testHelpers'
import CookingTeamCard from '~/components/cooking-team/CookingTeamCard.vue'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {COMPONENTS, ICONS, ROLE_ICONS} from '~/composables/useTheSlopeDesignSystem'
import {useCookingTeamValidation, type CookingTeamDetail} from '~/composables/useCookingTeamValidation'
import type {JokerSlot} from '~/composables/useDutyValidation'
import {createDefaultWeekdayMap} from '~/types/dateTypes'
import {formatDate} from '~/utils/date'

const {TeamRoleSchema} = useCookingTeamValidation()
const Role = TeamRoleSchema.enum
const ROLES = [Role.CHEF, Role.COOK, Role.JUNIORHELPER]

type IconWrapper = VueWrapper<ComponentPublicInstance<{name: string}>>
const classesOf = (token: string) => token.split(' ')

const TEST_IDS = {
    roleGroup: (role: string) => `team-role-group-${role}`,
    roleHeading: (role: string) => `team-role-heading-${role}`,
    jokerHeading: 'team-role-heading-JOKER',
    jokerBox: 'team-joker-box',
    jokerSlot: 'team-joker-slot',
    memberRow: 'team-member-row'
} as const

// The team cooks tuesdays and thursdays, from monday 5 October 2026
const dinnerTemplate = SeasonFactory.defaultCookingTeamDetail().dinnerEvents[0]!
const dinnerEvents = [6, 8, 13, 15, 20, 22].map((day, index) => ({...dinnerTemplate, id: index + 1, date: new Date(2026, 9, day)}))

const jokerSlot = (overrides: Partial<JokerSlot> = {}): JokerSlot => ({
    id: 1,
    cookingTeamId: 1,
    role: Role.COOK,
    allocationPercentage: 100,
    affinity: createDefaultWeekdayMap([false, true, false, false, false, false, false]),
    startDate: new Date(2026, 9, 5),
    endDate: new Date(2026, 9, 21),
    note: 'Anna barsel',
    createdAt: new Date(2026, 9, 1),
    updatedAt: new Date(2026, 9, 1),
    ...overrides
})

const slots = [
    {slot: jokerSlot(), shifts: 3},
    {slot: jokerSlot({
        id: 2, role: Role.JUNIORHELPER, note: 'Emil på lejr',
        affinity: createDefaultWeekdayMap([false, true, false, true, false, false, false])
    }), shifts: 5}
]

const assignments = ROLES.map((role, index) =>
    SeasonFactory.defaultCookingTeamAssignment({id: index + 1, role, inhabitantId: index + 40}))

let team: CookingTeamDetail = SeasonFactory.defaultCookingTeamDetail()

// Only HTTP is faked (testing.md Rule 6) - specific routes first, generic last
registerEndpoint('/api/admin/team/1', () => team)
registerEndpoint('/api/admin/season/active', () => null)
registerEndpoint('/api/admin/season', () => [])

const mountCard = async (mode: 'monitor' | 'regular' | 'edit', detail: Partial<CookingTeamDetail> = {}) => {
    team = SeasonFactory.defaultCookingTeamDetail({assignments, dinnerEvents, jokerSlots: slots.map(({slot}) => slot), ...detail})
    const wrapper = await mountWithTooltipProvider(CookingTeamCard, {props: {teamId: 1, teamNumber: 1, mode}, isMd: true})
    await flushPromises()
    await nextTick()
    return wrapper
}

const iconsIn = (element: Pick<VueWrapper, 'findAllComponents'>): IconWrapper[] =>
    element.findAllComponents({name: 'UIcon'}) as IconWrapper[]

const expectHeadingWithGlyph = (wrapper: VueWrapper, testId: string, glyph: string) => {
    const heading = findByTestId(wrapper, testId)
    expect(heading.exists()).toBe(true)
    expect(heading.classes()).toEqual(expect.arrayContaining(classesOf(COMPONENTS.roleBox.heading)))
    const icons = iconsIn(wrapper).filter(icon => heading.element.contains(icon.element))
    expect(icons.map(icon => icon.props('name'))).toEqual([glyph])
    expect(icons[0]!.classes()).toEqual(expect.arrayContaining(classesOf(COMPONENTS.roleBox.glyph)))
}

describe('CookingTeamCard', () => {
    beforeEach(() => {
        resetStores()
    })

    describe.each(['regular', 'edit'] as const)('%s face, Holdmedlemmer', (mode) => {
        it.each(ROLES)('the %s box heading carries the role glyph once', async (role) => {
            const wrapper = await mountCard(mode)
            expectHeadingWithGlyph(wrapper, TEST_IDS.roleHeading(role), ROLE_ICONS[role])
        })

        it('every box binds the shared glyph and content columns', async () => {
            const wrapper = await mountCard(mode)
            const boxes = [...ROLES.map(role => findByTestId(wrapper, TEST_IDS.roleGroup(role))), findByTestId(wrapper, TEST_IDS.jokerBox)]
            boxes.forEach(box => expect(box.classes()).toEqual(expect.arrayContaining(classesOf(COMPONENTS.roleBox.box))))
        })

        it('the Jokere box heading carries the joker glyph', async () => {
            const wrapper = await mountCard(mode)
            expectHeadingWithGlyph(wrapper, TEST_IDS.jokerHeading, ICONS.joker)
        })

        it('member rows carry no role glyph', async () => {
            const wrapper = await mountCard(mode)
            const rows = findAllByTestId(wrapper, TEST_IDS.memberRow)
            expect(rows).toHaveLength(assignments.length)
            const roleGlyphs: string[] = Object.values(ROLE_ICONS)
            const glyphsInRows = iconsIn(wrapper)
                .filter(icon => rows.some(row => row.element.contains(icon.element)))
                .map(icon => icon.props('name'))
            expect(glyphsInRows.filter(name => roleGlyphs.includes(name))).toEqual([])
        })

        it('the Jokere box lists one line per slot with its period, role, note and shift count', async () => {
            const wrapper = await mountCard(mode)
            const lines = findAllByTestId(findByTestId(wrapper, TEST_IDS.jokerBox), TEST_IDS.jokerSlot)
            expect(lines).toHaveLength(slots.length)
            slots.forEach(({slot, shifts}, index) => {
                const line = lines[index]!
                expect(line.text()).toContain(`${formatDate(slot.startDate)}-${formatDate(slot.endDate)}`)
                expect(line.text()).toContain(slot.note!)
                expect(line.text()).toContain(`${shifts} vagter`)
                const glyphs = iconsIn(wrapper).filter(icon => line.element.contains(icon.element)).map(icon => icon.props('name'))
                expect(glyphs).toContain(ROLE_ICONS[slot.role])
            })
        })

        it('an empty Jokere box reads "Ingen jokere"', async () => {
            const wrapper = await mountCard(mode, {jokerSlots: []})
            const box = findByTestId(wrapper, TEST_IDS.jokerBox)
            expect(findAllByTestId(box, TEST_IDS.jokerSlot)).toHaveLength(0)
            expect(box.text()).toContain('Ingen jokere')
        })
    })

    describe('monitor face', () => {
        it('every group row binds the shared glyph, label and list columns', async () => {
            const wrapper = await mountCard('monitor')
            const rows = ROLES.map(role => findByTestId(wrapper, TEST_IDS.roleGroup(role)))
            rows.forEach(row => {
                expect(row.classes()).toEqual(expect.arrayContaining(classesOf(COMPONENTS.roleBox.monitorRow)))
                expect([...row.element.parentElement!.classList]).toEqual(expect.arrayContaining(classesOf(COMPONENTS.roleBox.monitorGrid)))
            })
        })

        it.each(ROLES)('the %s group heading binds the role heading', async (role) => {
            const wrapper = await mountCard('monitor')
            expectHeadingWithGlyph(wrapper, TEST_IDS.roleHeading(role), ROLE_ICONS[role])
        })
    })
})
