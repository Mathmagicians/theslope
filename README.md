# theslope

## 🖥️ User Interface

### Navigation
#### Admin URLs
- **Admin Dashboard**: `/admin` (redirects to `/admin/planning`)
- **Planning**: `/admin/planning` - Plan dinners, events, calendar, seasons
- **Households**: `/admin/households` - Manage households, allergies, moves
- **Allergies**: `/admin/allergies` - View and manage allergies, print poster
- **Users**: `/admin/users` - Import HeyNabo data, manage users
- **Economy**: `/admin/economy` - Financial overview, chef budgets, PBS reports
- **Settings**: `/admin/settings` - System configuration

## 👩🏽‍💻How to develop
- npm + node  installeret
- git installeret

### 🌍 Development Environments

TheSlope uses **three distinct Wrangler environments** defined in `wrangler.toml`:

| Environment | Worker Name | Database | Usage | URL |
|-------------|-------------|----------|-------|-----|
| **Top-level (local)** | `theslope-local` | `theslope` (local D1) | Local development (`nuxt dev`, Playwright tests) | `localhost:3000` |
| **dev** | `theslope-dev` | `theslope` (remote D1) | Dev deployment (PRs, testing) | `dev.skraaningen.dk` |
| **prod** | `theslope-prod` | `theslope-prod` (remote D1) | Production deployment | `www.skraaningen.dk` |

###  🏗️ Start applikationen lokalt
Clone the repo from github:

```bash
git clone https://github.com/your-org/theslope.git
cd theslope
npm install
```

Run on development server (uses **top-level** environment):

```bash
npm run dev  # Uses theslope-local worker with local D1 database
```

- Frontend is available on `localhost:3000`.
- Api is available on `localhost:3000/api`.
- Tailwind styles are on `localhost:3000/_tailwind`.
- Lint inspector: run `npx @eslint/config-inspector.` and browse on` ` http://localhost:7777 `
- Nuxt DevTools is enabled by default in Nuxt v3.8.0. You can press Shift + Alt / ⇧ Shift + ⌥ Option + D in your app to open it up.

**Local database operations** (NO --env flag):
```bash
npm run db:migrate:local      # Apply migrations to local database
npm run db:seed:local         # Seed local database with test data
npx wrangler d1 execute theslope --local --command="SELECT * FROM User"
```

### 🚀 Deploy to Cloudflare

**Deploy to dev environment:**
```bash
npm run deploy  # Builds and deploys to dev.skraaningen.dk (theslope-dev worker)
```

**Deploy to production environment:**
```bash
npm run deploy:prod  # Builds and deploys to www.skraaningen.dk (theslope-prod worker)
```

**Remote database operations:**
```bash
# Dev environment
npm run db:migrate            # Migrate remote dev database
npm run db:seed               # Seed remote dev database

# Prod environment
npm run db_prod:migrate       # Migrate remote prod database
npm run db_prod:seed          # Seed remote prod database
```

Useful commands are defined in the [Makefile](./Makefile)

## 🤖 How to test
Check out more information at: [test documentation](docs/testing.md)
```bash
npm run test:e2e # run e2e tests
npm run test # run unit & component tests
```
### Test environments
-  Heynabo test space: - [ ] https://demo.spaces.heynabo.com/, bruger mail `agata@mathmagicians.dk`, kode spørg @themathmagician

## Tech stuff

### Tech Stack
- Tailwind CSS - frontend css framework
- Nuxt.js 3  + typescript - frontend framework
- Nuxt.js 3  + typescript - server backend
- Cloudflare - serverless deployment  / cloud provider
- SQLite - database D1 from cloudflare. Note, does not support transactions
- CICD - Github actions
- Andre cloud resourcer - Terraform

Note about databse - it doesnt support transactions:
```
  ℹ 👥 > TEAM > [CREATE] Creating team team-for-removal-1759187480120                                                                  01.11.20
[01.11.20] ℹ prisma:warn Cloudflare D1 does not support transactions yet. 
When using Prisma's D1 adapter, implicit & explicit transactions will be ignored and run as individual queries, which breaks the guarantees of the ACID properties of transactions. For more details see https://pris.ly/d/d1-transactions
```

### 3️⃣ 3rd party services
#### Heynabo
- Heynabo API - se  [dokumentation](https://heynabo.atlassian.net/wiki/external/N2QzNGVkM2ZiMzg1NDkwZDk2NTBiYWYyMzA0ZWJjNmQ)
- There is a Makefile to test the heynabo api. you must have an .env file with username and password. Fx the following will return a list of neighbors:
```make heynabo-get-nhbrs```


## 📚 Documentation

### Architecture & Compliance

**Critical:** TheSlope follows strict Architecture Decision Records (ADRs) to ensure consistency and quality.

- **[ADR Documentation](docs/adr.md)** - Architecture patterns and decisions
- **[Backend Compliance](docs/adr-compliance-backend.md)** - API endpoint ADR compliance tracking
- **[Frontend Compliance](docs/adr-compliance-frontend.md)** - Component, store, and route ADR compliance tracking

**When to update compliance documents:**
- ✅ After implementing new API endpoints (update backend compliance)
- ✅ After creating new components or stores (update frontend compliance)
- ✅ When test coverage changes (update test status columns)
- ✅ When fixing ADR violations (mark as compliant)

**How to keep docs DRY:**
- Compliance docs reference ADRs, don't duplicate them
- Component tables show routes without duplicating route documentation
- Status markers (✅ ⚠️ ❌) provide quick overview without verbose explanations

### NPM
We have the standard npm scripts defined in `package.json`. Here are some key ones:
- `npm run dev` - Start local development server
- `npm run test:e2e` - Run end-to-end tests
- `npm run lint:all` - Run linter and ts checker
### Database - schemas, ORM, migrations
We use D1 - a cloudflare database built on top of SQLite with Prisma ORM for the repository client.

See [Development Environments](#-development-environments) for information about local, dev, and prod database configurations.

#### Database Setup Process

##### Creating a new database
```bash
npx wrangler d1 create theslope
```

After creating the database, update the database ID in `wrangler.toml`.

##### Schema Management
1. Define your data models in `prisma/schema.prisma`
2. Generate migration:
   ```bash
   # Initial migration
   make prisma-create-migration name=initial

   # Subsequent migrations
   make prisma-create-migration name=add_feature_name
   ```
3. Generate Prisma client: `make d1-prisma`
4. Apply migrations:
   - Local: `make d1-migrate-local` (applies migrations + seeds)
   - Dev: `make d1-migrate-dev`
   - Production: `make d1-migrate-prod`
   - All: `make d1-migrate-all`

> ⚠️ Important: Follow [Cloudflare's guidelines](https://developers.cloudflare.com/d1/tutorials/d1-and-prisma-orm/) for D1 and Prisma, not the standard Prisma migration model.

##### Database Recreation
If you need to recreate the database completely:
1. Delete the database: `npx wrangler d1 delete theslope`
2. Create a new database: `npx wrangler d1 create theslope`
3. Update the database ID in `wrangler.toml`
4. Apply migrations and seed as described above

##### Interacting with the Database
Query the database:
```bash
# View local data
npx wrangler d1 execute theslope --local --command="SELECT * FROM User"

# View production data
npx wrangler d1 execute theslope --remote --command="SELECT * FROM User"
```

![Prisma workflow](https://www.prisma.io/docs/assets/images/prisma-client-generation-workflow-3b42c24d27aef3025f2eb4ffc4644642.png)
