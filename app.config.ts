export default defineAppConfig({
    theslope: {
        cookingDays: ['MANDAG', 'TIRSDAG', 'ONSDAG', 'TORSDAG'],
        defaultTicketTypes: [
            { type: 'BABY', price: '0', limit: 2 },
            { type: 'BARN', price: '17', limit: 12 },
            { type: 'VOKSEN', price: '40' }],
        defaultSeason: { startWeek: 33, endWeek: 26, holidays: [8, 42, 52]},
        holidayUrl: 'https://www.lejre.dk/borger/daginstitution-og-skole/skole/ferieplan-og-lukkedage'
    },
    ui: {
        primary: 'amber', //amber-500
        gray: 'blue', //blue-curacao-400
    }
})
