export const HELP_TEXTS = {
    index: {
        title: 'Velkommen til Skråningen',
        content: 'Fællesspisning på Skråningen. Log ind for at se kommende middage, booke pladser og administrere din husstand.'
    },
    chef: {
        title: 'Chefkok',
        content: 'Din oversigt som chefkok. Se dine kommende madlavningsdage, annoncer menuer og hold styr på tilmeldinger og allergier.'
    },
    admin: {
        planning: {
            title: 'Planlægning',
            content: 'Planlæg fællesspisning for hele sæsonen. Opret og rediger sæsoner, definer madlavningsdage og ferier.'
        },
        teams: {
            title: 'Madhold',
            content: 'Administrer madhold og tilmeldinger. Opret teams og fordel beboere på de forskellige madhold.'
        },
        chefs: {
            title: 'Chefkokke',
            content: 'Administrer chefkokke og deres tilgængelighed. Tildel chefkokke til specifikke madlavningsdage.'
        },
        households: {
            title: 'Husstande',
            content: 'Oversigt over alle husstande på Skråningen. Se beboere, allergier og administrer flytninger og husstandsændringer.'
        },
        allergies: {
            title: 'Allergier',
            content: 'Administrer allergier og fødevareintoleranser for alle beboere. Opret og rediger allergioplysninger til brug ved madlavning.'
        },
        users: {
            title: 'Brugere',
            content: 'Her ser du brugere der har login til systemet. De importeres fra Heynabo med samme brugernavn og password. Du kan se hvilke systemroller hver bruger har, og opdatere listen ved at trykke på importknappen.'
        },
        economy: {
            title: 'Økonomi',
            content: 'Økonomisk overblik over fællesspisningen. Se chefkokkebudgetter, basisvarebudgetter og forbered inberetning til PBS.'
        },
        settings: {
            title: 'Indstillinger',
            content: 'Systemindstillinger for fællesspisningen. Administrer globale præferencer og konfigurationer.'
        }
    },
    household: {
        members: {
            title: 'Medlemmer',
            content: '⚡ Power mode opdaterer alle medlemmer samtidigt • ✏️ Klik på blyanten for at redigere enkeltpersoner • ▼ Udvid rækken for at se valgmuligheder • Ændringer gemmes når du trykker på GEM, og påvirker fremtidige bookinger'
        },
        bookings: {
            title: 'Bookinger',
            content: 'Se og administrer dine bookinger til fællesspisning. Book måltider for din husstand og se kommende arrangementer.'
        },
        allergies: {
            title: 'Allergier',
            content: 'Administrer allergier og fødevareintoleranser for din husstand. Tilføj og opdater allergioplysninger for hver beboer.'
        },
        settings: {
            title: 'Indstillinger',
            content: 'Administrer indstillinger for din husstand. Opdater beboeroplysninger og præferencer.'
        },
        economy: {
            title: 'Økonomi',
            content: 'Se økonomisk oversigt for din husstand. Følg udgifter til fællesspisning og se fakturaer.'
        }
    }
} as const
