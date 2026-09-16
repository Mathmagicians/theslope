// D1Database is a global from shared/types/worker-configuration.d.ts (`make typegen`, generated from wrangler.toml).
// The `export {}` keeps this file a module, which makes the blocks below augment h3 / nitropack.
export {}

declare module 'h3' {
  interface H3EventContext {
    cloudflare: {
      env: {
        DB: D1Database
        SENDER: Queue
      }
    }
  }
}

declare module 'nitropack' {
  interface TaskContext {
    cloudflare?: {
      env?: {
        DB?: D1Database
        SENDER?: Queue
      }
    }
  }
}
