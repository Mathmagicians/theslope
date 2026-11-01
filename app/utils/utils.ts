export const maskPassword = (password: string, visibleChars: number = 1): string =>
    password.length <= visibleChars ? '*'.repeat(password.length) : password.slice(0, visibleChars) + '****'

/** Upper-case the first character, leave the rest alone */
export const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

/** Kuverter in Danish notation: 1,5 */
export const formatPortions = (portions: number): string => portions.toLocaleString('da-DK')

/** UTable's getRowId by the row's id: UTable keys a row by its index otherwise, so an open row would follow its index when rows come in above it */
export const rowIdOf = <Row extends {id: number | string}>(row: Row): string => String(row.id)

/** The row UTable keys by this row id (rowIdOf) */
export const findRowById = <Row extends {id: number | string}>(rows: Row[], rowId: string): Row | undefined =>
    rows.find(row => rowIdOf(row) === rowId)

/** UTable's getRowId for a row per dinner, by the dinner's id (rowIdOf) */
export const dinnerRowIdOf = <Row extends {dinnerEvent: {id: number}}>(row: Row): string => String(row.dinnerEvent.id)
