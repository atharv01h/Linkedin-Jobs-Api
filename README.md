# LinkedIn Jobs API

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PyPI version](https://badge.fury.io/py/linkedin-jobs-api.svg)](https://badge.fury.io/py/linkedin-jobs-api)
[![Maven Central](https://img.shields.io/maven-central/v/io.github.atharv01h.linkedin.jobs/linkedin-jobs-api.svg)](https://central.sonatype.com/artifact/io.github.atharv01h.linkedin.jobs/linkedin-jobs-api)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/version-2.1.0-brightgreen.svg)](CHANGELOG.md)

A production-grade, enterprise-ready, open-source REST API and multi-language SDK platform to fetch **and analyze** job listings from LinkedIn without requiring authentication.

## Disclaimer ⚠️
**This is an unofficial API.** LinkedIn frequently updates its layout, selectors, and anti-bot measures. This scraper uses advanced stealth techniques (via Puppeteer) but may occasionally experience limitations. Some features (like fetching complete individual job descriptions) may have limited data availability compared to a logged-in session. Use responsibly and within legal and ethical boundaries.

---

## What's New in v2.1.0 🧠 — Job Intelligence Layer

The new `/jobs/analyze` endpoint enriches every job listing with structured intelligence — computed entirely on the server with **zero external AI API calls**:

| Field | Description |
|-------|-------------|
| `seniorityLevel` | `junior` / `mid` / `senior` / `lead` / `principal` / `staff` / `director` / `vp` / `cto` |
| `workMode` | `remote` / `hybrid` / `on-site` / `unknown` |
| `jobType` | `full-time` / `part-time` / `contract` / `internship` / `freelance` |
| `requiredSkills` | Technologies extracted from 500+ skill taxonomy |
| `experienceYears` | Parsed `{ min, max }` from title |
| `salaryRange` | Parsed `{ min, max, currency, period }` — USD/EUR/GBP/INR |
| `matchScore` | 0–100 compatibility score vs your skill list |

Results with `userSkills` are automatically **sorted by match score** (best first).
Results are **cached server-side for 5 minutes** to avoid redundant scraping.

---

## Features ✨
- **RESTful API**: Clean, well-documented endpoints.
- **Robust Scraper**: Built with `puppeteer-extra-plugin-stealth` for evasion.
- **Job Intelligence**: Deterministic NLP enrichment — seniority, skills, salary, remote, match score.
- **Server-Side Cache**: In-memory LRU-TTL cache (5 min) to eliminate repeat scraping.
- **Rate Limiting & Security**: Protected by Helmet and Express Rate Limiters.
- **Multi-Language SDKs**: Native clients for **JavaScript**, **Python**, and **Java**.
- **Pagination & Filtering**: Search by keywords, location, and date.
- **OpenAPI / Swagger**: Interactive API docs at `/api/v1/docs`.
- **Docker Ready**: Designed for containerized deployments.

---

## Installation

### Python
```bash
pip install linkedin-jobs-api
```

### Java (Maven)
```xml
<dependency>
    <groupId>io.github.atharv01h.linkedin.jobs</groupId>
    <artifactId>linkedin-jobs-api</artifactId>
    <version>2.1.0</version>
</dependency>
```

### Java (Gradle)
```gradle
implementation 'io.github.atharv01h.linkedin.jobs:linkedin-jobs-api:2.1.0'
```

### Node.js / JavaScript
```bash
npm install @atharvh01/linkedin-jobs-api
```

---

## Architecture 🏗️

This repository is a monorepo:

- `backend/` — Core REST API and Puppeteer scraper engine (TypeScript, Express).
- `sdk-javascript/` — Official JavaScript/TypeScript SDK (`@atharvh01/linkedin-jobs-api`).
- `sdk-python/` — Official Python SDK (`linkedin-jobs-api`).
- `sdk-java/` — Official Java SDK (Java 17, `HttpClient`).

---

## Quick Start 🚦

```bash
# Install dependencies
npm install

# Run the development server
npm run dev --workspace=backend
```

API starts on `http://localhost:3000`.
**Swagger Docs**: `http://localhost:3000/api/v1/docs`

---

## API Endpoints 📡

### `GET /api/v1/jobs/search` — Basic Search
Returns raw job listings (title, company, location, link, date).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `keywords` | string | No | Search keywords (e.g. "developer") |
| `location` | string | No | Location (e.g. "London", "Remote") |
| `dateSincePosted` | string | No | `past_24h`, `past_week`, or `past_month` |
| `page` | integer | No | Pagination offset (default 1) |

### `POST /api/v1/jobs/analyze` — Enriched Search (v2.1.0) 🧠

Returns raw listings **plus** structured intelligence. Accepts JSON body:

```json
{
  "keywords": "Senior TypeScript Engineer",
  "location": "Remote",
  "dateSincePosted": "past_week",
  "page": 1,
  "userSkills": ["TypeScript", "React", "Node.js"]
}
```

Also available as `GET /api/v1/jobs/analyze?keywords=...&userSkills=TypeScript,React`

---

## SDK Usage Examples 💻

### Python — Basic Search
```python
from linkedin_jobs_api import LinkedInJobsClient

client = LinkedInJobsClient(base_url="http://localhost:3000/api/v1")

result = client.search_jobs(
    keywords="Data Scientist",
    location="New York",
    date_since_posted="past_week"
)
print(f"Found {result['metadata']['count']} jobs!")
for job in result['jobs']:
    print(job['title'], job['company'])
```

### Python — Job Intelligence (v2.1.0)
```python
from linkedin_jobs_api import LinkedInJobsClient

client = LinkedInJobsClient(base_url="http://localhost:3000/api/v1")

result = client.analyze_jobs(
    keywords="Senior Python Developer",
    location="Remote",
    date_since_posted="past_week",
    user_skills=["Python", "FastAPI", "PostgreSQL", "Docker"]
)

print(f"Found {result['metadata']['count']} jobs (cached: {result['metadata']['cached']})")

for job in result['jobs']:
    ins = job['insights']
    print(
        f"{job['title']} at {job['company']}\n"
        f"  Seniority: {ins['seniorityLevel']} | Remote: {ins['isRemote']}\n"
        f"  Skills:    {ins['requiredSkills']}\n"
        f"  Salary:    {ins['salaryRange']}\n"
        f"  Score:     {ins['matchScore']}/100\n"
    )
```

### JavaScript / TypeScript — Basic Search
```typescript
import { LinkedInJobsClient } from '@atharvh01/linkedin-jobs-api';

const client = new LinkedInJobsClient({ baseURL: 'http://localhost:3000/api/v1' });

const result = await client.searchJobs({
  keywords: 'Software Engineer',
  location: 'Remote',
  dateSincePosted: 'past_24h'
});

console.log(`Found ${result.metadata.count} jobs!`);
```

### JavaScript / TypeScript — Job Intelligence (v2.1.0)
```typescript
import { LinkedInJobsClient } from '@atharvh01/linkedin-jobs-api';

const client = new LinkedInJobsClient({ baseURL: 'http://localhost:3000/api/v1' });

const result = await client.analyzeJobs({
  keywords: 'Senior TypeScript Engineer',
  location: 'Remote',
  dateSincePosted: 'past_week',
  userSkills: ['TypeScript', 'React', 'Node.js', 'AWS'],
});

console.log(`Top match: ${result.jobs[0].title}`);
result.jobs.forEach(job => {
  console.log(`
  ${job.title} @ ${job.company}
  Seniority:  ${job.insights.seniorityLevel}
  Remote:     ${job.insights.isRemote}
  Skills:     ${job.insights.requiredSkills.join(', ')}
  Salary:     ${JSON.stringify(job.insights.salaryRange)}
  Score:      ${job.insights.matchScore}/100
  `);
});
```

### Java — Basic Search
```java
import com.linkedin.jobs.api.LinkedInJobsClient;
import com.fasterxml.jackson.databind.JsonNode;

public class Main {
    public static void main(String[] args) throws Exception {
        LinkedInJobsClient client = LinkedInJobsClient.builder()
                .baseUrl("http://localhost:3000/api/v1")
                .build();

        JsonNode result = client.searchJobs("Backend Developer", "San Francisco", "past_month", 1);
        System.out.println("Jobs found: " + result.get("metadata").get("count").asInt());
    }
}
```

### Java — Job Intelligence (v2.1.0)
```java
import com.linkedin.jobs.api.LinkedInJobsClient;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;

public class Main {
    public static void main(String[] args) throws Exception {
        LinkedInJobsClient client = LinkedInJobsClient.builder()
                .baseUrl("http://localhost:3000/api/v1")
                .build();

        JsonNode result = client.analyzeJobs(
                "Senior Java Engineer",
                "Remote",
                "past_week",
                1,
                List.of("Java", "Spring Boot", "Kubernetes", "AWS")
        );

        result.get("jobs").forEach(job -> {
            JsonNode ins = job.get("insights");
            System.out.printf(
                "%s | Seniority: %s | Remote: %s | Score: %s/100%n",
                job.get("title").asText(),
                ins.get("seniorityLevel").asText(),
                ins.get("isRemote").asBoolean(),
                ins.has("matchScore") && !ins.get("matchScore").isNull()
                    ? ins.get("matchScore").asInt()
                    : "N/A"
            );
        });
    }
}
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `LOG_LEVEL` | `info` | Winston log level |
| `CACHE_TTL_SECONDS` | `300` | Cache TTL in seconds (5 min) |
| `CACHE_MAX_SIZE` | `200` | Max number of cached entries |

---

## Contributing 🤝
Contributions are welcome! Please check `CONTRIBUTING.md` for guidelines.

## License 📜
MIT License — see [LICENSE](LICENSE) file for details.

## Changelog 📝
See [CHANGELOG.md](CHANGELOG.md) for version history.
