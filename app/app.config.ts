export default defineAppConfig({
    theslope: {
        defaultCookingDays: ['mandag', 'tirsdag', 'onsdag', 'torsdag'] ,
        ticketIsCancellableDaysBefore: 10,
        diningModeIsEditableMinutesBefore: 90,
        defaultTicketTypes: [
            { type: 'BABY', price: '0', ageLimit: 2 },
            { type: 'BARN', price: '17', ageLimit: 12 },
            { type: 'VOKSEN', price: '40' }],
        defaultSeason: { startWeek: 33, endWeek: 26, holidays: [8, 42, 52]},
        defaultDinnerStartTime: 18,
        holidayUrl: 'https://www.lejre.dk/borger/daginstitution-og-skole/skole/ferieplan-og-lukkedage'
    },
    ui: {
        colors: {
            primary: 'amber',
            neutral: 'blue',
            secondary: "pink",
            info: "violet",
            success: "green",
            warning: "orange",
            error: "red"
        }
    }
})
