import {useCookingTeamValidation, type CookingTeam} from './useCookingTeamValidation'

/**
 * Business logic for working with cooking teams
 */
export const useCookingTeam = () => {
    const {CookingTeamSchema} = useCookingTeamValidation()

    /**
     * Create a default team name
     * @param seasonShortName - Short name of the season (e.g., "Uge 35/24 - Uge 23/25")
     * @param teamNumber - Sequential team number (1, 2, 3, etc.)
     * @returns Formatted team name (e.g., "Madhold 1 - Uge 35/24 - Uge 23/25")
     */
    const createDefaultTeamName = (seasonShortName: string, teamNumber: number): string => {
        return `Madhold ${teamNumber} - ${seasonShortName}`
    }

    /**
     * Create a default cooking team for a given season
     * @param seasonId - Required season ID
     * @param seasonShortName - Season's short name for generating team name
     * @param teamNumber - Sequential team number (defaults to 1)
     * @param overrides - Partial team object to override defaults
     * @returns Default cooking team with generated name
     */
    const getDefaultCookingTeam = (
        seasonId: number,
        seasonShortName: string,
        teamNumber: number = 1,
        overrides?: Partial<CookingTeam>
    ): CookingTeam => {
        return {
            seasonId,
            name: createDefaultTeamName(seasonShortName, teamNumber),
            ...overrides
        }
    }

    return {
        CookingTeamSchema,
        createDefaultTeamName,
        getDefaultCookingTeam
    }
}