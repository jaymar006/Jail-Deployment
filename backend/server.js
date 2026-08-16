const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
dotenv.config();

const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');

const pdlRoutes = require('./routes/pdlRoutes');
const visitorRoutes = require('./routes/visitorRoutes');
const authRoutes = require('./routes/authRoutes');
const cellRoutes = require('./routes/cellRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const cron = require('node-cron');
const backupService = require('./services/backupService');

const app = express();

// Add request logging middleware (before routes)
app.use(requestLogger);

// Trust proxy for accurate IP addresses in rate limiting (important for deployed apps)
app.set('trust proxy', 1);

// Security headers (X-Frame-Options, CSP, X-Content-Type-Options, etc.)
app.use(helmet());

const parseOriginList = (value) => {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Restrict to an explicit allow-list in every environment:
    // FRONTEND_URL plus optional CORS_ORIGINS (comma-separated, for LAN/other UIs).
    const allowedOrigins = new Set([
      ...parseOriginList(process.env.FRONTEND_URL),
      ...parseOriginList(process.env.CORS_ORIGINS),
    ]);

    // Development: also allow localhost frontends
    if (process.env.NODE_ENV !== 'production') {
      allowedOrigins.add('http://localhost:3000');
      allowedOrigins.add('http://localhost:3001');
    }

    if (allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS: Blocked origin ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.use(express.json());

// Health check must be registered before app.use('/api', visitorRoutes),
// otherwise visitor auth middleware intercepts /api/health.
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running!',
    timestamp: new Date().toISOString()
  });
});

app.use('/pdls', pdlRoutes);
app.use('/api/cells', cellRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api', visitorRoutes);
app.use('/auth', authRoutes);

const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Serve frontend static files if in production or build folder exists
const path = require('path');
const fs = require('fs');
// In Docker, frontend build is copied to ./public, otherwise check ../frontend/build
const buildPath = fs.existsSync(path.join(__dirname, 'public')) 
  ? path.join(__dirname, 'public')
  : path.join(__dirname, '..', 'frontend', 'build');

if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));

  // Fallback route to serve index.html for client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Initialize default admin user on startup (after database is ready)
const initDefaultUser = require('./scripts/initDefaultUser');

const PORT = process.env.PORT || 10000;

// Global error handlers for uncaught exceptions and unhandled rejections
// These ensure all errors are logged before the process exits
process.on('uncaughtException', (error) => {
  logger.error('UNCAUGHT EXCEPTION - Process will exit:', error);
  logger.error('Stack:', error.stack);
  // Give time for logs to be written
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('UNHANDLED REJECTION at:', promise);
  logger.error('Reason:', reason);
  if (reason instanceof Error) {
    logger.error('Stack:', reason.stack);
  }
});

// Handle SIGTERM (Docker stop signal)
process.on('SIGTERM', () => {
  logger.info('SIGTERM received - shutting down gracefully');
  process.exit(0);
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  logger.info('SIGINT received - shutting down gracefully');
  process.exit(0);
});

// Wait for database schema to be ready before starting server
const startServer = async () => {
  try {
    logger.info('🚀 Starting server...');
    logger.info(`📦 Node version: ${process.version}`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🔌 Database: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'}`);
    
    // If using PostgreSQL, wait for schema initialization (with timeout)
    if (process.env.DATABASE_URL) {
      try {
        const db = require('./config/db');
        if (db.waitForSchema) {
          logger.info('⏳ Waiting for database schema to initialize...');
          // Add timeout to prevent hanging
          const schemaPromise = db.waitForSchema();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Schema initialization timeout')), 30000)
          );
          await Promise.race([schemaPromise, timeoutPromise]);
          logger.info('✅ Database schema ready');
        }
      } catch (dbError) {
        logger.warn('⚠️  Database initialization warning:', dbError.message);
        logger.warn('⚠️  Server will start anyway - database may not be fully initialized');
      }
    }
    
    // Test email service initialization (non-blocking)
    try {
      require('./services/emailService');
      // Email service loaded (silent - not using email for password reset)
    } catch (emailError) {
      // Email service not available - that's OK, we use Telegram
      logger.debug('Email service not available (using Telegram instead)');
    }
    
    // Start the server
    app.listen(PORT, '0.0.0.0', async () => {
      logger.info(`✅ Server running on port ${PORT}`);
      logger.info(`🌐 Health check: https://jail-deployment.onrender.com:${PORT}/api/health`);
      
      // Wait a moment for everything to settle, then create default user
      setTimeout(async () => {
        try {
          await initDefaultUser();
        } catch (error) {
          logger.warn('⚠️  Failed to initialize default user:', error.message);
          // Don't crash - server can still run
        }
      }, 1000);

      // Initialize automatic database backup and cleanup cron job (runs every day at midnight)
      cron.schedule('0 0 * * *', async () => {
        try {
          logger.info('⏰ Starting scheduled database backup and cleanup...');
          const report = await backupService.runScheduledBackup();
          logger.info(`✅ Scheduled backup completed successfully: ${report.backupFile}`);
        } catch (error) {
          logger.error('❌ Scheduled backup failed:', error.message);
        }
      });
      logger.info('⏰ Database backup and cleanup cron job scheduled (daily at midnight)');

      // Run a backup on startup if explicitly requested via environment variable (useful for testing/verifying)
      if (process.env.RUN_BACKUP_ON_STARTUP === 'true') {
        setTimeout(async () => {
          try {
            logger.info('🚀 Triggering startup database backup and cleanup...');
            const report = await backupService.runScheduledBackup();
            logger.info(`✅ Startup database backup completed: ${report.backupFile}`);
          } catch (error) {
            logger.error('❌ Startup database backup failed:', error.message);
          }
        }, 5000);
      }
    });
    
    // Handle server errors
    app.on('error', (error) => {
      logger.error('❌ Server error:', error);
    });
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    logger.error('❌ Error stack:', error.stack);
    process.exit(1);
  }
};

startServer();


  