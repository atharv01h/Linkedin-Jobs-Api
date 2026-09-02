import { Router } from 'express';
import { searchJobs } from '../controllers/jobs.controller';
import { analyzeJobsHandler } from '../controllers/analyze.controller';

const router = Router();

/**
 * GET /api/v1/jobs/search
 * Basic job search — returns raw scraped listings.
 */
router.get('/search', searchJobs);

/**
 * POST /api/v1/jobs/analyze
 * Enriched job search — returns listings + job intelligence insights.
 * Accepts both POST body (application/json) and GET query params.
 */
router.post('/analyze', analyzeJobsHandler);

/**
 * GET /api/v1/jobs/analyze
 * Convenience GET alias for /analyze (allows browser/curl testing without POST body).
 */
router.get('/analyze', analyzeJobsHandler);

export default router;
