# LinkedIn Jobs API 

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PyPI version](https://badge.fury.io/py/linkedin-jobs-api.svg)](https://badge.fury.io/py/linkedin-jobs-api)
[![Maven Central](https://img.shields.io/maven-central/v/io.github.atharv01h.linkedin.jobs/linkedin-jobs-api.svg)](https://central.sonatype.com/artifact/io.github.atharv01h.linkedin.jobs/linkedin-jobs-api)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)

A production-grade, enterprise-ready, open-source REST API and multi-language SDK platform to fetch job listings from LinkedIn without requiring authentication.

## Disclaimer ⚠️
**This is an unofficial API.** LinkedIn frequently updates its layout, selectors, and anti-bot measures. This scraper uses advanced stealth techniques (via Puppeteer) but may occasionally experience limitations. Some features (like fetching complete individual job descriptions) may have limited data availability compared to a logged-in session. Use responsibly and within legal and ethical boundaries.

## Features ✨
- **RESTful API**: Clean, well-documented endpoints.
- **Robust Scraper**: Built with `puppeteer-extra-plugin-stealth` for evasion.
- **Rate Limiting & Security**: Protected by Helmet and Express Rate Limiters.
- **Multi-Language SDKs**: Native clients for **JavaScript**, **Python**, and **Java**.
- **Pagination & Filtering**: Search by keywords, location, and date.
- **OpenAPI / Swagger**: Auto-generated interactive API docs.
- **Docker Ready**: Designed for containerized deployments.

---

## Installation

### Python
```bash
pip install linkedin-jobs-api
```

### Java (Maven)
Add the following dependency to your `pom.xml`:
```xml
<dependency>
    <groupId>io.github.atharv01h.linkedin.jobs</groupId>
    <artifactId>linkedin-jobs-api</artifactId>
    <version>2.0.0</version>
</dependency>
```

### Java (Gradle)
Add the following to your `build.gradle`:
```gradle
implementation 'io.github.atharv01h.linkedin.jobs:linkedin-jobs-api:2.0.0'
```

### Node.js / JavaScript
```bash
npm install linkedin-jobs-api-backend
```

---

## Architecture 🏗️

This repository is structured as a monorepo containing the backend service and multiple SDKs:

- `backend/` - The core REST API and Puppeteer Scraper engine (TypeScript, Express).
- `sdk-javascript/` - Official JavaScript/TypeScript SDK for the npm ecosystem.
- `sdk-python/` - Official Python SDK (`requests` based).
- `sdk-java/` - Official Java SDK (Java 17, `HttpClient`).

---

## Quick Start 🚦

### 1. Run the Backend API

Make sure you have Node.js 18+ installed.

```bash
# Install dependencies
npm install

# Run the development server
npm run dev --workspace=backend
```

The API will start on `http://localhost:3000`.
Visit the **Swagger Docs** at: `http://localhost:3000/api/v1/docs`

---

## SDK Usage Examples 💻

### Python
```python
from linkedin_jobs_api import LinkedInJobsClient

client = LinkedInJobsClient(base_url="http://localhost:3000/api/v1")

response = client.search_jobs(
    keywords="Data Scientist",
    location="New York",
    date_since_posted="past_week"
)

print(f"Found {response['metadata']['count']} jobs!")
for job in response['jobs']:
    print(job['title'], job['company'])
```

### Java
```java
import com.linkedin.jobs.api.LinkedInJobsClient;
import com.fasterxml.jackson.databind.JsonNode;

public class Main {
    public static void main(String[] args) throws Exception {
        LinkedInJobsClient client = LinkedInJobsClient.builder()
                .baseUrl("http://localhost:3000/api/v1")
                .build();
                
        JsonNode response = client.searchJobs("Backend Developer", "San Francisco", "past_month", 1);
        System.out.println("Jobs found: " + response.get("metadata").get("count").asInt());
    }
}
```

### JavaScript / TypeScript
```typescript
import { LinkedInJobsClient } from '@atharvh01/linkedin-jobs-api';

const client = new LinkedInJobsClient({ baseURL: 'http://localhost:3000/api/v1' });

async function search() {
  const response = await client.searchJobs({
    keywords: 'Software Engineer',
    location: 'Remote',
    dateSincePosted: 'past_24h'
  });
  
  console.log(`Found ${response.metadata.count} jobs!`);
  console.log(response.jobs);
}
```

---

## API Endpoints 📡

### `GET /api/v1/jobs/search`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `keywords` | string | No | Search keywords (e.g. "developer") |
| `location` | string | No | Location (e.g. "London") |
| `dateSincePosted` | string | No | `past_24h`, `past_week`, or `past_month` |
| `page` | integer | No | Pagination offset (default 1) |

---

## Contributing 🤝
Contributions are welcome! Please check `CONTRIBUTING.md` for guidelines.

## License 📜
MIT License - see LICENSE file for details.
