# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] — 2026-09-02

### 🧠 New Feature: Job Intelligence Layer

This release introduces the **Job Intelligence Layer** — a completely new analysis capability built into the API itself, with zero external AI API dependencies.

#### New API Endpoint
- **`POST /api/v1/jobs/analyze`** — Enriched job search that returns structured intelligence for every listing.
- **`GET /api/v1/jobs/analyze`** — Convenience GET alias for browser/curl testing.

#### Intelligence Fields (per job)
| Field | Description |
|-------|-------------|
| `seniorityLevel` | `intern` / `junior` / `mid` / `senior` / `lead` / `principal` / `staff` / `director` / `vp` / `cto` / `unknown` |
| `isRemote` | Boolean — `true` when workMode is `remote` or `hybrid` |
| `workMode` | `remote` / `hybrid` / `on-site` / `unknown` |
| `jobType` | `full-time` / `part-time` / `contract` / `internship` / `freelance` / `unknown` |
| `requiredSkills` | Technologies extracted from job title using 500+ skill taxonomy |
| `experienceYears` | Parsed `{ min, max }` from "X+ years" / "X-Y years" patterns |
| `salaryRange` | Parsed `{ min, max, currency, period }` from USD/EUR/GBP/INR title patterns |
| `matchScore` | 0–100 compatibility score vs optional user-provided `userSkills` list |

#### Server-Side Cache
- All `/analyze` results are now **cached in memory for 5 minutes** per unique query.
- Repeated identical searches return results instantly without re-launching Puppeteer.
- Cache metadata exposed via `metadata.cached` in the response.
- Configurable via `CACHE_TTL_SECONDS` and `CACHE_MAX_SIZE` env vars.

#### Match Scoring
- Provide `userSkills` (array or comma-separated string) in the request body.
- Results are automatically **sorted by `matchScore` descending** when skills provided.
- Score is computed using a TF-IDF-inspired Jaccard overlap between job skills and user skills.

### Added
- `backend/src/services/analyzer.service.ts` — Deterministic NLP engine
- `backend/src/services/cache.service.ts` — In-memory LRU-TTL cache (no deps)
- `backend/src/types/job.types.ts` — Shared TypeScript interfaces
- `backend/src/controllers/analyze.controller.ts` — POST /jobs/analyze handler
- `backend/src/routes/jobs.ts` — Added `/analyze` routes
- `backend/src/__tests__/analyzer.service.test.ts` — 40+ unit tests
- `backend/src/__tests__/cache.service.test.ts` — 15 cache tests
- `backend/src/__tests__/analyze.controller.test.ts` — 15 integration tests
- `backend/jest.config.ts` — Jest config with ts-jest
- `sdk-javascript/src/index.ts` — `analyzeJobs()` + 8 new exported types
- `sdk-python/linkedin_jobs_api/client.py` — `analyze_jobs()` + 5 new types
- `sdk-python/linkedin_jobs_api/__init__.py` — Updated exports
- `sdk-java/.../LinkedInJobsClient.java` — `analyzeJobs()` methods
- `sdk-java/.../JobInsight.java` — New POJO with nested types

### Changed
- `backend/src/docs/swagger.ts` — Full OpenAPI spec rewrite with v2.1.0 endpoints
- `backend/src/services/scraper.service.ts` — `JobListing` now imported from shared types
- Backend version: `2.0.0 → 2.1.0`
- JS SDK version: `2.0.1 → 2.1.0`
- Python SDK version: `2.0.0 → 2.1.0`
- Java SDK version: `2.0.0 → 2.1.0`

### Backward Compatibility
- `GET /api/v1/jobs/search` is **unchanged** — all existing integrations continue to work.
- All existing SDK methods (`searchJobs`, `search_jobs`, `searchJobs`) are **unchanged**.
- No breaking changes to any response format.

---

## [2.0.0] — 2026-08-01

### Initial Release
- `GET /api/v1/jobs/search` — Stealth Puppeteer scraper
- JavaScript, Python, Java SDKs
- Swagger/OpenAPI documentation
- Docker-ready architecture
- Helmet security, rate limiting, Winston logging
