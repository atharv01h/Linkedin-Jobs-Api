"""
LinkedIn Jobs API — Python SDK v2.1.0
Official client for the LinkedIn Jobs API.
"""

import requests
import time
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any, Union


# ─── Data Models ──────────────────────────────────────────────────────────────


@dataclass
class ExperienceRange:
    """Parsed experience requirement from job title."""
    min: Optional[int]
    max: Optional[int]


@dataclass
class SalaryRange:
    """Parsed salary range from job title."""
    min: Optional[int]
    max: Optional[int]
    currency: str
    period: str  # "yearly" | "monthly" | "hourly" | "unknown"


@dataclass
class JobInsights:
    """
    Structured intelligence extracted from a job listing.
    Computed by the server-side deterministic NLP engine.
    """
    seniority_level: str  # "intern"|"junior"|"mid"|"senior"|"lead"|"principal"|"staff"|"director"|"vp"|"cto"|"unknown"
    is_remote: bool
    work_mode: str         # "remote" | "hybrid" | "on-site" | "unknown"
    job_type: str          # "full-time" | "part-time" | "contract" | "internship" | "freelance" | "unknown"
    required_skills: List[str]
    experience_years: ExperienceRange
    salary_range: SalaryRange
    match_score: Optional[int]  # 0–100, None when no userSkills provided


@dataclass
class JobListing:
    """Raw job listing as returned by the scraper."""
    id: str
    title: str
    company: str
    location: str
    link: str
    list_date: str


@dataclass
class EnrichedJobListing(JobListing):
    """Job listing enriched with intelligence insights (v2.1.0+)."""
    insights: Optional[JobInsights] = None


# ─── Client ───────────────────────────────────────────────────────────────────


class LinkedInJobsClient:
    """
    Official Python client for the LinkedIn Jobs API.

    Supports both raw job search and enriched job analysis.

    Example::

        from linkedin_jobs_api import LinkedInJobsClient

        client = LinkedInJobsClient(base_url="http://localhost:3000/api/v1")

        # Basic search
        result = client.search_jobs(keywords="Software Engineer", location="Remote")
        for job in result["jobs"]:
            print(job["title"])

        # Enriched analysis with match scoring
        result = client.analyze_jobs(
            keywords="Senior TypeScript Engineer",
            location="Remote",
            user_skills=["TypeScript", "React", "Node.js"],
        )
        top = result["jobs"][0]
        print(f"{top['title']} — Score: {top['insights']['matchScore']}")
    """

    def __init__(
        self,
        base_url: str = "http://localhost:3000/api/v1",
        retries: int = 3,
        timeout: int = 30,
    ):
        self.base_url = base_url.rstrip("/")
        self.retries = retries
        self.timeout = timeout
        self.session = requests.Session()

    # ─── Internal request helper ─────────────────────────────────────────────

    def _request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        json: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Execute an HTTP request with automatic retry and exponential backoff.
        Raises RuntimeError after all retries are exhausted.
        """
        url = f"{self.base_url}{path}"
        last_exception: Optional[Exception] = None

        for attempt in range(self.retries):
            try:
                response = self.session.request(
                    method,
                    url,
                    params=params,
                    json=json,
                    timeout=self.timeout,
                )
                if response.status_code == 429:
                    # Rate limited — backoff and retry
                    time.sleep(2 ** attempt)
                    continue
                response.raise_for_status()
                return response.json()
            except requests.exceptions.RequestException as exc:
                last_exception = exc
                # Do not retry on definitive client errors (4xx except 429)
                if (
                    isinstance(exc, requests.exceptions.HTTPError)
                    and exc.response is not None
                    and 400 <= exc.response.status_code < 500
                    and exc.response.status_code != 429
                ):
                    break
                if attempt < self.retries - 1:
                    time.sleep(2 ** attempt)

        raise RuntimeError(
            f"Request failed after {self.retries} attempt(s). Last error: {last_exception}"
        )

    # ─── Public API ──────────────────────────────────────────────────────────

    def search_jobs(
        self,
        keywords: Optional[str] = None,
        location: Optional[str] = None,
        date_since_posted: Optional[str] = None,
        page: int = 1,
    ) -> Dict[str, Any]:
        """
        Search for jobs on LinkedIn (raw listings, no intelligence).

        :param keywords: Job title, keywords, or company name.
        :param location: City, state, country, or "Remote".
        :param date_since_posted: One of "past_24h", "past_week", "past_month".
        :param page: Page number for pagination (25 jobs/page).
        :returns: Dict with keys ``success``, ``metadata``, and ``jobs``.
        """
        params: Dict[str, Any] = {"page": page}
        if keywords:
            params["keywords"] = keywords
        if location:
            params["location"] = location
        if date_since_posted:
            params["dateSincePosted"] = date_since_posted

        return self._request("GET", "/jobs/search", params=params)

    def analyze_jobs(
        self,
        keywords: Optional[str] = None,
        location: Optional[str] = None,
        date_since_posted: Optional[str] = None,
        page: int = 1,
        user_skills: Optional[Union[List[str], str]] = None,
    ) -> Dict[str, Any]:
        """
        Search for jobs and enrich each listing with intelligence insights.

        The server computes seniority level, remote detection, skill extraction,
        experience/salary parsing, and optional match scoring — all deterministically,
        with no external AI API calls.

        Results are cached server-side for 5 minutes. When ``user_skills`` is
        provided, results are sorted by ``matchScore`` descending.

        :param keywords: Job title, keywords, or company name.
        :param location: City, state, country, or "Remote".
        :param date_since_posted: One of "past_24h", "past_week", "past_month".
        :param page: Page number (25 jobs/page).
        :param user_skills:
            Your skills for match scoring. Accepts a list of strings
            (e.g. ``["TypeScript", "React"]``) or a comma-separated string
            (e.g. ``"TypeScript,React"``). Pass ``None`` to skip scoring.
        :returns:
            Dict with keys ``success``, ``metadata`` (includes ``cached``),
            and ``jobs`` (each with an ``insights`` sub-object).

        Example::

            result = client.analyze_jobs(
                keywords="Senior TypeScript Engineer",
                location="Remote",
                date_since_posted="past_week",
                user_skills=["TypeScript", "React", "Node.js"],
            )
            for job in result["jobs"]:
                ins = job["insights"]
                print(
                    f"{job['title']} | "
                    f"Seniority: {ins['seniorityLevel']} | "
                    f"Remote: {ins['isRemote']} | "
                    f"Skills: {ins['requiredSkills']} | "
                    f"Score: {ins['matchScore']}"
                )
        """
        body: Dict[str, Any] = {"page": page}
        if keywords:
            body["keywords"] = keywords
        if location:
            body["location"] = location
        if date_since_posted:
            body["dateSincePosted"] = date_since_posted
        if user_skills is not None:
            # Normalize to list
            if isinstance(user_skills, str):
                body["userSkills"] = [s.strip() for s in user_skills.split(",") if s.strip()]
            else:
                body["userSkills"] = [s.strip() for s in user_skills if s.strip()]

        return self._request("POST", "/jobs/analyze", json=body)
