export function maskPassword(password: string, visibleChars: number = 1): string {
    if (password.length <= visibleChars) return '*'.repeat(password.length);
    return password.slice(0, visibleChars) + '****';
}

// Finds a date corresponding to a weekday in given week in a given year

/** Upper-case the first character, leave the rest alone */
export const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)
