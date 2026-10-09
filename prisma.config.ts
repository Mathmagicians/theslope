import {defineConfig} from 'prisma/config'

// The CLI's config: Migrate diffs against the local sqlite file; the app connects through the D1 adapter
export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {path: 'prisma/migrations'},
    datasource: {url: 'file:./prisma/dev.db'}
})
