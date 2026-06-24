# Finqora — Phase 1: Rebranding Report

Status: **complete for all user-facing and metadata surfaces.**

This document records what was rebranded from the upstream project to **Finqora**,
and — importantly — what was **intentionally retained**, so the rebrand is
backward-compatible, does not endanger live data, and stays legally compliant.

## Rebranded → Finqora

| Surface | Where | Notes |
|---|---|---|
| Application name | `webapp/src/constants/app.tsx` (`app_name`) | shown in app chrome |
| Logo | new `webapp/src/components/Icons/FinqoraLogo.tsx`; swapped into login, sidebar (+ collapsed mark), loading/splash, error boundary, PDF/drawer header, setup wizard, one-click demo | themeable SVG wordmark replacing the legacy outline logo |
| Browser title / meta | `webapp/index.html` (`<title>Finqora</title>`, description) | already Finqora |
| PWA manifest | `webapp/public/manifest.json` (`name`, `short_name`) | was "React App" |
| UI navigation / labels / copy | `webapp/src/lang/*` locale values | display strings already Finqora across en/es/ar/sv |
| Product docs | `README.md` (+ INSTALL/DEPLOYMENT) | Finqora branding |
| Root package metadata | root `package.json` `name` → `finqora-monorepo` | not a published dependency |
| Container names | `docker-compose*.yml` (`finqora-server`, `finqora-mysql`, …) | already `finqora-*` |
| Live databases | `finqora_system`, `finqora_tenant_*` | already in use by the deployment |

## Intentionally retained (with rationale)

These are **internal identifiers or legal text**, invisible to the 3–4 end users.
Renaming them now would break the build/deploy, risk **data loss**, or violate the
licence — all of which conflict with the "production-ready, backward-compatible,
do not disturb the demo" requirements.

| Retained | Why | Future path |
|---|---|---|
| `@bigcapital/*` workspace package names (server, webapp, sdk-ts, utils, email-components, pdf-templates) | Import identifiers referenced in ~158 files + tsconfig paths + Dockerfiles; pure code identity, zero user-facing value | Optional major-version refactor: rename packages + update all imports/paths in one mechanical pass with a green build gate |
| `bigcapitalhq/*` Docker image repo names | The **running demo** containers reference these tags; renaming diverges from the demo build | Rename at the next image rebuild after the demo |
| Docker volume names (`bigcapital_prod_mysql`, `bigcapital_prod_redis`) | **Renaming orphans the existing volumes → data loss** on next `compose up` | Rename only with a documented volume-migration (dump/restore) step |
| Docker network name (`bigcapital_network`) | Cosmetic; left with the volumes to keep one consistent compose change later | Rename alongside the volume migration |
| `HOSTED_ON_BIGCAPITAL_CLOUD` env / `isBigcapitalCloud` API field | SaaS-cloud flag (always false on-prem); the name is read by code + part of the API contract | Drop when SaaS code paths are removed |
| CSS class names (`bigcapital-datatable`, `bigcapital--alt`, …) | Internal styling hooks, not visible text | Rename opportunistically per component |
| AGPL attribution to "Bigcapital" (README), upstream changelog/community refs | **Legally required** by AGPL; historical accuracy | Must remain |
| Generated SDK descriptions (`shared/sdk-ts/openapi.json`, `schema.ts`) | Generated artifacts, regenerated from the server | Regenerate after server-side string changes |

## Verification

- Webapp production build (Docker, full Vite build) passes with the rebrand:
  `bigcapitalhq/webapp:finqora-rebrand` built with exit 0.
- The live demo image (`:latest`) and running containers were **not** modified.
