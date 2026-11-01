/**
 * The user words: what admins read on the users page, and a member's own preferences in Mine indstillinger.
 * Plain module without auto-imports (ADR-017).
 */
import {useUserPreferenceValidation, type NotificationChannel, type Palette, type TextScale, type PALETTES} from '~/composables/useUserPreferenceValidation'
// Type only: useCoreValidation reads the sign-in words from here, so a value import would close a cycle
import type {SystemRole} from '~/composables/useCoreValidation'
import {BUTTON_WORDS} from '~/config/buttonWords'

const {NotificationChannelSchema, PaletteSchema, TextScaleSchema} = useUserPreferenceValidation()
const Channel = NotificationChannelSchema.enum
const PaletteKey = PaletteSchema.enum
const TextScaleKey = TextScaleSchema.enum

/** A contrast level the palette registry verifies a palette at */
type ContrastLevel = NonNullable<typeof PALETTES[Palette]['level']>

export const USER_WORDS = {
    /** A signed-in user without an inhabitant: the header's greeting and the name on the admin's users page */
    unknownUser: 'Ukendt bruger',
    /** A system role's name on its badge: the admin's users page and a member's card */
    roles: {
        ADMIN: 'Admin',
        ALLERGYMANAGER: 'Allergichef'
    } satisfies Record<SystemRole, string>,
    /**
     * The sign-in page: the form's title and button, its fields and the rule of the mail field (an empty password reads
     * the password field's placeholder), a failed sign-in as its toast and the form's alert say it; once signed in, the
     * greeting, the heading over the ways in and each way in's card
     */
    login: {
        signIn: 'Log ind',
        email: {label: 'Email', placeholder: 'Indtast den email, du er oprettet i Heynabo med', invalid: 'Indtast den mail, du er registreret med i Heynabo'},
        password: {label: 'Adgangskode', placeholder: 'Indtast din Heynabo adgangskode'},
        failedTitle: 'Login mislykkedes',
        failed: 'Vi kunne ikke logge dig på, prøv igen. Du skal bruge dit Heynabo brugernavn og password.',
        greeting: (name: string) => `Hej ${name}! 👋`,
        waysIn: 'Hvad vil du lave i dag?',
        dinner: {title: 'Fællesspisning', description: 'Se menuer og bestil billetter til kommende middage', open: 'Se kalender'},
        household: {title: 'Min husstand', description: 'Administrer madpræferencer og allergier for din familie', open: 'Gå til husstand'},
        team: {title: 'Mit madhold', description: 'Se hvornår du skal lave mad og koordiner med dit hold', open: 'Se madhold'}
    },
    /**
     * A member's card: the name of the settings toggle, sign-out, and the system roles section: its title, the mark on a
     * role Heynabo owns, the help panel's title and its line per role
     */
    profile: {
        settings: 'Indstillinger',
        logout: 'Log ud',
        roles: {
            title: 'Systemroller',
            heynaboOwned: `(${BUTTON_WORDS.heynabo.name})`,
            helpTitle: 'Om systemroller',
            help: {
                ADMIN: `Synkroniseres fra ${BUTTON_WORDS.heynabo.name}, kan ikke ændres her`,
                ALLERGYMANAGER: 'Giver adgang til at administrere allergidata'
            } satisfies Record<SystemRole, string>
        }
    },
    /**
     * Mine indstillinger: the card's title and section headings, its options and the badges a palette earns, the toast of
     * a save, and the toasts of a test message sent and of one this environment cannot send
     */
    preferences: {
        title: 'Mine indstillinger',
        saved: 'Indstillinger gemt',
        testSent: 'Testbesked afsendt – tjek din indbakke/telefon',
        testUnavailable: 'Notifikationer er ikke sat op i dette miljø',
        notifications: 'Notifikationer',
        palette: 'Farvevalg',
        textScale: 'Tekst',
        sendTest: 'Send testbesked',
        smsNeedsPhone: 'SMS kræver telefonnummer i Heynabo',
        channels: {
            [Channel.EMAIL]: 'E-mail',
            [Channel.SMS]: 'SMS'
        } satisfies Record<NotificationChannel, string>,
        palettes: {
            [PaletteKey.default]: 'Glade farver',
            [PaletteKey['high-contrast']]: 'Høj kontrast',
            [PaletteKey.colorblind]: 'Til farveblinde'
        } satisfies Record<Palette, string>,
        textScales: {
            [TextScaleKey.normal]: 'Normal',
            [TextScaleKey.large]: 'Stor',
            [TextScaleKey.larger]: 'Større'
        } satisfies Record<TextScale, string>,
        // The contrast badge claims contrast only - not full conformance - and names no WCAG version
        levelBadges: {
            AA: '🇪🇺 EN 301 549 · Kontrast AA ✓',
            AAA: '🇪🇺 EN 301 549 · Kontrast AAA ✓'
        } satisfies Record<ContrastLevel, string>,
        colourSafeBadge: '👁 Nedsat farvesyn · Okabe–Ito ✓'
    },
    /**
     * The admin's users page: its header's title and intro, the search field, the table's columns (the sort reads the name
     * column's word) and caption, and a failed read of the users
     */
    admin: {
        title: 'Brugere',
        intro: 'Her kan du se de brugere, som vi har importeret fra Heynabo. Du kan også se, hvilke systemroller brugerne har. Brug System-fanen til at køre Heynabo import.',
        caption: 'Brugere - importeret fra Heynabo',
        search: 'Søg efter navn eller email...',
        columns: {name: 'Navn', email: 'Mail', phone: 'Telefon', systemRoles: 'Systemroller', updatedAt: 'Sidst opdateret'},
        failed: 'Kunne ikke loade bruger data 🤖'
    },
    /** The toast of a saved role change */
    toasts: {
        rolesUpdated: {
            title: 'Roller opdateret',
            description: 'Brugerens roller er blevet opdateret'
        }
    }
} as const
