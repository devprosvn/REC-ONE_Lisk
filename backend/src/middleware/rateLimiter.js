import { RateLimiterMemory } from 'rate-limiter-flexible'

// Create rate limiter instance
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: parseInt(process.env.RATE_LIMIT_MAX) || 100, // Number of requests
  duration: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60, // Per 15 minutes
  blockDuration: 60, // Block for 1 minute if limit exceeded
})

// Stricter rate limiting for write operations
const writeRateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 20, // 20 write operations
  duration: 60, // Per minute
  blockDuration: 300, // Block for 5 minutes
})

const rateLimiterMiddleware = async (req, res, next) => {
  try {
    // Use stricter limits for POST, PUT, DELETE operations
    const limiter = ['POST', 'PUT', 'DELETE'].includes(req.method)
      ? writeRateLimiter
      : rateLimiter

    await limiter.consume(req.ip)
    next()
  } catch (rejRes) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1

    res.set('Retry-After', String(secs))
    res.status(429).json({
      success: false,
      message: 'Too many requests',
      retryAfter: secs,
      limit: rejRes.totalHits,
      remaining: rejRes.remainingPoints || 0
    })
  }
}

// Export the middleware as default
export default rateLimiterMiddleware
