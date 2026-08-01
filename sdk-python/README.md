# LinkedIn Jobs API Python SDK

[![PyPI version](https://badge.fury.io/py/linkedin-jobs-api.svg)](https://badge.fury.io/py/linkedin-jobs-api)
[![Python versions](https://img.shields.io/pypi/pyversions/linkedin-jobs-api.svg)](https://pypi.org/project/linkedin-jobs-api/)

The official Python SDK for the LinkedIn Jobs API. This package allows you to effortlessly interact with the LinkedIn Jobs backend service to search and scrape job postings.

## Installation

```bash
pip install linkedin-jobs-api
```

## Usage

```python
from linkedin_jobs_api import LinkedInJobsClient

# Initialize the client pointing to your backend API instance
client = LinkedInJobsClient(base_url="http://localhost:3000/api/v1")

# Search for jobs
response = client.search_jobs(
    keywords="Python Developer",
    location="San Francisco",
    date_since_posted="past_week",
    page=1
)

# Parse the results
print(f"Total jobs found: {response['metadata']['count']}")
for job in response['jobs']:
    print(f"- {job['title']} at {job['company']}")
```

## Repository
For more information, the backend service code, and other SDKs (Java, Node.js), please visit the [Main GitHub Repository](https://github.com/atharv01h/Linkedin-Jobs-Api).
