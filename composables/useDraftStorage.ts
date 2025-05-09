import { createStorage } from 'unstorage'
import localStorageDriver from 'unstorage/drivers/localstorage'
import { type StoreState } from '~/types/form'
import { useSeason } from './useSeason'
import type {Season} from "~/composables/useSeasonValidation"

const DEFAULT_DRAFT_KEY = 'draftSeason'

interface DraftData {
    state: StoreState
    season: Season
}

export const useDraftStorage = (key = DEFAULT_DRAFT_KEY) => {
    const storage = process.client
        ? createStorage({
            driver: localStorageDriver({
                base: 'theslope:'
            })
        })
        : null

    const { serializeSeason, deserializeSeason, coalesceSeason } = useSeason()

    const serializeDraftData = (data: DraftData): string => {
        try {
            const serializedSeason = serializeSeason(data.season)
            const draftData = {
                state: data.state,
                season: serializedSeason
            }
            return JSON.stringify(draftData)
        } catch (error) {
            console.error("Error serializing draft data:", error)
            throw error // Re-throw to allow higher-level handlers to deal with it
        }
    }

    const deserializeDraftData = (stored: string): DraftData => {
       const parsed = JSON.parse(stored)
        return {
            state: parsed.state,
            season: deserializeSeason(parsed.season)
        }
    }

    const saveDraft = async (data: DraftData) => {
        if(!process.client || !storage) return

        try {
            const serializedData = serializeDraftData(data)
            console.log("SAVE", serializedData)
            await storage.setItem<string>(key, serializedData)
        } catch (error) {
            console.error("Failed to save draft:", error)
            throw error // Re-throw for higher level handling
        }
    }

    const loadDraft = async (): Promise<DraftData | null> => {
        if (!process.client || !storage) return null
        const stored = await storage.getItemRaw<string>(key)
        if (!stored ) return null
        console.log("LOAD", stored)
        return deserializeDraftData(stored)
    }

    const clearDraft = async () => {
        if (!process.client ||  !storage) return
        await storage.removeItem(key)
    }

    return {
        saveDraft,
        loadDraft,
        clearDraft,
        serializeDraftData,
        deserializeDraftData
    }
}
