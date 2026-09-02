/**
 * Analyzer Service Tests
 *
 * Comprehensive unit tests for the deterministic job intelligence engine.
 * Covers: seniority detection, work mode, job type, skill extraction,
 * experience parsing, salary extraction, match scoring, and edge cases.
 */

import {
  detectSeniority,
  detectWorkMode,
  detectJobType,
  extractSkills,
  extractExperience,
  extractSalaryRange,
  computeMatchScore,
  analyzeJob,
  analyzeJobs,
} from '../services/analyzer.service';
import type { JobListing } from '../types/job.types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeJob = (title: string, location = 'New York, NY'): JobListing => ({
  id: '12345',
  title,
  company: 'Test Corp',
  location,
  link: 'https://linkedin.com/jobs/view/12345',
  listDate: '2026-09-01T00:00:00.000Z',
});

// ─── Seniority Detection ──────────────────────────────────────────────────────

describe('detectSeniority()', () => {
  it.each([
    ['Junior Software Engineer', 'junior'],
    ['Jr. Developer', 'junior'],
    ['Entry-Level Frontend Developer', 'junior'],
    ['Associate Engineer', 'junior'],
    ['Senior Software Engineer', 'senior'],
    ['Sr. Backend Developer', 'senior'],
    ['Lead Engineer', 'lead'],
    ['Tech Lead', 'lead'],
    ['Technical Lead - Platform', 'lead'],
    ['Principal Software Engineer', 'principal'],
    ['Staff Software Engineer', 'staff'],
    ['Engineering Manager / Director', 'director'],
    ['VP of Engineering', 'vp'],
    ['CTO / Co-Founder', 'cto'],
    ['Intern - Data Science', 'intern'],
    ['Software Engineering Internship', 'intern'],
    ['Mid-Level Backend Developer', 'mid'],
    ['Intermediate Python Developer', 'mid'],
  ])('title "%s" → %s', (title, expected) => {
    expect(detectSeniority(title)).toBe(expected);
  });

  it('returns "mid" for generic engineer titles with no level indicator', () => {
    expect(detectSeniority('Software Engineer')).toBe('mid');
    expect(detectSeniority('Backend Developer')).toBe('mid');
  });

  it('returns "unknown" for non-engineering titles', () => {
    expect(detectSeniority('Operations Specialist')).toBe('unknown');
  });
});

// ─── Work Mode Detection ──────────────────────────────────────────────────────

describe('detectWorkMode()', () => {
  it.each([
    ['Software Engineer (Remote)', 'New York', 'remote'],
    ['Backend Developer - Work From Home', 'US', 'remote'],
    ['Frontend Engineer - WFH', 'Anywhere', 'remote'],
    ['Engineer - Anywhere', 'Anywhere', 'remote'],
    ['Hybrid Software Engineer', 'London', 'hybrid'],
    ['Software Engineer - Hybrid Work', 'Berlin', 'hybrid'],
    ['On-Site Developer', 'San Francisco', 'on-site'],
    ['In-Office Engineer', 'Seattle', 'on-site'],
    ['Software Engineer', 'New York, NY', 'unknown'],
    ['Data Scientist', 'Remote', 'remote'],  // location says Remote
  ])('title "%s", location "%s" → %s', (title, location, expected) => {
    expect(detectWorkMode(title, location)).toBe(expected);
  });
});

// ─── Job Type Detection ───────────────────────────────────────────────────────

describe('detectJobType()', () => {
  it.each([
    ['Software Engineering Internship Summer 2026', 'internship'],
    ['Intern - Machine Learning', 'internship'],
    ['Contract Software Engineer - 6 months', 'contract'],
    ['Backend Developer (C2C)', 'contract'],
    ['Part-Time Data Analyst', 'part-time'],
    ['Full-Time Senior Developer', 'full-time'],
    ['Freelance React Developer', 'freelance'],
    ['Senior Software Engineer', 'unknown'],  // No explicit type
  ])('"%s" → %s', (title, expected) => {
    expect(detectJobType(title)).toBe(expected);
  });
});

// ─── Skill Extraction ─────────────────────────────────────────────────────────

describe('extractSkills()', () => {
  it('extracts well-known tech skills from title', () => {
    const skills = extractSkills('Senior TypeScript React Node.js Engineer');
    expect(skills).toContain('TypeScript');
    expect(skills).toContain('React');
    expect(skills).toContain('Node.js');
  });

  it('extracts cloud skills', () => {
    const skills = extractSkills('Backend Engineer - AWS GCP Kubernetes');
    expect(skills).toContain('AWS');
    expect(skills).toContain('GCP');
    expect(skills).toContain('Kubernetes');
  });

  it('extracts database skills', () => {
    const skills = extractSkills('Data Engineer - PostgreSQL Spark Kafka');
    expect(skills).toContain('PostgreSQL');
    expect(skills).toContain('Spark');
    expect(skills).toContain('Kafka');
  });

  it('handles case-insensitivity', () => {
    const skills = extractSkills('python developer with django and postgresql');
    expect(skills.map(s => s.toLowerCase())).toContain('python');
    expect(skills.map(s => s.toLowerCase())).toContain('django');
    expect(skills.map(s => s.toLowerCase())).toContain('postgresql');
  });

  it('does not produce duplicates', () => {
    const skills = extractSkills('TypeScript TypeScript Developer');
    const tsCount = skills.filter(s => s.toLowerCase() === 'typescript').length;
    expect(tsCount).toBe(1);
  });

  it('returns empty array for titles with no known skills', () => {
    const skills = extractSkills('Office Manager - Administrative');
    expect(skills).toHaveLength(0);
  });

  it('does not match partial words (e.g. C does not match in CTO)', () => {
    const skills = extractSkills('CTO of Engineering');
    // 'C' is a language in taxonomy — should not match inside 'CTO'
    expect(skills).not.toContain('C');
  });

  it('handles Next.js correctly (does not match just "js")', () => {
    const skills = extractSkills('Next.js Developer');
    expect(skills).toContain('Next.js');
  });
});

// ─── Experience Extraction ────────────────────────────────────────────────────

describe('extractExperience()', () => {
  it.each([
    ['Senior Engineer 5+ Years Experience', { min: 5, max: null }],
    ['Backend Developer 3-5 years', { min: 3, max: 5 }],
    ['Engineer with 7 years experience', { min: 7, max: 7 }],
    ['Junior Developer 1-2 yrs', { min: 1, max: 2 }],
    ['Software Engineer 10+ yrs required', { min: 10, max: null }],
    ['Manager 2-3 years minimum', { min: 2, max: 3 }],
    ['Senior Engineer', { min: null, max: null }],  // No mention
  ])('"%s" → %o', (title, expected) => {
    expect(extractExperience(title)).toEqual(expected);
  });
});

// ─── Salary Extraction ────────────────────────────────────────────────────────

describe('extractSalaryRange()', () => {
  it.each([
    [
      'Senior Engineer $120k - $160k/year',
      { min: 120000, max: 160000, currency: 'USD', period: 'yearly' },
    ],
    [
      'Developer $80,000 - $100,000',
      { min: 80000, max: 100000, currency: 'USD', period: 'yearly' },
    ],
    [
      'Engineer €60k - €80k',
      { min: 60000, max: 80000, currency: 'EUR', period: 'yearly' },
    ],
    [
      'Backend Dev £50k - £70k',
      { min: 50000, max: 70000, currency: 'GBP', period: 'yearly' },
    ],
    [
      'Software Engineer 10-20 LPA',
      { min: 1000000, max: 2000000, currency: 'INR', period: 'yearly' },
    ],
  ])('"%s" → correct salary', (title, expected) => {
    const result = extractSalaryRange(title);
    expect(result.min).toBe(expected.min);
    expect(result.max).toBe(expected.max);
    expect(result.currency).toBe(expected.currency);
    expect(result.period).toBe(expected.period);
  });

  it('returns null values when no salary mentioned', () => {
    const result = extractSalaryRange('Senior Software Engineer at Tech Corp');
    expect(result.min).toBeNull();
    expect(result.max).toBeNull();
    expect(result.period).toBe('unknown');
  });

  it('rejects inverted ranges (max < min)', () => {
    const result = extractSalaryRange('Engineer $200k - $100k');
    expect(result.min).toBeNull();
  });
});

// ─── Match Score ──────────────────────────────────────────────────────────────

describe('computeMatchScore()', () => {
  it('returns 100 for perfect match', () => {
    const skills = ['TypeScript', 'React', 'Node.js'];
    expect(computeMatchScore(skills, skills)).toBe(100);
  });

  it('returns 0 when no skills match', () => {
    expect(computeMatchScore(['Java', 'Spring'], ['TypeScript', 'React'])).toBe(0);
  });

  it('returns 0 when either skill list is empty', () => {
    expect(computeMatchScore([], ['TypeScript'])).toBe(0);
    expect(computeMatchScore(['TypeScript'], [])).toBe(0);
  });

  it('returns partial score for partial match', () => {
    const jobSkills = ['TypeScript', 'React', 'AWS', 'Docker'];
    const userSkills = ['TypeScript', 'React', 'Python'];
    const score = computeMatchScore(jobSkills, userSkills);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  it('is case-insensitive', () => {
    expect(computeMatchScore(['typescript', 'react'], ['TypeScript', 'React'])).toBe(100);
  });

  it('gives bonus when user has more skills than job requires', () => {
    const jobSkills = ['TypeScript'];
    const userSkills = ['TypeScript', 'React', 'Node.js', 'AWS'];
    const score = computeMatchScore(jobSkills, userSkills);
    expect(score).toBe(100); // Capped at 100
  });
});

// ─── analyzeJob() Integration ─────────────────────────────────────────────────

describe('analyzeJob()', () => {
  it('enriches a job with all insight fields', () => {
    const job = makeJob('Senior TypeScript React Engineer (Remote)', 'Remote');
    const enriched = analyzeJob(job, ['TypeScript', 'React']);

    expect(enriched.insights).toBeDefined();
    expect(enriched.insights.seniorityLevel).toBe('senior');
    expect(enriched.insights.workMode).toBe('remote');
    expect(enriched.insights.isRemote).toBe(true);
    expect(enriched.insights.requiredSkills).toContain('TypeScript');
    expect(enriched.insights.requiredSkills).toContain('React');
    expect(enriched.insights.matchScore).toBe(100);
  });

  it('sets matchScore to null when no userSkills provided', () => {
    const enriched = analyzeJob(makeJob('Senior Engineer'));
    expect(enriched.insights.matchScore).toBeNull();
  });

  it('preserves all original job fields', () => {
    const job = makeJob('Software Engineer');
    const enriched = analyzeJob(job);

    expect(enriched.id).toBe(job.id);
    expect(enriched.title).toBe(job.title);
    expect(enriched.company).toBe(job.company);
    expect(enriched.location).toBe(job.location);
    expect(enriched.link).toBe(job.link);
    expect(enriched.listDate).toBe(job.listDate);
  });
});

// ─── analyzeJobs() — Sorting ──────────────────────────────────────────────────

describe('analyzeJobs()', () => {
  it('sorts by matchScore descending when userSkills provided', () => {
    const jobs: JobListing[] = [
      makeJob('Python Data Engineer'),
      makeJob('Senior TypeScript React Developer'),
      makeJob('Java Backend Engineer Spring Boot'),
    ];

    const enriched = analyzeJobs(jobs, ['TypeScript', 'React', 'Node.js']);

    // The TypeScript/React job should rank first
    expect(enriched[0].title).toBe('Senior TypeScript React Developer');
    // Scores should be descending
    const scores = enriched.map(j => j.insights.matchScore ?? 0);
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
    }
  });

  it('preserves original order when no userSkills provided', () => {
    const jobs: JobListing[] = [
      makeJob('Python Developer'),
      makeJob('TypeScript Engineer'),
      makeJob('Java Developer'),
    ];

    const enriched = analyzeJobs(jobs); // no userSkills
    expect(enriched[0].title).toBe('Python Developer');
    expect(enriched[1].title).toBe('TypeScript Engineer');
    expect(enriched[2].title).toBe('Java Developer');
  });

  it('handles empty array', () => {
    expect(analyzeJobs([])).toEqual([]);
  });

  it('sets all matchScores to null when no userSkills', () => {
    const jobs = [makeJob('Senior Engineer'), makeJob('Junior Developer')];
    const enriched = analyzeJobs(jobs);
    enriched.forEach(j => expect(j.insights.matchScore).toBeNull());
  });
});
