import { Router } from 'express';
import { searchJobs } from '../controllers/jobs.controller';

const router = Router();

router.get('/search', searchJobs);

export default router;
