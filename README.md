# theslope

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
We use D1 - a cloudflare database. It is built on top of SQLITE. 
We use prisma ORM to generate the repository client.
Database is created with wrangler
```
npx wrangler d1 create theslope
```

1. Set the DATABASE_URL in the .env file to point to your existing database. If your database has no tables yet, read https://pris.ly/d/getting-started
2. Set the provider of the datasource block in schema.prisma to match your database: postgresql, mysql, sqlite, sqlserver, mongodb or cockroachdb.
3. Run prisma db pull to turn your database schema into a Prisma schema.
4. Run prisma generate to generate the Prisma Client. You can then start querying your database.
5. Tip: Explore how you can extend the ORM with scalable connection pooling, global caching, and real-time database events. Read: https://pris.ly/cli/beyond-orm

#### Migration
! Imporant - follow [cloudflares](https://developers.cloudflare.com/d1/tutorials/d1-and-prisma-orm/), not prisma's migration model:

##### Validate model
To validate the prisma model
```prisma
npx prisma format
```
To create sql migration script
```
# Generate SQL using Prisma Migrate
npx prisma migrate diff --from-empty --to-schema-datamodel ./prisma/schema.prisma --script --output ./migrations/0001_initial.sql
```
Generate prisma db client - now you can use prisma types in the client to save and fetch data:
```
npx prisma generate
```

![Prisma workflow](https://www.prisma.io/docs/assets/images/prisma-client-generation-workflow-3b42c24d27aef3025f2eb4ffc4644642.png)

For at se data i lokal database: 
```
npx wrangler d1 execute prod-d1-tutorial --command="SELECT * FROM User"
```
