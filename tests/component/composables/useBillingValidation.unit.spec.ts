import {describe, it, expect} from 'vitest'
import {useBillingValidation} from '~/composables/useBillingValidation'
import {useTicket} from '~/composables/useTicket'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'

describe('useBillingValidation', () => {
    const {
        CSV_HEADER,
        generateCsvRow,
        generateBillingCsv,
        generateCsvFilename
    } = useBillingValidation()

    const {convertPriceToDecimalFormat} = useTicket()

    describe('generateCsvRow', () => {
        it('GIVEN invoice WHEN generating row THEN includes pbsId, address and amount', () => {
            const summary = BillingFactory.defaultSummaryData('test')
            const invoice = BillingFactory.defaultInvoiceData('test')
            const row = generateCsvRow(invoice, summary)

            expect(row).toContain(String(invoice.pbsId))
            expect(row).toContain(invoice.address)
            expect(row).toContain(String(convertPriceToDecimalFormat(invoice.amount)))
        })

        it('GIVEN invoice with zero amount WHEN generating row THEN still includes pbsId with zero DKK', () => {
            const summary = BillingFactory.defaultSummaryData('test')
            const invoice = {...BillingFactory.defaultInvoiceData('test'), amount: 0}
            const row = generateCsvRow(invoice, summary)

            expect(row).toContain(String(invoice.pbsId))
            expect(row.split(',')[2]).toBe(String(convertPriceToDecimalFormat(invoice.amount)))
        })
    })

    describe('generateBillingCsv', () => {
        it('GIVEN summary with invoices WHEN generating CSV THEN includes header and data rows', () => {
            const summary = BillingFactory.defaultSummaryData('test')
            const csv = generateBillingCsv(summary)
            const lines = csv.split('\n')

            expect(csv.startsWith(CSV_HEADER)).toBe(true)
            expect(lines.length).toBe(1 + summary.invoices.length)
            expect(lines[1]).toContain(String(summary.invoices[0]!.pbsId))
        })

        it('GIVEN summary with empty invoices WHEN generating CSV THEN returns only header', () => {
            const summary = {...BillingFactory.defaultSummaryData('test'), invoices: []}
            expect(generateBillingCsv(summary)).toBe(CSV_HEADER)
        })
    })

    describe('generateCsvFilename', () => {
        it('GIVEN summary WHEN generating filename THEN uses billingPeriod', () => {
            const summary = BillingFactory.defaultSummaryData('test')
            expect(generateCsvFilename(summary)).toBe(`PBS-Opgørelse-Skrååningen-${summary.billingPeriod}.csv`)
        })
    })
})
