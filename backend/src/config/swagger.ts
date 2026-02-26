import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import type { Express } from 'express'

const swaggerDefinition: swaggerJsdoc.SwaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Master RealEstate Pro API',
    version: '1.0.0',
    description:
      'Comprehensive real-estate CRM backend API — leads, campaigns, tasks, workflows, analytics, AI intelligence, notifications, and more.',
    contact: { name: 'Master RealEstate Pro', url: 'https://github.com/josh9381/Master-RealEstate-Pro' },
    license: { name: 'Proprietary' },
  },
  servers: [
    {
      url: `http://localhost:${process.env.PORT || 8000}`,
      description: 'Development server',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Authentication & session management' },
    { name: 'Users', description: 'User profile & account management' },
    { name: 'Leads', description: 'Lead CRUD, scoring, import/merge' },
    { name: 'Campaigns', description: 'Email/SMS campaign management' },
    { name: 'Tasks', description: 'Task management & assignment' },
    { name: 'Notes', description: 'Lead notes' },
    { name: 'Tags', description: 'Tag management' },
    { name: 'Activities', description: 'Activity feed & logging' },
    { name: 'Analytics', description: 'Dashboards, reports & performance metrics' },
    { name: 'AI', description: 'AI-powered content generation & suggestions' },
    { name: 'Intelligence', description: 'Predictive analytics & ML insights' },
    { name: 'Workflows', description: 'Automation workflows' },
    { name: 'Notifications', description: 'In-app notification management' },
    { name: 'Messages', description: 'Email & SMS messaging' },
    { name: 'Templates', description: 'Email & SMS templates' },
    { name: 'Appointments', description: 'Appointment scheduling' },
    { name: 'Teams', description: 'Team & member management' },
    { name: 'Settings', description: 'Application settings' },
    { name: 'Integrations', description: 'Third-party integrations' },
    { name: 'Billing', description: 'Billing & subscription management' },
    { name: 'Admin', description: 'Admin-only endpoints' },
    { name: 'AB Tests', description: 'A/B test management' },
    { name: 'Segments', description: 'Lead segmentation' },
    { name: 'Webhooks', description: 'Webhook configuration' },
    { name: 'Export', description: 'Data export' },
    { name: 'Reports', description: 'Saved reports' },
    { name: 'System', description: 'Health & system information' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide a valid JWT access token obtained from POST /api/auth/login',
      },
    },
    schemas: {
      // ─── Common ───────────────────────────────────────────────
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          errors: { type: 'array', items: { type: 'object' } },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          page: { type: 'integer' },
          limit: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },

      // ─── Auth ─────────────────────────────────────────────────
      RegisterInput: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          organizationName: { type: 'string' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      TokenPair: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
            },
          },
        },
      },

      // ─── User ─────────────────────────────────────────────────
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'AGENT'] },
          organizationId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      // ─── Lead ─────────────────────────────────────────────────
      Lead: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          status: {
            type: 'string',
            enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'],
          },
          source: { type: 'string' },
          score: { type: 'integer' },
          value: { type: 'number' },
          assignedToId: { type: 'string', format: 'uuid', nullable: true },
          organizationId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateLeadInput: {
        type: 'object',
        required: ['firstName', 'lastName'],
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          status: { type: 'string', enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] },
          source: { type: 'string' },
          value: { type: 'number' },
          assignedToId: { type: 'string', format: 'uuid' },
        },
      },

      // ─── Campaign ─────────────────────────────────────────────
      Campaign: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['EMAIL', 'SMS', 'MULTI_CHANNEL'] },
          status: { type: 'string', enum: ['DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED'] },
          subject: { type: 'string' },
          content: { type: 'string' },
          sent: { type: 'integer' },
          delivered: { type: 'integer' },
          opened: { type: 'integer' },
          clicked: { type: 'integer' },
          converted: { type: 'integer' },
          bounced: { type: 'integer' },
          revenue: { type: 'number' },
          roi: { type: 'number' },
          organizationId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      // ─── Task ─────────────────────────────────────────────────
      Task: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          leadId: { type: 'string', format: 'uuid', nullable: true },
          assignedToId: { type: 'string', format: 'uuid', nullable: true },
          organizationId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      // ─── Note ─────────────────────────────────────────────────
      Note: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          content: { type: 'string' },
          leadId: { type: 'string', format: 'uuid' },
          authorId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // ─── Notification ─────────────────────────────────────────
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          type: { type: 'string' },
          title: { type: 'string' },
          message: { type: 'string' },
          read: { type: 'boolean' },
          userId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // ─── Workflow ─────────────────────────────────────────────
      Workflow: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          trigger: { type: 'string' },
          status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'DRAFT'] },
          steps: { type: 'array', items: { type: 'object' } },
          organizationId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      // ─── Activity ─────────────────────────────────────────────
      Activity: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          type: { type: 'string' },
          description: { type: 'string' },
          leadId: { type: 'string', format: 'uuid', nullable: true },
          userId: { type: 'string', format: 'uuid' },
          metadata: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  security: [{ BearerAuth: [] }],
}

const options: swaggerJsdoc.Options = {
  swaggerDefinition,
  // Scan route files for @openapi / @swagger JSDoc annotations
  apis: [
    './src/routes/*.ts',
    './src/config/swagger-paths.yaml',
  ],
}

export const swaggerSpec = swaggerJsdoc(options)

/**
 * Mount Swagger UI at /api-docs
 */
export function setupSwagger(app: Express): void {
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Master RealEstate Pro — API Docs',
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    })
  )

  // Expose raw spec at /api-docs.json
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(swaggerSpec)
  })
}
