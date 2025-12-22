import {describe, it, expect} from 'vitest'
import {useBillingValidation} from '~/composables/useBillingValidation'
import {useTicket} from '~/composables/useTicket'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'

describe('useBillingValidation', () => {
    const {
        CSV_HEADER,
        generateCsvRow,
        generateBillingCsv,
        generateCsvFilename,
        serializeTransaction,
        deserializeTransaction
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

    // ============================================================================
    // Transaction Serialization (ADR-010)
    // ============================================================================

    describe('serializeTransaction', () => {
        it.each([
            ['ADULT', 'ADULT'],
            ['CHILD', 'CHILD'],
            ['BABY', 'BABY'],
            [null, null]
        ])('GIVEN ticketType=%s WHEN serializing THEN snapshot contains ticketType=%s', (input, expected) => {
            const order = BillingFactory.defaultSerializeInput('test', input)
            const parsed = JSON.parse(serializeTransaction(order))
            expect(parsed.ticketType).toBe(expected)
        })

        it('GIVEN order data WHEN serializing THEN snapshot contains all billing fields', () => {
            const order = BillingFactory.defaultSerializeInput('ser-test')
            const parsed = JSON.parse(serializeTransaction(order))

            expect(parsed.dinnerEvent.id).toBe(order.dinnerEvent.id)
            expect(parsed.dinnerEvent.menuTitle).toBe(order.dinnerEvent.menuTitle)
            expect(parsed.inhabitant.id).toBe(order.inhabitant.id)
            expect(parsed.inhabitant.name).toBe(order.inhabitant.name)
            expect(parsed.inhabitant.household.pbsId).toBe(order.inhabitant.household.pbsId)
            expect(parsed.inhabitant.household.address).toBe(order.inhabitant.household.address)
        })
    })

    describe('deserializeTransaction', () => {
        it.each<['full' | 'noHousehold' | 'noTicketPrice' | 'noOrder', 'live' | 'snapshot']>([
            ['full', 'live'],
            ['noHousehold', 'snapshot'],
            ['noTicketPrice', 'snapshot'],
            ['noOrder', 'snapshot']
        ])('GIVEN liveData=%s WHEN deserializing THEN uses %s data', (liveData, expectedSource) => {
            const tx = BillingFactory.defaultPrismaTransaction('de-test', liveData)
            const result = deserializeTransaction(tx)

            if (expectedSource === 'live') {
                expect(result.inhabitant.household.pbsId).toBe(1111)
                expect(result.ticketType).toBe('ADULT')
            } else {
                expect(result.inhabitant.household.pbsId).toBe(9999)
                expect(result.ticketType).toBe('CHILD')
            }
        })

        it('GIVEN transaction WHEN deserializing THEN base fields are always from transaction', () => {
            const tx = BillingFactory.defaultPrismaTransaction('base-test', 'noOrder')
            const result = deserializeTransaction(tx)

            expect(result.id).toBe(tx.id)
            expect(result.amount).toBe(tx.amount)
            expect(result.orderSnapshot).toBe(tx.orderSnapshot)
        })
    })

    describe('serialize/deserialize roundtrip', () => {
        it.each([
            ['ADULT'],
            ['CHILD'],
            ['BABY'],
            [null]
        ])('GIVEN ticketType=%s WHEN roundtrip THEN data preserved', (ticketType) => {
            const order = BillingFactory.defaultSerializeInput('roundtrip', ticketType)
            const serialized = serializeTransaction(order)
            const tx = {id: 1, amount: 0, createdAt: new Date(), orderSnapshot: serialized, order: null}
            const result = deserializeTransaction(tx)

            expect(result.dinnerEvent.id).toBe(order.dinnerEvent.id)
            expect(result.dinnerEvent.menuTitle).toBe(order.dinnerEvent.menuTitle)
            expect(result.inhabitant.id).toBe(order.inhabitant.id)
            expect(result.inhabitant.name).toBe(order.inhabitant.name)
            expect(result.inhabitant.household.pbsId).toBe(order.inhabitant.household.pbsId)
            expect(result.inhabitant.household.address).toBe(order.inhabitant.household.address)
            expect(result.ticketType).toBe(ticketType)
        })
    })
})
