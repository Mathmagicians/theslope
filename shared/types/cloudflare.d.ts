// D1Database is a global from shared/types/worker-configuration.d.ts (`make typegen`, generated from wrangler.toml).
// The `export {}` keeps this file a module so the blocks below augment h3 / nitropack instead of redeclaring them.
export {}

declare module 'h3' {
  interface H3EventContext {
    cloudflare: {
      env: {
        DB: D1Database
      }
    }
  }
}

declare module 'nitropack' {
  interface TaskContext {
    cloudflare?: {
      env?: {
        DB?: D1Database
      }
    }
  }
}
