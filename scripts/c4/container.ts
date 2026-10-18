/**
 * The C4 container diagram of the deployed system - the Mermaid text of
 * `docs/architecture/c4-container.mmd`.
 *
 * Pure and deterministic: `containerDiagram(deployment)` returns the file's text and touches no disk, so
 * `scripts/c4/generate.ts` reads the configs and writes it, and `make c4-check` compares the committed file
 * against it. A binding is an arrow from its worker to what it reaches, a queue consumer an arrow from the
 * queue into its worker, and a binding kind without a shape here a plain `Container` named by its binding.
 */

type Route = string | {pattern: string}

/** The fields of a worker's wrangler config the diagram reads */
export type WorkerConfig = {
    name: string
    routes?: Route[]
    assets?: {directory?: string}
    triggers?: {crons?: string[]}
    queues?: {consumers?: {queue: string, max_batch_size?: number, max_retries?: number}[]}
}

/** A binding as wrangler's `unstable_convertConfigBindingsToStartWorkerBindings` returns it, with the fields the diagram reads */
export type WorkerBinding = {
    type: string
    database_name?: string
    queue_name?: string
    bucket_name?: string
    allowed_sender_addresses?: string[]
    value?: unknown
}

export type Worker = {
    config: WorkerConfig
    bindings: Record<string, WorkerBinding>
    /** Nitro's `scheduledTasks`: the task names each cron runs */
    scheduledTasks?: Record<string, string | string[]>
}

export type Deployment = {env: string, app: Worker, sender: Worker}

type Shape = 'Container' | 'ContainerDb' | 'ContainerQueue' | 'System_Ext'

type Element = {key: string, alias: string, shape: Shape, label: string, technology?: string}

type Reach = {element: Element, detail?: string, rel: string}

const WORKERS = [['app', 'Nuxt 4 on Workers'], ['sender', 'Nitro on Workers']] as const

const HEYNABO_API = 'NUXT_PUBLIC_HEY_NABO_API'

/** Mermaid lays a boundary out row by row in the order its elements are written */
const DRAWING_ORDER = ['d1', 'queue', 'r2_bucket', 'assets']

const rank = (type: string) => {
    const index = DRAWING_ORDER.indexOf(type)
    return index === -1 ? DRAWING_ORDER.length : index
}

/** A Cloudflare resource is one element per name, whichever worker binds it */
const resource = (alias: string, shape: Shape, technology: string, label: string): Element =>
    ({key: `${alias}:${label}`, alias, shape, label, technology})

const queueElement = (queue: string) => resource('queue', 'ContainerQueue', 'Queues', queue)

/** What a binding reaches; a var reaches nothing but the Heynabo API */
const reachOf = (worker: Worker, name: string, binding: WorkerBinding): Reach | undefined => {
    const bound = {detail: `binding ${name}`, rel: name}
    switch (binding.type) {
        case 'd1':
            return {element: resource('d1', 'ContainerDb', 'D1', binding.database_name ?? name), ...bound}
        case 'queue':
            return {element: queueElement(binding.queue_name ?? name), ...bound}
        case 'r2_bucket':
            return {element: resource('r2', 'ContainerDb', 'R2', binding.bucket_name ?? name), ...bound}
        case 'assets':
            return {
                element: {key: `assets:${worker.config.name}`, alias: 'assets', shape: 'Container', label: name, technology: 'Static assets'},
                detail: worker.config.assets?.directory, rel: name
            }
        case 'send_email':
            return {element: {key: 'mail', alias: 'mail', shape: 'System_Ext', label: 'Email Sending'}, detail: binding.allowed_sender_addresses?.join(', '), rel: name}
        case 'plain_text':
        case 'json':
        case 'secret_text':
            return name === HEYNABO_API
                ? {element: {key: 'heynabo', alias: 'heynabo', shape: 'System_Ext', label: 'Heynabo'}, detail: new URL(String(binding.value)).host, rel: 'HTTPS'}
                : undefined
        default:
            return {
                element: {key: `${worker.config.name}:${name}`, alias: name.toLowerCase().replace(/[^a-z0-9]/g, '_'), shape: 'Container', label: name, technology: binding.type},
                ...bound
            }
    }
}

const routesOf = ({routes = []}: WorkerConfig) => routes.map(route => typeof route === 'string' ? route : route.pattern).join(', ')

const cronsOf = ({config, scheduledTasks = {}}: Worker) => {
    const crons = config.triggers?.crons ?? []
    return crons.length === 0 ? '' : `crons: ${crons.map(cron => [cron, ...[scheduledTasks[cron] ?? []].flat()].join(' ')).join(', ')}`
}

const consumersOf = ({queues}: WorkerConfig) => (queues?.consumers ?? []).map(consumer => [
    `consumes ${consumer.queue}`,
    consumer.max_batch_size === undefined ? '' : `batches of ${consumer.max_batch_size}`,
    consumer.max_retries === undefined ? '' : `${consumer.max_retries} retries`
].filter(Boolean).join(', '))

const describeWorker = (worker: Worker) =>
    [routesOf(worker.config), cronsOf(worker), ...consumersOf(worker.config)].filter(Boolean).join('; ')

const draw = (shape: Shape, alias: string, ...texts: (string | undefined)[]) =>
    `${shape}(${[alias, ...texts.filter(text => text !== undefined).map(text => `"${text}"`)].join(', ')})`

const freeAlias = (taken: Set<string>, alias: string, suffix = 1): string => {
    const candidate = suffix === 1 ? alias : `${alias}_${suffix}`
    return taken.has(candidate) ? freeAlias(taken, alias, suffix + 1) : candidate
}

export const containerDiagram = (deployment: Deployment): string => {
    const workers = WORKERS.map(([alias, technology]) => ({alias, technology, worker: deployment[alias]}))
    const taken = new Set(['user', 'cf', ...workers.map(({alias}) => alias)])
    const elements = new Map<string, Element & {details: string[]}>()
    const rels = ['Rel(user, app, "HTTPS")']

    const place = ({key, alias, ...element}: Element, detail?: string) => {
        const placed = elements.get(key) ?? {key, alias: freeAlias(taken, alias), ...element, details: []}
        taken.add(placed.alias)
        elements.set(key, placed)
        if (detail && !placed.details.includes(detail)) placed.details.push(detail)
        return placed.alias
    }

    workers.forEach(({alias, worker}) => {
        (worker.config.queues?.consumers ?? []).forEach(({queue}) =>
            rels.push(`Rel(${place(queueElement(queue))}, ${alias}, "consumer")`))
        Object.entries(worker.bindings)
            .sort(([, a], [, b]) => rank(a.type) - rank(b.type))
            .flatMap(([name, binding]) => reachOf(worker, name, binding) ?? [])
            .forEach(({element, detail, rel}) => rels.push(`Rel(${alias}, ${place(element, detail)}, "${rel}")`))
    })

    const drawn = [...elements.values()].map(({shape, alias, label, technology, details}) =>
        ({shape, line: draw(shape, alias, label, technology, details.join(', '))}))
    return [
        '%% GENERATED by scripts/c4/generate.ts from the wrangler configs; edits are overwritten',
        'C4Container',
        `    title TheSlope on Cloudflare, ${deployment.env}`,
        '    Person(user, "Member / Chef / Admin")',
        '    System_Boundary(cf, "Cloudflare") {',
        ...workers.map(({alias, technology, worker}) => `        ${draw('Container', alias, worker.config.name, technology, describeWorker(worker))}`),
        ...drawn.filter(({shape}) => shape !== 'System_Ext').map(({line}) => `        ${line}`),
        '    }',
        ...drawn.filter(({shape}) => shape === 'System_Ext').map(({line}) => `    ${line}`),
        ...rels.map(rel => `    ${rel}`),
        ''
    ].join('\n')
}
