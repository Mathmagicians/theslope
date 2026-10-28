import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createError} from 'h3'
import {addDays, addHours} from 'date-fns'
import {sendChefDeadlines} from '~~/server/utils/sender/events/chef-deadlines'
import {siteUrl} from '~~/server/utils/sender/compose'
import {fetchHouseholdsByIds, fetchInhabitantsByIds, fetchSeason, fetchUsersByIds} from '~~/server/data/prismaRepository'
import {fetchDeliveries, fetchDinnerEvents} from '~~/server/data/financesRepository'
import type {EmailMessage} from '~/composables/useNotificationValidation'
import type {HouseholdDetail} from '~/composables/useCoreValidation'
import {useBookingValidation, type DinnerEventDisplay} from '~/composables/useBookingValidation'
import {DinnerStepState, useBooking} from '~/composables/useBooking'
import {useSeason} from '~/composables/useSeason'
import {useDeliveryValidation} from '~/composables/useDeliveryValidation'
import {CHEF_DEADLINE_WORDS, type ChefDeadlineWords} from '~/config/notificationTemplates'
import {DATE_SETTINGS, formatDate, formatDateInTimezone, formatTimeSince} from '~/utils/date'
import {NotificationFactory} from '~~/tests/e2e/testDataFactories/notificationFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {fakeSenderQueue as fakeQueue, sentMessages as sentBodies, type FakeSenderQueue} from '~~/tests/component/utils/sender/fakeSenderQueue'
import {fakeDeliveries} from '~~/tests/component/utils/sender/fakeDeliveries'
import {spyOnLogs} from '~~/tests/component/logSpies'

// The unit runtime has no D1: the lookups answer from the test
vi.mock('~~/server/data/prismaRepository', () => ({
    fetchHouseholdsByIds: vi.fn(), fetchInhabitantsByIds: vi.fn(), fetchSeason: vi.fn(), fetchUsersByIds: vi.fn()
}))
vi.mock('~~/server/data/financesRepository', () => ({fetchDinnerEvents: vi.fn(), fetchDeliveries: vi.fn(), recordDeliveries: vi.fn()}))
// The event reads the app config, and logs through createError, from the Nitro auto-import scope
await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).stubAppConfig())
vi.stubGlobal('createError', createError)

const {Kind, mailKindOf} = NotificationFactory
const {DINNER_EVENT} = useDeliveryValidation().DeliverySubjectSchema.enum
const DinnerState = useBookingValidation().DinnerStateSchema.enum
const {deadlinesForSeason, getCookingDeadlineThresholds} = useSeason()
const {getChefDeadlines, buildChefUrl} = useBooking()

const SEASON_ID = 9
const TEAM_ID = 3
const season = {...SeasonFactory.defaultSeason(), id: SEASON_ID}
const dinnerDate = new Date(2026, 9, 20)
// The deadlines' times read no clock
const deadlines = deadlinesForSeason(season, new Date())
const {warning, critical} = getCookingDeadlineThresholds()
// The clock an hour count from a deadline: the menu's, and the dinner's, which is the groceries'
const menuAt = (hours: number, date: Date = dinnerDate): Date => addHours(deadlines.getMenuDeadlineTime(date), hours)
const dinnerAt = (hours: number): Date => addHours(deadlines.getDinnerStartTime(dinnerDate), hours)

type Member = HouseholdDetail['inhabitants'][number]
const template = HouseholdFactory.defaultHouseholdDetail().inhabitants[0]!
// A person with a name of their own, a login when userId is given
const person = (id: number, householdId: number, userId: number | null): Member => ({...template, id, householdId, userId, name: `Skråner ${id}`})
const chef = person(501, 50, 5010)
const [chefsPartner, chefWithoutOwnLogin] = [person(521, 52, 5210), person(522, 52, null)]
const chefWithoutLoginInTheHousehold = person(531, 53, null)
const householdOf = (members: Member[]): HouseholdDetail =>
    ({...HouseholdFactory.defaultHouseholdDetail(`h${members[0]!.householdId}`), id: members[0]!.householdId, inhabitants: members})
const households = [householdOf([chef]), householdOf([chefsPartner, chefWithoutOwnLogin]), householdOf([chefWithoutLoginInTheHousehold])]
const people = households.flatMap(household => household.inhabitants)
const addressOf = ({id}: Member): string => `${id}@example.com`
const logins = people.filter(member => member.userId)
    .map(member => UserFactory.defaultUserWithInhabitant(`u${member.id}`, {id: member.userId!, email: addressOf(member)}))

// The dinner's deadlines met or open: the menu by its state, the groceries by their cost
const GROCERIES_COST = 10000
const bothOpen = {state: DinnerState.SCHEDULED, heynaboEventId: null, totalCost: 0}
const menuOpen = {...bothOpen, totalCost: GROCERIES_COST}
const groceriesOpen = {state: DinnerState.ANNOUNCED, heynaboEventId: 1, totalCost: 0}
const allMet = {...groceriesOpen, totalCost: GROCERIES_COST}
const dinnerOf = (overrides: Partial<DinnerEventDisplay> = {}): DinnerEventDisplay => ({
    ...DinnerEventFactory.defaultDinnerEventDisplay(), id: 7, date: dinnerDate, seasonId: SEASON_ID, chefId: chef.id, cookingTeamId: TEAM_ID, ...overrides
})

// D1 holds the season's dinners as the case writes them; the season's read carries every one
const store: {dinners: DinnerEventDisplay[]} = {dinners: []}
let recorded: ReturnType<typeof fakeDeliveries>
const logs = spyOnLogs()
beforeEach(() => {
    vi.stubEnv('SHOULD_SEND_BOOKING_EMAILS_FLAG', 'true')
    vi.useFakeTimers({toFake: ['Date']})
    Object.values(logs).forEach(spy => spy.mockImplementation(() => {}))
    recorded = fakeDeliveries()
    store.dinners = [dinnerOf(bothOpen)]
    vi.mocked(fetchSeason).mockImplementation(async (_, id) => id === SEASON_ID ? {...season, dinnerEvents: store.dinners} : null)
    vi.mocked(fetchHouseholdsByIds).mockImplementation(async (_, ids) => households.filter(household => ids.includes(household.id)))
    vi.mocked(fetchInhabitantsByIds).mockImplementation(async (_, ids) => people.filter(inhabitant => ids.includes(inhabitant.id)))
    vi.mocked(fetchUsersByIds).mockImplementation(async (_, ids) => logins.filter(user => ids.includes(user.id)))
})
afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.clearAllMocks()
})

const sentMessages = (queue: FakeSenderQueue): EmailMessage[] => sentBodies<EmailMessage>(queue)

// The DAILY_MAINTENANCE job's run at the moment, its notices in the queue it returns
const runAt = async (moment: Date, seasonId: number | null = SEASON_ID): Promise<FakeSenderQueue> => {
    vi.setSystemTime(moment)
    const queue = fakeQueue()
    await sendChefDeadlines({} as D1Database, NotificationFactory.channel(queue), seasonId)
    return queue
}

// The chef gets one notice per dinner a night at most: the night an alarm turns yellow or red, every night an alarm is
// overdue, none after the dinner date and none while every deadline is met. The delivery records of the runs before
// keep a notice from going twice
describe('the chef deadlines notices of the DAILY_MAINTENANCE job', () => {
    it.each([
        {deadlines: 'the menu open, the groceries ordered', dinner: menuOpen, runs: [
            {clock: 'outside the menu\'s warning hours', at: menuAt(-(warning + 1)), notices: 0},
            {clock: 'inside the menu\'s warning hours', at: menuAt(-(warning - 1)), notices: 1},
            {clock: 'inside the menu\'s warning hours a night later', at: addDays(menuAt(-(warning - 1)), 1), notices: 0},
            {clock: 'inside the menu\'s critical hours', at: menuAt(-(critical - 1)), notices: 1},
            {clock: 'inside the menu\'s critical hours, run again that night', at: menuAt(-(critical - 2)), notices: 0},
            {clock: 'past the menu deadline', at: menuAt(1), notices: 1},
            {clock: 'past the menu deadline, run again that night', at: menuAt(2), notices: 0},
            {clock: 'past the menu deadline a night later', at: addDays(menuAt(1), 1), notices: 1},
            {clock: 'the day after the dinner', at: dinnerAt(24), notices: 0}
        ]},
        {deadlines: 'the groceries open, the menu published', dinner: groceriesOpen, runs: [
            {clock: 'outside the groceries\' warning hours', at: dinnerAt(-(warning + 1)), notices: 0},
            {clock: 'inside the groceries\' warning hours', at: dinnerAt(-(warning - 1)), notices: 1},
            {clock: 'inside the groceries\' warning hours a night later', at: addDays(dinnerAt(-(warning - 1)), 1), notices: 0},
            {clock: 'inside the groceries\' critical hours', at: dinnerAt(-(critical - 1)), notices: 1},
            {clock: 'inside the groceries\' critical hours, run again that night', at: dinnerAt(-(critical - 2)), notices: 0},
            {clock: 'the day after the dinner', at: dinnerAt(24), notices: 0}
        ]},
        {deadlines: 'every deadline met', dinner: allMet, runs: [
            {clock: 'inside the menu\'s warning hours', at: menuAt(-(warning - 1)), notices: 0},
            {clock: 'inside the groceries\' critical hours', at: dinnerAt(-(critical - 1)), notices: 0}
        ]}
    ])('GIVEN a dinner with $deadlines WHEN the job runs at each clock THEN the chef gets a notice on the runs that tell something new', async ({dinner, runs}) => {
        store.dinners = [dinnerOf(dinner)]
        const notices: {clock: string, notices: number}[] = []

        for (const {clock, at} of runs) notices.push({clock, notices: sentMessages(await runAt(at)).length})

        expect(notices).toEqual(runs.map(({clock, notices}) => ({clock, notices})))
    })

    // A deadline reads check once met; a missing one its deadline, the countdown the chef page shows while the deadline
    // is ahead or the time since it once overdue, and the line of its own alarm level, the menu before the groceries
    describe('the deadlines a notice lists', () => {
        type Level = 'met' | 'green' | 'yellow' | 'red' | 'overdue'
        const at = (moment: Date): string => formatDateInTimezone(moment, DATE_SETTINGS.DATE_AT_TIME_MASK)
        const booking = at(deadlines.getBookingDeadlineTime(dinnerDate))
        const {today, tomorrow} = CHEF_DEADLINE_WORDS.deadlineDay
        // A deadline's lines at its level at the moment, the countdown as the chef page shows it while the deadline is
        // ahead and the time since the deadline once overdue; the red rows below run on the evening before their
        // deadline's day
        const linesOf = (words: ChefDeadlineWords, due: Date, level: Level, countdown: string, now: Date): string => {
            const times = {deadline: at(due), booking, day: tomorrow}
            if (level === 'met') return CHEF_DEADLINE_WORDS.met(words.title)
            const missing = CHEF_DEADLINE_WORDS.missing(words.title, times.deadline, level === 'overdue' ? formatTimeSince(due, now) : countdown)
            const line = level === 'green' ? undefined : words[level]
            return line ? `${missing}\n${CHEF_DEADLINE_WORDS.alarm(line(times))}` : missing
        }

        it.each<{deadlines: string, now: Date, dinner: Partial<DinnerEventDisplay>, menu: Level, groceries: Level}>([
            {deadlines: 'the menu inside its warning hours, the groceries outside theirs', now: menuAt(-(warning - 1)), dinner: bothOpen, menu: 'yellow', groceries: 'green'},
            {deadlines: 'the menu inside its critical hours, the groceries ordered', now: menuAt(-(critical - 1)), dinner: menuOpen, menu: 'red', groceries: 'met'},
            {deadlines: 'the menu past its deadline, the groceries inside their critical hours', now: dinnerAt(-(critical - 1)), dinner: bothOpen, menu: 'overdue', groceries: 'red'},
            {deadlines: 'the menu published, the groceries inside their warning hours', now: dinnerAt(-(warning - 1)), dinner: groceriesOpen, menu: 'met', groceries: 'yellow'}
        ])('GIVEN $deadlines WHEN the notice goes THEN the menu reads $menu and the groceries $groceries', async ({now, dinner, menu, groceries}) => {
            store.dinners = [dinnerOf(dinner)]
            const [menuDeadline, groceriesDeadline] = getChefDeadlines(dinnerOf(dinner), deadlines, now)

            const [message] = sentMessages(await runAt(now))

            expect(menuDeadline!.step).toBe(DinnerStepState.ANNOUNCED)
            expect(message!.text).toContain([
                linesOf(CHEF_DEADLINE_WORDS.ANNOUNCED, deadlines.getMenuDeadlineTime(dinnerDate), menu, menuDeadline!.description, now),
                linesOf(CHEF_DEADLINE_WORDS.GROCERIES_DONE, deadlines.getDinnerStartTime(dinnerDate), groceries, groceriesDeadline!.description, now)
            ].join('\n\n'))
        })

        // A red alarm starts 24 hours before its deadline: its line names the deadline's day as the chef reads it on the
        // run's day in Copenhagen
        it.each([
            {deadline: 'the menu', clock: 'on the evening before its deadline\'s day', now: menuAt(-(critical - 1)), dinner: menuOpen, day: tomorrow, other: today},
            {deadline: 'the menu', clock: 'on its deadline\'s day', now: menuAt(-1), dinner: menuOpen, day: today, other: tomorrow},
            {deadline: 'the groceries', clock: 'on the evening before the dinner', now: dinnerAt(-(critical - 1)), dinner: groceriesOpen, day: tomorrow, other: today},
            {deadline: 'the groceries', clock: 'on the dinner\'s day', now: dinnerAt(-1), dinner: groceriesOpen, day: today, other: tomorrow}
        ])('GIVEN $deadline inside its critical hours $clock WHEN the notice goes THEN its red line names the deadline\'s day: $day', async ({now, dinner, day, other}) => {
            store.dinners = [dinnerOf(dinner)]

            const [message] = sentMessages(await runAt(now))

            const alarmLines = message!.text.split('\n').filter(line => line.startsWith(CHEF_DEADLINE_WORDS.alarm('')))
            expect(alarmLines).toEqual([expect.stringContaining(` ${day}`)])
            expect(alarmLines[0]).not.toContain(` ${other}`)
        })
    })

    it('GIVEN a dinner of a team with a missing deadline WHEN the notice goes THEN the chef deadlines notice names the dinner by its date, links the team\'s dinner on the chef page and is recorded on the dinner', async () => {
        const [message] = sentMessages(await runAt(menuAt(-(warning - 1))))

        expect(message!.subject).toContain(formatDate(dinnerDate))
        expect(message!.text).toContain(buildChefUrl(siteUrl(NotificationFactory.config(), ''), TEAM_ID, dinnerDate))
        expect(recorded.rows.map(row => ({kind: mailKindOf(row.reference), subjectType: row.subjectType, subjectId: row.subjectId})))
            .toEqual([{kind: Kind.CHEF_DINNER_DEADLINES, subjectType: DINNER_EVENT, subjectId: 7}])
    })

    // The notice goes to the chef's closest user (findClosestUserInHousehold): the chef's own user, else the first user of
    // the chef's household
    it.each([
        {chef: 'a chef with a user', chefId: chef.id, to: [addressOf(chef)]},
        {chef: 'a chef without a user, in a household with one', chefId: chefWithoutOwnLogin.id, to: [addressOf(chefsPartner)]},
        {chef: 'a chef in a household without a user', chefId: chefWithoutLoginInTheHousehold.id, to: []}
    ])('GIVEN $chef WHEN a dinner\'s deadline turns yellow THEN the notice goes to the chef\'s closest user', async ({chefId, to}) => {
        store.dinners = [dinnerOf({...bothOpen, chefId})]

        expect(sentMessages(await runAt(menuAt(-(warning - 1)))).map(message => message.to)).toEqual(to)
    })

    it.each([
        {dinner: 'without a chef', overrides: {chefId: null}},
        {dinner: 'cancelled', overrides: {state: DinnerState.CANCELLED}}
    ])('GIVEN a dinner $dinner with a missing deadline WHEN the job runs THEN no notice goes', async ({overrides}) => {
        store.dinners = [dinnerOf({...bothOpen, ...overrides})]

        expect(sentMessages(await runAt(menuAt(-(warning - 1))))).toEqual([])
    })

    // Three dinners past their menu deadline, two cooked by one chef: one read of each kind serves the notices, and the
    // dinners come with the season
    it('GIVEN three dinners with missing deadlines WHEN the job runs THEN it reads the season with its dinners, the chefs and their delivery records once', async () => {
        store.dinners = [0, 1, 2].map(day => dinnerOf({...bothOpen, id: 7 + day, date: addDays(dinnerDate, day), chefId: day < 2 ? chef.id : chefWithoutOwnLogin.id}))
        const reads = {fetchSeason, fetchDinnerEvents, fetchInhabitantsByIds, fetchHouseholdsByIds, fetchUsersByIds, fetchDeliveries}

        const queue = await runAt(menuAt(1, addDays(dinnerDate, 2)))

        expect(sentMessages(queue)).toHaveLength(3)
        expect(Object.fromEntries(Object.entries(reads).map(([name, read]) => [name, vi.mocked(read).mock.calls.length]))).toEqual({
            fetchSeason: 1, fetchDinnerEvents: 0, fetchInhabitantsByIds: 1, fetchHouseholdsByIds: 1, fetchUsersByIds: 1, fetchDeliveries: 1
        })
    })

    // With the booking emails flag off the sender event loads nothing; without an active season no dinner has a chef to
    // tell. The dinners come with the season
    it.each([
        {given: 'the booking emails flag off', flag: 'false', seasonId: SEASON_ID},
        {given: 'no active season', flag: 'true', seasonId: null}
    ])('GIVEN $given WHEN the job runs THEN it reads no dinner, and nothing is sent or recorded', async ({flag, seasonId}) => {
        vi.stubEnv('SHOULD_SEND_BOOKING_EMAILS_FLAG', flag)

        const queue = await runAt(menuAt(-(warning - 1)), seasonId)

        expect(fetchSeason).not.toHaveBeenCalled()
        expect(sentMessages(queue)).toEqual([])
        expect(recorded.rows).toEqual([])
    })
})
