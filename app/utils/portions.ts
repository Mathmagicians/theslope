import type {z} from 'zod'
import {useTicketPriceValidation} from '~/composables/useTicketPriceValidation'

const {TicketTypeSchema} = useTicketPriceValidation()
const TICKET = TicketTypeSchema.enum
export type TicketType = z.infer<typeof TicketTypeSchema>

export type PortionTicketPrice = {ticketType: TicketType}

// The kitchen counts an adult as one portion and a child as half; a baby eats from the parents' plates
export const getPortionsForTicketType = (ticketType: TicketType): number => {
    if (ticketType === TICKET.ADULT) return 1
    if (ticketType === TICKET.CHILD) return 0.5
    return 0
}

// A ticket price weighs what its type weighs
export const getPortionsForTicketPrice = (ticketPrice: PortionTicketPrice): number => getPortionsForTicketType(ticketPrice.ticketType)
