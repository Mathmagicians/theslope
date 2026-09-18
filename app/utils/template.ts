/**
 * `{{placeholder}}` substitution for notification templates (app.config `theslope.notifications`).
 * A placeholder without a value throws: a template bug fails in tests, never in a resident's mailbox.
 */
const PLACEHOLDER = /\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g

export const fillTemplate = (template: string, values: Record<string, string>): string =>
    template.replace(PLACEHOLDER, (_match, name: string) => {
        const value = values[name]
        if (value === undefined) throw new Error(`Template placeholder without value: ${name}`)
        return value
    })

/** The placeholder names a template uses, for checking that a producer's values are all consumed */
export const templatePlaceholders = (template: string): string[] =>
    [...template.matchAll(PLACEHOLDER)].map(match => match[1]!)
