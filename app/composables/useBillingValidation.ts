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
     * Ticket counts by type - raw data from repository
     * Keys are TicketType enum values
     */
    const TicketCountsByTypeSchema = z.record(TicketTypeSchema, z.number().int())

    /**
     * BillingPeriodSummary Display - for index endpoints (lightweight)
     * billingPeriod format: "dd/MM/yyyy-dd/MM/yyyy" (formatDateRange)
     * invoiceSum is computed from invoices for control sum display
     */
    const BillingPeriodSummaryDisplaySchema = z.object({
        id: z.number().int(),
        billingPeriod: z.string(), // formatDateRange format
        shareToken: z.string(), // UUID for magic link (included for share button)
        totalAmount: z.number().int(), // øre - expected total
        invoiceSum: z.number().int(), // øre - Σ invoice.amount for control sum
        householdCount: z.number().int(),
        ticketCount: z.number().int(),
        dinnerCount: z.number().int(), // # unique dinner events
        ticketCountsByType: TicketCountsByTypeSchema, // { ADULT: 200, CHILD: 50, BABY: 1 }
        cutoffDate: z.coerce.date(),
        paymentDate: z.coerce.date(),
        createdAt: z.coerce.date()
    })

    /**
     * Invoice Display - full invoice from Prisma schema
     * pbsId and address are frozen at billing time for immutability
     * transactionSum is computed from related transactions for control display
     */
    const InvoiceDisplaySchema = z.object({
        id: z.number().int(),
        cutoffDate: z.coerce.date(),
        paymentDate: z.coerce.date(),
        billingPeriod: z.string(),
        amount: z.number().int(),
        transactionSum: z.number().int(), // Σ transaction.amount for control sum
        createdAt: z.coerce.date(),
        householdId: z.number().int().nullable(),
        billingPeriodSummaryId: z.number().int().nullable(),
        pbsId: z.number().int(),
        address: z.string()
    })

    const InvoiceCreateSchema = InvoiceDisplaySchema.omit({id: true, createdAt: true, transactionSum: true})

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
    // CostEntry/CostLine Schemas (Economy views)
    // ============================================================================

    /**
     * CostEntry - grouped items by dinner event for economy display
     * Used for both Transactions (billing) and Orders (live bookings)
     * T must have ticketType for ticket count formatting
     */
    const CostEntrySchema = <T extends z.ZodTypeAny>(itemSchema: T) => z.object({
        dinnerEventId: z.number().int(),
        date: z.coerce.date(),
        menuTitle: z.string(),
        items: z.array(itemSchema),
        totalAmount: z.number().int(),
        ticketCounts: z.string()
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
        // orderId for lazy-loading order history - nullable (order may be deleted, SET NULL)
        orderId: z.number().int().nullable(),
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
        ticketType: TicketTypeSchema.nullable()
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
        id: true, createdAt: true, shareToken: true,
        invoiceSum: true, dinnerCount: true, ticketCountsByType: true  // Computed on read, not stored
    })

    const BillingPeriodSummaryIdSchema = BillingPeriodSummaryDisplaySchema.pick({id: true})

    const InvoiceCreatedSchema = InvoiceDisplaySchema.pick({id: true, householdId: true, pbsId: true})

    const BillingGenerationResultSchema = z.object({
        billingPeriodSummaryId: z.number().int().positive(),
        billingPeriod: z.string(),
        invoiceCount: z.number().int().min(0),
        transactionCount: z.number().int().min(0),
        totalAmount: z.number().int().min(0)
    })

    /**
     * Response from POST /api/admin/maintenance/monthly
     * Returns array of results (one per billing period processed)
     * Normal monthly run = 1 period, catch-up = multiple periods
     */
    const MonthlyBillingResponseSchema = z.object({
        results: z.array(BillingGenerationResultSchema),
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

        return `${invoice.pbsId},"${invoice.address}",${totalDKK},${paymentStart},${paymentEnd},${cutoff},${totalDKK},,`
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
     * Format: PBS-Opgørelse-Skråningen-{billingPeriod}.csv
     */
    const generateCsvFilename = (summary: z.infer<typeof BillingPeriodSummaryDetailSchema>): string =>
        `PBS-Opgørelse-Skråningen-${summary.billingPeriod}.csv`

    // ============================================================================
    // Transaction Serialization (ADR-010)
    // ============================================================================

    /**
     * Order snapshot schema - frozen billing data for immutability.
     * Matches what createTransactions.ts stores. Strict - no defaults.
     * Price is in Transaction.amount, not duplicated here.
     */
    const OrderSnapshotSchema = z.object({
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
        ticketType: TicketTypeSchema.nullable()
    })

    /**
     * Serialize order data for transaction snapshot.
     * Freezes billing-relevant data at transaction creation time.
     * ADR-010: Domain-driven serialization
     */
    const serializeTransaction = (order: {
        dinnerEvent: {id: number, date: Date, menuTitle: string}
        inhabitant: {id: number, name: string, household: {id: number, pbsId: number, address: string}}
        ticketType: string | null
    }): string => JSON.stringify({
        dinnerEvent: order.dinnerEvent,
        inhabitant: {
            id: order.inhabitant.id,
            name: order.inhabitant.name,
            household: order.inhabitant.household
        },
        ticketType: order.ticketType
    })

    /**
     * Deserialize transaction from Prisma to domain type.
     * Uses live data if ALL relations exist, otherwise uses frozen snapshot.
     * Throws if snapshot is unparseable - caller should handle.
     * ADR-010: Repository-layer deserialization
     */
    const deserializeTransaction = (tx: {
        id: number
        amount: number
        createdAt: Date
        orderSnapshot: string
        order: {
            id: number
            dinnerEvent: {id: number, date: Date, menuTitle: string}
            inhabitant: {id: number, name: string, household: {id: number, pbsId: number, address: string} | null}
            ticketPrice: {ticketType: string} | null
        } | null
    }): z.infer<typeof TransactionDisplaySchema> => {
        const base = {id: tx.id, amount: tx.amount, createdAt: tx.createdAt, orderSnapshot: tx.orderSnapshot}

        // Use live data only if ALL required relations exist
        if (tx.order?.inhabitant?.household && tx.order.ticketPrice) {
            return TransactionDisplaySchema.parse({
                ...base,
                orderId: tx.order.id,
                dinnerEvent: tx.order.dinnerEvent,
                inhabitant: tx.order.inhabitant,
                ticketType: tx.order.ticketPrice.ticketType
            })
        }

        // Any relation deleted - use frozen snapshot (strict parsing)
        // Set household.id to 0 to indicate deleted (not valid as FK), orderId null
        const snapshot = OrderSnapshotSchema.parse(JSON.parse(tx.orderSnapshot))
        return TransactionDisplaySchema.parse({
            ...base,
            orderId: null,
            dinnerEvent: snapshot.dinnerEvent,
            inhabitant: {
                ...snapshot.inhabitant,
                household: {...snapshot.inhabitant.household, id: 0}
            },
            ticketType: snapshot.ticketType
        })
    }

    /**
     * Deserialize order snapshot from JSON string.
     */
    const deserializeOrderSnapshot = (orderSnapshot: string) =>
        OrderSnapshotSchema.parse(JSON.parse(orderSnapshot))

    /**
     * Raw billing period from Prisma (before transformation).
     * Invoices contain transactions with orderSnapshot for computing derived fields.
     */
    type RawBillingPeriod = {
        id: number
        billingPeriod: string
        shareToken: string
        totalAmount: number
        householdCount: number
        ticketCount: number
        cutoffDate: Date
        paymentDate: Date
        createdAt: Date
        invoices: Array<{
            id: number
            amount: number
            cutoffDate: Date
            paymentDate: Date
            billingPeriod: string
            createdAt: Date
            householdId: number | null  // Nullable per Prisma schema
            billingPeriodSummaryId: number | null  // Nullable per Prisma schema
            pbsId: number
            address: string
            transactions: Array<{amount: number, orderSnapshot: string}>
        }>
    }

    /**
     * Compute derived stats from order snapshots.
     * Pure function - extracts dinnerCount and ticketCountsByType.
     */
    const computeStatsFromSnapshots = (invoices: Array<{transactions: Array<{orderSnapshot: string}>}>) => {
        const snapshots = invoices
            .flatMap(inv => inv.transactions)
            .map(tx => { try { return deserializeOrderSnapshot(tx.orderSnapshot) } catch { return null } })
            .filter((s): s is NonNullable<typeof s> => s !== null)

        const dinnerCount = new Set(snapshots.map(s => s.dinnerEvent.id)).size
        const ticketCountsByType: Record<string, number> = {}
        for (const s of snapshots) {
            if (s.ticketType) ticketCountsByType[s.ticketType] = (ticketCountsByType[s.ticketType] ?? 0) + 1
        }
        return {dinnerCount, ticketCountsByType}
    }

    /**
     * Deserialize billing period display from raw Prisma data.
     * Computes dinnerCount and ticketCountsByType from order snapshots.
     */
    const deserializeBillingPeriodDisplay = (raw: RawBillingPeriod): z.infer<typeof BillingPeriodSummaryDisplaySchema> => {
        const {dinnerCount, ticketCountsByType} = computeStatsFromSnapshots(raw.invoices)
        const invoiceSum = raw.invoices.reduce((sum, inv) => sum + inv.amount, 0)
        return BillingPeriodSummaryDisplaySchema.parse({...raw, invoiceSum, dinnerCount, ticketCountsByType})
    }

    /**
     * Deserialize billing period detail from raw Prisma data.
     * Computes all derived fields including per-invoice transactionSum.
     */
    const deserializeBillingPeriodDetail = (raw: RawBillingPeriod | null): z.infer<typeof BillingPeriodSummaryDetailSchema> | null => {
        if (!raw) return null
        const {dinnerCount, ticketCountsByType} = computeStatsFromSnapshots(raw.invoices)
        const invoiceSum = raw.invoices.reduce((sum, inv) => sum + inv.amount, 0)
        const invoices = raw.invoices.map(inv => deserializeInvoice(inv))
        return BillingPeriodSummaryDetailSchema.parse({...raw, invoices, invoiceSum, dinnerCount, ticketCountsByType})
    }

    /**
     * Raw invoice from Prisma (before transformation).
     * Includes transactions for computing transactionSum.
     */
    type RawInvoice = {
        id: number
        amount: number
        cutoffDate: Date
        paymentDate: Date
        billingPeriod: string
        createdAt: Date
        householdId: number | null
        billingPeriodSummaryId: number | null
        pbsId: number
        address: string
        transactions: Array<{amount: number, orderId?: number | null}>
    }

    /**
     * Deserialize invoice from raw Prisma data.
     * Computes transactionSum from related transactions.
     */
    const deserializeInvoice = (raw: RawInvoice): z.infer<typeof InvoiceDisplaySchema> => {
        const {transactions, ...inv} = raw
        const transactionSum = transactions.reduce((sum, tx) => sum + tx.amount, 0)

        // DEBUG: Log if transactionSum doesn't match invoice amount (remove after investigation)
        if (transactionSum !== inv.amount && transactionSum === inv.amount * 2) {
            const withOrderId = transactions.filter(tx => tx.orderId !== null && tx.orderId !== undefined).length
            const orphans = transactions.length - withOrderId
            console.warn(`💰 > BILLING > [DUPLICATE_TX] Invoice ${inv.id}: txCount=${transactions.length}, withOrderId=${withOrderId}, orphans=${orphans}`)
        }

        return InvoiceDisplaySchema.parse({
            ...inv,
            transactionSum
        })
    }

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
        TicketCountsByTypeSchema,
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
        CurrentPeriodBillingSchema,

        // CostEntry/CostLine (Economy views)
        CostEntrySchema,

        // Serialization (ADR-010)
        OrderSnapshotSchema,
        serializeTransaction,
        deserializeTransaction,
        deserializeOrderSnapshot,
        computeStatsFromSnapshots,
        deserializeBillingPeriodDisplay,
        deserializeBillingPeriodDetail,
        deserializeInvoice
    }
}

// ============================================================================
// Type Exports
// ============================================================================

// BillingPeriodSummary types (ADR-009)
export type BillingPeriodSummaryDisplay = z.infer<ReturnType<typeof useBillingValidation>['BillingPeriodSummaryDisplaySchema']>
export type BillingPeriodSummaryDetail = z.infer<ReturnType<typeof useBillingValidation>['BillingPeriodSummaryDetailSchema']>
export type TicketCountsByType = z.infer<ReturnType<typeof useBillingValidation>['TicketCountsByTypeSchema']>
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

// CostEntry/CostLine types (Economy views)
export type CostEntry<T> = {
    dinnerEventId: number
    date: Date
    menuTitle: string
    items: T[]
    totalAmount: number
    ticketCounts: string
}

// HouseholdEntry - group by household for PBS/revisor view
export type HouseholdEntry<T> = {
    householdId: number
    pbsId: number
    address: string
    items: T[]
    totalAmount: number      // Stored/expected amount (invoice.amount or computed for virtual)
    computedTotal: number    // Control sum: Σ item amounts
    ticketCounts: string
}

// Control sum validation - UI uses this to show ✓ or ✗
export const isControlSumValid = <T>(entry: HouseholdEntry<T>): boolean =>
    entry.computedTotal === entry.totalAmount
