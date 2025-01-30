// see members of household

import {defineEventHandler} from "h3";

const exampleHousehold = {
    heynaboId: 2,
    movedInDate: '2019-06-25T00:00:00.000Z',
    moveOutDate: '9999-06-25T00:00:00.000Z',
    pbsId: 0,
    name: 'HHHeHyHnHaHbHoHH',
    address: 'Heynabo! ',
    inhabitants:
        [{
            heynaboId: 1,
            pictureUrl: 'https://prod-space.s3.fr-par.scw.cloud/demo/AVATAR/642bd3404f7f7.jpeg',
            name: 'Support',
            lastName: 'Heynabo!',
            birthDate: '2015-08-21T00:00:00.000Z',
            user: [Object]
        },
            {
                heynaboId: 55,
                pictureUrl: '',
                name: 'Martin',
                lastName: 'Elneff',
                birthDate: '2000-01-01T00:00:00.000Z',
                user: [Object]
            },
            {
                heynaboId: 153,
                pictureUrl: 'https://prod-space.s3.fr-par.scw.cloud/demo/AVATAR/67896247d11fb.jpg',
                name: 'Skraaningen',
                lastName: 'API',
                birthDate: '2000-01-01T00:00:00.000Z',
                user: [Object]
            },
            {
                heynaboId: 154,
                pictureUrl: 'https://prod-space.s3.fr-par.scw.cloud/demo/AVATAR/678930973ffae.jpg',
                name: 'Babyyoda',
                lastName: 'Yoda',
                birthDate: '2021-01-01T00:00:00.000Z'
            },
            {
                heynaboId: 155,
                pictureUrl: '',
                name: 'Morten',
                lastName: 'Ydefeldt',
                birthDate: '2000-01-01T00:00:00.000Z',
                user: [Object]
            }]
}

export default defineEventHandler(async (event) => {
    console.log(` >>> 🏚️ HOUSEHOLD > GET > retrieving data for household id ${event.path}`) //todo retrieve parametee for id
    const result = exampleHousehold //FIXME hent fra db i stedet for hardwiret
    return result
})

// edit allergies

//edit ticket types

// see planned dinners

// se past invoices

// get calendar feed
