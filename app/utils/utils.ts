export function maskPassword(password: string, visibleChars: number = 1): string {
    if (password.length <= visibleChars) return '*'.repeat(password.length);
    return password.slice(0, visibleChars) + '****';
}

// Finds a date corresponding to a weekday in given week in a given year
