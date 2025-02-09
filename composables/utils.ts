export function maskPassword(password: string): string {
    if (password.length <= 1) return password;
    return password[0] + '*'.repeat(password.length - 1);
}
