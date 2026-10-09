/**
 * Business logic composable for Allergy domain
 * Following ADR-001: Business logic in composables
 */
import type {AllergyTypeDetail, AllergyTypeDisplay} from '~/composables/useAllergyValidation'
import type {OrderDetail} from '~/composables/useBookingValidation'
import type {InhabitantDisplay} from '~/composables/useCoreValidation'

// Affected diner with their matching allergens and the tickets they eat on
export interface AffectedDiner {
  key: string
  inhabitant: InhabitantDisplay
  orderIds: number[]
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

// The allergy overview of a set of allergens: every allergen itself in the given order with its kuverter, zero included
export interface AllergenOverview {
  totalPortions: number
  affectedList: AffectedDiner[]
  breakdownByAllergen: Array<AllergyTypeDisplay & {portions: number}>
}

export const useAllergy = () => {
  const {calculateTotalPortionsFromPrices} = useOrder()

  /**
   * The allergies one ticket's diner carries, one per allergy type. A guest ticket books on its booker's inhabitant, so
   * it carries only the allergies named on the ticket (`provenanceAllergies`), matched by name in the catalogue.
   */
  const getTicketAllergens = (order: OrderDetail, catalogue: AllergyTypeDisplay[]): AllergyTypeDisplay[] => {
    const allergens = order.isGuestTicket
      ? (order.provenanceAllergies ?? []).flatMap(name => catalogue.find(allergyType => allergyType.name === name) ?? [])
      : (order.inhabitant.allergies ?? []).map(allergy => ({...allergy.allergyType, id: allergy.allergyTypeId}))
    return Array.from(new Map(allergens.map(allergyType => [allergyType.id, allergyType])).values())
  }

  /**
   * Computes which diners carry an allergy, from the orders' inhabitant allergies (already fetched in DinnerEventDetail)
   * and a guest ticket's own allergies matched in the catalogue. With menu allergen ids it counts only the allergies on
   * the menu; without, every registered allergy.
   *
   * Answers: "Who eating THIS dinner is affected, and how many kuverter is that?"
   */
  const computeAffectedDiners = (
    orders: OrderDetail[],
    catalogue: AllergyTypeDisplay[],
    menuAllergenIds?: number[]
  ): AffectedDinersResult | null => {
    if (menuAllergenIds?.length === 0) return null

    const menuAllergenIdSet = menuAllergenIds ? new Set(menuAllergenIds) : null
    const affectedDiners = new Map<string, AffectedDiner>()
    const affectedOrders: OrderDetail[] = []
    const ordersByAllergen = new Map<number, { id: number; name: string; icon: string | null; orders: OrderDetail[] }>()

    orders.forEach(order => {
      const matchingAllergens = getTicketAllergens(order, catalogue)
        .filter(allergyType => !menuAllergenIdSet || menuAllergenIdSet.has(allergyType.id))
      if (matchingAllergens.length === 0) return

      affectedOrders.push(order)

      // Each guest ticket is its own diner; an inhabitant's own tickets are one diner
      const key = order.isGuestTicket ? `guest-${order.id}` : `inhabitant-${order.inhabitant.id}`
      const diner = affectedDiners.get(key)
      if (diner) diner.orderIds.push(order.id)
      else affectedDiners.set(key, {key, inhabitant: order.inhabitant, orderIds: [order.id], matchingAllergens})

      matchingAllergens.forEach(allergyType => {
        const existing = ordersByAllergen.get(allergyType.id)
        if (existing) {
          existing.orders.push(order)
        } else {
          ordersByAllergen.set(allergyType.id, {
            id: allergyType.id,
            name: allergyType.name,
            icon: allergyType.icon ?? null,
            orders: [order]
          })
        }
      })
    })

    if (affectedDiners.size === 0) return null

    return {
      totalAffected: affectedDiners.size,
      totalPortions: calculateTotalPortionsFromPrices(affectedOrders),
      affectedList: Array.from(affectedDiners.values()),
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
    const affected = computeAffectedDiners(orders, allergens, allergens.map(allergen => allergen.id))
    const portionsById = new Map(affected?.breakdownByAllergen.map(({id, portions}) => [id, portions]))
    return {
      totalPortions: affected?.totalPortions ?? 0,
      affectedList: affected?.affectedList ?? [],
      breakdownByAllergen: allergens.map(allergen => ({...allergen, portions: portionsById.get(allergen.id) ?? 0}))
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
    computeAffectedDiners,       // The counting behind computeAllergenOverview, menu filter optional
    computeAllergenOverview,     // For ChefMenuCard, AllergenMultiSelector and KitchenPreparation (the menu allergens on these orders)
    hasNewAllergyInhabitants     // For "new" badge in allergy type lists
  }
}
