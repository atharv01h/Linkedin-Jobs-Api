/**
 * Analyze Controller Integration Tests
 *
 * Tests the POST /api/v1/jobs/analyze endpoint via supertest.
 * The ScraperService is mocked to avoid Puppeteer in tests.
 */

import request from 'supertest';
import app from '../app';
import { ScraperService } from '../services/scraper.service';
import type { JobListing, EnrichedJobListing } from '../types/job.types';
import { scraperCache } from '../services/cache.service';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_JOBS: JobListing[] = [
  {
    id: '111',
    title: 'Senior TypeScript React Engineer (Remote)',
    company: 'TechCorp',
    location: 'Remote',
    link: 'https://linkedin.com/jobs/view/111',
    listDate: '2026-09-01T00:00:00.000Z',
  },
  {
    id: '222',
    title: 'Junior Python Developer',
    company: 'DataCo',
    location: 'New York, NY',
    link: 'https://linkedin.com/jobs/view/222',
    listDate: '2026-09-02T00:00:00.000Z',
  },
  {
    id: '333',
    title: 'Lead Java Spring Boot Engineer',
    company: 'Enterprise Inc',
    location: 'Hybrid - San Francisco',
    link: 'https://linkedin.com/jobs/view/333',
    listDate: '2026-08-30T00:00:00.000Z',
  },
];

// ─── Setup ────────────────────────────────────────────────────────────────────

jest.mock('../services/scraper.service', () => ({
  ScraperService: {
    searchJobs: jest.fn(),
  },
}));

const mockSearchJobs = ScraperService.searchJobs as jest.Mock;

beforeEach(() => {
  mockSearchJobs.mockReset();
  mockSearchJobs.mockResolvedValue(MOCK_JOBS);
  scraperCache.clear(); // Clear cache between tests
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/jobs/analyze', () => {
  it('returns 200 with enriched jobs', async () => {
    const res = await request(app)
      .post('/api/v1/jobs/analyze')
      .send({ keywords: 'engineer', location: 'Remote' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.metadata).toBeDefined();
    expect(res.body.metadata.count).toBe(3);
    expect(res.body.metadata.cached).toBe(false);
    expect(res.body.metadata.analyzedAt).toBeDefined();
    expect(res.body.jobs).toHaveLength(3);
  });

  it('each job has an insights object', async () => {
    const res = await request(app)
      .post('/api/v1/jobs/analyze')
      .send({ keywords: 'engineer' });

    expect(res.status).toBe(200);
    for (const job of res.body.jobs) {
      expect(job.insights).toBeDefined();
      expect(job.insights.seniorityLevel).toBeDefined();
      expect(job.insights.workMode).toBeDefined();
      expect(job.insights.isRemote).toBeDefined();
      expect(job.insights.jobType).toBeDefined();
      expect(job.insights.requiredSkills).toBeInstanceOf(Array);
      expect(job.insights.experienceYears).toBeDefined();
      expect(job.insights.salaryRange).toBeDefined();
    }
  });

  it('detects seniority correctly in response', async () => {
    const res = await request(app)
      .post('/api/v1/jobs/analyze')
      .send({ keywords: 'engineer' });

    const seniorJob = res.body.jobs.find((j: EnrichedJobListing) => j.id === '111');
    const juniorJob = res.body.jobs.find((j: EnrichedJobListing) => j.id === '222');
    const leadJob = res.body.jobs.find((j: EnrichedJobListing) => j.id === '333');

    expect(seniorJob.insights.seniorityLevel).toBe('senior');
    expect(juniorJob.insights.seniorityLevel).toBe('junior');
    expect(leadJob.insights.seniorityLevel).toBe('lead');
  });

  it('detects remote/hybrid correctly', async () => {
    const res = await request(app)
      .post('/api/v1/jobs/analyze')
      .send({});

    const remoteJob = res.body.jobs.find((j: EnrichedJobListing) => j.id === '111');
    const hybridJob = res.body.jobs.find((j: EnrichedJobListing) => j.id === '333');
    const onsiteJob = res.body.jobs.find((j: EnrichedJobListing) => j.id === '222');

    expect(remoteJob.insights.workMode).toBe('remote');
    expect(remoteJob.insights.isRemote).toBe(true);
    expect(hybridJob.insights.workMode).toBe('hybrid');
    expect(hybridJob.insights.isRemote).toBe(true);
    expect(onsiteJob.insights.isRemote).toBe(false);
  });

  it('accepts userSkills and returns matchScore', async () => {
    const res = await request(app)
      .post('/api/v1/jobs/analyze')
      .send({ userSkills: ['TypeScript', 'React'] });

    expect(res.status).toBe(200);
    for (const job of res.body.jobs) {
      expect(job.insights.matchScore).not.toBeNull();
      expect(job.insights.matchScore).toBeGreaterThanOrEqual(0);
      expect(job.insights.matchScore).toBeLessThanOrEqual(100);
    }
  });

  it('sorts results by matchScore descending when userSkills provided', async () => {
    const res = await request(app)
      .post('/api/v1/jobs/analyze')
      .send({ userSkills: ['TypeScript', 'React'] });

    const scores: number[] = res.body.jobs.map((j: EnrichedJobListing) => j.insights.matchScore ?? 0);
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
    }
  });

  it('accepts comma-separated userSkills string', async () => {
    const res = await request(app)
      .post('/api/v1/jobs/analyze')
      .send({ userSkills: 'TypeScript,React,Node.js' });

    expect(res.status).toBe(200);
    for (const job of res.body.jobs) {
      expect(job.insights.matchScore).not.toBeNull();
    }
  });

  it('sets matchScore to null when no userSkills', async () => {
    const res = await request(app)
      .post('/api/v1/jobs/analyze')
      .send({ keywords: 'engineer' });

    for (const job of res.body.jobs) {
      expect(job.insights.matchScore).toBeNull();
    }
  });

  it('returns cached: true on second identical request', async () => {
    // First request — cache miss
    const first = await request(app)
      .post('/api/v1/jobs/analyze')
      .send({ keywords: 'engineer', location: 'remote' });
    expect(first.body.metadata.cached).toBe(false);

    // Second request — same params, should be cached
    const second = await request(app)
      .post('/api/v1/jobs/analyze')
      .send({ keywords: 'engineer', location: 'remote' });
    expect(second.body.metadata.cached).toBe(true);

    // ScraperService should only have been called once
    expect(mockSearchJobs).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for invalid dateSincePosted', async () => {
    const res = await request(app)
      .post('/api/v1/jobs/analyze')
      .send({ dateSincePosted: 'last_year' }); // invalid enum value

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('Validation failed');
  });

  it('returns 400 for negative page number', async () => {
    const res = await request(app)
      .post('/api/v1/jobs/analyze')
      .send({ page: -1 });

    expect(res.status).toBe(400);
  });

  it('handles scraper errors gracefully', async () => {
    mockSearchJobs.mockRejectedValue(new Error('Scraper failed'));

    const res = await request(app)
      .post('/api/v1/jobs/analyze')
      .send({ keywords: 'engineer' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it('works with empty body (no filters)', async () => {
    const res = await request(app)
      .post('/api/v1/jobs/analyze')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── GET alias ────────────────────────────────────────────────────────────────

describe('GET /api/v1/jobs/analyze', () => {
  it('returns 200 with query params', async () => {
    const res = await request(app)
      .get('/api/v1/jobs/analyze')
      .query({ keywords: 'engineer', userSkills: 'TypeScript,React' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.jobs[0].insights.matchScore).not.toBeNull();
  });
});
