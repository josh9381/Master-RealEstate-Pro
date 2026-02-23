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
import { requestLogger } from './middleware/logger'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { sanitizeInput } from './middleware/sanitize'
import { generalLimiter } from './middleware/rateLimiter'
import { authenticate } from './middleware/auth'
import { requireAdminOrManager } from './middleware/admin'

// Initialize express app
const app: Express = express()
const PORT = process.env.PORT || 8000

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

// Request logging
app.use(requestLogger)

// Rate limiting (general)
app.use(generalLimiter)

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`
    
    res.status(200).json({
      status: 'ok',
      message: 'Master RealEstate Pro API is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'connected'
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'disconnected'
    })
  }
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

// 404 handler
app.use(notFoundHandler)

// Global error handler (must be last)
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔗 Health check: http://localhost:${PORT}/health`)
  console.log(`🌐 API: http://localhost:${PORT}/api`)
  
  // Initialize cron jobs
  console.log(`⏰ Starting scheduled jobs...`)
  
  // Run every minute to check for scheduled campaigns
  cron.schedule('* * * * *', async () => {
    await checkAndExecuteScheduledCampaigns()
  })
  console.log(`✅ Campaign scheduler active - checking every minute`)
  
  // Run daily at 2 AM to recalculate all lead scores
  cron.schedule('0 2 * * *', async () => {
    console.log(`🎯 Running daily lead score recalculation...`)
    try {
      const result = await updateAllLeadScores()
      console.log(`✅ Lead scores updated: ${result.updated} leads, ${result.errors} errors`)
    } catch (error) {
      console.error(`❌ Failed to recalculate lead scores:`, error)
    }
  })
  console.log(`✅ Lead scoring scheduler active - running daily at 2 AM`)
  
  // Run weekly on Sundays at 3 AM to optimize ML scoring weights
  cron.schedule('0 3 * * 0', async () => {
    console.log(`🤖 Running weekly ML optimization for all users...`)
    try {
      const mlService = getMLOptimizationService()
      // Get all users with at least 20 conversions for optimization
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
          console.log(`  Optimizing model for ${user.firstName} ${user.lastName}...`)
          const result = await mlService.optimizeScoringWeights(user.id, user.organizationId)
          console.log(`  ✅ ${user.firstName} ${user.lastName}: ${result.accuracy.toFixed(1)}% accuracy (${result.sampleSize} leads)`)
          optimizedCount++
        } catch (error) {
          console.error(`  ❌ Failed to optimize for user ${user.id}:`, error)
        }
      }
      console.log(`✅ ML optimization complete for ${optimizedCount}/${users.length} users`)
    } catch (error) {
      console.error(`❌ Failed to run ML optimization:`, error)
    }
  })
  console.log(`✅ ML optimization scheduler active - running weekly on Sundays at 3 AM`)
  
  // Start workflow background jobs
  console.log(`🔄 Starting workflow automation engine...`)
  startWorkflowJobs()
  setupGracefulShutdown()
  console.log(`✅ Workflow automation engine active`)
})

export default app
