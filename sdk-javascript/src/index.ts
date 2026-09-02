import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JobSearchFilters {
  keywords?: string;
  location?: string;
  dateSincePosted?: 'past_24h' | 'past_week' | 'past_month';
  page?: number;
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  link: string;
  listDate: string;
}

export interface SearchResponse {
  success: boolean;
  metadata: {
    count: number;
    page: number;
  };
  jobs: JobListing[];
}

// ─── Job Intelligence Types (v2.1.0) ─────────────────────────────────────────

export type SeniorityLevel =
  | 'intern'
  | 'junior'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'principal'
  | 'staff'
  | 'director'
  | 'vp'
  | 'cto'
  | 'unknown';

export type WorkMode = 'remote' | 'hybrid' | 'on-site' | 'unknown';

export type JobType =
  | 'full-time'
  | 'part-time'
  | 'contract'
  | 'internship'
  | 'freelance'
  | 'unknown';

export interface SalaryRange {
  min: number | null;
  max: number | null;
  currency: string;
  period: 'yearly' | 'monthly' | 'hourly' | 'unknown';
}

export interface ExperienceRange {
  min: number | null;
  max: number | null;
}

export interface JobInsights {
  /** Inferred seniority level from title keywords */
  seniorityLevel: SeniorityLevel;
  /** True when workMode is remote or hybrid */
  isRemote: boolean;
  /** Detailed work mode classification */
  workMode: WorkMode;
  /** Job type (full-time, contract, etc.) */
  jobType: JobType;
  /** Technologies extracted from job title using 500+ skill taxonomy */
  requiredSkills: string[];
  /** Parsed experience requirement */
  experienceYears: ExperienceRange;
  /** Salary range parsed from title */
  salaryRange: SalaryRange;
  /**
   * Match score 0–100 vs userSkills. null when no userSkills provided.
   */
  matchScore: number | null;
}

export interface EnrichedJobListing extends JobListing {
  insights: JobInsights;
}

export interface AnalyzeRequest extends JobSearchFilters {
  /**
   * Your skills for match scoring.
   * Can be an array or comma-separated string.
   * When provided, results are sorted by matchScore descending.
   */
  userSkills?: string[] | string;
}

export interface AnalyzeResponse {
  success: boolean;
  metadata: {
    count: number;
    page: number;
    /** True when results were served from the server-side cache */
    cached: boolean;
    /** ISO 8601 timestamp of analysis */
    analyzedAt: string;
  };
  jobs: EnrichedJobListing[];
}

// ─── Client Options ───────────────────────────────────────────────────────────

export interface LinkedInJobsClientOptions {
  baseURL?: string;
  timeout?: number;
  retries?: number;
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class LinkedInJobsClient {
  private client: AxiosInstance;
  private retries: number;

  constructor(options: LinkedInJobsClientOptions = {}) {
    const baseURL = options.baseURL || 'http://localhost:3000/api/v1';
    this.retries = options.retries ?? 3;
    
    this.client = axios.create({
      baseURL,
      timeout: options.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }

  private async requestWithRetry<T>(config: AxiosRequestConfig): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const response = await this.client.request<T>(config);
        return response.data;
      } catch (error: any) {
        lastError = error;
        // Don't retry on 4xx client errors (except 429 rate limit)
        if (error.response && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 429) {
          break;
        }
        // Exponential backoff for retries
        if (attempt < this.retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        }
      }
    }
    throw new Error(`Request failed after ${this.retries} attempts: ${lastError?.message}`);
  }

  /**
   * Search for jobs on LinkedIn (raw listings, no intelligence).
   * @param filters - The search criteria
   */
  public async searchJobs(filters: JobSearchFilters): Promise<SearchResponse> {
    return this.requestWithRetry<SearchResponse>({
      method: 'GET',
      url: '/jobs/search',
      params: filters
    });
  }

  /**
   * Search for jobs and enrich each listing with intelligence insights.
   *
   * Returns seniority level, remote detection, skill extraction,
   * experience/salary parsing, and optional match scoring.
   *
   * Results with `userSkills` are sorted by `matchScore` descending.
   *
   * @param request - Search filters plus optional userSkills for match scoring
   *
   * @example
   * const result = await client.analyzeJobs({
   *   keywords: 'Senior TypeScript Engineer',
   *   location: 'Remote',
   *   dateSincePosted: 'past_week',
   *   userSkills: ['TypeScript', 'React', 'Node.js'],
   * });
   * console.log(`Top match: ${result.jobs[0].title} (score: ${result.jobs[0].insights.matchScore})`);
   */
  public async analyzeJobs(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    return this.requestWithRetry<AnalyzeResponse>({
      method: 'POST',
      url: '/jobs/analyze',
      data: request,
    });
  }
}
