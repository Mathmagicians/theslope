// '@playwright/test' resolves here inside the vitest projects (resolve.alias, vitest.config.ts).
// Component and worker specs import the e2e factories for their DATA builders only; the factories'
// HTTP methods assert with playwright's expect and run under playwright alone. The eager playwright
// import otherwise lands in the nuxt test runtime's module graph, where the module runner fetches
// it against the happy-dom origin after the run (ECONNREFUSED noise).
export const expect = (): never => {
    throw new Error('Factory HTTP methods are e2e-only - call them from tests/e2e under playwright')
}
