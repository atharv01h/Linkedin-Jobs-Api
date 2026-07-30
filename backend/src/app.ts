import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { limiter } from './middlewares/rateLimiter';
import { errorHandler } from './middlewares/errorHandler';
import jobsRouter from './routes/jobs';
import { setupSwagger } from './docs/swagger';

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(limiter);

// Request Tracing
app.use((req, res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || crypto.randomUUID();
  next();
});

// Swagger Docs
setupSwagger(app);

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime() });
});

app.use('/api/v1/jobs', jobsRouter);

// Error Handling
app.use(errorHandler);

export default app;
