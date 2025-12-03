import {expect, type BrowserContext} from '@playwright/test'
import {readFileSync, readdirSync} from 'fs'
import {join} from 'path'
import {format} from 'date-fns'
import testHelpers from '../testHelpers'
import {useBillingValidation, type BillingImportResponse} from '~/composables/useBillingValidation'

const {headers} = testHelpers
const BILLING_IMPORT_ENDPOINT = '/api/admin/billing/import'
const ORDER_IMPORT_DIR = join(process.cwd(), '.theslope', 'order-import')
const {BillingImportResponseSchema, parseCSV} = useBillingValidation()

export class BillingFactory {

    /**
     * Get all CSV files in .theslope/order-import folder
     */
    static readonly getCSVFiles = (): string[] => {
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
}
