import { defineEventHandler } from 'h3'

/**
 * Early bot detection and blocking middleware
 *
 * Runs before auth guard to reject automated vulnerability scanners
 * targeting WordPress, PHP admin panels, and common exploits.
 *
 * Benefits:
 * - Reduces worker invocations (saves cost)
 * - Reduces log noise
 * - Prevents unnecessary auth checks
 * - Blocks attacks at the edge
 */

// Common patterns used by automated scanners
const BOT_PATTERNS = [
  // WordPress-specific
  'wp-',
  'wordpress',
  'xmlrpc',
  'wlwmanifest',
  'wp-content',
  'wp-includes',
  'wp-admin',
  'wp-json',

  // PHP (not a PHP app)
  '.php',
  'phpmyadmin',
  'pma',
  'admin.php',
  'index.php',
  'config.php',

  // Common exploits
  '.env',
  '.git',
  '.sql',
  '.zip',
  '.tar.gz',
  'backup',
  'database',

  // CMS detection
  'joomla',
  'drupal',
  'typo3',

  // Common bot paths
  'robots.txt.php',
  'sitemap.xml.php',
  '/apps'
]

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const { pathname } = new URL(url)
  const pathLower = pathname.toLowerCase()

  // Check if path matches any bot pattern
  const isBotRequest = BOT_PATTERNS.some(pattern => pathLower.includes(pattern))

  if (isBotRequest) {
    // Log at info level (not error) to reduce noise
    console.info(`🤖 > BOT BLOCKED > ${pathname}`)

    // Return 404 immediately without processing
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found'
    })
  }

  // Legitimate request - continue to next middleware
})
