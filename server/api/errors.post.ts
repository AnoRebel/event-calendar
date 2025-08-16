export default defineEventHandler(async (event) => {
  try {
    const errorData = await readBody(event)
    
    // Validate error data
    if (!errorData || !errorData.message) {
      setResponseStatus(event, 400)
      return { error: 'Invalid error data' }
    }

    // Log error (in production, send to error monitoring service)
    console.error('Client error reported:', {
      id: errorData.id,
      type: errorData.type,
      message: errorData.message,
      severity: errorData.severity,
      timestamp: errorData.timestamp,
      context: errorData.context
    })

    // In production, you would:
    // 1. Send to error monitoring service (Sentry, Bugsnag, etc.)
    // 2. Alert on critical errors
    // 3. Store in database for analysis
    // 4. Track error patterns

    // For critical errors, you might want to send immediate alerts
    if (errorData.severity === 'critical') {
      // Send alert to monitoring service
      console.error('CRITICAL ERROR DETECTED:', errorData)
    }

    return { status: 'success', logged: true }
  } catch (error) {
    setResponseStatus(event, 500)
    return { 
      error: 'Failed to log error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})