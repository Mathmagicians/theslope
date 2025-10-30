import type {UserWithInhabitant} from '~/composables/useUserValidation'

declare module '#auth-utils' {
    interface User extends UserWithInhabitant {}

    interface UserSession {
        loggedInAt?: Date
    }
}

export {}