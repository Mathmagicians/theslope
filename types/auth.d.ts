// TypeScript module augmentation for nuxt-auth-utils
// NOTE: Module augmentation with `extends` doesn't properly expand inherited properties.
// See: https://github.com/atinux/nuxt-auth-utils/issues/422
// SOLUTION: Use type casting in code where User properties are accessed
// Example: const user = session.user as UserDetail & {passwordHash: string}

declare module '#auth-utils' {
    interface User {
        // Properties are defined via type casting in actual usage
        // See: server/middleware/guard.ts, server/routes/api/team/my.get.ts
    }

    interface UserSession {
        loggedInAt?: Date
    }
}

export {}