import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import dotenv from 'dotenv'
import { testConnection } from './config/supabase.js'
import { setupRoutes } from './routes/index.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import rateLimiter from './middleware/rateLimiter.js'
import { logger } from './utils/logger.js'
import { ScheduledTasksService } from './services/scheduledTasks.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}))

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

// Compression and parsing middleware
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Rate limiting
app.use(rateLimiter)

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  })
  next()
})

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await testConnection()
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: dbConnected ? 'connected' : 'disconnected'
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    })
  }
})

// API routes
setupRoutes(app)

// Error handling middleware
app.use(notFoundHandler)
app.use(errorHandler)

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection()
    if (!dbConnected) {
      logger.warn('Database connection failed, but server will continue')
    }

    app.listen(PORT, () => {
      logger.info(`🚀 REC-ONE Backend Server started on port ${PORT}`)
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
      logger.info(`🔗 Database: ${dbConnected ? 'Connected' : 'Disconnected'}`)
      logger.info(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`)
      logger.info(`📡 API Base URL: http://localhost:${PORT}/api/v1`)

      // Start scheduled tasks for offer lifecycle management
      if (dbConnected) {
        ScheduledTasksService.start()
        logger.info(`⏰ Scheduled tasks started for offer lifecycle management`)
      } else {
        logger.warn(`⚠️ Scheduled tasks not started due to database connection issues`)
      }
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  process.exit(0)
})

// Unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

// Uncaught exception
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  process.exit(1)
})

startServer()

export default app
