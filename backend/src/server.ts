import express, { Express, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import prisma from './config/database'
import { corsOptions } from './config/cors'
import authRoutes from './routes/auth.routes'
import leadRoutes from './routes/lead.routes'
import tagRoutes from './routes/tag.routes'
import noteRoutes from './routes/note.routes'
import campaignRoutes from './routes/campaign.routes'
import taskRoutes from './routes/task.routes'
import activityRoutes from './routes/activity.routes'
import analyticsRoutes from './routes/analytics.routes'
import aiRoutes from './routes/ai.routes'
import templateRoutes from './routes/template.routes'
import messageRoutes from './routes/message.routes'
import workflowRoutes from './routes/workflow.routes'
import settingsRoutes from './routes/settings.routes'
import integrationRoutes from './routes/integration.routes'
import teamRoutes from './routes/team.routes'
import appointmentRoutes from './routes/appointment.routes'
import { requestLogger } from './middleware/logger'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { generalLimiter } from './middleware/rateLimiter'

// Load environment variables
dotenv.config()

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
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

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

// API routes will go here
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'Master RealEstate Pro API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      leads: '/api/leads/*',
      tags: '/api/tags/*',
      notes: '/api/notes/*',
      campaigns: '/api/campaigns/*',
      activities: '/api/activities/*',
      analytics: '/api/analytics/*',
      ai: '/api/ai/*',
      templates: '/api/templates/*',
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
app.use('/api/templates', templateRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/workflows', workflowRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/integrations', integrationRoutes)
app.use('/api/teams', teamRoutes)
app.use('/api/appointments', appointmentRoutes)

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
})

export default app
