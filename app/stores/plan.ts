import {type Season} from '~/composables/useSeasonValidation'
import {type CookingTeam, type CookingTeamAssignment} from '~/composables/useCookingTeamValidation'
import {FORM_MODES, type FormMode} from '~/types/form'

export const usePlanStore = defineStore("Plan", () => {
        // DEPENDENCIES
        const {handleApiError} = useApiHandler()
        const {SeasonSchema} = useSeasonValidation()
        const authStore = useAuthStore()
        const {isAdmin} = storeToRefs(authStore)

        // DATA FETCHING - useFetch for SSR compatibility with auth context
        // HTTP JSON converts Date objects to ISO strings during transport
        // SeasonSchema.parse converts ISO strings back to Date objects via dateRangeSchema union
        const { data: seasonsData, status, error: fetchError, refresh: refreshSeasons } = useFetch<Season[]>(
            '/api/admin/season',
            {
                transform: (data: any[]) => {
                    try {
                        return data.map(season => SeasonSchema.parse(season))
                    } catch (e) {
                        console.error('🗓️ > PLAN_STORE > Error parsing seasons:', e)
                        console.error('🗓️ > PLAN_STORE > Raw data:', data)
                        throw e
                    }
                },
                onResponseError({ error }) {
                    handleApiError(error, 'loadSeasons')
                }
            }
        )

        const selectedSeasonId = ref<number | null>(null)
        const { data: selectedSeasonData, refresh: refreshSelectedSeason } = useFetch<Season>(
            () => `/api/admin/season/${selectedSeasonId.value}`,
            {
                transform: (data: any) => {
                    try {
                        return SeasonSchema.parse(data)
                    } catch (e) {
                        console.error('🗓️ > PLAN_STORE > Error parsing selected season:', e)
                        console.error('🗓️ > PLAN_STORE > Raw data:', data)
                        throw e
                    }
                },
                immediate: false,
                watch: false,
                onResponseError({ error }) {
                    handleApiError(error, 'fetchSeason')
                }
            }
        )

        // STATE - Data only
        const selectedSeason = computed(() => selectedSeasonData.value ?? null)
        const seasons = computed(() => seasonsData.value ?? [])
        const isLoading = computed(() => status.value === 'pending')

        // COMPUTED STATE
        const isNoSeasons = computed(() => seasons.value?.length === 0)

        // HELPER - Auto-select first season
        const autoSelectFirstSeason = async () => {
            if (seasons.value.length > 0 && !selectedSeason.value) {
                await onSeasonSelect(seasons.value.at(0)?.id ?? -1)
            }
        }

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

        // ACTIONS - CRUD operations only
        const loadSeasons = async () => {
            await refreshSeasons()
            await autoSelectFirstSeason()
        }

        const onSeasonSelect = async (id: number) => {
            if (id >= 0) {
                selectedSeasonId.value = id
                await refreshSelectedSeason()
            }
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
                const result = await $fetch<{seasonId: number, eventCount: number, events: any[]}>(`/api/admin/season/${seasonId}/generate-dinner-events`, {
                    method: 'POST'
                })
                console.info(`🗓️ > PLAN_STORE > Generated ${result.eventCount} dinner events for season ${seasonId}`)
                return result
            } catch (e: any) {
                handleApiError(e, 'generateDinnerEvents')
                throw e
            }
        }

        const assignTeamAffinities = async (seasonId: number) => {
            try {
                const result = await $fetch<{seasonId: number, teamCount: number, teams: CookingTeam[]}>(`/api/admin/season/${seasonId}/assign-team-affinities`, {
                    method: 'POST'
                })
                console.info(`👥 > PLAN_STORE > Assigned affinities to ${result.teamCount} teams for season ${seasonId}`)
                // Refresh selected season to get updated teams with affinities
                if (selectedSeasonId.value) {
                    await refreshSelectedSeason()
                }
                return result
            } catch (e: any) {
                handleApiError(e, 'assignTeamAffinities')
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

        // INITIALIZATION - Component will call init() in onMounted
        const initPlanStore = async () => {
            await autoSelectFirstSeason()
        }

        return {
            // state
            selectedSeason,
            seasons,
            // computed state
            isLoading,
            isNoSeasons,
            disabledModes,
            error: fetchError,
            // actions
            initPlanStore,
            loadSeasons,
            createSeason,
            updateSeason,
            generateDinnerEvents,
            assignTeamAffinities,
            onSeasonSelect,
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
