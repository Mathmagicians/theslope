import {mergeTests, type Browser, type BrowserContext, type Page} from '@playwright/test'
import {test as base, createBdd, defineParameterType} from 'playwright-bdd'
import {test as uiTest} from '~~/tests/e2e/uiTest'
import testHelpers from '~~/tests/e2e/testHelpers'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import type {Season} from '~/composables/useSeasonValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {HouseholdDetail, InhabitantDetail, UserDetail} from '~/composables/useCoreValidation'
import type {CookingTeamDetail} from '~/composables/useCookingTeamValidation'
import {useBookingValidation, type DailyMaintenanceResult, type DinnerEventDisplay} from '~/composables/useBookingValidation'
import {useTicket} from '~/composables/useTicket'
import type {HeynaboImportResponse} from '~/composables/useHeynaboValidation'
import type {BillingPeriodSummaryDetail, MonthlyBillingResponse} from '~/composables/useBillingValidation'
import {useMaintenanceValidation} from '~/composables/useMaintenanceValidation'
import type {Appearance, NotificationChannel} from '~/composables/useUserPreferenceValidation'
import type {DeliveryDryRun} from '~/composables/useDeliveryValidation'
import type {SenderEmitResult} from '~/composables/useNotificationValidation'
import type {HealthReport} from '~~/workers/common/health'

const {validatedBrowserContext, memberValidatedBrowserContext, openContext} = testHelpers
const {JobType} = useMaintenanceValidation()
const {DinnerStateSchema, TicketTypeSchema} = useBookingValidation()
const {findTicketPriceByType} = useTicket()

type JobTypes = typeof JobType

/**
 * The actors of the features: the admin (SystemRoleSchema ADMIN) and the user (a User) log in, a visitor has no
 * session; the inhabitant, the seller, the first in line and the chef are inhabitants by their part in a dinner, the
 * user's inhabitant the inhabitant of the signed-in user (Inhabitant.userId); the baby who tastes and the hungry baby
 * are babies of the user's household, on the BABY ticket of 0 portions and on the BABY ticket of a share
 */
export const ACTOR = {
    ADMIN: 'the admin',
    USER: 'the user',
    VISITOR: 'the visitor',
    INHABITANT: 'the inhabitant',
    SELLER: 'the seller',
    FIRST_IN_LINE: 'the first in line',
    CHEF: 'the chef',
    USERS_INHABITANT: 'the user\'s inhabitant',
    BABY_WHO_TASTES: 'the baby who tastes',
    HUNGRY_BABY: 'the hungry baby'
} as const
export type Actor = typeof ACTOR[keyof typeof ACTOR]

defineParameterType({name: 'actor', regexp: Object.values(ACTOR)})

/** The requests whose answer a THEN reads, by their words in a feature */
export const REQUEST = {SAVE: 'save', RESEND: 're-send', READ: 'read', TEST_MESSAGE: 'test message'} as const
export type Request = typeof REQUEST[keyof typeof REQUEST]

/** The households a dinner's people live in, by their part: the waiting household's first user hears about its people */
export const HOUSEHOLD = {WAITING: 'waiting', SELLING: 'selling', WITHOUT_USER: 'without a user'} as const
export type HouseholdKind = typeof HOUSEHOLD[keyof typeof HOUSEHOLD]

/** A job a WHEN ran, with the result its endpoint answered */
export type JobRun =
    | {job: JobTypes['HEYNABO_IMPORT'], result: HeynaboImportResponse}
    | {job: JobTypes['DAILY_MAINTENANCE'], result: DailyMaintenanceResult}
    | {job: JobTypes['MONTHLY_BILLING'], result: MonthlyBillingResponse | null}

/** The rows a feature's scenarios created in one worker; the inhabitants are the people they added to the user's household */
type CreatedRows = {inhabitantIds: number[], householdIds: number[], userIds: number[], dinnerEventIds: number[], teamIds: number[], seasonIds: number[]}

const noRows = (): CreatedRows => ({inhabitantIds: [], householdIds: [], userIds: [], dinnerEventIds: [], teamIds: [], seasonIds: []})

/** What the steps of one scenario hand each other */
export type Scene = {
    /** The browser context of the actor a GIVEN signed in */
    context?: BrowserContext
    /** The actor who signed in */
    actor?: Actor
    /** The page a UI step opened in the actor's context */
    page?: Page
    /** The Vue hydration warnings the page logged while it opened */
    hydrationWarnings?: string[]
    /** The active season the Background names: the singleton, or the season of its own the dinner step activates */
    activeSeason?: Season
    /** Whether the season the dinner step builds around the dinner's day is activated, as the Background states it */
    ownSeasonIsActive?: boolean
    health?: {worker: string, report: HealthReport}
    /** The last job a step ran, and every run of the scenario in order */
    jobRun?: JobRun
    jobRuns: JobRun[]
    /** The user a sign-in answered */
    signedInUser?: UserDetail
    /** The dinner a GIVEN placed, with its season */
    dinner?: {season: Season, event: DinnerEventDisplay}
    /** The teams a GIVEN created, by their number in a feature: team n at index n - 1 */
    teams: CookingTeamDetail[]
    /** The dinner a GIVEN placed for each team, at the index of its team in `teams` */
    teamDinners: DinnerEventDisplay[]
    /** The people of the dinner by their part; the waiting list's people in queue order */
    people: Partial<Record<Actor, InhabitantDetail>>
    waiting: InhabitantDetail[]
    households: Partial<Record<HouseholdKind, HouseholdDetail>>
    /** The places on the dinner's waiting list the scenario saw: a place a sale removes keeps its delivery records */
    places: number[]
    /** The households with unbilled orders in the past month, and the billing period that bills them */
    billedHouseholds: HouseholdDetail[]
    period?: number
    /** The answer to a request a THEN reads: the save, the re-send, the read, the test message; a read keeps its body */
    answer?: {request: Request, status: number, body?: unknown}
    testMessage?: SenderEmitResult
    dryRun?: DeliveryDryRun
    /** The billing period the accountant link opened */
    publicPeriod?: BillingPeriodSummaryDetail
    /** The page's root text size and palette before a UI save */
    before?: {textSize: number, palette: string | null}
    /** The member's settings as the scenario found them, put back after it */
    memberSettings?: {userId: number, notificationChannels: NotificationChannel[], appearance: Appearance, phone: string | null}
    /** Where the scenario records the rows it creates: the worker's rows, removed when the worker ends (AfterAll) */
    created: CreatedRows
}

const emptyScene = (created: CreatedRows): Scene => ({
    jobRuns: [], people: {}, waiting: [], teams: [], teamDinners: [], households: {}, places: [], billedHouseholds: [],
    created
})

/** The value an earlier step of the scenario put in the scene */
export const fromScene = <K extends keyof Scene>(scene: Scene, key: K): NonNullable<Scene[K]> => {
    const value = scene[key]
    if (value === undefined) throw new Error(`The scene holds no ${key}: a step before this one sets it`)
    return value as NonNullable<Scene[K]>
}

/** The context of the actor who signed in: a step naming another actor misreads the scenario */
export const contextOfActor = (scene: Scene, actor: Actor): BrowserContext => {
    if (scene.actor !== actor) throw new Error(`${actor} acts, but ${scene.actor ?? 'nobody'} signed in`)
    return fromScene(scene, 'context')
}

/** The person an earlier step placed in the actor's part */
export const personOf = (scene: Scene, actor: Actor): InhabitantDetail => {
    const person = scene.people[actor]
    if (!person) throw new Error(`The scene holds no ${actor}: a step before this one places ${actor}`)
    return person
}

/** The team by its number in a feature, counted from 1 */
export const teamOf = (scene: Scene, number: number): CookingTeamDetail => {
    const team = scene.teams[number - 1]
    if (!team) throw new Error(`The scene holds no team ${number}: a GIVEN creates the teams`)
    return team
}

/** A household of the scenario, removed when the worker ends */
export const createSceneHousehold = async (
    admin: BrowserContext,
    scene: Scene,
    partial: Parameters<typeof HouseholdFactory.createHousehold>[1] = {}
): Promise<HouseholdDetail> => {
    const household = await HouseholdFactory.createHousehold(admin, partial)
    scene.created.householdIds.push(household.id)
    return household
}

/** A person of a scenario household, its part in `lastName`, with a login when `withLogin`: the login outlives the person and is removed when the worker ends */
export const createScenePerson = async (
    admin: BrowserContext,
    scene: Scene,
    householdId: number,
    lastName: string,
    withLogin = false
): Promise<InhabitantDetail> => {
    const person = await HouseholdFactory.createPersonInHousehold(admin, householdId, lastName, withLogin ? UserFactory.defaultUser() : undefined)
    if (person.userId) scene.created.userIds.push(person.userId)
    return person
}

/** The season's ticket price of an actor's part: a BABY ticket of 0 portions, a BABY ticket of a share, else ADULT (the factory persons are adults) */
const ticketPriceOf = (ticketPrices: TicketPrice[], actor: Actor): TicketPrice | undefined => {
    switch (actor) {
        case ACTOR.BABY_WHO_TASTES:
            return ticketPrices.find(({ticketType, portions}) => ticketType === TicketTypeSchema.enum.BABY && portions === 0)
        case ACTOR.HUNGRY_BABY:
            return ticketPrices.find(({ticketType, portions}) => ticketType === TicketTypeSchema.enum.BABY && portions > 0)
        default:
            return findTicketPriceByType(TicketTypeSchema.enum.ADULT, ticketPrices)
    }
}

/** The id of the season's ticket price of an actor's part, the inhabitant's (ADULT) when no part is named */
export const ticketPriceIdOf = async (admin: BrowserContext, seasonId: number, actor: Actor = ACTOR.INHABITANT): Promise<number> => {
    const {ticketPrices} = await SeasonFactory.getSeason(admin, seasonId)
    const priceId = ticketPriceOf(ticketPrices, actor)?.id
    if (priceId === undefined) throw new Error(`Season ${seasonId} has no ticket price for ${actor}`)
    return priceId
}

/**
 * The scenario's dinner, consumed 35 days back in the active season: the last billing cutoff lies at most 31 days back,
 * so the dinner's billing period is closed whatever the day of the run
 */
export const createDinnerInThePastMonth = async (admin: BrowserContext, scene: Scene): Promise<DinnerEventDisplay> => {
    const season = fromScene(scene, 'activeSeason')
    const event = await DinnerEventFactory.createDinnerEventInState(admin, season.id!, DinnerStateSchema.enum.CONSUMED, -35)
    scene.created.dinnerEventIds.push(event.id)
    scene.dinner = {season, event}
    return event
}

/**
 * The billing period that bills the scenario's households: the period of a monthly run that holds their invoices; a
 * scenario that ran no monthly billing runs it here
 */
export const periodOf = async (admin: BrowserContext, scene: Scene): Promise<number> => {
    if (scene.period) return scene.period
    const [billed] = scene.billedHouseholds
    if (!billed) throw new Error('The scene holds no billed households: a GIVEN of unbilled orders sets them')
    if (!scene.jobRuns.some(run => run.job === JobType.MONTHLY_BILLING)) {
        scene.jobRuns.push({job: JobType.MONTHLY_BILLING, result: await BillingFactory.generateBilling(admin)})
    }
    const periodIds = scene.jobRuns.flatMap(run => run.job === JobType.MONTHLY_BILLING ? run.result?.results.map(result => result.billingPeriodSummaryId) ?? [] : [])
    for (const id of periodIds) {
        const {invoices} = await BillingFactory.getBillingPeriodById(admin, id)
        if (invoices.some(invoice => invoice.householdId === billed.id)) {
            scene.period = id
            return id
        }
    }
    throw new Error(`No monthly run of the scenario billed household ${billed.id}`)
}

/** Runs every cleanup step; the steps that fail fail the hook */
const attemptAll = async (what: string, steps: (() => Promise<unknown>)[]): Promise<void> => {
    const failures: unknown[] = []
    for (const step of steps) {
        try {
            await step()
        } catch (error) {
            failures.push(error)
        }
    }
    if (failures.length > 0) throw new AggregateError(failures, `${what} failed`)
}

/** Puts back the member's settings the scenario changed: the next scenario reads them */
const putBackMemberSettings = async (browser: Browser, {memberSettings}: Scene): Promise<void> => {
    if (!memberSettings) return
    const {userId, phone, ...preferences} = memberSettings
    const admin = await validatedBrowserContext(browser)
    await attemptAll('Putting back the member\'s settings', [
        () => UserFactory.setPhone(admin, userId, phone),
        // The preference write changes the session user alone
        async () => {
            const member = await memberValidatedBrowserContext(browser)
            try {
                await UserFactory.updateMyPreferences(member, preferences)
            } finally {
                await member.close()
            }
        }
    ]).finally(() => admin.close())
}

/** Removes the rows the feature's scenarios created in the worker, and empties the record for the worker's next feature */
const deleteCreatedRows = async (browser: Browser, created: CreatedRows, baseURL?: string): Promise<void> => {
    if (Object.values(created).every(ids => ids.length === 0)) return
    const admin = await validatedBrowserContext(browser, baseURL)
    const {inhabitantIds, householdIds, userIds, dinnerEventIds, teamIds, seasonIds} = created
    Object.assign(created, noRows())
    // An inhabitant and a household take their orders and places; the users outlive their people; a team leaves its
    // dinners, so they go first; a season takes its dinners
    await attemptAll('The feature\'s cleanup', [
        () => Promise.all(inhabitantIds.map(id => HouseholdFactory.deleteInhabitant(admin, id))),
        () => HouseholdFactory.deleteHousehold(admin, householdIds),
        () => UserFactory.cleanupUsers(admin, userIds),
        () => Promise.all(dinnerEventIds.map(id => DinnerEventFactory.deleteDinnerEvent(admin, id))),
        () => Promise.all(teamIds.map(id => SeasonFactory.deleteCookingTeam(admin, id))),
        () => SeasonFactory.cleanupSeasons(admin, seasonIds)
    ]).finally(() => admin.close())
}

/**
 * playwright-bdd's `test` with the UI specs' API error guard (`uiTest.ts`): the pages of a scenario fail it on a 4xx or
 * 5xx from `/api/` it did not declare; the factories' requests are not recorded
 */
export const test = mergeTests(base, uiTest).extend<{adminContext: BrowserContext, contextOf: (actor: Actor) => Promise<BrowserContext>, scene: Scene}, {createdRows: CreatedRows}>({
    adminContext: async ({browser}, use) => {
        const context = await validatedBrowserContext(browser)
        await use(context)
        await context.close()
    },
    // Opens an actor's context on first use: a scenario of the admin alone needs no member login, which the smoke
    // project does not set up
    contextOf: async ({browser, adminContext}, use) => {
        const opened = new Map<Actor, BrowserContext>()
        const open = (actor: Actor): Promise<BrowserContext> => {
            switch (actor) {
                case ACTOR.USER:
                    return memberValidatedBrowserContext(browser)
                case ACTOR.VISITOR:
                    return openContext(browser)
                default:
                    throw new Error(`${actor} has no session: the admin and the user log in, a visitor has none`)
            }
        }
        await use(async (actor) => {
            if (actor === ACTOR.ADMIN) return adminContext
            const context = opened.get(actor) ?? await open(actor)
            opened.set(actor, context)
            return context
        })
        for (const context of opened.values()) await context.close()
    },
    // The worker's record of the rows its scenarios create, removed by the AfterAll when the worker ends: a delete while
    // a parallel scenario's request is in flight fails that request
    createdRows: [
        // Playwright reads a fixture's dependencies from its first parameter's destructuring; the record has none
        // eslint-disable-next-line no-empty-pattern
        async ({}, use) => {
            await use(noRows())
        },
        {scope: 'worker'}
    ],
    scene: async ({browser, createdRows}, use) => {
        const scene = emptyScene(createdRows)
        await use(scene)
        await putBackMemberSettings(browser, scene)
    }
})

export const {Given, When, Then, BeforeAll, AfterAll} = createBdd(test)

// The singleton active season (`a season is active`), resolved in each feature's beforeAll as `season.setup.ts` and the
// specs' beforeAll do: a run without setup-season (--no-deps) creates it there, outside a scenario's own timeout
BeforeAll({tags: 'not @smoke'}, async ({browser}) => {
    const admin = await validatedBrowserContext(browser)
    await SeasonFactory.createActiveSeason(admin)
    await admin.close()
})

// The guaranteed cleanup of the worker's rows, as the specs' afterAll: playwright-bdd runs the AfterAll hooks once, in
// the worker's teardown, where no test runs (`test.info()` throws) and a new context lacks the project's options
AfterAll(async ({browser, createdRows, $workerInfo}) => {
    await deleteCreatedRows(browser, createdRows, $workerInfo.project.use.baseURL)
})
