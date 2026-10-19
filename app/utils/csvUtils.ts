/**
 * CSV parsing utilities
 * Used by: useBillingValidation, useMaintenanceImportValidation
 */

/**
 * Parse a single CSV line handling quoted fields
 * Handles: "field with, comma", regular field, "quoted ""escaped"" quotes"
 */
export function parseCSVLine(line: string): string[] {
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
