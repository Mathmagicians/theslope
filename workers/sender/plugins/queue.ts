/**
 * The queue entry point. Nitro's cloudflare_module preset calls this hook from the worker's
 * `queue()` export, wrapped in `context.waitUntil(...)`.
 *
 * The only file in this worker that relies on a Nitro auto-import (`defineNitroPlugin`);
 * everything under utils/ is imported explicitly so plain vitest can load it (ADR-017).
 */
import {consumeBatch} from '~/utils/consumeBatch'

/** nitropack hands the hook `env` as unknown; narrow it to the generated Env by checking the binding it declares. */
const isEnv = (env: unknown): env is Env =>
    typeof (env as Partial<Env> | null)?.EMAIL?.send === 'function'

export default defineNitroPlugin(nitroApp => {
    nitroApp.hooks.hook('cloudflare:queue', ({batch, env}) => {
        // A rejected hook retries the batch: a missing binding is a deploy defect, the messages wait for the fix.
        if (!isEnv(env)) throw new Error('theslope-sender: EMAIL binding missing — check workers/sender/wrangler.toml')
        return consumeBatch(batch, env)
    })
})
