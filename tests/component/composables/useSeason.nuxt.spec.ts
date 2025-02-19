import {describe, it, expect} from 'vitest'
import {useSeason} from '@/composables/useSeason'
import type {DateRange} from "~/types/dateTypes";

describe('useSeasonSchema', () => {
    // Update the test in useSeason.nuxt.spec.ts
    it('should validate default season', async () => {
        const {SeasonSchema, getDefaultSeason} = useSeason()
        const defaultSeason = getDefaultSeason()
        const result = SeasonSchema.safeParse(defaultSeason)

        expect(result.success).toBe(true)
        if (result.success) {
            const parsed = result.data
            expect(parsed.seasonDates.start).toBeInstanceOf(Date)
            expect(parsed.seasonDates.end).toBeInstanceOf(Date)
            expect(Object.keys(parsed.cookingDays)).toHaveLength(7)
            expect(parsed.holidays).toEqual([])
            expect(parsed.isActive).toBe(false)
        }
    })

    it('should create correct season name', async () => {

        const {createSeasonName} = useSeason()

        const dateRange = {
            start: new Date(2024, 0, 1),
            end: new Date(2024, 11, 31)
        } satisfies DateRange
        expect(createSeasonName(dateRange)).toBe('Sæson 01/2024-12/2024')
    })

    it('should correctly determine if date is within season', async () => {

        const {isActive} = useSeason()
        const start = new Date(2024, 0, 1)
        const end = new Date(2024, 11, 31)

        // Test dates
        const middleDate = new Date(2024, 6, 1)
        const beforeDate = new Date(2023, 11, 31)
        const afterDate = new Date(2025, 0, 1)

        expect(isActive(middleDate, start, end)).toBe(true)
        expect(isActive(beforeDate, start, end)).toBe(false)
        expect(isActive(afterDate, start, end)).toBe(false)
        expect(isActive(start, start, end)).toBe(true)
        expect(isActive(end, start, end)).toBe(true)
    })

    describe('copySeason', () => {
        it('creates a deep copy of a season', () => {
            const {copySeason} = useSeason()
            const originalSeason = {
                id: '1',
                shortName: 'S2024',
                seasonDates: {
                    start: new Date('2024-01-01'),
                    end: new Date('2024-06-30')
                },
                isActive: true,
                cookingDays: createDefaultWeekdayMap([true, false, true]),
                holidays: [
                    {
                        start: new Date('2024-02-10'),
                        end: new Date('2024-02-18')
                    }
                ],
                ticketIsCancellableDaysBefore: 2,
                diningModeIsEditableMinutesBefore: 120
            }

            const copiedSeason = copySeason(originalSeason)

            expect(copiedSeason).toEqual(originalSeason)
            expect(copiedSeason).not.toBe(originalSeason)
            expect(copiedSeason.seasonDates).not.toBe(originalSeason.seasonDates)
            expect(copiedSeason.cookingDays).not.toBe(originalSeason.cookingDays)
            expect(copiedSeason.holidays).not.toBe(originalSeason.holidays)
            expect(copiedSeason.holidays[0]).not.toBe(originalSeason.holidays[0])

            originalSeason.holidays = []
            const anotherCopy = copySeason(originalSeason)
            expect(anotherCopy.holidays).toStrictEqual([])
            expect(anotherCopy.holidays.length).toBe(0)
        })
    })
})
