// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {flushPromises, enableAutoUnmount, type BaseWrapper, type VueWrapper} from '@vue/test-utils'
import {nextTick, ref, type ComponentPublicInstance} from 'vue'
import type {BadgeProps, ButtonProps} from '@nuxt/ui'
import {mountWithTooltipProvider, findByTestId, findAllByTestId, findComponentByTestId, clickByTestId, resetStores, iconNamesIn, untilTrue} from '~~/tests/component/testHelpers'
import CookingTeamCard from '~/components/cooking-team/CookingTeamCard.vue'
import {usePlanStore} from '~/stores/plan'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {COMPONENTS, ICONS, ROLE_ICONS, getCalendarCountBadge, getRainbowBand, createResponsiveSizes} from '~/composables/useTheSlopeDesignSystem'
import {useCookingTeamValidation, type CookingTeamDetail} from '~/composables/useCookingTeamValidation'
import type {JokerSlot} from '~/composables/useDutyValidation'
import {createDefaultWeekdayMap} from '~/types/dateTypes'
import {TEAM_CARD_MODES, type TeamCardMode} from '~/types/form'
import {formatDate} from '~/utils/date'
import {TEAM_WORDS} from '~/config/teamWords'
import {BUTTON_WORDS} from '~/config/buttonWords'
import {JOKER_SLOT_IDS, submitJokerSlotForm} from '~~/tests/component/components/cooking-team/jokerSlotForm'

const {TeamRoleSchema} = useCookingTeamValidation()
const Role = TeamRoleSchema.enum
const ROLES = [Role.CHEF, Role.COOK, Role.JUNIORHELPER]

// A face carries its icon; the overflow avatar of a group carries the count as its text
type AvatarInstance = ComponentPublicInstance<{icon?: string, text?: string}>
type AvatarWrapper = VueWrapper<AvatarInstance>
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
    visitBadge: 'team-card-visit-badge',
    nameInput: 'team-name-input'
} as const

// The season the edit face plans in: Mon/Wed/Fri cooking days
const season = SeasonFactory.defaultSeason()

// The team cooks tuesdays and thursdays, from monday 5 October 2026
const dinnerEvents = [6, 8, 13, 15, 20, 22].map((day, index) =>
    ({...DinnerEventFactory.defaultDinnerEventDisplay(), id: index + 1, date: new Date(2026, 9, day), cookingTeamId: 1, seasonId: 1}))

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

const annaSlot = {slot: jokerSlot(), shifts: 3}
const emilSlot = {slot: jokerSlot({
    id: 2, role: Role.JUNIORHELPER, note: 'Emil på lejr',
    affinity: createDefaultWeekdayMap([false, true, false, true, false, false, false])
}), shifts: 5}
const slots = [annaSlot, emilSlot]

// One member per role, its assignment id by its role: the assignment type leaves the id optional
const MEMBER_IDS = {[Role.CHEF]: 1, [Role.COOK]: 2, [Role.JUNIORHELPER]: 3}
const assignments = ROLES.map(role =>
    SeasonFactory.defaultCookingTeamAssignment({id: MEMBER_IDS[role], role, inhabitantId: MEMBER_IDS[role] + 39}))

let team: CookingTeamDetail = SeasonFactory.defaultCookingTeamDetail()

// Only HTTP is faked - specific routes first, generic last; the plan store reads the team
registerEndpoint(`/api/admin/team/1/joker-slot/${emilSlot.slot.id}`, {method: 'DELETE', handler: () => 1})
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
const mountCard = async (mode: TeamCardMode, detail: Partial<CookingTeamDetail> = {}, teamId = TEAM_ID, isMd = true, props: {visiting?: boolean} = {}) => {
    team = SeasonFactory.defaultCookingTeamDetail({id: TEAM_ID, assignments, dinnerEvents, jokerSlots: slots.map(({slot}) => slot), ...detail})
    const wrapper = await mountWithTooltipProvider(CookingTeamCard, {
        props: {teamId, teamNumber: 1, mode, seasonDates: season.seasonDates, seasonCookingDays: season.cookingDays, ...props},
        isMd
    })
    const store = usePlanStore()
    store.selectTeam(() => TEAM_ID)
    await untilTrue(() => store.selectedTeam?.id === TEAM_ID)
    await flushPromises()
    await nextTick()
    return wrapper
}

const avatarsIn = (element: BaseWrapper<Node>): AvatarWrapper[] =>
    element.findAllComponents<AvatarInstance>({name: 'UAvatar'})

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
            const wrapper = await mountCard(TEAM_CARD_MODES.REGULAR)
            ROLES.forEach(role => expectHeadingWithGlyph(wrapper, TEST_IDS.roleHeading(role), ROLE_ICONS[role]))
            expectHeadingWithGlyph(wrapper, TEST_IDS.jokerHeading, ICONS.joker)

            // Every member row holds one cell per element, so the columns align
            const rows = findAllByTestId(wrapper, TEST_IDS.memberRow)
            expect(rows).toHaveLength(assignments.length)
            expect(new Set(rows.map(row => row.element.children.length)).size).toBe(1)

            // No remove, slet, add or "Tilføj jokere" controls
            ROLES.forEach(role => expect(findByTestId(wrapper, TEST_IDS.memberRemove(MEMBER_IDS[role])).exists()).toBe(false))
            slots.forEach(({slot}) => expect(findByTestId(wrapper, JOKER_SLOT_IDS.delete(slot.id)).exists()).toBe(false))
            expect(findByTestId(wrapper, JOKER_SLOT_IDS.add).exists()).toBe(false)
            expect(findByTestId(wrapper, TEST_IDS.jokerAddRow).exists()).toBe(false)
            expect(wrapper.findAll('h4').some(heading => heading.text() === TEAM_WORDS.card.addJokers)).toBe(false)

            const lines = findAllByTestId(findByTestId(wrapper, TEST_IDS.jokerBox), TEST_IDS.jokerSlot)
            // One line per slot in its order: its period, its note and its role's glyph
            const texts = lines.map(line => line.text())
            expect(texts).toEqual(slots.map(({slot}) => expect.stringContaining(`${formatDate(slot.startDate)}-${formatDate(slot.endDate)}`)))
            expect(texts).toEqual(slots.map(({slot}) => expect.stringContaining(slot.note ?? '')))
            expect(lines.map(line => iconNamesIn(line))).toEqual(slots.map(({slot}) => expect.arrayContaining([ROLE_ICONS[slot.role]])))
        })

        // The default slots cover several shifts; a slot ending on its first tuesday covers one
        it.each([
            {name: 'several shifts', lines: slots},
            {name: 'one shift', lines: [{slot: jokerSlot({endDate: new Date(2026, 9, 7)}), shifts: 1}]}
        ])('every joker line counts its shifts in the calendar count badge: $name', async ({lines}) => {
            const wrapper = await mountCard(TEAM_CARD_MODES.REGULAR, {jokerSlots: lines.map(({slot}) => slot)})
            const countBadge = getCalendarCountBadge(1)
            const rendered = findAllByTestId(findByTestId(wrapper, TEST_IDS.jokerBox), TEST_IDS.jokerSlot)
            // Each line in its slot's order: the badge reads the count, names the shifts and wears the calendar's count badge
            const badges = rendered.map(line => {
                const badge = findByTestId(line, TEST_IDS.jokerShifts)
                return {
                    count: badge.text(),
                    label: badge.attributes('aria-label'),
                    classes: badge.classes(),
                    size: findComponentByTestId<BadgeProps>(line, 'UBadge', TEST_IDS.jokerShifts).props('size'),
                    icons: iconNamesIn(badge),
                    line: line.text()
                }
            })
            expect(badges).toEqual(lines.map(({shifts}) => ({
                count: String(shifts),
                label: TEAM_WORDS.card.shifts(shifts),
                classes: expect.arrayContaining(classesOf(countBadge.class)),
                size: createResponsiveSizes(ref(true)).small,
                icons: [countBadge.icon],
                line: expect.not.stringContaining(TEAM_WORDS.card.shifts(shifts))
            })))
        })

        it('an empty Jokere box reads "Ingen jokere"', async () => {
            const wrapper = await mountCard(TEAM_CARD_MODES.REGULAR, {jokerSlots: []})
            const box = findByTestId(wrapper, TEST_IDS.jokerBox)
            expect(findAllByTestId(box, TEST_IDS.jokerSlot)).toHaveLength(0)
            expect(box.text()).toContain('Ingen jokere')
        })
    })

    describe('edit face, Jokere and Holdmedlemmer', () => {
        it('every slot line carries a slet that emits remove:jokerSlot, and every member row a labelled trash button that emits remove:member, with its id', async () => {
            const wrapper = await mountCard(TEAM_CARD_MODES.EDIT)
            const lines = findAllByTestId(findByTestId(wrapper, TEST_IDS.jokerBox), TEST_IDS.jokerSlot)
            // Each line holds its own slot's slet, and each slet has an accessible name
            expect(lines.map(line => slots.filter(({slot}) => findByTestId(line, JOKER_SLOT_IDS.delete(slot.id)).exists()).map(({slot}) => slot.id)))
                .toEqual(slots.map(({slot}) => [slot.id]))
            slots.forEach(({slot}) => expect(findByTestId(wrapper, JOKER_SLOT_IDS.delete(slot.id)).attributes('aria-label')).toBeTruthy())
            await clickByTestId(wrapper, JOKER_SLOT_IDS.delete(emilSlot.slot.id))
            expect(wrapper.emitted('remove:jokerSlot')).toEqual([[emilSlot.slot.id]])

            ROLES.forEach(role => {
                const remove = findComponentByTestId<ButtonProps>(wrapper, 'UButton', TEST_IDS.memberRemove(MEMBER_IDS[role]))
                expect(remove.attributes('aria-label')).toBeTruthy()
                expect(remove.props('icon')).toBe(ICONS.trash)
            })
            await clickByTestId(wrapper, TEST_IDS.memberRemove(MEMBER_IDS[Role.COOK]))
            expect(wrapper.emitted('remove:member')).toEqual([[MEMBER_IDS[Role.COOK]]])
        })
    })

    describe('the team the store holds', () => {
        it('the Jokere box and member rows follow the store team after a write refreshes it', async () => {
            const wrapper = await mountCard(TEAM_CARD_MODES.EDIT)
            const store = usePlanStore()
            const [removedSlot, keptSlot] = [emilSlot.slot, annaSlot.slot]
            team = {...team, assignments: assignments.slice(1), jokerSlots: [keptSlot]}

            await store.deleteJokerSlot(TEAM_ID, removedSlot.id)
            await flushPromises()

            expect(findAllByTestId(wrapper, TEST_IDS.jokerSlot)).toHaveLength(1)
            expect(findByTestId(wrapper, JOKER_SLOT_IDS.delete(removedSlot.id)).exists()).toBe(false)
            expect(findAllByTestId(wrapper, TEST_IDS.memberRow)).toHaveLength(assignments.length - 1)
        })

        it('shows the loader, not the held team, while the store holds another team', async () => {
            const wrapper = await mountCard(TEAM_CARD_MODES.REGULAR, {}, TEAM_ID + 1)

            expect(wrapper.text()).toContain('Henter madhold')
            expect(findAllByTestId(wrapper, TEST_IDS.memberRow)).toHaveLength(0)
        })
    })

    describe('monitor face', () => {
        it('every group heading carries its role glyph once', async () => {
            const wrapper = await mountCard(TEAM_CARD_MODES.MONITOR)
            ROLES.forEach(role => expectHeadingWithGlyph(wrapper, TEST_IDS.roleHeading(role), ROLE_ICONS[role]))
        })

        // A team on view the person is not on says so in its header, beside the team badges
        it.each([
            {visit: 'visiting', props: {visiting: true}, texts: [TEAM_WORDS.visit.badge]},
            {visit: 'not visiting', props: {visiting: false}, texts: []},
            {visit: 'no visiting prop', props: {}, texts: []}
        ])('the header carries the visit badge: $visit', async ({props, texts}) => {
            const wrapper = await mountCard(TEAM_CARD_MODES.MONITOR, {}, TEAM_ID, true, props)
            const badges = wrapper.findAllComponents({name: 'UBadge'})
                .filter(badge => badge.attributes('data-testid') === TEST_IDS.visitBadge)

            expect(badges.map(badge => badge.text())).toEqual(texts)
            const header = wrapper.findComponent({name: 'CookingTeamBadges'}).element.parentElement
            badges.forEach(badge => expect(header?.contains(badge.element)).toBe(true))
        })
    })

    describe.each([
        {viewport: 'phone', isMd: false, shown: 3},
        {viewport: 'md', isMd: true, shown: 5}
    ])('a team of seven cooks on $viewport shows $shown faces and counts the rest', ({isMd, shown}) => {
        const cooks = Array.from({length: 7}, (_, index) =>
            SeasonFactory.defaultCookingTeamAssignment({id: index + 1, role: Role.COOK, inhabitantId: index + 40}))

        it.each([
            {group: 'the monitor face\'s Kokke row', mode: TEAM_CARD_MODES.MONITOR, testId: TEST_IDS.roleGroup(Role.COOK)},
            {group: 'the edit face\'s member summary', mode: TEAM_CARD_MODES.EDIT, testId: TEST_IDS.memberSummary}
        ])('$group', async ({mode, testId}) => {
            const wrapper = await mountCard(mode, {assignments: cooks}, TEAM_ID, isMd)
            const avatars = avatarsIn(findByTestId(wrapper, testId))

            expect(avatars.filter(avatar => !avatar.props('text'))).toHaveLength(shown)
            expect(avatars.map(avatar => avatar.props('text')).filter(Boolean)).toEqual([`+${cooks.length - shown}`])
        })
    })

    describe('edit face, Holdnavn', () => {
        it('shows the resolved team name, and emits the trimmed draft once on blur after a focus seeds it', async () => {
            const wrapper = await mountCard(TEAM_CARD_MODES.EDIT, {name: 'Team Alpha'})
            const input = findByTestId<HTMLInputElement>(wrapper, TEST_IDS.nameInput)
            expect(input.element.value).toBe('Team Alpha')
            await input.trigger('focus')
            await input.setValue(' Team Alpha Q ')
            await input.trigger('blur')
            expect(wrapper.emitted('update:teamName')).toEqual([['Team Alpha Q']])
        })

        it('emits nothing for an unchanged or empty draft and shows the live name again', async () => {
            const wrapper = await mountCard(TEAM_CARD_MODES.EDIT, {name: 'Team Alpha'})
            const input = findByTestId(wrapper, TEST_IDS.nameInput)
            await input.trigger('focus')
            await input.trigger('blur')
            await input.trigger('focus')
            await input.setValue('   ')
            await input.trigger('blur')
            expect(wrapper.emitted('update:teamName')).toBeUndefined()
            expect(findByTestId<HTMLInputElement>(wrapper, TEST_IDS.nameInput).element.value).toBe('Team Alpha')
        })
    })
})

describe('CookingTeamCard edit face, Tilføj jokere', () => {
    const headingNamed = (wrapper: VueWrapper, text: string) => wrapper.findAll('h4').find(heading => heading.text() === text)
    const addButton = (wrapper: VueWrapper) => findByTestId(findByTestId(wrapper, TEST_IDS.jokerAddRow), JOKER_SLOT_IDS.add)
    const addButtonIcon = (wrapper: VueWrapper) =>
        findComponentByTestId<ButtonProps>(findByTestId(wrapper, TEST_IDS.jokerAddRow), 'UButton', JOKER_SLOT_IDS.add)
    // A missing element follows nothing, so the order assertion fails on it
    const follows = (earlier: Element | undefined, later: Element | undefined) =>
        !!earlier && !!later && (earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0

    beforeEach(() => {
        resetStores()
    })

    it('the "Tilføj jokere" row sits under the finder with the joker glyph in the avatar place and a Tilføj button', async () => {
        const wrapper = await mountCard(TEAM_CARD_MODES.EDIT)
        const row = findByTestId(wrapper, TEST_IDS.jokerAddRow)
        const finderHeading = headingNamed(wrapper, TEAM_WORDS.card.addMembers)
        const jokerHeading = headingNamed(wrapper, TEAM_WORDS.card.addJokers)

        expect(row.exists()).toBe(true)
        expect(finderHeading?.element.parentElement?.contains(row.element)).toBe(true)
        expect(follows(finderHeading?.element, jokerHeading?.element)).toBe(true)
        expect(follows(jokerHeading?.element, row.element)).toBe(true)

        expect(avatarsIn(row)[0]?.props('icon')).toBe(ICONS.joker)
        expect(row.text()).toContain(TEAM_WORDS.card.jokerRow)
        expect(addButton(wrapper).text()).toBe(BUTTON_WORDS.add)
        expect(addButton(wrapper).attributes('aria-expanded')).toBe('false')
        expect(addButtonIcon(wrapper).props('icon')).toBe(ICONS.plusCircle)
        expect(addButtonIcon(wrapper).props('trailingIcon')).toBeUndefined()
    })

    it('Tilføj opens the form in the member form panel and reads Luk while open', async () => {
        const wrapper = await mountCard(TEAM_CARD_MODES.EDIT)
        expect(findByTestId(wrapper, JOKER_SLOT_IDS.form).exists()).toBe(false)

        await clickByTestId(wrapper, JOKER_SLOT_IDS.add)
        await flushPromises()

        expect(addButton(wrapper).attributes('aria-expanded')).toBe('true')
        expect(addButton(wrapper).text()).toBe(BUTTON_WORDS.close)
        expect(addButtonIcon(wrapper).props('icon')).toBe(ICONS.chevronDown)
        const form = findByTestId(wrapper, JOKER_SLOT_IDS.form)
        expect(form.exists()).toBe(true)
        expect(form.element.parentElement?.className.split(' ')).toEqual(expect.arrayContaining(classesOf(COMPONENTS.teamCard.memberForm)))
        expect(findByTestId(form, JOKER_SLOT_IDS.submit).text()).toBe(BUTTON_WORDS.add)
        expect(findByTestId(form, JOKER_SLOT_IDS.cancel).text()).toBe(BUTTON_WORDS.cancel)
    })

    it('the form\'s Tilføj emits add:jokerSlot on the team days and closes the row', async () => {
        const teamDays = createDefaultWeekdayMap([false, true, false, true, false, false, false])
        const wrapper = await mountCard(TEAM_CARD_MODES.EDIT, {affinity: teamDays})
        await clickByTestId(wrapper, JOKER_SLOT_IDS.add)
        await flushPromises()

        await submitJokerSlotForm(wrapper)

        expect(wrapper.emitted('add:jokerSlot')).toHaveLength(1)
        expect(wrapper.emitted('add:jokerSlot')?.[0]?.[0]).toMatchObject({
            role: Role.COOK,
            allocationPercentage: 100,
            startDate: season.seasonDates.start,
            endDate: season.seasonDates.end,
            affinity: teamDays
        })
        expect(findByTestId(wrapper, JOKER_SLOT_IDS.form).exists()).toBe(false)
        expect(addButton(wrapper).attributes('aria-expanded')).toBe('false')
        expect(addButton(wrapper).text()).toBe(BUTTON_WORDS.add)
        expect(addButtonIcon(wrapper).props('icon')).toBe(ICONS.plusCircle)
    })

    it('Annuller closes the row and emits nothing', async () => {
        const wrapper = await mountCard(TEAM_CARD_MODES.EDIT)
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
        const wrapper = await mountCard(TEAM_CARD_MODES.REGULAR, {name: renamed.name})
        await usePlanStore().loadSeasons()

        await vi.waitFor(() => expect(findAllByTestId(wrapper, 'calendar-legend-badge')[0]?.classes())
            .toEqual(expect.arrayContaining(classesOf(getRainbowBand(1)))))
    })
})
