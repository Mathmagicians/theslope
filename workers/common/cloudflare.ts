/**
 * Build settings shared by every worker in this repo. Plain TypeScript with zero imports, so
 * `nuxt.config.ts`, every worker's `nitro.config.ts` and plain vitest can all load it.
 * Resource names live in each worker's wrangler.toml and reach code through bindings and `[vars]`.
 */

/** Bumping this is a separate, verified step for every worker at once. */
export const COMPATIBILITY_DATE = '2026-09-16'

export const COMPATIBILITY_FLAGS = ['nodejs_compat'] as const

/** The values `ENVIRONMENT` may take in a worker's `[vars]`; the sender validates against it at startup. */
export const ENVIRONMENTS = ['local', 'dev', 'prod'] as const

export type Environment = typeof ENVIRONMENTS[number]

/** Nitro settings every worker builds on; one import keeps preset and date identical across workers. */
export const nitroBase = {
    preset: 'cloudflare_module',
    compatibilityDate: COMPATIBILITY_DATE,
    typescript: {strict: true}
} as const
