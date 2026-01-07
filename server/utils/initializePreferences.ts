/**
 * Clip Preferences Service
 *
 * Ensures all inhabitants have valid preferences for the season:
 * - NULL preferences → initialized with DINEIN for cooking days, NONE for non-cooking days
 * - Existing preferences → non-cooking days clipped to NONE, cooking days untouched
 *
 * Called by:
 * - Season activation (active.post.ts)
 * - Daily maintenance (dailyMaintenanceService.ts)
 *
 * Idempotent (ADR-015).
 */
import type {D1Database} from '@cloudflare/workers-types'
import {fetchSeason, fetchInhabitants, updateInhabitantPreferencesBulk} from '~~/server/data/prismaRepository'
import {useSeason} from '~/composables/useSeason'
import type {InitPreferencesResult} from '~/composables/useBookingValidation'

const LOG = '✂️ > PREFS > [CLIP]'

export async function clipPreferences(
    d1Client: D1Database,
    seasonId: number
): Promise<InitPreferencesResult> {
    const season = await fetchSeason(d1Client, seasonId)
    if (!season) {
        console.warn(`${LOG} Season ${seasonId} not found`)
        return {initialized: 0}
    }

    const {createPreferenceClipper, chunkPreferenceUpdates} = useSeason()
    const inhabitants = await fetchInhabitants(d1Client)

    const clipper = createPreferenceClipper(season.cookingDays)
    const updates = clipper(inhabitants)

    if (updates.length === 0) {
        return {initialized: 0}
    }

    for (const batch of chunkPreferenceUpdates(updates)) {
        await updateInhabitantPreferencesBulk(d1Client, batch)
    }

    console.info(`${LOG} Clipped ${updates.length}/${inhabitants.length} inhabitants`)
    return {initialized: updates.length}
}
