import {formatDate} from "../../../app/utils/date"
import type {Season} from "../../../app/composables/useSeasonValidation"
import {useSeasonValidation} from "../../../app/composables/useSeasonValidation"
import testHelpers from "../testHelpers"
import {expect, BrowserContext} from "@playwright/test";

const {serializeSeason, deserializeSeason} = useSeasonValidation()
const {salt, headers} = testHelpers

export class SeasonFactory {
    static readonly today = new Date()
    static readonly ninetyDaysLater = new Date(this.today.getTime() + 90 * 24 * 60 * 60 * 1000)

    static readonly defaultSeasonData: Season = {
        shortName: 'TestSeason',
        seasonDates: {
            start: formatDate(this.today),
            end: formatDate(this.ninetyDaysLater)
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

    // TODO static factory method with updated season with an extra holiday

    static readonly defaultSeason = (testSalt: string = Date.now().toString()) => {
        const saltedSeason = {... this.defaultSeasonData,
            shortName: salt(this.defaultSeasonData.shortName as string, testSalt)}
        return {
            season: saltedSeason,
            serializedSeason: serializeSeason(saltedSeason)
        }
    }

    static readonly createSeason = async (context: BrowserContext, aSeason: Season): Promise<Season> => {
        const response = await context.request.put('/api/admin/season',
            {
                headers: headers,
                data: serializeSeason(aSeason)
            })
        const status = response.status()
        const responseBody = await response.json()

        expect(status, 'Unexpected status').toBe(201)
        expect(responseBody.id, 'Response should contain the new season ID').toBeDefined()

        return responseBody
    }

    static readonly deleteSeason = async (context: BrowserContext, id:number): Promise<Season> => {
        const deleteResponse = await context.request.delete(`/api/admin/season/${id}`)
        expect(deleteResponse.status()).toBe(200)
        const responseBody = await deleteResponse.json()
        expect(responseBody).toBeDefined()
        return responseBody
    }
}
