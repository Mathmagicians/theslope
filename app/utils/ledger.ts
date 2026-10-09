/**
 * Ledger amounts are DKK øre. A dinner's cost is the sum of its expense rows, computed where the rows are read
 * (the repository), so no stored total exists to drift from them.
 */
export const sumAmounts = (rows: ReadonlyArray<{amount: number}> | null | undefined): number =>
    (rows ?? []).reduce((sum, row) => sum + row.amount, 0)
