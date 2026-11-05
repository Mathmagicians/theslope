export const sumBy = <T>(items: ReadonlyArray<T>, weigh: (item: T) => number): number =>
    items.reduce((sum, item) => sum + weigh(item), 0)

/**
 * Ledger amounts are DKK øre. A dinner's cost is the sum of its expense rows, computed where the rows are read
 * (the repository), so no stored total exists to drift from them.
 */
export const sumAmounts = (rows: ReadonlyArray<{amount: number}> | null | undefined): number =>
    sumBy(rows ?? [], row => row.amount)

/** A kroner amount as whole øre; the round absorbs the float error of the multiplication (19.99 × 100 is 1998.999…) */
export const krToOre = (amountKr: number): number => Math.round(amountKr * 100)
