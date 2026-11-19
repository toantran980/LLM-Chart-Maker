# Deployment Readiness Issues

This file tracks gaps found in the current deployment. Items marked public-app-critical
should be addressed before promoting this project beyond a personal/public demo.

## Critical

### [Deployment] CI does not deploy or publish runtime artifacts
- [X] GitHub Actions remains CI-only, while Vercel and Render own deployments.
- [X] CI builds and validates both Docker images.
- [ ] Optional CD may be added later after provider-specific secrets and smoke URLs are defined.

### [Security] Public sharing endpoint is not protected or limited
- [X] `POST /api/diagrams/share` now uses the API authentication middleware when configured.
- [X] `POST /api/diagrams/share` now uses the shared LLM request limiter.
- [X] Mermaid, diagram type, title, source text, theme, and direction are validated.
- [ ] Add storage limits and retention/cleanup behavior.
- [ ] Add stronger abuse controls, quotas, or authentication beyond a public frontend key.

### [Reliability] Share success does not guarantee database persistence
- [X] Database-configured share writes return `503 DATABASE_ERROR` when Neon persistence fails.
- [X] Failed database writes are not added to the in-memory success cache.
- [X] Unconfigured local/development mode retains in-memory fallback behavior.
- [ ] Add retry behavior or a durable write queue for transient database failures.
- [ ] Expose database persistence status separately from database configuration.

### [Security] Browser API key is not a secret
- `VITE_APP_API_KEY` is compiled into the public frontend bundle.
- Anyone can extract it and call protected backend endpoints.
- Reframe this mechanism as an abuse deterrent, not authentication.
- Implement real server-side identity or authorization if private API access is required.
- Keep `OPENAI_API_KEY` and database credentials backend-only.

### [Cost] Public LLM usage needs stronger OpenAI cost controls
- Set a hard monthly OpenAI spending limit and budget alerts.
- Use separate API keys and quotas for development and public production.
- Add per-identity, per-IP, and total-daily usage limits.
- Record provider latency and estimated/requested token cost.
- Define a fallback policy for provider errors and budget exhaustion.

## High

### [Configuration] Canonicalize environment variable names
- [X] Frontend uses only `VITE_API_BASE`.
- [X] Backend supports both `POSTGRES_URL` and `DATABASE_URL`.
- [X] Docker Compose forwards both database variable names.
- [ ] Keep one canonical documented name for each setting.
- [ ] Add startup validation for conflicting or missing required configuration.
- Add a versioned `.env.example` containing variable names only, never real values.
- Document build-time versus runtime frontend variables.

### [CI] Frontend tests are missing from CI
- [X] Backend tests run in CI.
- [X] Frontend lint and build run in CI.
- [X] Frontend Vitest tests run in the CI workflow.
- [ ] Consider running the complete test suite in one required CI job.

### [Docker] Production containers are not reproducible or fully checked
- [X] Both Dockerfiles install workspace dependencies with `npm ci` and the root lockfile.
- [X] CI builds both backend and frontend Docker images on pushes to main.
- [X] Backend image and Compose probe `/ready`; frontend image and Compose probe the served page.
- Compose intentionally does not block the frontend on backend health so the UI remains available during API/database outages.
- [ ] Build and smoke-test both containers together.

### [Reliability] Health endpoint is not a readiness endpoint
- [X] Added a separate `/ready` endpoint.
- [X] `/health` remains the process liveness/metrics endpoint.
- [X] `/ready` confirms whether a configured Neon database is reachable.
- [ ] Add bounded provider probes for OpenAI or Ollama without increasing normal request cost.

### [Reliability] Rate limiting degrades across replicas
- The in-memory limiter is process-local.
- Multiple Render replicas or restarts use separate counters.
- [X] Upstash failures fall back to in-memory limiting instead of returning `500`.
- [X] Rate-limit identity now uses caller IP, not the client-supplied `X-API-Key` header.
- Configure and verify Upstash Redis in production.
- Consider verified user identity if account-based quotas are introduced.

### [Reliability] In-memory metrics and fallback state are not durable
- Request metrics are process-local and disappear on restart.
- The fallback rate cannot be aggregated across replicas.
- Export metrics to a monitoring system or add a durable metrics provider.
- Configure alerts for elevated 5xx rates, LLM errors, timeouts, and database failures.

### [Data] Sharing lacks lifecycle management
- There is no retention policy for shared diagrams.
- There is no size quota or per-user storage limit.
- There is no delete, revoke, update, or expiration mechanism.
- Add retention and cleanup jobs.
- Record created and accessed timestamps for lifecycle decisions.

## Medium

### [Infrastructure] No explicit deployment verification or rollback
- No post-deploy smoke test calls `/health`, `/ready`, generation, refinement, sharing, or retrieval.
- No deployment status gate confirms the frontend and backend are compatible.
- Add versioned frontend/backend release checks.
- Add rollback instructions or an automated rollback trigger.

### [Observability] Provider cost and latency are not fully measurable
- Existing metrics record endpoint latency and request counts.
- Provider latency, token usage, provider cost, and provider error classes are not durable.
- Add provider and per-endpoint telemetry.
- Configure alerts for latency, timeout, quota, and spend anomalies.

### [Security] Share and API routes need broader abuse controls
- Share routes do not have rate limiting.
- The API key is exposed in the frontend by design.
- CORS is allowlisted, but browser-only controls do not stop direct API requests.
- Consider an edge WAF or bot protection.
- Add request quotas by verified identity and IP where possible.

### [Performance] Frontend bundle size needs optimization
- The main JavaScript bundle is approximately 1.38 MB before gzip.
- Mermaid and PDF dependencies contribute to initial load cost.
- Lazy-load Mermaid diagram definitions and PDF viewer code.
- Measure and split the largest bundles.
- Add frontend performance budgets to CI.

### [Documentation] README deployment instructions are incomplete or inconsistent
- Add exact Vercel and Render environment variable names.
- Add a production startup checklist.
- Remove or reconcile mismatched variable names.
- Document the public nature of `VITE_*` variables.
- Document database fallback and share-link durability behavior.

### [Reliability] No migrations or schema lifecycle
- Database schema initialization currently occurs through runtime `CREATE TABLE IF NOT EXISTS`.
- There is no migration history or schema rollback.
- Add versioned migrations before schema changes grow.
- Run migrations during release, not lazily during requests.

### [Reliability] No capacity or failure thresholds
- LLM timeout and request-size limits exist, but capacity behavior is not load-tested.
- Database, Redis, provider, and Render limits are not documented.
- Add load and failure testing.
- Document expected concurrent requests and OpenAI/OpenRouter/Ollama limits.

## Verification Checklist

- [ ] CI runs backend tests, frontend tests, frontend lint, and production builds.
- [ ] CI builds both Docker images.
- [ ] Deployment has automated push/deploy, smoke tests, and rollback.
- [ ] Environment variable names are consistent across code, Compose, CI, and docs.
- [ ] Public share routes have validation, limits, persistence guarantees, and quotas.
- [X] Database failures do not return a falsely successful share link.
- [ ] Real authorization exists if private API access is required.
- [ ] OpenAI hard budgets and alerts are configured.
- [ ] `/health` and `/ready` have separate, correct meanings.
- [ ] Shared rate limiting is verified across more than one running instance.
- [ ] Provider latency, cost, error rate, database health, and uptime are monitored.
