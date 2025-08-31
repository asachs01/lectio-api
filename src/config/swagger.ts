import swaggerJSDoc from 'swagger-jsdoc';

// Determine server order based on environment
const getServers = () => {
  const servers = [];
  
  // In production, put production server first
  if (process.env.NODE_ENV === 'production') {
    servers.push({
      url: 'https://lectio-api.org',
      description: 'Production server',
    });
    servers.push({
      url: 'https://lectio-api-o6ed3.ondigitalocean.app',
      description: 'DigitalOcean App',
    });
  }
  
  // Always include localhost for development/testing
  servers.push({
    url: `http://localhost:${process.env.PORT || 3000}`,
    description: 'Development server',
  });
  
  // In development, put localhost first
  if (process.env.NODE_ENV !== 'production') {
    servers.unshift(...servers.splice(-1));
  }
  
  return servers;
};

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Lectionary API',
      version: process.env.API_VERSION || '1.0.0',
      description: 'A modern REST API for serving lectionary readings and liturgical calendar data',
      contact: {
        name: 'API Support',
        url: 'https://github.com/asachs01/lectio-api',
        email: 'api@lectio-api.org',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: getServers(),
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API Key for authentication',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Error message',
                },
                statusCode: {
                  type: 'integer',
                  description: 'HTTP status code',
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Timestamp of the error',
                },
                details: {
                  type: 'object',
                  description: 'Additional error details (development mode only)',
                },
              },
            },
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy'],
              description: 'Health status of the API',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp of the health check',
            },
            uptime: {
              type: 'number',
              description: 'Server uptime in seconds',
            },
            environment: {
              type: 'string',
              description: 'Current environment',
            },
            version: {
              type: 'string',
              description: 'API version',
            },
          },
        },
        LectionaryTradition: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the tradition',
            },
            name: {
              type: 'string',
              description: 'Name of the lectionary tradition',
            },
            abbreviation: {
              type: 'string',
              description: 'Common abbreviation for the tradition',
            },
            description: {
              type: 'string',
              description: 'Description of the tradition',
            },
            startDate: {
              type: 'string',
              format: 'date',
              description: 'Start date of the tradition calendar',
            },
            endDate: {
              type: 'string',
              format: 'date',
              description: 'End date of the tradition calendar',
            },
          },
        },
        LiturgicalSeason: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the season',
            },
            name: {
              type: 'string',
              description: 'Name of the liturgical season',
            },
            color: {
              type: 'string',
              description: 'Liturgical color for the season',
            },
            startDate: {
              type: 'string',
              format: 'date',
              description: 'Start date of the season',
            },
            endDate: {
              type: 'string',
              format: 'date',
              description: 'End date of the season',
            },
            traditionId: {
              type: 'string',
              description: 'ID of the associated tradition',
            },
          },
        },
        DailyReading: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the reading',
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Date of the reading',
            },
            traditionId: {
              type: 'string',
              description: 'ID of the associated tradition',
            },
            seasonId: {
              type: 'string',
              description: 'ID of the associated season',
            },
            readings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['first', 'psalm', 'second', 'gospel'],
                    description: 'Type of reading',
                  },
                  citation: {
                    type: 'string',
                    description: 'Scripture citation',
                  },
                  text: {
                    type: 'string',
                    description: 'Full text of the reading',
                  },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check and monitoring endpoints for API status',
      },
      {
        name: 'Traditions',
        description: 'Manage and query different lectionary traditions (RCL, Catholic, Episcopal, etc.)',
      },
      {
        name: 'Readings',
        description: 'Retrieve daily scripture readings based on liturgical calendar',
      },
      {
        name: 'Calendar',
        description: 'Access liturgical calendar information including seasons and special days',
      },
      {
        name: 'Search',
        description: 'Search and query scripture passages and liturgical content',
      },
    ],
  },
  apis: process.env.NODE_ENV === 'production' ? [
    `${__dirname}/../routes/*.js`,
    `${__dirname}/../controllers/*.js`,
  ] : [
    './src/routes/*.ts',
    './src/controllers/*.ts',
  ],
};

export const swaggerSpec = swaggerJSDoc(options);