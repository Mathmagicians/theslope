import {fileURLToPath} from 'node:url'
import {defineCollection, defineContentConfig} from '@nuxt/content'

export default defineContentConfig({
    collections: {
        // The repository's top-level docs, read in place
        docs: defineCollection({
            type: 'page',
            source: {cwd: fileURLToPath(new URL('../docs', import.meta.url)), include: '*.md', prefix: '/docs'}
        })
    }
})
