import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ScraperService, JobSearchFilters } from '../services/scraper.service';
import { analyzeJobs } from '../services/analyzer.service';
import { scraperCache, CacheService } from '../services/cache.service';
import type { AnalyzeResponse } from '../types/job.types';

// ─── Validation Schema ────────────────────────────────────────────────────────

const AnalyzeRequestSchema = z.object({
  keywords: z.string().trim().max(200).optional(),
  location: z.string().trim().max(200).optional(),
  dateSincePosted: z.enum(['past_24h', 'past_week', 'past_month']).optional(),
  page: z.preprocess(
    val => (val !== undefined && val !== null ? Number(val) : undefined),
    z.number().int().positive().max(40).optional(),
  ),
  /**
   * userSkills can be:
   *  - a JSON array string: '["TypeScript","React"]'
   *  - a comma-separated string: "TypeScript,React,Node.js"
   *  - an array (when sent as JSON body)
   */
  userSkills: z
    .union([
      z.array(z.string().trim().max(100)).max(100),
      z.string().trim().max(2000),
    ])
    .optional(),
});

type ParsedAnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

// ─── Helper: normalize userSkills to string[] ─────────────────────────────────

function normalizeUserSkills(raw: ParsedAnalyzeRequest['userSkills']): string[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.map(s => s.trim()).filter(Boolean);
  }

  // Try to parse as JSON array
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((s: unknown) => String(s).trim()).filter(Boolean);
    } catch {
      // fall through to comma-split
    }
  }

  // Comma-separated
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * POST /api/v1/jobs/analyze
 *
 * Searches LinkedIn for jobs matching the given filters, then enriches
 * each listing with deterministic job intelligence (seniority, skills, etc.).
 * Results are cached by search parameters for CACHE_TTL_SECONDS (default 5 min).
 */
export const analyzeJobsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Accept both query params (GET compat) and JSON body
    const rawInput = req.method === 'POST' ? req.body : req.query;
    const parsed = AnalyzeRequestSchema.parse(rawInput);

    const filters: JobSearchFilters = {
      keywords: parsed.keywords,
      location: parsed.location,
      dateSincePosted: parsed.dateSincePosted,
      page: parsed.page,
    };

    const userSkills = normalizeUserSkills(parsed.userSkills);

    // Build cache key from scrape parameters only (not userSkills — cache is for raw jobs)
    const cacheKey = CacheService.buildKey({
      keywords: filters.keywords ?? '',
      location: filters.location ?? '',
      dateSincePosted: filters.dateSincePosted ?? '',
      page: filters.page ?? 1,
    });

    let rawJobs = scraperCache.get(cacheKey);
    const cached = rawJobs !== undefined;

    if (!cached) {
      rawJobs = await ScraperService.searchJobs(filters);
      scraperCache.set(cacheKey, rawJobs);
    }

    // Apply intelligence layer
    const enrichedJobs = analyzeJobs(rawJobs!, userSkills);

    const response: AnalyzeResponse = {
      success: true,
      metadata: {
        count: enrichedJobs.length,
        page: filters.page ?? 1,
        cached,
        analyzedAt: new Date().toISOString(),
      },
      jobs: enrichedJobs,
    };

    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          status: 400,
          details: error.errors,
        },
      });
      return;
    }
    next(error);
  }
};
