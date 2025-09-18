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

###  🏗️Start applikationen lokalt 
Clone the repo friom github:

```git clone```

Run on development server (localhost:3000)

```npm run dev```

- Frontend is available on `localhost:3000`.
- Api is available on `localhost:3000/api`.
- Tailwind styles are on `localhost:3000/_tailwind`.
- Lint inspector: run `npx @eslint/config-inspector.` and browse on` ` http://localhost:7777 `
- Nuxt DevTools is enabled by default in Nuxt v3.8.0. You can press Shift + Alt / ⇧ Shift + ⌥ Option + D in your app to open it up.

### 🚀 Deploy to cloudflare
```npm run deploy```

## 🤖 How to test
🚧 on the way
-  Heynabo test space: - [ ] https://demo.spaces.heynabo.com/, bruger mail `agata@mathmagicians.dk`, kode spørg @themathmagician

## Tech stuff

### T⌨ech Stack
- Tailwind CSS - frontend css framework
- Nuxt.js 3  + typescript - frontend framework
- Nuxt.js 3  + typescript - server backend
- Cloudflare - serverless deployment  / cloud provider
- CICD - Github actions
- Andre cloud resourcer - Terraform

### 3️⃣ 3rd party services
#### Heynabo
- Heynabo API - se  [dokumentation](https://heynabo.atlassian.net/wiki/external/N2QzNGVkM2ZiMzg1NDkwZDk2NTBiYWYyMzA0ZWJjNmQ)
- There is a Makefile to test the heynabo api. you must have an .env file with username and password. Fx the following will return a list of neighbors:
```make heynabo-get-nhbrs```

## Design ideas
 - understory.io - pantone colors, with contrasting type colors 
 - round corner box with a paired box neighbour dd
 - semi transparent menu stays at the top (but with offset) in mobile mode / and a hamburger menu / slides out - in
 - weird lenses for background and images on top

## Colors - pantone color of the year 2025 / deliciousness palette
<style>
    m { color: #a47864 }
    pink { color:  #fa7b95 }
    orange { color: #ec6a37 }
    winery { color: #7e212a }
    party { color: #c4516c }
    peach { color: #ffb482 }
    bonbon { color: #f1a9cf }
    caramel { color: #ca815a}
</style>

- <m>mocha mouse</m> #a47864
- <pink>pink lemonade</pink> #fa7b95
- <orange>mandarin orange</orange> #b7d7b0
- <winery>winery</winery> #b7e212a
- <party>party punch</party> #c4516c
- <peach>peach cobbler</peach> #ffb482
- <bonbon>bonbon</bonbon> #f1a9cf
- <caramel>caramel</caramel> #ca815a


## 📚 Documentation
### NPM
There is an error about preflight, that can be removed by adding to package.json: (but it conflicts with new installs!)
```json
 "overrides": {
    "//": [
      "COMMENT:Temporary solution for:error of packages(inflight@1.0.6, rimraf@3.0.2, glob@7.2.31) https://github.com/vercel/next.js/issues/66239"
    ],
    "glob": "9.0.0",
    "rimraf": "^4.0.0"
  }
```

### Database - schemas, ORM, migrations
We use D1 - a cloudflare database built on top of SQLite with Prisma ORM for the repository client.

#### Database Setup Process

##### Creating a new database
```bash
npx wrangler d1 create theslope
```

After creating the database, update the database ID in `wrangler.toml`.

##### Schema Management
1. Define your data models in `prisma/schema.prisma`
2. Validate the schema: `npx prisma format`
3. Generate migration SQL:
   ```bash
   npx prisma migrate diff --from-empty --to-schema-datamodel ./prisma/schema.prisma --script --output ./migrations/0001_initial.sql
   ```
   For subsequent migrations with a new sequence number:
   ```bash
   npx prisma migrate diff --from-migrations ./migrations --to-schema-datamodel ./prisma/schema.prisma --script --output ./migrations/0002_migration_name.sql
   ```
4. Apply migrations:
   - Local: `npm run db:migrate:local`
   - Production: `npm run db:migrate`
5. Seed the database:
   - Local: `npm run db:seed:local`
   - Production: `npx wrangler d1 execute theslope --file migrations/seed/seed.sql --remote`
6. Generate Prisma client: `npm run db:generate-client`

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
