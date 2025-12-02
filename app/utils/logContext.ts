/**
 * Log context helper - adds SSR/CSR prefix to console logs
 * Helps distinguish server-side vs client-side execution in logs
 */
export const LOG_CTX = import.meta.server ? '[SSR]' : '[CSR]'