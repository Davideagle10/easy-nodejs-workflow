const express = require('express');
const os = require('os');
const process = require('process');
const packageJson = require('../package.json');

// Initialize Express app
const app = express();

// Configuration from environment variables
const PORT = process.env.PORT || 8081;
const VERSION = process.env.APP_VERSION || packageJson.version;
const BUILD_DATE = process.env.BUILD_DATE || new Date().toISOString();
const COMMIT_SHA = process.env.COMMIT_SHA || 'local-dev';

// Middleware for JSON parsing
app.use(express.json());

// Middleware for request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// =========================================
// ROUTES
// =========================================

/**
 * Main endpoint - Shows application info
 */
app.get('/', (req, res) => {
  res.json({
    application: 'Simple Web Application',
    version: VERSION,
    status: 'UP',
    message: `Simple Web Application is UP with version ${VERSION}`,
    timestamp: new Date().toISOString(),
    endpoints: {
      '/': 'This page',
      '/health': 'Health check with system info',
      '/info': 'Detailed application info',
      '/env': 'Environment variables (filtered)'
    }
  });
});

/**
 * Health check endpoint 
 */
app.get('/health', (req, res) => {
  try {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    const healthData = {
      status: 'healthy',
      version: VERSION,
      timestamp: new Date().toISOString(),
      system: {
        hostname: os.hostname(),
        platform: os.platform(),
        architecture: os.arch(),
        nodeVersion: process.version,
        uptime_seconds: Math.floor(uptime),
        uptime_human: formatUptime(uptime),
        memory: {
          total_mb: Math.round(os.totalmem() / 1024 / 1024),
          free_mb: Math.round(os.freemem() / 1024 / 1024),
          used_percent: Math.round((1 - os.freemem() / os.totalmem()) * 100)
        },
        cpu: {
          cores: os.cpus().length,
          model: os.cpus()[0]?.model || 'unknown'
        }
      },
      application: {
        pid: process.pid,
        memory_usage_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        build_date: BUILD_DATE,
        commit_sha: COMMIT_SHA.substring(0, 8)
      }
    };
    
    res.status(200).json(healthData);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Info endpoint - Detailed application information
 */
app.get('/info', (req, res) => {
  res.json({
    application: {
      name: packageJson.name,
      description: packageJson.description,
      version: VERSION,
      framework: 'Express.js',
      language: 'Node.js',
      language_version: process.version
    },
    build: {
      build_date: BUILD_DATE,
      commit_sha: COMMIT_SHA,
      docker_base_image: 'node:18-alpine',
      port: PORT
    },
    author: {
      name: packageJson.author || 'Your Name',
      purpose: 'CI/CD Learning and Portfolio',
      repository: 'https://github.com/yourusername/nodejs-simple-app'
    },
    endpoints: [
      { path: '/', method: 'GET', description: 'Main application page' },
      { path: '/health', method: 'GET', description: 'Health check with metrics' },
      { path: '/info', method: 'GET', description: 'Application information' },
      { path: '/env', method: 'GET', description: 'Environment variables (filtered)' }
    ]
  });
});

/**
 * Environment variables endpoint - Filtered for security
 */
app.get('/env', (req, res) => {
  const safeEnvVars = {};
  const sensitiveKeys = ['key', 'secret', 'token', 'password', 'auth', 'api'];
  
  Object.entries(process.env).forEach(([key, value]) => {
    const isSensitive = sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive)
    );
    
    safeEnvVars[key] = isSensitive ? '***REDACTED***' : value;
  });
  
  res.json({
    environment_variables: safeEnvVars,
    count: Object.keys(safeEnvVars).length,
    timestamp: new Date().toISOString()
  });
});

// =========================================
// ERROR HANDLERS
// =========================================

/**
 * 404 Not Found handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: req.path,
    status_code: 404,
    timestamp: new Date().toISOString()
  });
});

/**
 * Global error handler
 */
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An internal server error occurred',
    status_code: 500,
    timestamp: new Date().toISOString()
  });
});

// =========================================
// HELPER FUNCTIONS
// =========================================

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  
  return parts.join(' ');
}

// =========================================
// SERVER STARTUP
// =========================================

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log(`Simple Web Application v${VERSION}`);
  console.log('='.repeat(50));
  console.log(`Build Date: ${BUILD_DATE}`);
  console.log(`🔖Commit SHA: ${COMMIT_SHA}`);
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log('='.repeat(50));
  console.log('Available endpoints:');
  console.log(`   GET /        - Main page`);
  console.log(`   GET /health  - Health check`);
  console.log(`   GET /info    - Application info`);
  console.log(`   GET /env     - Environment variables`);
  console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});