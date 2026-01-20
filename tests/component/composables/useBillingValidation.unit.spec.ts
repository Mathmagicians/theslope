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
            [TicketType.ADULT, TicketType.ADULT],
            [TicketType.CHILD, TicketType.CHILD],
            [TicketType.BABY, TicketType.BABY],
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

        it.each([
            [true, true],
            [false, false],
            [undefined, undefined]
        ])('GIVEN isGuestTicket=%s WHEN serializing THEN snapshot contains isGuestTicket=%s', (input, expected) => {
            const order = BillingFactory.defaultSerializeInput('guest-test', TicketType.ADULT, {isGuestTicket: input})
            const parsed = JSON.parse(serializeTransaction(order))
            expect(parsed.isGuestTicket).toBe(expected)
        })

        it.each([
            ['Testgade 42', 'Testgade 42'],
            [null, null],
            [undefined, undefined]
        ])('GIVEN provenanceHousehold=%s WHEN serializing THEN snapshot contains provenanceHousehold=%s', (input, expected) => {
            const order = BillingFactory.defaultSerializeInput('prov-test', TicketType.ADULT, {provenanceHousehold: input})
            const parsed = JSON.parse(serializeTransaction(order))
            expect(parsed.provenanceHousehold).toBe(expected)
        })
    })

    describe('deserializeTransaction', () => {
        // Independent fallback: use live data where available, snapshot only for missing relations
        it.each<['full' | 'noHousehold' | 'noTicketPrice' | 'noOrder', number, string]>([
            // full: all live data available → use live household (1111) and live ticketType (ADULT)
            ['full', 1111, TicketType.ADULT],
            // noHousehold: household null → snapshot household (9999), but live ticketType (ADULT)
            ['noHousehold', 9999, TicketType.ADULT],
            // noTicketPrice: ticketPrice null → live household (1111), snapshot ticketType (CHILD)
            ['noTicketPrice', 1111, TicketType.CHILD],
            // noOrder: order null → all snapshot (9999, CHILD)
            ['noOrder', 9999, TicketType.CHILD]
        ])('GIVEN liveData=%s WHEN deserializing THEN uses independent fallback (pbsId=%s, ticketType=%s)', (liveData, expectedPbsId, expectedTicketType) => {
            const tx = BillingFactory.defaultPrismaTransaction('de-test', liveData)
            const result = deserializeTransaction(tx)

            expect(result.inhabitant.household.pbsId).toBe(expectedPbsId)
            expect(result.ticketType).toBe(expectedTicketType)
        })

        it('GIVEN transaction WHEN deserializing THEN base fields are always from transaction', () => {
            const tx = BillingFactory.defaultPrismaTransaction('base-test', 'noOrder')
            const result = deserializeTransaction(tx)

            expect(result.id).toBe(tx.id)
            expect(result.amount).toBe(tx.amount)
            expect(result.orderSnapshot).toBe(tx.orderSnapshot)
        })

        // isGuestTicket tests - parametrized for DRY
        it.each<[string, 'full' | 'noOrder', boolean | undefined, boolean | undefined, boolean | undefined]>([
            ['live preferred over snapshot', 'full', true, false, true],
            ['snapshot fallback when live undefined', 'full', undefined, true, true],
            ['snapshot when order deleted', 'noOrder', undefined, true, true],
            ['undefined when neither set', 'full', undefined, undefined, undefined]
        ])('isGuestTicket: %s', (_, liveData, liveValue, snapshotValue, expected) => {
            const tx = BillingFactory.defaultPrismaTransaction('guest-test', liveData, {
                liveIsGuestTicket: liveValue,
                snapshotIsGuestTicket: snapshotValue
            })
            const result = deserializeTransaction(tx)
            expect(result.isGuestTicket).toBe(expected)
        })

        // provenanceHousehold tests - parametrized for DRY
        it.each<[string, 'full' | 'noOrder', string | null | undefined, string | null | undefined]>([
            ['from snapshot when order exists', 'full', 'Testgade 42', 'Testgade 42'],
            ['from snapshot when order deleted', 'noOrder', 'Birkevej 5', 'Birkevej 5'],
            ['null preserved', 'full', null, null],
            ['undefined when not set', 'full', undefined, undefined]
        ])('provenanceHousehold: %s', (_, liveData, snapshotValue, expected) => {
            const tx = BillingFactory.defaultPrismaTransaction('prov-test', liveData, {
                snapshotProvenance: snapshotValue
            })
            const result = deserializeTransaction(tx)
            expect(result.provenanceHousehold).toBe(expected)
        })
    })

    describe('serialize/deserialize roundtrip', () => {
        it.each([
            [TicketType.ADULT],
            [TicketType.CHILD],
            [TicketType.BABY],
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

        it.each([
            [true, 'Testgade 42'],
            [false, null],
            [undefined, undefined]
        ])('GIVEN isGuestTicket=%s, provenanceHousehold=%s WHEN roundtrip THEN preserved', (isGuestTicket, provenanceHousehold) => {
            const order = BillingFactory.defaultSerializeInput('roundtrip-extra', TicketType.ADULT, {
                isGuestTicket,
                provenanceHousehold
            })
            const serialized = serializeTransaction(order)
            const tx = {id: 1, amount: 0, createdAt: new Date(), orderSnapshot: serialized, order: null}
            const result = deserializeTransaction(tx)

            expect(result.isGuestTicket).toBe(isGuestTicket)
            expect(result.provenanceHousehold).toBe(provenanceHousehold)
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

    // Mock ticket prices for resolving null ticketTypes
    const mockTicketPrices = [
        {price: 4000, ticketType: TicketType.ADULT},
        {price: 1700, ticketType: TicketType.CHILD},
        {price: 0, ticketType: TicketType.BABY}
    ]

    describe('computeStatsFromSnapshots', () => {
        it.each([
            ['empty', [], 0, {}],
            ['single ADULT', [[1, TicketType.ADULT, 4000]], 1, {[TicketType.ADULT]: 1}],
            ['mixed types same dinner', [[1, TicketType.ADULT, 4000], [1, TicketType.CHILD, 1700], [1, TicketType.BABY, 0]], 1, {[TicketType.ADULT]: 1, [TicketType.CHILD]: 1, [TicketType.BABY]: 1}],
            ['same type multiple dinners', [[1, TicketType.ADULT, 4000], [2, TicketType.ADULT, 4000], [3, TicketType.ADULT, 4000]], 3, {[TicketType.ADULT]: 3}],
            ['mixed all', [[1, TicketType.ADULT, 4000], [1, TicketType.ADULT, 4000], [2, TicketType.CHILD, 1700], [2, TicketType.BABY, 0], [3, TicketType.ADULT, 4000]], 3, {[TicketType.ADULT]: 3, [TicketType.CHILD]: 1, [TicketType.BABY]: 1}],
            // null ticketType resolved from amount using ticketPrices (4000 → ADULT)
            ['null ticketType resolved from amount', [[1, null, 4000], [1, TicketType.ADULT, 4000]], 1, {[TicketType.ADULT]: 2}],
            // null ticketType with CHILD price resolves to CHILD
            ['null ticketType resolved to CHILD', [[1, null, 1700], [1, TicketType.ADULT, 4000]], 1, {[TicketType.CHILD]: 1, [TicketType.ADULT]: 1}],
        ] as const)('%s', (_, txData, expectedDinners, expectedCounts) => {
            const invoices = [{
                transactions: txData.map(([dinnerId, type, amount]) => ({
                    amount,
                    orderSnapshot: makeSnapshot(dinnerId, type)
                }))
            }]
            const {dinnerCount, ticketCountsByType} = computeStatsFromSnapshots(invoices, mockTicketPrices)

            expect(dinnerCount).toBe(expectedDinners)
            expect(ticketCountsByType).toEqual(expectedCounts)
        })

        it('GIVEN null ticketType with unresolvable amount WHEN computing stats THEN falls back to ADULT', () => {
            // resolveTicketPrice has fallback: if price doesn't match, return ADULT price
            // This ensures orphaned tickets are always counted (defaults to ADULT)
            const invoices = [{transactions: [
                {amount: 9999, orderSnapshot: makeSnapshot(1, null)}, // unresolvable → fallback to ADULT
                {amount: 4000, orderSnapshot: makeSnapshot(1, TicketType.ADULT)}
            ]}]
            const {dinnerCount, ticketCountsByType} = computeStatsFromSnapshots(invoices, mockTicketPrices)

            expect(dinnerCount).toBe(1)
            expect(ticketCountsByType).toEqual({[TicketType.ADULT]: 2}) // both counted as ADULT (fallback behavior)
        })

        it('GIVEN invalid JSON WHEN computing stats THEN skips invalid', () => {
            const invoices = [{transactions: [
                {amount: 0, orderSnapshot: 'invalid json'},
                {amount: 4000, orderSnapshot: makeSnapshot(1, TicketType.ADULT)}
            ]}]
            const {dinnerCount, ticketCountsByType} = computeStatsFromSnapshots(invoices, mockTicketPrices)

            expect(dinnerCount).toBe(1)
            expect(ticketCountsByType).toEqual({[TicketType.ADULT]: 1})
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
                {amount: 5000, transactions: [{amount: 5000, orderSnapshot: makeSnapshot(1, TicketType.ADULT)}]},
                {amount: 3000, transactions: [{amount: 3000, orderSnapshot: makeSnapshot(1, TicketType.CHILD)}]}
            ])
            const result = deserializeBillingPeriodDisplay(raw, mockTicketPrices)

            expect(result.invoiceSum).toBe(8000)
        })

        it('GIVEN period with multiple dinners WHEN deserializing THEN counts unique dinners', () => {
            const raw = makeRawPeriod([{
                amount: 10000,
                transactions: [
                    {amount: 5000, orderSnapshot: makeSnapshot(1, TicketType.ADULT)},
                    {amount: 3000, orderSnapshot: makeSnapshot(2, TicketType.ADULT)},
                    {amount: 2000, orderSnapshot: makeSnapshot(1, TicketType.CHILD)} // same dinner as first
                ]
            }])
            const result = deserializeBillingPeriodDisplay(raw, mockTicketPrices)

            expect(result.dinnerCount).toBe(2) // dinners 1 and 2
        })

        it('GIVEN period with tickets WHEN deserializing THEN counts by type', () => {
            const raw = makeRawPeriod([{
                amount: 10000,
                transactions: [
                    {amount: 5000, orderSnapshot: makeSnapshot(1, TicketType.ADULT)},
                    {amount: 3000, orderSnapshot: makeSnapshot(1, TicketType.ADULT)},
                    {amount: 2000, orderSnapshot: makeSnapshot(1, TicketType.CHILD)}
                ]
            }])
            const result = deserializeBillingPeriodDisplay(raw, mockTicketPrices)

            expect(result.ticketCountsByType).toEqual({[TicketType.ADULT]: 2, [TicketType.CHILD]: 1})
        })
    })

    describe('deserializeBillingPeriodDetail', () => {
        it('GIVEN null WHEN deserializing THEN returns null', () => {
            expect(deserializeBillingPeriodDetail(null, mockTicketPrices)).toBeNull()
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
                        {amount: 5000, orderSnapshot: makeSnapshot(1, TicketType.ADULT)},
                        {amount: 3000, orderSnapshot: makeSnapshot(1, TicketType.CHILD)}
                    ]
                }]
            }
            const result = deserializeBillingPeriodDetail(raw, mockTicketPrices)

            expect(result?.invoices[0]?.transactionSum).toBe(8000)
        })
    })
})
