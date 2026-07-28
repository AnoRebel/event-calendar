import { ref, readonly } from 'vue'
import type { CalendarEvent } from '../types'

interface SecurityConfig {
  enableCSP: boolean
  sanitizeInputs: boolean
  enableRateLimit: boolean
  maxEventsPerUser: number
  maxRequestsPerMinute: number
  allowedHtmlTags: string[]
  blockedDomains: string[]
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

interface SecurityViolation {
  type: 'xss' | 'injection' | 'rate_limit' | 'size_limit' | 'malicious_content'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: Date
  userAgent?: string
  ip?: string
}

/**
 * Security layer for calendar application
 */
export function useSecurity(
  config: SecurityConfig = {
    enableCSP: true,
    sanitizeInputs: true,
    enableRateLimit: true,
    maxEventsPerUser: 1000,
    maxRequestsPerMinute: 60,
    allowedHtmlTags: ['b', 'i', 'em', 'strong', 'br'],
    blockedDomains: ['malicious.com', 'spam.site']
  }
) {
  const securityConfig = ref(config)
  const violations = ref<SecurityViolation[]>([])
  const rateLimitStore = ref<Map<string, RateLimitEntry>>(new Map())

  // Content Security Policy
  const setupCSP = (): void => {
    if (!securityConfig.value.enableCSP || typeof document === 'undefined') return

    const cspMeta = document.createElement('meta')
    cspMeta.httpEquiv = 'Content-Security-Policy'
    cspMeta.content = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // Allow inline scripts for Vue
      "style-src 'self' 'unsafe-inline'", // Allow inline styles
      "img-src 'self' data: https:",
      "font-src 'self' https:",
      "connect-src 'self' https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')

    document.head.appendChild(cspMeta)
  }

  // Input sanitization
  const sanitizeHtml = (input: string): string => {
    if (!input || typeof input !== 'string') return ''

    // Remove script tags completely
    let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    
    // Remove dangerous event handlers
    sanitized = sanitized.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
    
    // Remove javascript: and data: URLs
    sanitized = sanitized.replace(/javascript:/gi, '')
    sanitized = sanitized.replace(/data:/gi, '')
    
    // Allow only specified HTML tags
    const allowedTags = securityConfig.value.allowedHtmlTags.join('|')
    const tagRegex = new RegExp(`<(?!\/?(?:${allowedTags})(?:\s|>))[^>]*>`, 'gi')
    sanitized = sanitized.replace(tagRegex, '')
    
    // Encode remaining dangerous characters
    sanitized = sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
    
    return sanitized
  }

  const sanitizeUrl = (url: string): string => {
    if (!url || typeof url !== 'string') return ''
    
    try {
      const urlObj = new URL(url)
      
      // Block dangerous protocols
      const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']
      if (dangerousProtocols.some(protocol => urlObj.protocol.startsWith(protocol))) {
        return ''
      }
      
      // Block malicious domains
      if (securityConfig.value.blockedDomains.includes(urlObj.hostname)) {
        reportViolation({
          type: 'malicious_content',
          severity: 'high',
          message: `Blocked malicious domain: ${urlObj.hostname}`,
          timestamp: new Date()
        })
        return ''
      }
      
      return urlObj.toString()
    } catch {
      return '' // Invalid URL
    }
  }

  // Event sanitization
  const sanitizeEvent = (event: Partial<CalendarEvent>): Partial<CalendarEvent> => {
    if (!securityConfig.value.sanitizeInputs) return event

    const sanitized = { ...event }

    // Sanitize text fields
    if (sanitized.title) {
      sanitized.title = sanitizeHtml(sanitized.title)
      
      // Additional title validation
      if (sanitized.title.length > 200) {
        sanitized.title = sanitized.title.substring(0, 200)
      }
    }

    if (sanitized.description) {
      sanitized.description = sanitizeHtml(sanitized.description)
      
      // Limit description length
      if (sanitized.description.length > 2000) {
        sanitized.description = sanitized.description.substring(0, 2000)
      }
    }

    if (sanitized.location) {
      sanitized.location = sanitizeHtml(sanitized.location)
      
      // Check for suspicious location patterns
      if (containsSuspiciousContent(sanitized.location)) {
        reportViolation({
          type: 'malicious_content',
          severity: 'medium',
          message: 'Suspicious content in location field',
          timestamp: new Date()
        })
        sanitized.location = '[Location removed for security]'
      }
    }

    return sanitized
  }

  // XSS Detection
  const detectXSS = (input: string): boolean => {
    if (!input || typeof input !== 'string') return false

    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /<link/i,
      /<meta/i,
      /document\.cookie/i,
      /document\.write/i,
      /eval\s*\(/i,
      /setTimeout\s*\(/i,
      /setInterval\s*\(/i
    ]

    return xssPatterns.some(pattern => pattern.test(input))
  }

  // SQL Injection Detection
  const detectSQLInjection = (input: string): boolean => {
    if (!input || typeof input !== 'string') return false

    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(--|#|\/\*|\*\/)/,
      /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
      /'.*?(\b(OR|AND)\b.*?){2,}/i,
      /\b(CHAR|ASCII|SUBSTRING|LENGTH|MID|UPPER|LOWER)\s*\(/i
    ]

    return sqlPatterns.some(pattern => pattern.test(input))
  }

  // Malicious content detection
  const containsSuspiciousContent = (input: string): boolean => {
    if (!input || typeof input !== 'string') return false

    const suspiciousPatterns = [
      /\b(hack|crack|exploit|vulnerability)\b/i,
      /\b(phishing|malware|virus|trojan)\b/i,
      /(bit\.ly|tinyurl\.com|goo\.gl)\/[a-zA-Z0-9]+/i, // Suspicious short URLs
      /\b\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}\b/, // Credit card patterns
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN patterns
      /password\s*[:=]\s*\w+/i
    ]

    return suspiciousPatterns.some(pattern => pattern.test(input))
  }

  // Rate limiting
  const checkRateLimit = (identifier: string): boolean => {
    if (!securityConfig.value.enableRateLimit) return true

    const now = Date.now()
    const entry = rateLimitStore.value.get(identifier)

    if (!entry) {
      rateLimitStore.value.set(identifier, {
        count: 1,
        resetTime: now + 60000 // 1 minute
      })
      return true
    }

    if (now > entry.resetTime) {
      // Reset the counter
      rateLimitStore.value.set(identifier, {
        count: 1,
        resetTime: now + 60000
      })
      return true
    }

    if (entry.count >= securityConfig.value.maxRequestsPerMinute) {
      reportViolation({
        type: 'rate_limit',
        severity: 'medium',
        message: `Rate limit exceeded for ${identifier}`,
        timestamp: new Date()
      })
      return false
    }

    entry.count++
    return true
  }

  // Comprehensive security check
  const performSecurityCheck = (event: Partial<CalendarEvent>, userIdentifier?: string): {
    isSecure: boolean
    violations: SecurityViolation[]
    sanitizedEvent: Partial<CalendarEvent>
  } => {
    const checkViolations: SecurityViolation[] = []
    
    // Rate limiting check
    if (userIdentifier && !checkRateLimit(userIdentifier)) {
      checkViolations.push({
        type: 'rate_limit',
        severity: 'medium',
        message: 'Rate limit exceeded',
        timestamp: new Date()
      })
    }

    // XSS Detection
    const textFields = [event.title, event.description, event.location].filter(Boolean) as string[]
    for (const field of textFields) {
      if (detectXSS(field)) {
        checkViolations.push({
          type: 'xss',
          severity: 'high',
          message: 'XSS attempt detected',
          timestamp: new Date()
        })
      }
      
      if (detectSQLInjection(field)) {
        checkViolations.push({
          type: 'injection',
          severity: 'high',
          message: 'SQL injection attempt detected',
          timestamp: new Date()
        })
      }
    }

    // Size limits
    const eventSize = JSON.stringify(event).length
    if (eventSize > 50000) { // 50KB limit
      checkViolations.push({
        type: 'size_limit',
        severity: 'medium',
        message: 'Event data exceeds size limit',
        timestamp: new Date()
      })
    }

    // Sanitize the event
    const sanitizedEvent = sanitizeEvent(event)

    return {
      isSecure: checkViolations.length === 0,
      violations: checkViolations,
      sanitizedEvent
    }
  }

  // Violation reporting
  const reportViolation = (violation: SecurityViolation): void => {
    violations.value.push(violation)
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Security violation detected:', violation)
    }
    
    // In production, you'd send this to a security monitoring service
    if (violation.severity === 'critical' || violation.severity === 'high') {
      // Implement alerting logic here
      console.error('High severity security violation:', violation)
    }
  }

  // Content validation for rich text
  const validateRichContent = (content: string): { isValid: boolean; sanitized: string } => {
    const sanitized = sanitizeHtml(content)
    
    // Check if content was significantly modified
    const originalLength = content.length
    const sanitizedLength = sanitized.length
    const modificationRatio = (originalLength - sanitizedLength) / originalLength
    
    if (modificationRatio > 0.3) { // More than 30% was removed
      reportViolation({
        type: 'malicious_content',
        severity: 'medium',
        message: 'Significant content sanitization occurred',
        timestamp: new Date()
      })
    }
    
    return {
      isValid: modificationRatio < 0.5, // Invalid if more than 50% was removed
      sanitized
    }
  }

  // File upload security (for future use)
  const validateFileUpload = (file: File): { isValid: boolean; error?: string } => {
    // File type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'File type not allowed' }
    }
    
    // Size validation (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return { isValid: false, error: 'File size too large' }
    }
    
    // File name validation
    if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
      return { isValid: false, error: 'Invalid file name' }
    }
    
    return { isValid: true }
  }

  // Security cleanup
  const clearViolations = (): void => {
    violations.value = []
  }

  const clearRateLimitData = (): void => {
    rateLimitStore.value.clear()
  }

  // Initialize security
  const initializeSecurity = (): void => {
    setupCSP()
    
    // Set up global error handling for security
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        // Log potential security-related errors
        if (event.error?.message?.includes('CSP') || 
            event.error?.message?.includes('Content Security Policy')) {
          reportViolation({
            type: 'xss',
            severity: 'high',
            message: 'CSP violation detected',
            timestamp: new Date()
          })
        }
      })
    }
  }

  return {
    // State
    violations: readonly(violations),
    securityConfig: readonly(securityConfig),
    
    // Core security functions
    sanitizeHtml,
    sanitizeUrl,
    sanitizeEvent,
    performSecurityCheck,
    
    // Detection functions
    detectXSS,
    detectSQLInjection,
    containsSuspiciousContent,
    
    // Validation functions
    validateRichContent,
    validateFileUpload,
    
    // Rate limiting
    checkRateLimit,
    
    // Violation handling
    reportViolation,
    clearViolations,
    clearRateLimitData,
    
    // Initialization
    initializeSecurity
  }
}