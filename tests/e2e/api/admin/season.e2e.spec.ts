import {test, expect} from '@playwright/test'
import {formatDate} from '~/utils/date'
import {useSeasonValidation} from '~/composables/useSeasonValidation'

const adminFile = 'playwright/.auth/admin.json'
const headers = {'Content-Type': 'application/json'}

// Generate unique test data
const testSalt = Date.now().toString()
const testSeasonName = `TestSeason-${testSalt}`

// Test season data using formatDate from utils/date.ts
const today = new Date();
const ninetyDaysLater = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

const newSeason = {
  shortName: testSeasonName,
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

// Variable to store ID for cleanup
let createdSeasonId: number|undefined = undefined

const { serializeSeason } = useSeasonValidation()

// Test for creating and retrieving a season
test("PUT should create a new season and GET should retrieve it", async ({browser}) => {
  const context = await browser.newContext({
    storageState: adminFile
  })

  // Serialize the season data before sending it to the API
  const serializedSeason = serializeSeason(newSeason)

  // We're sending the serialized season data
  
  // Send the data with correct content type header
  // Try using request.put with "direct" parameter
  const response = await context.request.put('/api/admin/season',
      {
        headers: headers,
        data: serializedSeason
  })
  
  // Check status explicitly with detailed error message
  const status = response.status();
  const responseBody = await response.json();
  
  expect(status, `Expected 201 but got ${status}. Response: ${JSON.stringify(responseBody)}`).toBe(201)
  
  // Save ID for cleanup
  createdSeasonId = responseBody.id
  
  // Verify response
  expect(responseBody).toHaveProperty('shortName')
  expect(responseBody.shortName).toBe(testSeasonName)
  
  // Get season list to verify it appears there
  const listResponse = await context.request.get('/api/admin/season')
  expect(listResponse.status()).toBe(200)
  
  const seasons = await listResponse.json()
  const foundSeason = seasons.find(s => s.shortName === testSeasonName)
  
  expect(foundSeason).toBeTruthy()
  expect(foundSeason.id).toBe(createdSeasonId)
})

// Test for validation
test("Validation should fail for invalid season data", async ({browser}) => {
  const context = await browser.newContext({
    storageState: adminFile
  })
  
  // Create invalid season (missing required fields)
  const invalidSeason = {
    shortName: testSeasonName,
    // Missing seasonDates
    isActive: false
  }
  
  // Submit with matching how Pinia sends it
  const response = await context.request.put('/api/admin/season', {
    headers: {
      'Content-Type': 'application/json',
    },
    data: invalidSeason
  })
  
  // Should return 400 Bad Request for validation error
  expect(response.status()).toBe(400)
})

// Cleanup after all tests
test.afterAll(async ({browser}) => {
  // Only run cleanup if we created a season
  if (createdSeasonId) {
    const context = await browser.newContext({
      storageState: adminFile
    })
    
    try {
      const deleteResponse = await context.request.delete(`/api/admin/season/${createdSeasonId}`)
      expect(deleteResponse.status()).toBe(200)
      
      // Verify the season was deleted
      const verifyResponse = await context.request.get('/api/admin/season')
      const seasons = await verifyResponse.json()
      const deletedSeason = seasons.find(s => s.id === createdSeasonId)
      expect(deletedSeason).toBeUndefined()
    } catch (error) {
      console.error(`Failed to delete test season with ID ${createdSeasonId}:`, error)
    }
  }
})
