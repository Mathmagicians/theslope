import {describe, expect, it} from 'vitest'
import {containerDiagram, type Deployment, type WorkerBinding} from '../../../scripts/c4/container'

type WorkerAlias = 'app' | 'sender'

/** Every binding of the fixture with the element and the relation it draws */
const BINDINGS: {worker: WorkerAlias, name: string, binding: WorkerBinding, element: string, rel: string}[] = [
    {
        worker: 'app', name: 'DB', binding: {type: 'd1', database_name: 'db-prod'},
        element: 'ContainerDb(d1, "db-prod", "D1", "binding DB")', rel: 'Rel(app, d1, "DB")'
    },
    {
        worker: 'app', name: 'SENDER', binding: {type: 'queue', queue_name: 'mail-prod'},
        element: 'ContainerQueue(queue, "mail-prod", "Queues", "binding SENDER")', rel: 'Rel(app, queue, "SENDER")'
    },
    {
        worker: 'app', name: 'ARCHIVE', binding: {type: 'r2_bucket', bucket_name: 'archive-prod'},
        element: 'ContainerDb(r2, "archive-prod", "R2", "binding ARCHIVE")', rel: 'Rel(app, r2, "ARCHIVE")'
    },
    {
        worker: 'app', name: 'ASSETS', binding: {type: 'assets'},
        element: 'Container(assets, "ASSETS", "Static assets", "./public/")', rel: 'Rel(app, assets, "ASSETS")'
    },
    {
        worker: 'app', name: 'NUXT_PUBLIC_HEY_NABO_API', binding: {type: 'plain_text', value: 'https://hn.example.org/api'},
        element: 'System_Ext(heynabo, "Heynabo", "hn.example.org")', rel: 'Rel(app, heynabo, "HTTPS")'
    },
    {
        worker: 'app', name: 'CACHE', binding: {type: 'kv_namespace'},
        element: 'Container(cache, "CACHE", "kv_namespace", "binding CACHE")', rel: 'Rel(app, cache, "CACHE")'
    },
    {
        worker: 'sender', name: 'EMAIL', binding: {type: 'send_email', allowed_sender_addresses: ['no-reply@example.org']},
        element: 'System_Ext(mail, "Email Sending", "no-reply@example.org")', rel: 'Rel(sender, mail, "EMAIL")'
    }
]

const bindingsOf = (worker: WorkerAlias) =>
    Object.fromEntries(BINDINGS.filter(row => row.worker === worker).map(({name, binding}) => [name, binding]))

const DEPLOYMENT: Deployment = {
    env: 'prod',
    app: {
        config: {
            name: 'app-prod',
            routes: [{pattern: 'www.example.org/*'}],
            assets: {directory: './public/'},
            triggers: {crons: ['0 1 * * *', '0 2 * * *']}
        },
        bindings: bindingsOf('app'),
        scheduledTasks: {'0 2 * * *': ['daily-maintenance']}
    },
    sender: {
        config: {
            name: 'sender-prod',
            routes: ['www.example.org/sender/*'],
            queues: {consumers: [{queue: 'mail-prod', max_batch_size: 10, max_retries: 3}]}
        },
        bindings: bindingsOf('sender')
    }
}

const lines = containerDiagram(DEPLOYMENT).split('\n').map(line => line.trim())
const lineStarting = (prefix: string) => lines.find(line => line.startsWith(prefix))

describe('containerDiagram', () => {
    it.each(BINDINGS)('draws $worker binding $name as an element and a relation from its worker', ({element, rel}) => {
        expect(lines).toContain(element)
        expect(lines).toContain(rel)
    })

    it('labels a cron with the task it runs', () => {
        expect(lineStarting('Container(app,')).toContain('crons: 0 1 * * *, 0 2 * * * daily-maintenance')
    })

    it('draws the consumed queue once, with the arrow into the consumer', () => {
        expect(lines.filter(line => line.startsWith('ContainerQueue('))).toHaveLength(1)
        expect(lines).toContain('Rel(queue, sender, "consumer")')
        expect(lineStarting('Container(sender,')).toContain('consumes mail-prod, batches of 10, 3 retries')
    })

    it('renders the same text for the same deployment', () => {
        expect(containerDiagram(structuredClone(DEPLOYMENT))).toBe(containerDiagram(DEPLOYMENT))
    })
})
