import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SiteNest API',
      version: '1.0.0',
      description: 'API documentation for SiteNest',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'SiteNest API Server',
      },
    ],
  },
  apis: ['./server/routes.ts'],
};

export const specs = swaggerJsdoc(options);