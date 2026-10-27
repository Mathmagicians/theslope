// '#imports' resolves here inside the unit project (resolve.alias, vitest.config.ts). The plain-node specs set Nuxt's
// config accessors as globals (vi.stubGlobal, hoistedMocks.stubAppConfig); a composable the server imports names them
// from '#imports' (ADR-017), so each export reads the global the spec set, at call time.
const stubbed = globalThis as unknown as {useAppConfig: () => unknown, useRuntimeConfig: () => unknown}

export const useAppConfig = () => stubbed.useAppConfig()
export const useRuntimeConfig = () => stubbed.useRuntimeConfig()
