import {z} from 'zod'
import {TicketTypeSchema, DinnerModeSchema, OrderStateSchema} from '~~/prisma/generated/zod'
import {parse as parseDate} from 'date-fns'
import {useBookingValidation} from '~/composables/useBookingValidation'

/**
 * Validation schemas for Billing domain (CSV Import/Export)
 *
 * CSV Import Format (framelding pivot table):
 * - Row 0: Headers with dates (DD/MM/YYYY)
 * - Row N: Address row (Address, Total DKK/måned, then empty cells)
 * - Row N+1: Voksne row (empty, empty, then counts per date)
 * - Row N+2: Børn (2-12 år) row (empty, empty, then counts per date)
 *
 * ADR-009 Compliance:
 * - ImportResponseSchema: Response for import operation
 */
export const useBillingValidation = () => {
    const TicketType = TicketTypeSchema.enum
    const DinnerMode = DinnerModeSchema.enum
    const OrderState = OrderStateSchema.enum

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

    return {
        // Enums
        TicketTypeSchema,
        DinnerModeSchema,
        OrderStateSchema,
        TicketType,
        DinnerMode,
        OrderState,

        // Schemas
        ImportedOrderSchema,
        BillingImportRequestSchema,
        BillingImportResponseSchema,
        ParsedHouseholdOrderSchema,

        // Functions
        parseCSV,
        parseCSVLine,
        getOrderKey
    }
}

// ============================================================================
// Type Exports
// ============================================================================

export type ImportedOrder = z.infer<ReturnType<typeof useBillingValidation>['ImportedOrderSchema']>
export type BillingImportRequest = z.infer<ReturnType<typeof useBillingValidation>['BillingImportRequestSchema']>
export type BillingImportResponse = z.infer<ReturnType<typeof useBillingValidation>['BillingImportResponseSchema']>
export type ParsedHouseholdOrder = z.infer<ReturnType<typeof useBillingValidation>['ParsedHouseholdOrderSchema']>
