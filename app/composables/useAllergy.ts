/**
 * Business logic composable for Allergy domain
 * Following ADR-001: Business logic in composables
 */
import type {AllergyTypeDetail, AllergyTypeDisplay} from '~/composables/useAllergyValidation'
import type {OrderDetail} from '~/composables/useBookingValidation'
import type {InhabitantDisplay} from '~/composables/useCoreValidation'

// Affected diner with their matching allergens
export interface AffectedDiner {
  inhabitant: InhabitantDisplay
  matchingAllergens: AllergyTypeDisplay[]
}

// Statistics for affected diners
export interface AffectedDinersResult {
  totalAffected: number
  affectedList: AffectedDiner[]
  breakdownByAllergen: Array<{
    name: string
    icon: string | null
    count: number
  }>
}

// Statistics for all inhabitants with allergies (used for UserListItem display)
export interface AllergyStatisticsResult {
  totalInhabitants: number
  uniqueInhabitantsList: InhabitantDisplay[]
  breakdownByAllergy: Array<{
    name: string
    icon: string | null
    count: number
  }>
}

export const useAllergy = () => {

  /**
   * Computes which diners are affected by menu allergens.
   * Uses orders' inhabitant allergies (already fetched in DinnerEventDetail).
   *
   * Answers: "Who eating THIS dinner is affected by these menu allergens?"
   */
  const computeAffectedDiners = (
    orders: OrderDetail[],
    menuAllergenIds: number[]
  ): AffectedDinersResult | null => {
    if (menuAllergenIds.length === 0) return null

    const menuAllergenIdSet = new Set(menuAllergenIds)
    const affectedInhabitants = new Map<number, AffectedDiner>()
    const allergenCounts = new Map<string, { name: string; icon: string | null; count: number }>()

    orders.forEach(order => {
      const matchingAllergies = order.inhabitant.allergies?.filter(
        allergy => menuAllergenIdSet.has(allergy.allergyTypeId)
      ) ?? []

      if (matchingAllergies.length > 0) {
        // Track unique affected inhabitants
        if (!affectedInhabitants.has(order.inhabitant.id)) {
          affectedInhabitants.set(order.inhabitant.id, {
            inhabitant: order.inhabitant,
            matchingAllergens: matchingAllergies.map(a => a.allergyType)
          })
        }

        // Count per allergen
        matchingAllergies.forEach(allergy => {
          const key = allergy.allergyType.name
          const existing = allergenCounts.get(key)
          if (existing) {
            existing.count++
          } else {
            allergenCounts.set(key, {
              name: allergy.allergyType.name,
              icon: allergy.allergyType.icon ?? null,
              count: 1
            })
          }
        })
      }
    })

    if (affectedInhabitants.size === 0) return null

    return {
      totalAffected: affectedInhabitants.size,
      affectedList: Array.from(affectedInhabitants.values()),
      breakdownByAllergen: Array.from(allergenCounts.values()).sort((a, b) => b.count - a.count)
    }
  }

  /**
   * Computes allergy statistics from AllergyTypeDetail[] (all inhabitants).
   * Extracted from AllergenMultiSelector for reuse.
   *
   * Answers: "Who in the entire community has these allergies?"
   */
  const computeAllergyStatistics = (allergies: AllergyTypeDetail[]): AllergyStatisticsResult | null => {
    if (allergies.length === 0) return null

    // Get unique inhabitants across all selected allergies (for UserListItem display)
    const uniqueInhabitants = new Map<number, InhabitantDisplay>()
    allergies.forEach(allergy => {
      allergy.inhabitants?.forEach(inhabitant => {
        if (!uniqueInhabitants.has(inhabitant.id)) {
          uniqueInhabitants.set(inhabitant.id, inhabitant)
        }
      })
    })

    return {
      totalInhabitants: uniqueInhabitants.size,
      uniqueInhabitantsList: Array.from(uniqueInhabitants.values()),
      breakdownByAllergy: allergies.map(allergy => ({
        name: allergy.name,
        icon: allergy.icon ?? null,
        count: allergy.inhabitants?.length || 0
      }))
    }
  }

  return {
    computeAffectedDiners,      // For KitchenPreparation (diners only)
    computeAllergyStatistics    // For AllergenMultiSelector (all inhabitants)
  }
}
