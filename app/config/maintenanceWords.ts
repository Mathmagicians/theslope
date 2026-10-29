/**
 * The maintenance job words admins read on the system page and in the job toasts. Plain module without auto-imports
 * (ADR-017).
 */
import {useMaintenanceValidation, type JobType, type JobStatus} from '~/composables/useMaintenanceValidation'

const {JobType: Job, JobStatus: Status} = useMaintenanceValidation()

export const MAINTENANCE_WORDS = {
    /** A job's name in the job history and in its toasts */
    jobTypes: {
        [Job.DAILY_MAINTENANCE]: 'Daglig vedligeholdelse',
        [Job.MONTHLY_BILLING]: 'Månedlig fakturering',
        [Job.HEYNABO_IMPORT]: 'Heynabo import',
        [Job.MAINTENANCE_IMPORT]: 'Data import',
        [Job.MAINTENANCE_EXPORT]: 'Data eksport'
    } satisfies Record<JobType, string>,
    /** How a run ended, or that it runs */
    jobStatuses: {
        [Status.RUNNING]: 'Kører',
        [Status.SUCCESS]: 'Gennemført',
        [Status.PARTIAL]: 'Delvis gennemført',
        [Status.FAILED]: 'Fejlet'
    } satisfies Record<JobStatus, string>,
    /** A job box: its title, what the job does and its run button */
    boxes: {
        [Job.HEYNABO_IMPORT]: {
            title: 'Heynabo Import',
            description: 'Synkroniser husstande og beboere fra Heynabo',
            buttonLabel: 'Kør import'
        },
        [Job.DAILY_MAINTENANCE]: {
            title: 'Daglig Vedligeholdelse',
            description: 'Markér middage som afholdt, luk ordrer, opret transaktioner, opret automatiske bookinger',
            buttonLabel: 'Kør daglig vedligeholdelse'
        },
        [Job.MONTHLY_BILLING]: {
            title: 'Månedlig Fakturering',
            description: 'Generer fakturaer for foregående måned',
            buttonLabel: 'Kør fakturering'
        }
    },
    /** A box's run button while its job runs */
    running: 'Kører...',
    /** A job's toasts: the job's name and how its run ended */
    job: {
        done: (job: string) => `${job} afsluttet`,
        failed: (job: string) => `${job} fejlede`,
        /** The Heynabo import's toast on a finished run */
        completed: (job: string) => `${job} fuldført`
    },
    /** The labels of a run's stats, per job */
    stats: {
        [Job.HEYNABO_IMPORT]: {
            households: 'Husstande',
            inhabitants: 'Beboere',
            users: 'Brugere',
            linked: 'Linked',
            admins: 'Admins'
        },
        [Job.DAILY_MAINTENANCE]: {
            consumed: 'Middage afholdt',
            closed: 'Ordrer lukket',
            transactions: 'Transaktioner',
            waitlists: 'Ventelister',
            preferences: 'Præferencer klippet',
            bookings: 'Bookinger'
        },
        [Job.MONTHLY_BILLING]: {
            periods: 'Perioder',
            invoices: 'PBS Fakturaer',
            transactions: 'Transaktioner',
            total: 'Total',
            csvUploaded: 'CSV uploadet',
            mailsSent: 'Mails sendt',
            pending: 'Afventer'
        }
    }
} as const
