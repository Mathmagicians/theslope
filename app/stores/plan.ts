import {type Season} from '~/composables/useSeasonValidation'
import {type CookingTeam, type CookingTeamAssignment} from '~/composables/useCookingTeamValidation'
import {type DinnerEvent} from '~/composables/useDinnerEventValidation'
import {FORM_MODES, type FormMode} from '~/types/form'
import {SeasonSchema} from "~~/prisma/generated/zod";

export const usePlanStore = defineStore("Plan", () => {
        // DEPENDENCIES
        const {handleApiError} = useApiHandler()
        const {SeasonSchema} = useSeasonValidation()
        const authStore = useAuthStore()
        const {isAdmin} = storeToRefs(authStore)
    
        // ========================================
        // State - useFetch with status exposed internally
        // ========================================
        // DATA FETCHING - useFetch for SSR compatibility with auth context
        // HTTP JSON converts Date objects to ISO strings during transport
        // SeasonSchema.parse converts ISO strings back to Date objects via dateRangeSchema union

        // Fetch active season ID (static endpoint - no reactive URL issues)
        const { data: activeSeasonId , refresh: refreshActiveSeasonId} = useFetch<number | undefined>(
            '/api/admin/season/activeId',
            {
                default: () => undefined
            }
        )

      
        const {
            data: seasons, status: seasonsStatus,
            error: seasonsError, refresh: refreshSeasons
        } = useFetch<Season[]>(
            '/api/admin/season',
            { default: () => [],
                transform: (data: any[]) => {
                    try {
                        return data.map(season => SeasonSchema.parse(season))
                    } catch (e) {
                        console.error('🗓️ > PLAN_STORE > Error parsing seasons:', e)
                        console.error('🗓️ > PLAN_STORE > Raw data:', data)
                        throw e
                    }
                }
            }
        )

        // Use useAsyncData for detail endpoint - allows manual execute() without context issues
        const selectedSeasonId = ref<number | null>(null)
        const selectedSeasonKey = computed(() =>  `/api/admin/season/${selectedSeasonId.value || 'null' }`)

        const {
            data: selectedSeason, status: selectedSeasonStatus,
            error: selectedSeasonError, refresh: refreshSelectedSeason
        } = useAsyncData<Season | null>(
            selectedSeasonKey,
            () => {
                if (!selectedSeasonId.value) return Promise.resolve(null)
                return $fetch(`/api/admin/season/${selectedSeasonId.value}`)
            },
            {
                default: () => null,
                transform: (data: any) => data ? SeasonSchema.parse(data) : null
            }
        )


        // ========================================
        // Computed - Public API (derived from status)
        // ========================================
        const isSeasonsLoading = computed(() => seasonsStatus.value === 'pending')
        const isSeasonsErrored = computed(() => seasonsStatus.value === 'error')
        const isSeasonsInitialized = computed(() => seasonsStatus.value === 'success')
        const isNoSeasons = computed(() => isSeasonsInitialized.value && seasons.value.length === 0)

        const isSelectedSeasonLoading = computed(() => selectedSeasonStatus.value === 'pending')
        const isSelectedSeasonErrored = computed(() => selectedSeasonStatus.value === 'error')
        const isSelectedSeasonInitialized = computed(() => selectedSeasonStatus.value === 'success')
        const disabledModes = computed(() => {
            const disabledSet: Set<FormMode> = new Set()
            if (isNoSeasons.value) {
                disabledSet.add(FORM_MODES.EDIT)
            }
            if (!isAdmin.value) {
                disabledSet.add(FORM_MODES.CREATE)
                disabledSet.add(FORM_MODES.EDIT)
            }
            return [...disabledSet]
        })

        const activeSeason = computed(() => selectedSeason.value)

        // HELPER - Auto-select active season
        /**
         * Get the active season
         * FIXME: For now returns selectedSeason. Later implement isActive field in database.
         */
        const autoSelectActiveSeason = (): Season | null => seasons.value.at(0) ?? null


        // ACTIONS - CRUD operations only
        const loadSeasons = async () => {
            await refreshSeasons()
            if (seasonsError.value) {
                console.error(`🗓️ > PLAN_STORE > Error loading seasons:`, seasonsError.value)
                throw seasonsError.value
            }
            console.info(`🗓️ > PLAN_STORE > Loaded ${seasons.value.length} seasons`)
        }

        const loadSeason = (id: number) => {
            selectedSeasonId.value = id

            if (selectedSeasonError.value) {
                console.error(`🗓️ > PLAN_STORE > Error loading season:`, selectedSeasonError.value)
            }
            console.info(`🗓️ > PLAN_STORE > Loaded season ${selectedSeason.value?.shortName} (ID: ${id})`)
        }

        const onSeasonSelect = (id: number) => {
            loadSeason(id)
        }

        const createSeason = async (season: Season): Promise<Season> => {
            try {
                // API accepts domain objects (JSON.stringify converts Date to ISO strings)
                const createdSeason = await $fetch<Season>('/api/admin/season', {
                    method: 'PUT',
                    body: season,
                    headers: {'Content-Type': 'application/json'}
                })
                await loadSeasons()
                return createdSeason
            } catch (e: any) {
                handleApiError(e, 'createSeason')
                throw e
            }
        }

        const generateDinnerEvents = async (seasonId: number) => {
            try {
                const result = await $fetch<{
                    seasonId: number,
                    eventCount: number,
                    events: any[]
                }>(`/api/admin/season/${seasonId}/generate-dinner-events`, {
                    method: 'POST'
                })
                console.info(`🗓️ > PLAN_STORE > Generated ${result.eventCount} dinner events for season ${seasonId}`)
                return result
            } catch (e: any) {
                handleApiError(e, 'generateDinnerEvents')
                throw e
            }
        }

        const assignTeamAffinitiesAndEvents = async (seasonId: number) => {
            try {
                // Step 1: Assign affinities to teams
                const affinityResult = await $fetch<{
                    seasonId: number,
                    teamCount: number,
                    teams: CookingTeam[]
                }>(`/api/admin/season/${seasonId}/assign-team-affinities`, {
                    method: 'POST'
                })
                console.info(`👥 > PLAN_STORE > Assigned affinities to ${affinityResult.teamCount} teams for season ${seasonId}`)

                // Step 2: Assign teams to dinner events
                const assignmentResult = await $fetch<{
                    seasonId: number,
                    eventCount: number,
                    events: DinnerEvent[]
                }>(`/api/admin/season/${seasonId}/assign-cooking-teams`, {
                    method: 'POST'
                })
                console.info(`🍽️ > PLAN_STORE > Assigned teams to ${assignmentResult.eventCount} dinner events for season ${seasonId}`)

                // Refresh selected season to get updated teams with affinities and event assignments
                if (selectedSeasonId.value) {
                    await refreshSelectedSeason()
                }
                return {
                    teamCount: affinityResult.teamCount,
                    eventCount: assignmentResult.eventCount
                }
            } catch (e: any) {
                handleApiError(e, 'assignTeamAffinitiesAndEvents')
                throw e
            }
        }

        const updateSeason = async (season: Season) => {
            try {
                // API accepts domain objects (JSON.stringify converts Date to ISO strings)
                await $fetch(`/api/admin/season/${season.id}`, {
                    method: 'POST',
                    body: season,
                    headers: {'Content-Type': 'application/json'}
                })
                await loadSeasons()
                // Refresh the selected season to get updated data
                if (selectedSeasonId.value) {
                    await refreshSelectedSeason()
                }
            } catch (e: any) {
                handleApiError(e, 'updateSeason')
                throw e
            }
        }

        // COOKING TEAM ACTIONS - Part of Season aggregate (ADR-005)
        const createTeam = async (team: CookingTeam): Promise<CookingTeam> => {
            try {
                const createdTeam = await $fetch<CookingTeam>('/api/admin/team', {
                    method: 'PUT',
                    body: team,
                    headers: {'Content-Type': 'application/json'}
                })
                console.info(`👥 > PLAN_STORE > Created team "${team.name}" for season ${team.seasonId}`)
                // Refresh selected season to get updated teams
                if (selectedSeasonId.value) {
                    await refreshSelectedSeason()
                }
                return createdTeam
            } catch (e: any) {
                handleApiError(e, 'createTeam')
                throw e
            }
        }

        const updateTeam = async (team: CookingTeam) => {
            try {
                await $fetch(`/api/admin/team/${team.id}`, {
                    method: 'POST',
                    body: team,
                    headers: {'Content-Type': 'application/json'}
                })
                console.info(`👥 > PLAN_STORE > Updated team "${team.name}"`)
                // Refresh selected season to get updated teams
                if (selectedSeasonId.value) {
                    await refreshSelectedSeason()
                }
            } catch (e: any) {
                handleApiError(e, 'updateTeam')
                throw e
            }
        }

        const deleteTeam = async (teamId: number) => {
            try {
                await $fetch(`/api/admin/team/${teamId}`, {
                    method: 'DELETE'
                })
                console.info(`👥 > PLAN_STORE > Deleted team ${teamId}`)
                // Refresh selected season to get updated teams
                if (selectedSeasonId.value) {
                    await refreshSelectedSeason()
                }
            } catch (e: any) {
                handleApiError(e, 'deleteTeam')
                throw e
            }
        }

        // TEAM MEMBER ASSIGNMENT ACTIONS - Part of Team aggregate (ADR-005)
        const addTeamMember = async (assignment: CookingTeamAssignment): Promise<CookingTeamAssignment> => {
            try {
                const created = await $fetch<CookingTeamAssignment>('/api/admin/team/assignment', {
                    method: 'PUT',
                    body: assignment,
                    headers: {'Content-Type': 'application/json'}
                })
                console.info(`👥🔗 > PLAN_STORE > Added member ${assignment.inhabitantId} to team ${assignment.cookingTeamId} as ${assignment.role}`)
                // Refresh selected season to get updated teams
                if (selectedSeasonId.value) {
                    await refreshSelectedSeason()
                }
                return created
            } catch (e: any) {
                handleApiError(e, 'addTeamMember')
                throw e
            }
        }

        const removeTeamMember = async (assignmentId: number) => {
            try {
                await $fetch(`/api/admin/team/assignment/${assignmentId}`, {
                    method: 'DELETE'
                })
                console.info(`👥🔗 > PLAN_STORE > Removed team member assignment ${assignmentId}`)
                // Refresh selected season to get updated teams
                if (selectedSeasonId.value) {
                    await refreshSelectedSeason()
                }
            } catch (e: any) {
                handleApiError(e, 'removeTeamMember')
                throw e
            }
        }

        // INITIALIZATION - SSR-safe initialization
        const initPlanStore = async (shortName?: string) => {
           // seasons autoload when store is created
            console.info('🗓️ > PLAN_STORE > Initializing plan store, seasons loaded:', seasons.value.length)
            await refreshActiveSeasonId()
            const seasonId = shortName
                ? seasons.value.find(s => s.shortName === shortName)?.id
                : activeSeasonId.value
            console.info('🗓️ > PLAN_STORE > requested short name', shortName ?? 'none',
                'id :', seasonId)

            if (seasonId && seasonId != selectedSeasonId.value) await loadSeason(seasonId)
        }


        return {
            // state
            selectedSeason,
            seasons,
            // computed state
            isSeasonsLoading,
            isNoSeasons,
            isSeasonsErrored,
            isSeasonsInitialized,
            seasonsError,
            isSelectedSeasonLoading,
            isSelectedSeasonErrored,
            isSelectedSeasonInitialized,
            selectedSeasonError,
            activeSeason,
            disabledModes,
            // actions
            initPlanStore,
            loadSeasons,
            onSeasonSelect,
            createSeason,
            updateSeason,
            generateDinnerEvents,
            assignTeamAffinitiesAndEvents,
            createTeam,
            updateTeam,
            deleteTeam,
            addTeamMember,
            removeTeamMember
        }
    }
)

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(usePlanStore, import.meta.hot))
}
