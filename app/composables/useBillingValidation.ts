import {z} from 'zod'
import {TicketTypeSchema, DinnerModeSchema, OrderStateSchema} from '~~/prisma/generated/zod'
import {parse as parseDate} from 'date-fns'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useTicket} from '~/composables/useTicket'

/**
 * Validation schemas for Billing domain (CSV Import/Export, BillingPeriodSummary)
 *
 * CSV Import Format (framelding pivot table):
 * - Row 0: Headers with dates (DD/MM/YYYY)
 * - Row N: Address row (Address, Total DKK/måned, then empty cells)
 * - Row N+1: Voksne row (empty, empty, then counts per date)
 * - Row N+2: Børn (2-12 år) row (empty, empty, then counts per date)
 *
 * ADR-009 Compliance:
 * - BillingPeriodSummaryDisplay: Index endpoints (lightweight)
 * - BillingPeriodSummaryDetail: Detail endpoints + mutations (comprehensive)
 * - ImportResponseSchema: Response for import operation
 */
export const useBillingValidation = () => {
    const TicketType = TicketTypeSchema.enum
    const DinnerMode = DinnerModeSchema.enum
    const OrderState = OrderStateSchema.enum
    const {convertPriceToDecimalFormat} = useTicket()

    // ============================================================================
    // BillingPeriodSummary Schemas (ADR-009: Display vs Detail)
    // ============================================================================

    /**
     * BillingPeriodSummary Display - for index endpoints (lightweight)
     * billingPeriod format: "dd/MM/yyyy-dd/MM/yyyy" (formatDateRange)
     */
    const BillingPeriodSummaryDisplaySchema = z.object({
        id: z.number().int(),
        billingPeriod: z.string(), // formatDateRange format
        shareToken: z.string(), // UUID for magic link (included for share button)
        totalAmount: z.number().int(), // øre
        householdCount: z.number().int(),
        ticketCount: z.number().int(),
        cutoffDate: z.coerce.date(),
        paymentDate: z.coerce.date(),
        createdAt: z.coerce.date()
    })

    /**
     * Invoice Display - full invoice from Prisma schema
     * pbsId and address are frozen at billing time for immutability
     */
    const InvoiceDisplaySchema = z.object({
        id: z.number().int(),
        cutoffDate: z.coerce.date(),
        paymentDate: z.coerce.date(),
        billingPeriod: z.string(),
        amount: z.number().int(),
        createdAt: z.coerce.date(),
        householdId: z.number().int().nullable(),
        billingPeriodSummaryId: z.number().int().nullable(),
        pbsId: z.number().int(),
        address: z.string()
    })

    const InvoiceCreateSchema = InvoiceDisplaySchema.omit({id: true, createdAt: true})

    /**
     * BillingPeriodSummary Detail - for detail endpoints (comprehensive)
     * Includes invoices with household info
     */
    const BillingPeriodSummaryDetailSchema = BillingPeriodSummaryDisplaySchema.extend({
        shareToken: z.string(), // UUID for magic link
        invoices: z.array(InvoiceDisplaySchema)
    })

    /**
     * Public billing view (for magic link / accountant)
     * Same as Detail but explicitly for public access
     */
    const PublicBillingViewSchema = BillingPeriodSummaryDetailSchema

    /**
     * Single order from CSV import
     */
    const ImportedOrderSchema = z.object({
        address: z.string(),
        date: z.date(),
        ticketType: TicketTypeSchema,
        count: z.number().int().min(0)
    })

    /**
     * Import request (file content as string)
     * Uses active season - no seasonId needed
     */
    const BillingImportRequestSchema = z.object({
        csvContent: z.string().min(1, 'CSV content is required')
    })

    const {CreateOrdersResultSchema} = useBookingValidation()

    const BillingImportResponseSchema = z.object({
        results: z.array(CreateOrdersResultSchema),
        totalCreated: z.number().int().min(0)
    })

    /**
     * Parsed household order from CSV
     */
    interface ParsedHouseholdOrder {
        address: string
        date: Date
        adultCount: number
        childCount: number
    }

    /**
     * Parse CSV content into structured orders
     * FAIL FAST: Throws on malformed CSV (parse errors are fatal)
     * @param csvContent - Raw CSV string
     * @returns Array of parsed household orders
     * @throws Error if CSV structure is invalid
     */
    function parseCSV(csvContent: string): ParsedHouseholdOrder[] {
        const lines = csvContent.trim().split('\n')
        const orders: ParsedHouseholdOrder[] = []

        if (lines.length < 4) {
            throw new Error('CSV must have at least 4 rows (header + address + voksne + børn)')
        }

        // Parse header row to extract dates
        const headerCells = parseCSVLine(lines[0]!) // Safe: lines.length >= 4
        const dates: Date[] = []

        // First two columns are empty/total, dates start at index 2
        for (let i = 2; i < headerCells.length; i++) {
            const dateStr = headerCells[i]?.trim()
            if (dateStr) {
                // Parse DD/MM/YYYY format
                const date = parseDate(dateStr, 'dd/MM/yyyy', new Date())
                if (isNaN(date.getTime())) {
                    throw new Error(`Invalid date format in header column ${i + 1}: '${dateStr}'. Expected DD/MM/YYYY`)
                }
                dates.push(date)
            }
        }

        if (dates.length === 0) {
            throw new Error('No valid dates found in header row. Expected DD/MM/YYYY format starting at column 3')
        }

        // Parse data rows in groups of 3: Address, Voksne, Børn
        let i = 1
        while (i < lines.length) {
            const addressLine = lines[i]
            const voksneLine = lines[i + 1]
            const bornLine = lines[i + 2]

            // Check if we have a complete group
            if (!addressLine?.trim()) {
                break // End of data
            }

            if (!voksneLine || !bornLine) {
                throw new Error(`Incomplete data group at row ${i + 1}. Expected Address, Voksne, and Børn rows`)
            }

            const addressCells = parseCSVLine(addressLine)
            const address = addressCells[0]?.trim()

            // Empty first cell = end of data (trailing empty rows)
            if (!address) {
                break
            }

            const voksneCells = parseCSVLine(voksneLine)
            const bornCells = parseCSVLine(bornLine)

            // Validate Voksne row
            const voksneLabel = voksneCells[0]?.trim()
            if (voksneLabel !== 'Voksne') {
                throw new Error(`Expected 'Voksne' row after address '${address}' at row ${i + 2}, got '${voksneLabel}'`)
            }

            // Validate Børn row
            const bornLabel = bornCells[0]?.trim()
            if (!bornLabel?.startsWith('Børn')) {
                throw new Error(`Expected 'Børn' row after Voksne for address '${address}' at row ${i + 3}, got '${bornLabel}'`)
            }

            // Parse counts for each date
            for (let j = 0; j < dates.length; j++) {
                const colIndex = j + 2 // Skip address and total columns
                const adultCount = parseInt(voksneCells[colIndex] || '0', 10) || 0
                const childCount = parseInt(bornCells[colIndex] || '0', 10) || 0

                // Only add if there are actual orders
                if (adultCount > 0 || childCount > 0) {
                    orders.push({
                        address,
                        date: dates[j]!, // Safe: j < dates.length
                        adultCount,
                        childCount
                    })
                }
            }

            i += 3
        }

        return orders
    }

    /**
     * Parse a single CSV line handling quoted fields
     */
    function parseCSVLine(line: string): string[] {
        const result: string[] = []
        let current = ''
        let inQuotes = false

        for (let i = 0; i < line.length; i++) {
            const char = line[i]

            if (char === '"') {
                inQuotes = !inQuotes
            } else if (char === ',' && !inQuotes) {
                result.push(current)
                current = ''
            } else {
                current += char
            }
        }

        result.push(current)
        return result
    }

    /**
     * Generate idempotency key for an order
     * Orders are unique by: (householdId, dinnerEventId, ticketType)
     */
    function getOrderKey(householdId: number, dinnerEventId: number, ticketType: string): string {
        return `${householdId}-${dinnerEventId}-${ticketType}`
    }

    /**
     * Schema for parsed household order (used after CSV parsing)
     */
    const ParsedHouseholdOrderSchema = z.object({
        address: z.string(),
        date: z.date(),
        adultCount: z.number().int().min(0),
        childCount: z.number().int().min(0)
    })

    // ============================================================================
    // Household Billing Schemas (ADR-009)
    // ============================================================================

    /**
     * Transaction Display - for household billing view
     * Shows individual orders within a billing period
     */
    const TransactionDisplaySchema = z.object({
        id: z.number().int(),
        amount: z.number().int(),
        createdAt: z.coerce.date(),
        orderSnapshot: z.string(),
        dinnerEvent: z.object({
            id: z.number().int(),
            date: z.coerce.date(),
            menuTitle: z.string()
        }),
        inhabitant: z.object({
            id: z.number().int(),
            name: z.string(),
            household: z.object({
                id: z.number().int(),
                pbsId: z.number().int(),
                address: z.string()
            })
        }),
        ticketType: TicketTypeSchema
    })

    /**
     * Household Invoice - invoice with transactions for household view
     */
    const HouseholdInvoiceSchema = z.object({
        id: z.number().int(),
        billingPeriod: z.string(),
        cutoffDate: z.coerce.date(),
        paymentDate: z.coerce.date(),
        amount: z.number().int(),
        transactions: z.array(TransactionDisplaySchema)
    })

    /**
     * Current period billing - unbilled transactions
     */
    const CurrentPeriodBillingSchema = z.object({
        periodStart: z.coerce.date(),
        periodEnd: z.coerce.date(),
        totalAmount: z.number().int(),
        transactions: z.array(TransactionDisplaySchema)
    })

    /**
     * Household Billing Response - complete billing data for a household
     */
    const HouseholdBillingResponseSchema = z.object({
        householdId: z.number().int(),
        pbsId: z.number().int(),
        address: z.string(),
        currentPeriod: CurrentPeriodBillingSchema,
        pastInvoices: z.array(HouseholdInvoiceSchema)
    })

    // ============================================================================
    // Monthly Billing Generation (ADR-015: Idempotent jobs)
    // ============================================================================

    const BillingPeriodSummaryCreateSchema = BillingPeriodSummaryDisplaySchema.omit({
        id: true, createdAt: true, shareToken: true
    })

    const BillingPeriodSummaryIdSchema = BillingPeriodSummaryDisplaySchema.pick({id: true})

    const InvoiceCreatedSchema = InvoiceDisplaySchema.pick({id: true, householdId: true})

    const BillingGenerationResultSchema = z.object({
        billingPeriodSummaryId: z.number().int().positive(),
        billingPeriod: z.string(),
        invoiceCount: z.number().int().min(0),
        transactionCount: z.number().int().min(0),
        totalAmount: z.number().int().min(0)
    })

    /**
     * Response from POST /api/admin/maintenance/monthly
     * Wraps result to ensure JSON response (null alone becomes 204)
     */
    const MonthlyBillingResponseSchema = z.object({
        result: BillingGenerationResultSchema,
        jobRunId: z.number().int().positive()
    })

    // ============================================================================
    // CSV Export Functions
    // ============================================================================

    const CSV_HEADER = '"Kunde nr",Adresse,"Total DKK/måned","Opkrævning periode start","Opkrævning periode slut",Opgørelsesdato,"Måltider total","Evt ekstra",Note'

    /**
     * Format date for CSV export (DD/MM/YYYY)
     */
    const formatCsvDate = (date: Date): string => {
        const day = date.getDate().toString().padStart(2, '0')
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const year = date.getFullYear()
        return `${day}/${month}/${year}`
    }

    /**
     * Get last day of month for a given date
     */
    const getLastDayOfMonth = (date: Date): Date =>
        new Date(date.getFullYear(), date.getMonth() + 1, 0)

    /**
     * Generate CSV row for a single invoice
     * Uses denormalized pbsId/address (frozen at billing time)
     */
    const generateCsvRow = (
        invoice: z.infer<typeof InvoiceDisplaySchema>,
        summary: z.infer<typeof BillingPeriodSummaryDetailSchema>
    ): string => {
        const totalDKK = convertPriceToDecimalFormat(invoice.amount)
        const paymentStart = formatCsvDate(summary.paymentDate)
        const paymentEnd = formatCsvDate(getLastDayOfMonth(summary.paymentDate))
        const cutoff = formatCsvDate(summary.cutoffDate)

        return `${invoice.pbsId},${invoice.address},${totalDKK},${paymentStart},${paymentEnd},${cutoff},${totalDKK},,`
    }

    /**
     * Generate complete CSV export for a billing period
     */
    const generateBillingCsv = (summary: z.infer<typeof BillingPeriodSummaryDetailSchema>): string => {
        const rows = summary.invoices.map(inv => generateCsvRow(inv, summary))
        return [CSV_HEADER, ...rows].join('\n')
    }

    /**
     * Generate filename for CSV export
     * Format: PBS-Opgørelse-Skrååningen-{billingPeriod}.csv
     */
    const generateCsvFilename = (summary: z.infer<typeof BillingPeriodSummaryDetailSchema>): string =>
        `PBS-Opgørelse-Skrååningen-${summary.billingPeriod}.csv`

    return {
        // Enums
        TicketTypeSchema,
        DinnerModeSchema,
        OrderStateSchema,
        TicketType,
        DinnerMode,
        OrderState,

        // BillingPeriodSummary Schemas (ADR-009)
        BillingPeriodSummaryDisplaySchema,
        BillingPeriodSummaryDetailSchema,
        InvoiceDisplaySchema,
        InvoiceCreateSchema,
        PublicBillingViewSchema,

        // CSV Import Schemas
        ImportedOrderSchema,
        BillingImportRequestSchema,
        BillingImportResponseSchema,
        ParsedHouseholdOrderSchema,

        // CSV Import Functions
        parseCSV,
        parseCSVLine,
        getOrderKey,

        // CSV Export Functions
        CSV_HEADER,
        formatCsvDate,
        getLastDayOfMonth,
        generateCsvRow,
        generateBillingCsv,
        generateCsvFilename,

        // Monthly Billing Generation
        BillingPeriodSummaryCreateSchema,
        BillingPeriodSummaryIdSchema,
        InvoiceCreatedSchema,
        BillingGenerationResultSchema,
        MonthlyBillingResponseSchema,

        // Household Billing
        HouseholdBillingResponseSchema,
        TransactionDisplaySchema,
        HouseholdInvoiceSchema,
        CurrentPeriodBillingSchema
    }
}

// ============================================================================
// Type Exports
// ============================================================================

// BillingPeriodSummary types (ADR-009)
export type BillingPeriodSummaryDisplay = z.infer<ReturnType<typeof useBillingValidation>['BillingPeriodSummaryDisplaySchema']>
export type BillingPeriodSummaryDetail = z.infer<ReturnType<typeof useBillingValidation>['BillingPeriodSummaryDetailSchema']>
export type InvoiceDisplay = z.infer<ReturnType<typeof useBillingValidation>['InvoiceDisplaySchema']>
export type InvoiceCreate = z.infer<ReturnType<typeof useBillingValidation>['InvoiceCreateSchema']>
export type PublicBillingView = z.infer<ReturnType<typeof useBillingValidation>['PublicBillingViewSchema']>

// CSV Import types
export type ImportedOrder = z.infer<ReturnType<typeof useBillingValidation>['ImportedOrderSchema']>
export type BillingImportRequest = z.infer<ReturnType<typeof useBillingValidation>['BillingImportRequestSchema']>
export type BillingImportResponse = z.infer<ReturnType<typeof useBillingValidation>['BillingImportResponseSchema']>
export type ParsedHouseholdOrder = z.infer<ReturnType<typeof useBillingValidation>['ParsedHouseholdOrderSchema']>

// Monthly Billing Generation types
export type BillingPeriodSummaryCreate = z.infer<ReturnType<typeof useBillingValidation>['BillingPeriodSummaryCreateSchema']>
export type BillingPeriodSummaryId = z.infer<ReturnType<typeof useBillingValidation>['BillingPeriodSummaryIdSchema']>
export type InvoiceCreated = z.infer<ReturnType<typeof useBillingValidation>['InvoiceCreatedSchema']>
export type BillingGenerationResult = z.infer<ReturnType<typeof useBillingValidation>['BillingGenerationResultSchema']>
export type MonthlyBillingResponse = z.infer<ReturnType<typeof useBillingValidation>['MonthlyBillingResponseSchema']>

// Household Billing types
export type HouseholdBillingResponse = z.infer<ReturnType<typeof useBillingValidation>['HouseholdBillingResponseSchema']>
export type TransactionDisplay = z.infer<ReturnType<typeof useBillingValidation>['TransactionDisplaySchema']>
export type HouseholdInvoice = z.infer<ReturnType<typeof useBillingValidation>['HouseholdInvoiceSchema']>
export type CurrentPeriodBilling = z.infer<ReturnType<typeof useBillingValidation>['CurrentPeriodBillingSchema']>
