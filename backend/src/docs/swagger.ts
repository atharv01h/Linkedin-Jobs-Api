import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

// ─── Reusable Schema Components ───────────────────────────────────────────────

const JobListingSchema = {
  type: 'object',
  required: ['id', 'title', 'company', 'location', 'link', 'listDate'],
  properties: {
    id: { type: 'string', example: '3823456789' },
    title: { type: 'string', example: 'Senior Software Engineer' },
    company: { type: 'string', example: 'Acme Corporation' },
    location: { type: 'string', example: 'New York, NY (Remote)' },
    link: {
      type: 'string',
      format: 'uri',
      example: 'https://www.linkedin.com/jobs/view/3823456789',
    },
    listDate: {
      type: 'string',
      format: 'date-time',
      example: '2026-08-30T00:00:00.000Z',
    },
  },
};

const JobInsightsSchema = {
  type: 'object',
  properties: {
    seniorityLevel: {
      type: 'string',
      enum: ['intern', 'junior', 'mid', 'senior', 'lead', 'principal', 'staff', 'director', 'vp', 'cto', 'unknown'],
      example: 'senior',
      description: 'Inferred seniority level from job title keywords',
    },
    isRemote: {
      type: 'boolean',
      example: true,
      description: 'True when workMode is remote or hybrid',
    },
    workMode: {
      type: 'string',
      enum: ['remote', 'hybrid', 'on-site', 'unknown'],
      example: 'remote',
    },
    jobType: {
      type: 'string',
      enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance', 'unknown'],
      example: 'full-time',
    },
    requiredSkills: {
      type: 'array',
      items: { type: 'string' },
      example: ['TypeScript', 'React', 'Node.js', 'AWS'],
      description: 'Skills extracted from job title using curated taxonomy of 500+ technologies',
    },
    experienceYears: {
      type: 'object',
      properties: {
        min: { type: 'integer', nullable: true, example: 5 },
        max: { type: 'integer', nullable: true, example: 8 },
      },
      description: 'Parsed experience requirement. min/max are null when not mentioned.',
    },
    salaryRange: {
      type: 'object',
      properties: {
        min: { type: 'integer', nullable: true, example: 120000 },
        max: { type: 'integer', nullable: true, example: 160000 },
        currency: { type: 'string', example: 'USD' },
        period: {
          type: 'string',
          enum: ['yearly', 'monthly', 'hourly', 'unknown'],
          example: 'yearly',
        },
      },
      description: 'Salary range parsed from title. min/max are null when not mentioned. Values normalised to yearly.',
    },
    matchScore: {
      type: 'integer',
      nullable: true,
      minimum: 0,
      maximum: 100,
      example: 87,
      description: 'Match score 0–100 against userSkills. null when userSkills not provided.',
    },
  },
};

const EnrichedJobListingSchema = {
  allOf: [
    JobListingSchema,
    {
      type: 'object',
      properties: {
        insights: JobInsightsSchema,
      },
    },
  ],
};

const ErrorResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        status: { type: 'integer' },
        details: { type: 'array', items: {} },
      },
    },
  },
};

// ─── Common Query Parameters ──────────────────────────────────────────────────

const commonSearchParams = [
  {
    name: 'keywords',
    in: 'query',
    schema: { type: 'string', example: 'Software Engineer' },
    description: 'Job title, keywords, or company name',
  },
  {
    name: 'location',
    in: 'query',
    schema: { type: 'string', example: 'Remote' },
    description: 'City, state, country, or "Remote"',
  },
  {
    name: 'dateSincePosted',
    in: 'query',
    schema: {
      type: 'string',
      enum: ['past_24h', 'past_week', 'past_month'],
    },
    description: 'Filter by how recently the job was posted',
  },
  {
    name: 'page',
    in: 'query',
    schema: { type: 'integer', default: 1, minimum: 1 },
    description: 'Pagination page number (25 jobs per page)',
  },
];

// ─── Swagger Document ─────────────────────────────────────────────────────────

const swaggerDocument = {
  openapi: '3.1.0',
  info: {
    title: 'LinkedIn Jobs API',
    version: '2.1.0',
    description: `
## LinkedIn Jobs API v2.1.0

An unofficial, production-grade REST API to fetch and analyze job listings from LinkedIn — no authentication required.

### New in v2.1.0: Job Intelligence Layer 🧠

The new \`/jobs/analyze\` endpoint enriches every job listing with structured intelligence computed entirely on-server:

| Field | Description |
|-------|-------------|
| \`seniorityLevel\` | junior / mid / senior / lead / principal / staff / director / vp / cto |
| \`workMode\` | remote / hybrid / on-site / unknown |
| \`jobType\` | full-time / part-time / contract / internship / freelance |
| \`requiredSkills\` | Technologies extracted from 500+ skill taxonomy |
| \`experienceYears\` | Parsed "X+ years" or "X-Y years" requirement |
| \`salaryRange\` | USD/EUR/GBP/INR ranges parsed from title |
| \`matchScore\` | 0–100 compatibility score vs your skills |

Results with \`userSkills\` are automatically sorted by \`matchScore\` descending.
    `,
    contact: {
      name: 'Atharv Hatwar',
      url: 'https://github.com/atharv01h/Linkedin-Jobs-Api',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    { url: '/api/v1', description: 'Local (default port 3000)' },
  ],
  tags: [
    {
      name: 'Jobs',
      description: 'Job search and intelligence endpoints',
    },
  ],
  paths: {
    '/jobs/search': {
      get: {
        tags: ['Jobs'],
        summary: 'Search jobs (raw)',
        operationId: 'searchJobs',
        description: 'Returns raw job listings scraped from LinkedIn. Fast and minimal.',
        parameters: commonSearchParams,
        responses: {
          '200': {
            description: 'Successful job search',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    metadata: {
                      type: 'object',
                      properties: {
                        count: { type: 'integer', example: 25 },
                        page: { type: 'integer', example: 1 },
                      },
                    },
                    jobs: {
                      type: 'array',
                      items: JobListingSchema,
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid query parameters',
            content: { 'application/json': { schema: ErrorResponseSchema } },
          },
          '429': {
            description: 'Rate limit exceeded (100 req / 15 min)',
            content: { 'application/json': { schema: ErrorResponseSchema } },
          },
          '500': {
            description: 'Scraper error',
            content: { 'application/json': { schema: ErrorResponseSchema } },
          },
        },
      },
    },
    '/jobs/analyze': {
      post: {
        tags: ['Jobs'],
        summary: 'Search + analyze jobs (with intelligence) 🧠',
        operationId: 'analyzeJobs',
        description: `
Searches LinkedIn for jobs and enriches each listing with structured intelligence:
seniority level, remote detection, skill extraction, experience/salary parsing, and optional match scoring.

Results are cached server-side for 5 minutes to avoid redundant scraping.
When \`userSkills\` is provided, results are sorted by \`matchScore\` descending.
        `,
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  keywords: { type: 'string', example: 'Senior TypeScript Engineer' },
                  location: { type: 'string', example: 'Remote' },
                  dateSincePosted: {
                    type: 'string',
                    enum: ['past_24h', 'past_week', 'past_month'],
                    example: 'past_week',
                  },
                  page: { type: 'integer', default: 1, example: 1 },
                  userSkills: {
                    oneOf: [
                      {
                        type: 'array',
                        items: { type: 'string' },
                        example: ['TypeScript', 'React', 'Node.js', 'AWS'],
                      },
                      {
                        type: 'string',
                        example: 'TypeScript,React,Node.js,AWS',
                        description: 'Comma-separated skill list',
                      },
                    ],
                    description: 'Your skills for match scoring. Omit to skip match scoring.',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Enriched job listings with intelligence insights',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    metadata: {
                      type: 'object',
                      properties: {
                        count: { type: 'integer', example: 25 },
                        page: { type: 'integer', example: 1 },
                        cached: { type: 'boolean', example: false, description: 'true if results served from cache' },
                        analyzedAt: { type: 'string', format: 'date-time' },
                      },
                    },
                    jobs: {
                      type: 'array',
                      items: EnrichedJobListingSchema,
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid request body',
            content: { 'application/json': { schema: ErrorResponseSchema } },
          },
          '429': {
            description: 'Rate limit exceeded',
            content: { 'application/json': { schema: ErrorResponseSchema } },
          },
          '500': {
            description: 'Scraper or analysis error',
            content: { 'application/json': { schema: ErrorResponseSchema } },
          },
        },
      },
      get: {
        tags: ['Jobs'],
        summary: 'Search + analyze jobs (GET alias)',
        operationId: 'analyzeJobsGet',
        description: 'GET alias for /analyze — convenient for browser testing. Accepts same params as POST body via query string.',
        parameters: [
          ...commonSearchParams,
          {
            name: 'userSkills',
            in: 'query',
            schema: { type: 'string', example: 'TypeScript,React,AWS' },
            description: 'Comma-separated list of your skills for match scoring',
          },
        ],
        responses: {
          '200': {
            description: 'Enriched job listings',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    metadata: { type: 'object' },
                    jobs: { type: 'array', items: EnrichedJobListingSchema },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        operationId: 'healthCheck',
        responses: {
          '200': {
            description: 'Server is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'OK' },
                    uptime: { type: 'number', example: 3600.5 },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const setupSwagger = (app: Express): void => {
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'LinkedIn Jobs API v2.1.0',
    swaggerOptions: {
      deepLinking: true,
      displayRequestDuration: true,
      defaultModelsExpandDepth: 2,
    },
  }));
};
