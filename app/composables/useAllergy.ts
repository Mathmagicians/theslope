/**
 * Business logic composable for Allergy domain
 * Following ADR-001: Business logic in composables
 */
import type {AllergyTypeDetail, AllergyTypeDisplay, AllergyDisplay} from '~/composables/useAllergyValidation'
import type {OrderDetail} from '~/composables/useBookingValidation'
import type {InhabitantDisplay} from '~/composables/useCoreValidation'

// Affected diner with their matching allergens
export interface AffectedDiner {
  inhabitant: InhabitantDisplay
  matchingAllergens: AllergyTypeDisplay[]
}

// Statistics for affected diners; portions are kuverter in the kitchen panel's weights
export interface AffectedDinersResult {
  totalAffected: number
  totalPortions: number
  affectedList: AffectedDiner[]
  breakdownByAllergen: Array<{
    id: number
    name: string
    icon: string | null
    count: number
    portions: number
  }>
}

// The allergy overview of a set of allergens: every allergen in the given order, zero kuverter included
export interface AllergenOverview {
  totalPortions: number
  affectedList: AffectedDiner[]
  breakdownByAllergen: Array<{
    id: number
    name: string
    portions: number
  }>
}

export const useAllergy = () => {
  const {calculateTotalPortionsFromPrices} = useOrder()

  /**
   * Computes which diners carry an allergy, from the orders' inhabitant allergies (already fetched in DinnerEventDetail).
   * With menu allergen ids it counts only the allergies on the menu; without, every registered allergy.
   *
   * Answers: "Who eating THIS dinner is affected, and how many kuverter is that?"
   */
  const computeAffectedDiners = (
    orders: OrderDetail[],
    menuAllergenIds?: number[]
  ): AffectedDinersResult | null => {
    if (menuAllergenIds?.length === 0) return null

    const menuAllergenIdSet = menuAllergenIds ? new Set(menuAllergenIds) : null
    const affectedInhabitants = new Map<number, AffectedDiner>()
    const affectedOrders: OrderDetail[] = []
    const ordersByAllergen = new Map<number, { id: number; name: string; icon: string | null; orders: OrderDetail[] }>()

    orders.forEach(order => {
      const matchingAllergies = order.inhabitant.allergies?.filter(
        (allergy: AllergyDisplay) => !menuAllergenIdSet || menuAllergenIdSet.has(allergy.allergyTypeId)
      ) ?? []

      if (matchingAllergies.length > 0) {
        affectedOrders.push(order)

        // Track unique affected inhabitants
        if (!affectedInhabitants.has(order.inhabitant.id)) {
          affectedInhabitants.set(order.inhabitant.id, {
            inhabitant: order.inhabitant,
            matchingAllergens: matchingAllergies.map((a: AllergyDisplay) => a.allergyType)
          })
        }

        matchingAllergies.forEach((allergy: AllergyDisplay) => {
          const existing = ordersByAllergen.get(allergy.allergyTypeId)
          if (existing) {
            existing.orders.push(order)
          } else {
            ordersByAllergen.set(allergy.allergyTypeId, {
              id: allergy.allergyTypeId,
              name: allergy.allergyType.name,
              icon: allergy.allergyType.icon ?? null,
              orders: [order]
            })
          }
        })
      }
    })

    if (affectedInhabitants.size === 0) return null

    return {
      totalAffected: affectedInhabitants.size,
      totalPortions: calculateTotalPortionsFromPrices(affectedOrders),
      affectedList: Array.from(affectedInhabitants.values()),
      breakdownByAllergen: Array.from(ordersByAllergen.values())
        .map(({id, name, icon, orders}) => ({id, name, icon, count: orders.length, portions: calculateTotalPortionsFromPrices(orders)}))
        .sort((a, b) => b.portions - a.portions || b.count - a.count)
    }
  }

  /**
   * The allergy overview of the given allergens on these orders: the kuverter of the diners carrying any of them, and each
   * allergen in the given order with its kuverter, zero when no diner carries it.
   *
   * Answers: "How many kuverter on THIS dinner does each allergen on the menu touch?"
   */
  const computeAllergenOverview = (orders: OrderDetail[], allergens: AllergyTypeDisplay[]): AllergenOverview => {
    const affected = computeAffectedDiners(orders, allergens.map(allergen => allergen.id))
    const portionsById = new Map(affected?.breakdownByAllergen.map(({id, portions}) => [id, portions]))
    return {
      totalPortions: affected?.totalPortions ?? 0,
      affectedList: affected?.affectedList ?? [],
      breakdownByAllergen: allergens.map(({id, name}) => ({id, name, portions: portionsById.get(id) ?? 0}))
    }
  }

  /**
   * Check if an AllergyTypeDetail has any inhabitants with recently updated allergies.
   * Used for showing "new" badge on allergy types in lists/tables.
   */
  const hasNewAllergyInhabitants = (allergyType: AllergyTypeDetail): boolean => {
    return allergyType.inhabitants?.some(i => isNew(i.allergyUpdatedAt)) ?? false
  }

  return {
    computeAffectedDiners,       // For KitchenPreparation (diners only, menu filter optional)
    computeAllergenOverview,     // For ChefMenuCard and AllergenMultiSelector (the menu allergens on this dinner)
    hasNewAllergyInhabitants     // For "new" badge in allergy type lists
  }
}
