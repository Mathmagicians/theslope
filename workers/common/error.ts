/**
 * The text of a thrown value for a log line or a job run record. Shared by the app (server) and the sender.
 */

/** A thrown value as a log line reads it: an Error by its message, anything else as text */
export const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error)
