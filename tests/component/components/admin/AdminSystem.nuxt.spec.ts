// @vitest-environment nuxt
import {describe, it, expect, vi, beforeAll, beforeEach, afterEach} from 'vitest'
import {mockNuxtImport, registerEndpoint} from '@nuxt/test-utils/runtime'
import {DOMWrapper, enableAutoUnmount} from '@vue/test-utils'
import {shallowReactive} from 'vue'
import {createError, getQuery, type H3Event} from 'h3'
import {addDays} from 'date-fns'
import {mountWithTooltipProvider, findByTestId, findAllByTestId, iconNamesIn, resetStores, registerEmptyStoreEndpoints, untilTrue, findLoadingRow, tableHeaders, cellsByHeader, VIEWPORTS} from '~~/tests/component/testHelpers'
import AdminSystem from '~/components/admin/AdminSystem.vue'
import {ICONS, IMG} from '~/composables/useTheSlopeDesignSystem'
import {formatJobStat} from '~/composables/useMaintenance'
import {NOTIFICATION_COUNT_WORDS} from '~/config/notificationTemplates'
import {MAINTENANCE_WORDS} from '~/config/maintenanceWords'
import {DATE_SETTINGS, formatDate} from '~/utils/date'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {useMaintenanceValidation, type JobRunDisplay} from '~/composables/useMaintenanceValidation'

// The households load for a logged-in user: the session comes from a cookie the test runtime lacks
const {session, useUserSession} = await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).mockSession())
mockNuxtImport('useUserSession', () => useUserSession)

const {JobType, JobStatus, JobTypeSchema} = useMaintenanceValidation()
type Job = JobRunDisplay['jobType']

let maintenance: ReturnType<typeof useMaintenance>
beforeAll(() => {
    maintenance = useMaintenance()
})

// Only HTTP is faked (testing.md Rule 6)
registerEmptyStoreEndpoints()
const householdReads = vi.fn(() => [])
registerEndpoint('/api/admin/household', householdReads)

// The job runs D1 holds: the list answers a read without a jobType, a job's latest run a read with one
const jobRuns: {list: JobRunDisplay[], latest: Partial<Record<Job, JobRunDisplay>>} = {list: [], latest: {}}
// The reads by jobType, the list's as null; a held read answers once its jobType leaves the set
const jobRunReads: (Job | null)[] = []
const heldReads = shallowReactive(new Set<Job | null>())
registerEndpoint('/api/admin/maintenance/job-run', async (event: H3Event) => {
    const jobType = JobTypeSchema.optional().parse(getQuery(event).jobType) ?? null
    jobRunReads.push(jobType)
    await untilTrue(() => !heldReads.has(jobType))
    if (jobType === null) return jobRuns.list
    const latest = jobRuns.latest[jobType]
    return latest ? [latest] : []
})

// What each box job's run reports, stored as the run's resultSummary and answered by its button run; the mark its
// header wears at rest: Heynabo's logo on the import, the job's icon on the others
const heynaboSummary = HouseholdFactory.defaultHeynaboImportResponse()
const dailySummary = OrderFactory.defaultDailyMaintenanceResult()
const monthlySummary = {results: [], periods: [BillingFactory.defaultPeriodSideEffects()], jobRunId: 1}
const BOX_JOBS = [
    {jobType: JobType.HEYNABO_IMPORT, runUrl: '/api/admin/heynabo/import', summary: heynaboSummary,
        stats: () => maintenance.formatHeynaboStats(heynaboSummary), reloadsHouseholds: true,
        mark: 'the Heynabo logo', logo: IMG.heynabo, icons: []},
    {jobType: JobType.DAILY_MAINTENANCE, runUrl: '/api/admin/maintenance/daily', summary: dailySummary,
        stats: () => maintenance.formatDailyMaintenanceStats(dailySummary), reloadsHouseholds: false,
        mark: 'its icon', logo: null, icons: [ICONS.clipboard]},
    {jobType: JobType.MONTHLY_BILLING, runUrl: '/api/admin/maintenance/monthly', summary: monthlySummary,
        stats: () => maintenance.formatMonthlyBillingStats(monthlySummary), reloadsHouseholds: false,
        mark: 'its icon', logo: null, icons: [ICONS.ticket]}
]

// A button run answers its job's summary, or a server error while `fails` holds; a held run answers once its url leaves the set
const buttonRun = {fails: false}
const heldRuns = shallowReactive(new Set<string>())
for (const {runUrl, summary} of BOX_JOBS) {
    registerEndpoint(runUrl, async () => {
        await untilTrue(() => !heldRuns.has(runUrl))
        if (buttonRun.fails) throw createError({statusCode: 500, statusMessage: 'D1 down'})
        return summary
    })
}

const jobRun = SeasonFactory.defaultJobRun({
    id: 7,
    jobType: JobType.MONTHLY_BILLING,
    resultSummary: JSON.stringify(monthlySummary)
})

// The next test's resetStores drops the datasets a still-mounted table reads
enableAutoUnmount(afterEach)

beforeEach(() => {
    resetStores()
    session.user.value = UserFactory.defaultUserWithInhabitant('admin-system')
    jobRuns.list = [jobRun]
    jobRuns.latest = {}
    jobRunReads.length = 0
    buttonRun.fails = false
})
// A read still held answers, so no handler outlives its test
afterEach(() => {
    heldReads.clear()
    heldRuns.clear()
})

const HEADERS = ['Dato', 'Job', 'Status', 'Varighed', 'Kilde', 'Resultat']
const NO_RUNS = 'Ingen kørsler endnu'

const mountSystem = (isMd: boolean) => mountWithTooltipProvider(AdminSystem, {props: {canEdit: true}, isMd})
type SystemWrapper = Awaited<ReturnType<typeof mountSystem>>

const hasJobRow = (wrapper: SystemWrapper) => wrapper.find('tbody').text().includes(maintenance.jobTypeLabels[JobType.MONTHLY_BILLING])

// Every viewport shows all six columns, each run's values under them; on a phone the table scrolls sideways in its card
describe('AdminSystem job history', () => {
    it.each(VIEWPORTS)('$viewport: the columns read Dato to Resultat, the row holds the run\'s duration, source and result under theirs, and no row expands', async ({isMd}) => {
        const wrapper = await mountSystem(isMd)
        await vi.waitFor(() => expect(hasJobRow(wrapper)).toBe(true))

        expect(tableHeaders(wrapper)).toEqual(HEADERS)
        expect(cellsByHeader(wrapper)).toMatchObject({
            Varighed: maintenance.formatDuration(jobRun.durationMs),
            Kilde: jobRun.triggeredBy,
            Resultat: maintenance.formatResultSummary(jobRun.jobType, jobRun.resultSummary)
        })
        expect(findByTestId(wrapper, `job-history-expand-${jobRun.id}`).exists()).toBe(false)
    })
})

// Until the job history answers, the table's loading row stands where the empty text would
describe('AdminSystem job history while it loads', () => {
    it('GIVEN the job history is on the way THEN the loading row shows, WHEN it lands THEN the job', async () => {
        heldReads.add(null)
        const wrapper = await mountSystem(true)

        await vi.waitFor(() => expect(findLoadingRow(wrapper).text()).toContain('Henter jobhistorik...'))

        heldReads.delete(null)

        await vi.waitFor(() => expect(hasJobRow(wrapper)).toBe(true))
        expect(findLoadingRow(wrapper).exists()).toBe(false)
    })
})

// A box is the card around its job's button
const boxOf = (wrapper: SystemWrapper, jobType: Job) =>
    new DOMWrapper(findByTestId(wrapper, `trigger-${jobType.toLowerCase()}`).element.closest('[data-slot="root"]'))
const isLoading = (box: DOMWrapper<Element>) => box.findAll('[aria-busy="true"]').length > 0
// The card's header: the job's mark over its schedule
const headerOf = (box: DOMWrapper<Element>) => box.find('[data-slot="header"]')
// A box's run lines: its start, its status and its stats, each with the icon before its text
const runLinesOf = (box: DOMWrapper<Element>) =>
    findAllByTestId(box, 'job-run-line').map(line => ({icon: iconNamesIn(line)[0], text: line.text()}))
// UAlert's root, told from the card's by its orientation
const alertOf = (box: DOMWrapper<Element>) => box.find('[data-slot="root"][data-orientation]')
const startOf = (run: JobRunDisplay) => formatDate(run.startedAt, DATE_SETTINGS.DATE_TIME_MASK)
const runOf = (jobType: Job, summary: unknown, overrides: Partial<JobRunDisplay> = {}) =>
    SeasonFactory.defaultJobRun({jobType, resultSummary: JSON.stringify(summary), ...overrides})

// Each box shows its job's latest run, read on its own: the history list holds the last runs of every job
describe('AdminSystem job boxes', () => {
    it.each(BOX_JOBS)('GIVEN the $jobType box WHEN the page loads THEN it reads the job\'s title, what the job does and its run button', async ({jobType}) => {
        const {title, description, buttonLabel} = MAINTENANCE_WORDS.boxes[jobType]
        const wrapper = await mountSystem(true)

        const box = boxOf(wrapper, jobType)
        expect(box.text()).toContain(title)
        expect(box.text()).toContain(description)
        expect(box.find('button').text()).toBe(buttonLabel)
    })

    it.each(BOX_JOBS)('GIVEN the $jobType box at rest THEN its header wears $mark', async ({jobType, logo, icons}) => {
        const wrapper = await mountSystem(true)

        const header = headerOf(boxOf(wrapper, jobType))
        const image = header.find('img')
        expect(image.exists() ? image.attributes('src') : null).toBe(logo)
        expect(iconNamesIn(header)).toEqual(icons)
    })

    it.each(BOX_JOBS)(
        'GIVEN a $jobType run on the way THEN its header spins the sync icon in place of $mark, WHEN it lands THEN the mark returns',
        async ({jobType, runUrl, logo, icons}) => {
            const wrapper = await mountSystem(true)
            heldRuns.add(runUrl)

            await boxOf(wrapper, jobType).find('button').trigger('click')

            await vi.waitFor(() => expect(iconNamesIn(headerOf(boxOf(wrapper, jobType)))).toEqual([ICONS.sync]))
            expect(headerOf(boxOf(wrapper, jobType)).find('img').exists()).toBe(false)

            heldRuns.delete(runUrl)

            await vi.waitFor(() => expect(isLoading(boxOf(wrapper, jobType))).toBe(false))
            const image = headerOf(boxOf(wrapper, jobType)).find('img')
            expect(image.exists() ? image.attributes('src') : null).toBe(logo)
            expect(iconNamesIn(headerOf(boxOf(wrapper, jobType)))).toEqual(icons)
        })

    it.each(BOX_JOBS)('GIVEN no run of $jobType WHEN the box loads THEN it says so, with no loading state', async ({jobType}) => {
        jobRuns.list = []
        const wrapper = await mountSystem(true)

        await vi.waitFor(() => expect(boxOf(wrapper, jobType).text()).toContain(NO_RUNS))
        expect(isLoading(boxOf(wrapper, jobType))).toBe(false)
    })

    it.each(BOX_JOBS)('GIVEN a list without $jobType and its own read with a run WHEN the box loads THEN it shows the run\'s start, its status and its stat lines, each with its stat\'s icon', async ({jobType, summary, stats}) => {
        const run = runOf(jobType, summary)
        jobRuns.list = BOX_JOBS.filter(other => other.jobType !== jobType).map(other => runOf(other.jobType, other.summary))
        jobRuns.latest = {[jobType]: run}
        const wrapper = await mountSystem(true)

        await vi.waitFor(() => expect(boxOf(wrapper, jobType).text()).toContain(startOf(run)))
        const box = boxOf(wrapper, jobType)
        expect(box.text()).toContain(maintenance.jobStatusLabels[JobStatus.SUCCESS])
        expect(runLinesOf(box)).toEqual(expect.arrayContaining(stats().map(stat => ({icon: stat.icon, text: formatJobStat(stat)}))))
    })

    // The notifications line follows the steps a run reports, the scaffold step among them
    it.each([
        {steps: 'with its scaffold step', summary: OrderFactory.defaultDailyMaintenanceResult({scaffold: OrderFactory.defaultScaffoldResult()})},
        {steps: 'without its scaffold step', summary: OrderFactory.defaultDailyMaintenanceResult()}
    ])('GIVEN the latest daily run $steps WHEN the box loads THEN its notifications line wears the notification icon', async ({summary}) => {
        const run = runOf(JobType.DAILY_MAINTENANCE, summary)
        jobRuns.latest = {[JobType.DAILY_MAINTENANCE]: run}
        const wrapper = await mountSystem(true)

        await vi.waitFor(() => expect(boxOf(wrapper, JobType.DAILY_MAINTENANCE).text()).toContain(startOf(run)))
        const notificationsLine = runLinesOf(boxOf(wrapper, JobType.DAILY_MAINTENANCE)).find(line => line.text.startsWith(NOTIFICATION_COUNT_WORDS.label))
        expect(notificationsLine?.icon).toBe(ICONS.notification)
    })

    it.each(BOX_JOBS)('GIVEN the latest $jobType run failed without a summary WHEN the box loads THEN it shows the run\'s start and its failed status', async ({jobType}) => {
        const run = SeasonFactory.defaultJobRun({jobType, status: JobStatus.FAILED, resultSummary: null})
        jobRuns.list = []
        jobRuns.latest = {[jobType]: run}
        const wrapper = await mountSystem(true)

        await vi.waitFor(() => expect(boxOf(wrapper, jobType).text()).toContain(startOf(run)))
        expect(boxOf(wrapper, jobType).text()).toContain(maintenance.jobStatusLabels[JobStatus.FAILED])
        expect(boxOf(wrapper, jobType).text()).not.toContain(maintenance.jobStatusLabels[JobStatus.SUCCESS])
    })

    it.each(BOX_JOBS)('GIVEN the latest $jobType run on the way THEN the box shows its loading state, WHEN it lands THEN the run', async ({jobType, summary}) => {
        const run = runOf(jobType, summary)
        jobRuns.latest = {[jobType]: run}
        heldReads.add(jobType)
        const wrapper = await mountSystem(true)

        await vi.waitFor(() => expect(jobRunReads).toContain(jobType))
        expect(isLoading(boxOf(wrapper, jobType))).toBe(true)
        expect(boxOf(wrapper, jobType).text()).not.toContain(NO_RUNS)

        heldReads.delete(jobType)

        await vi.waitFor(() => expect(boxOf(wrapper, jobType).text()).toContain(startOf(run)))
        expect(isLoading(boxOf(wrapper, jobType))).toBe(false)
    })

    const OUTCOMES = [{outcome: 'succeeds', fails: false}, {outcome: 'fails', fails: true}]
    it.each(BOX_JOBS.flatMap(job => OUTCOMES.map(outcome => ({...job, ...outcome, householdReloads: job.reloadsHouseholds && !outcome.fails ? 1 : 0}))))(
        'GIVEN a $jobType run WHEN its button run $outcome THEN the box loads until it re-reads the run and the list, and shows the new run',
        async ({jobType, summary, fails, householdReloads}) => {
            const firstRun = runOf(jobType, summary)
            jobRuns.list = [firstRun]
            jobRuns.latest = {[jobType]: firstRun}
            const wrapper = await mountSystem(true)
            await vi.waitFor(() => expect(boxOf(wrapper, jobType).text()).toContain(startOf(firstRun)))

            const newRun = runOf(jobType, summary, {id: firstRun.id + 1, startedAt: addDays(firstRun.startedAt, 1)})
            jobRuns.list = [newRun, firstRun]
            jobRuns.latest = {[jobType]: newRun}
            buttonRun.fails = fails
            jobRunReads.length = 0
            householdReads.mockClear()
            heldReads.add(jobType)

            await boxOf(wrapper, jobType).find('button').trigger('click')

            await vi.waitFor(() => expect(jobRunReads).toContain(jobType))
            expect(isLoading(boxOf(wrapper, jobType))).toBe(true)
            expect(boxOf(wrapper, jobType).text()).not.toContain(startOf(newRun))

            heldReads.delete(jobType)

            await vi.waitFor(() => expect(boxOf(wrapper, jobType).text()).toContain(startOf(newRun)))
            expect(isLoading(boxOf(wrapper, jobType))).toBe(false)
            expect(jobRunReads).toEqual(expect.arrayContaining([null, jobType]))
            const box = boxOf(wrapper, jobType)
            expect(alertOf(box).exists()).toBe(fails)
            if (fails) expect(box.text().indexOf(startOf(newRun))).toBeLessThan(box.text().indexOf(alertOf(box).text()))
            await vi.waitFor(() => expect(householdReads).toHaveBeenCalledTimes(householdReloads))
        })
})
