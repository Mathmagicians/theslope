// Helpers of a case's lists and of the values it expects present. The module imports no Nuxt runtime, so a node unit
// spec imports it as a component spec does

/** The item at an index of a list the case reads or builds; a missing one fails the case by its index */
export const itemAt = <T>(items: readonly T[], index: number): T => {
    const item = items.at(index)
    if (item === undefined) throw new Error(`No item at ${index} of ${items.length}`)
    return item
}

/** A value the case reads and expects present; a missing one fails the case by its name */
export const present = <T>(value: T | null | undefined, name: string): T => {
    if (value === null || value === undefined) throw new Error(`No ${name}`)
    return value
}
