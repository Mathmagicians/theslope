import type {Season, SeasonUpdateResponse} from '~/composables/useSeasonValidation'
import {ROLE_LABELS, type CookingTeamDetail, type CookingTeamAssignment, type CookingTeamCreate, type CookingTeamUpdate, type CookingTeamAssignmentCreate, type CookingTeamAssignmentUpdate, type CreateTeamsResponse, type TeamRole} from '~/composables/useCookingTeamValidation'
import type {DinnerEventDetail, MenuSwapStrategy} from '~/composables/useBookingValidation'
import type {JokerSlot, JokerSlotCreate} from '~/composables/useDutyValidation'
import {FORM_MODES, type FormMode} from '~/types/form'

export const usePlanStore = defineStore("Plan", () => {
        // DEPENDENCIES
        const {storeAsyncData, apiRequest} = useApiHandler()
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
            data: activeSeasonId, status: activeSeasonIdStatus,
            error: activeSeasonIdError, refresh: refreshActiveSeasonId
        } = activeSeasonIdDataset

        const seasonsDataset = storeAsyncData('plan-store-seasons', '/api/admin/season', {
            schema: SeasonSchema.array(),
            default: () => []
        })
        const {
            data: seasons, status: seasonsStatus,
            error: seasonsError, refresh: refreshSeasons
        } = seasonsDataset

        // Helper: Get default season ID (active season or first available)
        const getDefaultSeasonId = (): number | null => {
            if (activeSeasonId.value) {
                console.info(`${LOG_CTX} 🗓️ > Using active season ID: ${activeSeasonId.value}`)
                return activeSeasonId.value
            } else if (seasons.value.length > 0) {
                const {sortSeasonsByActivePriority} = useSeason()
                const sortedSeasons = sortSeasonsByActivePriority(seasons.value)
                const firstId = sortedSeasons[0]?.id ?? null
                console.info(`${LOG_CTX} 🗓️ > No active season, using first sorted season ID: ${firstId}`)
                return firstId
            }
            console.warn(`${LOG_CTX} 🗓️ > No seasons available, cannot determine default`)
            return null
        }

        // A shortName resolves once the seasons have loaded; an unknown one falls back to the default
        const userChoice = ref<{id: number} | {shortName: string} | null>(null)
        const chosenSeasonId = computed(() => {
            const choice = userChoice.value
            if (!choice) return null
            if ('id' in choice) return choice.id
            return seasons.value.find(s => s.shortName === choice.shortName)?.id ?? null
        })
        const selectedSeasonId = computed(() => chosenSeasonId.value ?? getDefaultSeasonId())

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
                // The choice re-derives through getDefaultSeasonId from the refreshed lists
                notFound: {
                    recover: async () => {
                        userChoice.value = null
                        await Promise.all([refreshSeasons(), refreshActiveSeasonId()])
                    },
                    retries: 1,
                    toast: () => `Kan ikke finde sæsonen ${seasons.value.find(s => s.id === selectedSeasonId.value)?.shortName ?? selectedSeasonId.value}`,
                    message: () => {
                        const {emoji, text} = getRandomEmptyMessage('seasonGone')
                        return `${emoji} ${text}`
                    }
                }
            }
        )
        const {
            data: selectedSeason, status: selectedSeasonStatus,
            error: selectedSeasonError, refresh: refreshSelectedSeason
        } = selectedSeasonDataset

        const {CookingTeamDetailSchema, CreateTeamsResponseSchema, AssignTeamAffinitiesResponseSchema, CookingTeamAssignmentSchema} = useCookingTeamValidation()
        const {DeletedCountSchema} = useCoreValidation()
        const {DinnerEventDetailSchema, AssignCookingTeamsResponseSchema} = useBookingValidation()
        const {JokerSlotSchema} = useDutyValidation()

        // The mounting page selects the team (ADR-007 rule 9); GET under /api/admin/ is open to every member
        const selectedTeamId = ref<number | null>(null)
        const selectTeam = (id: number | null) => {
            selectedTeamId.value = id
        }
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
            data: selectedTeam, status: selectedTeamStatus,
            error: selectedTeamError, refresh: refreshSelectedTeam
        } = selectedTeamDataset
        const isSelectedTeamLoading = computed(() => selectedTeamStatus.value === 'pending')
        const isSelectedTeamErrored = computed(() => selectedTeamStatus.value === 'error')

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
        const toastSaved = (title: string, description?: string) =>
            toast.add({title, description, icon: ICONS.checkCircle, color: COLOR.success})

        // ========================================
        // Computed - Public API (derived from status)
        // ========================================
        const isActiveSeasonIdLoading = computed(() => activeSeasonIdStatus.value === 'pending')
        const isActiveSeasonIdErrored = computed(() => activeSeasonIdStatus.value === 'error')
        const isActiveSeasonIdInitialized = computed(() => activeSeasonIdStatus.value === 'success')

        // Compound state: true while API call OR subsequent refreshes are in progress
        const isSavingSeasonFlowInProgress = computed(() =>
            isSavingSeason.value || isSeasonsLoading.value
        )

        // Compound state: true while API call OR subsequent refreshes are in progress
        const isActivatingSeasonFlowInProgress = computed(() =>
            isActivatingSeason.value || isSeasonsLoading.value || isActiveSeasonIdLoading.value
        )

        const isSeasonsLoading = computed(() => seasonsStatus.value === 'pending')
        const isSeasonsErrored = computed(() => seasonsStatus.value === 'error')
        const isSeasonsInitialized = computed(() => seasonsStatus.value === 'success')
        const isNoSeasons = computed(() => isSeasonsInitialized.value && seasons.value.length === 0)

        const isSelectedSeasonLoading = computed(() => {
            // When there are no seasons, nothing to load
            if (isNoSeasons.value) return false
            return selectedSeasonStatus.value === 'pending'
        })
        const isSelectedSeasonErrored = computed(() => selectedSeasonStatus.value === 'error')
        const isSelectedSeasonInitialized = computed(() => {
            // When there are no seasons, consider it initialized (nothing to select)
            if (isNoSeasons.value) return true
            // Otherwise wait for a season to be selected and loaded
            return selectedSeasonStatus.value === 'success' && selectedSeason.value !== null
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

        // ACTIONS
        const loadSeasons = async () => {
            await refreshSeasons()
            if (seasonsError.value) throw seasonsError.value
            console.info(`🗓️ > PLAN_STORE > Loaded ${seasons.value.length} seasons`)
        }

        const loadSeason = (id: number) => {
            userChoice.value = {id}
            console.info(`🗓️ > PLAN_STORE > Loading season ID: ${id}`)
        }

    const loadActiveSeason = async () => {
        await refreshActiveSeasonId()
        if (activeSeasonIdError.value) throw activeSeasonIdError.value
        console.info('🗓️ > PLAN_STORE > Loaded active season ID:', activeSeasonId.value)
    }

        const loadSeasonByShortName = (shortName: string) => {
            userChoice.value = {shortName}
            console.info(`${LOG_CTX} 🗓️ > PLAN_STORE > Loading season by shortName: ${shortName}`)
        }

        const onSeasonSelect = (id: number) => {
            loadSeason(id)
        }

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
            if (selectedSeasonId.value) {
                await refreshSelectedSeason()
            }
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
            if (selectedSeasonId.value) {
                await refreshSelectedSeason()
            }
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
            loadSeason(seasonId)
            console.info(`🌞 > PLAN_STORE > Successfully activated season ${seasonId}`)
            return activated
        }

        const deactivateSeason = async (): Promise<Season | null> => {
            console.info(`🌞 > PLAN_STORE > Deactivating season`)
            const deactivated = await executeSeasonActivation(null)
            if (selectedSeasonId.value) {
                await refreshSelectedSeason()
            }
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

                if (selectedSeasonId.value) {
                    await refreshSelectedSeason()
                }
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

        const deleteTeam = async (teamId: number): Promise<CookingTeamDetail> => {
            const deleted = await apiRequest(`/api/admin/team/${teamId}`, {
                method: 'DELETE',
                schema: CookingTeamDetailSchema,
                action: 'deleteTeam'
            })
            console.info(`👥 > PLAN_STORE > Deleted team ${teamId}`)
            // A deleted team has no Detail to refresh: its selection closes the dataset's gate instead
            if (selectedTeamId.value === teamId) selectTeam(null)
            await refreshTeamAggregates()
            toastSaved('Madhold slettet')
            return deleted
        }

        // TEAM MEMBER AND JOKER SLOT ACTIONS - Part of Team aggregate (ADR-005); a create returns the
        // created entity, a delete the deleted count, and the refresh carries the season and the team (ADR-009)
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
            const deleted = await apiRequest(`/api/admin/team/assignment/${assignmentId}`, {
                method: 'DELETE',
                schema: DeletedCountSchema,
                action: 'removeTeamMember'
            })
            console.info(`👥🔗 > PLAN_STORE > Removed team member assignment ${assignmentId}`)
            await refreshTeamAggregates()
            toastSaved('Medlem fjernet fra hold')
            return deleted
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
            const deleted = await apiRequest(`/api/admin/team/${teamId}/joker-slot/${slotId}`, {
                method: 'DELETE',
                schema: DeletedCountSchema,
                action: 'deleteJokerSlot'
            })
            console.info(`🃏 > PLAN_STORE > Removed joker slot ${slotId} from team ${teamId}`)
            await refreshTeamAggregates()
            toastSaved('Joker fjernet')
            return deleted
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
                if (selectedSeasonId.value) await refreshSelectedSeason()
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
                const {formatRoleClaimedTitle} = useCookingTeam()
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
                if (selectedSeasonId.value) await refreshSelectedSeason()
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
            loadSeasonByShortName,
            loadSeasons,
            onSeasonSelect,
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
