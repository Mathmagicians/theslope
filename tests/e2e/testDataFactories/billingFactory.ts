import {expect, type BrowserContext} from '@playwright/test'
import {readFileSync, readdirSync, existsSync} from 'fs'
import {join} from 'path'
import {format} from 'date-fns'
import testHelpers from '../testHelpers'
import {
    useBillingValidation,
    type BillingImportResponse,
    type BillingPeriodSummaryDetail,
    type BillingPeriodSummaryDisplay,
    type HouseholdBillingResponse,
    type InvoiceDisplay,
    type MonthlyBillingResponse,
    type TransactionDisplay
} from '~/composables/useBillingValidation'

const {headers, salt} = testHelpers
const BILLING_IMPORT_ENDPOINT = '/api/admin/billing/import'
const BILLING_PERIODS_ENDPOINT = '/api/admin/billing/periods'
const BILLING_INVOICES_ENDPOINT = '/api/admin/billing/invoices'
const BILLING_CURRENT_PERIOD_ENDPOINT = '/api/admin/billing/current-period'
const PUBLIC_BILLING_ENDPOINT = '/api/public/billing'
const MONTHLY_BILLING_ENDPOINT = '/api/admin/maintenance/monthly'
const ORDER_IMPORT_DIR = join(process.cwd(), '.theslope', 'order-import')
const HOUSEHOLD_BILLING_ENDPOINT = '/api/billing'
const {BillingImportResponseSchema, BillingPeriodSummaryDisplaySchema, BillingPeriodSummaryDetailSchema, HouseholdBillingResponseSchema, MonthlyBillingResponseSchema, TransactionDisplaySchema, parseCSV, deserializeBillingPeriodDetail, serializeTransaction} = useBillingValidation()

export class BillingFactory {

    // ============================================================================
    // Default Test Data (for unit tests - no HTTP calls)
    // Uses raw data with orderSnapshots, then deserializes to compute fields
    // ============================================================================

    /**
     * Create order snapshot JSON for test transactions
     */
    private static readonly makeOrderSnapshot = (testSalt: string, dinnerEventId: number, ticketType: 'ADULT' | 'CHILD' | 'BABY') =>
        serializeTransaction({
            dinnerEvent: {id: dinnerEventId, date: new Date('2025-11-10'), menuTitle: salt('Test Menu', testSalt)},
            inhabitant: {id: 1, name: salt('Test Person', testSalt), household: {id: 1, pbsId: 2053, address: salt('Testgade 42', testSalt)}},
            ticketType
        })

    /**
     * Default raw billing period data (before deserialization)
     * Contains transactions with orderSnapshots for proper field computation
     */
    private static readonly defaultRawBillingPeriod = (testSalt: string = 'default') => ({
        id: 1,
        billingPeriod: '18/10/2025-17/11/2025',
        totalAmount: 116400, // 1164 DKK in øre (matches sum of transactions)
        householdCount: 1,
        ticketCount: 2,
        cutoffDate: new Date(2025, 10, 17), // Nov 17
        paymentDate: new Date(2025, 11, 1), // Dec 1
        createdAt: new Date(2025, 10, 18),
        shareToken: salt('token', testSalt),
        invoices: [{
            id: 1,
            cutoffDate: new Date('2025-11-17'),
            paymentDate: new Date('2025-12-01'),
            billingPeriod: '18/10/2025-17/11/2025',
            amount: 116400, // Total for this invoice
            createdAt: new Date('2025-11-18'),
            householdId: 1,
            billingPeriodSummaryId: 1,
            pbsId: 2053,
            address: salt('Smedekildevej 42', testSalt),
            transactions: [
                {amount: 58200, orderSnapshot: BillingFactory.makeOrderSnapshot(testSalt, 1, 'ADULT')},
                {amount: 58200, orderSnapshot: BillingFactory.makeOrderSnapshot(testSalt, 2, 'ADULT')}
            ]
        }]
    })

    /**
     * Default invoice data for unit tests (with computed transactionSum)
     */
    static readonly defaultInvoiceData = (testSalt: string = 'default'): InvoiceDisplay => {
        const summary = BillingFactory.defaultSummaryData(testSalt)
        return summary.invoices[0]!
    }

    /**
     * Default billing period summary data for unit tests
     * Uses deserializer to compute dinnerCount, ticketCountsByType, invoiceSum, transactionSum
     */
    static readonly defaultSummaryData = (testSalt: string = 'default'): BillingPeriodSummaryDetail => {
        const raw = BillingFactory.defaultRawBillingPeriod(testSalt)
        return deserializeBillingPeriodDetail(raw)!
    }

    // ============================================================================
    // Transaction Serialization Test Data (ADR-010)
    // ============================================================================

    /**
     * Input for serializeTransaction - order data with billing-relevant fields
     */
    static readonly defaultSerializeInput = (
        testSalt: string = 'default',
        ticketType: string | null = 'ADULT',
        options?: {isGuestTicket?: boolean, provenanceHousehold?: string | null}
    ) => ({
        dinnerEvent: {id: 1, date: new Date('2025-01-15'), menuTitle: salt('Test Dinner', testSalt)},
        inhabitant: {id: 2, name: salt('Anna', testSalt), household: {id: 3, pbsId: 2053, address: salt('Testgade 42', testSalt)}},
        ticketType,
        isGuestTicket: options?.isGuestTicket,
        provenanceHousehold: options?.provenanceHousehold
    })

    /**
     * Simulated Prisma transaction result for deserializeTransaction
     * @param liveData - 'full' = all relations, 'noHousehold' = household deleted, 'noTicketPrice' = ticketPrice deleted, 'noOrder' = order deleted
     * @param options - Optional isGuestTicket/provenanceHousehold for testing guest/claimed tickets
     */
    static readonly defaultPrismaTransaction = (
        testSalt: string = 'default',
        liveData: 'full' | 'noHousehold' | 'noTicketPrice' | 'noOrder' = 'full',
        options?: {
            snapshotIsGuestTicket?: boolean,
            snapshotProvenance?: string | null,
            liveIsGuestTicket?: boolean
        }
    ) => {
        const {TicketType} = useBillingValidation()

        const snapshot = {
            dinnerEvent: {id: 1, date: '2025-01-15', menuTitle: salt('Snapshot Dinner', testSalt)},
            inhabitant: {id: 2, name: salt('Snapshot Name', testSalt), household: {id: 3, pbsId: 9999, address: salt('Snapshot Street', testSalt)}},
            ticketType: TicketType.CHILD,
            isGuestTicket: options?.snapshotIsGuestTicket,
            provenanceHousehold: options?.snapshotProvenance
        }

        const base = {
            id: 100,
            amount: 4500,
            createdAt: new Date('2025-01-16'),
            orderSnapshot: JSON.stringify(snapshot)
        }

        const liveOrder = {
            id: 50,  // orderId for lazy-loading order history
            dinnerEvent: {id: 1, date: new Date('2025-01-15'), menuTitle: salt('Live Dinner', testSalt)},
            inhabitant: {id: 2, name: salt('Live Name', testSalt), household: {id: 3, pbsId: 1111, address: salt('Live Street', testSalt)}},
            ticketPrice: {ticketType: TicketType.ADULT},
            isGuestTicket: options?.liveIsGuestTicket
        }

        switch (liveData) {
            case 'noOrder': return {...base, order: null}
            case 'noHousehold': return {...base, order: {...liveOrder, inhabitant: {...liveOrder.inhabitant, household: null}}}
            case 'noTicketPrice': return {...base, order: {...liveOrder, ticketPrice: null}}
            default: return {...base, order: liveOrder}
        }
    }

    // ============================================================================
    // CSV Import Functions
    // ============================================================================

    /**
     * Get all CSV files in .theslope/order-import folder
     * Returns empty array if directory doesn't exist (gitignored, local-only)
     */
    static readonly getCSVFiles = (): string[] => {
        if (!existsSync(ORDER_IMPORT_DIR)) return []
        return readdirSync(ORDER_IMPORT_DIR)
            .filter(f => f.endsWith('.csv'))
            .map(f => join(ORDER_IMPORT_DIR, f))
    }

    /**
     * Read and parse a CSV file, validating it's in correct format
     */
    static readonly validateCSVFile = (filePath: string): void => {
        const content = readFileSync(filePath, 'utf-8')
        const parsed = parseCSV(content)
        expect(parsed.length, `${filePath} should have parseable orders`).toBeGreaterThan(0)
    }

    /**
     * Generate CSV in framelding format for a single household
     */
    static readonly generateCSV = (
        address: string,
        dates: Date[],
        adultCount: number = 1,
        childCount: number = 0
    ): string => {
        const dateHeaders = dates.map(d => format(d, 'dd/MM/yyyy')).join(',')
        const adultCounts = dates.map(() => adultCount).join(',')
        const childCounts = dates.map(() => childCount).join(',')

        return `,Total DKK/måned,${dateHeaders}
${address},0,${dates.map(() => '').join(',')}
Voksne,,${adultCounts}
Børn (2-12 år),,${childCounts}
`
    }

    static readonly importOrders = async (
        context: BrowserContext,
        csvContent: string
    ): Promise<BillingImportResponse> => {
        const response = await context.request.post(BILLING_IMPORT_ENDPOINT, {
            headers,
            data: {csvContent}
        })

        const body = await response.json()
        expect(response.status(), `Import failed: ${JSON.stringify(body)}`).toBe(200)
        return BillingImportResponseSchema.parse(body)
    }

    // ============================================================================
    // Billing Period API Functions
    // ============================================================================

    /**
     * Get all billing period summaries (admin endpoint)
     */
    static readonly getBillingPeriods = async (
        context: BrowserContext
    ): Promise<BillingPeriodSummaryDisplay[]> => {
        const response = await context.request.get(BILLING_PERIODS_ENDPOINT, {headers})
        const body = await response.json()
        expect(response.status(), `Get billing periods failed: ${JSON.stringify(body)}`).toBe(200)
        return body.map((s: unknown) => BillingPeriodSummaryDisplaySchema.parse(s))
    }

    /**
     * Get billing period by ID (admin endpoint)
     */
    static readonly getBillingPeriodById = async (
        context: BrowserContext,
        id: number
    ): Promise<BillingPeriodSummaryDetail> => {
        const response = await context.request.get(`${BILLING_PERIODS_ENDPOINT}/${id}`, {headers})
        const body = await response.json()
        expect(response.status(), `Get billing period ${id} failed: ${JSON.stringify(body)}`).toBe(200)
        return BillingPeriodSummaryDetailSchema.parse(body)
    }

    /**
     * Get billing period by token (public endpoint - no auth)
     */
    static readonly getBillingPeriodByToken = async (
        context: BrowserContext,
        token: string
    ): Promise<BillingPeriodSummaryDetail> => {
        const response = await context.request.get(`${PUBLIC_BILLING_ENDPOINT}/${token}`)
        const body = await response.json()
        expect(response.status(), `Get billing by token failed: ${JSON.stringify(body)}`).toBe(200)
        return BillingPeriodSummaryDetailSchema.parse(body)
    }

    /**
     * Get billing CSV by token (public endpoint - no auth)
     */
    static readonly getBillingCsvByToken = async (
        context: BrowserContext,
        token: string
    ): Promise<{csv: string, filename: string}> => {
        const response = await context.request.get(`${PUBLIC_BILLING_ENDPOINT}/${token}/csv`)
        expect(response.status(), 'Get billing CSV failed').toBe(200)

        const contentDisposition = response.headers()['content-disposition'] || ''
        // RFC 5987 encoded filename (filename*=UTF-8''...)
        const filenameMatch = contentDisposition.match(/filename\*=UTF-8''([^;\s]+)/)
        const filename = filenameMatch?.[1] ? decodeURIComponent(filenameMatch[1]) : ''

        return {csv: await response.text(), filename}
    }

    /**
     * Raw request for error testing (public endpoint)
     */
    static readonly getBillingByTokenRaw = async (
        context: BrowserContext,
        token: string
    ): Promise<{status: number, body: unknown}> => {
        const response = await context.request.get(`${PUBLIC_BILLING_ENDPOINT}/${token}`)
        return {status: response.status(), body: await response.json().catch(() => null)}
    }

    /**
     * Raw request for error testing (admin endpoint)
     */
    static readonly getBillingPeriodByIdRaw = async (
        context: BrowserContext,
        id: number
    ): Promise<{status: number, body: unknown}> => {
        const response = await context.request.get(`${BILLING_PERIODS_ENDPOINT}/${id}`, {headers})
        return {status: response.status(), body: await response.json().catch(() => null)}
    }

    // ============================================================================
    // Monthly Billing Generation
    // ============================================================================

    /**
     * Generate monthly billing (POST /api/admin/maintenance/monthly)
     * Creates BillingPeriodSummary + Invoices from unbilled Transactions
     * ADR-015: Idempotent - returns null if billing period already exists
     */
    static readonly generateBilling = async (
        context: BrowserContext,
        expectedStatus: number = 200
    ): Promise<MonthlyBillingResponse | null> => {
        const response = await context.request.post(MONTHLY_BILLING_ENDPOINT, {headers})

        const status = response.status()
        const errorBody = status !== expectedStatus ? await response.text() : ''
        expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

        if (expectedStatus === 200) {
            const body = await response.json()
            return MonthlyBillingResponseSchema.parse(body)
        }

        return null
    }

    // ============================================================================
    // Household Billing API Functions
    // ============================================================================

    /**
     * Get billing data for a household (GET /api/billing?householdId=X)
     * Returns current period transactions and past invoices
     */
    static readonly getHouseholdBilling = async (
        context: BrowserContext,
        householdId: number,
        expectedStatus: number = 200
    ): Promise<HouseholdBillingResponse | null> => {
        const response = await context.request.get(`${HOUSEHOLD_BILLING_ENDPOINT}?householdId=${householdId}`, {headers})

        const status = response.status()
        const errorBody = status !== expectedStatus ? await response.text() : ''
        expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

        if (expectedStatus === 200) {
            const body = await response.json()
            return HouseholdBillingResponseSchema.parse(body)
        }

        return null
    }

    // ============================================================================
    // Admin Economy Tree View API Functions
    // ============================================================================

    /**
     * Get current period transactions (GET /api/admin/billing/current-period)
     * Returns all unbilled transactions for the "virtual" billing period
     */
    static readonly getCurrentPeriodTransactions = async (
        context: BrowserContext,
        expectedStatus: number = 200
    ): Promise<TransactionDisplay[]> => {
        const response = await context.request.get(BILLING_CURRENT_PERIOD_ENDPOINT, {headers})

        const status = response.status()
        const errorBody = status !== expectedStatus ? await response.text() : ''
        expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

        if (expectedStatus === 200) {
            const body = await response.json()
            return body.map((tx: unknown) => TransactionDisplaySchema.parse(tx))
        }

        return []
    }

    /**
     * Get transactions for an invoice (GET /api/admin/billing/invoices/[id])
     * Lazy loading for admin economy tree view
     */
    static readonly getInvoiceTransactions = async (
        context: BrowserContext,
        invoiceId: number,
        expectedStatus: number = 200
    ): Promise<TransactionDisplay[]> => {
        const response = await context.request.get(`${BILLING_INVOICES_ENDPOINT}/${invoiceId}`, {headers})

        const status = response.status()
        const errorBody = status !== expectedStatus ? await response.text() : ''
        expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

        if (expectedStatus === 200) {
            const body = await response.json()
            return body.map((tx: unknown) => TransactionDisplaySchema.parse(tx))
        }

        return []
    }

    /**
     * Raw request for error testing (invoice transactions)
     */
    static readonly getInvoiceTransactionsRaw = async (
        context: BrowserContext,
        invoiceId: number
    ): Promise<{status: number, body: unknown}> => {
        const response = await context.request.get(`${BILLING_INVOICES_ENDPOINT}/${invoiceId}`, {headers})
        return {status: response.status(), body: await response.json().catch(() => null)}
    }
}
