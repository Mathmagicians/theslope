import {fileURLToPath} from 'node:url'
import {defineNuxtConfig} from 'nuxt/config'
import {nitroBase} from '../workers/common/cloudflare'

// Everything generated lives under .output/developer (gitignored); the Make targets read the same paths
const output = (path: string) => fileURLToPath(new URL(`../.output/developer/${path}`, import.meta.url))
const repo = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url))

export default defineNuxtConfig({
    compatibilityDate: nitroBase.compatibilityDate,
    ssr: true,
    modules: ['@nuxt/content', '@nuxt/ui'],
    buildDir: output('.nuxt'),
    css: ['~/assets/css/main.css'],
    app: {
        head: {title: 'TheSlope developer'}
    },
    // The environment pages render in the browser from the manifests a deploy writes, served through GitHub Pages'
    // 404.html fallback; Nitro's matcher counts /environments under /environments/**, so the index names its own rule
    routeRules: {
        '/environments': {prerender: true},
        '/environments/**': {prerender: false}
    },
    content: {
        _localDatabase: {type: 'sqlite', filename: output('contents.sqlite')},
        database: {type: 'sqlite', filename: output('contents.sqlite')},
        experimental: {sqliteConnector: 'native'}
    },
    experimental: {chromeDevtoolsProjectSettings: false},
    nitro: {
        output: {dir: output('nitro'), publicDir: output('public')},
        prerender: {crawlLinks: true, failOnError: false},
        // The guides' images, referenced from docs/*.md as screenshots/<area>/<name>.png
        publicAssets: [{dir: repo('docs/screenshots'), baseURL: '/docs/screenshots'}]
    }
})
