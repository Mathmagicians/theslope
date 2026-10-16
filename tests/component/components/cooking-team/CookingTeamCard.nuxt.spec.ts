// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {flushPromises, enableAutoUnmount, type VueWrapper} from '@vue/test-utils'
import {nextTick, ref, type ComponentPublicInstance} from 'vue'
import {mountWithTooltipProvider, findByTestId, findAllByTestId, clickByTestId, resetStores} from '~~/tests/component/testHelpers'
import CookingTeamCard from '~/components/cooking-team/CookingTeamCard.vue'
import {usePlanStore} from '~/stores/plan'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {COMPONENTS, ICONS, ROLE_ICONS, getCalendarCountBadge, getRainbowBand, createResponsiveSizes} from '~/composables/useTheSlopeDesignSystem'
import {useCookingTeamValidation, type CookingTeamDetail} from '~/composables/useCookingTeamValidation'
import type {JokerSlot} from '~/composables/useDutyValidation'
import {createDefaultWeekdayMap} from '~/types/dateTypes'
import {formatDate} from '~/utils/date'
import {JOKER_SLOT_IDS, submitJokerSlotForm} from '~~/tests/component/components/cooking-team/jokerSlotForm'

const {TeamRoleSchema} = useCookingTeamValidation()
const Role = TeamRoleSchema.enum
const ROLES = [Role.CHEF, Role.COOK, Role.JUNIORHELPER]

type IconWrapper = VueWrapper<ComponentPublicInstance<{name: string}>>
const classesOf = (token: string) => token.split(' ')

const TEST_IDS = {
    roleHeading: (role: string) => `team-role-heading-${role}`,
    jokerHeading: 'team-role-heading-JOKER',
    jokerBox: 'team-joker-box',
    jokerSlot: 'team-joker-slot',
    jokerShifts: 'team-joker-slot-shifts',
    memberRow: 'team-member-row',
    memberRemove: (assignmentId: number) => `team-member-remove-${assignmentId}`,
    jokerAddRow: 'joker-add-row'
} as const

// The season the edit face plans in: Mon/Wed/Fri cooking days
const season = SeasonFactory.defaultSeason()

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

// Only HTTP is faked (testing.md Rule 6) - specific routes first, generic last; the plan store reads the team
registerEndpoint(`/api/admin/team/1/joker-slot/${slots[1]!.slot.id}`, {method: 'DELETE', handler: () => 1})
registerEndpoint('/api/admin/team/1', () => team)
// No active season by default; a case that needs the season's teams sets one
const SEASON_ID = 9
let seasonWithTeams: (typeof season & {id: number, CookingTeams: ReturnType<typeof SeasonFactory.defaultCookingTeamDisplay>[]}) | null = null
registerEndpoint(`/api/admin/season/${SEASON_ID}`, () => seasonWithTeams)
registerEndpoint('/api/admin/season/active', () => seasonWithTeams?.id ?? null)
registerEndpoint('/api/admin/season', () => seasonWithTeams ? [seasonWithTeams] : [])

const TEAM_ID = 1

// The mounting page selects the team in the store the mounted card reads; a store created before the mount
// registers the dataset key first and would serve the card through its own selection
const mountCard = async (mode: 'monitor' | 'regular' | 'edit', detail: Partial<CookingTeamDetail> = {}, teamId = TEAM_ID) => {
    team = SeasonFactory.defaultCookingTeamDetail({id: TEAM_ID, assignments, dinnerEvents, jokerSlots: slots.map(({slot}) => slot), ...detail})
    const wrapper = await mountWithTooltipProvider(CookingTeamCard, {
        props: {teamId, teamNumber: 1, mode, seasonDates: season.seasonDates, seasonCookingDays: season.cookingDays},
        isMd: true
    })
    const store = usePlanStore()
    store.selectTeam(() => TEAM_ID)
    await vi.waitFor(() => expect(store.selectedTeam?.id).toBe(TEAM_ID))
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

enableAutoUnmount(afterEach)

describe('CookingTeamCard', () => {
    beforeEach(() => {
        resetStores()
    })

    // The regular and the edit face render the same boxes; the edit controls have their own cases
    describe('Holdmedlemmer and Jokere', () => {
        it('every box heading carries its glyph once', async () => {
            const wrapper = await mountCard('regular')
            ROLES.forEach(role => expectHeadingWithGlyph(wrapper, TEST_IDS.roleHeading(role), ROLE_ICONS[role]))
            expectHeadingWithGlyph(wrapper, TEST_IDS.jokerHeading, ICONS.joker)
        })

        it('every member row holds one cell per element, so the columns align', async () => {
            const wrapper = await mountCard('regular')
            const rows = findAllByTestId(wrapper, TEST_IDS.memberRow)
            expect(rows).toHaveLength(assignments.length)
            expect(new Set(rows.map(row => row.element.children.length)).size).toBe(1)
        })

        it('the Jokere box lists one line per slot with its period, role and note', async () => {
            const wrapper = await mountCard('regular')
            const lines = findAllByTestId(findByTestId(wrapper, TEST_IDS.jokerBox), TEST_IDS.jokerSlot)
            expect(lines).toHaveLength(slots.length)
            slots.forEach(({slot}, index) => {
                const line = lines[index]!
                expect(line.text()).toContain(`${formatDate(slot.startDate)}-${formatDate(slot.endDate)}`)
                expect(line.text()).toContain(slot.note!)
                const glyphs = iconsIn(wrapper).filter(icon => line.element.contains(icon.element)).map(icon => icon.props('name'))
                expect(glyphs).toContain(ROLE_ICONS[slot.role])
            })
        })

        // The default slots cover several shifts; a slot ending on its first tuesday covers one
        it.each([
            {lines: slots, labels: ['3 vagter', '5 vagter']},
            {lines: [{slot: jokerSlot({endDate: new Date(2026, 9, 7)}), shifts: 1}], labels: ['1 vagt']}
        ])('every joker line counts its shifts in the calendar count badge: $labels', async ({lines, labels}) => {
            const wrapper = await mountCard('regular', {jokerSlots: lines.map(({slot}) => slot)})
            const countBadge = getCalendarCountBadge(1)
            const badges = wrapper.findAllComponents({name: 'UBadge'}) as VueWrapper<ComponentPublicInstance<{size?: string}>>[]
            const rendered = findAllByTestId(findByTestId(wrapper, TEST_IDS.jokerBox), TEST_IDS.jokerSlot)
            expect(rendered).toHaveLength(lines.length)
            lines.forEach(({shifts}, index) => {
                const line = rendered[index]!
                const badge = findByTestId(line, TEST_IDS.jokerShifts)
                expect(badge.text()).toBe(String(shifts))
                expect(badge.attributes('aria-label')).toBe(labels[index])
                expect(badge.classes()).toEqual(expect.arrayContaining(classesOf(countBadge.class)))
                expect(badges.find(component => component.element === badge.element)!.props('size')).toBe(createResponsiveSizes(ref(true)).small)
                const glyphs = iconsIn(wrapper).filter(icon => badge.element.contains(icon.element)).map(icon => icon.props('name'))
                expect(glyphs).toEqual([countBadge.icon])
                expect(line.text()).not.toContain('vagt')
            })
        })

        it('an empty Jokere box reads "Ingen jokere"', async () => {
            const wrapper = await mountCard('regular', {jokerSlots: []})
            const box = findByTestId(wrapper, TEST_IDS.jokerBox)
            expect(findAllByTestId(box, TEST_IDS.jokerSlot)).toHaveLength(0)
            expect(box.text()).toContain('Ingen jokere')
        })
    })

    describe('edit face, Jokere', () => {
        it('every slot line carries a slet that emits remove:jokerSlot with its id', async () => {
            const wrapper = await mountCard('edit')
            const lines = findAllByTestId(findByTestId(wrapper, TEST_IDS.jokerBox), TEST_IDS.jokerSlot)
            slots.forEach(({slot}, index) => {
                expect(findByTestId(lines[index]!, JOKER_SLOT_IDS.delete(slot.id)).attributes('aria-label')).toBeTruthy()
            })
            await clickByTestId(wrapper, JOKER_SLOT_IDS.delete(slots[1]!.slot.id))
            expect(wrapper.emitted('remove:jokerSlot')).toEqual([[slots[1]!.slot.id]])
        })
    })

    describe('the team the store holds', () => {
        it('the Jokere box and member rows follow the store team after a write refreshes it', async () => {
            const wrapper = await mountCard('edit')
            const store = usePlanStore()
            const [removedSlot, keptSlot] = [slots[1]!.slot, slots[0]!.slot]
            team = {...team, assignments: assignments.slice(1), jokerSlots: [keptSlot]}

            await store.deleteJokerSlot(TEAM_ID, removedSlot.id)
            await flushPromises()

            expect(findAllByTestId(wrapper, TEST_IDS.jokerSlot)).toHaveLength(1)
            expect(findByTestId(wrapper, JOKER_SLOT_IDS.delete(removedSlot.id)).exists()).toBe(false)
            expect(findAllByTestId(wrapper, TEST_IDS.memberRow)).toHaveLength(assignments.length - 1)
        })

        it('shows the loader, not the held team, while the store holds another team', async () => {
            const wrapper = await mountCard('regular', {}, TEAM_ID + 1)

            expect(wrapper.text()).toContain('Henter madhold')
            expect(findAllByTestId(wrapper, TEST_IDS.memberRow)).toHaveLength(0)
        })
    })

    describe('edit face, Holdmedlemmer', () => {
        it('every member row carries a labelled trash button that emits remove:member with its assignment id', async () => {
            const wrapper = await mountCard('edit')
            const buttons = (wrapper.findAllComponents({name: 'UButton'}) as VueWrapper<ComponentPublicInstance<{icon?: string}>>[])
            assignments.forEach(({id}) => {
                const remove = findByTestId(wrapper, TEST_IDS.memberRemove(id!))
                expect(remove.attributes('aria-label')).toBeTruthy()
                expect(buttons.find(button => button.element === remove.element)!.props('icon')).toBe(ICONS.trash)
            })
            await clickByTestId(wrapper, TEST_IDS.memberRemove(assignments[1]!.id!))
            expect(wrapper.emitted('remove:member')).toEqual([[assignments[1]!.id]])
        })
    })

    it('the view face shows no remove, slet, add or "Tilføj jokere" controls', async () => {
        const wrapper = await mountCard('regular')
        assignments.forEach(({id}) => expect(findByTestId(wrapper, TEST_IDS.memberRemove(id!)).exists()).toBe(false))
        slots.forEach(({slot}) => expect(findByTestId(wrapper, JOKER_SLOT_IDS.delete(slot.id)).exists()).toBe(false))
        expect(findByTestId(wrapper, JOKER_SLOT_IDS.add).exists()).toBe(false)
        expect(findByTestId(wrapper, TEST_IDS.jokerAddRow).exists()).toBe(false)
        expect(wrapper.findAll('h4').some(heading => heading.text() === 'Tilføj jokere')).toBe(false)
    })

    describe('monitor face', () => {
        it('every group heading carries its role glyph once', async () => {
            const wrapper = await mountCard('monitor')
            ROLES.forEach(role => expectHeadingWithGlyph(wrapper, TEST_IDS.roleHeading(role), ROLE_ICONS[role]))
        })
    })

    describe('edit face, Holdnavn', () => {
        const nameInput = (wrapper: VueWrapper) => wrapper.find('[data-testid="team-name-input"]')

        it('shows the resolved team name', async () => {
            const wrapper = await mountCard('edit', {name: 'Team Alpha'})
            expect((nameInput(wrapper).element as HTMLInputElement).value).toBe('Team Alpha')
        })

        it('emits the trimmed draft once on blur after a focus seeds it', async () => {
            const wrapper = await mountCard('edit', {name: 'Team Alpha'})
            const input = nameInput(wrapper)
            await input.trigger('focus')
            await input.setValue(' Team Alpha Q ')
            await input.trigger('blur')
            expect(wrapper.emitted('update:teamName')).toEqual([['Team Alpha Q']])
        })

        it('emits nothing for an unchanged or empty draft and shows the live name again', async () => {
            const wrapper = await mountCard('edit', {name: 'Team Alpha'})
            const input = nameInput(wrapper)
            await input.trigger('focus')
            await input.trigger('blur')
            await input.trigger('focus')
            await input.setValue('   ')
            await input.trigger('blur')
            expect(wrapper.emitted('update:teamName')).toBeUndefined()
            expect((nameInput(wrapper).element as HTMLInputElement).value).toBe('Team Alpha')
        })
    })
})

describe('CookingTeamCard edit face, Tilføj jokere', () => {
    type AvatarWrapper = VueWrapper<ComponentPublicInstance<{icon?: string}>>

    const headingNamed = (wrapper: VueWrapper, text: string) => wrapper.findAll('h4').find(heading => heading.text() === text)!
    const addButton = (wrapper: VueWrapper) => findByTestId(findByTestId(wrapper, TEST_IDS.jokerAddRow), JOKER_SLOT_IDS.add)
    const addButtonIcon = (wrapper: VueWrapper) => (wrapper.findAllComponents({name: 'UButton'}) as VueWrapper<ComponentPublicInstance<{icon?: string, trailingIcon?: string}>>[])
        .find(button => button.element === addButton(wrapper).element)!
    const follows = (earlier: Element, later: Element) =>
        (earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0

    beforeEach(() => {
        resetStores()
    })

    it('the "Tilføj jokere" row sits under the finder with the joker glyph in the avatar place and a Tilføj button', async () => {
        const wrapper = await mountCard('edit')
        const row = findByTestId(wrapper, TEST_IDS.jokerAddRow)
        const finderHeading = headingNamed(wrapper, 'Tilføj medlemmer')
        const jokerHeading = headingNamed(wrapper, 'Tilføj jokere')

        expect(row.exists()).toBe(true)
        expect(finderHeading.element.parentElement!.contains(row.element)).toBe(true)
        expect(follows(finderHeading.element, jokerHeading.element)).toBe(true)
        expect(follows(jokerHeading.element, row.element)).toBe(true)

        const avatar = (wrapper.findAllComponents({name: 'UAvatar'}) as AvatarWrapper[]).find(component => row.element.contains(component.element))
        expect(avatar!.props('icon')).toBe(ICONS.joker)
        expect(row.text()).toContain('Joker · en plads uden navn')
        expect(addButton(wrapper).text()).toBe('Tilføj')
        expect(addButton(wrapper).attributes('aria-expanded')).toBe('false')
        expect(addButtonIcon(wrapper).props('icon')).toBe(ICONS.plusCircle)
        expect(addButtonIcon(wrapper).props('trailingIcon')).toBeUndefined()
    })

    it('Tilføj opens the form in the member form panel and reads Luk while open', async () => {
        const wrapper = await mountCard('edit')
        expect(findByTestId(wrapper, JOKER_SLOT_IDS.form).exists()).toBe(false)

        await clickByTestId(wrapper, JOKER_SLOT_IDS.add)
        await flushPromises()

        expect(addButton(wrapper).attributes('aria-expanded')).toBe('true')
        expect(addButton(wrapper).text()).toBe('Luk')
        expect(addButtonIcon(wrapper).props('icon')).toBe(ICONS.chevronDown)
        const form = findByTestId(wrapper, JOKER_SLOT_IDS.form)
        expect(form.exists()).toBe(true)
        expect([...form.element.parentElement!.classList]).toEqual(expect.arrayContaining(classesOf(COMPONENTS.teamCard.memberForm)))
        expect(findByTestId(form, JOKER_SLOT_IDS.submit).text()).toBe('Tilføj')
        expect(findByTestId(form, JOKER_SLOT_IDS.cancel).text()).toBe('Annuller')
    })

    it('the form\'s Tilføj emits add:jokerSlot on the team days and closes the row', async () => {
        const teamDays = createDefaultWeekdayMap([false, true, false, true, false, false, false])
        const wrapper = await mountCard('edit', {affinity: teamDays})
        await clickByTestId(wrapper, JOKER_SLOT_IDS.add)
        await flushPromises()

        await submitJokerSlotForm(wrapper)

        const emitted = wrapper.emitted('add:jokerSlot')
        expect(emitted).toHaveLength(1)
        expect(emitted![0]![0]).toMatchObject({
            role: Role.COOK,
            allocationPercentage: 100,
            startDate: season.seasonDates.start,
            endDate: season.seasonDates.end,
            affinity: teamDays
        })
        expect(findByTestId(wrapper, JOKER_SLOT_IDS.form).exists()).toBe(false)
        expect(addButton(wrapper).attributes('aria-expanded')).toBe('false')
        expect(addButton(wrapper).text()).toBe('Tilføj')
        expect(addButtonIcon(wrapper).props('icon')).toBe(ICONS.plusCircle)
    })

    it('Annuller closes the row and emits nothing', async () => {
        const wrapper = await mountCard('edit')
        await clickByTestId(wrapper, JOKER_SLOT_IDS.add)
        await flushPromises()

        await clickByTestId(wrapper, JOKER_SLOT_IDS.cancel)

        expect(wrapper.emitted('add:jokerSlot')).toBeUndefined()
        expect(findByTestId(wrapper, JOKER_SLOT_IDS.form).exists()).toBe(false)
        expect(addButton(wrapper).attributes('aria-expanded')).toBe('false')
    })
})

// The team calendar names its team by number: the one in the name, else the team's position in the season
describe('CookingTeamCard team calendar', () => {
    beforeEach(() => {
        resetStores()
    })

    afterEach(() => {
        seasonWithTeams = null
    })

    it('a renamed team with no number in its name wears the stop of its season position', async () => {
        const renamed = SeasonFactory.defaultCookingTeamDisplay({id: TEAM_ID, name: 'Holdet uden tal'})
        seasonWithTeams = {...season, id: SEASON_ID, CookingTeams: [
            SeasonFactory.defaultCookingTeamDisplay({id: 5, name: 'Madhold 1 - S1'}),
            renamed,
            SeasonFactory.defaultCookingTeamDisplay({id: 7, name: 'Madhold 3 - S1'})
        ]}
        const wrapper = await mountCard('regular', {name: renamed.name})
        await usePlanStore().loadSeasons()

        await vi.waitFor(() => expect(findAllByTestId(wrapper, 'calendar-legend-badge')[0]?.classes())
            .toEqual(expect.arrayContaining(classesOf(getRainbowBand(1)))))
    })
})
