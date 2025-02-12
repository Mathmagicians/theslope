export default defineAppConfig({
    theslope: {
        defaultWeeklyDinners: ['MANDAG', 'TIRSDAG', 'ONSDAG', 'TORSDAG'],
        defaultTicketTypes: [
            { type: 'BABY', price: '0', limit: 2 },
            { type: 'BARN', price: '17', limit: 12 },
            { type: 'VOKSEN', price: '40' }],
        defaultSeason: { startWeek: 33, endWeek: 26, holidays: [8, 42, 52]}
    },
    ui: {
        primary: 'amber', //amber-500
        gray: 'blue', //blue-curacao-400
    }
})
