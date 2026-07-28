export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  const health = {
    status: "healthy" as "healthy" | "degraded" | "unhealthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    checks: {
      database: "healthy" as "healthy" | "unhealthy",
      memory: "healthy" as "healthy" | "warning",
    },
    responseTime: 0,
  }

  // Memory check (real).
  const memUsage = process.memoryUsage()
  const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100
  if (memoryUsagePercent > 90) {
    health.checks.memory = "warning"
    health.status = "degraded"
  }

  // Database check — a real probe against libSQL, not a hardcoded status. If the
  // database is unreachable the endpoint reports unhealthy and returns 503.
  try {
    const client = useDbClient()
    await client.execute("SELECT 1")
    health.checks.database = "healthy"
  } catch {
    health.checks.database = "unhealthy"
    health.status = "unhealthy"
  }

  health.responseTime = Date.now() - startTime

  if (health.status === "unhealthy") {
    setResponseStatus(event, 503)
  }
  return health
})
