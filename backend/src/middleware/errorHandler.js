import { logger } from '../utils/logger.js'

export const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('API Error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  // Default error
  let error = {
    success: false,
    message: 'Internal server error',
    status: 500
  }

  // Supabase errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        error.message = 'Resource already exists'
        error.status = 409
        break
      case '23503': // Foreign key violation
        error.message = 'Referenced resource not found'
        error.status = 400
        break
      case '23502': // Not null violation
        error.message = 'Required field missing'
        error.status = 400
        break
      case 'PGRST116': // Table not found
        error.message = 'Resource not found'
        error.status = 404
        break
      default:
        error.message = 'Database error'
        error.status = 500
    }
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    error.message = 'Validation error'
    error.status = 400
    error.details = err.details
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token'
    error.status = 401
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired'
    error.status = 401
  }

  // Custom application errors
  if (err.status) {
    error.status = err.status
    error.message = err.message
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production') {
    delete error.stack
  } else {
    error.stack = err.stack
  }

  res.status(error.status).json(error)
}

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    availableRoutes: {
      api: '/api/v1',
      health: '/health',
      users: '/api/v1/users',
      energy: '/api/v1/energy',
      transactions: '/api/v1/transactions',
      stats: '/api/v1/stats'
    }
  })
}

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
