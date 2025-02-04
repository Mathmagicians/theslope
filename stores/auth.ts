export const useAuthStore = defineStore("Auth", () => {
    const {loggedIn, user, session, clear, fetch} = useUserSession();
    const signIn = async (email: string, password: string) => {
        await $fetch("/api/auth/login", {
            method: "POST",
            body: {email: email, password: password},
            headers: {ContentType: 'application/json'}
        }) //talks with the api and performs a login
        await fetch(); //fetches the user session from the secure browser storage

    }

    const greeting = computed(() => user?.value?.Inhabitant?.name || 'Ukendt bruger')

    const avatar = computed(() => user?.value?.Inhabitant?.pictureUrl)

    return {signIn, greeting, avatar, loggedIn, user, session, clear, fetch}
})

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}


// CLAUDE import { defineStore } from 'pinia'
// import { useAuth } from '#auth'
//
// interface AuthState {
//   error: string | null
//   isLoading: boolean
// }
//
// interface ApiError {
//   statusCode: number
//   message: string
// }
//
// export const useAuthStore = defineStore('auth', {
//   state: (): AuthState => ({
//     error: null,
//     isLoading: false
//   }),
//
//   getters: {
//     isLoggedIn(): boolean {
//       const auth = useAuth()
//       return auth.status.value === 'authenticated'
//     },
//
//     userEmail(): string | null {
//       const auth = useAuth()
//       return auth.user.value?.email as string | null
//     }
//   },
//
//   actions: {
//     getErrorMessage(error: any): string {
//       if (!error.response) {
//         return 'Ingen forbindelse til serveren. Tjek din internetforbindelse.'
//       }
//
//       const statusCode = error.response.status
//
//       switch (statusCode) {
//         case 400:
//           return 'Ugyldig email eller adgangskode format.'
//         case 404:
//           return 'Kontoen findes ikke.'
//         case 500:
//           return 'Der opstod en serverfejl. Prøv igen senere.'
//         case 503:
//           return 'Servicen er midlertidigt utilgængelig. Prøv igen senere.'
//         default:
//           return 'Der opstod en uventet fejl. Prøv igen senere.'
//       }
//     },
//
//     async login(email: string, password: string) {
//       const auth = useAuth()
//       this.isLoading = true
//       this.error = null
//
//       try {
//         await auth.signIn({
//           email,
//           password,
//         })
//
//         console.log('🔑> Login lykkedes')
//         return true
//       } catch (error: any) {
//         console.error('🔑 Login mislykkedes:', error)
//         this.error = this.getErrorMessage(error)
//         return false
//       } finally {
//         this.isLoading = false
//       }
//     },
//
//     async logout() {
//       const auth = useAuth()
//       this.isLoading = true
//       this.error = null
//
//       try {
//         await auth.signOut()
//
//         console.log('🔑> Logout lykkedes')
//         return true
//       } catch (error: any) {
//         console.error('🔑 Logout mislykkedes:', error)
//         this.error = this.getErrorMessage(error)
//         return false
//       } finally {
//         this.isLoading = false
//       }
//     }
//   }
// })
//
