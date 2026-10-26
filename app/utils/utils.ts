export function maskPassword(password: string, visibleChars: number = 1): string {
    if (password.length <= visibleChars) return '*'.repeat(password.length);
    return password.slice(0, visibleChars) + '****';
}

// Finds a date corresponding to a weekday in given week in a given year

/** Upper-case the first character, leave the rest alone */
export const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

/** Kuverter in Danish notation: 1,5 */
export const formatPortions = (portions: number): string => portions.toLocaleString('da-DK')

/** UTable's getRowId by the row's id: UTable keys a row by its index otherwise, so an open row would follow its index when rows come in above it */
export const rowIdOf = <Row extends {id: number | string}>(row: Row): string => String(row.id)

/** UTable's getRowId for a row per dinner, by the dinner's id (rowIdOf) */
export const dinnerRowIdOf = <Row extends {dinnerEvent: {id: number}}>(row: Row): string => String(row.dinnerEvent.id)
