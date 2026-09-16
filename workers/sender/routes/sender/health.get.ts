/**
 * GET /sender/health — the same health report as the app's /api/public/health, for the smoke job
 * and monitoring. Reached through the app's hostname (route <host>/sender/*) or locally on port 3100.
 */
import {buildHealthReport} from '../../../common/health'

export default defineEventHandler(() => buildHealthReport(useRuntimeConfig().public))
