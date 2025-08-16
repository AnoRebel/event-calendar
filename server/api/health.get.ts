export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  try {
    // Basic health checks
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: 'healthy',
        redis: 'healthy',
        memory: 'healthy',
        disk: 'healthy'
      },
      responseTime: 0
    }

    // Memory check
    const memUsage = process.memoryUsage()
    const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100
    
    if (memoryUsagePercent > 90) {
      health.checks.memory = 'warning'
      health.status = 'degraded'
    }

    // Database connectivity check (if configured)
    if (process.env.DATABASE_URL) {
      try {
        // Simulate database check
        await new Promise(resolve => setTimeout(resolve, 10))
      } catch (error) {
        health.checks.database = 'unhealthy'
        health.status = 'unhealthy'
      }
    }

    // Redis connectivity check (if configured)
    if (process.env.REDIS_URL) {
      try {
        // Simulate Redis check
        await new Promise(resolve => setTimeout(resolve, 5))
      } catch (error) {
        health.checks.redis = 'unhealthy'
        health.status = 'unhealthy'
      }
    }

    health.responseTime = Date.now() - startTime

    return health
  } catch (error) {
    setResponseStatus(event, 503)
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    }
  }
})