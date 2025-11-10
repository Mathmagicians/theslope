export const HELP_TEXTS = {
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
    }
} as const
