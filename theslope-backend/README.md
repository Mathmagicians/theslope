# This is the backend for the app theslope

## Technology stack
Serverless architecture running on Cloudflare
* Cloudflare workers serve the REST api

# Cloudflare Application Architecture

```mermaid
graph TD
    A[Client] -->|HTTP Request| B[Cloudflare Edge]
    B -->|Forward Request| C[Cloudflare Worker]
    C -->|Fetch Data| D[External API/Database]
    D -->|Return Data| C
    C -->|Return Response| B
    B -->|HTTP Response| A
```

## How to run

## How to test
## How the project was created
### Bootstraping
Check that node is installed
```node --version```

Run the cloudflare installer
```npm create cloudflare@latest```
