// The `export {}` keeps this file a module, which makes the block below augment the Nuxt app instance.
export {}

declare module '#app' {
  interface NuxtApp {
    // Pending URL writes from useQueryParam, one after another
    _urlWrites?: Promise<unknown>
  }
}
