export const HELP_TEXTS = {
    index: {
        title: 'Velkommen til Skråningen',
        content: '🍽️ Fællesspisning på Skråningen. Log ind for at se kommende middage, booke pladser og administrere din husstand.'
    },
    dinner: {
        title: 'Middagskalenderen',
        content: '🗓️ Se alle kommende fællesspisninger. Klik på en dato for at se menu, tilmeldinger og madhold. Du kan også ændre mellem almindelig fællesspisning, takeaway og sen spisning for din husstand, ændre framelding/tilmelding for en given dato, tilmelde en gæst, eller købe andres billetter som er sat til salg.'
    },
    chef: {
        title: 'Chefkok',
        content: '👨‍🍳 Din oversigt som chefkok. Se dine kommende madlavningsdage, annoncer menuer og hold styr på tilmeldinger og allergier.'
    },
    admin: {
        planning: {
            title: 'Planlægning',
            content: '📅 Planlæg fællesspisning for hele sæsonen. Opret og rediger sæsoner, definer madlavningsdage og ferier.'
        },
        teams: {
            title: 'Madhold',
            content: '👥 Administrer madhold og tilmeldinger. Opret teams og fordel beboere på de forskellige madhold.'
        },
        chefs: {
            title: 'Chefkokke',
            content: '👨‍🍳 Administrer chefkokke og deres tilgængelighed. Tildel chefkokke til specifikke madlavningsdage.'
        },
        households: {
            title: 'Husstande',
            content: '🏠 Oversigt over alle husstande på Skråningen. Se beboere, allergier og administrer flytninger og husstandsændringer.'
        },
        allergies: {
            title: 'Allergier',
            content: '⚠️ Administrer allergier og fødevareintoleranser for alle beboere. Opret og rediger allergioplysninger til brug ved madlavning.'
        },
        users: {
            title: 'Brugere',
            content: '👤 Her ser du brugere med login til systemet. 🔄 De importeres fra Heynabo med samme brugernavn og password. 🛡️ Du kan se systemroller og opdatere listen via importknappen.'
        },
        economy: {
            title: 'Økonomi',
            content: '💰 Økonomisk overblik over fællesspisningen. Se chefkokkebudgetter, basisvarebudgetter og forbered inberetning til PBS.'
        },
        settings: {
            title: 'Indstillinger',
            content: '⚙️ Systemindstillinger for fællesspisningen. Administrer globale præferencer og konfigurationer.'
        },
        system: {
            title: 'Systemjobs',
            content: '⚙️ Alle jobs kører automatisk efter tidsplan - du kan altid trygt genkøre dem manuelt. 🔄 Daglig vedligeholdelse lukker ordrer og opretter transaktioner. 💳 Månedlig fakturering genererer PBS-filer. 👥 Heynabo import synkroniserer husstande og beboere. 📋 Jobhistorik viser tidligere kørsler og eventuelle fejl.'
        }
    },
    household: {
        bookings: {
            title: 'Tilmeldinger',
            content: '🎫 Se og administrer dine bookinger til fællesspisning. Book måltider for din husstand og se kommende arrangementer.'
        },
        members: {
            title: 'Præferencer',
            content: '⚡ Power mode opdaterer alle medlemmer samtidigt. ✏️ Klik på blyanten for at redigere enkeltpersoner. ▼ Udvid rækken for at se valgmuligheder. 💾 Ændringer gemmes når du trykker Gem.'
        },
        allergies: {
            title: 'Allergier',
            content: '⚠️ Administrer allergier og fødevareintoleranser for din husstand. Tilføj og opdater allergioplysninger for hver beboer.'
        },
        economy: {
            title: 'Økonomi',
            content: '💰 Se økonomisk oversigt for din husstand. Følg udgifter til fællesspisning og se fakturaer.'
        },
        settings: {
            title: 'Indstillinger',
            content: '⚙️ Administrer indstillinger for din husstand. Opdater beboeroplysninger og præferencer.'
        }
    },
    login : {
        title: 'Velkommen til Theslope',
        content: '👋 Velkommen til Skråningens system for fællesspisning! 🍽️ Book billetter til middage. 🏠 Administrer din husstand. 👨‍🍳 Se dit madholds tjanser og afregning.'
    }
} as const
