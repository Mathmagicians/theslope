import type {D1Database} from '@cloudflare/workers-types'
import {PrismaD1} from "@prisma/adapter-d1"
import {PrismaClient} from "@prisma/client"
import eventHandlerHelper from "../utils/eventHandlerHelper"
import type {
    AllergyTypeCreate,
    AllergyTypeUpdate,
    AllergyTypeDisplay,
    AllergyTypeDetail,
    AllergyCreate,
    AllergyUpdate,
    AllergyDisplay,
    AllergyDetail
} from '~/composables/useAllergyValidation'
import {useAllergyValidation} from '~/composables/useAllergyValidation'

const {h3eFromCatch} = eventHandlerHelper

/**
 * Get Prisma client connection to D1 database
 */
export async function getPrismaClientConnection(d1Client: D1Database) {
    const adapter = new PrismaD1(d1Client)
    const prisma = new PrismaClient({adapter})
    await prisma.$connect()
    return prisma
}

/*** ALLERGY TYPES ***/

/**
 * Fetch all allergy types with inhabitants who have each allergy
 * Returns AllergyTypeDetail with nested inhabitant data
 * Used by admin allergy management master-detail view
 */
export async function fetchAllergyTypes(d1Client: D1Database): Promise<AllergyTypeDetail[]> {
    console.info(`🏥 > ALLERGY_TYPE > [GET] Fetching all allergy types with inhabitants`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {AllergyTypeDetailSchema} = useAllergyValidation()

    try {
        const allergyTypes = await prisma.allergyType.findMany({
            include: {
                Allergy: {
                    include: {
                        inhabitant: {
                            select: {
                                id: true,
                                heynaboId: true,
                                name: true,
                                lastName: true,
                                pictureUrl: true,
                                birthDate: true,
                                household: {
                                    select: {
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        // Transform to AllergyTypeDetail format
        const result = allergyTypes.map(allergyType => ({
            id: allergyType.id,
            name: allergyType.name,
            description: allergyType.description,
            icon: allergyType.icon,
            inhabitants: allergyType.Allergy.map(allergy => ({
                id: allergy.inhabitant.id,
                heynaboId: allergy.inhabitant.heynaboId,
                name: allergy.inhabitant.name,
                lastName: allergy.inhabitant.lastName,
                pictureUrl: allergy.inhabitant.pictureUrl,
                birthDate: allergy.inhabitant.birthDate,
                householdName: allergy.inhabitant.household.name,
                inhabitantComment: allergy.inhabitantComment
            }))
        }))

        // Sort by number of inhabitants (descending)
        result.sort((a, b) => b.inhabitants.length - a.inhabitants.length)

        console.info(`🏥 > ALLERGY_TYPE > [GET] Successfully fetched ${result.length} allergy types with inhabitants`)

        // Validate before returning (ADR-010)
        return result.map(at => AllergyTypeDetailSchema.parse(at))
    } catch (error) {
        const h3e = h3eFromCatch('Error fetching allergy types', error)
        console.error(`🏥 > ALLERGY_TYPE > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

/**
 * Fetch single allergy type by ID
 * Returns AllergyTypeDisplay (scalar fields only, no relations)
 */
export async function fetchAllergyType(d1Client: D1Database, id: number): Promise<AllergyTypeDisplay | null> {
    console.info(`🏥 > ALLERGY_TYPE > [GET] Fetching allergy type with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {AllergyTypeDisplaySchema} = useAllergyValidation()

    try {
        const allergyType = await prisma.allergyType.findUnique({
            where: {id}
        })

        if (allergyType) {
            console.info(`🏥 > ALLERGY_TYPE > [GET] Found allergy type ${allergyType.name} (ID: ${allergyType.id})`)
            return AllergyTypeDisplaySchema.parse(allergyType)
        } else {
            console.info(`🏥 > ALLERGY_TYPE > [GET] No allergy type found with ID ${id}`)
            return null
        }
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching allergy type with ID ${id}`, error)
        console.error(`🏥 > ALLERGY_TYPE > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

/**
 * Create new allergy type (admin only)
 * Returns AllergyTypeDisplay
 */
export async function createAllergyType(d1Client: D1Database, allergyTypeData: AllergyTypeCreate): Promise<AllergyTypeDisplay> {
    console.info(`🏥 > ALLERGY_TYPE > [CREATE] Creating allergy type ${allergyTypeData.name}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {AllergyTypeDisplaySchema} = useAllergyValidation()

    try {
        const newAllergyType = await prisma.allergyType.create({
            data: allergyTypeData
        })

        console.info(`🏥 > ALLERGY_TYPE > [CREATE] Successfully created allergy type ${newAllergyType.name} with ID ${newAllergyType.id}`)
        return AllergyTypeDisplaySchema.parse(newAllergyType)
    } catch (error) {
        const h3e = h3eFromCatch(`Error creating allergy type ${allergyTypeData.name}`, error)
        console.error(`🏥 > ALLERGY_TYPE > [CREATE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

/**
 * Update allergy type (admin only)
 * Returns AllergyTypeDisplay
 */
export async function updateAllergyType(d1Client: D1Database, allergyTypeData: AllergyTypeUpdate): Promise<AllergyTypeDisplay> {
    console.info(`🏥 > ALLERGY_TYPE > [UPDATE] Updating allergy type with ID ${allergyTypeData.id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {AllergyTypeDisplaySchema} = useAllergyValidation()

    const {id, ...updateData} = allergyTypeData

    try {
        const updatedAllergyType = await prisma.allergyType.update({
            where: {id},
            data: updateData
        })

        console.info(`🏥 > ALLERGY_TYPE > [UPDATE] Successfully updated allergy type ${updatedAllergyType.name}`)
        return AllergyTypeDisplaySchema.parse(updatedAllergyType)
    } catch (error) {
        const h3e = h3eFromCatch(`Error updating allergy type with ID ${id}`, error)
        console.error(`🏥 > ALLERGY_TYPE > [UPDATE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

/**
 * Delete allergy type (admin only)
 * ADR-005: Cascade deletes related Allergy records automatically
 * Returns AllergyTypeDisplay
 */
export async function deleteAllergyType(d1Client: D1Database, id: number): Promise<AllergyTypeDisplay> {
    console.info(`🏥 > ALLERGY_TYPE > [DELETE] Deleting allergy type with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {AllergyTypeDisplaySchema} = useAllergyValidation()

    try {
        // ADR-005: Single atomic delete - Prisma handles CASCADE deletion of related allergies
        const deletedAllergyType = await prisma.allergyType.delete({
            where: {id}
        })

        console.info(`🏥 > ALLERGY_TYPE > [DELETE] Successfully deleted allergy type ${deletedAllergyType.name}`)
        return AllergyTypeDisplaySchema.parse(deletedAllergyType)
    } catch (error) {
        const h3e = h3eFromCatch(`Error deleting allergy type with ID ${id}`, error)
        console.error(`🏥 > ALLERGY_TYPE > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

/*** ALLERGIES ***/

/**
 * Fetch all allergies for a specific inhabitant
 * Returns AllergyDetail (with allergyType + inhabitant relations)
 */
export async function fetchAllergiesForInhabitant(d1Client: D1Database, inhabitantId: number): Promise<AllergyDetail[]> {
    console.info(`🏥 > ALLERGY > [GET] Fetching allergies for inhabitant ID ${inhabitantId}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {AllergyDetailSchema} = useAllergyValidation()

    try {
        const allergies = await prisma.allergy.findMany({
            where: {inhabitantId},
            include: {
                allergyType: true,
                inhabitant: {
                    select: {
                        id: true,
                        heynaboId: true,
                        name: true,
                        lastName: true,
                        pictureUrl: true,
                        birthDate: true
                    }
                }
            }
        })

        console.info(`🏥 > ALLERGY > [GET] Successfully fetched ${allergies.length} allergies for inhabitant ${inhabitantId}`)

        // Validate before returning (ADR-010)
        return allergies.map(a => AllergyDetailSchema.parse(a))
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching allergies for inhabitant ${inhabitantId}`, error)
        console.error(`🏥 > ALLERGY > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

/**
 * Fetch all allergies for all inhabitants in a household
 * Returns AllergyDetail (with allergyType + inhabitant relations)
 */
export async function fetchAllergiesForHousehold(d1Client: D1Database, householdId: number): Promise<AllergyDetail[]> {
    console.info(`🏥 > ALLERGY > [GET] Fetching allergies for household ID ${householdId}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {AllergyDetailSchema} = useAllergyValidation()

    try {
        const allergies = await prisma.allergy.findMany({
            where: {
                inhabitant: {
                    householdId
                }
            },
            include: {
                allergyType: true,
                inhabitant: {
                    select: {
                        id: true,
                        heynaboId: true,
                        name: true,
                        lastName: true,
                        pictureUrl: true,
                        birthDate: true
                    }
                }
            }
        })

        console.info(`🏥 > ALLERGY > [GET] Successfully fetched ${allergies.length} allergies for household ${householdId}`)

        // Validate before returning (ADR-010)
        return allergies.map(a => AllergyDetailSchema.parse(a))
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching allergies for household ${householdId}`, error)
        console.error(`🏥 > ALLERGY > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

/**
 * Fetch all allergies for a specific allergy type (admin view)
 * Returns AllergyDetail (with allergyType + inhabitant relations)
 */
export async function fetchAllergiesForAllergyType(d1Client: D1Database, allergyTypeId: number): Promise<AllergyDetail[]> {
    console.info(`🏥 > ALLERGY > [GET] Fetching allergies for allergy type ID ${allergyTypeId}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {AllergyDetailSchema} = useAllergyValidation()

    try {
        const allergies = await prisma.allergy.findMany({
            where: {allergyTypeId},
            include: {
                allergyType: true,
                inhabitant: {
                    select: {
                        id: true,
                        heynaboId: true,
                        name: true,
                        lastName: true,
                        pictureUrl: true,
                        birthDate: true
                    }
                }
            }
        })

        console.info(`🏥 > ALLERGY > [GET] Successfully fetched ${allergies.length} allergies for allergy type ${allergyTypeId}`)

        // Validate before returning (ADR-010)
        return allergies.map(a => AllergyDetailSchema.parse(a))
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching allergies for allergy type ${allergyTypeId}`, error)
        console.error(`🏥 > ALLERGY > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

/**
 * Fetch single allergy by ID
 * Returns AllergyDetail (with allergyType + inhabitant relations)
 */
export async function fetchAllergy(d1Client: D1Database, id: number): Promise<AllergyDetail | null> {
    console.info(`🏥 > ALLERGY > [GET] Fetching allergy with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {AllergyDetailSchema} = useAllergyValidation()

    try {
        const allergy = await prisma.allergy.findFirst({
            where: {id},
            include: {
                allergyType: true,
                inhabitant: {
                    select: {
                        id: true,
                        heynaboId: true,
                        name: true,
                        lastName: true,
                        pictureUrl: true,
                        birthDate: true
                    }
                }
            }
        })

        if (allergy) {
            console.info(`🏥 > ALLERGY > [GET] Found allergy (ID: ${allergy.id})`)
            // Validate before returning (ADR-010)
            return AllergyDetailSchema.parse(allergy)
        } else {
            console.info(`🏥 > ALLERGY > [GET] No allergy found with ID ${id}`)
            return null
        }
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching allergy with ID ${id}`, error)
        console.error(`🏥 > ALLERGY > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

/**
 * Create new allergy for an inhabitant
 * Returns AllergyDetail (with allergyType + inhabitant relations)
 */
export async function createAllergy(d1Client: D1Database, allergyData: AllergyCreate): Promise<AllergyDetail> {
    console.info(`🏥 > ALLERGY > [CREATE] Creating allergy for inhabitant ID ${allergyData.inhabitantId} with allergy type ID ${allergyData.allergyTypeId}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {AllergyDetailSchema} = useAllergyValidation()

    try {
        // Remove allergyType from create data (it's a relation, not a field)
        const {allergyType, ...createData} = allergyData as AllergyCreate & {allergyType?: unknown}

        const newAllergy = await prisma.allergy.create({
            data: createData,
            include: {
                allergyType: true,
                inhabitant: {
                    select: {
                        id: true,
                        heynaboId: true,
                        name: true,
                        lastName: true,
                        pictureUrl: true,
                        birthDate: true
                    }
                }
            }
        })

        console.info(`🏥 > ALLERGY > [CREATE] Successfully created allergy with ID ${newAllergy.id}`)
        // Validate before returning (ADR-010)
        return AllergyDetailSchema.parse(newAllergy)
    } catch (error) {
        const h3e = h3eFromCatch(`Error creating allergy for inhabitant ${allergyData.inhabitantId}`, error)
        console.error(`🏥 > ALLERGY > [CREATE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

/**
 * Update existing allergy
 * Returns AllergyDetail (with allergyType + inhabitant relations)
 */
export async function updateAllergy(d1Client: D1Database, allergyData: AllergyUpdate): Promise<AllergyDetail> {
    console.info(`🏥 > ALLERGY > [UPDATE] Updating allergy with ID ${allergyData.id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {AllergyDetailSchema} = useAllergyValidation()

    const {id, allergyType, ...updateData} = allergyData as AllergyUpdate & {allergyType?: unknown}

    try {
        const updatedAllergy = await prisma.allergy.update({
            where: {id},
            data: updateData,
            include: {
                allergyType: true,
                inhabitant: {
                    select: {
                        id: true,
                        heynaboId: true,
                        name: true,
                        lastName: true,
                        pictureUrl: true,
                        birthDate: true
                    }
                }
            }
        })

        console.info(`🏥 > ALLERGY > [UPDATE] Successfully updated allergy with ID ${updatedAllergy.id}`)
        // Validate before returning (ADR-010)
        return AllergyDetailSchema.parse(updatedAllergy)
    } catch (error) {
        const h3e = h3eFromCatch(`Error updating allergy with ID ${id}`, error)
        console.error(`🏥 > ALLERGY > [UPDATE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

/**
 * Delete allergy
 * Returns AllergyDisplay (scalar fields only, no inhabitant relation)
 */
export async function deleteAllergy(d1Client: D1Database, id: number): Promise<AllergyDisplay> {
    console.info(`🏥 > ALLERGY > [DELETE] Deleting allergy with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {AllergyDisplaySchema} = useAllergyValidation()

    try {
        const deletedAllergy = await prisma.allergy.delete({
            where: {id},
            include: {
                allergyType: true
            }
        })

        console.info(`🏥 > ALLERGY > [DELETE] Successfully deleted allergy with ID ${deletedAllergy.id}`)
        // Validate before returning (ADR-010)
        return AllergyDisplaySchema.parse(deletedAllergy)
    } catch (error) {
        const h3e = h3eFromCatch(`Error deleting allergy with ID ${id}`, error)
        console.error(`🏥 > ALLERGY > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}
