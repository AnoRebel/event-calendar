#!/bin/bash

# Production Deployment Script for Event Calendar
set -e  # Exit on any error

# Configuration
DOCKER_IMAGE_NAME="event-calendar"
DOCKER_TAG="latest"
COMPOSE_FILE="docker-compose.yml"
BACKUP_DIR="/backups/calendar"
LOG_FILE="/var/log/calendar-deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Starting pre-deployment checks..."
    
    # Check if required environment variables are set
    if [[ -z "$SECRET_KEY" || -z "$DATABASE_URL" ]]; then
        error "Required environment variables not set. Please check .env file."
    fi
    
    # Check Docker availability
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
    fi
    
    # Check Docker Compose availability
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed or not in PATH"
    fi
    
    # Check available disk space (minimum 2GB)
    available_space=$(df / | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 2097152 ]]; then
        error "Insufficient disk space. At least 2GB required."
    fi
    
    # Test database connectivity
    log "Testing database connection..."
    if ! timeout 10 bash -c "echo > /dev/tcp/$(echo $DATABASE_URL | cut -d'@' -f2 | cut -d'/' -f1 | cut -d':' -f1)/$(echo $DATABASE_URL | cut -d'@' -f2 | cut -d'/' -f1 | cut -d':' -f2)" 2>/dev/null; then
        warning "Cannot connect to database. Deployment will continue but may fail."
    fi
    
    log "Pre-deployment checks completed successfully"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    timestamp=$(date +%Y%m%d_%H%M%S)
    backup_path="$BACKUP_DIR/backup_$timestamp"
    
    mkdir -p "$backup_path"
    
    # Backup database
    if command -v pg_dump &> /dev/null; then
        log "Backing up database..."
        pg_dump "$DATABASE_URL" > "$backup_path/database.sql" || warning "Database backup failed"
    fi
    
    # Backup current application (if exists)
    if [[ -d "/app/current" ]]; then
        log "Backing up current application..."
        cp -r /app/current "$backup_path/app" || warning "Application backup failed"
    fi
    
    # Backup environment files
    if [[ -f ".env" ]]; then
        cp .env "$backup_path/" || warning "Environment backup failed"
    fi
    
    log "Backup created at $backup_path"
    
    # Clean old backups (keep last 5)
    find "$BACKUP_DIR" -maxdepth 1 -name "backup_*" -type d | sort -r | tail -n +6 | xargs rm -rf
}

# Build and deploy
build_and_deploy() {
    log "Building Docker image..."
    
    # Build the Docker image
    docker build -t "$DOCKER_IMAGE_NAME:$DOCKER_TAG" . || error "Docker build failed"
    
    log "Stopping existing services..."
    docker-compose -f "$COMPOSE_FILE" down || warning "No existing services to stop"
    
    log "Starting new services..."
    docker-compose -f "$COMPOSE_FILE" up -d || error "Failed to start services"
    
    log "Waiting for services to be ready..."
    sleep 30
    
    # Health check
    health_check
}

# Health check
health_check() {
    log "Performing health check..."
    
    max_attempts=30
    attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f http://localhost:3000/api/health &> /dev/null; then
            log "Health check passed"
            return 0
        fi
        
        log "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    error "Health check failed after $max_attempts attempts"
}

# Database migration
run_migrations() {
    log "Running database migrations..."
    
    # Run migrations in a temporary container
    docker run --rm \
        --network calendar_calendar-network \
        -e DATABASE_URL="$DATABASE_URL" \
        "$DOCKER_IMAGE_NAME:$DOCKER_TAG" \
        npm run migrate || warning "Migration failed or no migrations to run"
}

# Post-deployment tasks
post_deployment() {
    log "Running post-deployment tasks..."
    
    # Clear application caches
    log "Clearing application caches..."
    docker-compose exec -T calendar-app /bin/sh -c "
        if [ -d '/tmp/nitro' ]; then rm -rf /tmp/nitro/*; fi
        if [ -d '/tmp/cache' ]; then rm -rf /tmp/cache/*; fi
    " || warning "Cache clearing failed"
    
    # Warm up the application
    log "Warming up application..."
    curl -s http://localhost:3000/ > /dev/null || warning "Application warmup failed"
    
    # Send deployment notification (if webhook configured)
    if [[ -n "$DEPLOYMENT_WEBHOOK" ]]; then
        log "Sending deployment notification..."
        curl -X POST "$DEPLOYMENT_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"Calendar app deployed successfully at $(date)\"}" \
            || warning "Deployment notification failed"
    fi
    
    log "Post-deployment tasks completed"
}

# Rollback function
rollback() {
    log "Starting rollback procedure..."
    
    # Stop current services
    docker-compose -f "$COMPOSE_FILE" down
    
    # Find latest backup
    latest_backup=$(find "$BACKUP_DIR" -maxdepth 1 -name "backup_*" -type d | sort -r | head -n 1)
    
    if [[ -z "$latest_backup" ]]; then
        error "No backup found for rollback"
    fi
    
    log "Rolling back to backup: $latest_backup"
    
    # Restore database
    if [[ -f "$latest_backup/database.sql" ]]; then
        log "Restoring database..."
        psql "$DATABASE_URL" < "$latest_backup/database.sql" || error "Database restore failed"
    fi
    
    # Restore application
    if [[ -d "$latest_backup/app" ]]; then
        log "Restoring application..."
        rm -rf /app/current
        cp -r "$latest_backup/app" /app/current || error "Application restore failed"
    fi
    
    # Restart services
    docker-compose -f "$COMPOSE_FILE" up -d || error "Failed to restart services after rollback"
    
    log "Rollback completed successfully"
}

# Cleanup old Docker images
cleanup() {
    log "Cleaning up old Docker images..."
    
    # Remove dangling images
    docker image prune -f || warning "Image cleanup failed"
    
    # Remove old versions of our image (keep last 3)
    docker images "$DOCKER_IMAGE_NAME" --format "{{.Tag}} {{.ID}}" | \
        grep -v latest | sort -r | tail -n +4 | \
        awk '{print $2}' | xargs -r docker rmi || warning "Old image cleanup failed"
    
    log "Cleanup completed"
}

# Main deployment function
deploy() {
    log "Starting deployment process..."
    
    pre_deployment_checks
    create_backup
    build_and_deploy
    run_migrations
    post_deployment
    cleanup
    
    log "Deployment completed successfully!"
    log "Application is available at: http://localhost:3000"
}

# Script usage
usage() {
    echo "Usage: $0 [deploy|rollback|health-check|cleanup]"
    echo ""
    echo "Commands:"
    echo "  deploy      - Full deployment process"
    echo "  rollback    - Rollback to previous version"
    echo "  health-check - Check application health"
    echo "  cleanup     - Clean up old Docker images"
    echo ""
    exit 1
}

# Main script logic
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    rollback)
        rollback
        ;;
    health-check)
        health_check
        ;;
    cleanup)
        cleanup
        ;;
    *)
        usage
        ;;
esac