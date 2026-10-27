// The `export {}` keeps this file a module, which makes the block below augment the Nuxt app instance.
import type {UrlWriteBatch} from './url-writes'

export {}

declare module '#app' {
  interface NuxtApp {
    // The URL writes of the current tick and the navigation they produce (useUrlQueryWriter)
    _urlWrites?: UrlWriteBatch
    // The page's clock ticks once per app (useClock)
    _clockStarted?: boolean
  }
}
