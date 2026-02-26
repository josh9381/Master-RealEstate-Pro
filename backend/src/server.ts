import dotenv from 'dotenv'

// Load environment variables BEFORE any other imports that use process.env at module scope
dotenv.config()

import express, { Express, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cron from 'node-cron'
import prisma from './config/database'
import { corsOptions } from './config/cors'
import { checkAndExecuteScheduledCampaigns } from './services/campaign-scheduler.service'
import { startWorkflowJobs, setupGracefulShutdown } from './jobs/workflowProcessor'
import { updateAllLeadScores } from './services/leadScoring.service'
import { getMLOptimizationService } from './services/ml-optimization.service'
import authRoutes from './routes/auth.routes'
import leadRoutes from './routes/lead.routes'
import tagRoutes from './routes/tag.routes'
import customFieldRoutes from './routes/custom-field.routes'
import noteRoutes from './routes/note.routes'
import campaignRoutes from './routes/campaign.routes'
import taskRoutes from './routes/task.routes'
import activityRoutes from './routes/activity.routes'
import analyticsRoutes from './routes/analytics.routes'
import aiRoutes from './routes/ai.routes'
import intelligenceRoutes from './routes/intelligence.routes'
import abtestRoutes from './routes/abtest.routes'
import emailTemplateRoutes from './routes/email-template.routes'
import smsTemplateRoutes from './routes/sms-template.routes'
import messageRoutes from './routes/message.routes'
import workflowRoutes from './routes/workflow.routes'
import settingsRoutes from './routes/settings.routes'
import integrationRoutes from './routes/integration.routes'
import teamRoutes from './routes/team.routes'
import appointmentRoutes from './routes/appointment.routes'
import webhookRoutes from './routes/webhook.routes'
import unsubscribeRoutes from './routes/unsubscribe.routes'
import deliverabilityRoutes from './routes/deliverability.routes'
import userRoutes from './routes/user.routes'
import notificationRoutes from './routes/notification.routes'
import adminRoutes from './routes/admin.routes'
import subscriptionRoutes from './routes/subscription.routes'
import billingRoutes from './routes/billing.routes'
import segmentationRoutes from './routes/segmentation.routes'
import exportRoutes from './routes/export.routes'
import savedReportRoutes from './routes/savedReport.routes'
import { correlationId, requestLogger } from './middleware/logger'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { sanitizeInput } from './middleware/sanitize'
import { generalLimiter } from './middleware/rateLimiter'
import { authenticate } from './middleware/auth'
import { requireAdminOrManager } from './middleware/admin'
import { logger } from './lib/logger'
import * as Sentry from '@sentry/node'

// Initialize express app
const app: Express = express()
const PORT = process.env.PORT || 8000

// #109: Initialize Sentry for error tracking (if DSN configured)
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  })
  logger.info('Sentry error tracking initialized')
}

// Trust proxy - necessary for rate limiting behind proxies/dev containers
app.set('trust proxy', 1)

// CORS configuration (environment-aware)
app.use(cors(corsOptions));

// Security headers - Development-friendly configuration
const isDevelopment = process.env.NODE_ENV !== 'production'
app.use(helmet({
  contentSecurityPolicy: isDevelopment ? false : {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: isDevelopment ? false : true,
  hsts: isDevelopment ? false : {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}))

// Middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Input sanitization
app.use(sanitizeInput)

// #108: Correlation ID — must come before request logging so log lines include the ID
app.use(correlationId)

// Request logging (#106: pino structured logging)
app.use(requestLogger)

// Rate limiting (general)
app.use(generalLimiter)

// #110: Expanded health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const checks: Record<string, string> = {
    database: 'unknown',
    sendgrid: 'unknown',
  }

  let overallStatus: 'ok' | 'degraded' | 'error' = 'ok'

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = 'connected'
  } catch {
    checks.database = 'disconnected'
    overallStatus = 'error'
  }

  // Check SendGrid API key presence (does not make an API call)
  checks.sendgrid = process.env.SENDGRID_API_KEY ? 'configured' : 'not_configured'

  // Memory usage
  const mem = process.memoryUsage()

  res.status(overallStatus === 'error' ? 500 : 200).json({
    status: overallStatus,
    message: 'Master RealEstate Pro API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    checks,
    memory: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      external: Math.round(mem.external / 1024 / 1024),
    },
  })
})

// Service integration status — tells the frontend which APIs are in mock mode
app.get('/api/system/integration-status', (req: Request, res: Response) => {
  res.json({
    email: {
      configured: !!process.env.SENDGRID_API_KEY,
      provider: process.env.SENDGRID_API_KEY ? 'sendgrid' : 'mock',
    },
    sms: {
      configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      provider: (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) ? 'twilio' : 'mock',
    },
    ai: {
      configured: !!process.env.OPENAI_API_KEY,
      provider: process.env.OPENAI_API_KEY ? 'openai' : 'none',
    },
  })
})

// API routes will go here
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'Master RealEstate Pro API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      users: '/api/users/*',
      leads: '/api/leads/*',
      tags: '/api/tags/*',
      notes: '/api/notes/*',
      campaigns: '/api/campaigns/*',
      activities: '/api/activities/*',
      analytics: '/api/analytics/*',
      ai: '/api/ai/*',
      emailTemplates: '/api/email-templates/*',
      smsTemplates: '/api/sms-templates/*',
      messages: '/api/messages/*',
      workflows: '/api/workflows/*',
      settings: '/api/settings/*',
      integrations: '/api/integrations/*',
      teams: '/api/teams/*',
      appointments: '/api/appointments/*',
    }
  })
})

// Mount routes
app.use('/api/auth', authRoutes)
app.use('/api/leads', leadRoutes)
app.use('/api/tags', tagRoutes)
app.use('/api/custom-fields', customFieldRoutes)
app.use('/api/notes', noteRoutes)
app.use('/api/campaigns', campaignRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/activities', activityRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/intelligence', intelligenceRoutes)
app.use('/api/ab-tests', abtestRoutes)
app.use('/api/email-templates', emailTemplateRoutes)
app.use('/api/sms-templates', smsTemplateRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/workflows', workflowRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/integrations', integrationRoutes)
app.use('/api/teams', teamRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/webhooks', webhookRoutes)
app.use('/api/unsubscribe', unsubscribeRoutes)
app.use('/api/deliverability', deliverabilityRoutes)
app.use('/api/users', userRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/admin', authenticate, requireAdminOrManager, adminRoutes)
app.use('/api/subscriptions', authenticate, subscriptionRoutes)
app.use('/api/billing', billingRoutes)
app.use('/api/segments', authenticate, segmentationRoutes)
app.use('/api/export', authenticate, exportRoutes)
app.use('/api/reports/saved', authenticate, savedReportRoutes)

// 404 handler
app.use(notFoundHandler)

// #109: Sentry error handler (must be before our global error handler)
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app)
}

// Global error handler (must be last)
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'Server started')
  
  // Initialize cron jobs
  logger.info('Starting scheduled jobs...')
  
  // Run every minute to check for scheduled campaigns
  cron.schedule('* * * * *', async () => {
    await checkAndExecuteScheduledCampaigns()
  })
  logger.info('Campaign scheduler active - checking every minute')
  
  // Run daily at 2 AM to recalculate all lead scores
  cron.schedule('0 2 * * *', async () => {
    logger.info('Running daily lead score recalculation...')
    try {
      const result = await updateAllLeadScores()
      logger.info({ updated: result.updated, errors: result.errors }, 'Lead scores updated')
    } catch (error) {
      logger.error({ error }, 'Failed to recalculate lead scores')
    }
  })
  logger.info('Lead scoring scheduler active - running daily at 2 AM')
  
  // Run weekly on Sundays at 3 AM to optimize ML scoring weights
  cron.schedule('0 3 * * 0', async () => {
    logger.info('Running weekly ML optimization for all users...')
    try {
      const mlService = getMLOptimizationService()
      const users = await prisma.user.findMany({
        where: {
          leads: {
            some: {
              status: { in: ['WON', 'LOST'] }
            }
          }
        },
        select: { id: true, firstName: true, lastName: true, organizationId: true }
      })
      
      let optimizedCount = 0
      for (const user of users) {
        try {
          logger.info({ user: `${user.firstName} ${user.lastName}` }, 'Optimizing model')
          const result = await mlService.optimizeScoringWeights(user.id, user.organizationId)
          logger.info({ user: `${user.firstName} ${user.lastName}`, accuracy: result.accuracy.toFixed(1), sampleSize: result.sampleSize }, 'Model optimized')
          optimizedCount++
        } catch (error) {
          logger.error({ userId: user.id, error }, 'Failed to optimize for user')
        }
      }
      logger.info({ optimized: optimizedCount, total: users.length }, 'ML optimization complete')
    } catch (error) {
      logger.error({ error }, 'Failed to run ML optimization')
    }
  })
  logger.info('ML optimization scheduler active - running weekly on Sundays at 3 AM')
  
  // Start workflow background jobs
  logger.info('Starting workflow automation engine...')
  startWorkflowJobs()
  setupGracefulShutdown()
  logger.info('Workflow automation engine active')
})

export default app
