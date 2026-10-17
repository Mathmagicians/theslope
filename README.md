# theslope

The community dining app for Skråningen: the dinner calendar, bookings and the waiting list, cooking teams, allergies
and billing. Nuxt on Cloudflare Workers with a D1 database. Every document and what it holds: [docs/README.md](docs/README.md).

## Develop

Requires Node and npm.

```bash
git clone https://github.com/Mathmagicians/theslope.git
cd theslope
npm install
npm run dev          # http://localhost:3000, the API under /api, the local D1 database
```

| Command | Runs |
|---|---|
| `npm run pre:all` | Lint and the typechecks, the CI gate |
| `npm run test:unit` | Vitest: unit and component specs |
| `npm run test:e2e` | Playwright: API and UI specs against the dev server |

The test rules, helpers and factories: [docs/testing.md](docs/testing.md). The full command list: [CLAUDE.md](CLAUDE.md) § Commands.
Utility targets (Heynabo calls, imports, deploys) live in the [Makefile](Makefile).

## Environments

| Environment | Worker | Database | URL |
|---|---|---|---|
| local (top level of `wrangler.toml`) | `theslope-local` | `theslope`, local D1 | `localhost:3000` |
| dev | `theslope-dev` | `theslope`, remote D1 | `dev.skraaningen.dk` |
| prod | `theslope-prod` | `theslope-prod`, remote D1 | `www.skraaningen.dk` |

Deploy, release, the sender worker, secrets and the Cloudflare resources: [docs/ops-runbook.md](docs/ops-runbook.md).

## Database

D1 (SQLite) through Prisma. The model is `prisma/schema.prisma`; schema and migration work follows
[.claude/skills/prisma/SKILL.md](.claude/skills/prisma/SKILL.md), and the Make targets produce every migration file.

```bash
make d1-create-migration name=<name>   # a migration from the schema change
make d1-flatten-migrations             # copy it into migrations/, the directory wrangler applies
make d1-prisma                         # the generated client and the zod enums
make d1-migrate-local                  # apply and seed the local database
make d1-migrate-dev                    # apply to dev; d1-migrate-prod for prod
npx wrangler d1 execute theslope --local --command="SELECT * FROM User"   # --remote for dev
```

D1 runs no transactions: a delete relies on the schema's cascades (ADR-005 in [docs/adr.md](docs/adr.md)).
Cloudflare's guide: [D1 and Prisma ORM](https://developers.cloudflare.com/d1/tutorials/d1-and-prisma-orm/).

To recreate a database: `npx wrangler d1 delete theslope`, `npx wrangler d1 create theslope`, put the new id in
`wrangler.toml`, then `make d1-migrate-local` (or the environment's target).

## Heynabo

The app imports households, inhabitants and users from Heynabo: [API documentation](https://heynabo.atlassian.net/wiki/external/N2QzNGVkM2ZiMzg1NDkwZDk2NTBiYWYyMzA0ZWJjNmQ).
`make heynabo-get-nhbrs-dev` lists the neighbours with the credentials in `.env`. The test space is
https://demo.spaces.heynabo.com/ with `<heynabo test account>`.
