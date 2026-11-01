// Helpers of a case's lists. The module imports no Nuxt runtime, so a node unit spec imports it as a component spec does

/** The item at an index of a list the case reads or builds; a missing one fails the case by its index */
export const itemAt = <T>(items: readonly T[], index: number): T => {
    const item = items.at(index)
    if (item === undefined) throw new Error(`No item at ${index} of ${items.length}`)
    return item
}
