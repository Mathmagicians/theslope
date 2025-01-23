#Database
We are using a D1 database on cloudflare. it is built on top of SQLITE.
```toml
[[d1_databases]]
binding = "DB"
database_name = "theslope"
database_id = "0032a02a-faba-402d-b8a6-def2b4b4feba"
```
created in region wnam - we might want weur for the future.

Schema can be changed using migrations:
```bash 
npx wrangler d1 migrations create <DATABASE_NAME> <MIGRATION_NAME>```
