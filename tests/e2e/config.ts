export const authFiles = {
    adminFile: 'playwright/.auth/admin.json',
    adminUIFile: 'playwright/.auth/adminUI.json',
    memberFile: 'playwright/.auth/member.json',
    memberUIFile: 'playwright/.auth/memberUI.json'
} as const

// The test users live in the demo Heynabo; the credentials come from the environment
export const testCredentials = {
    adminUserName: process.env.HEY_NABO_USERNAME as string,
    memberUserName: process.env.HEY_NABO_EJ_ADMIN_USERNAME as string,
    password: process.env.HEY_NABO_PASSWORD as string
} as const
