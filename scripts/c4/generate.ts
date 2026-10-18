/**
 * C4 container diagram generator - the Mermaid text of `docs/architecture/c4-container.mmd`.
 *
 *     JITI_NATIVE_MODULES='["wrangler"]' npx jiti scripts/c4/generate.ts [file]     # or: make c4, make c4-check
 *
 * Reads the prod environment of `wrangler.toml` and `workers/sender/wrangler.toml` through wrangler, and the
 * task each cron runs from `nitro.scheduledTasks` in `nuxt.config.ts`. The text comes from `containerDiagram`
 * in `scripts/c4/container.ts`, which is pure - this file owns the configs and the output: the file named by
 * the argument, else stdout.
 */

import {writeFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {unstable_convertConfigBindingsToStartWorkerBindings, unstable_readConfig} from 'wrangler'
import {containerDiagram, type Worker} from './container'

const ENV = 'prod'

const repoPath = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url))

const workerOf = (configPath: string, scheduledTasks?: Worker['scheduledTasks']): Worker => {
    const config = unstable_readConfig({config: repoPath(configPath), env: ENV}, {hideWarnings: true})
    return {config, bindings: unstable_convertConfigBindingsToStartWorkerBindings(config) ?? {}, scheduledTasks}
}

// A computed specifier keeps nuxt.config.ts out of the app typecheck project, which excludes it; ts:node checks it
const {default: nuxtConfig} = await import(repoPath('nuxt.config.ts'))

const diagram = containerDiagram({
    env: ENV,
    app: workerOf('wrangler.toml', nuxtConfig.nitro?.scheduledTasks),
    sender: workerOf('workers/sender/wrangler.toml')
})

const [file] = process.argv.slice(2)
if (file) writeFileSync(file, diagram, 'utf8')
else process.stdout.write(diagram)
