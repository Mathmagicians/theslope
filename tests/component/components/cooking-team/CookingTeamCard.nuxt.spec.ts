// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {flushPromises, enableAutoUnmount, type BaseWrapper, type VueWrapper} from '@vue/test-utils'
import {nextTick, ref, type ComponentPublicInstance} from 'vue'
import type {BadgeProps, ButtonProps} from '@nuxt/ui'
import {mountWithTooltipProvider, findByTestId, findAllByTestId, findComponentByTestId, clickByTestId, resetStores, iconNamesIn} from '~~/tests/component/testHelpers'
import CookingTeamCard from '~/components/cooking-team/CookingTeamCard.vue'
import {usePlanStore} from '~/stores/plan'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {COMPONENTS, ICONS, ROLE_ICONS, getCalendarCountBadge, getRainbowBand, createResponsiveSizes} from '~/composables/useTheSlopeDesignSystem'
import {useCookingTeamValidation, type CookingTeamDetail} from '~/composables/useCookingTeamValidation'
import type {JokerSlot} from '~/composables/useDutyValidation'
import {createDefaultWeekdayMap} from '~/types/dateTypes'
import {formatDate} from '~/utils/date'
import {TEAM_WORDS} from '~/config/teamWords'
import {JOKER_SLOT_IDS, submitJokerSlotForm} from '~~/tests/component/components/cooking-team/jokerSlotForm'

const {TeamRoleSchema} = useCookingTeamValidation()
const Role = TeamRoleSchema.enum
const ROLES = [Role.CHEF, Role.COOK, Role.JUNIORHELPER]

// A face carries its icon; the overflow avatar of a group carries the count as its text
type AvatarWrapper = VueWrapper<ComponentPublicInstance<{icon?: string, text?: string}>>
const classesOf = (token: string) => token.split(' ')

const TEST_IDS = {
    roleGroup: (role: string) => `team-role-group-${role}`,
    roleHeading: (role: string) => `team-role-heading-${role}`,
    memberSummary: 'team-member-summary',
    jokerHeading: 'team-role-heading-JOKER',
    jokerBox: 'team-joker-box',
    jokerSlot: 'team-joker-slot',
    jokerShifts: 'team-joker-slot-shifts',
    memberRow: 'team-member-row',
    memberRemove: (assignmentId: number) => `team-member-remove-${assignmentId}`,
    jokerAddRow: 'joker-add-row',
    visitBadge: 'team-card-visit-badge'
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
const mountCard = async (mode: 'monitor' | 'regular' | 'edit', detail: Partial<CookingTeamDetail> = {}, teamId = TEAM_ID, isMd = true, props: {visiting?: boolean} = {}) => {
    team = SeasonFactory.defaultCookingTeamDetail({id: TEAM_ID, assignments, dinnerEvents, jokerSlots: slots.map(({slot}) => slot), ...detail})
    const wrapper = await mountWithTooltipProvider(CookingTeamCard, {
        props: {teamId, teamNumber: 1, mode, seasonDates: season.seasonDates, seasonCookingDays: season.cookingDays, ...props},
        isMd
    })
    const store = usePlanStore()
    store.selectTeam(() => TEAM_ID)
    await vi.waitFor(() => expect(store.selectedTeam?.id).toBe(TEAM_ID))
    await flushPromises()
    await nextTick()
    return wrapper
}

const avatarsIn = (element: BaseWrapper<Node>): AvatarWrapper[] =>
    element.findAllComponents({name: 'UAvatar'}) as AvatarWrapper[]

const expectHeadingWithGlyph = (wrapper: VueWrapper, testId: string, glyph: string) => {
    const heading = findByTestId(wrapper, testId)
    expect(heading.exists()).toBe(true)
    expect(heading.classes()).toEqual(expect.arrayContaining(classesOf(COMPONENTS.roleBox.heading)))
    expect(iconNamesIn(heading)).toEqual([glyph])
    expect(heading.findComponent({name: 'UIcon'}).classes()).toEqual(expect.arrayContaining(classesOf(COMPONENTS.roleBox.glyph)))
}

enableAutoUnmount(afterEach)

describe('CookingTeamCard', () => {
    beforeEach(() => {
        resetStores()
    })

    // The regular and the edit face render the same boxes; the edit controls have their own cases
    describe('Holdmedlemmer and Jokere', () => {
        it('the view face: every box heading carries its glyph once, the member rows align, the Jokere box lists one line per slot with its period, role and note, and no edit control shows', async () => {
            const wrapper = await mountCard('regular')
            ROLES.forEach(role => expectHeadingWithGlyph(wrapper, TEST_IDS.roleHeading(role), ROLE_ICONS[role]))
            expectHeadingWithGlyph(wrapper, TEST_IDS.jokerHeading, ICONS.joker)

            // Every member row holds one cell per element, so the columns align
            const rows = findAllByTestId(wrapper, TEST_IDS.memberRow)
            expect(rows).toHaveLength(assignments.length)
            expect(new Set(rows.map(row => row.element.children.length)).size).toBe(1)

            // No remove, slet, add or "Tilføj jokere" controls
            assignments.forEach(({id}) => expect(findByTestId(wrapper, TEST_IDS.memberRemove(id!)).exists()).toBe(false))
            slots.forEach(({slot}) => expect(findByTestId(wrapper, JOKER_SLOT_IDS.delete(slot.id)).exists()).toBe(false))
            expect(findByTestId(wrapper, JOKER_SLOT_IDS.add).exists()).toBe(false)
            expect(findByTestId(wrapper, TEST_IDS.jokerAddRow).exists()).toBe(false)
            expect(wrapper.findAll('h4').some(heading => heading.text() === 'Tilføj jokere')).toBe(false)

            const lines = findAllByTestId(findByTestId(wrapper, TEST_IDS.jokerBox), TEST_IDS.jokerSlot)
            expect(lines).toHaveLength(slots.length)
            slots.forEach(({slot}, index) => {
                const line = lines[index]!
                expect(line.text()).toContain(`${formatDate(slot.startDate)}-${formatDate(slot.endDate)}`)
                expect(line.text()).toContain(slot.note!)
                expect(iconNamesIn(line)).toContain(ROLE_ICONS[slot.role])
            })
        })

        // The default slots cover several shifts; a slot ending on its first tuesday covers one
        it.each([
            {lines: slots, labels: ['3 vagter', '5 vagter']},
            {lines: [{slot: jokerSlot({endDate: new Date(2026, 9, 7)}), shifts: 1}], labels: ['1 vagt']}
        ])('every joker line counts its shifts in the calendar count badge: $labels', async ({lines, labels}) => {
            const wrapper = await mountCard('regular', {jokerSlots: lines.map(({slot}) => slot)})
            const countBadge = getCalendarCountBadge(1)
            const rendered = findAllByTestId(findByTestId(wrapper, TEST_IDS.jokerBox), TEST_IDS.jokerSlot)
            expect(rendered).toHaveLength(lines.length)
            lines.forEach(({shifts}, index) => {
                const line = rendered[index]!
                const badge = findByTestId(line, TEST_IDS.jokerShifts)
                expect(badge.text()).toBe(String(shifts))
                expect(badge.attributes('aria-label')).toBe(labels[index])
                expect(badge.classes()).toEqual(expect.arrayContaining(classesOf(countBadge.class)))
                expect(findComponentByTestId<BadgeProps>(line, 'UBadge', TEST_IDS.jokerShifts).props('size')).toBe(createResponsiveSizes(ref(true)).small)
                expect(iconNamesIn(badge)).toEqual([countBadge.icon])
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

    describe('edit face, Jokere and Holdmedlemmer', () => {
        it('every slot line carries a slet that emits remove:jokerSlot, and every member row a labelled trash button that emits remove:member, with its id', async () => {
            const wrapper = await mountCard('edit')
            const lines = findAllByTestId(findByTestId(wrapper, TEST_IDS.jokerBox), TEST_IDS.jokerSlot)
            slots.forEach(({slot}, index) => {
                expect(findByTestId(lines[index]!, JOKER_SLOT_IDS.delete(slot.id)).attributes('aria-label')).toBeTruthy()
            })
            await clickByTestId(wrapper, JOKER_SLOT_IDS.delete(slots[1]!.slot.id))
            expect(wrapper.emitted('remove:jokerSlot')).toEqual([[slots[1]!.slot.id]])

            assignments.forEach(({id}) => {
                const remove = findComponentByTestId<ButtonProps>(wrapper, 'UButton', TEST_IDS.memberRemove(id!))
                expect(remove.attributes('aria-label')).toBeTruthy()
                expect(remove.props('icon')).toBe(ICONS.trash)
            })
            await clickByTestId(wrapper, TEST_IDS.memberRemove(assignments[1]!.id!))
            expect(wrapper.emitted('remove:member')).toEqual([[assignments[1]!.id]])
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

    describe('monitor face', () => {
        it('every group heading carries its role glyph once', async () => {
            const wrapper = await mountCard('monitor')
            ROLES.forEach(role => expectHeadingWithGlyph(wrapper, TEST_IDS.roleHeading(role), ROLE_ICONS[role]))
        })

        // A team on view the person is not on says so in its header, beside the team badges
        it.each([
            {visit: 'visiting', props: {visiting: true}, texts: [TEAM_WORDS.visit.badge]},
            {visit: 'not visiting', props: {visiting: false}, texts: []},
            {visit: 'no visiting prop', props: {}, texts: []}
        ])('the header carries the visit badge: $visit', async ({props, texts}) => {
            const wrapper = await mountCard('monitor', {}, TEAM_ID, true, props)
            const badges = wrapper.findAllComponents({name: 'UBadge'})
                .filter(badge => badge.attributes('data-testid') === TEST_IDS.visitBadge)

            expect(badges.map(badge => badge.text())).toEqual(texts)
            const header = wrapper.findComponent({name: 'CookingTeamBadges'}).element.parentElement!
            badges.forEach(badge => expect(header.contains(badge.element)).toBe(true))
        })
    })

    describe.each([
        {viewport: 'phone', isMd: false, shown: 3},
        {viewport: 'md', isMd: true, shown: 5}
    ])('a team of seven cooks on $viewport shows $shown faces and counts the rest', ({isMd, shown}) => {
        const cooks = Array.from({length: 7}, (_, index) =>
            SeasonFactory.defaultCookingTeamAssignment({id: index + 1, role: Role.COOK, inhabitantId: index + 40}))

        it.each([
            {group: 'the monitor face\'s Kokke row', mode: 'monitor' as const, testId: TEST_IDS.roleGroup(Role.COOK)},
            {group: 'the edit face\'s member summary', mode: 'edit' as const, testId: TEST_IDS.memberSummary}
        ])('$group', async ({mode, testId}) => {
            const wrapper = await mountCard(mode, {assignments: cooks}, TEAM_ID, isMd)
            const avatars = avatarsIn(findByTestId(wrapper, testId))

            expect(avatars.filter(avatar => !avatar.props('text'))).toHaveLength(shown)
            expect(avatars.map(avatar => avatar.props('text')).filter(Boolean)).toEqual([`+${cooks.length - shown}`])
        })
    })

    describe('edit face, Holdnavn', () => {
        const nameInput = (wrapper: VueWrapper) => wrapper.find('[data-testid="team-name-input"]')

        it('shows the resolved team name, and emits the trimmed draft once on blur after a focus seeds it', async () => {
            const wrapper = await mountCard('edit', {name: 'Team Alpha'})
            const input = nameInput(wrapper)
            expect((input.element as HTMLInputElement).value).toBe('Team Alpha')
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
    const headingNamed = (wrapper: VueWrapper, text: string) => wrapper.findAll('h4').find(heading => heading.text() === text)!
    const addButton = (wrapper: VueWrapper) => findByTestId(findByTestId(wrapper, TEST_IDS.jokerAddRow), JOKER_SLOT_IDS.add)
    const addButtonIcon = (wrapper: VueWrapper) =>
        findComponentByTestId<ButtonProps>(findByTestId(wrapper, TEST_IDS.jokerAddRow), 'UButton', JOKER_SLOT_IDS.add)
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

        expect(avatarsIn(row)[0]!.props('icon')).toBe(ICONS.joker)
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
