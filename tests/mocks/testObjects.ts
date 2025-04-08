import { formatDate } from '../../utils/date'
import type { Season } from '../../composables/useSeasonValidation'

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
