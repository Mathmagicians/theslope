export default defineAppConfig({
    theslope: {
        defaultSeason: {
            startWeek: 33,
            endWeek: 26,
            holidays: [8, 42, 52],
            cookingDays: ['mandag', 'tirsdag', 'onsdag', 'torsdag'] ,
            ticketIsCancellableDaysBefore: 10,
            diningModeIsEditableMinutesBefore: 90,
            ticketPrices: [
                { ticketType: 'BABY', description: 'Babyer spiser gratis smagsprøver fra forældrene', price: 0, maximumAgeLimit: 2 },
                { ticketType: 'BABY', description: 'Til en meget sulten baby, kan man godt bestille en 1/4 kuvert', price: 900, maximumAgeLimit: 2 },
                { ticketType: 'CHILD', price: 1700, maximumAgeLimit: 12 },
                { ticketType: 'ADULT', price: 4000 }],
            consecutiveCookingDays: 2
        },
        defaultDinnerStartTime: 18,
        holidayUrl: 'https://www.lejre.dk/borger/daginstitution-og-skole/skole/ferieplan-og-lukkedage'
    },
    ui: {
        colors: {
            primary: 'amber',
            neutral: 'sky',
            secondary: "pink",
            info: "violet",
            success: "green",
            warning: "orange",
            error: "red",
            // Pantone team colors (defined in main.css)
            winery: "winery",
            party: "party",
            peach: "peach",
            caramel: "caramel",
            ocean: 'blue'
        }
    }
})
