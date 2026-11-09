// TypeScript module augmentation for nuxt-auth-utils
// NOTE: Module augmentation with `extends` doesn't properly expand inherited properties.
// See: https://github.com/atinux/nuxt-auth-utils/issues/422
// The session holds its user as JSON: the server reads it through eventHandlerHelper.getSessionUser and the app
// through stores/auth.ts, both parsing it with UserDetailSchema

declare module '#auth-utils' {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User {
    }

    // Server-only: nuxt-auth-utils leaves `secure` out of /api/_auth/session and the server render
    interface SecureSessionData {
        heynaboToken: string
    }

    interface UserSession {
        loggedInAt?: Date
    }
}

export {}
