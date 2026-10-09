// Factory for expense test data: the kitchen's ledger of costs
import {expect, type BrowserContext} from '@playwright/test'
import testHelpers from '../testHelpers'
import {useBillingValidation, type Expense, type ExpenseCreate} from '~/composables/useBillingValidation'

const {headers} = testHelpers
const {ExpenseSchema, LedgerEntryTypeSchema} = useBillingValidation()
const expensesEndpoint = (dinnerEventId: number) => `/api/chef/dinner/${dinnerEventId}/expenses`

export class ExpenseFactory {
    static readonly defaultExpenseCreate = (overrides: Partial<ExpenseCreate> = {}): ExpenseCreate => ({
        amount: 101200,
        description: 'Grønt og kolonial',
        ...overrides
    })

    // A domain row as the repository hands it out
    static readonly defaultExpense = (overrides: Partial<Expense> = {}): Expense => ({
        id: 1,
        type: LedgerEntryTypeSchema.enum.REGULAR,
        dinnerEventId: 1,
        paidByUserId: 1,
        paidBy: {id: 1, email: 'chef@example.com'},
        amount: 101200,
        description: 'Grønt og kolonial',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides
    })

    // PUT: 201 with the line; another expected status returns null. The body is untyped so a spec can send an invalid one
    static readonly add = async (context: BrowserContext, dinnerEventId: number, data: Record<string, unknown>, expectedStatus = 201): Promise<Expense | null> => {
        const response = await context.request.put(expensesEndpoint(dinnerEventId), {headers, data})
        const body = response.status() === expectedStatus ? '' : await response.text()
        expect(response.status(), `Unexpected status adding an expense: ${body}`).toBe(expectedStatus)
        return expectedStatus === 201 ? ExpenseSchema.parse(await response.json()) : null
    }

    static readonly list = async (context: BrowserContext, dinnerEventId: number, expectedStatus = 200): Promise<Expense[]> => {
        const response = await context.request.get(expensesEndpoint(dinnerEventId), {headers})
        expect(response.status(), 'Unexpected status listing the expenses').toBe(expectedStatus)
        return expectedStatus === 200 ? ExpenseSchema.array().parse(await response.json()) : []
    }

    static readonly remove = async (context: BrowserContext, dinnerEventId: number, expenseId: number, expectedStatus = 200): Promise<Expense | null> => {
        const response = await context.request.delete(`${expensesEndpoint(dinnerEventId)}/${expenseId}`, {headers})
        expect(response.status(), 'Unexpected status removing an expense').toBe(expectedStatus)
        return expectedStatus === 200 ? ExpenseSchema.parse(await response.json()) : null
    }

    // Cleanup by the dinner's chef: a missing line counts as removed
    static readonly cleanupExpenses = async (context: BrowserContext, dinnerEventId: number, expenseIds: number[]): Promise<void> => {
        for (const id of expenseIds) {
            const response = await context.request.delete(`${expensesEndpoint(dinnerEventId)}/${id}`, {headers})
            expect([200, 404], `Unexpected status cleaning up expense ${id}`).toContain(response.status())
        }
    }
}
