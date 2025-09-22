import { formatDate } from '../../app/utils/date'
import type { Season } from '../../app/composables/useSeasonValidation'
import type { CookingTeam, CookingTeamWithMembers } from '../../app/composables/useCookingTeamValidation'

// Generate unique test data
const testSalt = Date.now().toString()

// Common test dates
const today = new Date();
const ninetyDaysLater = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

// Test season for API calls and validation
export const testSeason = {
  shortName: `TestSeason-${testSalt}`,
  seasonDates: {
    start: today,
    end: ninetyDaysLater
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

// For tests that need a complete season with IDs
export const completeTestSeason: Season = {
  id: 12345,
  shortName: `TestSeason-Complete`,
  seasonDates: {
    start: new Date(2025, 0, 1),
    end: new Date(2025, 3, 1)
  },
  isActive: true,
  cookingDays: {
    mandag: true,
    tirsdag: true,
    onsdag: true,
    torsdag: true,
    fredag: false,
    loerdag: false,
    soendag: false
  },
  holidays: [
    {
      start: new Date(2025, 0, 15),
      end: new Date(2025, 0, 20)
    }
  ],
  ticketIsCancellableDaysBefore: 7,
  diningModeIsEditableMinutesBefore: 120
}

// Test cooking team for API calls and validation
export const testCookingTeam: CookingTeam = {
  seasonId: 12345,
  name: `TestTeam-${testSalt}`
}

// Complete test cooking team with ID
export const completeTestCookingTeam: CookingTeam = {
  id: 100,
  seasonId: 12345,
  name: "Team Alpha"
}

// Test cooking team with members
export const testCookingTeamWithMembers: CookingTeamWithMembers = {
  id: 100,
  seasonId: 12345,
  name: "Team Alpha",
  chefs: [
    { id: 1, inhabitantId: 10, role: 'CHEF' }
  ],
  cooks: [
    { id: 2, inhabitantId: 20, role: 'COOK' },
    { id: 3, inhabitantId: 21, role: 'COOK' }
  ],
  juniorHelpers: [
    { id: 4, inhabitantId: 30, role: 'JUNIORHELPER' }
  ]
}

// Empty test cooking team (for testing validation)
export const emptyTestCookingTeam: CookingTeamWithMembers = {
  id: 101,
  seasonId: 12345,
  name: "Empty Team",
  chefs: [],
  cooks: [],
  juniorHelpers: []
}
