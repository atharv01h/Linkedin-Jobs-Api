/**
 * Shared TypeScript types for LinkedIn Jobs API v2.1.0
 */

// ─── Core Job Listing (returned by scraper) ───────────────────────────────────

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  link: string;
  listDate: string;
}

// ─── Job Intelligence (computed by analyzer) ──────────────────────────────────

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
  /** Inferred seniority level from title and description keywords */
  seniorityLevel: SeniorityLevel;
  /** Whether the job is remote/hybrid/on-site */
  isRemote: boolean;
  /** Detailed work mode classification */
  workMode: WorkMode;
  /** Job type (full-time, contract, etc.) */
  jobType: JobType;
  /** Extracted required/preferred skills from title */
  requiredSkills: string[];
  /** Parsed experience requirement */
  experienceYears: ExperienceRange;
  /** Parsed salary range if mentioned in title */
  salaryRange: SalaryRange;
  /**
   * Match score 0–100 against user-provided skills.
   * null when no userSkills were provided in the request.
   */
  matchScore: number | null;
}

// ─── Enriched Job (JobListing + insights) ────────────────────────────────────

export interface EnrichedJobListing extends JobListing {
  insights: JobInsights;
}

// ─── API Request / Response shapes ───────────────────────────────────────────

export interface AnalyzeRequest {
  keywords?: string;
  location?: string;
  dateSincePosted?: 'past_24h' | 'past_week' | 'past_month';
  page?: number;
  /**
   * Optional comma-separated or array of user skills for match scoring.
   * Example: ["TypeScript", "React", "Node.js"]
   */
  userSkills?: string | string[];
}

export interface SearchMetadata {
  count: number;
  page: number;
}

export interface AnalyzeMetadata extends SearchMetadata {
  cached: boolean;
  analyzedAt: string;
}

export interface SearchResponse {
  success: boolean;
  metadata: SearchMetadata;
  jobs: JobListing[];
}

export interface AnalyzeResponse {
  success: boolean;
  metadata: AnalyzeMetadata;
  jobs: EnrichedJobListing[];
}
