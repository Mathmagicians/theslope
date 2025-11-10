import {z} from "zod";

export const useHeynaboValidation = () => {

    const HeynaboMemberSchema = z.object({
        id: z.number(),
        type: z.string(),
        email: z.string().email().or(z.string().transform((val) => null)).or(z.null()),
        firstName: z.string(),
        lastName: z.string(),
        phone: z.string().nullable(),
        emergencyContact: z.string().nullable(),
        dateOfBirth: z.string().nullable(),
        description: z.string().nullable(),
        uiStorage: z.string().nullable(),
        role: z.string(),
        roles: z.array(z.string()).nullable().transform((v) => v ?? []),
        avatar: z.string().url().nullable(),
        alias: z.string().nullable(),
        locationId: z.number(),
        isFirstLogin: z.boolean(),
        lastLogin: z.string(),
        inviteSent: z.string().nullable(),
        created: z.string()
    })

    const HeynaboUserSchema = HeynaboMemberSchema.extend({
        email: z.string().email()
    })

    const LoggedInHeynaboUserSchema = HeynaboUserSchema.extend({
        token: z.string().nonempty(),
    })

    const HeynaboLocationSchema = z.object({
        id: z.number(),
        type: z.string(),
        address: z.string(),
        street: z.string(),
        streetNumber: z.union([z.string(), z.number()]).nullable(),
        floor: z.string().nullable(),
        ext: z.string().nullable(),
        map: z.string().nullable(),
        city: z.string().nullable(),
        zipCode: z.string().nullable(),
        typeId: z.number(),
        hidden: z.boolean()
    })

    type HeynaboMember = z.infer<typeof HeynaboMemberSchema>



    return {
        HeynaboMemberSchema,
        HeynaboUserSchema,
        LoggedInHeynaboUserSchema,
        HeynaboLocationSchema
    }
}

// Re-export types
export type HeynaboMember = z.infer<ReturnType<typeof useHeynaboValidation>['HeynaboMemberSchema']>
export type HeynaboUser = z.infer<ReturnType<typeof useHeynaboValidation>['HeynaboUserSchema']>
export type LoggedInHeynaboUser = z.infer<ReturnType<typeof useHeynaboValidation>['LoggedInHeynaboUserSchema']>
export type HeynaboLocation = z.infer<ReturnType<typeof useHeynaboValidation>['HeynaboLocationSchema']>
