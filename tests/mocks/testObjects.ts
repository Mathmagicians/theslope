import {formatDate} from '../../app/utils/date'
import type {Season} from '../../app/composables/useSeasonValidation'
import {useSeasonValidation} from '~/composables/useSeasonValidation'
import type {CookingTeam, CookingTeamWithMembers, CookingTeamMember} from '~/composables/useCookingTeamValidation'

const {serializeSeason, deserializeSeason} = useSeasonValidation()

// Generate unique test data
const testSalt = Date.now().toString()
const salt = (base: string):string => `${base}-${testSalt}`

// Common test dates
const today = new Date();
const ninetyDaysLater = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

// Test season for API calls and validation (with properly formatted dates)
const testSeason = {
    shortName: salt('TestSeason'),
    seasonDates: {
        start: formatDate(today),
        end: formatDate(ninetyDaysLater)
    },
    isActive: false,
    cookingDays: {
        mandag: true,
        tirsdag: true,
        onsdag: true,
        torsdag: true,
        fredag: false,
        loerdag: false,
        soendag: false
    },
    holidays: [],
    ticketIsCancellableDaysBefore: 10,
    diningModeIsEditableMinutesBefore: 90
}

export const getTestSeason = () => {
    return {
        rawSeason: testSeason,
        serializedSeason: serializeSeason(testSeason)
    }
}

// Test Users
const userEmail = (name: string, role: string) => salt(`testusers-${name}-${role}`)+'@andeby.dk'
// TODO return an object with several users

// Test cooking team for API calls and validation


const testTeamMembers: CookingTeamMember[] = [
    {id: 0, inhabitantId: 1, role: 'CHEF'},
    {id: 0, inhabitantId: 2, role: 'COOK'},
    {id: 0, inhabitantId: 3, role: 'JUNIORHELPER'}
]
// TODO shoulde use the test users, and let beforeAll created them from the data

// Test cooking team with members
export const testCookingTeamWithMembers: CookingTeamWithMembers = {
    id: 100,
    seasonId: 12345,
    name: salt('TestTeamWithMembers'),
    chefs: [testTeamMembers[0]
    ],
    cooks: [
        testTeamMembers[1]
    ],
    juniorHelpers: [
        testTeamMembers[2]
    ]
}

// Empty test cooking team (for testing validation)
export const emptyTestCookingTeam: CookingTeamWithMembers = {
    id: 101,
    seasonId: 12345,
    name: salt('TestTeamEmpty'),
    chefs: [],
    cooks: [],
    juniorHelpers: []
}

export const cookingTeams = {
    emptyTeam: emptyTestCookingTeam,
    withMembers: testCookingTeamWithMembers,
    withMembersAndDinners: testCookingTeamWithMembers //FIXME when dinners are implemented
}

const testObjects = {
    getTestSeason,
    cookingTeams
}

export default testObjects
