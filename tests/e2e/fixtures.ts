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
import type {HouseholdDetail, InhabitantDetail, UserDetail} from '~/composables/useCoreValidation'
import {useBookingValidation, type DailyMaintenanceResult, type DinnerEventDisplay} from '~/composables/useBookingValidation'
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

type JobTypes = typeof JobType

/**
 * The actors of the features: the admin (SystemRoleSchema ADMIN) and the user (a User) log in, a visitor has no
 * session; the inhabitant, the seller, the first in line and the chef are inhabitants by their part in a dinner, the
 * user's inhabitant the inhabitant of the signed-in user (Inhabitant.userId)
 */
export const ACTOR = {
    ADMIN: 'the admin',
    USER: 'the user',
    VISITOR: 'the visitor',
    INHABITANT: 'the inhabitant',
    SELLER: 'the seller',
    FIRST_IN_LINE: 'the first in line',
    CHEF: 'the chef',
    USERS_INHABITANT: 'the user\'s inhabitant'
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

/** What the steps of one scenario hand each other */
export type Scene = {
    /** The browser context of the actor a GIVEN signed in */
    context?: BrowserContext
    /** The actor who signed in */
    actor?: Actor
    /** The page a UI step opened in the actor's context */
    page?: Page
    activeSeason?: Season
    health?: {worker: string, report: HealthReport}
    /** The last job a step ran, and every run of the scenario in order */
    jobRun?: JobRun
    jobRuns: JobRun[]
    /** The user a sign-in answered */
    signedInUser?: UserDetail
    /** The dinner a GIVEN placed, with its season */
    dinner?: {season: Season, event: DinnerEventDisplay}
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
    /** The rows the scenario created, removed after it */
    created: {householdIds: number[], userIds: number[], dinnerEventIds: number[], seasonIds: number[]}
}

const emptyScene = (): Scene => ({
    jobRuns: [], people: {}, waiting: [], households: {}, places: [], billedHouseholds: [],
    created: {householdIds: [], userIds: [], dinnerEventIds: [], seasonIds: []}
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

/** A household of the scenario, removed after it */
export const createSceneHousehold = async (
    admin: BrowserContext,
    scene: Scene,
    partial: Parameters<typeof HouseholdFactory.createHousehold>[1] = {}
): Promise<HouseholdDetail> => {
    const household = await HouseholdFactory.createHousehold(admin, partial)
    scene.created.householdIds.push(household.id)
    return household
}

/** A person of a scenario household, its part in `lastName`, with a login when `withLogin`: the login outlives the person and is removed after the scenario */
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

/** The active season a scenario books in: the one a GIVEN activated, else the e2e singleton */
export const activeSeasonOf = async (admin: BrowserContext, scene: Scene): Promise<Season> => {
    scene.activeSeason ??= await SeasonFactory.createActiveSeason(admin)
    return scene.activeSeason
}

/** The id of the season's ADULT ticket price: the factory persons are adults */
export const adultPriceIdOf = async (admin: BrowserContext, seasonId: number): Promise<number> => {
    const {ticketPrices} = await SeasonFactory.getSeason(admin, seasonId)
    const priceId = ticketPrices.find(price => price.ticketType === TicketTypeSchema.enum.ADULT)?.id
    if (priceId === undefined) throw new Error(`Season ${seasonId} has no ${TicketTypeSchema.enum.ADULT} ticket price`)
    return priceId
}

/**
 * The scenario's dinner, consumed 35 days back in the active season: the last billing cutoff lies at most 31 days back,
 * so the dinner's billing period is closed whatever the day of the run
 */
export const createDinnerInThePastMonth = async (admin: BrowserContext, scene: Scene): Promise<DinnerEventDisplay> => {
    const season = await activeSeasonOf(admin, scene)
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

/**
 * Puts back the member's settings and removes the rows the scenario created; every step is tried, and the steps that
 * fail fail the scenario
 */
const cleanUpScene = async (browser: Browser, {memberSettings, created}: Scene): Promise<void> => {
    if (!memberSettings && Object.values(created).every(ids => ids.length === 0)) return
    const admin = await validatedBrowserContext(browser)
    const failures: unknown[] = []
    const attempt = async (cleanUp: () => Promise<unknown>) => {
        try {
            await cleanUp()
        } catch (error) {
            failures.push(error)
        }
    }
    if (memberSettings) {
        const {userId, phone, ...preferences} = memberSettings
        await attempt(() => UserFactory.setPhone(admin, userId, phone))
        // The preference write changes the session user alone
        await attempt(async () => {
            const member = await memberValidatedBrowserContext(browser)
            try {
                await UserFactory.updateMyPreferences(member, preferences)
            } finally {
                await member.close()
            }
        })
    }
    // The households take their people, orders and places; the users outlive their people; a season takes its dinners
    await attempt(() => HouseholdFactory.deleteHousehold(admin, created.householdIds))
    await attempt(() => UserFactory.cleanupUsers(admin, created.userIds))
    await attempt(() => Promise.all(created.dinnerEventIds.map(id => DinnerEventFactory.deleteDinnerEvent(admin, id))))
    await attempt(() => SeasonFactory.cleanupSeasons(admin, created.seasonIds))
    await admin.close()
    if (failures.length > 0) throw new AggregateError(failures, 'The scenario\'s cleanup failed')
}

/**
 * playwright-bdd's `test` with the UI specs' API error guard (`uiTest.ts`): the pages of a scenario fail it on a 4xx or
 * 5xx from `/api/` it did not declare; the factories' requests are not recorded
 */
export const test = mergeTests(base, uiTest).extend<{adminContext: BrowserContext, contextOf: (actor: Actor) => Promise<BrowserContext>, scene: Scene}>({
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
    scene: async ({browser}, use) => {
        const scene = emptyScene()
        await use(scene)
        await cleanUpScene(browser, scene)
    }
})

export const {Given, When, Then, BeforeAll} = createBdd(test)

// The singleton active season (`activeSeasonOf`), resolved in each feature's beforeAll as `season.setup.ts` and the
// specs' beforeAll do: a run without setup-season (--no-deps) creates it there, outside a scenario's own timeout
BeforeAll({tags: 'not @smoke'}, async ({browser}) => {
    const admin = await validatedBrowserContext(browser)
    await SeasonFactory.createActiveSeason(admin)
    await admin.close()
})
