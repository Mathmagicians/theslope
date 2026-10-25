import {describe, it, expect} from 'vitest'
import {useBillingValidation} from '~/composables/useBillingValidation'
import {useTicket} from '~/composables/useTicket'
import {DinnerMode} from '~/composables/useBookingValidation'
import {formatDate} from '~/utils/date'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import {ExpenseFactory} from '~~/tests/e2e/testDataFactories/expenseFactory'

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

        it('GIVEN a period WHEN generating a row THEN the payment period runs from the payment date to the last day of its month, then the cutoff date and an empty note', () => {
            const paymentDate = new Date(2026, 1, 1)
            const cutoffDate = new Date(2026, 0, 17)
            const summary = {...BillingFactory.defaultSummaryData('test'), paymentDate, cutoffDate}
            const invoice = BillingFactory.defaultInvoiceData('test')

            expect(generateCsvRow(invoice, summary)).toMatch(new RegExp(`,${formatDate(paymentDate)},${formatDate(new Date(2026, 1, 28))},${formatDate(cutoffDate)},$`))
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
    })

    describe('generateCsvFilename', () => {
        it('GIVEN summary at a version WHEN generating filename THEN uses billingPeriod and the version', () => {
            const summary = {...BillingFactory.defaultSummaryData('test'), version: 2}
            expect(generateCsvFilename(summary)).toBe(`PBS-Opgørelse-Skråningen-${summary.billingPeriod}-v2.csv`)
        })
    })

    // ============================================================================
    // Transaction Serialization (ADR-010)
    // ============================================================================

    // Each field's passage through the snapshot is the roundtrip's, below
    describe('serializeTransaction', () => {
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

        // isGuestTicket: live when set, else the snapshot (a deleted order has no live value)
        it.each<[string, 'full' | 'noOrder', boolean | undefined, boolean | undefined, boolean | undefined]>([
            ['live preferred over snapshot', 'full', true, false, true],
            ['snapshot fallback when live undefined', 'full', undefined, true, true],
            ['undefined when neither set', 'full', undefined, undefined, undefined]
        ])('isGuestTicket: %s', (_, liveData, liveValue, snapshotValue, expected) => {
            const tx = BillingFactory.defaultPrismaTransaction('guest-test', liveData, {
                liveIsGuestTicket: liveValue,
                snapshotIsGuestTicket: snapshotValue
            })
            const result = deserializeTransaction(tx)
            expect(result.isGuestTicket).toBe(expected)
        })

        // provenanceHousehold always reads from the snapshot, whether or not the order lives
        it.each<[string, 'full' | 'noOrder', string | null | undefined, string | null | undefined]>([
            ['from snapshot when order exists', 'full', 'Testgade 42', 'Testgade 42'],
            ['undefined when not set', 'full', undefined, undefined]
        ])('provenanceHousehold: %s', (_, liveData, snapshotValue, expected) => {
            const tx = BillingFactory.defaultPrismaTransaction('prov-test', liveData, {
                snapshotProvenance: snapshotValue
            })
            const result = deserializeTransaction(tx)
            expect(result.provenanceHousehold).toBe(expected)
        })

        // dinnerMode: the live order's when it lives, else the snapshot's; a snapshot written before it carried the mode reads null
        it.each([
            {desc: 'live preferred over snapshot', liveData: 'full' as const, live: DinnerMode.NONE, snapshot: DinnerMode.DINEIN, expected: DinnerMode.NONE},
            {desc: 'snapshot when the order is gone', liveData: 'noOrder' as const, live: undefined, snapshot: DinnerMode.NONE, expected: DinnerMode.NONE},
            {desc: 'null when neither has it', liveData: 'noOrder' as const, live: undefined, snapshot: undefined, expected: null}
        ])('dinnerMode: $desc', ({liveData, live, snapshot, expected}) => {
            const tx = BillingFactory.defaultPrismaTransaction('mode-test', liveData, {liveDinnerMode: live, snapshotDinnerMode: snapshot})
            expect(deserializeTransaction(tx).dinnerMode).toBe(expected)
        })
    })

    describe('serialize/deserialize roundtrip', () => {
        it.each([
            [TicketType.ADULT],
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

        it.each([
            {desc: 'a released ticket closed with Ingen', dinnerMode: DinnerMode.NONE, expected: DinnerMode.NONE},
            {desc: 'an eaten ticket', dinnerMode: DinnerMode.TAKEAWAY, expected: DinnerMode.TAKEAWAY},
            {desc: 'an order serialized without its mode', dinnerMode: undefined, expected: null}
        ])('GIVEN $desc WHEN roundtrip THEN the eating mode reads $expected', ({dinnerMode, expected}) => {
            const order = BillingFactory.defaultSerializeInput('roundtrip-mode', TicketType.ADULT, {dinnerMode})
            const tx = {id: 1, amount: 0, createdAt: new Date(), orderSnapshot: serializeTransaction(order), order: null}
            expect(deserializeTransaction(tx).dinnerMode).toBe(expected)
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
    const mockTicketPrices = BillingFactory.mockTicketPrices

    describe('computeStatsFromSnapshots', () => {
        it.each([
            ['empty', [], 0, {}],
            ['mixed types across dinners', [[1, TicketType.ADULT, 4000], [1, TicketType.ADULT, 4000], [2, TicketType.CHILD, 1700], [2, TicketType.BABY, 0], [3, TicketType.ADULT, 4000]], 3, {[TicketType.ADULT]: 3, [TicketType.CHILD]: 1, [TicketType.BABY]: 1}],
            // null ticketType resolved from amount using ticketPrices (1700 → CHILD)
            ['null ticketType resolved from amount', [[1, null, 1700], [1, TicketType.ADULT, 4000]], 1, {[TicketType.CHILD]: 1, [TicketType.ADULT]: 1}],
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
            version: 1,
            invoices: invoices.map((inv, i) => ({
                id: i + 1, amount: inv.amount, cutoffDate: new Date(), paymentDate: new Date(),
                billingPeriod: '01/01/2025-31/01/2025', createdAt: new Date(),
                householdId: i + 1, billingPeriodSummaryId: 1, pbsId: 100 + i, address: `Addr ${i}`,
                transactions: inv.transactions
            }))
        })

        it('GIVEN period with invoices WHEN deserializing THEN computes the invoiceSum, counts unique dinners and counts tickets by type', () => {
            const raw = makeRawPeriod([
                {amount: 8000, transactions: [
                    {amount: 5000, orderSnapshot: makeSnapshot(1, TicketType.ADULT)},
                    {amount: 3000, orderSnapshot: makeSnapshot(2, TicketType.ADULT)}
                ]},
                {amount: 2000, transactions: [{amount: 2000, orderSnapshot: makeSnapshot(1, TicketType.CHILD)}]} // same dinner as first
            ])
            const result = deserializeBillingPeriodDisplay(raw, mockTicketPrices)

            expect(result.invoiceSum).toBe(10000)
            expect(result.dinnerCount).toBe(2) // dinners 1 and 2
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
                version: 1,
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

    describe('ExpenseCreateSchema', () => {
        const {ExpenseCreateSchema} = useBillingValidation()
        const valid = ExpenseFactory.defaultExpenseCreate()

        it('GIVEN a gross amount alone (the route writes the note) WHEN parsing THEN succeeds', () => {
            expect(ExpenseCreateSchema.parse(valid)).toEqual(valid)
        })

        // The write schema is strict: a deprecated column and the payer never come from the body
        it.each([
            {desc: 'a stray totalCost key', body: {...valid, totalCost: 100}},
            {desc: 'a payer key (the caller is the payer)', body: {...valid, paidByUserId: 7}}
        ])('GIVEN $desc WHEN parsing THEN throws', ({body}) => {
            expect(() => ExpenseCreateSchema.parse(body)).toThrow()
        })
    })

    // The form's ex/inkl modes, zero and empty amounts are ExpenseLines' cases
    describe('ExpenseLineFormSchema', () => {
        const {ExpenseLineFormSchema, VatModeSchema} = useBillingValidation()
        const valid = {amountKr: 1012, vatMode: VatModeSchema.enum.ex}

        it('GIVEN a kr amount typed as text WHEN parsing THEN it parses to the number', () => {
            expect(ExpenseLineFormSchema.parse({...valid, amountKr: '1012'})).toEqual(valid)
        })

        it('GIVEN an empty amount WHEN parsing THEN throws', () => {
            expect(() => ExpenseLineFormSchema.parse({...valid, amountKr: ''})).toThrow()
        })
    })

    describe('serializeExpense / deserializeExpense', () => {
        const {serializeExpense, deserializeExpense, ExpenseCreateDataSchema} = useBillingValidation()

        it('GIVEN a row WHEN serializing THEN the payer becomes a JSON column', () => {
            const expense = ExpenseFactory.defaultExpense()
            const row = serializeExpense(expense)
            expect(row).not.toHaveProperty('paidBy')
            expect(JSON.parse(row.userSnapshot)).toEqual(expense.paidBy)
        })

        it.each([
            {desc: 'a user as payer', expense: ExpenseFactory.defaultExpense()},
            {desc: 'a legacy row the migration mapped from the old column', expense: ExpenseFactory.defaultExpense({paidByUserId: null, paidBy: {id: null, email: 'SYSTEM'}})}
        ])('GIVEN $desc WHEN round-tripping THEN the row comes back equal', ({expense}) => {
            expect(deserializeExpense(serializeExpense(expense))).toEqual(expense)
        })

        it('GIVEN create data WHEN serializing THEN the shape is the database row without its assigned fields', () => {
            const {id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...data} = ExpenseFactory.defaultExpense()
            const row = serializeExpense(ExpenseCreateDataSchema.parse(data))
            expect(Object.keys(row).sort()).toEqual(['amount', 'description', 'dinnerEventId', 'paidByUserId', 'type', 'userSnapshot'])
        })
    })
})
