import {describe, expect, it} from 'vitest'
import {useMaintenanceValidation} from '~/composables/useMaintenanceValidation'

const {JobTrigger, JobTriggerQuerySchema, adminTrigger} = useMaintenanceValidation()

describe('useMaintenanceValidation', () => {
    it('names a job an admin starts from the app by the admin\'s mail', () => {
        expect(adminTrigger('anna@example.com')).toBe('ADMIN:anna@example.com')
    })

    it.each([
        {description: 'the admin when the query names no trigger', query: {}, triggeredBy: JobTrigger.ADMIN},
        {description: 'the admin when the trigger is empty', query: {triggeredBy: ''}, triggeredBy: JobTrigger.ADMIN},
        {description: 'the trigger the app names', query: {triggeredBy: adminTrigger('anna@example.com')}, triggeredBy: 'ADMIN:anna@example.com'}
    ])('reads the trigger of a job an admin starts over HTTP: $description', ({query, triggeredBy}) => {
        expect(JobTriggerQuerySchema.parse(query)).toEqual({triggeredBy})
    })

    it('rejects a trigger the query repeats', () => {
        expect(JobTriggerQuerySchema.safeParse({triggeredBy: [JobTrigger.ADMIN, JobTrigger.ADMIN]}).success).toBe(false)
    })
})
