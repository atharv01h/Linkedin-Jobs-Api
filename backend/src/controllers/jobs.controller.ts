import { Request, Response, NextFunction } from 'express';
import { ScraperService, JobSearchFilters } from '../services/scraper.service';
import { z } from 'zod';

const SearchFiltersSchema = z.object({
  keywords: z.string().optional(),
  location: z.string().optional(),
  dateSincePosted: z.enum(['past_24h', 'past_week', 'past_month']).optional(),
  page: z.preprocess((val) => (val ? Number(val) : undefined), z.number().positive().optional())
});

export const searchJobs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = SearchFiltersSchema.parse(req.query);

    const jobs = await ScraperService.searchJobs(filters as JobSearchFilters);

    res.json({
      success: true,
      metadata: {
        count: jobs.length,
        page: filters.page || 1,
      },
      jobs
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
       res.status(400).json({
         success: false,
         error: {
           message: 'Validation failed',
           status: 400,
           details: error.errors
         }
       });
       return;
    }
    next(error);
  }
};
