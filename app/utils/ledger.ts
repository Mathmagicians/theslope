export const sumBy = <T>(items: ReadonlyArray<T>, weigh: (item: T) => number): number =>
    items.reduce((sum, item) => sum + weigh(item), 0)

/**
 * Ledger amounts are DKK øre. A dinner's cost is the sum of its expense rows, computed where the rows are read
 * (the repository), so no stored total exists to drift from them.
 */
export const sumAmounts = (rows: ReadonlyArray<{amount: number}> | null | undefined): number =>
    sumBy(rows ?? [], row => row.amount)
