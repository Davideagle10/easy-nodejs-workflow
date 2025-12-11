FROM node:18-alpine AS dependencies

WORKDIR /app

#copy the package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --only=production --ignore-scripts

#----------------------------
#Stage2
#----------------------------

FROM node:18-alpine AS runtime

# Install dumb init
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser

WORKDIR /app   

# Copy dependencies from builder stage
COPY --from=dependencies --chown=appuser:appuser /app/node_modules ./node_modules

# Copy application code
COPY --chown=appuser:appuser package.json ./
COPY --chown=appuser:appuser src ./src

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8081/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "src/index.js"]