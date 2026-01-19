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
        deserializeTransaction,
        computeStatsFromSnapshots,
        deserializeBillingPeriodDisplay,
        deserializeBillingPeriodDetail,
        TicketType
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
            expect(generateCsvFilename(summary)).toBe(`PBS-Opgørelse-Skråningen-${summary.billingPeriod}.csv`)
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

    // ============================================================================
    // Billing Period Deserialization
    // ============================================================================

    // Helper to create order snapshot JSON
    const makeSnapshot = (dinnerEventId: number, ticketType: string | null) => JSON.stringify({
        dinnerEvent: {id: dinnerEventId, date: new Date().toISOString(), menuTitle: 'Test'},
        inhabitant: {id: 1, name: 'Test', household: {id: 1, pbsId: 100, address: 'Test'}},
        ticketType
    })

    describe('computeStatsFromSnapshots', () => {
        it.each([
            ['empty', [], 0, {}],
            ['single ADULT', [[1, 'ADULT']], 1, {ADULT: 1}],
            ['mixed types same dinner', [[1, 'ADULT'], [1, 'CHILD'], [1, 'BABY']], 1, {ADULT: 1, CHILD: 1, BABY: 1}],
            ['same type multiple dinners', [[1, 'ADULT'], [2, 'ADULT'], [3, 'ADULT']], 3, {ADULT: 3}],
            ['mixed all', [[1, 'ADULT'], [1, 'ADULT'], [2, 'CHILD'], [2, 'BABY'], [3, 'ADULT']], 3, {ADULT: 3, CHILD: 1, BABY: 1}],
            ['null ticketType ignored', [[1, null], [1, 'ADULT']], 1, {ADULT: 1}],
        ] as const)('%s', (_, txData, expectedDinners, expectedCounts) => {
            const invoices = [{
                transactions: txData.map(([dinnerId, type]) => ({orderSnapshot: makeSnapshot(dinnerId, type)}))
            }]
            const {dinnerCount, ticketCountsByType} = computeStatsFromSnapshots(invoices)

            expect(dinnerCount).toBe(expectedDinners)
            expect(ticketCountsByType).toEqual(expectedCounts)
        })

        it('GIVEN invalid JSON WHEN computing stats THEN skips invalid', () => {
            const invoices = [{transactions: [
                {orderSnapshot: 'invalid json'},
                {orderSnapshot: makeSnapshot(1, 'ADULT')}
            ]}]
            const {dinnerCount, ticketCountsByType} = computeStatsFromSnapshots(invoices)

            expect(dinnerCount).toBe(1)
            expect(ticketCountsByType).toEqual({ADULT: 1})
        })
    })

    describe('deserializeBillingPeriodDisplay', () => {
        const makeRawPeriod = (invoices: Array<{amount: number, transactions: Array<{amount: number, orderSnapshot: string}>}>) => ({
            id: 1,
            billingPeriod: '01/01/2025-31/01/2025',
            shareToken: 'token-123',
            totalAmount: 10000,
            householdCount: 5,
            ticketCount: 10,
            cutoffDate: new Date(),
            paymentDate: new Date(),
            createdAt: new Date(),
            invoices: invoices.map((inv, i) => ({
                id: i + 1, amount: inv.amount, cutoffDate: new Date(), paymentDate: new Date(),
                billingPeriod: '01/01/2025-31/01/2025', createdAt: new Date(),
                householdId: i + 1, billingPeriodSummaryId: 1, pbsId: 100 + i, address: `Addr ${i}`,
                transactions: inv.transactions
            }))
        })

        it('GIVEN period with invoices WHEN deserializing THEN computes invoiceSum', () => {
            const raw = makeRawPeriod([
                {amount: 5000, transactions: [{amount: 5000, orderSnapshot: makeSnapshot(1, 'ADULT')}]},
                {amount: 3000, transactions: [{amount: 3000, orderSnapshot: makeSnapshot(1, 'CHILD')}]}
            ])
            const result = deserializeBillingPeriodDisplay(raw)

            expect(result.invoiceSum).toBe(8000)
        })

        it('GIVEN period with multiple dinners WHEN deserializing THEN counts unique dinners', () => {
            const raw = makeRawPeriod([{
                amount: 10000,
                transactions: [
                    {amount: 5000, orderSnapshot: makeSnapshot(1, 'ADULT')},
                    {amount: 3000, orderSnapshot: makeSnapshot(2, 'ADULT')},
                    {amount: 2000, orderSnapshot: makeSnapshot(1, 'CHILD')} // same dinner as first
                ]
            }])
            const result = deserializeBillingPeriodDisplay(raw)

            expect(result.dinnerCount).toBe(2) // dinners 1 and 2
        })

        it('GIVEN period with tickets WHEN deserializing THEN counts by type', () => {
            const raw = makeRawPeriod([{
                amount: 10000,
                transactions: [
                    {amount: 5000, orderSnapshot: makeSnapshot(1, 'ADULT')},
                    {amount: 3000, orderSnapshot: makeSnapshot(1, 'ADULT')},
                    {amount: 2000, orderSnapshot: makeSnapshot(1, 'CHILD')}
                ]
            }])
            const result = deserializeBillingPeriodDisplay(raw)

            expect(result.ticketCountsByType).toEqual({ADULT: 2, CHILD: 1})
        })
    })

    describe('deserializeBillingPeriodDetail', () => {
        it('GIVEN null WHEN deserializing THEN returns null', () => {
            expect(deserializeBillingPeriodDetail(null)).toBeNull()
        })

        it('GIVEN period WHEN deserializing THEN computes transactionSum per invoice', () => {
            const raw = {
                id: 1, billingPeriod: '01/01/2025-31/01/2025', shareToken: 'token',
                totalAmount: 10000, householdCount: 1, ticketCount: 3,
                cutoffDate: new Date(), paymentDate: new Date(), createdAt: new Date(),
                invoices: [{
                    id: 1, amount: 8000, cutoffDate: new Date(), paymentDate: new Date(),
                    billingPeriod: '01/01/2025-31/01/2025', createdAt: new Date(),
                    householdId: 1, billingPeriodSummaryId: 1, pbsId: 100, address: 'Test',
                    transactions: [
                        {amount: 5000, orderSnapshot: makeSnapshot(1, 'ADULT')},
                        {amount: 3000, orderSnapshot: makeSnapshot(1, 'CHILD')}
                    ]
                }]
            }
            const result = deserializeBillingPeriodDetail(raw)

            expect(result?.invoices[0]?.transactionSum).toBe(8000)
        })
    })
})
