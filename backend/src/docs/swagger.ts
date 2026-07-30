import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerDocument = {
  openapi: '3.1.0',
  info: {
    title: 'LinkedIn Jobs API',
    version: '2.0.0',
    description: 'An unofficial, modernized API to fetch job listings from LinkedIn.',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1'
    }
  ],
  paths: {
    '/jobs/search': {
      get: {
        summary: 'Search for jobs',
        description: 'Scrapes LinkedIn for jobs based on given filters.',
        parameters: [
          {
            name: 'keywords',
            in: 'query',
            schema: { type: 'string' },
            description: 'Job title, keywords, or company'
          },
          {
            name: 'location',
            in: 'query',
            schema: { type: 'string' },
            description: 'Location to search in'
          },
          {
            name: 'dateSincePosted',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['past_24h', 'past_week', 'past_month']
            },
            description: 'Filter by date posted'
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 },
            description: 'Page number for pagination'
          }
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    metadata: {
                      type: 'object',
                      properties: {
                        count: { type: 'integer' },
                        page: { type: 'integer' }
                      }
                    },
                    jobs: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          title: { type: 'string' },
                          company: { type: 'string' },
                          location: { type: 'string' },
                          link: { type: 'string' },
                          listDate: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

export const setupSwagger = (app: Express) => {
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};
