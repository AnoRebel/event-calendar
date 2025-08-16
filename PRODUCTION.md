# Production Deployment Guide

This guide covers deploying the Event Calendar application to production with all the enhanced features and security
measures.

## 🚀 Quick Start

```bash
# Clone and setup
git clone https://github/AnoRebel/event-calendar
cd event-calendar
cp .env.example .env

# Configure environment variables
nano .env

# Deploy with Docker
docker-compose up -d

# Or deploy with scripts
./scripts/deploy.sh
```

## 📋 Prerequisites

- Docker & Docker Compose
- Node.js 18+ & Bun
- PostgreSQL (optional)
- Redis (optional)
- SSL certificates for HTTPS

## 🔧 Environment Configuration

### Required Environment Variables

```bash
# Application
NODE_ENV=production
NUXT_APP_BASE_URL=https://your-domain.com
SECRET_KEY=your-super-secret-key-change-this

# Database (optional)
DATABASE_URL=postgresql://user:password@localhost:5432/calendar_db

# Cache (optional)
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-jwt-secret-key
ENCRYPTION_KEY=your-encryption-key-32-chars

# Monitoring (optional)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
```

### Optional Features

```bash
# Analytics
NUXT_PUBLIC_ENABLE_ANALYTICS=true
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX

# External Calendar Integration
GOOGLE_CLIENT_ID=your-google-client-id
MICROSOFT_CLIENT_ID=your-microsoft-client-id

# Email Notifications
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
```

## 🐳 Docker Deployment

### Production with Docker Compose

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Health check
curl http://localhost:3000/api/health
```

### Custom Docker Build

```bash
# Build image
docker build -t event-calendar .

# Run container
docker run -d \
  --name calendar-app \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e SECRET_KEY=your-secret \
  event-calendar
```

## 🛠️ Manual Deployment

### 1. Install Dependencies

```bash
bun install --frozen-lockfile
```

### 2. Build Application

```bash
bun run build
```

### 3. Start Production Server

```bash
node .output/server/index.mjs
```

## 🔒 Security Configuration

### 1. SSL/TLS Setup

Configure HTTPS in your reverse proxy (nginx/apache):

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 2. Environment Security

```bash
# Set secure file permissions
chmod 600 .env

# Use Docker secrets for sensitive data
docker secret create db_password /path/to/password.txt
```

### 3. Security Headers

The application automatically sets security headers:

- Content Security Policy (CSP)
- HSTS
- X-Frame-Options
- X-Content-Type-Options

## 📊 Monitoring & Analytics

### Built-in Monitoring

The application includes:

- Performance monitoring
- Error tracking
- User analytics
- Health checks

### External Services Integration

Configure monitoring services:

```bash
# Sentry for error tracking
SENTRY_DSN=your-sentry-dsn

# Google Analytics
GOOGLE_ANALYTICS_ID=your-ga-id

# Custom analytics endpoint
ANALYTICS_ENDPOINT=https://your-analytics.com/api
```

### Health Monitoring

```bash
# Health check endpoint
curl http://localhost:3000/api/health

# Response includes:
{
  "status": "healthy",
  "uptime": 3600,
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "memory": "healthy"
  }
}
```

## 🔄 CI/CD Pipeline

### GitHub Actions

The repository includes a complete CI/CD pipeline:

1. **Testing**: Unit tests, E2E tests, linting
2. **Security**: Dependency audit, vulnerability scanning
3. **Performance**: Lighthouse CI audits
4. **Deployment**: Automated Docker builds and deployment

### Manual Deployment

```bash
# Deploy to production
./scripts/deploy.sh

# Rollback if needed
./scripts/deploy.sh rollback

# Check health
./scripts/deploy.sh health-check
```

## 📈 Performance Optimization

### Built-in Optimizations

- Event virtualization for large datasets
- Intelligent caching with LRU eviction
- Service Worker for offline support
- Code splitting and lazy loading
- Image optimization

### Performance Monitoring

```bash
# Run Lighthouse audit
bun run performance:audit

# Check Core Web Vitals
# LCP < 2.5s, FID < 100ms, CLS < 0.1
```

## 🗄️ Database Setup (Optional)

### PostgreSQL

```sql
-- Create database
CREATE DATABASE calendar_db;
CREATE USER calendar_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE calendar_db TO calendar_user;

-- Run migrations (if implemented)
bun run migrate
```

### Redis Cache

```bash
# Start Redis
redis-server

# Configure cache settings
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600
```

## 🔧 Troubleshooting

### Common Issues

1. **Service Won't Start**

   ```bash
   # Check logs
   docker-compose logs calendar-app

   # Verify environment
   docker-compose exec calendar-app env
   ```

2. **Performance Issues**

   ```bash
   # Check memory usage
   docker stats

   # Monitor application metrics
   curl http://localhost:3000/api/health
   ```

3. **Security Errors**

   ```bash
   # Verify CSP configuration
   # Check browser console for CSP violations

   # Validate SSL
   openssl s_client -connect your-domain.com:443
   ```

### Debug Mode

```bash
# Enable debug logging
NUXT_DEBUG=true bun run start

# Or with Docker
docker-compose -f docker-compose.yml -f docker-compose.debug.yml up
```

## 📚 Maintenance

### Regular Tasks

```bash
# Update dependencies
bun update

# Security audit
bun run security:audit

# Clean old Docker images
docker system prune -a

# Backup database (if used)
pg_dump $DATABASE_URL > backup.sql
```

### Monitoring Checklist

- [ ] Check application health endpoint
- [ ] Monitor error rates and performance
- [ ] Review security alerts
- [ ] Update dependencies monthly
- [ ] Rotate secrets quarterly

## 🎯 Production Features

### ✅ Implemented Features

- **Security**: CSP, input sanitization, rate limiting
- **Performance**: Virtualization, caching, service worker
- **Reliability**: Error recovery, circuit breaker, offline support
- **Monitoring**: Analytics, error tracking, health checks
- **Accessibility**: WCAG compliance, mobile optimization
- **PWA**: Offline support, installable, background sync

### 🔄 Scaling Considerations

- **Horizontal scaling**: Load balancer + multiple instances
- **Database scaling**: Read replicas, connection pooling
- **Cache scaling**: Redis Cluster for high availability
- **CDN**: Static asset caching and global distribution

## 📞 Support

For production issues:

1. Check the health endpoint: `/api/health`
2. Review application logs
3. Check monitoring dashboards
4. Consult this documentation
5. Create an issue with logs and environment details

---

## 🔗 Quick Links

- [Development Guide](README.md)
- [API Documentation](docs/api.md)
- [Security Policy](SECURITY.md)
- [Contributing Guidelines](CONTRIBUTING.md)
