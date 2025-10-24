import express, { Express, Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import prisma from './config/database'
import authRoutes from './routes/auth.routes'
import leadRoutes from './routes/lead.routes'
import tagRoutes from './routes/tag.routes'
import noteRoutes from './routes/note.routes'
import campaignRoutes from './routes/campaign.routes'
import taskRoutes from './routes/task.routes'
import { requestLogger } from './middleware/logger'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { generalLimiter } from './middleware/rateLimiter'

// Load environment variables
dotenv.config()

// Initialize express app
const app: Express = express()
const PORT = process.env.PORT || 8000

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
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
      campaigns: '/api/campaigns/*'
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
