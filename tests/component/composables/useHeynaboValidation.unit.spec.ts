import {describe, expect, it} from 'vitest'
import {useHeynaboValidation} from "~/composables/useHeynaboValidation"

describe('useHeynaboValidation', () => {
    const {HeynaboMemberSchema, LoggedInHeynaboUserSchema, HeynaboLocationSchema} = useHeynaboValidation()

    const LOGGED_IN_INDEX = 0
    const sampleHeynaboMembers = [
        {
            "id": 153,
            "type": "user",
            "email": "agata@m.dk",
            "firstName": "Skraaningen",
            "lastName": "API",
            "phone": "12345678",
            "emergencyContact": null,
            "dateOfBirth": null,
            "description": "<p>Dette er en robot der bruges til at teste modul til fællesspisning.</p>",
            "uiStorage": "{\"tryOurApp\":true,\"welcome\":{\"calendar\":true}}",
            "role": "admin",
            "roles": [],
            "avatar": "https://prod-space.s3.fr-par.scw.cloud/demo/AVATAR/67896247d11fb.jpg",
            "alias": null,
            "locationId": 2,
            "isFirstLogin": false,
            "lastLogin": "2025-02-02T00:11:37.155541Z",
            "inviteSent": "2025-01-14T10:49:53+00:00",
            "created": "2025-01-14T10:49:53+00:00",
            "token": "300e1068fdd7e628cc7cf6d8b893b1c1"
        },
        {
            "id": 219,
            "type": "user",
            "email": null,
            "firstName": "Daniel",
            "lastName": "Andreasen",
            "phone": null,
            "emergencyContact": null,
            "dateOfBirth": null,
            "description": "",
            "uiStorage": null,
            "role": "full",
            "roles": [],
            "avatar": null,
            "alias": "",
            "locationId": 116,
            "isFirstLogin": false,
            "lastLogin": "2025-10-27T17:30:07.000000Z",
            "inviteSent": "2025-10-13T08:01:59+00:00",
            "created": "2025-10-09T09:20:40+00:00"
        },
        {
            "id": 130,
            "type": "user",
            "email": "karin. thoby",
            "firstName": "Karin",
            "lastName": "Thoby",
            "phone": "29261868",
            "emergencyContact": null,
            "dateOfBirth": null,
            "description": "",
            "uiStorage": "{\"welcome\":{\"notifications\":true,\"calendar\":true,\"bulletin_board\":true},\"setNotifications\":true,\"selectedGroupIds\":[]}",
            "role": "full",
            "roles": null,
            "avatar": "https://prod-space.s3.fr-par.scw.cloud/demo/AVATAR/66d8a3239eabe.jpeg",
            "alias": "",
            "locationId": 48,
            "isFirstLogin": false,
            "lastLogin": "2024-10-09T16:37:43.000000Z",
            "inviteSent": null,
            "created": "2024-08-31T17:11:00+00:00"
        }
    ]

    const sampleHeynaboLocations = [
        {
            "id": 2,
            "type": "location",
            "address": "Heynabo! ",
            "street": "Heynabo!",
            "streetNumber": "",
            "floor": null,
            "ext": null,
            "map": null,
            "city": "",
            "zipCode": "",
            "typeId": 1,
            "hidden": true
        },
        {
            "id": 118,
            "type": "location",
            "address": "Østervej 7",
            "street": "Østervej",
            "streetNumber": "7",
            "floor": null,
            "ext": null,
            "map": null,
            "city": "",
            "zipCode": "",
            "typeId": 1,
            "hidden": false
        },
        {
            "id": 109,
            "type": "location",
            "address": "Vejlevej 35, 2 tv",
            "street": "Vejlevej",
            "streetNumber": "35",
            "floor": "2",
            "ext": "tv",
            "map": null,
            "city": "Hedensted",
            "zipCode": "8722",
            "typeId": 1,
            "hidden": false
        },
    ]

    describe('Can parse users retrieved from Heynabo API', () => {
        it.each(sampleHeynaboMembers)('parses user %# with id $id correctly', (user) => {
            const result = HeynaboMemberSchema.parse(user)
            expect(result).toBeDefined()
            expect(result.id).toBe(user.id)
        })

        it.each(sampleHeynaboMembers)('Normalizes email %# $email, incorrect become null', (user) => {
            const CORRECT_EMAIL_ID = 153
            const result = HeynaboMemberSchema.parse(user)
            if(user.id === CORRECT_EMAIL_ID)
                expect(result.email).toBe(user.email)
            else expect(result.email).toBeNull()
        })

        it('Logged in Heynabo user has token defined', () => {
            const result = LoggedInHeynaboUserSchema.parse(sampleHeynaboMembers[LOGGED_IN_INDEX])
            expect(result.token.length).toBeGreaterThan(0)
        })

        it('Null array with roles gets normalized to empty array', () => {
            const userWithNullRoles = sampleHeynaboMembers[2]
            const result = HeynaboMemberSchema.parse(userWithNullRoles)
            expect(result.roles).toBeDefined()
            expect(Array.isArray(result.roles)).toBe(true)
            expect(result.roles.length).toBe(0)
        })
    })

    describe('Can parse locations retrieved from Heynabo API', () => {
        it.each(sampleHeynaboLocations)('parses location %# with id $id  correctly', (user) => {
            const result = HeynaboLocationSchema.parse(user)
            expect(result).toBeDefined()
            expect(result.id).toBe(user.id)
        })
    })

    describe('Transformation functions', () => {
        const {
            mapHeynaboRoleToSystemRole,
            inhabitantFromMember,
            findInhabitantsByLocation,
            createHouseholdsFromImport
        } = useHeynaboValidation()

        describe('mapHeynaboRoleToSystemRole', () => {
            it.each([
                {role: 'admin', expected: ['ADMIN']},
                {role: 'full', expected: []},
                {role: 'limited', expected: []},
                {role: 'unknown', expected: []}
            ])('maps $role to $expected', ({role, expected}) => {
                expect(mapHeynaboRoleToSystemRole(role)).toEqual(expected)
            })
        })

        describe('inhabitantFromMember', () => {
            it.each([
                {member: sampleHeynaboMembers[0], locationId: 2, hasUser: true, systemRoles: ['ADMIN']},
                {member: {...sampleHeynaboMembers[2], email: 'valid@email.com'}, locationId: 48, hasUser: true, systemRoles: []},
                {member: sampleHeynaboMembers[1], locationId: 116, hasUser: false, systemRoles: []},
                {member: {...sampleHeynaboMembers[0], role: 'limited'}, locationId: 2, hasUser: false, systemRoles: []}
            ])('creates inhabitant with hasUser=$hasUser for member $member.id', ({member, locationId, hasUser, systemRoles}) => {
                const result = inhabitantFromMember(locationId, member)

                expect(result.heynaboId).toBe(member.id)
                expect(result.householdId).toBe(locationId)
                if (hasUser) {
                    expect(result.user).toBeDefined()
                    expect(result.user?.systemRoles).toEqual(systemRoles)
                } else {
                    expect(result.user).toBeUndefined()
                }
            })

            it.each([
                {dateOfBirth: '1990-01-15', expected: new Date('1990-01-15')},
                {dateOfBirth: null, expected: null}
            ])('handles dateOfBirth=$dateOfBirth', ({dateOfBirth, expected}) => {
                const member = {...sampleHeynaboMembers[0], dateOfBirth}
                const result = inhabitantFromMember(2, member)
                expect(result.birthDate).toEqual(expected)
            })
        })

        describe('findInhabitantsByLocation', () => {
            it.each([
                {locationId: 2, expectedCount: 1, expectedIds: [153]},
                {locationId: 116, expectedCount: 1, expectedIds: [219]},
                {locationId: 999, expectedCount: 0, expectedIds: []}
            ])('filters locationId=$locationId returns $expectedCount inhabitants', ({locationId, expectedCount, expectedIds}) => {
                const result = findInhabitantsByLocation(locationId, sampleHeynaboMembers)
                expect(result).toHaveLength(expectedCount)
                expect(result.map(i => i.heynaboId)).toEqual(expectedIds)
            })
        })

        describe('createHouseholdsFromImport', () => {
            it.each([
                {
                    locationIds: [2, 118],
                    memberLocations: [2, 118],
                    expectedHouseholds: 2,
                    expectedInhabitantCounts: [1, 1]
                },
                {
                    locationIds: [2],
                    memberLocations: [2, 2],
                    expectedHouseholds: 1,
                    expectedInhabitantCounts: [2]
                },
                {
                    locationIds: [2],
                    memberLocations: [999],
                    expectedHouseholds: 1,
                    expectedInhabitantCounts: [0]
                }
            ])('creates $expectedHouseholds households with inhabitants $expectedInhabitantCounts',
                ({locationIds, memberLocations, expectedHouseholds, expectedInhabitantCounts}) => {
                const locations = locationIds.map(id => sampleHeynaboLocations.find(l => l.id === id)!)
                const members = memberLocations.map((locId, idx) => ({...sampleHeynaboMembers[idx], locationId: locId}))

                const result = createHouseholdsFromImport(locations, members)

                expect(result).toHaveLength(expectedHouseholds)
                result.forEach((household, idx) => {
                    expect(household.inhabitants).toHaveLength(expectedInhabitantCounts[idx])
                    expect(household.heynaboId).toBe(household.pbsId)
                    expect(household.movedInDate).toBeInstanceOf(Date)
                })
            })
        })
    })
})
