import requests
import time
from typing import Optional, List, Dict, Any

class LinkedInJobsClient:
    def __init__(self, base_url: str = "http://localhost:3000/api/v1", retries: int = 3, timeout: int = 10):
        self.base_url = base_url
        self.retries = retries
        self.timeout = timeout
        self.session = requests.Session()

    def search_jobs(
        self,
        keywords: Optional[str] = None,
        location: Optional[str] = None,
        date_since_posted: Optional[str] = None,
        page: int = 1
    ) -> Dict[str, Any]:
        """
        Search for jobs on LinkedIn.
        """
        params = {"page": page}
        if keywords:
            params["keywords"] = keywords
        if location:
            params["location"] = location
        if date_since_posted:
            params["dateSincePosted"] = date_since_posted

        url = f"{self.base_url}/jobs/search"
        
        last_exception = None
        for attempt in range(self.retries):
            try:
                response = self.session.get(url, params=params, timeout=self.timeout)
                if response.status_code == 429:
                    # Rate limited, backoff and retry
                    time.sleep(2 ** attempt)
                    continue
                response.raise_for_status()
                return response.json()
            except requests.exceptions.RequestException as e:
                last_exception = e
                # Do not retry on 4xx except 429
                if isinstance(e, requests.exceptions.HTTPError) and 400 <= e.response.status_code < 500:
                    break
                time.sleep(2 ** attempt)
        
        raise RuntimeError(f"Request failed after {self.retries} attempts. Last error: {last_exception}")
