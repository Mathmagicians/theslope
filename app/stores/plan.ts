import type {Season, SeasonUpdateResponse} from '~/composables/useSeasonValidation'
import {ROLE_LABELS, type CookingTeamDetail, type CookingTeamAssignment, type CookingTeamCreate, type CookingTeamUpdate, type CookingTeamAssignmentCreate, type CookingTeamAssignmentUpdate, type CreateTeamsResponse, type TeamRole} from '~/composables/useCookingTeamValidation'
import type {DinnerEventDetail, MenuSwapStrategy} from '~/composables/useBookingValidation'
import type {JokerSlot, JokerSlotCreate} from '~/composables/useDutyValidation'
import {FORM_MODES, type FormMode} from '~/types/form'

export const usePlanStore = defineStore("Plan", () => {
        // DEPENDENCIES
        const {storeAsyncData, loadOrThrow, apiRequest, toastSaved, notFoundToast} = useApiHandler()
        const now = useClock()
        const {SeasonSchema, SeasonUpdateResponseSchema, ActiveSeasonIdSchema} = useSeasonValidation()
        const authStore = useAuthStore()
        const {isAdmin} = storeToRefs(authStore)

        // ========================================
        // State (ADR-007)
        // ========================================

        const activeSeasonIdDataset = storeAsyncData('plan-store-active-season-id', '/api/admin/season/active', {
            schema: ActiveSeasonIdSchema,
            default: () => null
        })
        const {
            data: activeSeasonId, status: activeSeasonIdStatus, error: activeSeasonIdError, refresh: refreshActiveSeasonId,
            isLoading: isActiveSeasonIdLoading, isErrored: isActiveSeasonIdErrored
        } = activeSeasonIdDataset

        const seasonsDataset = storeAsyncData('plan-store-seasons', '/api/admin/season', {
            schema: SeasonSchema.array(),
            default: () => []
        })
        const {
            data: seasons, error: seasonsError, refresh: refreshSeasons,
            isLoading: isSeasonsLoading, isErrored: isSeasonsErrored, isInitialized: isSeasonsInitialized
        } = seasonsDataset

        // Helper: Get default season ID (active season or first available)
        const getDefaultSeasonId = (): number | null => {
            if (activeSeasonId.value) {
                console.info(`${LOG_CTX} 🗓️ > Using active season ID: ${activeSeasonId.value}`)
                return activeSeasonId.value
            } else if (seasons.value.length > 0) {
                const {sortSeasonsByActivePriority} = useSeason()
                const sortedSeasons = sortSeasonsByActivePriority(seasons.value, now.value)
                const firstId = sortedSeasons[0]?.id ?? null
                console.info(`${LOG_CTX} 🗓️ > No active season, using first sorted season ID: ${firstId}`)
                return firstId
            }
            console.warn(`${LOG_CTX} 🗓️ > No seasons available, cannot determine default`)
            return null
        }

        // The page names the season it shows (ADR-007 rule 9); a shortName resolves once the seasons have loaded,
        // and a choice that resolves to no season falls back to the default
        const seasonChoice = shallowRef<() => string | number | null>(() => null)
        const selectSeason = (choice: MaybeRefOrGetter<string | number | null>) => {
            seasonChoice.value = () => toValue(choice)
        }
        const resolveSeasonChoice = (choice: string | number | null) =>
            typeof choice === 'string' ? seasons.value.find(s => s.shortName === choice)?.id ?? null : choice
        const selectedSeasonId = computed(() => resolveSeasonChoice(seasonChoice.value()) ?? getDefaultSeasonId())

        // The key stays constant: the id resolves after the seasons load, mid-render on the server
        const selectedSeasonDataset = storeAsyncData(
            'plan-store-selected-season',
            () => `/api/admin/season/${selectedSeasonId.value}`,
            {
                schema: SeasonSchema.nullable(),
                default: () => null,
                enabled: () => !!selectedSeasonId.value,
                dependsOn: [seasonsDataset, activeSeasonIdDataset],
                errorMessage: 'Kunne ikke hente sæson',
                // The page's getter keeps driving the choice; the gone season re-derives through getDefaultSeasonId
                notFound: {
                    recover: async () => {
                        skipGoneId(seasonChoice, selectedSeasonId.value, resolveSeasonChoice)
                        await Promise.all([refreshSeasons(), refreshActiveSeasonId()])
                    },
                    retries: 1,
                    toast: notFoundToast(seasons, selectedSeasonId, 'sæsonen'),
                    message: () => getRandomEmptyMessageText('seasonGone', now.value)
                }
            }
        )
        const {
            data: selectedSeason, error: selectedSeasonError, refresh: refreshSelectedSeason,
            isLoading: isSelectedSeasonFetching, isErrored: isSelectedSeasonErrored, isInitialized: isSelectedSeasonFetched
        } = selectedSeasonDataset

        const {CookingTeamDetailSchema, CreateTeamsResponseSchema, AssignTeamAffinitiesResponseSchema, CookingTeamAssignmentSchema} = useCookingTeamValidation()
        const {IdSchema} = useCoreValidation()
        const {DinnerEventDetailSchema, AssignCookingTeamsResponseSchema} = useBookingValidation()
        const {JokerSlotSchema} = useDutyValidation()
        const {formatRoleClaimedTitle} = useCookingTeam()

        // The mounting page selects the team (ADR-007 rule 9); GET under /api/admin/ is open to every member
        const teamChoice = shallowRef<() => number | null>(() => null)
        const selectTeam = (choice: MaybeRefOrGetter<number | null>) => {
            teamChoice.value = () => toValue(choice)
        }
        const selectedTeamId = computed(() => teamChoice.value())
        const selectedTeamDataset = storeAsyncData(
            'plan-store-selected-team',
            () => `/api/admin/team/${selectedTeamId.value}`,
            {
                schema: CookingTeamDetailSchema.nullable(),
                default: () => null,
                errorMessage: 'Kunne ikke hente hold',
                enabled: () => !!selectedTeamId.value,
                dependsOn: [seasonsDataset]
            }
        )
        const {
            data: selectedTeam, error: selectedTeamError, refresh: refreshSelectedTeam,
            isLoading: isSelectedTeamLoading, isErrored: isSelectedTeamErrored
        } = selectedTeamDataset

        // The season carries the team aggregates the master table reads, the team its Detail
        const refreshTeamAggregates = async () => {
            await Promise.all([
                selectedSeasonId.value ? refreshSelectedSeason() : undefined,
                selectedTeamId.value ? refreshSelectedTeam() : undefined
            ])
        }

        const isCreatingTeams = ref(false)
        const isSavingSeason = ref(false)
        const isActivatingSeason = ref(false)

        // Toast descriptions report what a save set in motion (ADR-009 operation results)
        const formatSeasonUpdate = (result: SeasonUpdateResponse): string => {
            const {created, deleted} = result.reconciliation
            const sentences = [`${created} datoer tilføjet, ${deleted} fjernet.`]
            if (result.scaffold) sentences.push('Forudbestillinger er opdateret.')
            if (created > 0) sentences.push('Husk at tildele madhold til nye datoer.')
            return sentences.join(' ')
        }
        const formatCreateTeams = ({teams, eventsAssigned}: CreateTeamsResponse): string =>
            `${teams.length} madhold oprettet · ${eventsAssigned} madlavninger tildelt`

        const toast = useToast()

        // ========================================
        // Computed - Public API (derived from status)
        // ========================================
        // A settled request initializes: null is the answer when no season is active
        const isActiveSeasonIdInitialized = computed(() => activeSeasonIdStatus.value === 'success')

        // Compound state: true while API call OR subsequent refreshes are in progress
        const isSavingSeasonFlowInProgress = computed(() =>
            isSavingSeason.value || isSeasonsLoading.value
        )

        // Compound state: true while API call OR subsequent refreshes are in progress
        const isActivatingSeasonFlowInProgress = computed(() =>
            isActivatingSeason.value || isSeasonsLoading.value || isActiveSeasonIdLoading.value
        )

        const isNoSeasons = computed(() => isSeasonsInitialized.value && seasons.value.length === 0)

        const isSelectedSeasonLoading = computed(() => {
            // When there are no seasons, nothing to load
            if (isNoSeasons.value) return false
            return isSelectedSeasonFetching.value
        })
        const isSelectedSeasonInitialized = computed(() => {
            // When there are no seasons, consider it initialized (nothing to select)
            if (isNoSeasons.value) return true
            // Otherwise wait for a season to be selected and loaded
            return isSelectedSeasonFetched.value
        })

        // Convenience computed for components - true when store is fully initialized and ready to use
        const isPlanStoreReady = computed(() =>
            isSeasonsInitialized.value &&
            isActiveSeasonIdInitialized.value &&
            (isNoSeasons.value || isSelectedSeasonInitialized.value)
        )

        // Overall error state - true if ANY dependency failed (prevents infinite loading)
        const isPlanStoreErrored = computed(() =>
            isSeasonsErrored.value || isActiveSeasonIdErrored.value || isSelectedSeasonErrored.value
        )

        // First error encountered (for display)
        const planStoreError = computed(() =>
            seasonsError.value || activeSeasonIdError.value || selectedSeasonError.value
        )

        // Active season - the community's currently active season (by activeSeasonId)
        const activeSeason = computed(() => {
            if (!activeSeasonId.value) return null
            return seasons.value.find(s => s.id === activeSeasonId.value) ?? null
        })

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

        // The selected season's Detail follows a write that changed it
        const settleSeason = async () => { if (selectedSeasonId.value) await refreshSelectedSeason() }

        // ACTIONS
        const loadSeasons = () => loadOrThrow(seasonsDataset, () => `🗓️ > PLAN_STORE > Loaded ${seasons.value.length} seasons`)

        const loadActiveSeason = () => loadOrThrow(activeSeasonIdDataset, () => `🗓️ > PLAN_STORE > Loaded active season ID: ${activeSeasonId.value}`)

        // Resolves null when the save fails; apiRequest has already toasted the error
        const saveSeason = async <T>(request: () => Promise<T>): Promise<T | null> => {
            isSavingSeason.value = true
            try {
                return await request()
            } catch {
                return null
            } finally {
                isSavingSeason.value = false
            }
        }

        const createSeason = async (season: Season): Promise<Season | null> => {
            const created = await saveSeason(() => apiRequest('/api/admin/season', {method: 'PUT', body: season, schema: SeasonSchema, action: 'createSeason'}))
            if (created === null) return null

            await loadSeasons()
            toastSaved('Sæson oprettet')
            return created
        }

        const assignTeamAffinitiesAndEvents = async (seasonId: number) => {
            // Step 1: Assign affinities to teams
            const affinityResult = await apiRequest(`/api/admin/season/${seasonId}/assign-team-affinities`, {method: 'POST', schema: AssignTeamAffinitiesResponseSchema, action: 'assignTeamAffinitiesAndEvents'})
            console.info(`👥 > PLAN_STORE > Assigned affinities to ${affinityResult.teamCount} teams for season ${seasonId}`)

            // Step 2: Assign teams to dinner events
            const assignmentResult = await apiRequest(`/api/admin/season/${seasonId}/assign-cooking-teams`, {method: 'POST', schema: AssignCookingTeamsResponseSchema, action: 'assignTeamAffinitiesAndEvents'})
            console.info(`🍽️ > PLAN_STORE > Assigned teams to ${assignmentResult.eventCount} dinner events for season ${seasonId}`)

            // Refresh selected season to get updated teams with affinities and event assignments
            await settleSeason()
            return {
                teamCount: affinityResult.teamCount,
                eventCount: assignmentResult.eventCount
            }
        }

        // Returns the operation envelope (ADR-009) so callers can report what the save changed
        const updateSeason = async (season: Season): Promise<SeasonUpdateResponse | null> => {
            const result = await saveSeason(() => apiRequest(`/api/admin/season/${season.id}`, {
                method: 'POST',
                body: season,
                schema: SeasonUpdateResponseSchema,
                action: 'updateSeason'
            }))
            if (result === null) return null

            await loadSeasons()
            await settleSeason()
            toastSaved('Sæson opdateret', formatSeasonUpdate(result))
            return result
        }

        // Shared implementation for activate/deactivate
        // Resolves the season the server activated or deactivated; null when the request fails
        const executeSeasonActivation = async (seasonId: number | null): Promise<Season | null> => {
            isActivatingSeason.value = true
            let season: Season | null
            try {
                season = await (seasonId
                    ? apiRequest('/api/admin/season/active', {method: 'POST', body: {seasonId}, schema: SeasonSchema, action: 'seasonActivation'})
                    : apiRequest('/api/admin/season/deactivate', {method: 'POST', schema: SeasonSchema.nullable(), action: 'seasonActivation'}))
            } catch {
                return null
            } finally {
                isActivatingSeason.value = false
            }

            await loadActiveSeason()
            await loadSeasons()
            return season
        }

        const activateSeason = async (seasonId: number): Promise<Season | null> => {
            console.info(`🌞 > PLAN_STORE > Activating season ${seasonId}`)
            const activated = await executeSeasonActivation(seasonId)
            console.info(`🌞 > PLAN_STORE > Successfully activated season ${seasonId}`)
            return activated
        }

        const deactivateSeason = async (): Promise<Season | null> => {
            console.info(`🌞 > PLAN_STORE > Deactivating season`)
            const deactivated = await executeSeasonActivation(null)
            await settleSeason()
            console.info(`🌞 > PLAN_STORE > Successfully deactivated season`)
            return deactivated
        }

        // COOKING TEAM ACTIONS - Part of Season aggregate (ADR-005)
        const createTeam = async (teamOrTeams: CookingTeamCreate | CookingTeamCreate[]): Promise<CreateTeamsResponse> => {
            const teams = Array.isArray(teamOrTeams) ? teamOrTeams : [teamOrTeams]

            isCreatingTeams.value = true
            try {
                // ADR-009 operation result: teams created + dinner events the assignment touched
                const created = await apiRequest('/api/admin/team', {
                    method: 'PUT',
                    body: teams,
                    schema: CreateTeamsResponseSchema,
                    action: 'createTeam'
                })
                console.info(`👥 > PLAN_STORE > Created ${created.teams.length} team(s), assigned ${created.eventsAssigned} dinner event(s)`)

                await settleSeason()
                toastSaved('Madhold oprettet', formatCreateTeams(created))
                return created
            } finally {
                isCreatingTeams.value = false
            }
        }

        // A name edit saves silently; an affinity change reshapes the season's cooking days and is reported
        const updateTeam = async (team: CookingTeamUpdate): Promise<CookingTeamDetail> => {
            const updated = await apiRequest(`/api/admin/team/${team.id}`, {
                method: 'POST',
                body: team,
                schema: CookingTeamDetailSchema,
                action: 'updateTeam'
            })
            console.info(`👥 > PLAN_STORE > Updated team "${updated.name}"`)
            await refreshTeamAggregates()
            if (team.affinity !== undefined) toastSaved('Madlavningsdage for teams opdateret')
            return updated
        }

        const deleteTeam = async (teamId: number): Promise<number> => {
            const deletedId = await apiRequest(`/api/admin/team/${teamId}`, {
                method: 'DELETE',
                schema: IdSchema,
                action: 'deleteTeam'
            })
            console.info(`👥 > PLAN_STORE > Deleted team ${teamId}`)
            // A deleted team has no Detail to refresh: the choice skips it and keeps following the page's getter
            skipGoneId(teamChoice, teamId)
            await refreshTeamAggregates()
            toastSaved('Madhold slettet')
            return deletedId
        }

        // TEAM MEMBER AND JOKER SLOT ACTIONS - Part of Team aggregate (ADR-005); the refresh carries the season and the team
        const addTeamMember = async (assignment: CookingTeamAssignmentCreate): Promise<CookingTeamAssignment> => {
            const created = await apiRequest('/api/admin/team/assignment', {
                method: 'PUT',
                body: assignment,
                schema: CookingTeamAssignmentSchema,
                action: 'addTeamMember'
            })
            console.info(`👥🔗 > PLAN_STORE > Added member ${assignment.inhabitantId} to team ${assignment.cookingTeamId} as ${assignment.role}`)
            await refreshTeamAggregates()
            toastSaved('Medlem tilføjet til hold', `${created.inhabitant.name} ${created.inhabitant.lastName}`)
            return created
        }

        const updateTeamMember = async (assignmentId: number, data: CookingTeamAssignmentUpdate): Promise<CookingTeamAssignment> => {
            const updated = await apiRequest(`/api/admin/team/assignment/${assignmentId}`, {
                method: 'POST',
                body: data,
                schema: CookingTeamAssignmentSchema,
                action: 'updateTeamMember'
            })
            console.info(`👥🔗 > PLAN_STORE > Updated team member assignment ${assignmentId}`)
            await refreshTeamAggregates()
            toastSaved('Medlem opdateret', `${updated.inhabitant.name} ${updated.inhabitant.lastName}`)
            return updated
        }

        const removeTeamMember = async (assignmentId: number): Promise<number> => {
            const deletedId = await apiRequest(`/api/admin/team/assignment/${assignmentId}`, {
                method: 'DELETE',
                schema: IdSchema,
                action: 'removeTeamMember'
            })
            console.info(`👥🔗 > PLAN_STORE > Removed team member assignment ${assignmentId}`)
            await refreshTeamAggregates()
            toastSaved('Medlem fjernet fra hold')
            return deletedId
        }

        const createJokerSlot = async (teamId: number, slot: JokerSlotCreate): Promise<JokerSlot> => {
            const created = await apiRequest(`/api/admin/team/${teamId}/joker-slot`, {
                method: 'PUT',
                body: slot,
                schema: JokerSlotSchema,
                action: 'createJokerSlot'
            })
            console.info(`🃏 > PLAN_STORE > Added ${slot.role} joker slot to team ${teamId}`)
            await refreshTeamAggregates()
            toastSaved('Joker tilføjet', ROLE_LABELS[created.role])
            return created
        }

        const deleteJokerSlot = async (teamId: number, slotId: number): Promise<number> => {
            const deletedId = await apiRequest(`/api/admin/team/${teamId}/joker-slot/${slotId}`, {
                method: 'DELETE',
                schema: IdSchema,
                action: 'deleteJokerSlot'
            })
            console.info(`🃏 > PLAN_STORE > Removed joker slot ${slotId} from team ${teamId}`)
            await refreshTeamAggregates()
            toastSaved('Joker fjernet')
            return deletedId
        }

        // DINNER EVENT ACTIONS
        const isRoleUpdating = ref(false)
        const assignRoleToDinner = async (dinnerEventId: number, inhabitantId: number, role: CookingTeamAssignment['role'], menuStrategy?: MenuSwapStrategy): Promise<DinnerEventDetail> => {
            isRoleUpdating.value = true
            try {
                const updated = await apiRequest(`/api/team/cooking/${dinnerEventId}/assign-role`, {
                    method: 'POST',
                    body: { inhabitantId, role, ...(menuStrategy && {menuStrategy}) },
                    schema: DinnerEventDetailSchema,
                    action: 'assignRoleToDinner'
                })
                console.info(`👥 > PLAN_STORE > Assigned ${role} role to inhabitant ${inhabitantId} for dinner event ${dinnerEventId}`)
                // Refresh selected detail LAST: on /chef the page watchEffect re-derives the
                // selected dinner id from myTeams/season, so settle those first or its re-run
                // reloads stale detail over the fresh fetch.
                await refreshTeamAggregates()
                await useUsersStore().loadMyTeams()
                await useBookingsStore().refreshSelectedDinnerEventDetail()
                return updated
            } finally {
                isRoleUpdating.value = false
            }
        }

        /**
         * Volunteer the current user for a role on a dinner. Wraps assignRoleToDinner +
         * shows the same date/team-aware toast as the auto-claim path. Returns null on error.
         */
        const claimRoleForMe = async (dinnerEvent: DinnerEventDetail, role: TeamRole, menuStrategy?: MenuSwapStrategy): Promise<DinnerEventDetail | null> => {
            const inhabitantId = authStore.inhabitantId
            if (inhabitantId === null) return null
            try {
                const updated = await assignRoleToDinner(dinnerEvent.id, inhabitantId, role, menuStrategy)
                toastSaved(formatRoleClaimedTitle(dinnerEvent, role))
                return updated
            } catch { return null }
        }

        /**
         * Withdraw the current user from a role on a dinner ("Meld afbud").
         * Clears chef + menu + allergens server-side; 207 means the Heynabo event
         * could not be deleted (best-effort, ADR-013). Returns null on error.
         */
        const resignRoleForMe = async (dinnerEvent: DinnerEventDetail, role: TeamRole): Promise<DinnerEventDetail | null> => {
            const inhabitantId = authStore.inhabitantId
            if (inhabitantId === null) return null
            isRoleUpdating.value = true
            try {
                let heynaboSyncDegraded = false
                const updated = await apiRequest(`/api/team/cooking/${dinnerEvent.id}/remove-role`, {
                    method: 'POST',
                    body: {inhabitantId, role},
                    schema: DinnerEventDetailSchema,
                    onResponse: ({response}) => { heynaboSyncDegraded = response.status === 207 },
                    action: 'resignRoleForMe'
                })
                console.info(`👥 > PLAN_STORE > Removed ${role} role from inhabitant ${inhabitantId} for dinner event ${dinnerEvent.id}`)
                // Refresh selected detail LAST: on /chef the page watchEffect re-derives the
                // selected dinner id from myTeams/season, so settle those first or its re-run
                // reloads stale detail over the fresh fetch.
                await refreshTeamAggregates()
                await useUsersStore().loadMyTeams()
                await useBookingsStore().refreshSelectedDinnerEventDetail()
                toastSaved('Du har meldt afbud. Tjansen som chefkok er nu ledig.')
                if (heynaboSyncDegraded) {
                    toast.add({
                        title: 'Heynabo-synkronisering fejlede',
                        description: 'Tjansen er fjernet, men Heynabo-begivenheden kunne ikke slettes. Tjek Heynabo.',
                        color: COLOR.error
                    })
                }
                return updated
            } catch {
                return null
            } finally {
                isRoleUpdating.value = false
            }
        }




        return {
            // state
            selectedSeason,
            selectedSeasonId,
            selectedSeasonDataset: markRaw(selectedSeasonDataset),
            selectedTeam,
            selectedTeamId,
            selectedTeamError,
            seasons,
            // computed state
            isActiveSeasonIdLoading,
            isActiveSeasonIdErrored,
            isActiveSeasonIdInitialized,
            isSavingSeasonFlowInProgress,
            isActivatingSeasonFlowInProgress,
            activeSeasonIdError,
            isSeasonsLoading,
            isNoSeasons,
            isSeasonsErrored,
            isSeasonsInitialized,
            seasonsError,
            isSelectedSeasonLoading,
            isSelectedSeasonErrored,
            isSelectedSeasonInitialized,
            selectedSeasonError,
            isSelectedTeamLoading,
            isSelectedTeamErrored,
            isPlanStoreReady,
            isPlanStoreErrored,
            planStoreError,
            activeSeason,
            disabledModes,
            isCreatingTeams,
            // actions
            loadSeasons,
            selectSeason,
            selectTeam,
            createSeason,
            updateSeason,
            activateSeason,
            deactivateSeason,
            assignTeamAffinitiesAndEvents,
            createTeam,
            updateTeam,
            deleteTeam,
            addTeamMember,
            updateTeamMember,
            removeTeamMember,
            createJokerSlot,
            deleteJokerSlot,
            assignRoleToDinner,
            claimRoleForMe,
            resignRoleForMe,
            isRoleUpdating
        }
    }
)

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(usePlanStore, import.meta.hot))
}
