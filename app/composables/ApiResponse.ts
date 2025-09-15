import type { InternalApi } from 'nitropack'
export type ApiRoutes = keyof InternalApi

export type ApiResponse<T extends ApiRoutes, M extends keyof InternalApi[T]> = InternalApi[T][M]
//from https://jamiecurnow.medium.com/nuxt-3-server-routes-and-typescript-4fa361d738a3
export const apiRef = <T extends ApiRoutes, M extends keyof InternalApi[T], D>(opts: {
    route: T
    method: M
    defaultValue: D
}) => ref<ApiResponse<T, M> | D>(opts.defaultValue)
