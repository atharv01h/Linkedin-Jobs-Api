# LinkedIn Jobs API Python SDK

The official Python SDK for the LinkedIn Jobs API.

## Installation

```bash
pip install linkedin-jobs-api
```

## Usage

```python
from linkedin_jobs_api import LinkedInJobsClient

client = LinkedInJobsClient()
jobs = client.search_jobs("Backend Developer", "Remote", "past_month", 1)
print(jobs)
```

For more information, please visit the [Main GitHub Repository](https://github.com/atharv01h/Linkedin-Jobs-Api).
