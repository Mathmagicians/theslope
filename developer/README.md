# TheSlope developer

The developer companion: a static Nuxt site (Nuxt Content over `docs/*.md` in place, Nuxt UI for the pages) served at `developer.skraaningen.dk` from the `gh-pages` branch. Design: `docs/features/feature-proposal-developer-companion.md`.

Published by `.github/workflows/developer.yml` on `workflow_run` of the CI/CD pipeline: a run that deployed uploaded the artifact `deployment`, and `make developer-resolve run=<id>` reads it. The job downloads the suite results and the API spec, then `make developer-assemble env= run= version= sha= [url=]` lays `environments/<env>/<suite>/` and writes `environments/<env>.json` and `environments/index.json`, `make developer-build` runs `npx nuxi generate developer` and copies the site into the `gh-pages` checkout, and `make developer-publish` force-pushes it as the branch's single commit.

The home page and `/environments/<env>` render in the browser from the manifests; `/docs` renders the repository's docs.

Everything generated lives under `.output/developer/` (gitignored): `.nuxt`, `nitro`, `public`, `contents.sqlite`, the downloaded `artifacts` and the `site` checkout.

Local: `npx nuxi dev developer` serves the site; `make developer-build` generates it into `.output/developer/site`.
