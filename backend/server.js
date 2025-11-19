const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const pdlRoutes = require('./routes/pdlRoutes');
const visitorRoutes = require('./routes/visitorRoutes');
const authRoutes = require('./routes/authRoutes');
const cellRoutes = require('./routes/cellRoutes');

const app = express();

// Trust proxy for accurate IP addresses in rate limiting (important for deployed apps)
app.set('trust proxy', 1);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // In production, allow all origins for mobile/network access
    // This is safe because we're behind a firewall/network
    if (process.env.NODE_ENV === 'production') {
      // Log for debugging
      console.log(`CORS: Allowing origin ${origin}`);
      return callback(null, true);
    }
    
    // Development: restrict to localhost
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL || 'http://localhost:3000',
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
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

app.use('/pdls', pdlRoutes);
app.use('/api/cells', cellRoutes);
app.use('/api', visitorRoutes);
app.use('/auth', authRoutes);

// Health check endpoint for deployment platforms
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running!',
    timestamp: new Date().toISOString()
  });
});

// Test route to verify server is working
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

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

// Wait for database schema to be ready before starting server
const startServer = async () => {
  try {
    console.log('🚀 Starting server...');
    console.log(`📦 Node version: ${process.version}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔌 Database: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'}`);
    
    // If using PostgreSQL, wait for schema initialization (with timeout)
    if (process.env.DATABASE_URL) {
      try {
        const db = require('./config/db');
        if (db.waitForSchema) {
          console.log('⏳ Waiting for database schema to initialize...');
          // Add timeout to prevent hanging
          const schemaPromise = db.waitForSchema();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Schema initialization timeout')), 30000)
          );
          await Promise.race([schemaPromise, timeoutPromise]);
          console.log('✅ Database schema ready');
        }
      } catch (dbError) {
        console.error('⚠️  Database initialization warning:', dbError.message);
        console.warn('⚠️  Server will start anyway - database may not be fully initialized');
      }
    }
    
    // Test email service initialization (non-blocking)
    try {
      require('./services/emailService');
      console.log('✅ Email service module loaded');
    } catch (emailError) {
      console.error('⚠️  Email service warning:', emailError.message);
      console.warn('⚠️  Email functionality may not work, but server will continue');
    }
    
    // Start the server
    app.listen(PORT, '0.0.0.0', async () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 Health check:  https://jail-deployment.onrender.com:${PORT}/api/health`);
      
      // Wait a moment for everything to settle, then create default user
      setTimeout(async () => {
        try {
          await initDefaultUser();
        } catch (error) {
          console.error('⚠️  Failed to initialize default user:', error.message);
          // Don't crash - server can still run
        }
      }, 1000);
    });
    
    // Handle server errors
    app.on('error', (error) => {
      console.error('❌ Server error:', error);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('❌ Error stack:', error.stack);
    process.exit(1);
  }
};

startServer();


  